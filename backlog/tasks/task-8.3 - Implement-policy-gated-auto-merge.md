---
id: TASK-8.3
title: Implement policy-gated auto merge
status: To Do
assignee: []
created_date: '2026-11-16T08:22:00Z'
labels: []
dependencies: []
parent_task_id: TASK-8
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
리뷰 pass, 필수 CI 성공, 동일 commit, 프로젝트 auto-merge 정책을 모두 만족할 때만 GitHub PR merge를 실행한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 하나라도 실패하면 merge하지 않는다
- [ ] #2 merge 전 최종 head/check를 재검증한다
- [ ] #3 merge 결과와 실패 원인이 이벤트에 기록된다
<!-- AC:END -->
