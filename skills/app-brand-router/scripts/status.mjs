#!/usr/bin/env node
// The dashboard: artifacts/<project>/STATUS.md, rewritten at the end of every job.
//
//   status.mjs <project> [--summary "<one line on what this job did>"]
//
// Reads state.md and the project's files; writes STATUS.md only. Blockers and the next step come
// from the steps and from decisions marked [blocking] (№91); decisions are grouped by step,
// repeats dropped, blocking first (№92).
import fs from 'node:fs'
import path from 'node:path'
import { projectDir, readState, next, nextAction, complete, groupedDecisions, blockingDecisions, fail, args, now } from './lib.mjs'

const a = args(process.argv.slice(2))
const [project] = a._
if (!project) fail('usage: status.mjs <project> [--summary "…"]')
const dir = projectDir(project)
const s = readState(dir)
if (!s) fail(`no project "${project}"`)

const out = path.join(dir, 'STATUS.md')
const prev = fs.existsSync(out) ? /^Updated: (.+)$/m.exec(fs.readFileSync(out, 'utf8'))?.[1] : null
const stamp = now()
// Internal check results stay in state.md's history; the person sees what changed in the work (№94).
const changed = s.history.filter((h) => (!prev || h.slice(0, 19) > prev) && !/check failed|^\S+ \S+ · started /.test(h))
const tick = { done: '✅', 'in progress': '🔄', 'waiting on you': '⏸', 'not started': '⬜' }
const n = next(s)
const current = n.kind === 'run' ? n.steps[0] : n.kind === 'waiting' ? n.step.id : '—'
const blocking = blockingDecisions(s)
const blockers = [
  ...s.steps.filter((st) => st.status === 'waiting on you').map((st) => `${st.id} ${st.name}: ${st.evidence}`),
  ...s.steps.filter((st) => st.evidence.startsWith('not complete')).map((st) => `${st.id} ${st.name} is not finished yet`),
  ...blocking.map((d) => `${d.step ? `${d.step}: ` : ''}${d.text}`),
]
const state = s.closed ? 'closed' : !complete(s) ? 'open' : blocking.length ? 'complete, with decisions waiting on you' : 'complete'
const send = s.closed ? 'nothing: the project is closed'
  : n.kind === 'run' ? `"Build our brand: continue ${project}"`
    : n.kind === 'waiting' ? `"Build our brand: continue ${project}" with your answer or approval`
      : blocking.length ? `"Build our brand: continue ${project}" with your answers to the blocking decisions`
        : `"Apply our brand: <the piece>", "Review our brand" with material to check, "Build our brand: refresh ${project}" with what changed, or "Close ${project}"`

const files = []
const add = (rel, label) => { if (fs.existsSync(path.join(dir, rel))) files.push(`- [${label}](${rel})`) }
add('brand-book.md', `Brand book v${s.bookVersion} (current)`)
const list = (sub) => fs.existsSync(path.join(dir, sub)) ? fs.readdirSync(path.join(dir, sub)).filter((f) => !f.startsWith('.')).sort() : []
for (const d of list('deliverables')) add(`deliverables/${d}`, d.replace(/\.md$/, ''))
for (const t of list('touchpoints')) add(`touchpoints/${t}`, `piece: ${t.replace(/\.md$/, '')}`)
for (const i of list('images')) add(`images/${i}`, `mood board: ${i}`)
for (const v of list('versions').filter((v) => v.endsWith('.md'))) add(`versions/${v}`, `earlier: ${v.replace(/\.md$/, '')}`)
add('99-closing.md', 'Closing summary')

// Blocking decisions are shown once, as blockers; the list below holds the rest (№91, №92).
const decisions = groupedDecisions(s).filter((d) => !d.blocking)
fs.writeFileSync(out, `# ${project}: status

Updated: ${stamp}

- **Goal:** ${s.goal}
- **State:** ${state}
${a.summary && a.summary !== true ? `- **This job:** ${a.summary}\n` : ''}
## Steps

| Step | Status |
|---|---|
${s.steps.map((st) => `| ${st.id} ${st.name} | ${tick[st.status]} ${st.status} |`).join('\n')}

**Current step:** ${current}

## Blockers

${blockers.length ? blockers.map((b) => `- ${b}`).join('\n') : '- none'}

## Decisions waiting on you

${decisions.length ? decisions.map((d) => `- ${d.blocking ? '**Blocking** · ' : ''}${d.step && d.step !== 'P' && d.step !== 'R' ? `${d.step} · ` : ''}${d.text}`).join('\n') : '- none'}

## Next step

${nextAction(s)}. To go on, send ${send}.

## What changed since last time

${changed.length ? changed.map((h) => `- ${h}`).join('\n') : '- nothing'}

## Deliverables

${files.length ? files.join('\n') : '- none yet'}
`)
console.log(out)
