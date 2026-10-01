#!/usr/bin/env node
// The dashboard: artifacts/<project>/STATUS.md, rewritten at the end of every job.
//
//   status.mjs <project> [--summary "<one line on what this job did>"]
//
// Reads state.md and the project's files; writes STATUS.md only.
import fs from 'node:fs'
import path from 'node:path'
import { STEPS, BLOCK_PREFIX, projectDir, readState, next, nextAction, complete, isBlocking, fail, args, now } from './lib.mjs'
import { diff } from './version.mjs'

const a = args(process.argv.slice(2))
const [project] = a._
if (!project) fail('usage: status.mjs <project> [--summary "…"]')
const dir = projectDir(project)
const s = readState(dir)
if (!s) fail(`no project "${project}"`)

const out = path.join(dir, 'STATUS.md')
const prev = fs.existsSync(out) ? /^Updated: (.+)$/m.exec(fs.readFileSync(out, 'utf8'))?.[1] : null
const stamp = now()
const tick = { done: '✅', 'in progress': '🔄', 'waiting on you': '⏸', 'not started': '⬜' }
const n = next(s)
const current = n.kind === 'run' ? n.steps[0] : n.kind === 'waiting' ? n.step.id : '—'

// Decisions: grouped by step, repeats dropped, blocking ones first (C01 №91–92).
const norm = (t) => t.replace(/^S\d · /, '').replace(BLOCK_PREFIX, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
// Near-duplicates (the same ask in other words, often repeated across steps) are dropped: two
// decisions whose significant words overlap by 60% or more count as one; the first is kept.
const STOP = new Set('the a an and or of to for in on your you is are be with by at from this that it as what when which'.split(' '))
const words = (t) => new Set(norm(t).split(' ').filter((w) => w.length > 2 && !STOP.has(w)))
const same = (x, y) => { const a = words(x); const b = words(y); if (!a.size || !b.size) return false; let n = 0; for (const w of a) if (b.has(w)) n++; return n / Math.min(a.size, b.size) >= 0.6 }
const decisions = []
for (const d of [...s.decisions.filter(isBlocking), ...s.decisions.filter((x) => !isBlocking(x))]) if (norm(d) && !decisions.some((k) => same(k, d))) decisions.push(d)
const blockingDecisions = decisions.filter(isBlocking)
const otherDecisions = decisions.filter((d) => !isBlocking(d))

const blockers = [
  ...s.steps.filter((st) => st.status === 'waiting on you').map((st) => `${st.id} ${st.name} is waiting on you: ${st.evidence}`),
  ...s.steps.filter((st) => st.evidence.startsWith('not complete')).map((st) => `${st.id} ${st.name} is not finished`),
  ...blockingDecisions.map((d) => d.replace(/^(S\d) · /, '$1 · ').replace(/^(S\d · )(.*)$/, (m, a, b) => a + b.replace(BLOCK_PREFIX, ''))),
].filter((b, i, all) => !all.slice(0, i).some((x) => same(x, b)))
const state = s.closed ? 'closed' : blockers.length ? 'blocked' : complete(s) ? 'complete' : 'open'

const job = s.kind === 'launch' ? 'Plan a launch' : 'Plan our marketing'
let send
if (s.closed) send = 'nothing: the project is closed'
else if (s.kind === 'launch' && (n.kind !== 'run')) send = `"Close ${project}" when the launch is over. A launch is written in one job: to change it, or to answer the questions above, ask for a new launch plan (for example "Plan a launch: ${project.replace(/^launch-/, '')}-v2" with your answers)`
else if (n.kind === 'waiting' || blockingDecisions.length) send = `"Plan our marketing: continue ${s.kind === 'launch' ? s.parent || project : project}" with your answer to the blocking decision${blockingDecisions.length > 1 ? 's' : ''} above`
else if (n.kind === 'run') send = `"${job}: continue ${project}"`
else if (s.kind === 'launch') send = `"Close ${project}" when the launch is over (a launch is not updated: plan a new one for changes)`
else send = `"Plan our marketing: update ${project}" with your results, or "Close ${project}"`
if (s.kind === 'launch' && n.kind === 'run') send = `"Plan a launch: ${project.replace(/^launch-/, '')}" again with the missing details (a launch is written in one job)`

const group = (list) => {
  if (!list.length) return '- none'
  const by = {}
  for (const d of list) { const id = /^(S\d) · /.exec(d)?.[1] || 'Other'; (by[id] ||= []).push(d.replace(/^S\d · /, '')) }
  // Blocking decisions always show; at most 3 others per step, then a pointer to the step file.
  return Object.entries(by).map(([id, ds]) => {
    const step = STEPS.find((x) => x.id === id)
    const block = ds.filter((d) => d.startsWith('**Blocking:**'))
    const rest = ds.filter((d) => !d.startsWith('**Blocking:**'))
    const more = rest.length > 3 ? `\n- …and ${rest.length - 3} more in ${step ? step.file : 'the step files'}` : ''
    return `**${step ? `${id} ${step.name}` : 'Other'}**\n${[...block, ...rest.slice(0, 3)].map((d) => `- ${d}`).join('\n')}${more}`
  }).join('\n\n')
}

const d = diff(dir, s)
const history = s.history.filter((h) => (!prev || h.slice(0, 19) > prev) && !/check failed|^\S+ \S+ · started /.test(h))
const changedLines = [
  ...history.map((h) => `- ${h}`),
  ...(d.changed.length ? [`- Sections changed in plan v${s.planVersion} against ${d.against}:`, ...d.changed.map((c) => `  - ${c}`)] : []),
]

const files = []
const add = (rel, label) => { if (fs.existsSync(path.join(dir, rel))) files.push(`- [${label}](${rel})`) }
add(s.kind === 'launch' ? 'launch-plan.md' : 'marketing-plan.md', s.kind === 'launch' ? 'Launch plan (current)' : `Marketing plan v${s.planVersion} (current)`)
for (const f of fs.existsSync(path.join(dir, 'deliverables')) ? fs.readdirSync(path.join(dir, 'deliverables')).sort() : []) add(`deliverables/${f}`, f.replace(/\.md$/, ''))
for (const v of fs.existsSync(path.join(dir, 'versions')) ? fs.readdirSync(path.join(dir, 'versions')).sort() : []) add(`versions/${v}/${s.kind === 'launch' ? 'launch-plan.md' : 'marketing-plan.md'}`, `earlier: plan ${v}`)
add('99-closing.md', 'Closing summary')

fs.writeFileSync(out, `# ${project}: status

Updated: ${stamp}

- **Goal:** ${s.goal}
- **Kind:** ${s.kind}${s.parent ? ` inside ${s.parent}` : ''} · **State:** ${state}
${a.summary && a.summary !== true ? `- **This job:** ${a.summary}\n` : ''}
## Steps

| Step | Status |
|---|---|
${s.steps.map((st) => `| ${st.id} ${st.name} | ${tick[st.status]} ${st.status} |`).join('\n')}

**Current step:** ${current}

## Blockers

${blockers.length ? blockers.map((b) => `- ${b}`).join('\n') : '- none'}

## Decisions waiting on you

${group([...blockingDecisions.map((x) => x.replace(/^(S\d · )(.*)$/, (m, a, b) => `${a}**Blocking:** ${b.replace(BLOCK_PREFIX, '')}`)), ...otherDecisions])}

## Next step

${blockers.length && n.kind !== 'waiting' && s.kind !== 'launch' ? 'Answer the blocking decisions' : nextAction(s)}. To go on, send ${send}.

## What changed since last time

${changedLines.length ? changedLines.join('\n') : '- nothing'}

## Deliverables

${files.length ? files.join('\n') : '- none yet'}
`)
console.log(out)
