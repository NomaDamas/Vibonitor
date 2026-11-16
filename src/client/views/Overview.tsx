import type { ProjectSnapshot, Task } from '../../types';
import { formatDate, formatRelative, isDone, isUnblocked, normalizeStatus, taskRecord } from '../utils';
import { EmptyState, ProgressBar, ProjectMark, StatusBadge } from '../components/Common';
import { Icon } from '../components/Icon';

interface OverviewProps {
  snapshots: ProjectSnapshot[];
  onAddProject: () => void;
  onOpenTask: (task: Task) => void;
}

function byRecent(a: Task, b: Task): number {
  return (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? '');
}

export function Overview({ snapshots, onAddProject, onOpenTask }: OverviewProps) {
  if (!snapshots.length) {
    return (
      <div className="view-page">
        <PageHeading />
        <EmptyState
          icon="folder"
          title="이어갈 프로젝트를 연결하세요"
          description="로컬 폴더나 GitHub 저장소를 추가하면 마지막 작업 기록과 다음 행동을 한곳에서 볼 수 있습니다."
          action={<button className="button button-primary" onClick={onAddProject}><Icon name="plus" size={16} />첫 프로젝트 추가</button>}
        />
      </div>
    );
  }

  return (
    <div className="view-page overview-page">
      <PageHeading />
      <div className="continuity-list">
        {snapshots.map((snapshot) => (
          <ContinuityProject key={snapshot.project.id} snapshot={snapshot} onOpenTask={onOpenTask} />
        ))}
      </div>
    </div>
  );
}

function PageHeading() {
  return (
    <header className="page-heading overview-heading">
      <div>
        <span className="eyebrow">CONTINUE</span>
        <h1>다시, 맥락부터.</h1>
        <p>현재 작업과 다음 할 일을 바로 확인하세요.</p>
      </div>
      <div className="today-stamp"><span /><div><strong>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())}</strong><small>오늘의 작업 공간</small></div></div>
    </header>
  );
}

