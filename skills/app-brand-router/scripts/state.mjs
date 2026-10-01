#!/usr/bin/env node
// The brand project's progress: artifacts/<project>/state.md. The only writer of that file.
//
//   state.mjs init <project> --goal "<words>" --trigger "<launch|rebrand|refresh|inconsistent|audit|…>" [--touchpoints "store listing, onboarding, …"]
//   state.mjs list                       every project, its state and next action (JSON)
//   state.mjs show <project>             the machine copy (JSON)
//   state.mjs next <project>             what runs next: {"kind":"run","skill":…,"steps":[…]} | waiting | complete | closed
//   state.mjs start <project> <step>…    mark steps in progress
//   state.mjs check <project> <step>…    check each step's definition of complete; done if it passes, else exit 1 with the gaps
//   state.mjs wait <project> <step> --reason "<what the person must do>"
//   state.mjs resume <project>           steps waiting on the person go back to not started
//   state.mjs reopen <project> <step> --reason "<why>"   that step and every later one go back to not started;
//                                        their files are kept so the check can see what changed
//   state.mjs piece <project> <name>     check touchpoints/<name>.md (an Apply job) and record it
//   state.mjs review <project> [<date>]  check reviews/<date>.md and deliverables/M4-review-<date>.md and record them
//   state.mjs close <project>            needs 99-closing.md
//   state.mjs input <project> <request|change|material|file-name> < text   saves to inputs/<name>-<date>.md; never overwrites
import fs from 'node:fs'
import path from 'node:path'
import {
  STEPS, SECTIONS, PIECE_SECTIONS, REVIEW_SECTIONS, DELIVERABLE_SECTIONS, TOUCHPOINTS, DEFAULT_TOUCHPOINTS, ARTIFACTS,
  projectDir, readState, writeState, next, nextAction, complete, log, headings, sections, sectionBody, bullets, deliverablesFor, fail, args, today,
} from './lib.mjs'
import { checkFields } from './fields.mjs'

const a = args(process.argv.slice(2))
const [cmd, project, ...rest] = a._

function load () {
  const dir = projectDir(project)
  const s = readState(dir)
  if (!s) fail(`no project "${project}" (no ${dir}/state.md). Known: ${listProjects().map((p) => p.project).join(', ') || 'none'}`)
  return { dir, s }
}

function listProjects () {
  if (!fs.existsSync(ARTIFACTS)) return []
  return fs.readdirSync(ARTIFACTS).filter((d) => fs.existsSync(path.join(ARTIFACTS, d, 'state.md'))).map((d) => {
    const s = readState(path.join(ARTIFACTS, d))
    return { project: d, goal: s.goal, state: s.closed ? 'closed' : complete(s) ? 'complete' : 'open', hasBrandBook: fs.existsSync(path.join(ARTIFACTS, d, 'brand-book.md')), next: nextAction(s) }
  })
}

function stepIds (ids) {
  const out = []
  for (const id of ids) {
    const r = /^S([1-5])(?:[–-]S?([1-5]))?$/i.exec(id)
    if (!r) fail(`unknown step "${id}": use S1 … S5, or a range such as S3-S5`)
    for (let i = +r[1]; i <= +(r[2] || r[1]); i++) out.push(`S${i}`)
  }
  return out
}

function parseTouchpoints (v) {
  if (!v || v === true) return [...DEFAULT_TOUCHPOINTS]
  const list = String(v).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  const bad = list.filter((t) => !TOUCHPOINTS[t])
  if (bad.length) fail(`unknown touchpoint(s): ${bad.join(', ')}. Touchpoints are places people meet the brand: ${Object.keys(TOUCHPOINTS).join(', ')}`)
  return list
}

