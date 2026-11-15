import { getDashboard } from './dashboard.js';
import type { ProjectSnapshot } from './types.js';

function isDone(status: string) {
  return ['done', 'complete', 'completed', 'closed'].includes(status.toLowerCase());
}

export function resumeContext(snapshot: ProjectSnapshot) {
  const active = snapshot.tasks.filter((task) => /progress|doing/i.test(task.status));
  const open = snapshot.tasks.filter((task) => !isDone(task.status) && task.status !== 'Draft');
  const ids = new Set(open.map((task) => task.id));
  const ready = open.filter((task) => !active.includes(task) && task.dependencies.every((dependency) => !ids.has(dependency)));
  const completed = snapshot.tasks.filter((task) => isDone(task.status))
    .sort((a, b) => (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? ''));
  const lines = [
    `# ${snapshot.project.name} — 작업 이어하기`,
    ...(snapshot.error ? [`\n> 수집 오류: ${snapshot.error}`] : []),
    '',
    active.length ? '## 현재 작업' : '## 현재 작업\n\n진행 중인 작업이 없습니다.',
  ];
  for (const task of active) {
    lines.push(`\n### ${task.id}: ${task.title}`);
    if (task.description) lines.push(task.description);
    if (task.plan) lines.push(`\n**계획**\n${task.plan}`);
    if (task.notes) lines.push(`\n**작업 메모**\n${task.notes}`);
    if (task.finalSummary) lines.push(`\n**마지막 요약**\n${task.finalSummary}`);
  }
  if (completed[0]) {
    lines.push(`\n## 마지막으로 완료한 작업\n\n### ${completed[0].id}: ${completed[0].title}`);
    if (completed[0].finalSummary) lines.push(completed[0].finalSummary);
    else if (completed[0].notes) lines.push(completed[0].notes);
  }
  if (snapshot.milestones.length) {
    lines.push('\n## 로드맵');
    for (const milestone of snapshot.milestones) {
      const tasks = snapshot.tasks.filter((task) => task.milestone === milestone.id || task.milestone === milestone.title);
      const done = tasks.filter((task) => isDone(task.status)).length;
      const remaining = tasks.filter((task) => !isDone(task.status)).map((task) => `${task.id}(${task.status})`).join(', ');
      lines.push(`- ${milestone.id}: ${milestone.title} — ${done}/${tasks.length} 완료${remaining ? ` · 남은 작업: ${remaining}` : ''}`);
    }
  }
  lines.push('\n## 다음 작업');
  if (ready.length) ready.slice(0, 5).forEach((task) => lines.push(`- ${task.id}: ${task.title}`));
  else lines.push('- 막힘 없는 다음 작업이 없습니다.');
  lines.push('\n## 최근 커밋');
  if (snapshot.commits.length) snapshot.commits.forEach((commit) => lines.push(`- ${commit.hash.slice(0, 7)} ${commit.message}`));
  else lines.push('- 커밋 정보가 없습니다.');
  if (snapshot.session) {
    lines.push(`\n## 마지막 ${snapshot.session.tool} 세션`, snapshot.session.summary || '(요약 없음)');
    if (snapshot.session.lastPrompt) lines.push(`\n**마지막 요청:** ${snapshot.session.lastPrompt}`);
  }
  return lines.join('\n');
}

export async function allResumeContexts() {
  const dashboard = await getDashboard();
  return dashboard.projects.map((snapshot) => resumeContext(snapshot)).join('\n\n---\n\n');
}
