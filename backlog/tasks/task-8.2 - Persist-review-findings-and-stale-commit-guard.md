---
id: TASK-8.2
title: Persist review findings and stale commit guard
status: To Do
assignee: []
created_date: '2026-11-16T08:22:00Z'
labels: []
dependencies: []
parent_task_id: TASK-8
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
리뷰 verdict와 findings를 저장하고 PR head commit이 리뷰 대상과 달라지면 stale로 표시한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pass, changes_requested, blocked를 구분한다
- [ ] #2 finding에 파일/라인/심각도/근거가 있다
- [ ] #3 commit mismatch는 pass를 무효화한다
<!-- AC:END -->
