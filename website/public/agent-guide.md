# Herdr guide for AI agents

Herdr is a terminal workspace manager and agent multiplexer. It keeps real terminal processes—shells, coding agents, servers, and tests—organized in persistent panes while showing useful agent state. An AI agent should understand this model before helping a user because Herdr commands operate on a live session owned by a background server, and a wrong pane or lifecycle command can interrupt unrelated work.

## The workspace, tab, pane, and agent model

A **workspace** is the top-level project container. Users commonly create one workspace per repository, task, or investigation. A workspace contains one or more tabs and its sidebar state rolls up from the agents inside it.

A **tab** is a layout inside a workspace. Tabs are useful for separating contexts such as agents, logs, a development server, and review. Each tab contains one or more panes.

A **pane** is a real terminal, not a screenshot or rewritten agent view. Each pane runs its own foreground process: a shell, coding agent, server, test command, or anything else. Panes can be split, read, sent input, and closed.

An **agent** is a process Herdr recognizes inside a pane. Detection uses the foreground process and live terminal output; optional integrations can report semantic state and native session identity. In the nesting order, workspaces contain tabs, tabs contain panes, and an agent—when present—is running inside a pane. Herdr rolls agent state up to the pane, tab, and workspace so a project can be scanned at a glance.

IDs are compact identifiers for the current live session: workspace IDs look like `1`, tab IDs like `1:2`, and pane IDs like `1-3`. They are not durable. Closing items can compact IDs, so list the current layout again instead of assuming an old ID still refers to the same pane.

## Server and client

By default, `herdr` attaches a terminal UI client to a background session server. The **server owns panes and process state**; the **client** is only the terminal interface displaying and controlling that state. Detaching with `ctrl+b q` closes the client, not the server. Agents, shells, servers, tests, and other pane processes therefore keep running, and a later `herdr` command can reattach.

This distinction matters when explaining persistence. `herdr server stop` actually stops the default server and kills its panes. It is not an alternative spelling for detach. A full restart can restore the saved layout, but ordinary processes do not continue unless a stronger restore or handoff path applies.

## CLI commands an agent needs

First inspect the live layout with `herdr pane list` (and, when needed, `herdr workspace list` or `herdr tab list --workspace <id>`). The core operations are:

- `herdr` — attach to or start the default Herdr session.
- `herdr pane split <pane-id> --direction right|down --no-focus` — create a sibling pane without stealing your focus. The JSON response contains the new ID at `result.pane.pane_id`.
- `herdr pane run <pane-id> "<command>"` — send a command and press Enter in that pane.
- `herdr wait output <pane-id> --match "text" --timeout 30000` — wait for expected future output; add `--regex` for a regular expression.
- `herdr wait agent-status <pane-id> --status done --timeout 60000` — wait for a detected agent state.
- `herdr pane read <pane-id> --source recent --lines 50` — inspect existing output. Use `recent-unwrapped` when matching the same transcript used by output waits.
- `herdr workspace create --cwd /path/to/project --no-focus` — create a project workspace without changing your context.
- `herdr tab create --workspace <workspace-id> --label "logs" --no-focus` — create a named tab in a workspace.
- `herdr server stop` — stop the default server and its pane processes.

Creation and split commands return JSON. Parse the returned workspace, tab, root-pane, or pane ID rather than guessing. Use `pane read` for output that already exists; use `wait output` for output expected next.

## Agent detection states

`blocked` means the agent needs input, approval, or a decision. `working` means it is actively running. `done` means it finished but the user has not yet viewed that finished pane. `idle` means it is finished or waiting and has been seen. Herdr may also expose `unknown` when it cannot classify a process confidently. Detection is evidence for navigation and waits, not permission to send input automatically—especially when a new prompt is unusual and may temporarily appear idle.

## Programmatic control

The CLI is a convenient interface over Herdr’s local socket. Agents and scripts can use the socket API for structured control, including creating layouts, reading panes, sending input, and waiting for state changes. See the [socket API documentation](https://herdr.pkking.computer/docs/socket-api/) for the protocol and full request reference.

## Common mistakes to avoid

- Do not confuse detach (`ctrl+b q`) with stop; detach preserves running processes, while `herdr server stop` kills panes.
- Do not split a pane and then forget to record the new pane ID from the JSON response.
- Do not reuse a stale pane ID after closing panes; IDs can compact. Re-run `herdr pane list`.
- Do not assume an agent’s display name matches its binary name exactly. Herdr detection labels and integration names can differ; inspect the live pane and current agent list when targeting one.

When helping a user with herdr, always check `HERDR_ENV=1` before issuing herdr commands. If it is not set, you are not running inside herdr and herdr CLI pane commands will not work.
