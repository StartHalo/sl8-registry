// Shared by the router's scripts. Plain Node, no dependencies.
// A project's state lives in artifacts/<project>/state.md: a readable summary on top and the
// machine copy in the last ```json block. Only these scripts write it.
import fs from 'node:fs'
import path from 'node:path'

// artifacts/ sits in the home folder that holds .claude/skills/saas-mkt-router/scripts/, so the
// scripts find it from wherever they are run. On the machine .claude/skills/<id> is a link to
// .agents/skills/<id>, and Node sees the real path, so both folder names count. SL8_ARTIFACTS
// overrides it (the self-test uses it).
const HERE = path.dirname(new URL(import.meta.url).pathname)
const HOME = path.resolve(HERE, '..', '..', '..', '..')
export const ARTIFACTS = process.env.SL8_ARTIFACTS ||
  (['.claude', '.agents'].includes(path.basename(path.resolve(HERE, '..', '..', '..'))) ? path.join(HOME, 'artifacts') : path.resolve('artifacts'))

export const STEPS = [
  { id: 'S1', name: 'Situation', file: '01-situation.md', skill: 'saas-mkt-situation' },
  { id: 'S2', name: 'Objectives', file: '02-objectives.md', skill: 'saas-mkt-strategy' },
  { id: 'S3', name: 'Strategy', file: '03-strategy.md', skill: 'saas-mkt-strategy' },
  { id: 'S4', name: 'Tactics', file: '04-tactics.md', skill: 'saas-mkt-plan' },
  { id: 'S5', name: 'Actions', file: '05-actions.md', skill: 'saas-mkt-plan' },
  { id: 'S6', name: 'Control', file: '06-control.md', skill: 'saas-mkt-plan' },
]

// Headings each step file must carry (the checkable part of its definition of complete).
export const SECTIONS = {
  S1: ['Key findings', 'Customers and segments', 'Competitors and alternatives', 'The company', 'External factors', 'Open decisions'],
  S2: ['Revenue lever', 'Objectives', 'Benchmarks used', 'Open decisions'],
  S3: ['Target segments', 'Positioning', 'Sales motion', 'Partnerships and sequence', 'The obstacle', 'Ruled out', 'Critique', 'Messaging sheet', 'Decisions for you', 'Open decisions'],
  S4: ['Channel ranking', 'Channels to test', 'Content plan', 'Review sites and marketplaces', 'Pricing message', 'Open decisions'],
  S5: ['Actions', 'Weekly hours', 'Resources', 'Open decisions'],
  S6: ['Measures', 'Channel test decisions', 'Review date', 'Open decisions'],
}

// The bot's fixed channel list. An action's channel is one of these, or "internal" for enabling
// work (writing, set-up, analysis). Work types such as content or launches are never channels.
export const CHANNELS = [
  'Search and content (SEO)',
  'Review sites and directories',
  'Integration partners and marketplaces',
  'Communities',
  'Founder-led outbound',
  'Email to existing leads and customers',
  'Paid search',
  'Paid social',
  'Events and webinars',
  'Referrals and customer proof',
  'PR and podcasts',
  'Free tools and product-led',
]

export const DELIVERABLE_SECTIONS = ['What was done', 'Findings', 'Decisions', 'Assumptions']
export const PLAN_SECTIONS = ['One-page summary', 'Assumptions']
export const EARLIER = 'earlier-strategy'
export const STATUSES = ['not started', 'in progress', 'done', 'waiting on you']
export const DEFAULT_HOURS = 5

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

// Every `## ` section of a file, by heading, for comparing versions.
export function sections (text) {
  const out = {}
  const parts = text.split(/^(?=##\s)/m)
  for (const p of parts) {
    const m = /^##\s+(.+?)\s*$/m.exec(p)
    if (m && p.startsWith('##')) out[m[1].trim()] = p.slice(m[0].length).trim()
  }
  return out
}

export function bullets (body) {
  return (body || '').split('\n').map((l) => l.trim()).filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''))
}

// Rows of the first Markdown table in a section: [{header: cell}].
export function tableRows (body) {
  const lines = (body || '').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'))
  if (lines.length < 2) return []
  const cells = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
  const head = cells(lines[0]).map((h) => h.toLowerCase())
  return lines.slice(2).filter((l) => !/^\|\s*:?-{2,}/.test(l)).map((l) => Object.fromEntries(cells(l).map((c, i) => [head[i] || `c${i}`, c])))
}

export const firstNumber = (s) => { const m = /(\d+(?:\.\d+)?)/.exec(String(s || '').replace(/,/g, '')); return m ? Number(m[1]) : null }

export function hasInput (dir, name) {
  const d = path.join(dir, 'inputs')
  return fs.existsSync(d) && fs.readdirSync(d).some((f) => f.startsWith(`${name}-`))
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
- **Budget for the horizon:** ${s.budget ?? 'not given'} · **Founder hours a week:** ${s.hours ?? 'from the company profile'}
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
  if (n.kind === 'complete') return s.kind === 'launch' ? 'none pending: close the launch when it is over' : 'none pending: send an update with results, or close'
  if (n.kind === 'waiting') return `waiting on you at ${n.step.id}: ${n.step.evidence || 'see open decisions'}`
  return `run ${n.skill} for ${n.steps.join(', ')}`
}

export function log (s, text) { s.history.push(`${now()} · ${text}`) }

// Deliverables expected when a step completes, by project kind.
export function deliverablesFor (s, stepId) {
  if (s.kind === 'launch') return stepId === 'S6' ? [`deliverables/M4-${s.project}.md`, 'launch-plan.md'] : []
  return { S1: ['deliverables/M1-situation.md'], S3: ['deliverables/M2-strategy.md'], S6: ['deliverables/M3-plan.md', 'marketing-plan.md'] }[stepId] || []
}

// A decision line that blocks progress starts with "Blocking:".
export const BLOCK_PREFIX = /^\**(blocking\b[^:—]{0,30}|confirm first)\**\s*[:—-]\s*/i
export const isBlocking = (d) => { const t = d.replace(/^S\d · /, ''); return BLOCK_PREFIX.test(t) || /\bblocks?\b/i.test(t) }

export function fail (msg) { console.error(msg); process.exit(1) }

export function args (argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; out[k] = v } else out._.push(a)
  }
  return out
}
