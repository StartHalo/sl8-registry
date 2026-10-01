#!/usr/bin/env node
// The campaign's progress: artifacts/<campaign>/state.md. The only writer of that file.
//
//   state.mjs init <campaign> --goal "<their words>"
//   state.mjs list                         every campaign, its state and next action (JSON)
//   state.mjs show <campaign>              the machine copy (JSON)
//   state.mjs next <campaign>              what runs next: {"kind":"run","skill":…,"steps":[…]} | waiting | complete | closed
//   state.mjs start <campaign> <step>…     mark steps in progress
//   state.mjs check <campaign> <step>…     check each step's definition of complete; done if it passes, else exit 1 with the gaps
//   state.mjs wait <campaign> <step> --reason "<what the founder must do>"
//   state.mjs resume <campaign>            steps waiting on the founder go back to not started
//   state.mjs reopen <campaign> <step> --reason "<why>"   that step and every later one (S1–S8) go back to not started; S9 reopens only itself
//   state.mjs close <campaign>             needs 99-closing.md
//   state.mjs input <campaign> <request|change|results|name> < text   saves to inputs/<name>-<date>.md; never overwrites (adds -2, -3 …)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { STEPS, SECTIONS, COPY_FIELDS, DELIVERABLE_SECTIONS, ARTIFACTS, projectDir, readState, writeState, next, nextAction, state, log, headings, sectionBody, bullets, tableRows, copyEmails, deliverablesFor, fail, args, today } from './lib.mjs'

const a = args(process.argv.slice(2))
const [cmd, project, ...rest] = a._

function load () {
  const dir = projectDir(project)
  const s = readState(dir)
  if (!s) fail(`no campaign "${project}" (no ${dir}/state.md). Known: ${listProjects().map((p) => p.campaign).join(', ') || 'none'}`)
  return { dir, s }
}

function listProjects () {
  if (!fs.existsSync(ARTIFACTS)) return []
  return fs.readdirSync(ARTIFACTS).filter((d) => fs.existsSync(path.join(ARTIFACTS, d, 'state.md'))).map((d) => {
    const s = readState(path.join(ARTIFACTS, d))
    return { campaign: d, goal: s.goal, state: state(s), next: nextAction(s) }
  })
}

function stepIds (ids) {
  const out = []
  for (const id of ids) {
    const r = /^S([1-9])(?:[–-]S?([1-9]))?$/i.exec(id)
    if (!r) fail(`unknown step "${id}": use S1 … S9, or a range such as S6-S8`)
    for (let i = +r[1]; i <= +(r[2] || r[1]); i++) out.push(`S${i}`)
  }
  return out
}

const read = (dir, rel) => fs.existsSync(path.join(dir, rel)) ? fs.readFileSync(path.join(dir, rel), 'utf8') : null
const sha = (dir, rel) => fs.existsSync(path.join(dir, rel)) ? crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, rel))).digest('hex') : null
const storyboardRows = (dir) => tableRows(sectionBody(read(dir, '04-storyboard.md') || '', 'Storyboard'))

function latestResults (dir) {
  const fs_ = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^09-results-.*\.md$/.test(f)).sort() : []
  return fs_.at(-1) || null
}

