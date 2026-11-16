export type FlowPhase = 'past' | 'current' | 'future';

export interface RoadmapIdea {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  status: 'idea' | 'selected' | 'parked' | 'done';
  source: 'project' | 'inbox' | 'agent';
  createdAt: string;
}

export interface WorkCheckpoint {
  id: string;
  projectId: string;
  workStreamId: string;
  title: string;
  summary: string;
  todos: Array<{ text: string; done: boolean }>;
  phase: FlowPhase;
  sessionId?: string;
  branch?: string;
  pane?: string;
  roadmapIdeaId?: string;
  previousId?: string;
  nextId?: string;
  timestamp: string;
  tool: 'omp' | 'claude' | 'codex';
}

export interface WorkStream {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  status: 'planned' | 'current' | 'paused' | 'merged' | 'done';
  roadmapIdeaId?: string;
  checkpoints: WorkCheckpoint[];
}
