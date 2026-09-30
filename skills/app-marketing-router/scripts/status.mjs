#!/usr/bin/env node
// The dashboard: artifacts/<project>/STATUS.md, rewritten at the end of every job.
//
//   status.mjs <project> [--summary "<one line on what this job did>"]
//
// Reads state.md and the project's files; writes STATUS.md only.
import fs from 'node:fs'
import path from 'node:path'
import { projectDir, readState, next, nextAction, complete, fail, args, now } from './lib.mjs'

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
const tick = { done: '✅', 'in progress': '🔄', 'waiting on you': '⏸', 'not started': '⬜' }
const n = next(s)
const current = n.kind === 'run' ? n.steps[0] : n.kind === 'waiting' ? n.step.id : '—'
const blockers = s.steps.filter((st) => st.status === 'waiting on you' || st.evidence.startsWith('not complete')).map((st) => `${st.id}: ${st.evidence}`)
const job = s.kind === 'campaign' ? 'Plan a launch or feature campaign' : 'Plan our marketing'
const send = n.kind === 'run' ? `"${job}: continue ${project}"`
  : n.kind === 'waiting' ? `"${job}: continue ${project}" with your answer or approval`
    : n.kind === 'complete' && s.kind === 'plan' ? `"Plan our marketing: update ${project}" with your results, or "Close ${project}"`
      : n.kind === 'complete' ? `"Close ${project}" when the campaign is over`
        : 'nothing: the project is closed'

const files = []
const add = (rel, label) => { if (fs.existsSync(path.join(dir, rel))) files.push(`- [${label}](${rel})`) }
add(s.kind === 'campaign' ? 'campaign-plan.md' : 'marketing-plan.md', s.kind === 'campaign' ? 'Campaign plan (current)' : `Marketing plan v${s.planVersion} (current)`)
for (const d of fs.existsSync(path.join(dir, 'deliverables')) ? fs.readdirSync(path.join(dir, 'deliverables')).sort() : []) add(`deliverables/${d}`, d.replace(/\.md$/, ''))
for (const v of fs.existsSync(path.join(dir, 'versions')) ? fs.readdirSync(path.join(dir, 'versions')).sort() : []) add(`versions/${v}`, `earlier: ${v.replace(/\.md$/, '')}`)
add('99-closing.md', 'Closing summary')

fs.writeFileSync(out, `# ${project}: status

Updated: ${stamp}

- **Goal:** ${s.goal}
- **Kind:** ${s.kind}${s.parent ? ` inside ${s.parent}` : ''} · **State:** ${s.closed ? 'closed' : complete(s) ? 'complete' : 'open'}
${a.summary && a.summary !== true ? `- **This job:** ${a.summary}\n` : ''}
## Steps

| Step | Status |
|---|---|
${s.steps.map((st) => `| ${st.id} ${st.name} | ${tick[st.status]} ${st.status} |`).join('\n')}

**Current step:** ${current}

## Blockers

${blockers.length ? blockers.map((b) => `- ${b}`).join('\n') : '- none'}

## Decisions waiting on you

${s.decisions.length ? s.decisions.map((d) => `- ${d}`).join('\n') : '- none'}

## Next step

${nextAction(s)}. To go on, send ${send}.

## What changed since last time

${changed.length ? changed.map((h) => `- ${h}`).join('\n') : '- nothing'}

## Deliverables

${files.length ? files.join('\n') : '- none yet'}
`)
console.log(out)
