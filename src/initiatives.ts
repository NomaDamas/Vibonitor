import { randomUUID } from 'node:crypto';
import { readProjectContext, writeInitiative, appendInitiativeEvent } from './project-context.js';
import type { Initiative, InitiativeProposal } from './initiative-types.js';
import type { Project } from './types.js';

function baseInitiative(project: Project, prompt: string): Initiative {
  const now = new Date().toISOString();
  return {
    id: `INIT-${randomUUID().slice(0, 8).toUpperCase()}`,
    projectId: project.id,
    title: prompt.trim().slice(0, 80),
    outcome: '', sourcePrompt: prompt.trim(), status: 'captured', approvedPlan: '',
    nonGoals: [], acceptanceCriteria: [], nextAction: '', lastContext: '', issues: [], events: [],
    createdAt: now, updatedAt: now,
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('LLM이 구조화된 Initiative 제안을 반환하지 않았습니다.');
  return JSON.parse(raw.slice(start, end + 1)) as Partial<Initiative>;
}

export async function proposeInitiative(project: Project, prompt: string): Promise<InitiativeProposal> {
  if (!prompt.trim()) throw new Error('Initiative를 만들 프롬프트가 필요합니다.');
  const context = await readProjectContext(project);
  const initiative = baseInitiative(project, prompt);
  await writeInitiative(project, initiative);
  await appendInitiativeEvent(project, initiative.id, { type: 'prompt.submitted', source: 'user', payload: { promptLength: prompt.length } });
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.VIBONITOR_PLANNER_MODEL ?? 'gpt-5.2';
  if (!apiKey) {
    throw new Error('LLM 계획기를 사용할 수 없습니다. OPENAI_API_KEY를 설정한 뒤 다시 시도하세요. 원문 프롬프트는 이미 Initiative 초안에 저장되었습니다.');
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, temperature: 0.2, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a product planning assistant. Return only JSON with title, outcome, nonGoals (string[]), approvedPlan (string), acceptanceCriteria ({id,text,checked:false}[]), nextAction, and issues ({id,title,description,status,acceptanceCriteriaIds,dependencies,parentId?}[]). Make one reviewable PR-sized Initiative, not micro cards. Preserve the project direction and do not invent completed work.' },
        { role: 'user', content: JSON.stringify({ prompt, project: context.files['project.md'], direction: context.files['direction.md'], roadmap: context.files['roadmap.md'], activeInitiatives: context.initiatives }) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`LLM 계획기 오류 (${response.status}).`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = extractJson(payload.choices?.[0]?.message?.content ?? '');
  const result: Initiative = {
    ...initiative, ...parsed, id: initiative.id, projectId: project.id, sourcePrompt: prompt.trim(),
    status: 'proposed', createdAt: initiative.createdAt, updatedAt: new Date().toISOString(),
    acceptanceCriteria: (parsed.acceptanceCriteria ?? []).map((item, index) => ({ id: item.id || `AC-${index + 1}`, text: item.text, checked: false })),
    issues: (parsed.issues ?? []).map((item, index) => ({ ...item, id: item.id || `${initiative.id}.${index + 1}`, initiativeId: initiative.id, status: item.status ?? 'todo', acceptanceCriteriaIds: item.acceptanceCriteriaIds ?? [], dependencies: item.dependencies ?? [] })),
    events: [],
  };
  await writeInitiative(project, result);
  await appendInitiativeEvent(project, result.id, { type: 'plan.proposed', source: 'vibonitor-planner', payload: { provider: 'openai', model } });
  return { initiative: result, interpretation: { provider: 'openai', model, createdAt: result.updatedAt } };
}

export async function approveInitiative(project: Project, id: string, approvedBy = 'user') {
  const context = await readProjectContext(project);
  const initiative = context.initiatives.find((item) => item.id === id);
  if (!initiative) throw new Error(`Initiative ${id} not found.`);
  if (initiative.status !== 'proposed' && initiative.status !== 'captured') throw new Error('제안 상태의 Initiative만 승인할 수 있습니다.');
  initiative.status = 'approved';
  initiative.approval = { approvedAt: new Date().toISOString(), approvedBy };
  initiative.updatedAt = initiative.approval.approvedAt;
  await writeInitiative(project, initiative);
  await appendInitiativeEvent(project, id, { type: 'plan.approved', source: 'user', payload: { approvedBy } });
  return initiative;
}
