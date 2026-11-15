import { useState, type FormEvent } from 'react';
import type { Project } from '../../types';
import { errorMessage } from '../utils';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface ProjectModalProps {
  initialMode: 'add' | 'scan';
  onClose: () => void;
  onAdd: (input: { kind: 'local' | 'github'; value: string; name?: string }) => Promise<void>;
  onScan: (path: string) => Promise<Project[]>;
}

export function ProjectModal({ initialMode, onClose, onAdd, onScan }: ProjectModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [kind, setKind] = useState<'local' | 'github'>('local');
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<Project[]>([]);

  const changeMode = (next: 'add' | 'scan') => {
    setMode(next);
    setValue('');
    setError('');
    setAdded([]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'add') {
        await onAdd({ kind, value: value.trim(), name: name.trim() || undefined });
        onClose();
      } else {
        const projects = await onScan(value.trim());
        setAdded(projects);
        if (projects.length) setValue('');
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="작업 공간 연결" eyebrow="PROJECT SOURCE" onClose={onClose} size="small">
      <div className="segmented-control" aria-label="프로젝트 연결 방식">
        <button type="button" className={mode === 'add' ? 'active' : ''} onClick={() => changeMode('add')}><Icon name="plus" size={15} />프로젝트 추가</button>
        <button type="button" className={mode === 'scan' ? 'active' : ''} onClick={() => changeMode('scan')}><Icon name="search" size={15} />폴더 스캔</button>
      </div>

      <form className="stack-form" onSubmit={submit}>
        {mode === 'add' ? (
          <>
            <div className="source-options">
              <label className={kind === 'local' ? 'selected' : ''}>
                <input type="radio" name="project-kind" value="local" checked={kind === 'local'} onChange={() => { setKind('local'); setValue(''); }} />
                <Icon name="folder" /><span><strong>로컬 폴더</strong><small>이 기기의 Git 저장소</small></span>
              </label>
              <label className={kind === 'github' ? 'selected' : ''}>
                <input type="radio" name="project-kind" value="github" checked={kind === 'github'} onChange={() => { setKind('github'); setValue(''); }} />
                <Icon name="github" /><span><strong>GitHub</strong><small>원격 저장소와 이슈</small></span>
              </label>
            </div>
            <label className="field-label">
              <span>{kind === 'local' ? '프로젝트 경로' : '저장소'}</span>
              <input
                autoFocus
                required
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={kind === 'local' ? '/Users/me/projects/my-app' : 'owner/repository'}
                spellCheck={false}
              />
              <small>{kind === 'local' ? '백로그와 Git 기록이 있는 절대 경로를 입력하세요.' : 'owner/repository 형식 또는 GitHub 주소를 입력하세요.'}</small>
            </label>
            <label className="field-label">
              <span>표시 이름 <em>선택</em></span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="사이드바에 보일 이름" />
            </label>
          </>
        ) : (
          <>
            <div className="scan-explainer"><Icon name="search" /><p>상위 폴더를 스캔해 Vibonitor가 읽을 수 있는 프로젝트를 찾습니다. 이미 추가된 프로젝트는 다시 추가하지 않습니다.</p></div>
            <label className="field-label">
              <span>스캔할 상위 폴더</span>
              <input autoFocus required value={value} onChange={(event) => setValue(event.target.value)} placeholder="/Users/me/projects" spellCheck={false} />
              <small>로컬 프로젝트가 모여 있는 절대 경로를 입력하세요.</small>
            </label>
          </>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        {mode === 'scan' && added.length > 0 && (
          <div className="scan-result" role="status">
            <strong><Icon name="check" size={15} />{added.length}개 프로젝트를 연결했습니다</strong>
            <ul>{added.map((project) => <li key={project.id}><Icon name="folder" size={13} />{project.name}</li>)}</ul>
          </div>
        )}
        {mode === 'scan' && added.length === 0 && !busy && !error && value === '' && (
          <p className="form-hint">스캔 결과는 이곳에 표시됩니다.</p>
        )}
        <div className="modal-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>{added.length ? '완료' : '취소'}</button>
          <button type="submit" className="button button-primary" disabled={!value.trim() || busy}>
            {busy ? <span className="spinner spinner-dark" /> : <Icon name={mode === 'add' ? 'plus' : 'search'} size={16} />}
            {busy ? '연결하는 중…' : mode === 'add' ? '프로젝트 추가' : '폴더 스캔'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
