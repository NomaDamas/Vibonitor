export type ProjectKind = 'local' | 'github';

export interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  path?: string;
  repo?: string;
  description?: string;
  addedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
}

export interface Task {
  key: string;
  id: string;
  projectId: string;
  title: string;
  status: string;
  priority?: string;
  labels: string[];
  assignee: string[];
  milestone?: string;
  parent?: string;
  dependencies: string[];
  description: string;
  plan: string;
  notes: string;
  finalSummary: string;
  acceptanceCriteria: { text: string; checked: boolean }[];
  createdAt?: string;
  updatedAt?: string;
  path?: string;
  url?: string;
  source: 'backlog' | 'github';
}

export interface ProjectSnapshot {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  commits: Commit[];
  session?: AgentSession;
  error?: string;
  refreshedAt: string;
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface AgentSession {
  id: string;
  tool: 'claude' | 'codex';
  startedAt?: string;
  updatedAt: string;
  summary: string;
  lastPrompt?: string;
  path: string;
}

export interface Memo {
  id: string;
  body: string;
  projectId?: string;
  taskId?: string;
  createdAt: string;
  promotedTo?: string;
}

export interface DashboardData {
  projects: ProjectSnapshot[];
  memos: Memo[];
  generatedAt: string;
}

export interface ProjectInput {
  kind: ProjectKind;
  value: string;
  name?: string;
}

export interface MemoInput {
  body: string;
  projectId?: string;
  taskId?: string;
}

export interface PromoteInput {
  projectId: string;
  title: string;
  status?: string;
  milestone?: string;
  parent?: string;
  draft?: boolean;
}
