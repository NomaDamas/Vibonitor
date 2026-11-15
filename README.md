# Vibonitor

**채팅이 흘러가도 프로젝트의 맥락은 남아야 합니다.**

Vibonitor는 흩어진 로컬·GitHub 프로젝트의 Backlog.md 작업, Git 커밋, Claude Code·Codex 세션을 한 화면에 모으는 로컬 우선 대시보드입니다. 칸반과 로드맵으로 계획을 이어가고, 카카오톡 '나에게 보내기'처럼 아이디어를 던져두며, 다음 세션에서 현재 작업·계획·노트·다음 행동을 바로 복원합니다.

## 시작

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
```

개발 서버는 `http://127.0.0.1:43111`입니다. 프로덕션은 다음처럼 실행합니다.

```bash
npm run build
npm start
# http://127.0.0.1:43110
```

모든 개인 데이터는 `~/.vibonitor/`에 저장됩니다. 작업과 로드맵의 원본은 각 프로젝트 저장소의 Backlog.md 파일이며 Vibonitor가 별도 DB로 복사하지 않습니다. 서버는 기본적으로 `127.0.0.1`에만 바인딩됩니다.

## 프로젝트 연결

웹에서 **프로젝트 추가**를 누르거나 CLI를 사용합니다.

```bash
# 개발 중인 로컬 저장소
node --import tsx src/cli.ts add ~/projects/my-app

# 상위 폴더의 Git/Backlog.md 저장소를 자동 발견
node --import tsx src/cli.ts scan ~/projects

# GitHub 이슈·커밋 연결 (GitHub CLI 인증 필요)
gh auth login
node --import tsx src/cli.ts add owner/repository
```

로컬 프로젝트는 Git만 있어도 등록할 수 있습니다. 칸반·로드맵·작업 전환을 사용하려면 프로젝트에서 Backlog.md를 초기화하세요.

```bash
npm install -g backlog.md
cd ~/projects/my-app
backlog init "My App"
```

## 맥락 이어가기

**이어하기** 화면은 프로젝트별로 다음을 한 카드에 모읍니다.

- 진행 중인 작업의 Description, Implementation plan, Implementation notes, Final summary
- 의존성이 해소되어 바로 시작할 수 있는 다음 작업
- 최근 Git 커밋
- 최신 Claude Code 또는 Codex 세션의 요약·마지막 요청

요약은 별도 LLM API 키 없이 저장된 작업 기록과 세션 기록을 사용합니다. 좋은 복원 품질을 위해 작업을 마칠 때 Backlog.md의 계획·노트·최종 요약을 갱신하세요.

## 메모 → 로드맵

- **Inbox**에 채팅하듯 메모를 작성합니다. Enter 전송, Shift+Enter 줄바꿈.
- `Cmd/Ctrl + K`로 어느 화면에서나 빠르게 캡처합니다.
- 프로젝트·작업 칩을 붙여 아이디어가 생긴 문맥을 함께 저장합니다.
- 메모의 **작업으로** 버튼은 프로젝트, 마일스톤, 상위 작업을 지정해 Backlog.md 작업/초안으로 전환합니다.
- 메모는 사람이 읽을 수 있는 `~/.vibonitor/inbox/*.md` 파일로 보존됩니다.

## 코딩 에이전트 연결

빌드 후 MCP 서버를 등록합니다.

```bash
npm run build
claude mcp add vibonitor --scope user -- node /absolute/path/to/vibonitor/dist/cli.js mcp
# Codex
codex mcp add vibonitor -- node /absolute/path/to/vibonitor/dist/cli.js mcp
```

각 프로젝트에서 다음을 실행하면 `AGENTS.md`에 문맥 복원 규칙을 추가합니다.

```bash
node /absolute/path/to/vibonitor/dist/cli.js init
```

제공 MCP 도구:

| 도구 | 역할 |
|---|---|
| `get_resume_context` | 현재 작업·계획·노트·다음 작업·커밋·마지막 세션 복원 |
| `capture_idea` | 아이디어와 결정을 프로젝트/작업 문맥과 함께 저장 |
| `list_projects` | 프로젝트와 작업 목록 조회 |
| `promote_idea` | 인박스 메모를 Backlog.md 작업/초안으로 전환 |
| `update_task_status` | 작업 상태를 갱신해 로드맵을 최신으로 유지 |
| `update_task_context` | 다음 세션을 위한 계획·작업 노트·최종 요약 저장 |

MCP 리소스 `vibonitor://resume`, `vibonitor://resume/:projectId`, `vibonitor://inbox`도 제공합니다.

## CLI

```bash
vibonitor [serve]                 # 웹 대시보드
vibonitor add <경로|owner/repo>   # 프로젝트 등록
vibonitor scan <상위 폴더>         # 저장소 자동 발견
vibonitor projects               # 작업 현황
vibonitor memo <내용>             # 인박스 저장
vibonitor resume                 # 이어하기 문맥을 Markdown으로 출력
vibonitor mcp                    # MCP stdio 서버
vibonitor init                   # AGENTS.md 규칙 추가
```

소스에서 실행할 때는 `vibonitor` 대신 `node --import tsx src/cli.ts`를 사용합니다.

## 개발

```bash
npm run check
npm test
npm run build
```

`VIBONITOR_DATA_DIR`을 지정하면 설정과 인박스 위치를 바꿀 수 있습니다. `PORT`로 프로덕션 서버 포트를 바꿀 수 있습니다.
