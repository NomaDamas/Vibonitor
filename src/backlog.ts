import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { Milestone, Project, Task } from './types.js';
import { run } from './projects.js';

interface ParsedTaskFile {
  metadata: Record<string, unknown>;
  body: string;
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function asText(value: unknown) {
  return value == null ? '' : String(value);
}

function section(body: string, names: string[]) {
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)];
  const heading = headings.find((match) => names.includes(match[1].trim().toLowerCase()));
  if (!heading || heading.index == null) return '';
  const start = heading.index + heading[0].length;
  const next = body.indexOf('\n## ', start);
  return body.slice(start, next === -1 ? undefined : next).replace(/<!--\s*SECTION:[^>]+-->/g, '').trim();
}

function acceptanceCriteria(body: string) {
  const text = section(body, ['acceptance criteria', 'acceptancecriteria']);
  return [...text.matchAll(/^\s*-\s*\[([ xX])\]\s*(.+)$/gm)].map((match) => ({
    checked: match[1].toLowerCase() === 'x',
    text: match[2].trim(),
  }));
}

function parseTaskFile(source: string): ParsedTaskFile {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { metadata: {}, body: source };
  return { metadata: (parse(match[1]) ?? {}) as Record<string, unknown>, body: match[2] };
}

async function backlogDirectory(projectPath: string) {
  const rootConfig = join(projectPath, 'backlog.config.yml');
  if (existsSync(rootConfig)) {
    const config = parse(await readFile(rootConfig, 'utf8')) as { backlog_directory?: string } | null;
    if (config?.backlog_directory) return join(projectPath, config.backlog_directory);
  }
  for (const folder of ['backlog', '.backlog']) {
    if (existsSync(join(projectPath, folder))) return join(projectPath, folder);
  }
  return undefined;
}

