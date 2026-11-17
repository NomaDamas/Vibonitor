import { useEffect, useState } from 'react';
import type { ProjectSnapshot } from '../../types';
import type { SessionRoadmapNode } from '../../session-roadmap-types';

function phase(node: SessionRoadmapNode, index: number) {
  return node.phase ?? (index === 0 ? 'current' : 'past');
}

export function FlowTimeline({ snapshot }: { snapshot: ProjectSnapshot }) {
  const nodes = (snapshot.sessionRoadmap ?? []).slice(0, 5);
  const [center, setCenter] = useState(0);
  const [open, setOpen] = useState<string | null>(nodes[0]?.id ?? null);
  useEffect(() => { setCenter(0); setOpen(nodes[0]?.id ?? null); }, [snapshot.project.id, nodes[0]?.id]);
  if (!nodes.length) return <div className="flow-empty">아직 에이전트 작업 흐름이 없습니다.</div>;
  return <section className="flow-timeline flow-dial" aria-label="작업 흐름">
    <div className="flow-nodes" onWheel={(event) => { if (Math.abs(event.deltaY) < 4) return; event.preventDefault(); setCenter((value) => Math.max(0, Math.min(nodes.length - 1, value + (event.deltaY > 0 ? 1 : -1)))); }}>
      {nodes.map((node, index) => <div className={`flow-step flow-${phase(node, index)} ${center === index ? 'is-center' : ''} ${open === node.id ? 'is-open' : ''}`} key={node.id}>
        {index > 0 && <span className="flow-edge" aria-hidden="true" />}
        <button className="flow-node" onClick={() => { setCenter(index); setOpen((current) => current === node.id ? null : node.id); }} aria-expanded={open === node.id}>
          <span className="flow-node-dot" />
          <span className="flow-node-body"><span className="flow-node-meta">{node.tool}{node.branch ? ` · ${node.branch}` : ''}</span><strong>{node.title}</strong><span className="flow-node-summary">{node.summary}</span>{open === node.id && <span className="flow-inline-todos">{node.todos.slice(0, 3).map((todo, todoIndex) => <span key={`${node.id}-${todoIndex}`} className={todo.done ? 'done' : ''}><i>{todo.done ? '✓' : '·'}</i>{todo.text}</span>)}</span>}</span>
        </button>
      </div>)}
    </div>
  </section>;
}
