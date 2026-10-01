// Shared by the router's scripts. Plain Node, no dependencies.
// A project's state lives in artifacts/<project>/state.md: a readable summary on top and the
// machine copy in the last ```json block. Only these scripts write it.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// artifacts/ sits in the home folder that holds .claude/skills/saas-cro-router/scripts/, so the
// scripts find it from wherever they are run. On the machine .claude/skills/<id> is a link to
// .agents/skills/<id>, and Node sees the real path, so both folder names count. SL8_ARTIFACTS
// overrides it (the self-test uses it).
const HERE = path.dirname(new URL(import.meta.url).pathname)
const HOME = path.resolve(HERE, '..', '..', '..', '..')
export const ARTIFACTS = process.env.SL8_ARTIFACTS ||
  (['.claude', '.agents'].includes(path.basename(path.resolve(HERE, '..', '..', '..'))) ? path.join(HOME, 'artifacts') : path.resolve('artifacts'))

// ResearchXL steps (research/job.md). S5–S8 share one file, one section each.
export const STEPS = [
  { id: 'S1', name: 'Frame goals and the funnel', file: '01-goals-funnel.md', skill: 'saas-cro-framing-funnel' },
  { id: 'S2', name: 'Technical analysis', file: '02-technical.md', skill: 'saas-cro-reviewing-pages' },
  { id: 'S3', name: 'Heuristic analysis', file: '03-heuristic.md', skill: 'saas-cro-reviewing-pages' },
  { id: 'S4', name: 'Analytics health check and leak analysis', file: '04-analytics.md', skill: 'saas-cro-reading-evidence' },
  { id: 'S5', name: 'Mouse tracking and session replays', file: '05-research.md', skill: 'saas-cro-reading-evidence' },
  { id: 'S6', name: 'Qualitative surveys and interviews', file: '05-research.md', skill: 'saas-cro-reading-evidence' },
  { id: 'S7', name: 'User testing', file: '05-research.md', skill: 'saas-cro-reading-evidence' },
  { id: 'S8', name: 'Copy testing', file: '05-research.md', skill: 'saas-cro-reading-evidence' },
  { id: 'S9', name: 'Master action sheet', file: '09-action-sheet.md', skill: 'saas-cro-ranking-changes' },
  { id: 'S10', name: 'Write hypotheses and order the tests', file: '10-hypotheses.md', skill: 'saas-cro-ranking-changes' },
  { id: 'S11', name: 'Validate and learn', file: 'results', skill: 'saas-cro-reading-results' },
]

// Headings each step file must carry (the checkable part of its definition of complete).
export const SECTIONS = {
  S1: ['Paths and conversions', 'Key pages', 'KPIs and baselines', 'Competitors', 'Assumptions', 'Open decisions'],
  S2: ['Checked', 'Issues', 'Not checked', 'Open decisions'],
  S3: ['Inventory', 'Findings', 'Considered but rejected', 'Not verified', 'Open decisions'],
  S4: ['Data received', 'Health check', 'Leaks', 'Instrument items', 'Open decisions'],
  S5: ['S5 Mouse tracking and session replays', 'Open decisions'],
  S6: ['S6 Qualitative surveys and interviews', 'Open decisions'],
  S7: ['S7 User testing', 'Open decisions'],
  S8: ['S8 Copy testing', 'Open decisions'],
  S9: ['Change first', 'Action sheet', 'Open decisions'],
  S10: ['Hypotheses', 'Measurement plan', 'Open decisions'],
  S11: ['Results', 'Verdicts', 'Caveats', 'Open decisions'],
}

export const LIMITS = { keyPages: 6, competitors: 3, technicalIssues: 10, findings: 25, kitItems: 4, rows: 40, changeFirst: 10, hypotheses: 8 }

export const BUCKETS = ['Just Do It', 'Test', 'Instrument', 'Hypothesize', 'Investigate']
export const CSV_COLUMNS = ['id', 'issue', 'bucket', 'location', 'evidence', 'action', 'stars', 'effort', 'owner', 'how_we_know', 'status']
export const ROW_STATUSES = ['proposed', 'approved', 'shipped', 'kept', 'reverted', 'unclear', 'dropped']

// Milestone deliverables (the fixed list; never inferred from content: №96).
export const DELIVERABLES = {
  'research-kit.md': { label: 'Research kit', sections: ['What to run', 'What to send back', 'Assumptions'] },
  'M1-conversion-review.md': { label: 'M1 Conversion review', sections: ['What was done', 'Change first', 'Findings', 'What this review could not see', 'Decisions', 'Assumptions'] },
  'M2-test-plan.md': { label: 'M2 Test and measurement plan', sections: ['What was done', 'How each change will be judged', 'Decisions', 'Assumptions'] },
  M3: { label: 'M3 Results review', sections: ['What was done', 'Verdicts', 'Decisions', 'Assumptions'] },
  'closing-summary.md': { label: 'Closing summary', sections: ['What was recommended', 'What was shipped', 'Results supplied', 'Still open'] },
}
export const TEST_SECTIONS = ['The change', 'Hypothesis', 'The arithmetic', 'Route', 'Measures', 'Decision rule', 'What to send back']

export const STATUSES = ['not started', 'in progress', 'done', 'waiting on you', 'not in scope']

export const today = () => (process.env.SL8_TODAY || new Date().toISOString().slice(0, 10))
export const now = () => (process.env.SL8_NOW || new Date().toISOString().slice(0, 19).replace('T', ' '))

