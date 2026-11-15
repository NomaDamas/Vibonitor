import type { ReactNode } from 'react';
import type { ProjectKind, ProjectSnapshot, Task } from '../../types';
import { findTask, formatDate, normalizeStatus, STATUS_COLUMNS, statusLabel, taskKey } from '../utils';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function ProjectMark({ kind, size = 'medium' }: { kind: ProjectKind; size?: 'small' | 'medium' | 'large' }) {
  return (
    <span className={`project-mark project-mark-${size} project-mark-${kind}`}>
      <Icon name={kind === 'github' ? 'github' : 'folder'} size={size === 'small' ? 13 : size === 'large' ? 22 : 16} />
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const canonical = normalizeStatus(status);
  return <span className={`status-badge status-${canonical}`}><span />{statusLabel(status)}</span>;
}

export function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="progress-wrap">
      <div className="progress-meta"><span>{label}</span><strong>{percentage}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'spark', title, description, action }: {
  icon?: 'spark' | 'folder' | 'inbox' | 'roadmap' | 'kanban';
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name={icon} size={24} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

interface TaskDetailProps {
  task: Task;
  snapshot: ProjectSnapshot;
  pending: boolean;
  onClose: () => void;
  onOpenTask: (task: Task) => void;
  onStatusChange: (task: Task, status: string) => Promise<void>;
}

export function TaskDetailModal({ task, snapshot, pending, onClose, onOpenTask, onStatusChange }: TaskDetailProps) {
  const milestone = snapshot.milestones.find((item) => item.id === task.milestone || item.title === task.milestone);
  const parent = findTask(snapshot.tasks, task.parent);
  const sections = [
    { title: '작업 설명', text: task.description, icon: 'file' as const },
    { title: '실행 계획', text: task.plan, icon: 'roadmap' as const },
    { title: '작업 노트', text: task.notes, icon: 'capture' as const },
    { title: '최종 요약', text: task.finalSummary, icon: 'check' as const },
  ].filter((section) => section.text.trim());

  return (
    <Modal title={task.title} eyebrow={`${snapshot.project.name} / ${task.id}`} onClose={onClose} size="large">
      <div className="task-detail-topline">
        <StatusBadge status={task.status} />
        {task.priority && <span className="priority-badge">{task.priority}</span>}
        {task.labels.map((label) => <span className="label-chip" key={label}>{label}</span>)}
      </div>

      <div className="task-detail-meta">
        <span><Icon name="clock" size={14} /> 수정 {formatDate(task.updatedAt ?? task.createdAt)}</span>
        <span><Icon name={task.source === 'github' ? 'github' : 'file'} size={14} /> {task.source === 'github' ? 'GitHub' : 'Backlog'}</span>
        {milestone && <span><Icon name="roadmap" size={14} /> {milestone.title}</span>}
      </div>

      <div className="task-detail-status">
        <label htmlFor="detail-task-status">작업 상태</label>
        <select
          id="detail-task-status"
          value={normalizeStatus(task.status)}
          disabled={pending}
          onChange={(event) => void onStatusChange(task, event.target.value)}
        >
          {STATUS_COLUMNS.map((column) => <option value={column.id} key={column.id}>{column.label} · {column.english}</option>)}
        </select>
        {pending && <span className="saving-label">저장 중…</span>}
      </div>

      {(parent || task.parent || task.dependencies.length > 0) && (
        <section className="detail-relations">
          {task.parent && (
            <div><span className="detail-label">상위 작업</span>
              {parent ? <button className="relation-link" onClick={() => onOpenTask(parent)}>{parent.title}<Icon name="arrow" size={13} /></button> : <span className="muted">{task.parent} (찾을 수 없음)</span>}
            </div>
          )}
          {task.dependencies.length > 0 && (
            <div><span className="detail-label">선행 작업</span><div className="relation-list">
              {task.dependencies.map((reference) => {
                const dependency = findTask(snapshot.tasks, reference);
                return dependency
                  ? <button className="relation-link" key={reference} onClick={() => onOpenTask(dependency)}><StatusBadge status={dependency.status} />{dependency.title}<Icon name="arrow" size={13} /></button>
                  : <span className="relation-missing" key={reference}>{reference}</span>;
              })}
            </div></div>
          )}
        </section>
      )}

      {sections.length > 0 ? (
        <div className="task-detail-sections">
          {sections.map((section) => (
            <section className="detail-section" key={section.title}>
              <h3><Icon name={section.icon} size={16} />{section.title}</h3>
              <p>{section.text}</p>
            </section>
          ))}
        </div>
      ) : <p className="detail-no-record">작업 맥락이 아직 기록되지 않았습니다.</p>}

      {task.acceptanceCriteria.length > 0 && (
        <section className="acceptance-section">
          <h3>완료 조건 <span>{task.acceptanceCriteria.filter((item) => item.checked).length}/{task.acceptanceCriteria.length}</span></h3>
          <ul className="acceptance-list">
            {task.acceptanceCriteria.map((criterion, index) => (
              <li className={criterion.checked ? 'is-checked' : ''} key={`${criterion.text}-${index}`}>
                <span className="criterion-check">{criterion.checked && <Icon name="check" size={13} />}</span>
                <span>{criterion.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(task.assignee.length > 0 || task.path || task.url) && (
        <div className="task-detail-footer">
          {task.assignee.length > 0 && <span>담당 · {task.assignee.join(', ')}</span>}
          {task.path && <code>{task.path}</code>}
          {task.url && <a href={task.url} target="_blank" rel="noreferrer">원본에서 보기 <Icon name="external" size={14} /></a>}
        </div>
      )}
      <span className="sr-only">작업 식별자 {taskKey(task)}</span>
    </Modal>
  );
}
