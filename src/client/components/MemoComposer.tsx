import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { MemoInput, ProjectSnapshot } from '../../types';
import { errorMessage } from '../utils';
import { Icon } from './Icon';
import { ProjectMark } from './Common';

interface MemoComposerProps {
  snapshots: ProjectSnapshot[];
  initialProjectId?: string;
  onSend: (input: MemoInput) => Promise<void>;
  autoFocus?: boolean;
  compact?: boolean;
}

export function MemoComposer({ snapshots, initialProjectId = '', onSend, autoFocus = false, compact = false }: MemoComposerProps) {
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [taskId, setTaskId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyId = useId();

  const selectedSnapshot = snapshots.find((snapshot) => snapshot.project.id === projectId);
  const tasks = useMemo(
    () => selectedSnapshot?.tasks.slice().sort((a, b) => a.title.localeCompare(b.title, 'ko')) ?? [],
    [selectedSnapshot],
  );
  const selectedTask = tasks.find((task) => task.id === taskId || task.key === taskId);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, compact ? 52 : 92), 220)}px`;
  }, [body, compact]);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError('');
    try {
      await onSend({ body: trimmed, projectId: projectId || undefined, taskId: taskId || undefined });
      setBody('');
      setTaskId('');
      textareaRef.current?.focus();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form className={`memo-composer ${compact ? 'composer-compact' : ''}`} onSubmit={onSubmit}>
      {(selectedSnapshot || selectedTask) && (
        <div className="attachment-chips" aria-label="연결된 항목">
          {selectedSnapshot && (
            <span className="attachment-chip"><ProjectMark kind={selectedSnapshot.project.kind} size="small" />{selectedSnapshot.project.name}
              <button type="button" aria-label="프로젝트 연결 해제" onClick={() => { setProjectId(''); setTaskId(''); }}><Icon name="close" size={12} /></button>
            </span>
          )}
          {selectedTask && (
            <span className="attachment-chip attachment-task"><Icon name="check" size={12} />{selectedTask.title}
              <button type="button" aria-label="작업 연결 해제" onClick={() => setTaskId('')}><Icon name="close" size={12} /></button>
            </span>
          )}
        </div>
      )}
      <label className="sr-only" htmlFor={bodyId}>나에게 보내는 메모</label>
      <textarea
        id={bodyId}
        ref={textareaRef}
        value={body}
        autoFocus={autoFocus}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="떠오른 생각, 다음에 이어갈 맥락을 남겨보세요…"
        rows={compact ? 3 : 2}
        disabled={sending}
      />
      <div className="composer-toolbar">
        <div className="composer-attachments">
          <label className="attachment-select">
            <Icon name="folder" size={15} />
            <span className="sr-only">메모에 연결할 프로젝트</span>
            <select
              aria-label="프로젝트 연결"
              value={projectId}
              disabled={sending}
              onChange={(event) => { setProjectId(event.target.value); setTaskId(''); }}
            >
              <option value="">프로젝트 없음</option>
              {snapshots.map((snapshot) => <option key={snapshot.project.id} value={snapshot.project.id}>{snapshot.project.name}</option>)}
            </select>
          </label>
          <label className="attachment-select">
            <Icon name="link" size={15} />
            <span className="sr-only">메모에 연결할 작업</span>
            <select
              aria-label="작업 연결"
              value={taskId}
              disabled={sending || !projectId}
              onChange={(event) => setTaskId(event.target.value)}
            >
              <option value="">{projectId ? '작업 없음' : '프로젝트 먼저 선택'}</option>
              {tasks.map((task) => <option key={task.key || task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>
        </div>
        <div className="composer-send">
          <span className="key-hint"><kbd>Enter</kbd> 전송 · <kbd>Shift ↵</kbd> 줄바꿈</span>
          <button className="send-button" type="submit" disabled={!body.trim() || sending} aria-label="메모 보내기">
            {sending ? <span className="spinner" /> : <Icon name="send" size={17} />}
            <span>{sending ? '저장 중' : '남기기'}</span>
          </button>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
