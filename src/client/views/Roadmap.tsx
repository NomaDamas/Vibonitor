import type { ProjectSnapshot, Task } from '../../types';
import { ProjectMark } from '../components/Common';
import { FlowTimeline } from '../components/FlowTimeline';

interface RoadmapProps { snapshots: ProjectSnapshot[]; onAddProject: () => void; onOpenTask: (task: Task) => void; }

export function Roadmap({ snapshots, onAddProject, onOpenTask }: RoadmapProps) {
  if (!snapshots.length) return <div className="view-page"><div className="empty-state"><h3>프로젝트를 연결하세요</h3><p>프로젝트의 과거·현재·다음 흐름이 여기에 쌓입니다.</p></div></div>;
  return <div className="view-page roadmap-page flow-roadmap-page">
    <header className="page-heading"><div><span className="eyebrow">ROADMAP FLOW</span><h1>로드맵</h1></div></header>
    <div className="flow-project-list">{snapshots.map((snapshot) => <section className="project-flow" key={snapshot.project.id}>
      <header className="project-flow-header"><div className="project-section-title"><ProjectMark kind={snapshot.project.kind} size="large" /><div><h2>{snapshot.project.name}</h2><p>{snapshot.project.path ?? snapshot.project.repo}</p></div></div><span className="flow-future-label">미래 방향</span></header>
      <FlowTimeline snapshot={snapshot} />
    </section>)}</div>
  </div>;
}
