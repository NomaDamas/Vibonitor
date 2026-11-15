import { readBacklogTasks, readGithubTasks, readMilestones } from './backlog.js';
import { githubCommits, listRegisteredProjects, localCommits } from './projects.js';
import { findLatestSession } from './sessions.js';
import { listMemos } from './store.js';
import type { DashboardData, Project, ProjectSnapshot } from './types.js';

export async function projectSnapshot(project: Project): Promise<ProjectSnapshot> {
  try {
    const [tasks, milestones, commits, session] = await Promise.all([
      project.kind === 'local' ? readBacklogTasks(project) : readGithubTasks(project),
      project.kind === 'local' && project.path ? readMilestones(project.path) : Promise.resolve([]),
      project.kind === 'local' && project.path ? localCommits(project.path) : githubCommits(project.repo!),
      project.path ? findLatestSession(project.path) : Promise.resolve(undefined),
    ]);
    return { project, tasks, milestones, commits, session, refreshedAt: new Date().toISOString() };
  } catch (error) {
    return {
      project, tasks: [], milestones: [], commits: [],
      error: error instanceof Error ? error.message : String(error),
      refreshedAt: new Date().toISOString(),
    };
  }
}

export async function getDashboard(): Promise<DashboardData> {
  const projects = await listRegisteredProjects();
  const [snapshots, memos] = await Promise.all([Promise.all(projects.map(projectSnapshot)), listMemos()]);
  return { projects: snapshots, memos, generatedAt: new Date().toISOString() };
}
