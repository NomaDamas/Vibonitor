---
id: TASK-5.1
title: Capture prompt and generate Initiative proposal contract
status: To Do
assignee: []
created_date: '2026-11-16T08:21:00Z'
labels: []
dependencies: []
parent_task_id: TASK-5
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
사용자 프롬프트, 선택 프로젝트, 현재 방향, 로드맵, active card를 입력으로 받아 Initiative 제안 JSON/Markdown을 생성한다. 모델 호출 실패 시 원문을 잃지 않는다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 원문 prompt가 immutable source로 저장된다
- [ ] #2 outcome, non-goals, acceptance criteria, PR shape, issue graph를 반환한다
- [ ] #3 model/provider/version과 생성시각이 기록된다
<!-- AC:END -->
