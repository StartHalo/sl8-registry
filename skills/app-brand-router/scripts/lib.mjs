// Shared by the router's scripts. Plain Node, no dependencies.
// A brand project's state lives in artifacts/<project>/state.md: a readable summary on top and the
// machine copy in the last ```json block. Only these scripts write it.
import fs from 'node:fs'
import path from 'node:path'

// artifacts/ sits in the home folder that holds .claude/skills/app-brand-router/scripts/, so the
// scripts find it from wherever they are run. On the machine .claude/skills/<id> is a link to
// .agents/skills/<id>, and Node sees the real path, so both folder names count. SL8_ARTIFACTS
// overrides it (the self-test uses it).
const HERE = path.dirname(new URL(import.meta.url).pathname)
const HOME = path.resolve(HERE, '..', '..', '..', '..')
export const ARTIFACTS = process.env.SL8_ARTIFACTS ||
  (['.claude', '.agents'].includes(path.basename(path.resolve(HERE, '..', '..', '..'))) ? path.join(HOME, 'artifacts') : path.resolve('artifacts'))

// Wheeler's five phases, as named in the bot's requirements.
export const STEPS = [
  { id: 'S1', name: 'Conduct research', file: '01-research.md', skill: 'app-brand-research' },
  { id: 'S2', name: 'Clarify strategy', file: '02-brand-brief.md', skill: 'app-brand-strategy' },
  { id: 'S3', name: 'Design identity', file: '03-identity.md', skill: 'app-brand-identity' },
  { id: 'S4', name: 'Create touchpoints', file: '04-touchpoints.md', skill: 'app-brand-touchpoints' },
  { id: 'S5', name: 'Manage assets', file: '05-guidelines.md', skill: 'app-brand-guidelines' },
]

// The fixed touchpoint list (a touchpoint is a place the person meets the brand, never a kind of work)
// and the "##" heading each one gets in 04-touchpoints.md.
export const TOUCHPOINTS = {
  'store listing': 'Store listing',
  onboarding: 'Onboarding',
  social: 'Social',
  email: 'Email',
  website: 'Website',
  push: 'Push notifications',
}
export const DEFAULT_TOUCHPOINTS = ['store listing', 'onboarding', 'social', 'email']

// Headings each step file must carry (the checkable part of its definition of complete).
export const SECTIONS = {
  S1: ['Key findings', 'The problem', 'Touchpoint audit', 'Competitors', 'Review themes', 'Category clichés', 'Verbal audit', 'Open decisions'],
  S2: ['Focus', 'Audience', 'Positioning', 'Onliness statement', 'Onliness check', 'Brand vision', 'Promise', 'We will not', 'Health-claims limits', 'Decisions for you', 'Open decisions'],
  S3: ['Personality', 'Voice', 'Tone by context', 'Messages', 'Look and feel', 'Palette', 'Type', 'Imagery and icons', 'Distinctive assets', 'Trial applications', 'Open decisions'],
  S4: ['Health-claims check', 'Open decisions'], // plus one heading per chosen touchpoint
  S5: ['Owner and home', 'Do and don\'t', 'Templates', 'Consistency checklist', 'Review cadence and triggers', 'Open decisions'],
}
export const PIECE_SECTIONS = ['Copy', 'Layout notes', 'Voice and messages used', 'Health-claims check', 'Open decisions']
export const REVIEW_SECTIONS = ['Summary', 'Findings', 'Swap, hand and focus tests', 'Fix first', 'Open decisions']
export const DELIVERABLE_SECTIONS = ['What was done', 'Findings', 'Decisions', 'Assumptions']
export const STATUSES = ['not started', 'in progress', 'done', 'waiting on you']
// A decision bullet that starts with this tag stops the work until the person answers (№91).
export const BLOCKING = /^\[blocking\]\s*/i

export const today = () => (process.env.SL8_TODAY || new Date().toISOString().slice(0, 10))
export const now = () => (process.env.SL8_NOW || new Date().toISOString().slice(0, 19).replace('T', ' '))

export function projectDir (project) {
  if (!project || /[/\\]|^\.|\s/.test(project)) throw new Error(`bad project name "${project}": use a short slug such as brand-2027`)
  return path.join(ARTIFACTS, project)
}

export function headings (text) {
  return new Set([...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim().toLowerCase()))
}

// Every "## " section of a file, as {heading (lower case): body}.
export function sections (text) {
  const out = {}
  const parts = text.split(/^##\s+/m).slice(1)
  for (const p of parts) { const nl = p.indexOf('\n'); out[(nl < 0 ? p : p.slice(0, nl)).trim().toLowerCase()] = (nl < 0 ? '' : p.slice(nl + 1)).trim() }
  return out
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

// Decisions grouped by step, repeats dropped, blocking ones first (№92).
export function groupedDecisions (s) {
  const seen = new Set()
  const rows = []
  for (const d of s.decisions) {
    const m = /^(S\d|R|P) · (.*)$/.exec(d) || [null, '', d]
    const text = m[2].replace(BLOCKING, '')
    const key = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({ step: m[1], text, blocking: BLOCKING.test(m[2]) })
  }
  return rows.sort((a, b) => (b.blocking - a.blocking))
}
export const blockingDecisions = (s) => groupedDecisions(s).filter((d) => d.blocking)

export function writeState (dir, s) {
  const rows = s.steps.map((st) => `| ${st.id} ${st.name} | ${st.status} | ${st.evidence || '—'} |`).join('\n')
  const dec = groupedDecisions(s)
  const md = `# Progress: ${s.project}

This file is written by the router's scripts. Don't edit it by hand.

- **Goal:** ${s.goal}
- **Trigger:** ${s.trigger}
- **Touchpoints:** ${s.touchpoints.join(', ')}
- **State:** ${s.closed ? 'closed' : complete(s) ? 'complete' : 'open'}
- **Brand book version:** ${s.bookVersion}
- **Next action:** ${nextAction(s)}

| Step | Status | Evidence |
|---|---|---|
${rows}

## Milestones

${s.milestones.length ? s.milestones.map((m) => `- ${m}`).join('\n') : '- none yet'}

## Open decisions

${dec.length ? dec.map((d) => `- ${d.blocking ? '**Blocking** · ' : ''}${d.step ? `${d.step} · ` : ''}${d.text}`).join('\n') : '- none'}

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
  return { kind: 'run', skill: def.skill, steps: [pending.id] }
}

export function nextAction (s) {
  const n = next(s)
  if (n.kind === 'closed') return 'none: the project is closed'
  if (n.kind === 'waiting') return `waiting on you at ${n.step.id}: ${n.step.evidence || 'see open decisions'}`
  if (n.kind === 'complete') {
    const b = blockingDecisions(s)
    return b.length ? `answer ${b.length} blocking decision(s), then continue` : 'none pending: apply the brand to a touchpoint, review material against it, refresh it, or close'
  }
  return `run ${n.skill} for ${n.steps.join(', ')}`
}

export function log (s, text) { s.history.push(`${now()} · ${text}`) }

// Deliverables expected when a step completes.
export function deliverablesFor (stepId) {
  return { S1: ['deliverables/M1-findings.md'], S2: ['deliverables/M2-brand-brief.md'], S5: ['deliverables/M3-brand-book.md', 'brand-book.md'] }[stepId] || []
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
