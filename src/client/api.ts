import type {
  DashboardData,
  Memo,
  MemoInput,
  Project,
  ProjectInput,
  PromoteInput,
  Task,
} from '../types';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (!response.ok) throw new Error(`요청에 실패했습니다. (${response.status})`);
      throw new Error('서버 응답을 읽을 수 없습니다.');
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `요청에 실패했습니다. (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

const statusNames: Record<string, string> = {
  backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress', done: 'Done',
};
const backlogStatus = (status: string) => statusNames[status] ?? status;

export const api = {
  dashboard: () => request<DashboardData>('/dashboard'),
  refresh: () => request<DashboardData>('/refresh', { method: 'POST' }),
  addProject: (input: ProjectInput) =>
    request<unknown>('/projects', { method: 'POST', body: JSON.stringify(input) }),
  deleteProject: (id: string) => request<unknown>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  scanProjects: (path: string) =>
    request<{ added: Project[] }>('/projects/scan', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
  updateTask: (task: Task, status: string) =>
    request<unknown>(`/tasks/${encodeURIComponent(task.projectId)}/${encodeURIComponent(task.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: backlogStatus(status) }),
    }),
  createMemo: (input: MemoInput) =>
    request<Memo>('/memos', { method: 'POST', body: JSON.stringify(input) }),
  deleteMemo: (id: string) => request<unknown>(`/memos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  promoteMemo: (id: string, input: PromoteInput) =>
    request<{ memo: Memo; task?: Task }>(`/memos/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
      body: JSON.stringify({ ...input, status: input.status ? backlogStatus(input.status) : undefined }),
    }),
};
