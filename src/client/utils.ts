import type { Task } from '../types';

export type View = 'overview' | 'kanban' | 'roadmap' | 'inbox';
export type CanonicalStatus = 'backlog' | 'todo' | 'in-progress' | 'done';

export const STATUS_COLUMNS: { id: CanonicalStatus; label: string; english: string }[] = [
  { id: 'backlog', label: '백로그', english: 'Backlog' },
  { id: 'todo', label: '할 일', english: 'To Do' },
  { id: 'in-progress', label: '진행 중', english: 'In Progress' },
  { id: 'done', label: '완료', english: 'Done' },
];

export function normalizeStatus(status: string): CanonicalStatus {
  const value = status.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (['done', 'complete', 'completed', 'closed', 'resolved'].includes(value)) return 'done';
  if (['in-progress', 'inprogress', 'doing', 'progress', 'active', 'started'].includes(value)) return 'in-progress';
  if (['todo', 'to-do', 'ready', 'open', 'next'].includes(value)) return 'todo';
  return 'backlog';
}

export function statusLabel(status: string): string {
  const canonical = normalizeStatus(status);
  return STATUS_COLUMNS.find((column) => column.id === canonical)?.label ?? status;
}

export function isDone(task: Task): boolean {
  return normalizeStatus(task.status) === 'done';
}

export function taskKey(task: Pick<Task, 'projectId' | 'id'>): string {
  return `${task.projectId}:${task.id}`;
}

export function findTask(tasks: Task[], reference?: string): Task | undefined {
  if (!reference) return undefined;
  return tasks.find((task) => task.id === reference || task.key === reference || task.title === reference);
}

export function isUnblocked(task: Task, tasks: Task[]): boolean {
  return task.dependencies.every((reference) => {
    const dependency = findTask(tasks, reference);
    return !dependency || isDone(dependency);
  });
}

export function taskRecord(task: Task): { label: string; text: string } {
  if (task.finalSummary.trim()) return { label: '최종 요약', text: task.finalSummary };
  if (task.notes.trim()) return { label: '작업 노트', text: task.notes };
  if (task.plan.trim()) return { label: '실행 계획', text: task.plan };
  return { label: '작업 설명', text: task.description || '아직 기록된 작업 컨텍스트가 없습니다.' };
}

export function formatDate(value?: string, withYear = false): string {
  if (!value) return '날짜 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    ...(withYear ? { year: 'numeric' } : {}),
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export function formatRelative(value?: string): string {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  const seconds = Math.round((time - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

export function clampText(value: string, length = 120): string {
  const firstLine = value.trim().split('\n')[0] ?? '';
  return firstLine.length > length ? `${firstLine.slice(0, length - 1)}…` : firstLine;
}
