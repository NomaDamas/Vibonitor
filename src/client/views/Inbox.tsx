import { useEffect, useMemo, useRef, useState } from 'react';
import type { Memo, MemoInput, ProjectSnapshot, Task } from '../../types';
import { findTask, formatDay, formatRelative } from '../utils';
import { EmptyState, ProjectMark } from '../components/Common';
import { Icon } from '../components/Icon';
import { MemoComposer } from '../components/MemoComposer';

interface InboxProps {
  memos: Memo[];
  snapshots: ProjectSnapshot[];
  initialProjectId?: string;
  onSend: (input: MemoInput) => Promise<void>;
  onDelete: (memo: Memo) => Promise<void>;
  onPromote: (memo: Memo) => void;
  onOpenTask: (task: Task) => void;
}

export function Inbox({ memos, snapshots, initialProjectId, onSend, onDelete, onPromote, onOpenTask }: InboxProps) {
  const [deleting, setDeleting] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(memos.length);
  const sorted = useMemo(() => memos.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [memos]);
  const allTasks = useMemo(() => snapshots.flatMap((snapshot) => snapshot.tasks), [snapshots]);

  useEffect(() => {
    if (sorted.length > previousCount.current) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    previousCount.current = sorted.length;
  }, [sorted.length]);

  const remove = async (memo: Memo) => {
    if (!window.confirm('이 메모를 삭제할까요?')) return;
    setDeleting(memo.id);
    setError('');
    try {
      await onDelete(memo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '메모를 삭제하지 못했습니다.');
    } finally {
      setDeleting('');
    }
  };

  return (
    <div className="inbox-view">
      <header className="inbox-header">
        <div><span className="self-avatar"><Icon name="capture" size={19} /></span><div><h1>나에게 보내기</h1><p>생각이 흩어지기 전에 남기는 개인 기록</p></div></div>
        <span className="memo-count">{memos.length} MEMOS</span>
      </header>
      <div className="inbox-chat">
        <div className="chat-intro"><span><Icon name="spark" size={15} />맥락은 짧게 남겨도 충분합니다</span><p>프로젝트와 작업을 연결하거나, 나중에 작업으로 승격하세요.</p></div>
        {error && <div className="inline-error" role="alert">{error}</div>}
        {sorted.length ? (
          <div className="memo-stream">
            {sorted.map((memo, index) => {
              const day = formatDay(memo.createdAt);
              const showDay = day && day !== formatDay(sorted[index - 1]?.createdAt ?? '');
              const snapshot = snapshots.find((item) => item.project.id === memo.projectId);
              const task = findTask(snapshot?.tasks ?? allTasks, memo.taskId);
              const promotedTask = findTask(allTasks, memo.promotedTo);
              return (
                <div key={memo.id}>
                  {showDay && <div className="chat-date"><span>{day}</span></div>}
                  <article className={`memo-row ${deleting === memo.id ? 'is-deleting' : ''}`}>
                    <div className="memo-bubble-wrap">
                      {(snapshot || memo.taskId) && <div className="memo-attachments">
                        {snapshot && <span><ProjectMark kind={snapshot.project.kind} size="small" />{snapshot.project.name}</span>}
                        {memo.taskId && (task ? <button onClick={() => onOpenTask(task)}><Icon name="link" size={11} />{task.title}</button> : <span><Icon name="link" size={11} />{memo.taskId}</span>)}
                      </div>}
                      <div className="memo-bubble"><p>{memo.body}</p></div>
                      <div className="memo-actions">
                        <button onClick={() => void remove(memo)} disabled={deleting === memo.id} aria-label="메모 삭제" title="메모 삭제"><Icon name="trash" size={13} /></button>
                        {memo.promotedTo ? (
                          promotedTask ? <button className="promoted-link" onClick={() => onOpenTask(promotedTask)}><Icon name="check" size={12} />작업으로 이동</button> : <span className="promoted-label"><Icon name="check" size={12} />승격 완료</span>
                        ) : <button onClick={() => onPromote(memo)}><Icon name="arrow" size={12} />작업으로</button>}
                      </div>
                    </div>
                    <time title={new Date(memo.createdAt).toLocaleString('ko-KR')}>{formatRelative(memo.createdAt)}</time>
                  </article>
                </div>
              );
            })}
          </div>
        ) : <EmptyState icon="inbox" title="아직 남긴 기록이 없습니다" description="다음에 이어갈 일, 코드에서 발견한 문제, 잠깐 떠오른 아이디어를 첫 메모로 남겨보세요." />}
        <div ref={endRef} />
      </div>
      <div className="inbox-composer-wrap">
        <MemoComposer snapshots={snapshots} initialProjectId={initialProjectId} onSend={onSend} compact />
      </div>
    </div>
  );
}
