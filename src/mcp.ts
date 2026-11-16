import { createInterface } from 'node:readline';
import { createBacklogTask, updateTaskContext, updateTaskStatus } from './backlog.js';
import { getDashboard } from './dashboard.js';
import { approveInitiative, proposeInitiative } from './initiatives.js';
import { appendProjectInbox, initProjectContext } from './project-context.js';
import { resumeContext } from './context.js';
import { createMemo, listMemos, updateMemo } from './store.js';

interface RpcRequest {
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

const text = (value: unknown) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const tools = [
  {
    name: 'capture_idea',
    description: '사용자의 아이디어, 결정, 나중에 할 일을 Vibonitor 채팅 인박스에 저장합니다.',
    inputSchema: { type: 'object', properties: { body: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' } }, required: ['body'] },
  },
  {
    name: 'get_resume_context',
    description: '현재 작업, 계획, 작업 노트, 다음 가능한 작업, 최근 커밋, 마지막 에이전트 세션을 읽습니다. 세션 시작 시 호출하세요.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } } },
  },
  {
    name: 'list_projects',
    description: '등록된 로컬/GitHub 프로젝트와 작업 상태를 나열합니다.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'promote_idea',
    description: '인박스 메모를 Backlog.md 작업 또는 초안으로 전환합니다.',
    inputSchema: { type: 'object', properties: { memoId: { type: 'string' }, projectId: { type: 'string' }, title: { type: 'string' }, milestone: { type: 'string' }, parent: { type: 'string' }, draft: { type: 'boolean' } }, required: ['memoId', 'projectId', 'title'] },
  },
  {
    name: 'update_task_status',
    description: 'Backlog.md 작업 상태를 갱신해 대시보드와 로드맵을 최신으로 유지합니다.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, taskId: { type: 'string' }, status: { type: 'string' } }, required: ['projectId', 'taskId', 'status'] },
  },
  {
    name: 'update_task_context',
    description: '다음 세션이 이어받을 수 있게 작업의 Implementation plan, Implementation notes, Final summary를 갱신합니다.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, taskId: { type: 'string' }, plan: { type: 'string' }, notes: { type: 'string' }, finalSummary: { type: 'string' } }, required: ['projectId', 'taskId'] },
  },
  {
    name: 'propose_initiative',
    description: '사용자 프롬프트와 프로젝트 방향을 하나의 PR 단위 Initiative 제안으로 정리합니다. 승인 전 코딩하지 않습니다.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, prompt: { type: 'string' } }, required: ['projectId', 'prompt'] },
  },
  {
    name: 'approve_initiative',
    description: '사용자가 검토한 Initiative 계획을 승인하고 실행 가능한 상태로 만듭니다.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, initiativeId: { type: 'string' } }, required: ['projectId', 'initiativeId'] },
  },
  {
    name: 'capture_project_context',
    description: '현재 프로젝트의 .vibonitor/inbox.md에 생각을 저장합니다.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, body: { type: 'string' } }, required: ['projectId', 'body'] },
   },
 ];

async function callTool(name: string, args: Record<string, unknown>) {
  const dashboard = await getDashboard();
  if (name === 'capture_idea') {
    if (typeof args.body !== 'string' || !args.body.trim()) throw new Error('body가 필요합니다.');
    if (typeof args.projectId === 'string') {
      const project = dashboard.projects.find((item) => item.project.id === args.projectId)?.project;
      if (!project?.path) throw new Error('프로젝트 소유 컨텍스트에는 로컬 프로젝트가 필요합니다.');
      return appendProjectInbox(project, args.body, { source: 'mcp' });
    }
    return createMemo({ body: args.body, projectId: undefined, taskId: args.taskId as string | undefined });
  }
  if (name === 'capture_project_context') {
    const snapshot = dashboard.projects.find((item) => item.project.id === args.projectId);
    if (!snapshot || !snapshot.project.path) throw new Error('로컬 프로젝트를 찾을 수 없습니다.');
    return appendProjectInbox(snapshot.project, String(args.body), { source: 'mcp' });
  }
  if (name === 'propose_initiative') {
    const project = dashboard.projects.find((item) => item.project.id === args.projectId)?.project;
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');
    return proposeInitiative(project, String(args.prompt));
  }
  if (name === 'approve_initiative') {
    const project = dashboard.projects.find((item) => item.project.id === args.projectId)?.project;
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');
    return approveInitiative(project, String(args.initiativeId));
  }
  if (name === 'list_projects') return dashboard.projects.map((snapshot) => ({
    id: snapshot.project.id, name: snapshot.project.name, kind: snapshot.project.kind,
    path: snapshot.project.path, repo: snapshot.project.repo,
    tasks: snapshot.tasks.map((task) => ({ id: task.id, title: task.title, status: task.status, milestone: task.milestone })),
  }));
  if (name === 'get_resume_context') {
    if (!args.projectId) return dashboard.projects.map((snapshot) => resumeContext(snapshot)).join('\n\n---\n\n');
    const snapshot = dashboard.projects.find((item) => item.project.id === args.projectId || item.project.name === args.projectId);
    if (!snapshot) throw new Error('프로젝트를 찾을 수 없습니다.');
    return resumeContext(snapshot);
  }
  if (name === 'update_task_status') {
    const snapshot = dashboard.projects.find((item) => item.project.id === args.projectId);
    if (!snapshot) throw new Error('프로젝트를 찾을 수 없습니다.');
    await updateTaskStatus(snapshot.project, String(args.taskId), String(args.status));
    return { ok: true };
  }
  if (name === 'update_task_context') {
    const snapshot = dashboard.projects.find((item) => item.project.id === args.projectId);
    if (!snapshot) throw new Error('프로젝트를 찾을 수 없습니다.');
    await updateTaskContext(snapshot.project, String(args.taskId), {
      plan: args.plan as string | undefined, notes: args.notes as string | undefined, finalSummary: args.finalSummary as string | undefined,
    });
    return { ok: true };
  }
  if (name === 'promote_idea') {
    const project = dashboard.projects.find((item) => item.project.id === args.projectId)?.project;
    const memo = (await listMemos()).find((item) => item.id === args.memoId);
    if (!project || !memo) throw new Error('프로젝트 또는 메모를 찾을 수 없습니다.');
    if (project.kind !== 'local') throw new Error('MCP 작업 전환은 로컬 Backlog.md 프로젝트만 지원합니다.');
    const task = await createBacklogTask(project, {
      title: String(args.title), description: memo.body, milestone: args.milestone as string | undefined,
      parent: args.parent as string | undefined, draft: Boolean(args.draft),
    });
    await updateMemo(memo.id, { promotedTo: task.id, projectId: project.id });
    return task;
  }
  throw new Error(`알 수 없는 도구: ${name}`);
}

export function startMcpServer() {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on('line', async (line) => {
    if (!line.trim()) return;
    let request: RpcRequest;
    try { request = JSON.parse(line) as RpcRequest; } catch { return; }
    if (request.id == null) return;
    const reply = (result: unknown) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, result })}\n`);
    const fail = (message: string) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message } })}\n`);
    try {
      if (request.method === 'initialize') return reply({
        protocolVersion: '2025-03-26', capabilities: { tools: {}, resources: {} },
        serverInfo: { name: 'vibonitor', version: '0.1.0' },
        instructions: '세션을 시작하면 get_resume_context로 프로젝트 문맥을 복원하세요. 떠오른 아이디어와 결정은 capture_idea에 저장하고, 작업 상태는 update_task_status, 계획·진행 노트·최종 요약은 update_task_context로 기록하세요.',
      });
      if (request.method === 'ping') return reply({});
      if (request.method === 'tools/list') return reply({ tools });
      if (request.method === 'tools/call') {
        const params = request.params ?? {};
        return reply(text(await callTool(String(params.name), (params.arguments ?? {}) as Record<string, unknown>)));
      }
      if (request.method === 'resources/list') {
        const dashboard = await getDashboard();
        return reply({ resources: [
          { uri: 'vibonitor://resume', name: '모든 프로젝트 이어하기', mimeType: 'text/markdown' },
          { uri: 'vibonitor://inbox', name: '아이디어 인박스', mimeType: 'application/json' },
          ...dashboard.projects.map((snapshot) => ({ uri: `vibonitor://resume/${snapshot.project.id}`, name: `${snapshot.project.name} 이어하기`, mimeType: 'text/markdown' })),
        ] });
      }
      if (request.method === 'resources/read') {
        const uri = String(request.params?.uri ?? '');
        const dashboard = await getDashboard();
        let value: unknown;
        if (uri === 'vibonitor://resume') value = dashboard.projects.map(resumeContext).join('\n\n---\n\n');
        else if (uri === 'vibonitor://inbox') value = await listMemos();
        else {
          const id = uri.replace('vibonitor://resume/', '');
          const snapshot = dashboard.projects.find((item) => item.project.id === id);
          if (!snapshot) throw new Error('리소스를 찾을 수 없습니다.');
          value = resumeContext(snapshot);
        }
        return reply({ contents: [{ uri, mimeType: typeof value === 'string' ? 'text/markdown' : 'application/json', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
      }
      fail(`지원하지 않는 메서드: ${request.method}`);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  });
}
