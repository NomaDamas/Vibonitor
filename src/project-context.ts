import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parse, stringify } from 'yaml';
import type { Initiative, InitiativeEvent } from './initiative-types.js';
import type { Project } from './types.js';

export const CONTEXT_DIR = '.vibonitor';
const contextFiles = ['project.md', 'direction.md', 'roadmap.md', 'inbox.md'] as const;
type ContextFile = typeof contextFiles[number];

export interface ProjectContext {
  root: string;
  files: Record<ContextFile, string>;
  initiatives: Initiative[];
  privateMode: boolean;
}

function rootFor(project: Project) {
  if (!project.path) throw new Error('GitHub-only projects do not have a project-owned context directory.');
  return join(project.path, CONTEXT_DIR);
}

async function atomicWrite(path: string, content: string) {
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, content, 'utf8');
  await rename(temp, path);
}

async function readOrEmpty(path: string) {
  try { return await readFile(path, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }
}

export async function initProjectContext(project: Project, options: { privateMode?: boolean } = {}) {
  const root = rootFor(project);
  await mkdir(join(root, 'initiatives'), { recursive: true });
  await mkdir(join(root, 'sessions'), { recursive: true });
  if (options.privateMode) return root;
  const defaults: Record<ContextFile, string> = {
    'project.md': `# ${project.name}\n\n## Purpose\n\n<!-- Describe why this project exists. -->\n`,
    'direction.md': '# Direction\n\n## Outcome\n\n<!-- Describe the durable product direction. -->\n',
    'roadmap.md': '# Roadmap\n\n<!-- Human-approved outcomes and phases. Do not put micro implementation tasks here. -->\n',
    'inbox.md': '# Inbox\n\n<!-- Quick thoughts for this project. Promote only after review. -->\n',
  };
  for (const file of contextFiles) {
    const path = join(root, file);
    if (!existsSync(path)) await atomicWrite(path, defaults[file]);
  }
  return root;
}

export async function readProjectContext(project: Project): Promise<ProjectContext> {
  const root = rootFor(project);
  const files = {} as Record<ContextFile, string>;
  for (const file of contextFiles) files[file] = await readOrEmpty(join(root, file));
  const initiativeDir = join(root, 'initiatives');
  const entries = existsSync(initiativeDir) ? await readdir(initiativeDir) : [];
  const initiatives: Initiative[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) continue;
    const value = parse(await readFile(join(initiativeDir, entry), 'utf8')) as Initiative;
    if (value?.id) initiatives.push(value);
  }
  return { root, files, initiatives, privateMode: false };
}
export async function appendSessionEvent(project: Project, event: { type: string; source: string; sessionId?: string; payload: Record<string, unknown>; timestamp?: string }) {
  const root = await initProjectContext(project);
  const stamp = event.timestamp ?? new Date().toISOString();
  const path = join(root, 'sessions', `${stamp.slice(0, 10)}.jsonl`);
  const line = JSON.stringify({ id: randomUUID(), ...event, timestamp: stamp }) + '\n';
  const current = await readOrEmpty(path);
  await atomicWrite(path, current + line);
  return { path, timestamp: stamp };
}

export async function appendProjectPrompt(project: Project, prompt: string, sessionId?: string) {
  return appendSessionEvent(project, { type: 'prompt.submitted', source: 'agent', sessionId, payload: { prompt } });
}

export async function writeInitiative(project: Project, initiative: Initiative) {
  const root = await initProjectContext(project);
  await atomicWrite(join(root, 'initiatives', `${initiative.id}.yml`), stringify(initiative));
  return initiative;
}

export async function appendInitiativeEvent(project: Project, initiativeId: string, event: Omit<InitiativeEvent, 'id' | 'timestamp'> & { timestamp?: string }) {
  const context = await readProjectContext(project);
  const initiative = context.initiatives.find((item) => item.id === initiativeId);
  if (!initiative) throw new Error(`Initiative ${initiativeId} not found.`);
  const saved: InitiativeEvent = { ...event, id: randomUUID(), timestamp: event.timestamp ?? new Date().toISOString() };
  initiative.events.push(saved);
  initiative.updatedAt = saved.timestamp;
  await writeInitiative(project, initiative);
  return saved;
}

export async function appendProjectInbox(project: Project, text: string, metadata: { source?: string; sessionId?: string } = {}) {
  const root = await initProjectContext(project);
  const stamp = new Date().toISOString();
  const entry = `\n\n## ${stamp}\n\n${text.trim()}\n\n${metadata.source ? `Source: ${metadata.source}\n` : ''}${metadata.sessionId ? `Session: ${metadata.sessionId}\n` : ''}`;
  const path = join(root, 'inbox.md');
  await atomicWrite(path, `${await readOrEmpty(path)}${entry}`);
  return { path, timestamp: stamp };
}
