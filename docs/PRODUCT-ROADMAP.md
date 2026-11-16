# Vibonitor Product Roadmap

This roadmap is the approved implementation plan for the Initiative-centered product model. It is planning data, not a list of source files.

## Phase 1 — Portable project memory

**Outcome:** Any project can carry its direction, roadmap, inbox, Initiative cards, and session handoff in Git.

- Detect or initialize `.vibonitor/` safely.
- Read/write `project.md`, `direction.md`, `roadmap.md`, `inbox.md`.
- Store Initiative records with stable IDs and event history.
- Keep a private-cache mode for projects that must not commit context.
- Add agent-readable instructions and migration from current global inbox.

## Phase 2 — Prompt-to-Initiative planning

**Outcome:** A user prompt becomes a reviewable Initiative proposal instead of a pile of micro cards.

- Capture the original prompt and current project context.
- Generate an Initiative proposal with outcome, non-goals, acceptance criteria, PR shape, and issue graph.
- Display proposal diff against the current roadmap.
- Require explicit approval before implementation.
- Persist the approved plan and approval event immutably.

## Phase 3 — Initiative board and issue graph

**Outcome:** The board shows only large user-relevant implementation cards.

- Replace task-centric board cards with Initiative cards.
- Show PR status, review status, progress, next action, and last context.
- Collapse child issues and sub-issues by default.
- Prevent orphan issues and detect local optimization without Initiative acceptance criteria.
- Keep the current Backlog.md adapter as an import/export bridge during migration.

## Phase 4 — Agent and GitHub synchronization

**Outcome:** The card reflects actual agent and GitHub state without manual duplication.

- Normalize Claude Code/Codex session events.
- Record prompts, plans, approvals, tool activity summaries, and session endings.
- Sync GitHub Issues and PRs by stable references.
- Add webhook/polling reconciliation and conflict visibility.
- Transition cards through agent/PR events with an auditable event log.

## Phase 5 — Isolated review and merge gate

**Outcome:** A completed PR can be reviewed and merged without losing the approved goal.

- Create an isolated review checkout at the exact PR commit.
- Invoke the configured `gpt-6.1-sol-high` reviewer with the Initiative contract.
- Store structured findings and link every finding to a PR/commit.
- Block stale or failed reviews.
- Merge only after review pass, CI pass, and commit identity verification.

## Phase 6 — Terminal cockpit

**Outcome:** Terminal users get the same context-first flow without needing a browser.

- `vibonitor tui` opens a keyboard-driven single-page cockpit.
- Provide project switcher, current Initiative, roadmap, issue expansion, inbox capture, and review status.
- Use keyboard selection instead of drag-and-drop.
- Add shell-friendly one-shot commands and machine-readable JSON.
- Discuss app/global shortcut UX after the core model is proven.

## Definition of success

When returning after any gap, the user can select a project and answer in one view:

1. Why does this project exist?
2. Which approved Initiative is active?
3. What did I approve and what has changed?
4. What did the agent complete?
5. Which PR/review state is current?
6. What is the next action?

No micro issue should be required to answer those questions.
