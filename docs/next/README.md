# herdr


<p align="center">
  <img src="assets/logo.png" alt="herdr" width="100" />
</p>

<p align="center">
  <a href="https://herdr.pkking.computer">herdr.pkking.computer</a> · <a href="#install">install</a> · <a href="#quick-start">quick start</a> · <a href="#supported-agents">supported agents</a> · <a href="https://herdr.pkking.computer/docs/integrations/">integrations</a> · <a href="https://herdr.pkking.computer/docs/configuration/">configuration</a> · <a href="https://herdr.pkking.computer/docs/socket-api/">socket api</a> · <a href="#sponsors">sponsor</a>
</p>

---

https://github.com/user-attachments/assets/043ec09f-4bdd-41d5-aee0-8fda6b83e267

**agent multiplexer that lives in your terminal.**

workspaces, tabs, panes. mouse-native: click, drag, split. every agent at a glance: blocked, working, done. detach and reattach, agents keep running. no gui app, no electron, no mac-only native wrapper. you see the agent's own terminal, not someone's interpretation of it.

---

## install

```bash
curl -fsSL https://herdr.pkking.computer/install.sh | sh
```

on windows preview beta:

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://herdr.pkking.computer/install.ps1 | iex"
```

Homebrew and the mise registry currently track upstream Herdr, not this fork. Use the direct installer above, or use the fork explicitly where a tool accepts a GitHub source:

```bash
mise use -g github:kingkillery/pk-herdr
```

or download binaries directly from the fork's Cloudflare distribution endpoint (per-asset URLs are listed in [the latest release manifest](https://herdr.pkking.computer/latest.json) and the [preview manifest](https://herdr.pkking.computer/preview.json); the same URLs feed the install script and `herdr update`). Native Windows binaries are preview-only beta builds.

### remote install

The installer and update channel are hosted at the fork's Cloudflare distribution endpoint (`https://herdr.pkking.computer`). To use `herdr --remote`, the local client must also be the pk-herdr fork — otherwise the remote bootstrap will pull binaries from the upstream channel. Install the local fork client first:

```bash
curl -fsSL https://herdr.pkking.computer/install.sh | sh
```

Then push the same installer to a Linux or macOS host over SSH, and attach from your local machine. `herdr --remote` does not support Windows hosts yet — from Windows, SSH into the server and run `herdr` there directly.

```bash
# one-line install on a remote host (Linux/macOS only)
ssh user@host 'curl -fsSL https://herdr.pkking.computer/install.sh | sh'

# install to a custom directory on the remote host
ssh user@host 'curl -fsSL https://herdr.pkking.computer/install.sh | HERDR_INSTALL_DIR=$HOME/.local/bin sh'

# attach from your local machine (local thin client → remote server)
herdr --remote user@host

# or via SSH config alias
herdr --remote workbox
```

`herdr --remote` reuses an existing remote `herdr` on `$PATH` when its protocol version matches. If the host has no matching binary, interactive runs prompt to install one to `~/.local/bin/herdr` from the fork's latest manifest; non-interactive runs fail instead of mutating the host. The download is validated against the manifest asset URL prefix and refused if the binary is not hosted at the fork's Cloudflare distribution endpoint.

Updates on the remote host use the same channel:

```bash
ssh user@host 'herdr update'
```

## quick start

Start Herdr in the directory where the work lives:

```bash
herdr
```

Herdr starts or attaches to one background session server. When a session has no workspaces, Herdr opens one automatically. Run an agent in the root pane. Press `ctrl+b`, then `shift+n` to create another workspace, `ctrl+b`, then `v` or `minus` to split panes, `ctrl+b`, then `c` to create a tab, and `ctrl+b`, then `w` to switch workspaces.

Press `ctrl+b q` to detach the client. The server and pane processes keep running. Open another terminal and run `herdr` again to reattach.

## core concepts

**Server and client.** By default, `herdr` attaches to a background server. Detaching closes only the client. `herdr server stop` stops the default server and kills its panes. Named sessions are separate server namespaces: use `herdr session attach work`, `herdr session stop work`, and `herdr session list` when you want fully separate runtime state.

**Workspaces, tabs, panes.** A workspace is the project-level container. Tabs group panes inside a workspace. Panes are real terminal processes, not rewritten agent views.

