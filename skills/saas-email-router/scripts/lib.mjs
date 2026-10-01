// Shared by the router's scripts. Plain Node, no dependencies.
// A campaign's state lives in artifacts/<campaign>/state.md: a readable summary on top and the
// machine copy in the last ```json block. Only these scripts write it.
import fs from 'node:fs'
import path from 'node:path'

// artifacts/ sits in the home folder that holds .claude/skills/saas-email-router/scripts/, so the
// scripts find it from wherever they are run. On the machine .claude/skills/<id> is a link to
// .agents/skills/<id>, and Node sees the real path, so both folder names count. SL8_ARTIFACTS
// overrides it (the self-test uses it).
const HERE = path.dirname(new URL(import.meta.url).pathname)
const HOME = path.resolve(HERE, '..', '..', '..', '..')
export const ARTIFACTS = process.env.SL8_ARTIFACTS ||
  (['.claude', '.agents'].includes(path.basename(path.resolve(HERE, '..', '..', '..'))) ? path.join(HOME, 'artifacts') : path.resolve('artifacts'))

// The Atomic Emails steps (Portman), with Litmus supplements for S6–S9. S9 runs only when results arrive.
export const STEPS = [
  { id: 'S1', name: 'Gather insights', file: '01-insights.md', skill: 'saas-email-research' },
  { id: 'S2', name: 'Gather resources and offers', file: '02-resources.md', skill: 'saas-email-research' },
  { id: 'S3', name: 'Write the idea pool', file: '03-idea-pool.md', skill: 'saas-email-storyboard' },
  { id: 'S4', name: 'Build the storyboard', file: '04-storyboard.md', skill: 'saas-email-storyboard' },
  { id: 'S5', name: 'Write the copy', file: '05-copy.md', skill: 'saas-email-copywriting' },
  { id: 'S6', name: 'Design and build the emails', file: 'pack/build.json', skill: 'saas-email-build' },
  { id: 'S7', name: 'Pre-send QA', file: '07-qa.md', skill: 'saas-email-build' },
  { id: 'S8', name: 'Package and hand off', file: 'pack/send-checklist.md', skill: 'saas-email-build' },
  { id: 'S9', name: 'Measure and iterate', file: null, skill: 'saas-email-results' },
]
export const MAIN = STEPS.filter((d) => d.id !== 'S9').map((d) => d.id)

// Headings each step file must carry (the checkable part of its definition of complete).
export const SECTIONS = {
  S1: ['Goal and conversion event', 'Audience and segments', 'Suppressed', 'Customer and non-fit', 'Steps to success', 'Problems', 'Copy material', 'Sources', 'Open decisions'],
  S2: ['Resources', 'Offers', 'Open decisions'],
  S3: ['Ideas', 'Open decisions'],
  S4: ['Storyboard', 'Exit rule', 'Leftovers', 'Decisions for you', 'Open decisions'],
  S5: ['Open decisions'],
  S7: ['Script checks', 'Your tests before sending', 'Open decisions'],
  S8: ['Before you send', 'Your tests', 'Deliverability', 'The law where you send', 'Sending'],
  S9: ['Results against the goal', 'What to keep', 'What to change', 'Open decisions'],
}
export const COPY_FIELDS = ['Send', 'Segment', 'Subject', 'Preheader', 'Primary CTA', 'Secondary CTA', 'Sign-off', 'P.S.']

export const DELIVERABLE_SECTIONS = ['What was done', 'Decisions', 'Assumptions']
export const STATUSES = ['not started', 'in progress', 'done', 'waiting on you', 'when results arrive']
export const BLOCKS = /\(blocks sending\)/i

export const today = () => (process.env.SL8_TODAY || new Date().toISOString().slice(0, 10))
export const now = () => (process.env.SL8_NOW || new Date().toISOString().slice(0, 19).replace('T', ' '))

export function projectDir (project) {
  if (!project || /[/\\]|^\.|\s/.test(project)) throw new Error(`bad campaign name "${project}": use a short slug such as reengage-demo-leads`)
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

// Table rows under a heading (header and divider dropped).
export function tableRows (body) {
  return (body || '').split('\n').map((l) => l.trim()).filter((l) => /^\|.*\|$/.test(l) && !/^\|[\s:|-]+\|$/.test(l)).slice(1)
}

// "## Email 3 · Title" sections of 05-copy.md.
export function copyEmails (text) {
  const out = []
  const parts = text.split(/^(?=##\s)/m)
  for (const part of parts) {
    const m = /^##\s+Email\s+(\d+)\s*[·:-]\s*(.+?)\s*$/m.exec(part.split('\n')[0])
    if (!m) continue
    const body = part.slice(part.indexOf('\n') + 1)
    const fields = {}
    for (const f of COPY_FIELDS) {
      const r = new RegExp(`^[-*]\\s+${f.replace(/[.]/g, '\\.')}:\\s*(.*)$`, 'mi').exec(body)
      if (r) fields[f] = r[1].trim()
    }
    out.push({ n: +m[1], title: m[2], fields, hasBody: /^###\s+Body\s*$/mi.test(body), body })
  }
  return out
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

- **Goal:** ${s.goal}
- **State:** ${state(s)}
- **Pack version:** ${s.packVersion}
- **Next action:** ${nextAction(s)}

| Step | Status | Evidence |
|---|---|---|
${rows}

## Milestones

${s.milestones.length ? s.milestones.map((m) => `- ${m}`).join('\n') : '- none yet'}

## Open decisions

${decisions}

## History

${s.history.slice(-40).map((h) => `- ${h}`).join('\n')}

\`\`\`json
${JSON.stringify(s, null, 2)}
\`\`\`
`
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'state.md'), md)
}

// Complete when S1–S8 are done and no results review is pending.
export function complete (s) {
  return s.steps.every((st) => st.status === 'done' || (st.id === 'S9' && st.status === 'when results arrive'))
}
export function state (s) { return s.closed ? 'closed' : complete(s) ? 'complete' : 'open' }

export function next (s) {
  if (s.closed) return { kind: 'closed' }
  const waiting = s.steps.find((st) => st.status === 'waiting on you')
  if (waiting) return { kind: 'waiting', step: waiting }
  const pending = s.steps.find((st) => st.status === 'not started' || st.status === 'in progress')
  if (!pending) return { kind: 'complete' }
  const def = STEPS.find((d) => d.id === pending.id)
  const group = s.steps.filter((st) => (st.status === 'not started' || st.status === 'in progress') && STEPS.find((d) => d.id === st.id).skill === def.skill).map((st) => st.id)
  return { kind: 'run', skill: def.skill, steps: group }
}

export function nextAction (s) {
  const n = next(s)
  if (n.kind === 'closed') return 'none: the campaign is closed'
  if (n.kind === 'complete') return 'none pending: send results after you send the campaign, change emails, or close'
  if (n.kind === 'waiting') return `waiting on you at ${n.step.id}: ${n.step.evidence || 'see the decisions'}`
  return `run ${n.skill} for ${n.steps.join(', ')}`
}

export function log (s, text) { s.history.push(`${now()} · ${text}`) }

// Deliverables expected when a step completes.
export function deliverablesFor (s, stepId) {
  return { S4: ['deliverables/M1-campaign-plan.md'], S8: ['deliverables/M2-campaign-pack.md'] }[stepId] || []
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
