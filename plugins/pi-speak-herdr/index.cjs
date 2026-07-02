#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

const action = process.argv[2] || "";
const context = parseContext(process.env.HERDR_PLUGIN_CONTEXT_JSON || "{}");


if (action === "speak-selection") {
	const text = selectedText(context);
	if (!text) {
		console.error("No selected text or clicked URL was provided by Herdr.");
		process.exit(2);
	}
	process.exit(run("pk-speak", ["speak", text]).status);
}

if (action === "route-current-pane") {
	const paneId = process.env.HERDR_PANE_ID || context.pane_id || context.paneId || "";
	if (!paneId) {
		console.error("No Herdr pane id is available in this invocation.");
		process.exit(2);
	}
	const target = `herdr:${paneId}`;
	const routed = routePiSpeak(target);
	const herdr = process.env.HERDR_BIN_PATH || "herdr";
	const result = run(herdr, [
		"pane",
		"report-metadata",
		String(paneId),
		"--source",
		"pk.pi-speak",
		"--title",
		"Pi Speak route target",
		"--custom-status",
		routed ? "voice routed" : "voice target",
	]);
	if (result.status === 0) {
		console.log(routed ? `Routed Pi Speak turns to ${target}.` : `Marked ${paneId}; set PI_SPEAK_BASE_URL and PI_SPEAK_HTTP_TOKEN to route directly.`);
	}
	process.exit(result.status);
}

if (action.startsWith("pane:")) {
	runPane(action.slice(5)).catch((error) => { console.error(String(error?.message || error)); process.exit(1); });
	// runPane is async — script stays alive until it resolves.
	return; // prevent fall-through to the error below
}

async function runPane(id) {
	const baseUrl = (process.env.PI_SPEAK_BASE_URL || "").replace(/\/+$/, "");
	const token = process.env.PI_SPEAK_HTTP_TOKEN || "";
	if (!baseUrl || !token) {
		console.error("Set PI_SPEAK_BASE_URL and PI_SPEAK_HTTP_TOKEN to use Agent Hub panes.");
		process.exit(2);
	}
	if (id === "agent-hub") return paneAgentHub(baseUrl, token);
	const agentId = process.env.HERDR_PANE_ARGS || context.agent_id || context.agentId || process.argv[3] || "";
	if (!agentId) { console.error("agent-chat/agent-stream need an agent id (launch from agent-hub pane)."); process.exit(2); }
	if (id === "agent-chat") return paneAgentChat(baseUrl, token, agentId);
	if (id === "agent-stream") return paneAgentStream(baseUrl, token, agentId);
	console.error(`Unknown pane: ${id}`);
	process.exit(2);
}

function headers(token) {
	return { "Content-Type": "application/json", "X-Pi-Speak-Token": token };
}

async function apiGet(baseUrl, token, path) {
	const res = await fetch(`${baseUrl}${path}`, { headers: headers(token) });
	return { status: res.status, body: await res.json().catch(() => ({})) };
}

function herdrOpenPane(paneId, agentId) {
	const herdr = process.env.HERDR_BIN_PATH || "herdr";
	spawnSync(herdr, ["pane", "open", `pk.pi-speak:${paneId}`, "--args", agentId], { stdio: "ignore", windowsHide: true });
}

