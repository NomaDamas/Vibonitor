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
  return <section className="flow-timeline" aria-label="작업 흐름">
    <div className="flow-nodes">
      {nodes.map((node, index) => <div className={`flow-step flow-${phase(node, index)} ${open === node.id ? 'is-open' : ''}`} key={node.id}>
        {index > 0 && <span className="flow-edge" aria-hidden="true" />}
        <button className="flow-node" onClick={() => setOpen((current) => current === node.id ? null : node.id)} aria-expanded={open === node.id}>
          <span className="flow-node-dot" />
          <span className="flow-node-body"><span className="flow-node-meta">{node.tool}{node.branch ? ` · ${node.branch}` : ''}</span><strong>{node.title}</strong><span className="flow-node-summary">{node.summary}</span>{open === node.id && <span className="flow-inline-todos">{node.todos.slice(0, 3).map((todo, todoIndex) => <span key={`${node.id}-${todoIndex}`} className={todo.done ? 'done' : ''}><i>{todo.done ? '✓' : '·'}</i>{todo.text}</span>)}</span>}</span>
        </button>
      </div>)}
    </div>
  </section>;
}
