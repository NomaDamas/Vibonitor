import type { ProjectSnapshot, Task } from '../../types';
import { isDone, isUnblocked, normalizeStatus } from '../utils';
import { EmptyState, ProjectMark } from '../components/Common';
import { FlowTimeline } from '../components/FlowTimeline';
import { Icon } from '../components/Icon';

interface OverviewProps {
  snapshots: ProjectSnapshot[];
  onAddProject: () => void;
  onOpenTask: (task: Task) => void;
}

export function Overview({ snapshots, onAddProject, onOpenTask }: OverviewProps) {
  if (!snapshots.length) return <div className="view-page"><EmptyState icon="folder" title="이어갈 프로젝트를 연결하세요" description="프로젝트를 연결하면 과거·현재·다음 작업 흐름을 볼 수 있습니다." action={<button className="button button-primary" onClick={onAddProject}><Icon name="plus" size={16} />프로젝트 연결</button>} /></div>;
  return <div className="view-page overview-page flow-overview-page">
    <header className="page-heading overview-heading"><div><span className="eyebrow">PROJECT FLOW</span><h1>{snapshots.length === 1 ? snapshots[0].project.name : '프로젝트 흐름'}</h1></div></header>
    <div className="flow-project-list">{snapshots.map((snapshot) => <ProjectFlow key={snapshot.project.id} snapshot={snapshot} onOpenTask={onOpenTask} />)}</div>
  </div>;
}

function ProjectFlow({ snapshot, onOpenTask }: { snapshot: ProjectSnapshot; onOpenTask: (task: Task) => void }) {
  const active = snapshot.tasks.find((task) => normalizeStatus(task.status) === 'in-progress');
  const next = snapshot.tasks.find((task) => !isDone(task) && task.id !== active?.id && isUnblocked(task, snapshot.tasks));
  return <section className="project-flow">
    <header className="project-flow-header"><div className="project-section-title"><ProjectMark kind={snapshot.project.kind} size="large" /><div><h2>{snapshot.project.name}</h2><p>{snapshot.project.path ?? snapshot.project.repo}</p></div></div><div className="flow-now"><strong>{active?.title ?? next?.title ?? '다음 작업 없음'}</strong>{active && <button onClick={() => onOpenTask(active)}>작업 열기</button>}</div></header>
    <FlowTimeline snapshot={snapshot} />
  </section>;
}
