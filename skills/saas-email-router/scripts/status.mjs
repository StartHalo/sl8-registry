#!/usr/bin/env node
// The dashboard: artifacts/<campaign>/STATUS.md, rewritten at the end of every job.
//
//   status.mjs <campaign> [--summary "<one line on what this job did>"]
//
// Reads state.md, the company profile and the campaign's files; writes STATUS.md only.
// Blockers come from steps waiting on the founder, steps that failed their check, decisions marked
// "(blocks sending)" and profile fields needed before sending. Decisions are grouped and never repeated.
// "What changed" lists every file whose content changed since the last update, so every changed
// email is named. It compares content fingerprints kept in a comment at the end of STATUS.md, not
// file times, which a copied or restored folder resets.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { projectDir, readState, next, nextAction, state, BLOCKS, fail, args, now } from './lib.mjs'
import { readProfile, FIELDS } from './context.mjs'

const a = args(process.argv.slice(2))
const [project] = a._
if (!project) fail('usage: status.mjs <campaign> [--summary "…"]')
const dir = projectDir(project)
const s = readState(dir)
if (!s) fail(`no campaign "${project}"`)

const out = path.join(dir, 'STATUS.md')
const prevText = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
const prevPrints = (() => { try { return JSON.parse(/<!-- fingerprints (\{[\s\S]*?\}) -->\s*$/.exec(prevText)?.[1] || 'null') } catch { return null } })()
const stamp = now()
const tick = { done: '✅', 'in progress': '🔄', 'waiting on you': '⏸', 'not started': '⬜', 'when results arrive': '·' }
const n = next(s)
const current = n.kind === 'run' ? n.steps[0] : n.kind === 'waiting' ? n.step.id : '—'
const JOB = 'Email campaign'