async function paneAgentHub(baseUrl, token) {
	const readline = require("node:readline");
	const rl = readline.createInterface({ input: process.stdin });
	readline.emitKeypressEvents(process.stdin, rl);
	if (process.stdin.isTTY) process.stdin.setRawMode(true);
	let cursor = 0;
	let agents = [];
	let killArmedAt = 0;
	let killArmedId = "";

	const draw = async () => {
		const { status, body } = await apiGet(baseUrl, token, "/v1/herdr/agents");
		if (status !== 200) { process.stdout.write(`\x1b[2J\x1b[Hgateway ${status}: ${body.error || "error"}\n`); return; }
		agents = body.agents || [];
		renderHubTree(body.folders || [], agents, cursor);
	};
	await draw();
	const timer = setInterval(() => { draw().catch(() => {}); }, 5000);

	process.stdin.on("keypress", async (_ch, key) => {
		if (!key) return;
		if (key.name === "q" || (key.ctrl && key.name === "c")) { clearInterval(timer); process.exit(0); }
		if (key.name === "up") cursor = Math.max(0, cursor - 1);
		if (key.name === "down") cursor = Math.min(agents.length - 1, cursor + 1);
		const agent = agents[cursor];
		if (!agent) { await draw(); return; }
		if (key.name === "return") herdrOpenPane("agent-chat", agent.id);
		if (key.name === "s") herdrOpenPane("agent-stream", agent.id);
		if (key.name === "r") {
			await fetch(`${baseUrl}/v1/herdr/agent/${encodeURIComponent(agent.id)}/revive`, { method: "POST", headers: headers(token) });
		}
		if (key.name === "x") {
			const now = Date.now();
			if (killArmedId === agent.id && now - killArmedAt < 2000) {
				const first = await fetch(`${baseUrl}/v1/herdr/agent/${encodeURIComponent(agent.id)}/kill`, { method: "POST", headers: headers(token), body: "{}" });
				const firstBody = await first.json().catch(() => ({}));
				if (first.status === 428 && firstBody.confirmToken) {
					await fetch(`${baseUrl}/v1/herdr/agent/${encodeURIComponent(agent.id)}/kill`, {
						method: "POST", headers: headers(token),
						body: JSON.stringify({ confirmToken: firstBody.confirmToken }),
					});
				}
				killArmedId = "";
			} else {
				killArmedId = agent.id;
				killArmedAt = now;
			}
		}
		await draw();
	});
}

const STATUS_GLYPH = { running: "\x1b[36m●\x1b[0m", idle: "\x1b[32m○\x1b[0m", parked: "\x1b[2m◌\x1b[0m", aborted: "\x1b[31m✗\x1b[0m" };

function renderHubTree(folders, agents, cursor) {
	process.stdout.write("\x1b[2J\x1b[H");
	process.stdout.write(" oh-my-pi Agent Hub   ↑↓ move · ⏎ chat · s stream · r revive · x x kill · q quit\n");
	process.stdout.write(" " + "─".repeat(80) + "\n");
	for (const folder of folders) {
		process.stdout.write(` ▸ ${folder.name}  (${folder.laneCount} lane${folder.laneCount === 1 ? "" : "s"}${folder.isCurrentFolder ? ", current" : ""})\n`);
	}
	agents.forEach((agent, i) => {
		const selected = i === cursor ? "\x1b[7m" : "";
		const reset = i === cursor ? "\x1b[0m" : "";
		const glyph = STATUS_GLYPH[agent.status] || "?";
		const age = formatAge(agent.lastActivityMs);
		const model = agent.model ? agent.model.split("/").pop() : "—";
		const activity = agent.activity ? `  ${agent.activity.slice(0, 30)}` : "";
		const indent = "  ".repeat(agent.depth);
		process.stdout.write(`${selected} ${indent}${agent.displayName.padEnd(22)} ${glyph} ${(agent.status).padEnd(8)} ${(model || "—").padEnd(12)} ${age}${activity}${reset}\n`);
	});
	process.stdout.write(" " + "─".repeat(80) + "\n");
}

function formatAge(ms) {
	const diff = Math.max(0, Date.now() - ms);
	if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
	if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
	return `${Math.floor(diff / 3600000)}h`;
}

