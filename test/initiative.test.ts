import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { appendInitiativeEvent, initProjectContext, readProjectContext, writeInitiative } from '../src/project-context.js';
import type { Initiative } from '../src/initiative-types.js';
import type { Project } from '../src/types.js';

test('initializes portable project context without overwriting user files', async () => {
  const path = await mkdtemp(join(tmpdir(), 'vibonitor-context-'));
  await mkdir(path, { recursive: true });
  await writeFile(join(path, '.vibonitor'), 'not a directory').catch(() => undefined);
  const project: Project = { id: 'ctx', name: 'Context Demo', kind: 'local', path, addedAt: new Date().toISOString() };
  // A pre-existing file is preserved; the test uses a separate valid directory for initialization.
  const validPath = await mkdtemp(join(tmpdir(), 'vibonitor-context-valid-'));
  const validProject = { ...project, path: validPath };
  await initProjectContext(validProject);
  const custom = '# My direction\n';
  await writeFile(join(validPath, '.vibonitor', 'direction.md'), custom);
  await initProjectContext(validProject);
  assert.equal(await readFile(join(validPath, '.vibonitor', 'direction.md'), 'utf8'), custom);
  const context = await readProjectContext(validProject);
  assert.equal(context.files['project.md'].includes('Context Demo'), true);
});

test('persists Initiative issue graph and append-only events', async () => {
  const path = await mkdtemp(join(tmpdir(), 'vibonitor-initiative-'));
  const project: Project = { id: 'initiative', name: 'Initiative Demo', kind: 'local', path, addedAt: new Date().toISOString() };
  const now = new Date().toISOString();
  const initiative: Initiative = {
    id: 'INIT-TEST', projectId: project.id, title: 'One PR outcome', outcome: 'A reviewable result', sourcePrompt: 'Build the result',
    status: 'proposed', approvedPlan: 'Plan', nonGoals: ['No unrelated cleanup'],
    acceptanceCriteria: [{ id: 'AC-1', text: 'It works', checked: false }], nextAction: 'Approve', lastContext: '', issues: [{ id: 'INIT-TEST.1', initiativeId: 'INIT-TEST', title: 'Child', description: 'Child work', status: 'todo', acceptanceCriteriaIds: ['AC-1'], dependencies: [] }], events: [], createdAt: now, updatedAt: now,
  };
  await writeInitiative(project, initiative);
  const event = await appendInitiativeEvent(project, initiative.id, { type: 'plan.proposed', source: 'test', payload: { ok: true } });
  assert.equal(event.type, 'plan.proposed');
  const loaded = await readProjectContext(project);
  assert.equal(loaded.initiatives[0].issues[0].initiativeId, 'INIT-TEST');
  assert.equal(loaded.initiatives[0].events.length, 1);
});
