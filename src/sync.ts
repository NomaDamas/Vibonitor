import { readProjectContext, writeInitiative } from './project-context.js';
import { run, gitRemoteRepo } from './projects.js';
import type { Project } from './types.js';

interface PullRequestState {
  state: string;
  mergedAt?: string;
  headRefOid: string;
  url: string;
  statusCheckRollup?: Array<{ conclusion?: string; status?: string; name?: string }>;
}

export async function syncProjectInitiatives(project: Project) {
  if (!project.path) return { updated: 0, skipped: true };
  const repo = project.repo ?? await gitRemoteRepo(project.path);
  if (!repo) return { updated: 0, skipped: true };
  const context = await readProjectContext(project);
  let updated = 0;
  for (const initiative of context.initiatives) {
    if (!initiative.prRef) continue;
    try {
      const { stdout } = await run('gh', ['pr', 'view', initiative.prRef, '-R', repo, '--json', 'state,mergedAt,headRefOid,url,statusCheckRollup']);
      const pr = JSON.parse(stdout) as PullRequestState;
      const nextStatus = pr.mergedAt ? 'merged' : pr.state === 'OPEN' ? 'review' : initiative.status;
      const changed = initiative.status !== nextStatus || initiative.review?.commit !== pr.headRefOid;
      if (!changed) continue;
      initiative.status = nextStatus;
      initiative.updatedAt = new Date().toISOString();
      initiative.events.push({
        id: `github-${Date.now()}-${initiative.id}`,
        type: pr.mergedAt ? 'pr.merged' : 'pr.updated',
        source: 'github', timestamp: initiative.updatedAt,
        payload: { pr: initiative.prRef, url: pr.url, commit: pr.headRefOid, checks: pr.statusCheckRollup ?? [] },
      });
      await writeInitiative(project, initiative);
      updated += 1;
    } catch {
      // The dashboard surfaces the last known state; sync errors are handled by explicit sync endpoints.
    }
  }
  return { updated, skipped: false };
}
