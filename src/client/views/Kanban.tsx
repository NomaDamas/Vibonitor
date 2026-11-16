import { useState, type DragEvent } from 'react';
import type { Initiative, InitiativeStatus } from '../../initiative-types';
import type { ProjectSnapshot, Task } from '../../types';
import { findTask, normalizeStatus, STATUS_COLUMNS, taskKey, type CanonicalStatus } from '../utils';
import { EmptyState, ProjectMark, StatusBadge } from '../components/Common';
import { Icon } from '../components/Icon';
const INITIATIVE_COLUMNS: Array<{ id: InitiativeStatus; label: string }> = [
  { id: 'proposed', label: '제안됨' }, { id: 'approved', label: '승인됨' },
  { id: 'in-progress', label: '진행 중' }, { id: 'review', label: '리뷰' }, { id: 'merged', label: '완료' },
];

interface KanbanProps {
  snapshots: ProjectSnapshot[];
  pendingTasks: Set<string>;
  onAddProject: () => void;
  onOpenTask: (task: Task) => void;
  onStatusChange: (task: Task, status: string) => Promise<void>;
}

export function Kanban({ snapshots, pendingTasks, onAddProject, onOpenTask, onStatusChange }: KanbanProps) {
  const [dropTarget, setDropTarget] = useState<string>('');
  const hasInitiatives = snapshots.some((snapshot) => (snapshot.initiatives?.length ?? 0) > 0);
  if (hasInitiatives) return <InitiativeBoard snapshots={snapshots} onAddProject={onAddProject} />;

  if (!snapshots.length) {
    return <div className="view-page"><KanbanHeading total={0} /><EmptyState icon="kanban" title="칸반에 놓인 작업이 없습니다" description="프로젝트를 연결하면 백로그와 GitHub 작업을 상태별로 정리할 수 있습니다." action={<button className="button button-primary" onClick={onAddProject}><Icon name="plus" size={16} />프로젝트 추가</button>} /></div>;
  }

  const moveTask = async (event: DragEvent, snapshot: ProjectSnapshot, status: CanonicalStatus) => {
    event.preventDefault();
    setDropTarget('');
    const raw = event.dataTransfer.getData('application/x-vibonitor-task') || event.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const reference = JSON.parse(raw) as { projectId: string; taskId: string };
      if (reference.projectId !== snapshot.project.id) return;
      const task = snapshot.tasks.find((item) => item.id === reference.taskId);
      if (task && normalizeStatus(task.status) !== status && !pendingTasks.has(taskKey(task))) await onStatusChange(task, status);
    } catch {
      // Incomplete external drag data is not a movable task.
    }
  };

  return (
    <div className="view-page kanban-page">
      <KanbanHeading total={snapshots.reduce((sum, snapshot) => sum + snapshot.tasks.length, 0)} />
      {snapshots.map((snapshot) => (
        <section className="kanban-project" key={snapshot.project.id}>
          <header className="board-project-header">
            <div><ProjectMark kind={snapshot.project.kind} /><h2>{snapshot.project.name}</h2><span>{snapshot.tasks.length}개 작업</span></div>
            <span className="drag-instruction"><Icon name="capture" size={14} />카드를 끌어 상태를 바꾸세요</span>
          </header>
          {snapshot.error && <div className="inline-error" role="alert">{snapshot.error}</div>}
          <div className="kanban-board">
            {STATUS_COLUMNS.map((column) => {
              const tasks = snapshot.tasks.filter((task) => normalizeStatus(task.status) === column.id);
              const targetKey = `${snapshot.project.id}:${column.id}`;
              return (
                <section
                  className={`kanban-column column-${column.id} ${dropTarget === targetKey ? 'is-drop-target' : ''}`}
                  key={column.id}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(targetKey); }}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(''); }}
                  onDrop={(event) => void moveTask(event, snapshot, column.id)}
                  aria-label={`${snapshot.project.name} ${column.label} 열`}
                >
                  <header className="kanban-column-header"><div><span className="column-dot" /><h3>{column.label}</h3><small>{column.english}</small></div><span className="column-count">{tasks.length}</span></header>
                  <div className="kanban-column-body">
                    {tasks.map((task) => (
                      <KanbanCard key={task.key || task.id} task={task} snapshot={snapshot} pending={pendingTasks.has(taskKey(task))} onOpen={() => onOpenTask(task)} onStatusChange={onStatusChange} />
                    ))}
                    {!tasks.length && <div className="column-empty"><span />작업을 여기로 옮기세요</div>}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function InitiativeBoard({ snapshots, onAddProject }: { snapshots: ProjectSnapshot[]; onAddProject: () => void }) {
  const initiatives = snapshots.flatMap((snapshot) => (snapshot.initiatives ?? []).map((initiative) => ({ initiative, project: snapshot.project })));
  return <div className="view-page kanban-page initiative-board-page">
    <header className="page-heading"><div><span className="eyebrow">APPROVED OUTCOMES</span><h1>큰 구현 보드</h1><p>카드 하나는 하나의 검토 가능한 PR입니다. 내부 이슈는 카드 안에 접혀 있습니다.</p></div><span className="page-count"><strong>{initiatives.length}</strong> INITIATIVES</span></header>
    {!initiatives.length ? <EmptyState icon="kanban" title="큰 구현 카드가 없습니다" description="프로젝트 프롬프트를 Initiative 제안으로 만들면 이 보드에 표시됩니다." action={<button className="button button-primary" onClick={onAddProject}><Icon name="plus" size={16} />프로젝트 추가</button>} /> : <div className="initiative-kanban-board">
      {INITIATIVE_COLUMNS.map((column) => <section className={`initiative-column initiative-${column.id}`} key={column.id}>
        <header className="kanban-column-header"><div><span className="column-dot" /><h3>{column.label}</h3></div><span className="column-count">{initiatives.filter(({ initiative }) => initiative.status === column.id).length}</span></header>
        <div className="initiative-column-body">{initiatives.filter(({ initiative }) => initiative.status === column.id).map(({ initiative, project }) => <article className="initiative-card" key={initiative.id}>
          <div className="initiative-card-top"><code>{initiative.id}</code><ProjectMark kind={project.kind} size="small" /></div><h3>{initiative.title}</h3><p>{initiative.outcome || initiative.sourcePrompt}</p>
          <div className="initiative-card-meta"><span>{initiative.issues.filter((issue) => issue.status === 'done').length}/{initiative.issues.length} 이슈 완료</span><span>{initiative.prRef ? `PR ${initiative.prRef}` : 'PR 준비 전'}</span></div><div className="initiative-next"><span>다음</span>{initiative.nextAction || '계획 확인 필요'}</div>
        </article>)}{!initiatives.some(({ initiative }) => initiative.status === column.id) && <div className="column-empty"><span />이 상태의 카드가 없습니다</div>}</div>
      </section>)}
    </div>}
  </div>;
}

function KanbanHeading({ total }: { total: number }) {
  return <header className="page-heading"><div><span className="eyebrow">WORKFLOW</span><h1>칸반</h1><p>상태를 움직여 현재의 작업 흐름을 프로젝트와 동기화합니다.</p></div><span className="page-count"><strong>{total}</strong> TASKS</span></header>;
}

function KanbanCard({ task, snapshot, pending, onOpen, onStatusChange }: {
  task: Task;
  snapshot: ProjectSnapshot;
  pending: boolean;
  onOpen: () => void;
  onStatusChange: (task: Task, status: string) => Promise<void>;
}) {
  const doneDependencies = task.dependencies.filter((reference) => {
    const dependency = findTask(snapshot.tasks, reference);
    return dependency && normalizeStatus(dependency.status) === 'done';
  }).length;

  return (
    <article
      className={`kanban-task-card ${pending ? 'is-pending' : ''}`}
      draggable={!pending}
      onDragStart={(event) => {
        const payload = JSON.stringify({ projectId: task.projectId, taskId: task.id });
        event.dataTransfer.setData('application/x-vibonitor-task', payload);
        event.dataTransfer.setData('text/plain', payload);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="task-card-top"><code>{task.id}</code>{task.priority && <span className="priority-badge">{task.priority}</span>}<span className="drag-handle" aria-hidden="true"><Icon name="more" size={15} /></span></div>
      <button className="kanban-task-title" onClick={onOpen}>{task.title}</button>
      {(task.finalSummary || task.notes || task.description) && <p className="kanban-task-excerpt">{task.finalSummary || task.notes || task.description}</p>}
      {task.labels.length > 0 && <div className="task-labels">{task.labels.slice(0, 3).map((label) => <span className="label-chip" key={label}>{label}</span>)}</div>}
      {task.dependencies.length > 0 && <div className="dependency-progress"><Icon name="link" size={12} />선행 작업 {doneDependencies}/{task.dependencies.length}</div>}
      <div className="task-card-bottom">
        <StatusBadge status={task.status} />
        <select
          aria-label={`${task.title} 상태 변경`}
          value={normalizeStatus(task.status)}
          disabled={pending}
          onChange={(event) => void onStatusChange(task, event.target.value)}
        >
          {STATUS_COLUMNS.map((column) => <option value={column.id} key={column.id}>{column.label}</option>)}
        </select>
      </div>
      {pending && <div className="card-saving"><span className="spinner" />저장 중…</div>}
    </article>
  );
}