async function paneAgentChat(baseUrl, token, agentId) {
	const readline = require("node:readline");
	const { status, body } = await apiGet(baseUrl, token, `/v1/herdr/agent/${encodeURIComponent(agentId)}?lines=60`);
	if (status !== 200) { console.error(body.error || `gateway ${status}`); process.exit(1); }
	const agent = body.agent || {};
	process.stdout.write(`\x1b[2J\x1b[H Agent: ${agent.displayName || agentId} (${agent.kind || "?"}, ${agent.status || "?"})\n`);
	process.stdout.write(" " + "─".repeat(60) + "\n");
	for (const line of agent.transcriptTail || []) {
		process.stdout.write(` ${line.slice(0, 100)}\n`);
	}
	process.stdout.write(" " + "─".repeat(60) + "\n");
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: " > " });
	rl.prompt();
	rl.on("line", async (line) => {
		const text = line.trim();
		if (!text) return rl.prompt();
		if (text === "/quit") process.exit(0);
		const idempotencyKey = `herdr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
		const res = await fetch(`${baseUrl}/v1/herdr/agent/${encodeURIComponent(agentId)}/chat`, {
			method: "POST",
			headers: { ...headers(token), "X-Pi-Speak-Idempotency-Key": idempotencyKey },
			body: JSON.stringify({ text }),
		});
		const sent = await res.json().catch(() => ({}));
		process.stdout.write(res.status === 200 ? `\x1b[32m✓ sent\x1b[0m\n` : `\x1b[31m✗ ${sent.error || res.status}\x1b[0m\n`);
		rl.prompt();
	});
}

async function paneAgentStream(baseUrl, token, agentId) {
	process.stdout.write(`\x1b[2J\x1b[H ⇄ live: ${agentId}   connected\n`);
	process.stdout.write(" " + "─".repeat(60) + "\n");
	let fromByte = 0;
	for (;;) {
		const response = await fetch(`${baseUrl}/v1/herdr/stream/${encodeURIComponent(agentId)}?fromByte=${fromByte}`, {
			headers: { "X-Pi-Speak-Token": token, Accept: "text/event-stream" },
		});
		if (!response.ok || !response.body) { console.error(`stream ${response.status}`); process.exit(1); }
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buf = "";
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			buf += decoder.decode(value, { stream: true });
			let idx;
			while ((idx = buf.indexOf("\n\n")) >= 0) {
				const frame = buf.slice(0, idx); buf = buf.slice(idx + 2);
				const event = /^event: (.+)$/m.exec(frame)?.[1] || "message";
				const data = /^data: (.+)$/m.exec(frame)?.[1];
				if (event === "append" && data) {
					const parsed = JSON.parse(data);
					fromByte = parsed.newSize;
					process.stdout.write(parsed.text);
				}
				if (event === "status" && data) process.stdout.write(`\x1b[2m[status] ${JSON.parse(data).status}\x1b[0m\n`);
				if (event === "superseded") { process.stdout.write("Stream taken over by another device.\n"); process.exit(0); }
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}
}

console.error(`Unknown pi-speak action: ${action}`);
process.exit(2);

function parseContext(raw) {
	try {
		const value = JSON.parse(raw);
		return value && typeof value === "object" && !Array.isArray(value) ? value : {};
	} catch {
		return {};
	}
}

function selectedText(value) {
	for (const key of ["selected_text", "selectedText", "clicked_url", "clickedUrl"]) {
		if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
	}
	return "";
}

function routePiSpeak(target) {
	const baseUrl = (process.env.PI_SPEAK_BASE_URL || "").replace(/\/+$/, "");
	const token = process.env.PI_SPEAK_HTTP_TOKEN || "";
	if (!baseUrl || !token) return false;
	const script = `
const target = process.argv[1];
fetch(${JSON.stringify(baseUrl + "/v1/route")}, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Pi-Speak-Token": ${JSON.stringify(token)} },
  body: JSON.stringify({ target })
}).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1));`;
	return run(process.execPath, ["-e", script, target]).status === 0;
}

function run(command, args) {
	const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true });
	if (result.error) {
		console.error(result.error.message);
		return { status: 1 };
	}
	return { status: result.status === null ? 1 : result.status };
}
