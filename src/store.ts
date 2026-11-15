import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parse, stringify } from 'yaml';
import type { Memo, MemoInput, Project } from './types.js';

export interface Config {
  projects: Project[];
  scanDirs: string[];
}

const dataDir = process.env.VIBONITOR_DATA_DIR ?? join(homedir(), '.vibonitor');
const configPath = join(dataDir, 'config.json');
const inboxDir = join(dataDir, 'inbox');

async function ensureDirs() {
  await mkdir(inboxDir, { recursive: true });
}

async function atomicWrite(path: string, content: string) {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, content, 'utf8');
  await rename(temp, path);
}

export async function getConfig(): Promise<Config> {
  await ensureDirs();
  if (!existsSync(configPath)) return { projects: [], scanDirs: [] };
  const parsed = JSON.parse(await readFile(configPath, 'utf8')) as Partial<Config>;
  return { projects: parsed.projects ?? [], scanDirs: parsed.scanDirs ?? [] };
}

export async function saveConfig(config: Config) {
  await ensureDirs();
  await atomicWrite(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

export function expandHome(path: string) {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

export async function addProject(project: Omit<Project, 'id' | 'addedAt'>) {
  const config = await getConfig();
  const duplicate = config.projects.find((p) =>
    project.kind === 'local' ? p.path === project.path : p.repo?.toLowerCase() === project.repo?.toLowerCase(),
  );
  if (duplicate) return duplicate;
  const saved: Project = { ...project, id: randomUUID().slice(0, 8), addedAt: new Date().toISOString() };
  config.projects.push(saved);
  await saveConfig(config);
  return saved;
}

export async function removeProject(id: string) {
  const config = await getConfig();
  const next = config.projects.filter((p) => p.id !== id);
  if (next.length === config.projects.length) return false;
  config.projects = next;
  await saveConfig(config);
  return true;
}

export async function addScanDir(path: string) {
  const config = await getConfig();
  if (!config.scanDirs.includes(path)) config.scanDirs.push(path);
  await saveConfig(config);
}

function memoFromMarkdown(id: string, source: string): Memo {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { id, body: source.trim(), createdAt: new Date(0).toISOString() };
  const meta = parse(match[1]) as Record<string, unknown>;
  return {
    id,
    body: match[2].trim(),
    projectId: typeof meta.project_id === 'string' ? meta.project_id : undefined,
    taskId: typeof meta.task_id === 'string' ? meta.task_id : undefined,
    createdAt: typeof meta.created_at === 'string' ? meta.created_at : new Date(0).toISOString(),
    promotedTo: typeof meta.promoted_to === 'string' ? meta.promoted_to : undefined,
  };
}

export async function listMemos(): Promise<Memo[]> {
  await ensureDirs();
  const files = (await readdir(inboxDir)).filter((file) => file.endsWith('.md'));
  const memos = await Promise.all(files.map(async (file) =>
    memoFromMarkdown(file.slice(0, -3), await readFile(join(inboxDir, file), 'utf8')),
  ));
  return memos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function memoMarkdown(memo: Memo) {
  const frontmatter = stringify({
    id: memo.id,
    created_at: memo.createdAt,
    ...(memo.projectId ? { project_id: memo.projectId } : {}),
    ...(memo.taskId ? { task_id: memo.taskId } : {}),
    ...(memo.promotedTo ? { promoted_to: memo.promotedTo } : {}),
  }).trimEnd();
  return `---\n${frontmatter}\n---\n\n${memo.body.trim()}\n`;
}

export async function createMemo(input: MemoInput): Promise<Memo> {
  if (!input.body.trim()) throw new Error('메모 내용을 입력하세요.');
  await ensureDirs();
  const memo: Memo = {
    id: randomUUID(), createdAt: new Date().toISOString(), body: input.body.trim(),
    projectId: input.projectId, taskId: input.taskId,
  };
  await atomicWrite(join(inboxDir, `${memo.id}.md`), memoMarkdown(memo));
  return memo;
}

export async function updateMemo(id: string, changes: Partial<Memo>) {
  const memo = (await listMemos()).find((item) => item.id === id);
  if (!memo) return undefined;
  const updated = { ...memo, ...changes, id };
  await atomicWrite(join(inboxDir, `${id}.md`), memoMarkdown(updated));
  return updated;
}

export async function deleteMemo(id: string) {
  try {
    await unlink(join(inboxDir, `${id}.md`));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
