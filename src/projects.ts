import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { addProject, addScanDir, expandHome, getConfig } from './store.js';
import type { Commit, Project, ProjectInput } from './types.js';

const execute = promisify(execFile);

export async function run(command: string, args: string[], cwd?: string) {
  return execute(command, args, { cwd, timeout: 15_000, maxBuffer: 8 * 1024 * 1024 });
}

export async function registerProject(input: ProjectInput) {
  if (input.kind === 'local') {
    const path = resolve(expandHome(input.value.trim()));
    const info = await stat(path);
    if (!info.isDirectory()) throw new Error('프로젝트 경로가 폴더가 아닙니다.');
    return addProject({ kind: 'local', path, name: input.name?.trim() || basename(path) });
  }
  const repo = input.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('GitHub 저장소는 owner/repository 형식이어야 합니다.');
  let description: string | undefined;
  let defaultName = repo.split('/')[1];
  try {
    const { stdout } = await run('gh', ['repo', 'view', repo, '--json', 'name,description']);
    const metadata = JSON.parse(stdout) as { name: string; description?: string };
    defaultName = metadata.name;
    description = metadata.description || undefined;
  } catch (error) {
    throw new Error(`GitHub 저장소를 확인하지 못했습니다. gh auth login 상태를 확인하세요. ${String(error)}`);
  }
  return addProject({ kind: 'github', repo, name: input.name?.trim() || defaultName, description });
}

function hasBacklog(path: string) {
  return ['backlog', '.backlog', 'backlog.config.yml'].some((entry) => existsSync(join(path, entry)));
}

export async function scanProjects(directory: string, persist = true) {
  const path = resolve(expandHome(directory.trim()));
  const info = await stat(path);
  if (!info.isDirectory()) throw new Error('스캔 경로가 폴더가 아닙니다.');
  const entries = await readdir(path, { withFileTypes: true });
  const candidates = [path, ...entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => join(path, entry.name))];
  const repositories: string[] = [];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, '.git')) || hasBacklog(candidate)) repositories.push(candidate);
  }
  const added: Project[] = [];
  for (const repo of repositories) {
    added.push(await addProject({ kind: 'local', path: repo, name: basename(repo) }));
  }
  if (persist) await addScanDir(path);
  return { path, added };
}

export async function listRegisteredProjects() {
  const config = await getConfig();
  for (const directory of config.scanDirs) {
    try { await scanProjects(directory, false); } catch { /* Removed folders must not break the dashboard. */ }
  }
  return (await getConfig()).projects;
}

export async function localCommits(path: string): Promise<Commit[]> {
  try {
    const format = '%H%x1f%s%x1f%an%x1f%aI%x1e';
    const { stdout } = await run('git', ['-C', path, 'log', '-6', `--pretty=format:${format}`]);
    return stdout.split('\x1e').map((row) => row.trim()).filter(Boolean).map((row) => {
      const [hash, message, author, date] = row.split('\x1f');
      return { hash, message, author, date };
    });
  } catch {
    return [];
  }
}

export async function githubCommits(repo: string): Promise<Commit[]> {
  try {
    const { stdout } = await run('gh', ['api', `repos/${repo}/commits?per_page=6`]);
    const rows = JSON.parse(stdout) as Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>;
    return rows.map((row) => ({
      hash: row.sha,
      message: row.commit.message.split('\n')[0],
      author: row.commit.author.name,
      date: row.commit.author.date,
    }));
  } catch {
    return [];
  }
}
export async function gitRemoteRepo(path: string) {
  try {
    const { stdout } = await run('git', ['-C', path, 'config', '--get', 'remote.origin.url']);
    const remote = stdout.trim().replace(/^git@github\.com:/, '').replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    return /^[\w.-]+\/[\w.-]+$/.test(remote) ? remote : undefined;
  } catch {
    return undefined;
  }
}