function ContinuityProject({ snapshot, onOpenTask }: { snapshot: ProjectSnapshot; onOpenTask: (task: Task) => void }) {
  const tasks = snapshot.tasks;
  const active = tasks.filter((task) => normalizeStatus(task.status) === 'in-progress').sort(byRecent)[0];
  const next = tasks.filter((task) => !isDone(task) && task.id !== active?.id && isUnblocked(task, tasks)).sort((a, b) => {
    const statusDifference = (normalizeStatus(a.status) === 'todo' ? 0 : 1) - (normalizeStatus(b.status) === 'todo' ? 0 : 1);
    return statusDifference || byRecent(a, b);
  });
  const lastCompleted = tasks.filter((task) => isDone(task) && (task.finalSummary || task.notes)).sort(byRecent)[0];
  const record = active ? taskRecord(active) : lastCompleted ? taskRecord(lastCompleted) : null;
  const completed = tasks.filter(isDone).length;
  const latestRoadmap = snapshot.sessionRoadmap?.[0];
  return (
    <section className="continuity-project">
      <header className="project-section-header">
        <div className="project-section-title">
          <ProjectMark kind={snapshot.project.kind} size="large" />
          <div><div className="project-title-line"><h2>{snapshot.project.name}</h2><span className="source-label">{snapshot.project.kind === 'github' ? 'GitHub' : 'Local'}</span></div>
            <p>{snapshot.project.path ?? snapshot.project.repo ?? snapshot.project.description ?? '프로젝트 작업 공간'}</p>
          </div>
        </div>
        <div className="project-refresh-meta"><span className={snapshot.error ? 'sync-dot sync-error' : 'sync-dot'} />{snapshot.error ? '동기화 문제 있음' : `${formatRelative(snapshot.refreshedAt)} 동기화`}</div>
      </header>

      {snapshot.error && <div className="inline-error" role="alert"><Icon name="clock" size={16} /><span><strong>일부 정보를 불러오지 못했습니다.</strong>{snapshot.error}</span></div>}

      <div className="resume-layout">
        <article className="resume-card">
          <div className="card-kicker"><span><Icon name="spark" size={15} />이어하기</span>{active ? <StatusBadge status={active.status} /> : <span className="quiet-badge">다음 행동</span>}</div>
          {active || next[0] ? (
            <>
              <button className="resume-task-title" onClick={() => onOpenTask((active ?? next[0])!)}>
                <h3>{(active ?? next[0])!.title}</h3><span className="round-arrow"><Icon name="arrow" size={18} /></span>
              </button>
              <div className="task-identifier">{(active ?? next[0])!.id}{(active ?? next[0])!.milestone && <><span>·</span>{(active ?? next[0])!.milestone}</>}</div>
              {record ? (
                <div className="last-record"><span>{active ? record.label : `최근 완료 · ${lastCompleted?.title}`}</span><p>{record.text}</p></div>
              ) : (
                <div className="last-record"><span>작업 컨텍스트</span><p>{taskRecord((active ?? next[0])!).text}</p></div>
              )}
              <button className="text-link" onClick={() => onOpenTask((active ?? next[0])!)}>작업 컨텍스트 열기<Icon name="arrow" size={14} /></button>
            </>
          ) : (
            <div className="resume-complete"><span className="complete-check"><Icon name="check" size={20} /></span><h3>열린 작업이 모두 정리됐습니다</h3><p>새로운 아이디어는 인박스에 남기고 작업으로 승격하세요.</p></div>
          )}
        </article>

        <aside className="next-card">
          <div className="card-title-row"><h3><Icon name="arrow" size={16} />바로 시작할 작업</h3><span>{next.length}</span></div>
          <p className="card-subtitle">선행 작업이 해결된 순서</p>
          {next.length ? (
            <ol className="next-task-list">
              {next.slice(0, 4).map((task, index) => (
                <li key={task.key || task.id}>
                  <button onClick={() => onOpenTask(task)}><span className="next-index">{String(index + 1).padStart(2, '0')}</span><span className="next-task-copy"><strong>{task.title}</strong><small>{task.id}{task.dependencies.length ? ` · 선행 ${task.dependencies.length}개 해결` : ' · 선행 작업 없음'}</small></span><Icon name="chevron" size={14} /></button>
                </li>
              ))}
            </ol>
          ) : <div className="small-empty"><Icon name="check" size={17} /><span>{active ? '진행 중인 작업 이후의 막힌 없는 작업이 없습니다.' : '대기 중인 다음 작업이 없습니다.'}</span></div>}
        </aside>
      </div>

      <div className="context-grid">
        <section className="context-card commits-card">
          <div className="card-title-row"><h3><Icon name="git" size={16} />최근 커밋</h3><span>{snapshot.commits.length}</span></div>
          {snapshot.commits.length ? <ul className="commit-list">
            {snapshot.commits.slice(0, 4).map((commit) => (
              <li key={commit.hash}><span className="commit-node" /><div><p>{commit.message}</p><div><code>{commit.hash.slice(0, 7)}</code><span>{commit.author}</span><time>{formatDate(commit.date)}</time></div></div></li>
            ))}
          </ul> : <div className="small-empty">표시할 Git 커밋 기록이 없습니다.</div>}
        </section>

        <section className="context-card session-card">
          <div className="card-title-row"><h3><Icon name="terminal" size={16} />에이전트 세션</h3>{snapshot.session && <span className="tool-badge">{snapshot.session.tool}</span>}</div>
          {snapshot.session ? <div className="session-content"><p className="session-title">{latestRoadmap?.title || snapshot.session.summary.split('\n')[0]}</p><p className="session-summary">{latestRoadmap?.summary || '세션 기록을 확인했습니다.'}</p>{latestRoadmap?.todos.length ? <ul className="session-todo-summary">{latestRoadmap.todos.slice(0, 4).map((todo, index) => <li key={index} className={todo.done ? 'done' : ''}>{todo.done ? '✓' : '·'} {todo.text}</li>)}</ul> : null}<div className="session-time"><span className="sync-dot" />{formatRelative(snapshot.session.updatedAt)} 활동</div></div> : <div className="small-empty"><Icon name="terminal" size={17} /><span>연결된 에이전트 세션이 없습니다.</span></div>}
        </section>

        <section className="context-card roadmap-summary-card">
          <div className="card-title-row"><h3><Icon name="roadmap" size={16} />로드맵 진행</h3><span>{completed}/{tasks.length}</span></div>
          <ProgressBar value={completed} total={tasks.length} label="전체 작업" />
          {snapshot.milestones.length ? <div className="milestone-summary-list">
            {snapshot.milestones.slice(0, 4).map((milestone) => {
              const milestoneTasks = tasks.filter((task) => task.milestone === milestone.id || task.milestone === milestone.title);
              const done = milestoneTasks.filter(isDone).length;
              return <div key={milestone.id}><span>{milestone.title}</span><span className="mono-meta">{done}/{milestoneTasks.length}</span><div className="mini-progress"><span style={{ width: `${milestoneTasks.length ? (done / milestoneTasks.length) * 100 : 0}%` }} /></div></div>;
            })}
          </div> : <div className="small-empty">마일스톤 없이 {tasks.length}개 작업을 관리 중입니다.</div>}
        </section>
      </div>
    </section>
  );
}
