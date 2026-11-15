import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createBacklogTask, readBacklogTasks, readMilestones, updateTaskContext, updateTaskStatus } from '../src/backlog.js';
import { resumeContext } from '../src/context.js';
import type { Project } from '../src/types.js';

async function fixture() {
  const path = await mkdtemp(join(tmpdir(), 'vibonitor-backlog-'));
  await mkdir(join(path, 'backlog', 'tasks'), { recursive: true });
  await mkdir(join(path, 'backlog', 'milestones'), { recursive: true });
  const project: Project = { id: 'p1', name: 'Demo', kind: 'local', path, addedAt: new Date().toISOString() };
  await writeFile(join(path, 'backlog', 'tasks', 'TASK-1 - foundation.md'), `---\nid: TASK-1\ntitle: Foundation\nstatus: In Progress\ndependencies: []\n---\n\n## Description\n\nBuild the base.\n\n## Implementation notes\n\nParser works; UI remains.\n`);
  await writeFile(join(path, 'backlog', 'tasks', 'TASK-2 - next.md'), `---\nid: TASK-2\ntitle: Next\nstatus: To Do\ndependencies: [TASK-1]\n---\n\n## Description\n\nBlocked work.\n`);
  await writeFile(join(path, 'backlog', 'tasks', 'TASK-3 - ready.md'), `---\nid: TASK-3\ntitle: Ready\nstatus: To Do\ndependencies: [TASK-99]\n---\n`);
  await writeFile(join(path, 'backlog', 'milestones', 'm-1 - Launch.md'), `---\nid: m-1\ntitle: Launch\n---\n`);
  return { path, project };
}

test('reads task context and only offers unblocked next work', async () => {
  const { path, project } = await fixture();
  const tasks = await readBacklogTasks(project);
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].notes, 'Parser works; UI remains.');
  assert.equal((await readMilestones(path))[0].title, 'Launch');
  const resume = resumeContext({ project, tasks, milestones: [], commits: [], refreshedAt: '' });
  assert.match(resume, /TASK-1: Foundation/);
  assert.match(resume, /TASK-3: Ready/);
  assert.doesNotMatch(resume, /- TASK-2: Next/);
});

test('creates and moves real Backlog.md tasks without a second database', async () => {
  const { project } = await fixture();
  const task = await createBacklogTask(project, { title: 'Captured / idea', description: 'Memo body', milestone: 'm-1', parent: 'TASK-1' });
  assert.equal(task.id, 'TASK-4');
  assert.equal(task.description, 'Memo body');
  assert.equal(task.milestone, 'm-1');
  await updateTaskStatus(project, 'TASK-4', 'In Progress');
  const updated = (await readBacklogTasks(project)).find((item) => item.id === 'TASK-4');
  assert.equal(updated?.status, 'In Progress');
  assert.match(await readFile(updated!.path!, 'utf8'), /Memo body/);
  await updateTaskContext(project, 'TASK-4', { plan: 'Build index', notes: 'Schema selected', finalSummary: 'First slice complete' });
  const continued = (await readBacklogTasks(project)).find((item) => item.id === 'TASK-4');
  assert.equal(continued?.plan, 'Build index');
  assert.equal(continued?.notes, 'Schema selected');
  assert.equal(continued?.finalSummary, 'First slice complete');
  assert.match(resumeContext({ project, tasks: [continued!], milestones: [], commits: [], refreshedAt: '' }), /Schema selected/);
  const draft = await createBacklogTask(project, { title: 'Later idea', description: 'Unplanned', draft: true });
  assert.equal(draft.status, 'Draft');
  assert.match(draft.path!, /backlog\/drafts/);
});
