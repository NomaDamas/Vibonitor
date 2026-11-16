---
id: TASK-7
title: '[INIT-004] Agent and GitHub synchronization'
status: To Do
assignee: []
created_date: '2026-11-16T08:19:00Z'
labels: []
milestone: m-1
dependencies: []
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
에이전트 세션 이벤트와 GitHub Issue/PR 상태를 Initiative 이벤트 로그로 통합한다. 수동 복사 없이 카드 상태가 실제 개발 상태를 반영해야 한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Claude Code와 Codex 세션 이벤트를 공통 이벤트로 변환한다
- [ ] #2 프롬프트, 계획, 승인, 이슈, PR, 세션 종료 이벤트가 기록된다
- [ ] #3 GitHub Issue와 PR이 안정적인 참조로 연결된다
- [ ] #4 동기화 실패와 충돌을 사용자에게 숨기지 않는다
<!-- AC:END -->
