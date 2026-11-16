---
id: TASK-7.3
title: Implement event log and conflict visibility
status: To Do
assignee: []
created_date: '2026-11-16T08:22:00Z'
labels: []
dependencies: []
parent_task_id: TASK-7
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
모든 자동 상태 변경을 감사 가능한 이벤트로 저장하고 로컬/에이전트/GitHub 상태가 다를 때 사용자가 선택할 수 있게 한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 자동 변경은 source와 reason을 가진다
- [ ] #2 충돌이 조용히 덮어써지지 않는다
- [ ] #3 재동기화가 중복 이벤트를 만들지 않는다
<!-- AC:END -->
