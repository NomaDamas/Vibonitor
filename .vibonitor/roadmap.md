# Roadmap

## Phase 1 — Portable project memory

프로젝트별 방향, 로드맵, 인박스, Initiative, 세션을 `.vibonitor/`로 커밋하고 에이전트가 다음 세션에 읽는다.

## Phase 2 — Prompt-to-Initiative

사용자 프롬프트와 현재 방향을 LLM이 하나의 PR 단위 큰 구현 카드와 내부 이슈 그래프로 제안한다. 사용자가 승인하기 전에는 코딩하지 않는다.

## Phase 3 — Initiative board

최상위 칸반은 제안됨, 승인됨, 진행 중, 리뷰, 완료의 큰 구현 카드만 표시한다. 이슈와 하위 이슈는 카드 상세에 접는다.

## Phase 4 — Agent and GitHub sync

프롬프트, 계획 승인, 에이전트 세션, GitHub Issue/PR, 리뷰 상태를 하나의 이벤트 흐름으로 동기화한다.

## Phase 5 — Isolated review and merge gate

정확한 PR 커밋을 격리 checkout에서 리뷰하고, 리뷰 통과·CI 통과·커밋 동일성 확인 뒤에만 자동 머지한다.

## Phase 6 — Terminal cockpit

드래그 없이 키보드로 같은 문맥, 로드맵, Initiative, 인박스를 사용하는 터미널 페이지를 제공한다.