**Copy.** Herdr copies pane text, not the sidebar. Drag-select inside a pane, double-click a word or token, or press `prefix+[` for keyboard copy mode. In copy mode, move with `h/j/k/l`, `w/b/e`, and `{`/`}`, start selection with `v` or Space, copy with `y` or Enter, and leave with `q` or Esc. In PuTTY and some SSH terminals, hold `Shift` while dragging to use the terminal's own selection, and `Shift` + right click to paste.

**Update and restore.** `herdr update` installs a new binary, but a running server keeps using the old process until it is stopped or handed off. Stop the old server to use the new version. Stopping exits pane processes. Run `herdr server stop`, then run `herdr` again for the default session. For a named session, run `herdr session stop <name>`, then run `herdr session attach <name>` again. `herdr update --handoff` is experimental and tries to move live panes, including foreground processes such as dev servers, from the old server to the new one. With current official integrations installed, supported agent panes can restart from their native agent sessions after a server restart or update.

**Keybindings.** Herdr uses explicit keybinding strings. `prefix+n` means press the configured prefix, then `n`. `ctrl+alt+n`, `cmd+k`, `alt+1`, and function-key chords are direct terminal-mode shortcuts and do not need the prefix. Plain direct printable keys such as `n` steal normal typing, so use `prefix+n` unless you intentionally want a modifier-gated direct binding.

**Agent awareness.** The sidebar shows blocked, working, done, and idle states. Detection works with process names and terminal output by default. Official integrations can add native session identity for restore, semantic state reports, or both.

## update

Herdr notifies you when a new version is available. Run manually:

```bash
herdr update
```

