// Shared by the router's scripts. Plain Node, no dependencies.
// A project's state lives in artifacts/<project>/state.md: a readable summary on top and the
// machine copy in the last ```json block. Only these scripts write it.
import fs from 'node:fs'
import path from 'node:path'

// artifacts/ sits in the home folder that holds .claude/skills/app-marketing-router/scripts/, so the
// scripts find it from wherever they are run. On the machine .claude/skills/<id> is a link to
// .agents/skills/<id>, and Node sees the real path, so both folder names count. SL8_ARTIFACTS overrides it (the self-test uses it).
const HERE = path.dirname(new URL(import.meta.url).pathname)
const HOME = path.resolve(HERE, '..', '..', '..', '..')
export const ARTIFACTS = process.env.SL8_ARTIFACTS ||
  (['.claude', '.agents'].includes(path.basename(path.resolve(HERE, '..', '..', '..'))) ? path.join(HOME, 'artifacts') : path.resolve('artifacts'))

export const STEPS = [
  { id: 'S1', name: 'Situation', file: '01-situation.md', skill: 'analysing-app-situation' },
  { id: 'S2', name: 'Objectives', file: '02-objectives.md', skill: 'setting-app-marketing-strategy' },
  { id: 'S3', name: 'Strategy', file: '03-strategy.md', skill: 'setting-app-marketing-strategy' },
  { id: 'S4', name: 'Tactics', file: '04-tactics.md', skill: 'planning-app-marketing-actions' },
  { id: 'S5', name: 'Actions', file: '05-actions.md', skill: 'planning-app-marketing-actions' },
  { id: 'S6', name: 'Control', file: '06-control.md', skill: 'planning-app-marketing-actions' },
]

// Headings each step file must carry (the checkable part of its definition of complete).
export const SECTIONS = {
  S1: ['Key findings', 'Customers and segments', 'Competitors', 'Growth levers', 'External factors and health policy', 'Open decisions'],
  S2: ['Objectives', 'North-star metric', 'Open decisions'],
  S3: ['Targets', 'Positioning', '3Cs check', 'The obstacle', 'Ruled out', 'Critique', 'Decisions for you', 'Open decisions'],
  S4: ['Channels by journey stage', 'Channels to test', 'Store search (ASO)', 'Brand and performance split', 'Health-policy check', 'Open decisions'],
  S5: ['Actions', 'Resources', 'Open decisions'],
  S6: ['Measures', 'Review date', 'Open decisions'],
}

export const DELIVERABLE_SECTIONS = ['What was done', 'Findings', 'Decisions', 'Assumptions']
export const STATUSES = ['not started', 'in progress', 'done', 'waiting on you']

export const today = () => (process.env.SL8_TODAY || new Date().toISOString().slice(0, 10))
export const now = () => (process.env.SL8_NOW || new Date().toISOString().slice(0, 19).replace('T', ' '))

export function projectDir (project) {
  if (!project || /[/\\]|^\.|\s/.test(project)) throw new Error(`bad project name "${project}": use a short slug such as q4-2026-plan`)
  return path.join(ARTIFACTS, project)
}

export function headings (text) {
  return new Set([...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim().toLowerCase()))
}

export function sectionBody (text, name) {
  const re = new RegExp(`^##\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'mi')
  return re.exec(text)?.[1].trim() ?? null
}

export function bullets (body) {
  return (body || '').split('\n').map((l) => l.trim()).filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''))
}

export function readState (dir) {
  const file = path.join(dir, 'state.md')
  if (!fs.existsSync(file)) return null
  const m = /```json\n([\s\S]*?)\n```\s*$/.exec(fs.readFileSync(file, 'utf8'))
  if (!m) throw new Error(`${file} has no machine block; it was edited by hand. Say "redo from S1" or restore it`)
  return JSON.parse(m[1])
}

export function writeState (dir, s) {
  const rows = s.steps.map((st) => `| ${st.id} ${st.name} | ${st.status} | ${st.evidence || '—'} |`).join('\n')
  const decisions = s.decisions.length ? s.decisions.map((d) => `- ${d}`).join('\n') : '- none'
  const md = `# Progress: ${s.project}

This file is written by the router's scripts. Don't edit it by hand.

- **Kind:** ${s.kind}${s.parent ? ` (inside ${s.parent})` : ''}
- **Goal:** ${s.goal}
- **Trigger:** ${s.trigger}
- **State:** ${s.closed ? 'closed' : complete(s) ? 'complete' : 'open'}
- **Plan version:** ${s.planVersion}
- **Next action:** ${nextAction(s)}

| Step | Status | Evidence |
|---|---|---|
${rows}

## Milestones

${s.milestones.length ? s.milestones.map((m) => `- ${m}`).join('\n') : '- none yet'}

## Open decisions

${decisions}

## History

${s.history.slice(-30).map((h) => `- ${h}`).join('\n')}

\`\`\`json
${JSON.stringify(s, null, 2)}
\`\`\`
`
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'state.md'), md)
}

export function complete (s) { return s.steps.every((st) => st.status === 'done') }

export function next (s) {
  if (s.closed) return { kind: 'closed' }
  const waiting = s.steps.find((st) => st.status === 'waiting on you')
  if (waiting) return { kind: 'waiting', step: waiting }
  const pending = s.steps.find((st) => st.status !== 'done')
  if (!pending) return { kind: 'complete' }
  const def = STEPS.find((d) => d.id === pending.id)
  const group = s.steps.filter((st) => st.status !== 'done' && STEPS.find((d) => d.id === st.id).skill === def.skill).map((st) => st.id)
  return { kind: 'run', skill: def.skill, steps: group }
}

export function nextAction (s) {
  const n = next(s)
  if (n.kind === 'closed') return 'none: the project is closed'
  if (n.kind === 'complete') return 'none pending: send an update with results, or close'
  if (n.kind === 'waiting') return `waiting on you at ${n.step.id}: ${n.step.evidence || 'see open decisions'}`
  return `run ${n.skill} for ${n.steps.join(', ')}`
}

export function log (s, text) { s.history.push(`${now()} · ${text}`) }

// Deliverables expected when a step completes, by project kind.
export function deliverablesFor (s, stepId) {
  if (s.kind === 'campaign') return stepId === 'S6' ? [`deliverables/M4-campaign-${s.project}.md`, 'campaign-plan.md'] : []
  return { S1: ['deliverables/M1-situation.md'], S3: ['deliverables/M2-strategy.md'], S6: ['deliverables/M3-plan.md', 'marketing-plan.md'] }[stepId] || []
}

export function fail (msg) { console.error(msg); process.exit(1) }

export function args (argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; out[k] = v } else out._.push(a)
  }
  return out
}
