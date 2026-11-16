---
id: TASK-7.1
title: Implement normalized agent event adapter
status: To Do
assignee: []
created_date: 2026-11-16T08:22:00Z
labels: []
dependencies: []
parent_task_id: TASK-7
ordinal: 20000
updated_date: 2026-11-16T11:40:06.569Z
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Claude Code와 Codex 세션 파일/훅을 session.started, prompt.submitted, plan.proposed, plan.approved, issue, PR, review, session.stopped 공통 이벤트로 정규화한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 각 이벤트에 project, initiative, session, source, timestamp가 있다
- [ ] #2 원문 payload 위치를 보존한다
- [ ] #3 중복 이벤트를 idempotently 처리한다
<!-- AC:END -->
