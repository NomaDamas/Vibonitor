import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBacklogTask, updateTaskContext, updateTaskStatus } from './backlog.js';
import { getDashboard } from './dashboard.js';
import { registerProject, run, scanProjects } from './projects.js';
import { createMemo, deleteMemo, getConfig, listMemos, removeProject, updateMemo } from './store.js';
import type { MemoInput, ProjectInput, PromoteInput } from './types.js';

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8',
};

async function body(request: IncomingMessage) {
  let source = '';
  for await (const chunk of request) {
    source += chunk;
    if (source.length > 1_000_000) throw new Error('요청이 너무 큽니다.');
  }
  return source ? JSON.parse(source) as Record<string, unknown> : {};
}

export function startServer(port = Number(process.env.PORT ?? 43110)) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const send = (status: number, value: unknown) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(value));
    };
    try {
      if (url.pathname.startsWith('/api/')) {
        if (request.method === 'GET' && url.pathname === '/api/dashboard') return send(200, await getDashboard());
        if (request.method === 'POST' && url.pathname === '/api/refresh') return send(200, await getDashboard());
        if (request.method === 'POST' && url.pathname === '/api/projects') {
          return send(201, await registerProject(await body(request) as unknown as ProjectInput));
        }
        if (request.method === 'POST' && url.pathname === '/api/projects/scan') {
          const input = await body(request);
          if (typeof input.path !== 'string') return send(400, { error: '스캔할 경로가 필요합니다.' });
          return send(200, await scanProjects(input.path));
        }
        const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
        if (request.method === 'DELETE' && projectMatch) {
          return (await removeProject(projectMatch[1])) ? send(200, { ok: true }) : send(404, { error: '프로젝트가 없습니다.' });
        }
        const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/([^/]+)$/);
        if (request.method === 'PATCH' && taskMatch) {
          const input = await body(request);
          const project = (await getConfig()).projects.find((item) => item.id === taskMatch[1]);
          if (!project) return send(404, { error: '프로젝트가 없습니다.' });
          const taskId = decodeURIComponent(taskMatch[2]);
          if (typeof input.status === 'string') await updateTaskStatus(project, taskId, input.status);
          if (typeof input.plan === 'string' || typeof input.notes === 'string' || typeof input.finalSummary === 'string') {
            await updateTaskContext(project, taskId, {
              plan: input.plan as string | undefined, notes: input.notes as string | undefined, finalSummary: input.finalSummary as string | undefined,
            });
          }
          return send(200, { ok: true });
        }
        if (request.method === 'GET' && url.pathname === '/api/memos') {
          return send(200, await listMemos());
        }
        if (request.method === 'POST' && url.pathname === '/api/memos') {
          return send(201, await createMemo(await body(request) as unknown as MemoInput));
        }
        const memoMatch = url.pathname.match(/^\/api\/memos\/([^/]+)$/);
        if (request.method === 'DELETE' && memoMatch) {
          return (await deleteMemo(memoMatch[1])) ? send(200, { ok: true }) : send(404, { error: '메모가 없습니다.' });
        }
        const promoteMatch = url.pathname.match(/^\/api\/memos\/([^/]+)\/promote$/);
        if (request.method === 'POST' && promoteMatch) {
          const input = await body(request) as unknown as PromoteInput;
          const project = (await getConfig()).projects.find((item) => item.id === input.projectId);
          if (!project) return send(404, { error: '프로젝트가 없습니다.' });
          const memo = (await listMemos()).find((item) => item.id === promoteMatch[1]);
          if (!memo) return send(404, { error: '메모가 없습니다.' });
          if (!input.title?.trim()) return send(400, { error: '작업 제목이 필요합니다.' });
          if (project.kind === 'github') {
            const { stdout } = await run('gh', ['issue', 'create', '-R', project.repo!, '--title', input.title, '--body', memo.body]);
            const updated = await updateMemo(memo.id, { promotedTo: stdout.trim(), projectId: project.id });
            return send(201, { memo: updated, url: stdout.trim() });
          }
          const task = await createBacklogTask(project, { ...input, description: memo.body });
          const updated = await updateMemo(memo.id, { promotedTo: task.id, projectId: project.id });
          return send(201, { memo: updated, task });
        }
        return send(404, { error: 'API를 찾을 수 없습니다.' });
      }

      const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
      const requested = url.pathname === '/' ? 'index.html' : normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]/, '');
      let path = join(publicDir, requested);
      if (!path.startsWith(publicDir)) return send(403, { error: 'Forbidden' });
      if (!existsSync(path) || !(await stat(path)).isFile()) path = join(publicDir, 'index.html');
      if (!existsSync(path)) return send(503, { error: 'npm run build를 먼저 실행하세요.' });
      response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
      createReadStream(path).pipe(response);
    } catch (error) {
      send(400, { error: error instanceof Error ? error.message : String(error) });
    }
  });
  server.listen(port, '127.0.0.1', () => console.log(`Vibonitor → http://127.0.0.1:${port}`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startServer();
