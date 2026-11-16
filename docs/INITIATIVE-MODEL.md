# Vibonitor Initiative Model

## Decision

Vibonitor's visible planning unit is an **Initiative**: an LLM-interpreted, human-approved product outcome. One Initiative SHOULD map to one reviewable pull request. The user manages direction and Initiative approval; agents manage implementation issues.

```text
Project direction
  └── Roadmap outcome
       └── Initiative card (one intended PR)
            ├── Pull request
            └── implementation issues
                 └── sub-issues
```

A small issue MUST NOT become a top-level board card. It belongs inside its Initiative and is visible only in the expanded detail view. Every issue MUST reference the Initiative and its acceptance criteria, otherwise local optimization can make the project worse while the issue appears complete.

## Initiative lifecycle

```text
Captured → Proposed → Approved → In progress → Review → Merged
                 └────────────── Rejected / Parked
```

- **Captured**: prompt, idea, or roadmap change exists but has not been interpreted.
- **Proposed**: LLM generated outcome, scope, acceptance criteria, PR shape, and issue graph.
- **Approved**: the user accepted the interpretation and plan. No coding before this state.
- **In progress**: an agent owns implementation work.
- **Review**: a PR exists and an isolated reviewer is running or has produced a result.
- **Merged**: the PR was merged; the Initiative is complete only after verification.

State changes from an agent or GitHub event MUST be recorded with an event, timestamp, source, and related identifier. The UI MAY offer recommendations, but it MUST NOT silently rewrite the user's direction or approved plan.

## Initiative card contract

Every card stores:

- `id`, `project_id`, `title`, `outcome`
- `source_prompt` and `source_session`
- `roadmap_node` and `direction_ref`
- `approved_plan`, `acceptance_criteria`, `non_goals`
- `status`, `owner`, `created_at`, `updated_at`
- `pr_ref`, `review_ref`, `merge_ref`
- child issue graph and event log
- `next_action` and `last_context`

The card's primary display is: why, outcome, current state, last completed step, next action, PR/review state. The issue graph is collapsed by default.

## Context storage

Project-owned context lives in a versioned `.vibonitor/` directory:

```text
.vibonitor/
├── project.md       # purpose, users, constraints, non-negotiables
├── direction.md     # durable product direction
├── roadmap.md       # human-approved outcomes and phases
├── inbox.md         # quick thoughts not yet promoted
├── initiatives/     # one Markdown/YAML record per Initiative
└── sessions/        # session start/end summaries and approved plans
```

The app may maintain a local index/cache, but the project-owned files are the portable source of truth. A project MAY opt out and keep private context in `~/.vibonitor`.

## Agent event contract

Harness adapters emit normalized events:

- `session.started`
- `prompt.submitted`
- `plan.proposed`
- `plan.approved`
- `issue.created`, `issue.completed`
- `pr.opened`, `pr.updated`, `pr.merged`
- `review.started`, `review.passed`, `review.failed`
- `session.stopped`

Prompts and approved plans are append-only records. Summaries can be regenerated, but the original prompt and approval decision MUST remain available.

## Review and merge safety

A reviewer runs against an isolated checkout or PR ref, not the mutable working tree. It returns structured verdict data:

```json
{
  "verdict": "pass|changes_requested|blocked",
  "commit": "...",
  "pr": "...",
  "findings": [],
  "checks": [],
  "reviewer": "gpt-6.1-sol-high",
  "createdAt": "..."
}
```

Auto-merge is allowed only when the PR is approved by the isolated reviewer, required CI checks pass, the source branch and review commit still match, and the user/project policy enables auto-merge. A changed commit invalidates the review and MUST block merge.

## UI rules

- Overview answers “what do I continue?” in under one minute.
- Roadmap answers “why and where are we going?”
- Board answers “which large Initiative is moving?”
- Detail answers “what did the agent do, what did I approve, and what is next?”
- Quick capture always uses the currently selected project and never requires a separate chat app.
- Child issues, raw prompts, and event logs are collapsed until requested.
