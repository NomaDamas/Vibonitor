export type InitiativeStatus = 'captured' | 'proposed' | 'approved' | 'in-progress' | 'review' | 'merged' | 'rejected' | 'parked';
export type EventType = 'session.started' | 'prompt.submitted' | 'plan.proposed' | 'plan.approved' | 'issue.created' | 'issue.completed' | 'pr.opened' | 'pr.updated' | 'pr.merged' | 'review.started' | 'review.passed' | 'review.failed' | 'session.stopped';

export interface InitiativeIssue {
  id: string;
  initiativeId: string;
  parentId?: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  acceptanceCriteriaIds: string[];
  dependencies: string[];
}

export interface InitiativeEvent {
  id: string;
  type: EventType;
  source: string;
  timestamp: string;
  sessionId?: string;
  payload: Record<string, unknown>;
}

export interface ReviewResult {
  verdict: 'pass' | 'changes_requested' | 'blocked';
  commit: string;
  pr?: string;
  findings: Array<{ file?: string; line?: number; severity: string; message: string }>;
  checks: Array<{ name: string; status: string }>;
  reviewer: string;
  createdAt: string;
}

export interface Initiative {
  id: string;
  projectId: string;
  title: string;
  outcome: string;
  sourcePrompt: string;
  sourceSession?: string;
  roadmapNode?: string;
  directionRef?: string;
  approvedPlan: string;
  nonGoals: string[];
  acceptanceCriteria: Array<{ id: string; text: string; checked: boolean }>;
  status: InitiativeStatus;
  owner?: string;
  prRef?: string;
  review?: ReviewResult;
  nextAction: string;
  lastContext: string;
  issues: InitiativeIssue[];
  events: InitiativeEvent[];
  createdAt: string;
  updatedAt: string;
  approval?: { approvedAt: string; approvedBy: string };
}

export interface InitiativeProposal {
  initiative: Initiative;
  interpretation: { provider: string; model: string; createdAt: string };
}
