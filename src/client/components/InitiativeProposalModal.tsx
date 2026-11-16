import { useState, type FormEvent } from 'react';
import type { InitiativeProposal } from '../../initiative-types';
import type { ProjectSnapshot } from '../../types';
import { api } from '../api';
import { errorMessage } from '../utils';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function InitiativeProposalModal({ snapshot, onClose, onSaved }: { snapshot?: ProjectSnapshot; onClose: () => void; onSaved: () => Promise<void> }) {
  const [prompt, setPrompt] = useState('');
  const [proposal, setProposal] = useState<InitiativeProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!snapshot || !prompt.trim() || busy) return;
    setBusy(true); setError('');
    try { setProposal(await api.proposeInitiative(snapshot.project.id, prompt.trim())); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!snapshot || !proposal || busy) return;
    setBusy(true); setError('');
    try { await api.approveInitiative(snapshot.project.id, proposal.initiative.id); await onSaved(); onClose(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <Modal title="큰 구현 카드 만들기" eyebrow="PROPOSE INITIATIVE" onClose={onClose} size="medium">
    {!snapshot ? <p className="form-error">먼저 하나의 프로젝트를 선택하세요.</p> : <form className="stack-form" onSubmit={submit}>
      <p className="quick-capture-description">프롬프트를 작은 이슈가 아니라 하나의 PR로 검토할 큰 결과로 정리합니다. 승인하기 전에는 구현하지 않습니다.</p>
      {!proposal ? <>
        <label className="field-label"><span>무엇을 만들까요?</span><textarea className="initiative-prompt" autoFocus value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="예: 프로젝트별 문맥을 보존하고 다음 세션이 바로 이어지게 만든다" rows={6} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>취소</button><button className="button button-primary" disabled={!prompt.trim() || busy}>{busy ? '정리하는 중…' : '계획 제안 만들기'}</button></div>
      </> : <>
        <div className="proposal-preview"><span className="eyebrow">PROPOSED · {proposal.initiative.id}</span><h3>{proposal.initiative.title}</h3><p>{proposal.initiative.outcome}</p><h4>승인할 계획</h4><pre>{proposal.initiative.approvedPlan}</pre><h4>완료 조건</h4><ul>{proposal.initiative.acceptanceCriteria.map((item) => <li key={item.id}>{item.text}</li>)}</ul><h4>내부 이슈 {proposal.initiative.issues.length}개</h4><p className="muted">세부 이슈는 카드 안에서 관리되며 칸반 최상위에는 노출되지 않습니다.</p></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setProposal(null)}>수정해서 다시 제안</button><button type="button" className="button button-primary" disabled={busy} onClick={() => void approve()}><Icon name="check" size={15} />계획 승인</button></div>
      </>}
    </form>}
  </Modal>;
}
