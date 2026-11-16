import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardData, Memo, MemoInput, Project, ProjectInput, ProjectSnapshot, PromoteInput, Task } from '../types';
import { api } from './api';
import { errorMessage, taskKey, type View } from './utils';
import { Icon, type IconName } from './components/Icon';
import { InitiativeProposalModal } from './components/InitiativeProposalModal';
import { Modal } from './components/Modal';
import { ProjectMark, TaskDetailModal } from './components/Common';
import { MemoComposer } from './components/MemoComposer';
import { ProjectModal } from './components/ProjectModal';
import { PromoteModal } from './components/PromoteModal';
import { Overview } from './views/Overview';
import { Kanban } from './views/Kanban';
import { Roadmap } from './views/Roadmap';
import { Inbox } from './views/Inbox';

const NAV_ITEMS: { id: View; label: string; english: string; icon: IconName }[] = [
  { id: 'overview', label: '이어하기', english: 'Continue', icon: 'overview' },
  { id: 'kanban', label: '할 일', english: 'Tasks', icon: 'kanban' },
  { id: 'roadmap', label: '계획', english: 'Plan', icon: 'roadmap' },
  { id: 'inbox', label: '생각', english: 'Ideas', icon: 'inbox' },
];

function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) as T : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private browsing; the session still works.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialError, setInitialError] = useState('');
  const [language, setLanguage] = useStoredState<'ko' | 'en'>('vibonitor:language', 'ko');
  const [storedView, setStoredView] = useStoredState<View>('vibonitor:selected-view', 'overview');
  const [selectedProject, setSelectedProject] = useStoredState<string>('vibonitor:selected-project', 'all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectModal, setProjectModal] = useState<'add' | 'scan' | null>(null);
  const [quickCapture, setQuickCapture] = useState(false);
  const [promoteMemo, setPromoteMemo] = useState<Memo | null>(null);
  const [detailRef, setDetailRef] = useState<{ projectId: string; taskId: string } | null>(null);
  const [initiativeProposal, setInitiativeProposal] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());
  const [deletingProject, setDeletingProject] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const view = NAV_ITEMS.some((item) => item.id === storedView) ? storedView : 'overview';

  const reload = useCallback(async () => {
    const fresh = await api.dashboard();
    setData(fresh);
  }, []);

  useEffect(() => {
    let active = true;
    api.dashboard().then((dashboard) => {
      if (active) setData(dashboard);
    }).catch((reason) => {
      if (active) setInitialError(errorMessage(reason));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (data && selectedProject !== 'all' && !data.projects.some((snapshot) => snapshot.project.id === selectedProject)) {
      setSelectedProject('all');
    }
  }, [data, selectedProject, setSelectedProject]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuickCapture(true);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.tone === 'error' ? 6000 : 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const snapshots = useMemo(
    () => selectedProject === 'all' ? data?.projects ?? [] : data?.projects.filter((snapshot) => snapshot.project.id === selectedProject) ?? [],
    [data, selectedProject],
  );
  const selectedSnapshot = data?.projects.find((snapshot) => snapshot.project.id === selectedProject);
  const detailTask = detailRef
    ? data?.projects.find((snapshot) => snapshot.project.id === detailRef.projectId)?.tasks.find((task) => task.id === detailRef.taskId)
    : undefined;
  const detailSnapshot = detailTask ? data?.projects.find((snapshot) => snapshot.project.id === detailTask.projectId) : undefined;

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await api.refresh();
      setData(fresh);
      setInitialError('');
      setToast({ message: '프로젝트 컨텍스트를 새로 읽었습니다.', tone: 'success' });
    } catch (reason) {
      setToast({ message: errorMessage(reason), tone: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const addProject = async (input: ProjectInput) => {
    await api.addProject(input);
    await reload();
    setToast({ message: '프로젝트를 작업 공간에 연결했습니다.', tone: 'success' });
  };

  const scanProjects = async (path: string): Promise<Project[]> => {
    const result = await api.scanProjects(path);
    await reload();
    return result.added;
  };

  const deleteProject = async (snapshot: ProjectSnapshot) => {
    if (!window.confirm(`“${snapshot.project.name}” 프로젝트를 작업 공간에서 제거할까요?`)) return;
    setDeletingProject(snapshot.project.id);
    try {
      await api.deleteProject(snapshot.project.id);
      if (selectedProject === snapshot.project.id) setSelectedProject('all');
      setDetailRef(null);
      await reload();
      setToast({ message: '프로젝트 연결을 해제했습니다.', tone: 'success' });
    } catch (reason) {
      setToast({ message: errorMessage(reason), tone: 'error' });
    } finally {
      setDeletingProject('');
    }
  };

  const updateTaskStatus = async (task: Task, status: string) => {
    const key = taskKey(task);
    if (pendingTasks.has(key)) return;
    const previous = data;
    setPendingTasks((current) => new Set(current).add(key));
    setData((current) => current ? {
      ...current,
      projects: current.projects.map((snapshot) => snapshot.project.id === task.projectId ? {
        ...snapshot,
        tasks: snapshot.tasks.map((item) => item.id === task.id ? { ...item, status, updatedAt: new Date().toISOString() } : item),
      } : snapshot),
    } : current);
    try {
      await api.updateTask(task, status);
      await reload();
      setToast({ message: `“${task.title}” 상태를 변경했습니다.`, tone: 'success' });
    } catch (reason) {
      setData(previous);
      setToast({ message: errorMessage(reason), tone: 'error' });
      throw reason;
    } finally {
      setPendingTasks((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const createMemo = async (input: MemoInput) => {
    const memo = await api.createMemo(input);
    setData((current) => current ? { ...current, memos: [...current.memos, memo] } : current);
  };

  const deleteMemo = async (memo: Memo) => {
    await api.deleteMemo(memo.id);
    setData((current) => current ? { ...current, memos: current.memos.filter((item) => item.id !== memo.id) } : current);
    setToast({ message: '메모를 삭제했습니다.', tone: 'success' });
  };

  const promote = async (memo: Memo, input: PromoteInput) => {
    const result = await api.promoteMemo(memo.id, input);
    setData((current) => current ? { ...current, memos: current.memos.map((item) => item.id === memo.id ? result.memo : item) } : current);
    await reload();
    setToast({ message: result.task ? '메모를 작업으로 승격했습니다.' : '메모를 작업으로 변환했습니다.', tone: 'success' });
  };

  const selectView = (next: View) => {
    setStoredView(next);
    setSidebarOpen(false);
  };

  const openTask = (task: Task) => setDetailRef({ projectId: task.projectId, taskId: task.id });

  if (loading) {
    return <div className="app-loading"><Brand /><span className="loading-orbit"><span /></span><p>흩어진 작업 맥락을 모으는 중…</p></div>;
  }

  if (!data) {
    return <div className="app-loading"><Brand /><div className="startup-error"><Icon name="refresh" size={24} /><h1>대시보드에 연결할 수 없습니다</h1><p>{initialError}</p><button className="button button-primary" onClick={() => window.location.reload()}><Icon name="refresh" size={16} />다시 연결</button></div></div>;
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand-row"><Brand /><button className="icon-button mobile-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="메뉴 닫기"><Icon name="close" /></button></div>
        <button className="quick-capture-button" onClick={() => setQuickCapture(true)}><span><Icon name="capture" size={17} />빠른 메모</span><kbd>⌘ K</kbd></button>
        <button className="initiative-create-button" onClick={() => setInitiativeProposal(true)}><Icon name="roadmap" size={15} />큰 계획 만들기</button>
        <nav className="primary-nav" aria-label="주요 화면">
          <span className="sidebar-label">WORKSPACE</span>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => selectView(item.id)}>
              <Icon name={item.icon} size={18} /><span>{language === 'ko' ? item.label : item.english}<small>{language === 'ko' ? item.english : item.label}</small></span>
              {item.id === 'inbox' && data.memos.length > 0 && <span className="nav-count">{data.memos.length}</span>}
            </button>
          ))}
        </nav>
        <section className="sidebar-projects">
          <div className="sidebar-section-heading"><span className="sidebar-label">PROJECTS</span><div><button className="icon-button" onClick={() => setProjectModal('scan')} aria-label="폴더에서 프로젝트 스캔" title="폴더 스캔"><Icon name="search" size={15} /></button><button className="icon-button" onClick={() => setProjectModal('add')} aria-label="프로젝트 추가" title="프로젝트 추가"><Icon name="plus" size={16} /></button></div></div>
          <button className={`all-projects-button ${selectedProject === 'all' ? 'active' : ''}`} onClick={() => { setSelectedProject('all'); setSidebarOpen(false); }}><span className="all-projects-icon"><Icon name="overview" size={15} /></span><span>전체 프로젝트</span><small>{data.projects.length}</small></button>
          <div className="project-nav-list">
            {data.projects.map((snapshot) => (
              <div className={`project-nav-item ${selectedProject === snapshot.project.id ? 'active' : ''}`} key={snapshot.project.id}>
                <button className="project-nav-main" onClick={() => { setSelectedProject(snapshot.project.id); setSidebarOpen(false); }} title={snapshot.project.path ?? snapshot.project.repo}>
                  <ProjectMark kind={snapshot.project.kind} size="small" /><span>{snapshot.project.name}</span>{snapshot.error ? <i className="project-error-dot" /> : <small>{snapshot.tasks.length}</small>}
                </button>
                <button className="project-delete-button" disabled={deletingProject === snapshot.project.id} onClick={() => void deleteProject(snapshot)} aria-label={`${snapshot.project.name} 프로젝트 삭제`} title="프로젝트 연결 해제"><Icon name="close" size={12} /></button>
              </div>
            ))}
          </div>
          {!data.projects.length && <button className="sidebar-empty-project" onClick={() => setProjectModal('add')}><Icon name="plus" size={15} />첫 프로젝트 연결</button>}
        </section>
        <footer className="sidebar-footer"><span className="local-indicator"><i />LOCAL-FIRST</span><span title={data.generatedAt}>{data.projects.length}개 공간 동기화됨</span></footer>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-context"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="메뉴 열기"><Icon name="menu" /></button><span className="topbar-view-icon"><Icon name={NAV_ITEMS.find((item) => item.id === view)!.icon} size={16} /></span><div><strong>{NAV_ITEMS.find((item) => item.id === view)!.label}</strong><span>{selectedSnapshot ? selectedSnapshot.project.name : '전체 프로젝트'}</span></div></div>
          <div className="topbar-actions"><span className="sync-status"><i />{refreshing ? '컨텍스트 읽는 중' : '로컬 컨텍스트'}</span><button className="topbar-capture" onClick={() => setQuickCapture(true)}><Icon name="plus" size={15} />빠른 메모</button><button className="button button-ghost refresh-button" onClick={() => void refresh()} disabled={refreshing}><Icon name="refresh" className={refreshing ? 'spin' : ''} size={16} /><span>{refreshing ? '새로고치는 중' : '새로고침'}</span></button></div>
        </header>
          <div className="language-switch"><button className={language === 'ko' ? 'active' : ''} onClick={() => setLanguage('ko')}>한</button><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button></div>
        <main className={`main-content main-${view}`}>
          {view === 'overview' && <Overview snapshots={snapshots} onAddProject={() => setProjectModal('add')} onOpenTask={openTask} />}
          {view === 'kanban' && <Kanban snapshots={snapshots} pendingTasks={pendingTasks} onAddProject={() => setProjectModal('add')} onOpenTask={openTask} onStatusChange={updateTaskStatus} />}
          {view === 'roadmap' && <Roadmap snapshots={snapshots} onAddProject={() => setProjectModal('add')} onOpenTask={openTask} />}
          {view === 'inbox' && <Inbox memos={data.memos} snapshots={data.projects} initialProjectId={selectedSnapshot?.project.id} onSend={createMemo} onDelete={deleteMemo} onPromote={setPromoteMemo} onOpenTask={openTask} />}
        </main>
      </div>

      {projectModal && <ProjectModal initialMode={projectModal} onClose={() => setProjectModal(null)} onAdd={addProject} onScan={scanProjects} />}
      {quickCapture && (
        <Modal title="빠른 메모" eyebrow="QUICK CAPTURE" onClose={() => setQuickCapture(false)} size="medium">
          <p className="quick-capture-description">지금 떠오른 맥락을 인박스에 바로 남기세요.</p>
          <MemoComposer
            snapshots={data.projects}
            initialProjectId={selectedSnapshot?.project.id}
            autoFocus
            onSend={async (input) => {
              await createMemo(input);
              setQuickCapture(false);
              setToast({ message: '인박스에 메모를 남겼습니다.', tone: 'success' });
            }}
          />
        </Modal>
      )}
      {initiativeProposal && <InitiativeProposalModal snapshot={selectedSnapshot ?? data.projects[0]} onClose={() => setInitiativeProposal(false)} onSaved={reload} />}
      {promoteMemo && <PromoteModal memo={promoteMemo} snapshots={data.projects} onClose={() => setPromoteMemo(null)} onPromote={promote} />}
      {detailTask && detailSnapshot && (
        <TaskDetailModal task={detailTask} snapshot={detailSnapshot} pending={pendingTasks.has(taskKey(detailTask))} onClose={() => setDetailRef(null)} onOpenTask={openTask} onStatusChange={updateTaskStatus} />
      )}
      {toast && <div className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}><span>{toast.tone === 'success' ? <Icon name="check" size={16} /> : <Icon name="close" size={16} />}</span><p>{toast.message}</p><button onClick={() => setToast(null)} aria-label="알림 닫기"><Icon name="close" size={14} /></button></div>}
    </div>
  );
}

function Brand() {
  return <div className="brand"><span className="brand-symbol"><i /><i /><i /></span><span><strong>VIBONITOR</strong><small>DEVELOP WITH CONTINUITY</small></span></div>;
}
