---
id: TASK-8
title: '[INIT-005] Isolated review and auto-merge gate'
status: To Do
assignee: []
created_date: '2026-11-16T08:19:00Z'
labels: []
milestone: m-1
dependencies: []
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR이 생성되면 정확한 커밋을 격리 checkout에서 gpt-6.1-sol-high로 리뷰하고, 통과·CI 성공·커밋 동일성 확인 후에만 자동 머지한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 리뷰가 PR의 고정 커밋에서 실행된다
- [ ] #2 verdict, findings, checks, reviewer, commit이 구조화되어 저장된다
- [ ] #3 변경 요청·실패·stale review는 자동 머지를 차단한다
- [ ] #4 통과한 동일 커밋만 프로젝트 정책에 따라 자동 머지된다
<!-- AC:END -->