export function projectDir (project) {
  if (!project || /[/\\]|^\.|\s/.test(project)) throw new Error(`bad project name "${project}": use a short slug such as conversion-2026-10`)
  return path.join(ARTIFACTS, project)
}

export function headings (text) {
  return new Set([...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim().toLowerCase()))
}

export function sectionBody (text, name) {
  const re = new RegExp(`^##\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'mi')
  return re.exec(text)?.[1].trim() ?? null
}

// Every "## " section of a file and a short hash of its body, to name what changed (№93).
export function sectionHashes (text) {
  const out = {}
  const parts = text.split(/^(?=##\s)/m)
  for (const p of parts) {
    const m = /^##\s+(.+?)\s*$/m.exec(p)
    if (m) out[m[1].trim()] = crypto.createHash('sha256').update(p.trim()).digest('hex').slice(0, 12)
  }
  return out
}

export function bullets (body) {
  return (body || '').split('\n').map((l) => l.trim()).filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''))
}

export function numbered (body) {
  return (body || '').split('\n').map((l) => l.trim()).filter((l) => /^\d+[.)]\s+/.test(l)).map((l) => l.replace(/^\d+[.)]\s+/, ''))
}

// "### " blocks inside a section: [{title, body}].
export function blocks (body) {
  return (body || '').split(/^(?=###\s)/m).filter((b) => /^###\s/.test(b)).map((b) => ({ title: /^###\s+(.+)$/m.exec(b)[1].trim(), body: b }))
}

// Minimal RFC 4180 CSV parser (quotes, doubled quotes, commas and newlines inside quotes).
export function parseCsv (text) {
  const rows = []; let row = []; let cell = ''; let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''; if (row.some((x) => x !== '')) rows.push(row); row = []
    } else cell += c
  }
  row.push(cell); if (row.some((x) => x !== '')) rows.push(row)
  return rows
}

export function readSheet (dir) {
  const f = path.join(dir, 'action-sheet.csv')
  if (!fs.existsSync(f)) return null
  const [head, ...rows] = parseCsv(fs.readFileSync(f, 'utf8'))
  return { head: (head || []).map((h) => h.trim().toLowerCase()), rows: rows.map((r) => Object.fromEntries((head || []).map((h, i) => [h.trim().toLowerCase(), (r[i] ?? '').trim()]))) }
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

- **Kind:** ${s.kind === 'test' ? 'test design' : 'conversion review'}
- **Goal:** ${s.goal}
- **State:** ${s.closed ? 'closed' : complete(s) ? 'complete' : 'open'}
- **Action sheet version:** ${s.sheetVersion}${s.resultsVersion ? ` · **Results reviews:** ${s.resultsVersion}` : ''}
- **Next action:** ${nextAction(s)}

| Step | Status | Evidence |
|---|---|---|
${rows}

## Milestones

${s.milestones.length ? s.milestones.map((m) => `- ${m}`).join('\n') : '- none yet'}

## Test designs

${s.tests.length ? s.tests.map((t) => `- tests/${t}.md`).join('\n') : '- none'}

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

const inScope = (st) => st.status !== 'not in scope'
export function complete (s) { return s.steps.filter(inScope).every((st) => st.status === 'done') }

export function next (s) {
  if (s.closed) return { kind: 'closed' }
  if (s.kind === 'test') return { kind: 'complete' }
  const waiting = s.steps.find((st) => st.status === 'waiting on you')
  if (waiting) return { kind: 'waiting', step: waiting }
  // Results are read before the sheet is re-ranked, though S11 comes last in the method.
  const s11 = s.steps.find((st) => st.id === 'S11')
  const pending = s11 && inScope(s11) && s11.status !== 'done' ? s11 : s.steps.find((st) => inScope(st) && st.status !== 'done')
  if (!pending) return { kind: 'complete' }
  const def = STEPS.find((d) => d.id === pending.id)
  const group = s.steps.filter((st) => inScope(st) && st.status !== 'done' && STEPS.find((d) => d.id === st.id).skill === def.skill).map((st) => st.id)
  return { kind: 'run', skill: def.skill, steps: group }
}

export function blocking (s) { return s.decisions.filter((d) => /\(blocks\b/i.test(d)) }

export function nextAction (s) {
  const n = next(s)
  if (n.kind === 'closed') return 'none: the project is closed'
  if (n.kind === 'waiting') return `waiting on you at ${n.step.id}: ${n.step.evidence || 'see open decisions'}`
  if (n.kind === 'run') return `run ${n.skill} for ${n.steps.join(', ')}`
  if (s.kind === 'test') return 'none pending: run the test as designed, then send the results in a Review job'
  if (blocking(s).length) return `answer the blocking decision${blocking(s).length > 1 ? 's' : ''} below, then continue`
  return 'none pending: make the change-first items, then send your results; or send the research-kit answers'
}

export function log (s, text) { s.history.push(`${now()} · ${text}`) }

// Deliverables expected when a step completes.
export function deliverablesFor (s, stepId) {
  return {
    S8: ['deliverables/research-kit.md'],
    S9: ['deliverables/M1-conversion-review.md'],
    S10: ['deliverables/M2-test-plan.md'],
    S11: [`deliverables/M3-results-v${s.resultsVersion}.md`],
  }[stepId] || []
}

export function deliverableDef (rel) {
  const base = path.basename(rel)
  return DELIVERABLES[base] || (base.startsWith('M3-results') ? DELIVERABLES.M3 : null)
}

export function stepFile (s, id) {
  return id === 'S11' ? `11-results-v${s.resultsVersion}.md` : STEPS.find((d) => d.id === id).file
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