`herdr update` is for installs managed by the pk-herdr direct installer. Homebrew and the mise registry track upstream Herdr; switch to a direct `kingkillery/pk-herdr` install if you want fork-only updates. Nix installs update through the same `github:kingkillery/pk-herdr` flake workflow you used to install them, then use the same stop-and-run-again flow if a session is still running the old server. Linux and macOS direct installs can opt into development preview builds with `herdr channel set preview` and return to stable with `herdr channel set stable`. Windows beta installs are preview-only for now. See [install docs](https://herdr.pkking.computer/docs/install/) and [session state docs](https://herdr.pkking.computer/docs/session-state/) for the full update, restart, restore, and handoff matrix.

Linux and macOS direct installs use the stable update channel by default. Windows beta installs default to preview. To test preview builds from `master` before the next stable release:

```bash
herdr channel set preview
```

To return Linux and macOS direct installs to stable:

```bash
herdr channel set stable
```

For direct installs, changing channels also checks that channel and installs its latest binary. If that update fails, run `herdr update` to retry from the configured channel.

Preview is only for direct installs managed by Herdr's updater. Homebrew and mise registry installs do not receive pk-herdr preview builds.

## how it compares

|                          | tmux | gui managers | herdr |
|--------------------------|------|--------------|-------|
| persistent sessions       | ✓    | —            | ✓     |
| detach / reattach        | ✓    | —            | ✓     |
| panes, tabs, workspaces  | ✓    | ✓            | ✓     |
| agent awareness          | —    | ✓            | ✓     |
| lives in your terminal   | ✓    | —            | ✓     |
| real terminal views      | ✓    | —            | ✓     |
| mouse-native            | —    | ✓            | ✓     |
| lightweight binary       | ✓    | —            | ✓     |
| agents can orchestrate   | ?    | ?            | ✓     |

tmux gives you persistence and panes, but it was built before agents existed. gui managers show agent state, but they make you leave your terminal and use their wrapped view. herdr is persistence and awareness in one tool that stays out of your way.

## remote and attach

Herdr works over normal SSH. Run it on the remote host, detach, and reattach later:

```
ssh you@yourserver
herdr
```

You can also attach from your local terminal without opening a shell first:

```bash
herdr --remote workbox
herdr --remote ssh://you@yourserver:2222
```

Remote attach adds fallback SSH keepalives and connection reuse by default while preserving your own SSH config. Set `[remote].manage_ssh_config = false` to use plain `ssh`.

Direct attach connects your current terminal to one server-owned terminal:

```bash
herdr agent attach <target>
herdr terminal attach <terminal_id>
```

See [persistence and remote docs](https://herdr.pkking.computer/docs/persistence-remote/) for remote keybinding, named-session, and handoff details.

## agent awareness

the sidebar shows which agents are blocked, working, or done. workspaces roll up to their most urgent state so you can scan the full list at a glance.

states:

- 🔴 **blocked** — agent needs input or approval
- 🟡 **working** — agent is actively running
- 🔵 **done** — work finished, you have not looked at it yet
- 🟢 **idle** — done and seen

detection works by reading foreground process and terminal output. zero config, no hooks required. official claude code, codex, github copilot cli, devin, droid, kimi code cli, qodercli, and cursor agent cli integrations provide session restore identity; pi, omp, kimi code cli, opencode, kilo code cli, hermes, and custom socket integrations can report their own state.

## lives in your terminal

not a gui window, not a web dashboard, not electron. herdr runs inside whatever terminal you already use. single rust binary, no dependencies. works inside tmux as the outer terminal environment.

## what you get

- **workspaces** — organized around git repos or folder names, each with its own tabs and panes
- **tabs** — first-class in the socket api and cli
- **copy-friendly** — drag-select pane text, double-click tokens, or use keyboard copy mode with `prefix+[`, `h/j/k/l`, `{`/`}`, `v`, and `y`
- **notifications** — sounds and toasts for background events; tab-aware suppression
- **18 built-in themes** — catppuccin, terminal, tokyo night, gruvbox, one, solarized, kanagawa, rosé pine, vesper, and light variants for the main palettes
- **session persistence** — pane processes survive client detach; sessions restore panes after full restart, with opt-in recent screen history

## agents can use herdr too

The local Unix socket lets agents create workspaces, split or zoom panes, spawn helpers, read output, and wait for state changes. Install the reusable skill with:

```bash
npx skills add kingkillery/pk-herdr --skill herdr -g
```

Start with the [agent skill docs](https://herdr.pkking.computer/docs/agent-skill/), [socket API docs](https://herdr.pkking.computer/docs/socket-api/), and [`SKILL.md`](./SKILL.md).

## supported agents

automatic detection works out of the box. process name matching plus terminal output heuristics.

| agent | idle / done | working | blocked |
|-------|-------------|---------|---------|
| [pi](https://pi.dev) | ✓ | ✓ | partial |
| [claude code](https://docs.anthropic.com/en/docs/claude-code) | ✓ | ✓ | ✓ |
| [codex](https://github.com/openai/codex) | ✓ | ✓ | ✓ |
| [droid](https://factory.ai) | ✓ | ✓ | ✓ |
| [amp](https://ampcode.com) | ✓ | ✓ | ✓ |
| [opencode](https://github.com/anomalyco/opencode) | ✓ | ✓ | ✓ |
| [grok cli](https://x.ai/grok) | ✓ | ✓ | ✓ |
| [hermes agent](https://github.com/NousResearch/hermes-agent) | ✓ | ✓ | ✓ |
| [kilo code cli](https://kilo.ai/) | ✓ | ✓ | ✓ |
| [devin cli](https://docs.devin.ai/cli) | ✓ | ✓ | ✓ |
| cursor agent | ✓ | ✓ | ✓ |
| antigravity cli | ✓ | ✓ | ✓ |
| kimi code cli | ✓ | ✓ | ✓ |
| [github copilot cli](https://github.com/features/copilot) | ✓ | ✓ | ✓ |
| [qodercli](https://qoder.com/cli) | ✓ | ✓ | ✓ |
| [kiro cli](https://kiro.dev/docs/cli/) | ✓ | ✓ | — |

detected but not fully tested: gemini cli, cline.

for agents outside the built-in list, herdr still works as a terminal multiplexer with workspaces, panes, and tiling. custom integrations can report agent labels over the socket api. see the [socket api docs](https://herdr.pkking.computer/docs/socket-api/).

### direct integrations

official integrations have two roles. claude code, codex, github copilot cli, devin, droid, qodercli, and cursor agent cli report session identity for native restore, while their state still comes from screen detection. pi, omp, kimi code cli, opencode, kilo code cli, and hermes report both semantic state and session identity. install with:

```bash
herdr integration install pi
herdr integration install omp
herdr integration install claude
herdr integration install codex
herdr integration install copilot
herdr integration install devin
herdr integration install droid
herdr integration install kimi
herdr integration install opencode
herdr integration install kilo
herdr integration install hermes
herdr integration install qodercli
herdr integration install cursor
```

see the [integrations docs](https://herdr.pkking.computer/docs/integrations/) for setup details.

## keybindings

Press `ctrl+b` to enter prefix mode. Most default actions are prefix-first and tmux-like; `ctrl+pagedown` and `ctrl+pageup` directly cycle tabs across spaces:

| key | action |
|-----|--------|
| `prefix+c` | new tab |
| `ctrl+pagedown` / `ctrl+pageup` or `prefix+n` / `prefix+p` | next / previous tab across spaces |
| `prefix+1..9` | switch tab |
| `prefix+w` | workspace navigation |
| `prefix+g` | session navigator |
| `prefix+shift+n` | new workspace |
| `prefix+shift+g` | new worktree |
| `prefix+shift+w` | rename workspace |
| `prefix+shift+d` | close workspace |
| `prefix+h/j/k/l` | focus pane |
| `prefix+shift+h/j/k/l` | swap pane |
| `prefix+v` / `prefix+minus` | split pane |
| `prefix+x` | close pane |
| `prefix+b` | toggle sidebar |
| `prefix+z` | zoom pane |
| `prefix+r` | resize mode |
| `prefix+q` | detach |

Mouse is supported throughout. Resize mode uses `h`/`l` for width, `j`/`k` for height, and `esc` to exit. Full syntax, optional actions, indexed bindings, and custom command bindings live in the [configuration docs](https://herdr.pkking.computer/docs/configuration/).

## configuration

config file: `~/.config/herdr/config.toml`

```bash
herdr --default-config   # print full default config
```

In-app settings cover theme, sound, and toast preferences. Herdr writes logs under `~/.config/herdr/`; in persistent session mode, `herdr-client.log` and `herdr-server.log` are usually the useful files. Full configuration and logging details live in the [configuration docs](https://herdr.pkking.computer/docs/configuration/).

## docs

- [quick start](https://herdr.pkking.computer/docs/quick-start/) — first session, panes, copy, and named sessions
- [install](https://herdr.pkking.computer/docs/install/) — install, update, package managers, and manual downloads
- [session state](https://herdr.pkking.computer/docs/session-state/) — detach, restart restore, agent restore, and live handoff
- [configuration](https://herdr.pkking.computer/docs/configuration/) — keybindings, themes, notifications, environment variables
- [integrations](https://herdr.pkking.computer/docs/integrations/) — pi, omp, claude code, codex, cursor agent cli, github copilot cli, droid, kimi code cli, opencode, kilo code cli, hermes, qodercli integrations
- [`SKILL.md`](./SKILL.md) — reusable agent skill
- [socket api](https://herdr.pkking.computer/docs/socket-api/) — socket protocol and cli reference

## agent instructions

if you are an ai agent helping with this repository, read [`AGENTS.md`](./AGENTS.md) before making changes and read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening issues or PRs.

## development

```bash
git clone https://github.com/kingkillery/pk-herdr
cd pk-herdr
cargo build --release
./target/release/herdr

just test        # unit tests
just check       # formatting, tests, and maintenance checks
```

## sponsors

herdr is built full-time, in the open, with no revenue behind it. sponsoring directly funds development, stability, and the path to a real agent runtime.

[**→ become a sponsor**](https://github.com/sponsors/ogulcancelik) · enterprise / partnership: hey@herdr.dev · see [SPONSORS.md](./SPONSORS.md) for tiers. thank you 🐑

## license

Herdr is dual-licensed:

1. Open source: GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later).
2. Commercial: commercial licenses are available for organizations that cannot comply with AGPL.

Contact: hey@herdr.dev

## mandatory star history

<a href="https://www.star-history.com/?repos=ogulcancelik%2Fherdr&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=ogulcancelik/herdr&type=date&theme=dark&legend=top-left&v=2026-05-19" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=ogulcancelik/herdr&type=date&legend=top-left&v=2026-05-19" />
   <img alt="star history chart" src="https://api.star-history.com/chart?repos=ogulcancelik/herdr&type=date&legend=top-left&v=2026-05-19" />
 </picture>
</a>
