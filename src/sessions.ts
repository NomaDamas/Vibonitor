import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AgentSession } from './types.js';

interface SessionCandidate {
  path: string;
  tool: 'claude' | 'codex' | 'omp';
  modified: number;
}

async function recentJsonl(folder: string, tool: 'claude' | 'codex' | 'omp'): Promise<SessionCandidate[]> {
  if (!existsSync(folder)) return [];
  try {
    const entries = await readdir(folder, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'));
    const candidates = await Promise.all(files.map(async (entry) => {
      const parent = 'parentPath' in entry ? String(entry.parentPath) : folder;
      const path = join(parent, entry.name);
      const info = await stat(path);
      return { path, tool, modified: info.mtimeMs };
    }));
    return candidates.sort((a, b) => b.modified - a.modified).slice(0, 8);
  } catch {
    return [];
  }
}

function contentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((part) => typeof part === 'object' && part && 'type' in part && ['text', 'input_text', 'output_text'].includes(String(part.type)))
    .map((part) => 'text' in part ? String(part.text) : '').join('\n');
}

async function parseSession(candidate: SessionCandidate, projectPath: string): Promise<AgentSession | undefined> {
  try {
    const source = await readFile(candidate.path, 'utf8');
    const rows = source.split('\n').filter(Boolean).map((line) => {
      try { return JSON.parse(line) as Record<string, unknown>; } catch { return undefined; }
    }).filter((row): row is Record<string, unknown> => Boolean(row));
    const belongs = rows.some((row) => {
      const payload = typeof row.payload === 'object' && row.payload ? row.payload as Record<string, unknown> : undefined;
      const cwd = typeof row.cwd === 'string' ? row.cwd : typeof payload?.cwd === 'string' ? payload.cwd : undefined;
      return cwd && resolve(cwd) === resolve(projectPath);
    });
    if (!belongs && candidate.tool !== 'claude') return undefined;
    const summaryRow = [...rows].reverse().find((row) => (row.type === 'summary' || row.type === 'title') && typeof (row.summary ?? row.title) === 'string');
    const messages = rows.map((row) => {
      if (typeof row.message === 'object' && row.message) return row.message as Record<string, unknown>;
      if (typeof row.payload === 'object' && row.payload && 'role' in row.payload) return row.payload as Record<string, unknown>;
      return undefined;
    }).filter((message): message is Record<string, unknown> => Boolean(message));
    const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant' && contentText(message.content).trim());
    const lastUser = [...messages].reverse().find((message) => message.role === 'user' && contentText(message.content).trim());
    const timestamps = rows.map((row) => row.timestamp).filter((value): value is string => typeof value === 'string');
    const title = (summaryRow?.summary ?? summaryRow?.title) as string | undefined;
    const lastResponse = lastAssistant ? contentText(lastAssistant.content) : '';
    const summary = title && lastResponse && title !== lastResponse ? `${title}\n\n${lastResponse}` : title ?? lastResponse;
    if (!belongs && !summary) return undefined;
    return {
      id: String(rows.find((row) => typeof row.sessionId === 'string')?.sessionId ?? candidate.path.split('/').pop()?.replace('.jsonl', '')),
      tool: candidate.tool,
      startedAt: timestamps[0],
      updatedAt: timestamps.at(-1) ?? new Date(candidate.modified).toISOString(),
      summary: summary.slice(0, 2000),
      lastPrompt: lastUser ? contentText(lastUser.content).slice(0, 1000) : undefined,
      path: candidate.path,
    };
  } catch {
    return undefined;
  }
}

export async function findLatestSession(projectPath: string): Promise<AgentSession | undefined> {
  const encoded = projectPath.replace(/[^a-zA-Z0-9]/g, '-');
  const ompDir = process.env.VIBONITOR_OMP_SESSION_DIR ?? join(homedir(), '.omp', 'agent', 'sessions');
  const candidates = [
    ...await recentJsonl(join(homedir(), '.claude', 'projects', encoded), 'claude'),
    ...await recentJsonl(join(homedir(), '.codex', 'sessions'), 'codex'),
    ...await recentJsonl(ompDir, 'omp'),
  ].sort((a, b) => b.modified - a.modified);
  for (const candidate of candidates) {
    const session = await parseSession(candidate, projectPath);
    if (session) return session;
  }
  return undefined;
}