async function markdownFiles(folder: string) {
  try {
    return (await readdir(folder, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => join(folder, entry.name));
  } catch {
    return [];
  }
}

export async function readMilestones(projectPath: string): Promise<Milestone[]> {
  const root = await backlogDirectory(projectPath);
  if (!root) return [];
  const files = await markdownFiles(join(root, 'milestones'));
  const milestones = await Promise.all(files.map(async (path) => {
    const { metadata, body } = parseTaskFile(await readFile(path, 'utf8'));
    return {
      id: asText(metadata.id) || basename(path, '.md').split(' - ')[0],
      title: asText(metadata.title) || basename(path, '.md').replace(/^.*? - /, ''),
      description: section(body, ['description']) || undefined,
    };
  }));
  return milestones.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export async function readBacklogTasks(project: Project): Promise<Task[]> {
  if (!project.path) return [];
  const root = await backlogDirectory(project.path);
  if (!root) return [];
  const files = [...await markdownFiles(join(root, 'tasks')), ...await markdownFiles(join(root, 'drafts'))];
  const tasks = await Promise.all(files.map(async (path): Promise<Task | undefined> => {
    try {
      const { metadata, body } = parseTaskFile(await readFile(path, 'utf8'));
      const id = asText(metadata.id);
      if (!id) return undefined;
      return {
        key: `${project.id}:${id}`,
        id,
        projectId: project.id,
        title: asText(metadata.title) || id,
        status: path.includes(`${join(root, 'drafts')}`) ? 'Draft' : asText(metadata.status) || 'To Do',
        priority: asText(metadata.priority) || undefined,
        labels: asStrings(metadata.labels),
        assignee: asStrings(metadata.assignee),
        milestone: asText(metadata.milestone) || undefined,
        parent: asText(metadata.parent_task_id ?? metadata.parent) || undefined,
        dependencies: asStrings(metadata.dependencies),
        description: section(body, ['description']),
        plan: section(body, ['implementation plan', 'plan']),
        notes: section(body, ['implementation notes', 'notes']),
        finalSummary: section(body, ['final summary', 'summary']),
        acceptanceCriteria: acceptanceCriteria(body),
        createdAt: asText(metadata.created_date ?? metadata.created_at) || undefined,
        updatedAt: asText(metadata.updated_date ?? metadata.updated_at) || undefined,
        path,
        source: 'backlog',
      };
    } catch {
      return undefined;
    }
  }));
  return tasks.filter((task): task is Task => Boolean(task)).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export async function readGithubTasks(project: Project): Promise<Task[]> {
  if (!project.repo) return [];
  const { stdout } = await run('gh', [
    'issue', 'list', '-R', project.repo, '--state', 'all', '--limit', '100', '--json',
    'number,title,state,body,labels,assignees,createdAt,updatedAt,url,milestone',
  ]);
  const rows = JSON.parse(stdout) as Array<{
    number: number; title: string; state: string; body?: string; url: string;
    labels: Array<{ name: string }>; assignees: Array<{ login: string }>;
    createdAt: string; updatedAt: string; milestone?: { title: string };
  }>;
  return rows.map((row) => ({
    key: `${project.id}:${row.number}`,
    id: String(row.number),
    projectId: project.id,
    title: row.title,
    status: row.state === 'CLOSED' ? 'Done' : 'To Do',
    labels: row.labels.map((label) => label.name),
    assignee: row.assignees.map((assignee) => assignee.login),
    milestone: row.milestone?.title,
    dependencies: [],
    description: row.body ?? '',
    plan: '', notes: '', finalSummary: '', acceptanceCriteria: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    url: row.url,
    source: 'github',
  }));
}

export async function updateTaskStatus(project: Project, id: string, status: string) {
  if (project.kind === 'github') {
    if (!['Done', 'To Do'].includes(status)) throw new Error('GitHub 이슈는 To Do 또는 Done 상태만 지원합니다.');
    await run('gh', ['issue', status === 'Done' ? 'close' : 'reopen', id, '-R', project.repo!]);
    return;
  }
  const tasks = await readBacklogTasks(project);
  const task = tasks.find((item) => item.id === id);
  if (!task?.path) throw new Error('작업을 찾을 수 없습니다.');
  const parsed = parseTaskFile(await readFile(task.path, 'utf8'));
  parsed.metadata.status = status;
  parsed.metadata.updated_date = new Date().toISOString();
  await writeFile(task.path, `---\n${stringify(parsed.metadata)}---\n\n${parsed.body.trimStart()}`, 'utf8');
}

export async function updateTaskContext(project: Project, id: string, changes: { plan?: string; notes?: string; finalSummary?: string }) {
  if (!project.path) throw new Error('GitHub 이슈는 컨텍스트 편집을 지원하지 않습니다. 댓글 API를 사용하세요.');
  const task = (await readBacklogTasks(project)).find((item) => item.id === id);
  if (!task?.path) throw new Error('작업을 찾을 수 없습니다.');
  const parsed = parseTaskFile(await readFile(task.path, 'utf8'));
  const sections = [
    ['Implementation plan', changes.plan],
    ['Implementation notes', changes.notes],
    ['Final summary', changes.finalSummary],
  ] as const;
  for (const [heading, value] of sections) {
    if (value === undefined) continue;
    const marker = { 'Implementation plan': 'PLAN', 'Implementation notes': 'NOTES', 'Final summary': 'FINAL_SUMMARY' }[heading];
    const marked = new RegExp(`(<!--\\s*SECTION:${marker}:BEGIN\\s*-->)([\\s\\S]*?)(<!--\\s*SECTION:${marker}:END\\s*-->)`, 'i');
    const replacement = `${value.trim()}\n`;
    if (marked.test(parsed.body)) {
      parsed.body = parsed.body.replace(marked, (_match, begin: string, _body: string, end: string) => `${begin}\n${replacement}${end}`);
      continue;
    }
    const content = `<!-- SECTION:${marker}:BEGIN -->\n${replacement}<!-- SECTION:${marker}:END -->`;
    const pattern = new RegExp(`(^## ${heading}\\n)([\\s\\S]*?)(?=^## |$)`, 'mi');
    if (pattern.test(parsed.body)) parsed.body = parsed.body.replace(pattern, (_match, title: string) => `${title}\n${content}\n\n`);
    else parsed.body = `${parsed.body.trimEnd()}\n\n## ${heading}\n\n${content}\n`;
  }
  parsed.metadata.updated_date = new Date().toISOString();
  await writeFile(task.path, `---\n${stringify(parsed.metadata)}---\n\n${parsed.body.trimStart()}`, 'utf8');
}

export async function createBacklogTask(project: Project, input: {
  title: string; description: string; status?: string; milestone?: string; parent?: string; draft?: boolean;
}) {
  if (!project.path) throw new Error('로컬 프로젝트에만 Backlog.md 작업을 만들 수 있습니다.');
  if (!input.title.trim()) throw new Error('작업 제목이 필요합니다.');
  const root = await backlogDirectory(project.path) ?? join(project.path, 'backlog');
  const folder = join(root, input.draft ? 'drafts' : 'tasks');
  await mkdir(folder, { recursive: true });
  const existing = await readBacklogTasks(project);
  const configPath = join(root, 'config.yml');
  const config = existsSync(configPath) ? (parse(await readFile(configPath, 'utf8')) ?? {}) as Record<string, unknown> : {};
  const prefix = (existing[0]?.id.match(/^([A-Za-z]+)/)?.[1] ?? asText(config.task_prefix).toUpperCase()) || 'TASK';
  const highest = existing.reduce((max, task) => {
    const number = Number(task.id.match(/(\d+)$/)?.[1]);
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  const padding = Number(config.zero_padded_ids ?? 0);
  const number = padding > 0 ? String(highest + 1).padStart(padding, '0') : String(highest + 1);
  const id = `${prefix}-${number}`;
  const now = new Date().toISOString();
  const metadata = {
    id,
    title: input.title.trim(),
    status: input.draft ? undefined : input.status || asText(config.default_status) || 'To Do',
    assignee: [],
    created_date: now,
    labels: [],
    dependencies: [],
    ...(input.milestone ? { milestone: input.milestone } : {}),
    ...(input.parent ? { parent_task_id: input.parent } : {}),
  };
  const path = join(folder, `${id} - ${input.title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)}.md`);
  const content = `---\n${stringify(metadata)}---\n\n## Description\n\n<!-- SECTION:DESCRIPTION:BEGIN -->\n${input.description.trim()}\n<!-- SECTION:DESCRIPTION:END -->\n\n## Acceptance Criteria\n<!-- AC:BEGIN -->\n- [ ] 작업 결과를 확인하고 문맥을 업데이트했다\n<!-- AC:END -->\n`;
  await writeFile(path, content, { encoding: 'utf8', flag: 'wx' });
  return (await readBacklogTasks(project)).find((task) => task.id === id)!;
}
