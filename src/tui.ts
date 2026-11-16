import { createInterface } from 'node:readline';
import { getDashboard } from './dashboard.js';
import { createMemo } from './store.js';
import type { DashboardData, ProjectSnapshot } from './types.js';

const clear = '\u001b[2J\u001b[H';
const green = '\u001b[38;5;192m';
const muted = '\u001b[38;5;244m';
const reset = '\u001b[0m';

function active(snapshot: ProjectSnapshot) {
  return snapshot.tasks.find((task) => /progress|doing/i.test(task.status));
}

function render(data: DashboardData, selected: number, page: 'overview' | 'roadmap' | 'inbox') {
  const snapshot = data.projects[selected] ?? data.projects[0];
  const lines = [
    `${clear}${green}VIBONITOR${reset}  ${muted}terminal continuity cockpit${reset}`,
    `${muted}1 overview   2 roadmap   3 inbox   j/k project   n new memo   r refresh   q quit${reset}`,
    '',
  ];
  if (!snapshot) return `${lines.join('\n')}\n프로젝트가 없습니다. 웹이나 ` + '`vibonitor add`' + `로 프로젝트를 연결하세요.\n`;
  lines.push(`${green}${snapshot.project.name}${reset}  ${muted}${selected + 1}/${data.projects.length}${reset}`);
  if (page === 'overview') {
    const task = active(snapshot);
    lines.push('', '현재 이어하기');
    lines.push(task ? `  ${task.id} ${task.title}` : '  진행 중인 작업 없음');
    if (task?.notes) lines.push(`  ${muted}노트: ${task.notes}${reset}`);
    lines.push('', 'Initiative');
    for (const initiative of snapshot.initiatives ?? []) lines.push(`  ${initiative.id} [${initiative.status}] ${initiative.title}`);
    lines.push('', '다음 작업');
    for (const next of snapshot.tasks.filter((item) => !/done|closed/i.test(item.status)).slice(0, 5)) lines.push(`  - ${next.id} ${next.title}`);
  } else if (page === 'roadmap') {
    lines.push('', '로드맵');
    lines.push(snapshot.context?.roadmap || '프로젝트 로드맵이 아직 없습니다.');
  } else {
    lines.push('', '인박스');
    lines.push(snapshot.context?.inbox || '인박스가 아직 없습니다.');
    lines.push('', 'n을 눌러 메모를 추가하세요.');
  }
  return `${lines.join('\n')}\n`;
}

export async function startTui() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('vibonitor tui는 TTY에서 실행해야 합니다.');
  let data = await getDashboard();
  let selected = 0;
  let page: 'overview' | 'roadmap' | 'inbox' = 'overview';
  const input = createInterface({ input: process.stdin });
  process.stdin.setRawMode(true);
  process.stdin.resume();
  const draw = () => process.stdout.write(render(data, selected, page));
  const cleanup = () => { process.stdin.setRawMode(false); input.close(); process.stdout.write(reset); };
  draw();
  process.stdin.on('data', async (chunk) => {
    const key = chunk.toString();
    if (key === 'q' || key === '\u0003') { cleanup(); process.exit(0); }
    if (key === '1') page = 'overview';
    if (key === '2') page = 'roadmap';
    if (key === '3') page = 'inbox';
    if (key === 'j') selected = Math.min(selected + 1, Math.max(0, data.projects.length - 1));
    if (key === 'k') selected = Math.max(0, selected - 1);
    if (key === 'r') data = await getDashboard();
    if (key === 'n') {
      cleanup();
      const answer = await new Promise<string>((resolve) => {
        const prompt = createInterface({ input: process.stdin, output: process.stdout });
        prompt.question('메모: ', (value) => { prompt.close(); resolve(value); });
      });
      if (answer.trim()) await createMemo({ body: answer.trim(), projectId: data.projects[selected]?.project.id });
      process.stdin.setRawMode(true); process.stdin.resume(); draw();
      return;
    }
    draw();
  });
}
