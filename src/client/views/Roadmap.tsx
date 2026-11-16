import { useState, type ReactNode } from 'react';
import type { Milestone, ProjectSnapshot, Task } from '../../types';
import { findTask, isDone, taskKey } from '../utils';
import { EmptyState, ProgressBar, ProjectMark, StatusBadge } from '../components/Common';
import { Icon } from '../components/Icon';

interface RoadmapProps {
  snapshots: ProjectSnapshot[];
  onAddProject: () => void;
  onOpenTask: (task: Task) => void;
}

export function Roadmap({ snapshots, onAddProject, onOpenTask }: RoadmapProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  if (!snapshots.length) {
    return <div className="view-page"><RoadmapHeading /><EmptyState icon="roadmap" title="로드맵을 그릴 프로젝트가 없습니다" description="프로젝트를 추가하면 마일스톤, 상위 작업, 선행 관계를 한 트리에서 볼 수 있습니다." action={<button className="button button-primary" onClick={onAddProject}><Icon name="plus" size={16} />프로젝트 추가</button>} /></div>;
  }

  return (
    <div className="view-page roadmap-page">
      <RoadmapHeading />
      {snapshots.map((snapshot) => {
        const assigned = new Set<Task>();
        return (
          <section className="roadmap-project" key={snapshot.project.id}>
            <header className="project-section-header roadmap-project-header">
              <div className="project-section-title"><ProjectMark kind={snapshot.project.kind} size="large" /><div><h2>{snapshot.project.name}</h2><p>{snapshot.project.description ?? snapshot.project.path ?? snapshot.project.repo}</p></div></div>
              <span className="roadmap-total"><strong>{snapshot.tasks.filter(isDone).length}</strong> / {snapshot.tasks.length} 완료</span>
            </header>
            {snapshot.error && <div className="inline-error" role="alert">{snapshot.error}</div>}
            {(snapshot.sessionRoadmap?.length ?? 0) > 0 && <section className="session-roadmap"><div className="card-title-row"><h3><Icon name="roadmap" size={16} />작업 흐름</h3><span>최근 {Math.min(snapshot.sessionRoadmap?.length ?? 0, 5)}개</span></div><div className="session-roadmap-scroll">{snapshot.sessionRoadmap?.slice(0, 5).map((node) => <article className="session-roadmap-node" key={node.id}><div className="session-node-marker" /><div className="session-node-content"><div className="session-node-meta"><time>{new Date(node.updatedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><span>{node.tool}</span></div><h3>{node.title}</h3><p>{node.summary}</p>{node.todos.length > 0 && <ul>{node.todos.map((todo, index) => <li key={`${node.id}-${index}`} className={todo.done ? 'done' : ''}><span>{todo.done ? '✓' : '·'}</span>{todo.text}</li>)}</ul>}</div></article>)}</div></section>}
            {(snapshot.initiatives?.length ?? 0) > 0 && <section className="planning-initiative-list"><div className="card-title-row"><h3><Icon name="spark" size={16} />큰 주제</h3><span>{snapshot.initiatives?.length}</span></div>{snapshot.initiatives?.map((initiative) => <div className="planning-initiative-row" key={initiative.id}><span className={`task-tree-dot ${initiative.status === 'merged' ? 'done' : ''}`} /> <strong>{initiative.title}</strong><StatusBadge status={initiative.status} /><small>{initiative.nextAction}</small></div>)}</section>}
            <div className="milestone-tree">
              {snapshot.milestones.map((milestone) => {
                const tasks = snapshot.tasks.filter((task) => task.milestone === milestone.id || task.milestone === milestone.title);
                tasks.forEach((task) => assigned.add(task));
                const key = `${snapshot.project.id}:${milestone.id}`;
                return <MilestoneBlock key={milestone.id} milestone={milestone} tasks={tasks} allTasks={snapshot.tasks} expanded={!collapsed.has(key)} onToggle={() => toggle(key)} onOpenTask={onOpenTask} />;
              })}
              {(() => {
                const unplanned = snapshot.tasks.filter((task) => !assigned.has(task));
                if (!unplanned.length && snapshot.milestones.length) return null;
                const key = `${snapshot.project.id}:unplanned`;
                return (
                  <section className="milestone-block unplanned-block">
                    <button className="milestone-header" onClick={() => toggle(key)} aria-expanded={!collapsed.has(key)}>
                      <span className={`tree-chevron ${collapsed.has(key) ? '' : 'expanded'}`}><Icon name="chevron" size={16} /></span>
                      <span className="milestone-symbol"><Icon name="capture" size={17} /></span>
                      <span className="milestone-heading-copy"><span><strong>미배정 작업</strong><span className="milestone-count">{unplanned.length}</span></span><small>마일스톤이 없거나 연결되지 않은 작업도 놓치지 않습니다.</small></span>
                    </button>
                    {!collapsed.has(key) && (
                      <div className="milestone-body">
                        {unplanned.length ? <TaskTree tasks={unplanned} allTasks={snapshot.tasks} onOpenTask={onOpenTask} unplanned /> : <div className="small-empty">마일스톤과 작업이 아직 없습니다.</div>}
                      </div>
                    )}
                  </section>
                );
              })()}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RoadmapHeading() {
  return <header className="page-heading"><div><span className="eyebrow">PLAN</span><h1>계획</h1><p>프로젝트의 방향과 큰 주제를 확인합니다.</p></div></header>;
}

function MilestoneBlock({ milestone, tasks, allTasks, expanded, onToggle, onOpenTask }: {
  milestone: Milestone;
  tasks: Task[];
  allTasks: Task[];
  expanded: boolean;
  onToggle: () => void;
  onOpenTask: (task: Task) => void;
}) {
  const done = tasks.filter(isDone).length;
  return (
    <section className="milestone-block">
      <button className="milestone-header" onClick={onToggle} aria-expanded={expanded}>
        <span className={`tree-chevron ${expanded ? 'expanded' : ''}`}><Icon name="chevron" size={16} /></span>
        <span className="milestone-symbol"><Icon name="roadmap" size={17} /></span>
        <span className="milestone-heading-copy"><span><strong>{milestone.title}</strong><span className="milestone-count">{tasks.length}</span></span>{milestone.description && <small>{milestone.description}</small>}</span>
        <span className="milestone-progress"><ProgressBar value={done} total={tasks.length} label={`${done}/${tasks.length} 완료`} /></span>
      </button>
      {expanded && <div className="milestone-body">{tasks.length ? <TaskTree tasks={tasks} allTasks={allTasks} onOpenTask={onOpenTask} /> : <div className="small-empty">이 마일스톤에 배정된 작업이 없습니다.</div>}</div>}
    </section>
  );
}

function TaskTree({ tasks, allTasks, onOpenTask, unplanned = false }: { tasks: Task[]; allTasks: Task[]; onOpenTask: (task: Task) => void; unplanned?: boolean }) {
  const matchesParent = (child: Task, parent: Task) => child.parent === parent.id || child.parent === parent.key;
  const roots = tasks.filter((task) => {
    if (!task.parent) return true;
    return !tasks.some((candidate) => matchesParent(task, candidate));
  });

  const renderNode = (task: Task, ancestry: Set<string>): ReactNode => {
    if (ancestry.has(taskKey(task))) {
      return <li className="roadmap-task-node" key={taskKey(task)}><div className="cycle-warning">순환 상위 관계: {task.title}</div></li>;
    }
    const nextAncestry = new Set(ancestry).add(taskKey(task));
    const children = tasks.filter((candidate) => matchesParent(candidate, task));
    const parent = findTask(allTasks, task.parent);
    const orphanParent = Boolean(task.parent && (!parent || !tasks.includes(parent)));
    return (
      <li className="roadmap-task-node" key={taskKey(task)}>
        <div className="roadmap-task-row">
          <span className={`task-tree-dot ${isDone(task) ? 'done' : ''}`}>{isDone(task) && <Icon name="check" size={10} />}</span>
          <button className="roadmap-task-main" onClick={() => onOpenTask(task)}>
            <span className="roadmap-task-title"><strong>{task.title}</strong><code>{task.id}</code></span>
            <span className="roadmap-task-meta"><StatusBadge status={task.status} />{task.priority && <span className="priority-badge">{task.priority}</span>}{task.assignee.length > 0 && <span>{task.assignee.join(', ')}</span>}</span>
          </button>
          <button className="icon-button task-open-button" onClick={() => onOpenTask(task)} aria-label={`${task.title} 상세 보기`}><Icon name="chevron" size={15} /></button>
        </div>
        {(orphanParent || unplanned && task.milestone) && <div className="orphan-notice"><Icon name="link" size={12} />{orphanParent ? `상위 작업 ${task.parent}을 찾을 수 없습니다` : `연결되지 않은 마일스톤 · ${task.milestone}`}</div>}
        {task.dependencies.length > 0 && (
          <div className="roadmap-dependencies"><span><Icon name="branch" size={12} />선행</span>{task.dependencies.map((reference) => {
            const dependency = findTask(allTasks, reference);
            return dependency
              ? <button key={reference} className={isDone(dependency) ? 'dependency-chip done' : 'dependency-chip'} onClick={() => onOpenTask(dependency)} title={dependency.title}>{isDone(dependency) && <Icon name="check" size={10} />}{dependency.title}</button>
              : <span className="dependency-chip missing" key={reference}>{reference} · 없음</span>;
          })}</div>
        )}
        {children.length > 0 && <ol className="roadmap-children">{children.map((child) => renderNode(child, nextAncestry))}</ol>}
      </li>
    );
  };

  return <ol className="roadmap-task-tree">{roots.map((task) => renderNode(task, new Set()))}</ol>;
}
