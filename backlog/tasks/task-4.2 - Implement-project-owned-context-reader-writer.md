---
id: TASK-4.2
title: Implement project-owned context reader/writer
status: To Do
assignee: []
created_date: '2026-11-16T08:20:00Z'
labels: []
dependencies: []
parent_task_id: TASK-4
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
project.md, direction.md, roadmap.md, inbox.md, initiatives/, sessions/를 원자적으로 읽고 쓰는 저장 계층을 만든다. Markdown은 사람이 읽고 Git diff가 가능해야 한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 모든 파일이 atomic write된다
- [ ] #2 동시 세션에서 충돌을 감지한다
- [ ] #3 private-cache와 project-owned 모드가 같은 API를 공유한다
<!-- AC:END -->