// Blockers
const profile = readProfile()
const label = (k) => FIELDS.find((f) => f.key === k).label.toLowerCase()
const blockers = []
for (const k of profile.beforeSending) blockers.push({ text: `Your ${label(k)} is missing, so the emails show [TBD]. Needed before you send.`, send: `"${JOB}: ${FIELDS.find((f) => f.key === k).label}: <yours>"` })
for (const st of s.steps) {
  if (st.status === 'waiting on you') blockers.push({ text: `${st.id} ${st.name}: ${st.evidence}`, send: `"${JOB}: approve ${project}", or "${JOB}: ${project}, change …"` })
  else if (st.evidence.startsWith('not complete')) blockers.push({ text: `${st.id} ${st.name} could not be finished (${st.evidence.replace(/^not complete: /, '')})`, send: `"${JOB}: continue ${project}"` })
}
const norm = (t) => t.toLowerCase().replace(/\(blocks sending\)/, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
const seen = new Set()
const decisions = []
for (const d of s.decisions) {
  const m = /^(S\d) · (.*)$/.exec(d)
  const step = m ? m[1] : '—'
  const text = m ? m[2] : d
  if (/^\[?TBD\]?$/i.test(text.trim())) continue
  const key = norm(text)
  if (seen.has(key)) continue
  seen.add(key)
  if (BLOCKS.test(text)) {
    // A blocker about the sender or postal address is the profile's: shown once above while
    // missing, and dropped once the founder has given it.
    const aboutProfile = /\b(postal )?address\b/i.test(text) ? 'address' : /\bsender\b/i.test(text) ? 'sender' : null
    if (!aboutProfile) blockers.push({ text: text.replace(BLOCKS, '').trim(), send: `"${JOB}: ${project}, <your answer>"` })
  } else decisions.push({ step, text })
}
const byStep = {}
for (const d of decisions) (byStep[d.step] ||= []).push(d.text)
const decisionText = Object.keys(byStep).length
  ? Object.entries(byStep).map(([st, ds]) => `**${st === '—' ? 'Other' : `${st} ${s.steps.find((x) => x.id === st)?.name || ''}`}**\n${ds.map((t) => `- ${t}`).join('\n')}`).join('\n\n')
  : '- none'

// Next step, with the exact request
let nextLine
if (s.closed) nextLine = 'Nothing: the campaign is closed. Start a new campaign any time.'
else if (n.kind === 'waiting') nextLine = `Review the plan in deliverables/M1-campaign-plan.md, then send "${JOB}: approve ${project}" or "${JOB}: ${project}, change …".`
else if (n.kind === 'run') nextLine = `Send "${JOB}: continue ${project}" to finish ${n.steps.join(', ')}.`
else if (blockers.length) nextLine = `Fix the blockers above (send ${blockers[0].send}), then load the pack into your email tool. You press send.`
else nextLine = `Load pack/ into your email tool with pack/sequence-setup.md and pack/send-checklist.md; you press send. Afterwards send "${JOB}: results for ${project}: <your figures>", or "${JOB}: in ${project}, change …", or "${JOB}: close ${project}".`

// What changed: every file whose content differs from the fingerprints the last STATUS.md kept
const prints = {}
const walk = (rel) => {
  for (const f of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${f.name}` : f.name
    if (f.isDirectory()) { if (r !== 'versions') walk(r) } else if (r !== 'STATUS.md' && r !== 'state.md') prints[r] = crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, r))).digest('hex').slice(0, 12)
  }
}
walk('')
const changed = prevPrints ? Object.keys(prints).filter((r) => prints[r] !== prevPrints.files?.[r]).sort() : []
const removed = prevPrints ? Object.keys(prevPrints.files || {}).filter((r) => !(r in prints)).sort() : []
const versionsNow = fs.existsSync(path.join(dir, 'versions')) ? fs.readdirSync(path.join(dir, 'versions')).sort() : []
const newVersions = prevPrints ? versionsNow.filter((v) => !(prevPrints.versions || []).includes(v)) : []

const files = []
const add = (rel, lbl) => { if (fs.existsSync(path.join(dir, rel))) files.push(`- [${lbl}](${rel})`) }
add('pack/preview.html', 'Preview every email (open in a browser)')
for (const d of fs.existsSync(path.join(dir, 'deliverables')) ? fs.readdirSync(path.join(dir, 'deliverables')).sort() : []) add(`deliverables/${d}`, d.replace(/\.md$/, ''))
add('pack/sequence-setup.md', 'Sequence setup sheet')
add('pack/send-checklist.md', 'Send checklist')
for (const v of fs.existsSync(path.join(dir, 'versions')) ? fs.readdirSync(path.join(dir, 'versions')).sort() : []) add(`versions/${v}`, `earlier: ${v}`)
add('99-closing.md', 'Closing summary')

fs.writeFileSync(out, `# ${project}: status

Updated: ${stamp}

- **Goal:** ${s.goal}
- **State:** ${state(s)} · **Pack version:** ${s.packVersion}
${a.summary && a.summary !== true ? `- **This job:** ${a.summary}\n` : ''}
## Steps

| Step | Status |
|---|---|
${s.steps.map((st) => `| ${st.id} ${st.name} | ${tick[st.status]} ${st.status} |`).join('\n')}

**Current step:** ${current}

## Blockers

${blockers.length ? blockers.map((b) => `- ${b.text}`).join('\n') : '- none'}

## Decisions waiting on you

${decisionText}

## Next step

${nextLine}

## What changed since last time

${prevPrints ? (changed.length || removed.length || newVersions.length ? [...changed.map((c) => `- ${c}`), ...removed.map((c) => `- ${c} (removed)`), ...newVersions.map((v) => `- versions/${v} (earlier version kept)`)].join('\n') : '- nothing') : '- first update of this dashboard'}

## Deliverables

${files.length ? files.join('\n') : '- none yet'}

<!-- fingerprints ${JSON.stringify({ files: prints, versions: versionsNow })} -->
`)
console.log(out)
