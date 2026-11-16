# Vibonitor Timeline Alignment Model

Vibonitor exists to reduce the cognitive cost of aligning past work, current work, and future intent after chat context is lost.

## Three axes

```text
Future intent: roadmap ideas and direction
        ↓
Past ─── checkpoint timeline ─── Current ─── next checkpoint
        ↑
Inbox: thoughts waiting to be aligned
```

### Roadmap

Roadmap nodes are future intent: ideas, desired outcomes, product direction, and hypotheses. They are not code tasks or generated TODO lists. A roadmap node MAY be linked to one or more future work streams.

### Checkpoint timeline

A checkpoint is one meaningful agent work session or user-approved work transition. It contains:

- a short title for the large work performed
- one-line summary
- the sub-TODOs discovered or completed by the agent
- project, branch, pane/session, and timestamp
- links to the preceding and following checkpoints when known
- the related roadmap idea or work stream

The timeline is the primary answer to “what did I do?” It must not display the full chat transcript by default.

### Work stream / large task

A large task groups checkpoints that pursue one outcome. It is the kanban card. The card shows a concise summary and sub-TODOs; progress percentages are optional and not a primary signal.

### Inbox

Inbox is an always-available capture surface. It stores thoughts before alignment. A thought can later be attached to a roadmap node, a work stream, or a checkpoint. Capture must not require the user to decide the final category immediately.

## Parallel panes and branches

Every checkpoint records the source session and branch when available. Multiple panes on the same project are separate streams until a merge/continuation relationship is observed. A merged branch creates a checkpoint event that joins the streams; it does not erase their histories.

```text
Project
├── Roadmap idea: preserve context
│   ├── Work stream A: context storage
│   │   ├── pane/session checkpoint 1
│   │   └── pane/session checkpoint 2
│   └── Work stream B: agent sync
│       └── pane/session checkpoint 3
└── Inbox thoughts waiting for alignment
```

## UX constraints

- No completion percentage as the headline.
- No raw Markdown headings in the primary roadmap view.
- No long assistant response in a checkpoint card.
- One clear sentence per large task and a short TODO list beneath it.
- The user can see past, current, and future without switching mental models.
- A project opens on the current checkpoint and exposes the nearest future roadmap node.
