#!/usr/bin/env node
import { appendFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { allResumeContexts } from './context.js';
import { approveInitiative, proposeInitiative } from './initiatives.js';
import { getDashboard } from './dashboard.js';
import { initProjectContext, readProjectContext } from './project-context.js';
import { startMcpServer } from './mcp.js';
import { startTui } from './tui.js';
import { syncProjectInitiatives } from './sync.js';
import { registerProject, scanProjects } from './projects.js';
import { startServer } from './server.js';
import { createMemo, getConfig } from './store.js';

const usage = `Vibonitor — 프로젝트의 맥락을 이어가는 로컬 대시보드

vibonitor [serve]                 웹 대시보드 실행 (http://127.0.0.1:43110)
vibonitor add <경로|owner/repo>    프로젝트 등록
vibonitor scan <상위 폴더>          폴더 안의 저장소를 찾아 등록
vibonitor projects               프로젝트와 작업 현황 출력
vibonitor memo <내용>             채팅 인박스에 메모 저장
vibonitor resume                 모든 프로젝트 이어하기 문맥 출력
vibonitor context init <id>       프로젝트 소유 .vibonitor 구조 초기화
vibonitor context show <id>       프로젝트 방향·로드맵·인박스 조회
vibonitor initiative propose <id> <prompt>  큰 구현 카드 제안 생성
vibonitor initiative approve <id> <initiative>  제안 승인
vibonitor mcp                    MCP stdio 서버 실행
vibonitor tui                    키보드 터미널 cockpit
vibonitor sync                   GitHub PR/Initiative 상태 동기화
vibonitor init                   현재 저장소 AGENTS.md에 작업 규칙 추가
`;

export async function runCli(args = process.argv.slice(2)) {
  const [command = 'serve', ...rest] = args;
  if (command === 'serve') return startServer();
  if (command === 'mcp') return startMcpServer();
  if (command === 'tui') return startTui();
  if (command === 'help' || command === '--help' || command === '-h') return console.log(usage);
  if (command === 'add') {
    if (!rest[0]) throw new Error('등록할 로컬 경로 또는 owner/repo를 입력하세요.');
    const kind = rest[0].includes('/') && !rest[0].startsWith('.') && !rest[0].startsWith('~') && !existsSync(resolve(rest[0])) ? 'github' : 'local';
    const project = await registerProject({ kind, value: rest.join(' ') });
    return console.log(`등록 완료: ${project.name} (${project.id})`);
  }
  if (command === 'scan') {
    if (!rest[0]) throw new Error('스캔할 상위 폴더를 입력하세요.');
    const result = await scanProjects(rest[0]);
    return console.log(`${result.added.length}개 프로젝트 등록 완료\n${result.added.map((project) => `- ${project.name}`).join('\n')}`);
  }
  if (command === 'projects') {
    const dashboard = await getDashboard();
    return console.log(dashboard.projects.map((snapshot) => `${snapshot.project.name} (${snapshot.project.id})\n  작업 ${snapshot.tasks.length} · 진행 중 ${snapshot.tasks.filter((task) => /progress|doing/i.test(task.status)).length}`).join('\n'));
  }
  if (command === 'sync') {
    const config = await getConfig();
    const results = await Promise.all(config.projects.filter((project) => project.kind === 'local').map(async (project) => ({ project: project.name, ...(await syncProjectInitiatives(project)) })));
    return console.log(JSON.stringify(results, null, 2));
  }
  if (command === 'memo') {
    const body = rest.join(' ').trim();
    if (!body) throw new Error('메모 내용을 입력하세요.');
    const memo = await createMemo({ body });
    return console.log(`인박스에 저장했습니다: ${memo.id}`);
  }
  if (command === 'resume') return console.log(await allResumeContexts());
  if (command === 'context') {
    const projectId = rest[1];
    const project = (await getConfig()).projects.find((item) => item.id === projectId || item.name === projectId);
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');
    if (rest[0] === 'init') return console.log(`컨텍스트 디렉터리: ${await initProjectContext(project)}`);
    if (rest[0] === 'show') return console.log(JSON.stringify(await readProjectContext(project), null, 2));
  }
  if (command === 'initiative') {
    const projectId = rest[1];
    const project = (await getConfig()).projects.find((item) => item.id === projectId || item.name === projectId);
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');
    if (rest[0] === 'propose') return console.log(JSON.stringify(await proposeInitiative(project, rest.slice(2).join(' ')), null, 2));
    if (rest[0] === 'approve') return console.log(JSON.stringify(await approveInitiative(project, rest[2]), null, 2));
  }
  if (command === 'init') {
    const path = resolve('AGENTS.md');
    const marker = '## Vibonitor continuity';
    const existing = existsSync(path) ? await readFile(path, 'utf8') : '';
    if (existing.includes(marker)) return console.log('AGENTS.md에 이미 Vibonitor 규칙이 있습니다.');
    const rule = `\n${marker}\n\n- 세션 시작 시 Vibonitor MCP의 \`get_resume_context\`를 읽고 현재 작업을 이어갑니다.\n- 사용자에게 \"어디까지 했냐\"고 다시 묻지 말고 작업 파일, 커밋, 세션 문맥을 먼저 확인합니다.\n- 새 아이디어와 결정은 \`capture_idea\`에 저장합니다.\n- 작업 상태와 Backlog.md의 Implementation plan, Implementation notes, Final summary를 작업 중과 종료 전에 갱신합니다.\n- 하나의 작업이 끝나면 다음 unblocked 작업을 확인해 로드맵을 이어갑니다.\n`;
    await appendFile(path, rule, 'utf8');
    return console.log('AGENTS.md에 문맥 이어가기 규칙을 추가했습니다.');
  }
  console.log(usage);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
