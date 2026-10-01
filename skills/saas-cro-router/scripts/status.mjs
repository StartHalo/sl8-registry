#!/usr/bin/env node
// The dashboard: artifacts/<project>/STATUS.md, rewritten at the end of every job.
//
//   status.mjs <project> [--summary "<one line on what this job did>"]
//
// Reads state.md and the project's files; writes STATUS.md only.
import fs from 'node:fs'
import path from 'node:path'
import { projectDir, readState, next, nextAction, complete, blocking, sectionBody, numbered, readSheet, deliverableDef, fail, args, now } from './lib.mjs'

const a = args(process.argv.slice(2))
const [project] = a._
if (!project) fail('usage: status.mjs <project> [--summary "…"]')
const dir = projectDir(project)
const s = readState(dir)
if (!s) fail(`no project "${project}"`)

const out = path.join(dir, 'STATUS.md')
const prev = fs.existsSync(out) ? /^Updated: (.+)$/m.exec(fs.readFileSync(out, 'utf8'))?.[1] : null
const stamp = now()
const changed = s.history.filter((h) => !prev || h.slice(0, 19) > prev)
const tick = { done: '✅', 'in progress': '🔄', 'waiting on you': '⏸', 'not started': '⬜', 'not in scope': '⏭' }
const n = next(s)
const current = n.kind === 'run' ? n.steps[0] : n.kind === 'waiting' ? n.step.id : '—'

// Blockers: steps stopped on the person or on a failed check, and open decisions that block (№91–92).
const block = blocking(s)
const blockers = [
  ...s.steps.filter((st) => st.status === 'waiting on you' || st.evidence.startsWith('not complete')).map((st) => `${st.id}: ${st.evidence}`),
  ...block,
]
// Other decisions, grouped by step; repeats were already dropped when they were recorded.
const groups = {}
for (const d of s.decisions.filter((x) => !block.includes(x))) { const [id, ...t] = d.split(' · '); (groups[id] ||= []).push(t.join(' · ')) }
const decisions = Object.entries(groups).map(([id, list]) => `**${id}**\n${list.map((t) => `- ${t}`).join('\n')}`)

const review = 'Review our conversion'
let send
if (s.closed) send = 'nothing: the project is closed. Start a new review with "Review our conversion: <your site>"'
else if (n.kind === 'run') send = `"${review}: continue ${project}"`
else if (n.kind === 'waiting') send = `"${review}: continue ${project}" with ${n.step.evidence}`
else if (block.length) send = `"${review}: continue ${project}" with your answer to: ${block[0].replace(/^S\d+ · /, '')}`
else if (s.kind === 'test') send = `the results of the test, in "${review}: ${project}, results …", or "Close ${project}"`
else send = `"${review}: ${project}, we shipped <items> on <date>; before: <figures>, after: <figures>" when you have results; "${review}: continue ${project}" with your research-kit notes or screenshots; or "Close ${project}"`

// The change-first list, with each item's status from the action sheet.
let first = []
const sheetFile = path.join(dir, '09-action-sheet.md')
if (fs.existsSync(sheetFile)) {
  const rows = Object.fromEntries((readSheet(dir)?.rows || []).map((r) => [r.id, r]))
  first = numbered(sectionBody(fs.readFileSync(sheetFile, 'utf8'), 'Change first')).map((item, i) => {
    const id = /\[([A-Za-z]+\d+)\]/.exec(item)?.[1]
    return `${i + 1}. ${item}${id && rows[id] ? ` · **${rows[id].status}**` : ''}`
  })
}

// Deliverables: a fixed list of kinds (№96), then test designs and earlier versions.
const files = []
const add = (rel, label) => { if (fs.existsSync(path.join(dir, rel))) files.push(`- [${label}](${rel})`) }
add('action-sheet.csv', `Action sheet v${s.sheetVersion} (current)`)
for (const d of fs.existsSync(path.join(dir, 'deliverables')) ? fs.readdirSync(path.join(dir, 'deliverables')).sort() : []) {
  const def = deliverableDef(d)
  if (def) add(`deliverables/${d}`, d.startsWith('M3-results') ? `${def.label} ${d.match(/v\d+/)?.[0] || ''}`.trim() : def.label)
}
for (const t of s.tests) add(`tests/${t}.md`, `Test design: ${t}`)
for (const v of fs.existsSync(path.join(dir, 'versions')) ? fs.readdirSync(path.join(dir, 'versions')).sort() : []) add(`versions/${v}`, `earlier: ${v}`)

const kind = s.kind === 'test' ? 'test design' : 'conversion review'
const stepRows = s.steps.length
  ? `## Steps\n\n| Step | Status |\n|---|---|\n${s.steps.map((st) => `| ${st.id} ${st.name} | ${tick[st.status]} ${st.status === 'not in scope' ? 'when results come back' : st.status} |`).join('\n')}\n\n**Current step:** ${current}\n`
  : '## Steps\n\n- One job: the test design below.\n'

fs.writeFileSync(out, `# ${project}: status

Updated: ${stamp}

- **Goal:** ${s.goal}
- **Kind:** ${kind} · **State:** ${s.closed ? 'closed' : complete(s) ? 'complete' : 'open'}
${a.summary && a.summary !== true ? `- **This job:** ${a.summary}\n` : ''}
${stepRows}
## Blockers

${blockers.length ? blockers.map((b) => `- ${b}`).join('\n') : '- none'}

## Decisions waiting on you

${decisions.length ? decisions.join('\n\n') : '- none'}

## Change first

${first.length ? first.join('\n') : '- not ranked yet'}

## Next step

${nextAction(s)}. To go on, send ${send}.

## What changed since last time

${changed.length ? changed.map((h) => `- ${h}`).join('\n') : '- nothing'}

## Deliverables

${files.length ? files.join('\n') : '- none yet'}
`)
console.log(out)
