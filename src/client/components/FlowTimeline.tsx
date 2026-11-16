import { useState } from 'react';
import type { ProjectSnapshot } from '../../types';
import type { SessionRoadmapNode } from '../../session-roadmap-types';

function phase(node: SessionRoadmapNode, index: number) {
  return node.phase ?? (index === 0 ? 'current' : 'past');
}

export function FlowTimeline({ snapshot }: { snapshot: ProjectSnapshot }) {
  const nodes = (snapshot.sessionRoadmap ?? []).slice(0, 5);
  const [open, setOpen] = useState<string | null>(nodes[0]?.id ?? null);
  if (!nodes.length) return <div className="flow-empty">아직 에이전트 작업 흐름이 없습니다.</div>;
  return <section className="flow-timeline" aria-label="과거 현재 미래 작업 흐름">
    <div className="flow-axis-labels"><span>과거</span><span>현재</span><span>다음</span></div>
    <div className="flow-nodes">
      {nodes.map((node, index) => <div className={`flow-step flow-${phase(node, index)}`} key={node.id}>
        {index > 0 && <span className="flow-edge" aria-hidden="true" />}
        <button className={`flow-node ${open === node.id ? 'is-open' : ''}`} onClick={() => setOpen((current) => current === node.id ? null : node.id)} aria-expanded={open === node.id}>
          <span className="flow-node-dot" />
          <span className="flow-node-body"><span className="flow-node-meta">{node.tool}{node.branch ? ` · ${node.branch}` : ''}</span><strong>{node.title}</strong><span className="flow-node-summary">{node.summary}</span></span>
        </button>
        {open === node.id && <div className="flow-todo-card"><span className="flow-todo-label">이 세션에서 한 일</span>{node.todos.length ? <ul>{node.todos.map((todo, todoIndex) => <li key={`${node.id}-${todoIndex}`} className={todo.done ? 'done' : ''}><span>{todo.done ? '✓' : '·'}</span>{todo.text}</li>)}</ul> : <p>요약된 TODO가 없습니다.</p>}</div>}
      </div>)}
    </div>
  </section>;
}
