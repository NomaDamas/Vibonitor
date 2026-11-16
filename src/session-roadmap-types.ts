export interface SessionRoadmapNode {
  id: string;
  title: string;
  summary: string;
  todos: Array<{ text: string; done: boolean }>;
  startedAt?: string;
  updatedAt: string;
  tool: 'omp' | 'claude' | 'codex';
  path: string;
}
