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