function checkStep (dir, s, id) {
  const def = STEPS.find((d) => d.id === id)
  const gaps = []
  let file = def.file
  if (id === 'S9') { file = latestResults(dir); if (!file) return { gaps: ['no 09-results-<date>.md written'] } }
  const text = read(dir, file)
  if (text === null) return { gaps: [`${file} is missing`] }

  if (SECTIONS[id]) {
    const hs = headings(text)
    for (const h of SECTIONS[id]) if (!hs.has(h.toLowerCase())) gaps.push(`${file} has no "## ${h}" section`)
  }
  const open = SECTIONS[id]?.includes('Open decisions') ? bullets(sectionBody(text, 'Open decisions')).filter((b) => !/^none\b/i.test(b)) : []
  if (/\[TBD\]/.test(text) && SECTIONS[id]?.includes('Open decisions') && open.length === 0) gaps.push(`${file} marks something [TBD] but lists no open decision for it`)

  if (id === 'S1') {
    const segs = tableRows(sectionBody(text, 'Audience and segments')).length || bullets(sectionBody(text, 'Audience and segments')).length
    if (segs > 3) gaps.push('more than 3 segments in S1 (limit 3)')
    if (segs === 0) gaps.push('S1 names no segment (a table row or bullet under Audience and segments)')
  }
  if (id === 'S2' && tableRows(sectionBody(text, 'Resources')).length > 15) gaps.push('more than 15 resources in S2 (limit 15)')
  if (id === 'S3') {
    const n = tableRows(sectionBody(text, 'Ideas')).length
    if (n < 2) gaps.push('S3 has fewer than 2 ideas (one table row each under Ideas)')
    if (n > 24) gaps.push('more than 24 ideas in S3 (limit 24)')
  }
  if (id === 'S4') {
    const n = storyboardRows(dir).length
    if (n < 1) gaps.push('the storyboard has no emails (one table row each under Storyboard)')
    if (n > 9) gaps.push('more than 9 emails in the storyboard (limit 9)')
    const ideas = tableRows(sectionBody(read(dir, '03-idea-pool.md') || '', 'Ideas')).length
    if (n > 0 && ideas < 2 * n) gaps.push(`the idea pool has ${ideas} ideas for ${n} emails (needs at least ${2 * n})`)
  }
  if (id === 'S5') {
    const emails = copyEmails(text)
    const want = storyboardRows(dir).length
    if (emails.length !== want) gaps.push(`05-copy.md has ${emails.length} emails; the storyboard has ${want}`)
    for (const e of emails) {
      for (const f of COPY_FIELDS) if (!(f in e.fields)) gaps.push(`Email ${e.n} has no "- ${f}:" line`)
      if (!e.hasBody) gaps.push(`Email ${e.n} has no "### Body"`)
      if ((e.fields.Subject || '').length > 60) gaps.push(`Email ${e.n} subject is over 60 characters`)
      if (e.fields['Primary CTA'] && !/\[[^\]]+\]\((https:\/\/[^)\s]+|\{\{[a-z_]+\}\})\)/.test(e.fields['Primary CTA'])) gaps.push(`Email ${e.n} primary CTA is not [text](https://…)`)
    }
  }
  if (id === 'S6') {
    let b = null
    try { b = JSON.parse(text) } catch { gaps.push('pack/build.json is not valid JSON; run build.mjs') }
    if (b) {
      const want = copyEmails(read(dir, '05-copy.md') || '').length
      if ((b.emails || []).length !== want) gaps.push(`the pack has ${(b.emails || []).length} emails; 05-copy.md has ${want}`)
      for (const e of b.emails || []) for (const f of [e.html, e.text]) if (!read(dir, `pack/${f}`)) gaps.push(`pack/${f} is missing`)
      if (!read(dir, 'pack/preview.html')) gaps.push('pack/preview.html is missing')
      if (b.copySha !== sha(dir, '05-copy.md')) gaps.push('05-copy.md changed after the last build; run build.mjs again')
    }
  }
  if (id === 'S7') {
    const qa = read(dir, 'pack/qa.json')
    if (!qa) gaps.push('pack/qa.json is missing; run check.mjs')
    else {
      const q = JSON.parse(qa)
      if (q.failures > 0) gaps.push(`check.mjs reports ${q.failures} failure(s); fix the copy and rebuild`)
      if (q.buildSha !== sha(dir, 'pack/build.json')) gaps.push('the pack was rebuilt after the last check; run check.mjs again')
    }
  }
  if (id === 'S8') {
    if (!read(dir, 'pack/sequence-setup.md')) gaps.push('pack/sequence-setup.md is missing')
    const c = path.join(dir, 'pack', 'contacts')
    if (!fs.existsSync(c) || !fs.readdirSync(c).some((f) => f.endsWith('.csv'))) gaps.push('pack/contacts/ has no CSV (segment files or the template)')
    if (!/you (press|send)|the founder (presses|sends)/i.test(text)) gaps.push('send-checklist.md does not say the founder sends')
  }

  const decisions = [...open, ...(id === 'S4' ? bullets(sectionBody(text, 'Decisions for you')) : [])]
  const outputs = [file]
  for (const rel of deliverablesFor(s, id)) {
    const t = read(dir, rel)
    if (t === null) { gaps.push(`${rel} is missing`); continue }
    for (const h of DELIVERABLE_SECTIONS) if (!headings(t).has(h.toLowerCase())) gaps.push(`${rel} has no "## ${h}" section`)
    if (/see (state|0\d-[a-z-]+)\.md/i.test(t)) gaps.push(`${rel} points to a working file instead of standing alone`)
    outputs.push(rel)
  }
  if (id === 'S9') {
    const m = `deliverables/M3-results-${file.slice('09-results-'.length)}`
    const t = read(dir, m)
    if (t === null) gaps.push(`${m} is missing`)
    else { for (const h of DELIVERABLE_SECTIONS) if (!headings(t).has(h.toLowerCase())) gaps.push(`${m} has no "## ${h}" section`); outputs.push(m) }
  }
  return { gaps, decisions, outputs }
}

