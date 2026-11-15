---
id: TASK-1
title: 프로젝트와 Backlog.md 통합
status: In Progress
assignee: []
created_date: '2026-11-15T16:35:00Z'
updated_date: '2026-11-15T17:18:00Z'
labels: []
milestone: m-0
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
로컬/GitHub 프로젝트를 등록하고 원본 Backlog.md 작업·마일스톤·의존성을 수집한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 로컬 폴더와 GitHub 저장소를 등록할 수 있다
- [ ] #2 작업 상태 변경이 원본 파일이나 GitHub에 반영된다
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 로컬 경로와 GitHub 저장소를 등록한다. 2. Backlog.md 원본 파일에서 작업과 로드맵을 읽는다. 3. 상태 변경을 원본에 반영한다.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
로컬/GitHub 등록, 상위 폴더 스캔, Backlog.md/GitHub 수집과 상태 변경을 구현했다. HTTP 통합 테스트 통과.
<!-- SECTION:NOTES:END -->
