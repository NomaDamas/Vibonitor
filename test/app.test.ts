import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const root = await mkdtemp(join(tmpdir(), 'vibonitor-app-'));
process.env.VIBONITOR_DATA_DIR = join(root, 'data');
const projectPath = join(root, 'project');
await mkdir(join(projectPath, 'backlog', 'tasks'), { recursive: true });
await writeFile(join(projectPath, 'backlog', 'tasks', 'TASK-1 - existing.md'), `---\nid: TASK-1\ntitle: Existing\nstatus: To Do\n---\n`);

// The data directory is process-wide; load modules after selecting the isolated test directory.
const { startServer } = await import('../src/server.js');
const { getConfig } = await import('../src/store.js');

test('HTTP workflow connects a project, captures chat context and promotes it into the roadmap', async (t) => {
  const server = startServer(0);
  const listening = Promise.withResolvers<void>();
  server.once('listening', listening.resolve);
  await listening.promise;
  t.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const request = async (path: string, method = 'GET', body?: unknown) => {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const value = await response.json() as Record<string, any>;
    assert(response.ok, JSON.stringify(value));
    return value;
  };
  const project = await request('/api/projects', 'POST', { kind: 'local', value: projectPath });
  const scanned = await request('/api/projects/scan', 'POST', { path: root });
  assert.equal(scanned.added.length, 1);
  assert.equal((await getConfig()).projects.length, 1, 'scanning must not duplicate registered projects');
  assert.deepEqual((await getConfig()).scanDirs, [root]);
  const memo = await request('/api/memos', 'POST', { body: '로드맵에 검색을 추가한다', projectId: project.id });
  const promoted = await request(`/api/memos/${memo.id}/promote`, 'POST', { projectId: project.id, title: '검색 추가', status: 'In Progress' });
  assert.equal(promoted.task.id, 'TASK-2');
  assert.equal(promoted.memo.promotedTo, 'TASK-2');
  const dashboard = await request('/api/dashboard');
  assert.equal(dashboard.projects[0].tasks.length, 2);
  assert.equal(dashboard.projects[0].tasks[1].description, '로드맵에 검색을 추가한다');
  await request(`/api/tasks/${project.id}/TASK-2`, 'PATCH', { notes: '검색 인덱스까지 완료', status: 'Done' });
  const updated = await request('/api/dashboard');
  assert.equal(updated.projects[0].tasks[1].status, 'Done');
  assert.equal(updated.projects[0].tasks[1].notes, '검색 인덱스까지 완료');
  assert.match(await readFile(join(projectPath, 'backlog', 'tasks', 'TASK-2 - 검색 추가.md'), 'utf8'), /status: Done/);
  assert.equal((await getConfig()).projects.length, 1);
});