const countH3 = (text, sec) => (sectionBody(text, sec) || '').split('\n').filter((l) => /^###\s+/.test(l)).length
const openOf = (text) => bullets(sectionBody(text, 'Open decisions')).filter((b) => !/^none\b/i.test(b))

// The sections of a rewritten file that differ from the kept copy must each be named in its
// "## What changed" section (№93). Bookkeeping sections are left out of the comparison.
function changeGaps (file, prevFile, text) {
  if (!prevFile || !fs.existsSync(prevFile)) return []
  const before = sections(fs.readFileSync(prevFile, 'utf8'))
  const after = sections(text)
  const skip = new Set(['what changed', 'open decisions'])
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((h) => !skip.has(h) && (before[h] ?? null) !== (after[h] ?? null))
  if (!changed.length) return []
  const note = (after['what changed'] || '').toLowerCase()
  if (!note) return [`${path.basename(file)} changed (${changed.join(', ')}) but has no "## What changed" section`]
  const missing = changed.filter((h) => !note.includes(h))
  return missing.length ? [`${path.basename(file)} "What changed" doesn't name these changed sections: ${missing.join(', ')}`] : []
}

function checkDeliverable (dir, rel, gaps, outputs) {
  const f = path.join(dir, rel)
  if (!fs.existsSync(f)) { gaps.push(`${rel} is missing`); return }
  const t = fs.readFileSync(f, 'utf8')
  const need = rel.startsWith('deliverables/') ? DELIVERABLE_SECTIONS : ['Assumptions', 'Tokens']
  for (const h of need) if (!headings(t).has(h.toLowerCase())) gaps.push(`${rel} has no "## ${h}" section`)
  if (/see state\.md/i.test(t)) gaps.push(`${rel} points to state.md instead of standing alone`)
  outputs.push(rel)
}

function checkStep (dir, s, id) {
  const def = STEPS.find((d) => d.id === id)
  const gaps = []
  const file = path.join(dir, def.file)
  if (!fs.existsSync(file)) return { gaps: [`${def.file} is missing`] }
  const text = fs.readFileSync(file, 'utf8')
  const hs = headings(text)
  const need = id === 'S4' ? [...s.touchpoints.map((t) => TOUCHPOINTS[t]), ...SECTIONS.S4] : SECTIONS[id]
  for (const h of need) if (!hs.has(h.toLowerCase())) gaps.push(`${def.file} has no "## ${h}" section`)
  const open = openOf(text)
  if (/\[TBD\]/.test(text) && open.length === 0) gaps.push(`${def.file} marks something [TBD] but lists no open decision for it`)
  if (id === 'S1') {
    const c = countH3(text, 'Competitors')
    if (c > 5) gaps.push(`more than 5 competitors in S1 (limit 5; one "### " each)`)
    if (c === 0) gaps.push('S1 has no competitors (one "### <name>" each under Competitors)')
    if (bullets(sectionBody(text, 'Key findings')).length > 5) gaps.push('more than 5 key findings in S1 (limit 5)')
  }
  if (id === 'S3') {
    const v = countH3(text, 'Voice')
    if (v < 3 || v > 5) gaps.push(`S3 has ${v} voice attributes (3–5, one "### <attribute>, not <opposite>" each)`)
    const da = bullets(sectionBody(text, 'Distinctive assets')).length
    if (da < 3 || da > 5) gaps.push(`S3 has ${da} distinctive assets (3–5 bullets)`)
    if (!/#[0-9a-f]{6}\b/i.test(sectionBody(text, 'Palette') || '')) gaps.push('S3 palette has no hex colours')
  }
  if (id === 'S4' && s.touchpoints.includes('store listing')) gaps.push(...checkFields(text).gaps)
  const prev = s.prev?.[id] ? path.join(dir, s.prev[id]) : null
  gaps.push(...changeGaps(file, prev, text))
  const decisions = [...open, ...(id === 'S2' ? bullets(sectionBody(text, 'Decisions for you')) : [])]
  const outputs = [def.file]
  for (const rel of deliverablesFor(id)) checkDeliverable(dir, rel, gaps, outputs)
  return { gaps, decisions, outputs }
}

function record (dir, s, outputs, decisions, prefix, what, drop = `${prefix} · `) {
  for (const o of outputs.filter((o) => o.startsWith('deliverables/') || o.startsWith('touchpoints/'))) if (!s.milestones.includes(o)) s.milestones.push(o)
  s.decisions = s.decisions.filter((d) => !d.startsWith(drop)).concat(decisions.map((d) => `${prefix} · ${d}`))
  log(s, what)
  writeState(dir, s)
}

switch (cmd) {
  case 'init': {
    const dir = projectDir(project)
    if (readState(dir)) fail(`project "${project}" already exists; continue it, or pick a new name`)
    if (!a.goal || a.goal === true) fail('--goal is required, in the person\'s words')
    const s = {
      project, goal: a.goal, trigger: a.trigger === true ? '' : (a.trigger || 'not given'), touchpoints: parseTouchpoints(a.touchpoints),
      created: today(), bookVersion: 1, closed: false, prev: {},
      steps: STEPS.map((d) => ({ id: d.id, name: d.name, status: 'not started', evidence: '' })),
      milestones: [], decisions: [], history: [],
    }
    for (const sub of ['inputs', 'deliverables', 'versions']) fs.mkdirSync(path.join(dir, sub), { recursive: true })
    log(s, `project created: ${a.goal}`)
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
        writeState(dir, s)
      } else {
        st.status = 'done'
        st.evidence = `${r.outputs.join(', ')}: sections present${r.decisions.length ? `; ${r.decisions.length} open decision(s)` : ''}`
        if (s.prev) delete s.prev[id]
        record(dir, s, r.outputs, r.decisions, id, `${id} done`)
        console.log(`✓ ${id}: ${st.evidence}`)
      }
    }
    process.exit(bad ? 1 : 0)
  }
  case 'wait': {
    const { dir, s } = load()
    const [id] = stepIds(rest)
    if (!a.reason || a.reason === true) fail('--reason is required: what the person must do')
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
    if (s.closed) fail('the project is closed; start a new one')
    if (!a.reason || a.reason === true) fail('--reason is required')
    const from = +id.slice(1)
    s.prev = s.prev || {}
    fs.mkdirSync(path.join(dir, 'versions', 'steps'), { recursive: true })
    for (const st of s.steps) {
      if (+st.id.slice(1) < from) continue
      const def = STEPS.find((d) => d.id === st.id)
      const f = path.join(dir, def.file)
      if (fs.existsSync(f) && !s.prev[st.id]) {
        let keep = path.join('versions', 'steps', def.file.replace(/\.md$/, `-before-${today()}.md`))
        for (let n = 2; fs.existsSync(path.join(dir, keep)); n++) keep = path.join('versions', 'steps', def.file.replace(/\.md$/, `-before-${today()}-${n}.md`))
        fs.copyFileSync(f, path.join(dir, keep))
        s.prev[st.id] = keep
      }
      st.status = 'not started'
      st.evidence = ''
    }
    s.decisions = s.decisions.filter((d) => !/^S\d/.test(d) || +d.slice(1, 2) < from)
    log(s, `reopened from ${id}: ${a.reason}`)
    writeState(dir, s)
    console.log(JSON.stringify(next(s)))
    break
  }
  case 'piece': {
    const { dir, s } = load()
    const [name] = rest
    if (!name || !/^[a-z0-9-]+$/.test(name)) fail('usage: state.mjs piece <project> <name>  (touchpoints/<name>.md)')
    const rel = `touchpoints/${name}.md`
    const f = path.join(dir, rel)
    if (!fs.existsSync(f)) fail(`${rel} is missing`)
    const text = fs.readFileSync(f, 'utf8')
    const gaps = PIECE_SECTIONS.filter((h) => !headings(text).has(h.toLowerCase())).map((h) => `${rel} has no "## ${h}" section`)
    if (headings(text).has('store listing')) gaps.push(...checkFields(text).gaps)
    if (gaps.length) { console.log(`✗ ${rel}: ${gaps.join('; ')}`); process.exit(1) }
    record(dir, s, [rel], openOf(text).map((d) => `${name}: ${d}`), 'P', `piece ${name} written`, `P · ${name}: `)
    console.log(`✓ ${rel}`)
    break
  }
  case 'review': {
    const { dir, s } = load()
    const date = rest[0] || today()
    const rel = `reviews/${date}.md`
    const gaps = []
    const outputs = []
    if (!fs.existsSync(path.join(dir, rel))) gaps.push(`${rel} is missing`)
    else {
      const text = fs.readFileSync(path.join(dir, rel), 'utf8')
      for (const h of REVIEW_SECTIONS) if (!headings(text).has(h.toLowerCase())) gaps.push(`${rel} has no "## ${h}" section`)
    }
    checkDeliverable(dir, `deliverables/M4-review-${date}.md`, gaps, outputs)
    if (gaps.length) { console.log(`✗ review: ${gaps.join('; ')}`); process.exit(1) }
    record(dir, s, outputs, [], 'R', `review ${date} written`)
    console.log(`✓ ${rel}, ${outputs.join(', ')}`)
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
    if (!name || !/^[a-z0-9-]+$/.test(name)) fail('usage: state.mjs input <project> <request|change|material|name> < text')
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
    fail('usage: state.mjs init|list|show|next|start|check|wait|resume|reopen|piece|review|close|input <project> …')
}
