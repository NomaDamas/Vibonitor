import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { SessionRoadmapNode } from './session-roadmap-types.js';
const exec = promisify(execFile);

interface Candidate { path: string; modified: number; tool: SessionRoadmapNode['tool']; }
function text(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((part) => typeof part === 'object' && part && 'type' in part && ['text', 'input_text', 'output_text'].includes(String(part.type)))
    .map((part) => 'text' in part ? String(part.text) : '').join('\n');
}
async function candidates(folder: string, tool: Candidate['tool']) {
  if (!existsSync(folder)) return [];
  const entries = await readdir(folder, { recursive: true, withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'));
  const result: Candidate[] = [];
  for (const entry of files) {
    const parent = 'parentPath' in entry ? String(entry.parentPath) : folder;
    const path = join(parent, entry.name);
    result.push({ path, tool, modified: (await stat(path)).mtimeMs });
  }
  return result.sort((a, b) => b.modified - a.modified).slice(0, 20);
}
export async function sessionRoadmap(projectPath: string): Promise<SessionRoadmapNode[]> {
  const encoded = projectPath.replace(/[^a-zA-Z0-9]/g, '-');
  const ompDir = process.env.VIBONITOR_OMP_SESSION_DIR ?? join(homedir(), '.omp', 'agent', 'sessions');
  const all = (await Promise.all([
    candidates(join(homedir(), '.claude', 'projects', encoded), 'claude'),
    candidates(join(homedir(), '.codex', 'sessions'), 'codex'),
    candidates(ompDir, 'omp'),
  ])).flat().filter((candidate) => candidate.tool !== 'omp' || /\/sessions\/.+\/\d{4}-\d{2}-\d{2}T[^/]+\.jsonl$/.test(candidate.path)).sort((a, b) => b.modified - a.modified);
  const nodes: SessionRoadmapNode[] = [];
  let branch = '';
  try { branch = (await exec('git', ['-C', projectPath, 'branch', '--show-current'])).stdout.trim(); } catch { /* detached or unavailable */ }
  for (const candidate of all) {
    let rows: Array<Record<string, unknown>>;
    try { rows = (await readFile(candidate.path, 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>); } catch { continue; }
    const belongs = rows.some((row) => {
      const payload = typeof row.payload === 'object' && row.payload ? row.payload as Record<string, unknown> : undefined;
      const cwd = typeof row.cwd === 'string' ? row.cwd : typeof payload?.cwd === 'string' ? payload.cwd : undefined;
      return cwd && resolve(cwd) === resolve(projectPath);
    });
    if (!belongs) continue;
    const title = rows.find((row) => row.type === 'title' && typeof row.title === 'string')?.title as string | undefined;
    const messages = rows.map((row) => typeof row.message === 'object' && row.message ? row.message as Record<string, unknown> : undefined).filter((row): row is Record<string, unknown> => Boolean(row));
    const assistant = [...messages].reverse().find((row) => row.role === 'assistant' && text(row.content).trim());
    const body = assistant ? text(assistant.content) : '';
    const clean = body.split('\n').map((line) => line.trim()).filter(Boolean);
    const todos = clean.filter((line) => /^([-*]|\d+[.)])\s+/.test(line) || /^[-*]\s*\[[ xX]\]/.test(line)).slice(0, 8).map((line) => ({ text: line.replace(/^[-*]\s*(\[[ xX]\]\s*)?|^\d+[.)]\s*/, '').trim(), done: /\[[xX]\]/.test(line) }));
    const timestamps = rows.map((row) => row.timestamp).filter((value): value is string => typeof value === 'string');
    const updatedAt = timestamps.at(-1) ?? new Date(candidate.modified).toISOString();
    nodes.push({ id: String(rows.find((row) => typeof row.sessionId === 'string')?.sessionId ?? candidate.path), title: title?.replace(/^🗺️\s*ROAD:\s*/i, '') ?? '에이전트 작업', summary: (title?.replace(/^🗺️\s*ROAD:\s*/i, '') ?? clean.find((line) => !line.startsWith('#') && !line.startsWith('```')) ?? '세션 작업 기록').slice(0, 180), todos, startedAt: timestamps[0], updatedAt, tool: candidate.tool, path: candidate.path, branch, phase: nodes.length === 0 ? 'current' : 'past' });
    if (nodes.length >= 20) break;
  }
  return nodes;
}
