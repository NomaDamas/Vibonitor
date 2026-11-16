import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readProjectContext, writeInitiative } from './project-context.js';
import type { Initiative, ReviewResult } from './initiative-types.js';
import type { Project } from './types.js';

const execute = promisify(execFile);

export interface MergeGate {
  allowed: boolean;
  reasons: string[];
}

export function checkMergeGate(review: ReviewResult | undefined, currentCommit: string, requiredChecks: Array<{ name: string; status: string }>): MergeGate {
  const reasons: string[] = [];
  if (!review) reasons.push('isolated review result is missing');
  if (review?.verdict !== 'pass') reasons.push(`review verdict is ${review?.verdict ?? 'missing'}`);
  if (review && review.commit !== currentCommit) reasons.push('review commit is stale');
  if (requiredChecks.some((check) => !['success', 'passed', 'completed'].includes(check.status.toLowerCase()))) reasons.push('required CI checks are not passing');
  return { allowed: reasons.length === 0, reasons };
}


export async function runIsolatedReview(project: Project, initiative: Initiative, pr: string): Promise<ReviewResult> {
  if (!project.path) throw new Error('리뷰 checkout에는 로컬 clone 경로가 필요합니다.');
  const command = process.env.VIBONITOR_REVIEW_COMMAND;
  if (!command) throw new Error('VIBONITOR_REVIEW_COMMAND가 설정되지 않았습니다. 리뷰어 실행 명령을 명시해야 합니다.');
  const workspace = await mkdtemp(join(tmpdir(), 'vibonitor-review-'));
  const resultPath = join(workspace, 'review.json');
  try {
    const { stdout: ref } = await execute('gh', ['pr', 'view', pr, '-R', project.repo ?? '', '--json', 'headRefOid', '--jq', '.headRefOid']);
    const commit = ref.trim();
    await execute('git', ['-C', project.path, 'worktree', 'add', '--detach', workspace, commit]);
    const input = JSON.stringify({ initiative, pr, commit, resultPath });
    await execute('sh', ['-lc', command], { cwd: workspace, env: { ...process.env, VIBONITOR_REVIEW_INPUT: input, VIBONITOR_REVIEW_MODEL: 'gpt-6.1-sol-high', VIBONITOR_REVIEW_OUTPUT: resultPath }, maxBuffer: 8 * 1024 * 1024, timeout: 15 * 60_000 });
    const review = JSON.parse(await readFile(resultPath, 'utf8')) as ReviewResult;
    if (review.commit !== commit) throw new Error('리뷰 결과의 commit이 PR head와 다릅니다.');
    return review;
  } finally {
    await execute('git', ['-C', project.path, 'worktree', 'remove', '--force', workspace]).catch(() => undefined);
    await rm(workspace, { recursive: true, force: true });
  }
}

export async function mergeReviewedPr(project: Project, initiativeId: string, pr: string) {
  if (!project.path) throw new Error('자동 머지에는 로컬 clone 경로가 필요합니다.');
  const context = await readProjectContext(project);
  const initiative = context.initiatives.find((item) => item.id === initiativeId);
  if (!initiative?.review) throw new Error('격리 리뷰 결과가 없습니다.');
  const { stdout: commitOutput } = await execute('gh', ['pr', 'view', pr, '-R', project.repo ?? '', '--json', 'headRefOid,statusCheckRollup', '--jq', '[.headRefOid, (.statusCheckRollup // [] | map(.conclusion // .status))] | @json']);
  const [commit, checks] = JSON.parse(commitOutput) as [string, string[]];
  const gate = checkMergeGate(initiative.review, commit, checks.map((status) => ({ name: 'github-check', status })));
  if (!gate.allowed) throw new Error(`자동 머지를 차단했습니다: ${gate.reasons.join('; ')}`);
  await execute('gh', ['pr', 'merge', pr, '-R', project.repo ?? '', '--squash', '--delete-branch']);
  initiative.status = 'merged';
  initiative.updatedAt = new Date().toISOString();
  initiative.events.push({ id: `merge-${Date.now()}`, type: 'pr.merged', source: 'vibonitor-merge-gate', timestamp: initiative.updatedAt, payload: { pr, commit } });
  await writeInitiative(project, initiative);
  return initiative;
}
