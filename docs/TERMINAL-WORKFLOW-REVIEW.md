# Terminal Workflow Review

This document is intentionally written after the terminal cockpit exists. It records the next discussion, not an unapproved redesign.

## Current flow

```text
vibonitor tui
  1 overview   current project, active Initiative, next action
  2 roadmap    project-owned planning roadmap
  3 inbox      project-owned inbox
  j/k          switch project
  n            capture multiline thought
  r            sync and refresh
  q            quit
```

One-shot commands use the same data model:

```bash
vibonitor resume
vibonitor context show <project-id>
vibonitor initiative propose <project-id> "..."
vibonitor initiative approve <project-id> <initiative-id>
vibonitor sync
```

## Questions for the next UX discussion

1. Is the current project always obvious enough before a thought is saved?
2. Should `n` open a project-owned inbox only, or offer global/private capture as a deliberate option?
3. Is `j/k` project switching faster than a numbered project picker for a large workspace?
4. Should the terminal view show only the active Initiative or also the latest merged Initiative?
5. When an agent submits a prompt, should the user see a proposal immediately or only after the agent finishes interpreting it?
6. Which approval actions need a confirmation key to prevent accidental execution?
7. Should a PR review failure return to the Initiative card, the child issue, or both?

## Current limitation

The terminal cockpit is keyboard-driven and does not use drag-and-drop. The global OS shortcut/app packaging decision remains intentionally open until real terminal sessions reveal the friction points.
