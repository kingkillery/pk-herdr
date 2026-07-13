use crate::{
    app::state::AppState,
    detect::{manifest, Agent, AgentState},
    layout::PaneId,
    terminal::{TerminalRuntime, TerminalRuntimeRegistry, TerminalState},
};

pub(crate) const MENU_ITEM: &str = "Summarize session";
pub(crate) const PROMPT: &str = "Summarize this session so far for handoff. Include the user's goal, key decisions, work completed, files changed, commands and tests run with their results, unresolved issues, and concrete next steps. Keep it concise and self-contained; do not continue implementation.";

pub(crate) const fn agent_is_supported(agent: Option<Agent>) -> bool {
    matches!(agent, Some(Agent::Omp | Agent::Claude | Agent::Codex))
}

pub(crate) fn terminal_is_ready(
    terminal: &TerminalState,
    runtime: Option<&TerminalRuntime>,
) -> bool {
    if terminal.state != AgentState::Idle {
        return false;
    }

    let agent = terminal.effective_known_agent();
    if terminal.full_lifecycle_hook_authority_active() {
        return agent_is_supported(agent);
    }

    match agent {
        Some(agent @ (Agent::Claude | Agent::Codex)) => runtime.is_some_and(|runtime| {
            let screen = runtime.detection_text();
            let osc_title = runtime.agent_osc_title();
            let osc_progress = runtime.agent_osc_progress();
            manifest::detect_with_osc(
                agent,
                manifest::DetectionInput {
                    screen: &screen,
                    osc_title: &osc_title,
                    osc_progress: &osc_progress,
                },
            )
            .visible_idle
        }),
        _ => false,
    }
}

pub(crate) fn pane_is_ready(
    state: &AppState,
    terminal_runtimes: &TerminalRuntimeRegistry,
    ws_idx: usize,
    pane_id: PaneId,
) -> bool {
    let Some(pane) = state
        .workspaces
        .get(ws_idx)
        .and_then(|workspace| workspace.pane_state(pane_id))
    else {
        return false;
    };
    let Some(terminal) = state.terminals.get(&pane.attached_terminal_id) else {
        return false;
    };
    let runtime = state.runtime_for_pane_in_workspace(terminal_runtimes, ws_idx, pane_id);
    terminal_is_ready(terminal, runtime)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_summary_supports_requested_agents() {
        assert!(agent_is_supported(Some(Agent::Omp)));
        assert!(agent_is_supported(Some(Agent::Claude)));
        assert!(agent_is_supported(Some(Agent::Codex)));
    }

    #[test]
    fn session_summary_rejects_other_agents_and_shells() {
        assert!(!agent_is_supported(Some(Agent::Pi)));
        assert!(!agent_is_supported(None));
    }

    #[tokio::test]
    async fn session_summary_requires_idle_agent_prompt() {
        let mut terminal = TerminalState::new(crate::terminal::TerminalId::alloc(), "/repo".into());
        terminal.set_detected_state(Some(Agent::Omp), AgentState::Blocked);
        assert!(!terminal_is_ready(&terminal, None));

        terminal.set_detected_state(Some(Agent::Omp), AgentState::Idle);
        assert!(!terminal_is_ready(&terminal, None));
        terminal.set_hook_authority(
            "herdr:omp".into(),
            "omp".into(),
            AgentState::Idle,
            None,
            None,
        );
        assert!(terminal_is_ready(&terminal, None));

        let mut detected_terminal =
            TerminalState::new(crate::terminal::TerminalId::alloc(), "/repo".into());
        detected_terminal.set_detected_state(Some(Agent::Claude), AgentState::Idle);
        assert!(!terminal_is_ready(&detected_terminal, None));

        let prompt = TerminalRuntime::test_with_screen_bytes(80, 24, b"");
        prompt.test_process_pty_bytes(b"\x1b]0;\xE2\x9C\xB3 Claude Code\x07");
        assert!(terminal_is_ready(&detected_terminal, Some(&prompt)));

        let model_picker = TerminalRuntime::test_with_screen_bytes(
            80,
            24,
            b"Select model\nEnter to set as default\nEsc to cancel",
        );
        model_picker.test_process_pty_bytes(b"\x1b]0;\xE2\x9C\xB3 Claude Code\x07");
        assert!(!terminal_is_ready(&detected_terminal, Some(&model_picker)));
    }
}
