export interface SessionRoadmapNode {
  id: string;
  title: string;
  summary: string;
  todos: Array<{ text: string; done: boolean }>;
  startedAt?: string;
  updatedAt: string;
  tool: 'omp' | 'claude' | 'codex';
  path: string;
  branch?: string;
  pane?: string;
  phase?: 'past' | 'current' | 'future';
  workStreamId?: string;
  roadmapIdeaId?: string;
}