switch (cmd) {
  case 'init': {
    const dir = projectDir(project)
    if (readState(dir)) fail(`campaign "${project}" already exists; continue it, or pick a new name`)
    if (!a.goal || a.goal === true) fail('--goal is required, in the founder\'s words')
    const s = {
      project, goal: a.goal, created: today(), packVersion: 1, closed: false,
      steps: STEPS.map((d) => ({ id: d.id, name: d.name, status: d.id === 'S9' ? 'when results arrive' : 'not started', evidence: '' })),
      milestones: [], decisions: [], history: [],
    }
    for (const sub of ['inputs', 'deliverables', 'versions', 'pack']) fs.mkdirSync(path.join(dir, sub), { recursive: true })
    log(s, `campaign created: ${a.goal}`)
    writeState(dir, s)
    console.log(JSON.stringify(next(s)))
    break
  }
  case 'list': console.log(JSON.stringify(listProjects(), null, 2)); break
  case 'show': console.log(JSON.stringify(load().s, null, 2)); break
  case 'next': console.log(JSON.stringify(next(load().s))); break
  case 'start': {
    const { dir, s } = load()
    for (const id of stepIds(rest)) { const st = s.steps.find((x) => x.id === id); if (st.status !== 'done') st.status = 'in progress' }
    log(s, `started ${stepIds(rest).join(', ')}`)
    writeState(dir, s)
    break
  }
  case 'check': {
    const { dir, s } = load()
    let bad = 0
    for (const id of stepIds(rest)) {
      const st = s.steps.find((x) => x.id === id)
      const r = checkStep(dir, s, id)
      if (r.gaps.length) {
        bad++
        st.status = 'in progress'
        st.evidence = `not complete: ${r.gaps.join('; ')}`
        console.log(`✗ ${id}: ${r.gaps.join('; ')}`)
        log(s, `${id} check failed: ${r.gaps.join('; ')}`)
      } else {
        st.status = 'done'
        st.evidence = `${r.outputs.join(', ')}: complete${r.decisions.length ? `; ${r.decisions.length} decision(s)` : ''}`
        s.decisions = s.decisions.filter((d) => !d.startsWith(`${id} · `)).concat(r.decisions.map((d) => `${id} · ${d}`))
        for (const o of r.outputs.filter((o) => o.startsWith('deliverables/'))) if (!s.milestones.includes(o)) s.milestones.push(o)
        console.log(`✓ ${id}: ${st.evidence}`)
        log(s, `${id} done`)
      }
    }
    writeState(dir, s)
    process.exit(bad ? 1 : 0)
  }
  case 'wait': {
    const { dir, s } = load()
    const [id] = stepIds(rest)
    if (!a.reason || a.reason === true) fail('--reason is required: what the founder must do')
    const st = s.steps.find((x) => x.id === id)
    st.status = 'waiting on you'
    st.evidence = a.reason
    log(s, `${id} waiting on you: ${a.reason}`)
    writeState(dir, s)
    break
  }
  case 'resume': {
    const { dir, s } = load()
    const w = s.steps.filter((x) => x.status === 'waiting on you')
    for (const st of w) { st.status = 'not started'; st.evidence = '' }
    log(s, w.length ? `resumed ${w.map((x) => x.id).join(', ')}` : 'resume: nothing was waiting')
    writeState(dir, s)
    console.log(JSON.stringify(next(s)))
    break
  }
  case 'reopen': {
    const { dir, s } = load()
    const [id] = stepIds(rest)
    if (s.closed) fail('the campaign is closed; start a new one')
    if (!a.reason || a.reason === true) fail('--reason is required')
    const from = +id.slice(1)
    for (const st of s.steps) {
      const n = +st.id.slice(1)
      if (from === 9 ? n === 9 : (n >= from && n < 9)) { st.status = 'not started'; st.evidence = '' }
    }
    s.decisions = s.decisions.filter((d) => { const n = +d.slice(1, 2); return from === 9 ? n !== 9 : (n < from || n === 9) })
    log(s, `reopened ${from === 9 ? 'S9' : `from ${id}`}: ${a.reason}`)
    writeState(dir, s)
    console.log(JSON.stringify(next(s)))
    break
  }
  case 'close': {
    const { dir, s } = load()
    if (!fs.existsSync(path.join(dir, '99-closing.md'))) fail('write 99-closing.md first')
    s.closed = true
    log(s, 'closed')
    writeState(dir, s)
    break
  }
  case 'input': {
    const { dir } = load()
    const [name] = rest
    if (!name || !/^[a-z0-9-]+$/.test(name)) fail('usage: state.mjs input <campaign> <request|change|results|name> < text')
    const text = fs.readFileSync(0, 'utf8')
    if (!text.trim()) fail('nothing on stdin to save')
    fs.mkdirSync(path.join(dir, 'inputs'), { recursive: true })
    let file = path.join(dir, 'inputs', `${name}-${today()}.md`)
    for (let n = 2; fs.existsSync(file); n++) file = path.join(dir, 'inputs', `${name}-${today()}-${n}.md`)
    fs.writeFileSync(file, text)
    console.log(path.relative(dir, file))
    break
  }
  default:
    fail('usage: state.mjs init|list|show|next|start|check|wait|resume|reopen|close|input <campaign> …')
}
