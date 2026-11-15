import { useMemo, useState, type FormEvent } from 'react';
import type { Memo, ProjectSnapshot, PromoteInput } from '../../types';
import { clampText, errorMessage } from '../utils';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface PromoteModalProps {
  memo: Memo;
  snapshots: ProjectSnapshot[];
  onClose: () => void;
  onPromote: (memo: Memo, input: PromoteInput) => Promise<void>;
}

export function PromoteModal({ memo, snapshots, onClose, onPromote }: PromoteModalProps) {
  const [projectId, setProjectId] = useState(memo.projectId ?? snapshots[0]?.project.id ?? '');
  const [title, setTitle] = useState(clampText(memo.body));
  const [milestone, setMilestone] = useState('');
  const [parent, setParent] = useState('');
  const [status, setStatus] = useState('todo');
  const [draft, setDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const snapshot = snapshots.find((item) => item.project.id === projectId);
  const sortedTasks = useMemo(() => snapshot?.tasks.slice().sort((a, b) => a.title.localeCompare(b.title, 'ko')) ?? [], [snapshot]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId || !title.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await onPromote(memo, {
        projectId,
        title: title.trim(),
        status,
        milestone: milestone || undefined,
        parent: parent || undefined,
        draft,
      });
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  return (
    <Modal title="메모를 작업으로" eyebrow="PROMOTE TO TASK" onClose={onClose} size="medium">
      <form className="stack-form" onSubmit={submit}>
        <blockquote className="promote-source">{memo.body}</blockquote>
        <label className="field-label">
          <span>작업 제목</span>
          <input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} />
        </label>
        <div className="form-grid-two">
          <label className="field-label">
            <span>프로젝트</span>
            <select required value={projectId} onChange={(event) => { setProjectId(event.target.value); setMilestone(''); setParent(''); }}>
              <option value="" disabled>프로젝트 선택</option>
              {snapshots.map((item) => <option key={item.project.id} value={item.project.id}>{item.project.name}</option>)}
            </select>
          </label>
          <label className="field-label">
            <span>초기 상태</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="backlog">백로그</option>
              <option value="todo">할 일</option>
              <option value="in-progress">진행 중</option>
              <option value="done">완료</option>
            </select>
          </label>
          <label className="field-label">
            <span>마일스톤 <em>선택</em></span>
            <select value={milestone} onChange={(event) => setMilestone(event.target.value)} disabled={!snapshot}>
              <option value="">배정하지 않음</option>
              {snapshot?.milestones.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="field-label">
            <span>상위 작업 <em>선택</em></span>
            <select value={parent} onChange={(event) => setParent(event.target.value)} disabled={!snapshot}>
              <option value="">상위 작업 없음</option>
              {sortedTasks.map((task) => <option key={task.key || task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>
        </div>
        <label className="check-field">
          <input type="checkbox" checked={draft} onChange={(event) => setDraft(event.target.checked)} />
          <span><strong>초안으로 생성</strong><small>메모의 나머지 맥락을 작업 초안으로 보존합니다.</small></span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!snapshots.length && <p className="form-error" role="alert">작업으로 만들 프로젝트를 먼저 추가해주세요.</p>}
        <div className="modal-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>취소</button>
          <button type="submit" className="button button-primary" disabled={!projectId || !title.trim() || busy}>
            {busy ? <span className="spinner spinner-dark" /> : <Icon name="arrow" size={16} />}
            {busy ? '작업 만드는 중…' : '작업으로 승격'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
