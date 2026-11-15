---
id: TASK-3
title: 채팅형 아이디어 캡처와 에이전트 연동
status: In Progress
assignee: []
created_date: '2026-11-15T16:36:00Z'
updated_date: '2026-11-15T17:18:00Z'
labels: []
milestone: m-0
dependencies: []
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
나에게 보내기처럼 메모하고 작업으로 전환하며 MCP로 에이전트가 문맥을 읽고 기록한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 메모가 영구 Markdown으로 저장되고 작업으로 전환된다
- [ ] #2 MCP에서 이어하기·메모·상태 변경이 가능하다
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 채팅형 Markdown 인박스를 만든다. 2. 메모를 작업/초안으로 전환한다. 3. MCP로 문맥 읽기와 기록을 제공한다.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
채팅 UI, 작업 전환, MCP 6개 도구와 CLI를 구현했다. 실제 MCP initialize/capture/resource 응답 확인.
<!-- SECTION:NOTES:END -->
