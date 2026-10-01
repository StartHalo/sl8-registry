#!/usr/bin/env node
// The project's progress: artifacts/<project>/state.md. The only writer of that file.
//
//   state.mjs init <project> --kind review|test --goal "<their words>"
//   state.mjs list                       every project, its kind, state and next action (JSON)
//   state.mjs show <project>             the machine copy (JSON)
//   state.mjs next <project>             what runs next: {"kind":"run","skill":…,"steps":[…]} | waiting | complete | closed
//   state.mjs start <project> <step>…    mark steps in progress (S2 S3, or a range S5-S8)
//   state.mjs check <project> <step>…    check each step's definition of complete; done if it passes, else exit 1 with the gaps
//   state.mjs wait <project> <step> --reason "<what the person must do>"
//   state.mjs resume <project>           steps waiting on the person go back to not started
//   state.mjs reopen <project> <step>… --reason "<new evidence or change>"   those steps, then S9–S10, go back to not started
//   state.mjs redo <project> --from <step> --reason "<why>"   that step and every later one up to S10
//   state.mjs results <project>          results arrived: S11 comes into scope (next results version), S9–S10 re-rank after it
//   state.mjs decide <project> "<words from the decision>"   the person answered it: removes the matching open decision
//   state.mjs test <project> <slug>      checks tests/<slug>.md and records it (Design a test for one change)
//   state.mjs close <project>            needs deliverables/closing-summary.md
//   state.mjs input <project> <request|evidence|results|change|name> < text   saves to inputs/<name>-<date>.md; never overwrites
import fs from 'node:fs'
import path from 'node:path'
import {
  STEPS, SECTIONS, LIMITS, BUCKETS, CSV_COLUMNS, ROW_STATUSES, TEST_SECTIONS, ARTIFACTS, projectDir, readState, writeState, next, nextAction,
  complete, log, headings, sectionBody, sectionHashes, bullets, numbered, blocks, readSheet, deliverablesFor, deliverableDef, stepFile, fail, args, today,
} from './lib.mjs'

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
    return { project: d, kind: s.kind, goal: s.goal, state: s.closed ? 'closed' : complete(s) ? 'complete' : 'open', next: nextAction(s) }
  })
}

function stepIds (ids) {
  const out = []
  for (const id of ids) {
    const r = /^S(\d{1,2})(?:[–-]S?(\d{1,2}))?$/i.exec(id)
    if (!r || +r[1] < 1 || +(r[2] || r[1]) > 11) fail(`unknown step "${id}": use S1 … S11, or a range such as S5-S8`)
    for (let i = +r[1]; i <= +(r[2] || r[1]); i++) out.push(`S${i}`)
  }
  return out
}

const openDecisions = (text) => bullets(sectionBody(text, 'Open decisions')).filter((b) => !/^none\b/i.test(b))

function checkDeliverable (dir, rel, gaps) {
  const f = path.join(dir, rel)
  if (!fs.existsSync(f)) { gaps.push(`${rel} is missing`); return null }
  const t = fs.readFileSync(f, 'utf8')
  const def = deliverableDef(rel)
  for (const h of def.sections) if (!headings(t).has(h.toLowerCase())) gaps.push(`${rel} has no "## ${h}" section`)
  if (/see (state|status)\.md|see the step files/i.test(t)) gaps.push(`${rel} points to another file instead of standing alone`)
  return t
}

function checkSheet (dir, gaps) {
  const sheet = readSheet(dir)
  if (!sheet) { gaps.push('action-sheet.csv is missing'); return null }
  if (sheet.head.join(',') !== CSV_COLUMNS.join(',')) gaps.push(`action-sheet.csv header must be exactly: ${CSV_COLUMNS.join(',')}`)
  const { rows } = sheet
  if (!rows.length) gaps.push('action-sheet.csv has no rows')
  if (rows.length > LIMITS.rows) gaps.push(`action-sheet.csv has ${rows.length} rows (limit ${LIMITS.rows})`)
  const ids = new Set()
  rows.forEach((r, i) => {
    const at = `action-sheet.csv row ${i + 2}${r.id ? ` (${r.id})` : ''}`
    if (!r.id) gaps.push(`${at} has no id`)
    else if (ids.has(r.id)) gaps.push(`${at} repeats id ${r.id}`)
    ids.add(r.id)
    if (!BUCKETS.includes(r.bucket)) gaps.push(`${at} bucket "${r.bucket}" is not one of: ${BUCKETS.join(', ')}`)
    if (!/^[1-5]$/.test(r.stars || '')) gaps.push(`${at} stars "${r.stars}" is not 1–5`)
    if (!ROW_STATUSES.includes(r.status)) gaps.push(`${at} status "${r.status}" is not one of: ${ROW_STATUSES.join(', ')}`)
    for (const k of ['issue', 'location', 'evidence', 'action', 'how_we_know']) if (!r[k]) gaps.push(`${at} has no ${k}`)
  })
  if (rows.length >= 8 && new Set(rows.map((r) => r.stars)).size < 3) gaps.push('stars are flattened: with 8 or more rows, use at least 3 different star values')
  return ids
}

function checkStep (dir, s, id) {
  const gaps = []
  const file = stepFile(s, id)
  const fp = path.join(dir, file)
  if (!fs.existsSync(fp)) return { gaps: [`${file} is missing`] }
  const text = fs.readFileSync(fp, 'utf8')
  const hs = headings(text)
  for (const h of SECTIONS[id]) if (!hs.has(h.toLowerCase())) gaps.push(`${file} has no "## ${h}" section`)
  const open = openDecisions(text)
  if (/\[TBD\]/.test(text) && open.length === 0) gaps.push(`${file} marks something [TBD] but lists no open decision for it`)

  if (id === 'S1') {
    const pages = blocks(sectionBody(text, 'Key pages'))
    if (!pages.length) gaps.push('S1 lists no key pages (one "### <page>" each)')
    if (pages.length > LIMITS.keyPages) gaps.push(`S1 has ${pages.length} key pages (limit ${LIMITS.keyPages})`)
    for (const p of pages) if (!/https?:\/\//.test(p.body)) gaps.push(`S1 key page "${p.title}" has no URL`)
    if (blocks(sectionBody(text, 'Competitors')).length > LIMITS.competitors) gaps.push(`S1 has more than ${LIMITS.competitors} competitors`)
  }
  if (id === 'S2' && blocks(sectionBody(text, 'Issues')).length > LIMITS.technicalIssues) gaps.push(`S2 has more than ${LIMITS.technicalIssues} issues`)
  if (id === 'S3') {
    const f = blocks(sectionBody(text, 'Findings'))
    if (!f.length) gaps.push('S3 has no findings (one "### F<n> <title>" each)')
    if (f.length > LIMITS.findings) gaps.push(`S3 has ${f.length} findings (limit ${LIMITS.findings})`)
    for (const x of f) {
      if (!/^\s*-?\s*\*{0,2}Evidence:?\*{0,2}/mi.test(x.body)) gaps.push(`S3 finding "${x.title}" has no "Evidence:" line`)
      if (!/^\s*-?\s*\*{0,2}Lens:?\*{0,2}/mi.test(x.body)) gaps.push(`S3 finding "${x.title}" has no "Lens:" line`)
    }
  }
  if (['S5', 'S6', 'S7', 'S8'].includes(id)) {
    const body = sectionBody(text, SECTIONS[id][0]) || ''
    if (!body.trim()) gaps.push(`05-research.md "## ${SECTIONS[id][0]}" is empty: findings, or "not available" with its kit item`)
    else if (/not available/i.test(body) && !/\bK\d+\b/.test(body)) gaps.push(`05-research.md "## ${SECTIONS[id][0]}" says not available but names no kit item (K1 …)`)
  }
  let sheetIds = null
  if (id === 'S9') {
    sheetIds = checkSheet(dir, gaps)
    const first = numbered(sectionBody(text, 'Change first'))
    if (!first.length) gaps.push('S9 "Change first" has no numbered items')
    if (first.length > LIMITS.changeFirst) gaps.push(`S9 "Change first" has ${first.length} items (limit ${LIMITS.changeFirst})`)
    for (const item of first) {
      const m = /\[([A-Za-z]+\d+)\]/.exec(item)
      if (!m) gaps.push(`S9 change-first item "${item.slice(0, 40)}…" names no sheet id like [A3]`)
      else if (sheetIds && !sheetIds.has(m[1])) gaps.push(`S9 change-first item names ${m[1]}, which is not in action-sheet.csv`)
    }
  }
  if (id === 'S10') {
    const h = blocks(sectionBody(text, 'Hypotheses'))
    if (h.length > LIMITS.hypotheses) gaps.push(`S10 has ${h.length} hypotheses (limit ${LIMITS.hypotheses})`)
    for (const x of h) {
      if (!/we believe/i.test(x.body)) gaps.push(`S10 hypothesis "${x.title}" is not in the "We believe that doing … " form`)
      if (!/we['’]ll know/i.test(x.body)) gaps.push(`S10 hypothesis "${x.title}" has no "We'll know this when …"`)
      if (!/route:/i.test(x.body)) gaps.push(`S10 hypothesis "${x.title}" has no "Route:" line`)
    }
  }
  if (id === 'S11' && !/indicative/i.test(sectionBody(text, 'Verdicts') || '')) gaps.push('S11 verdicts are not labelled indicative')

  const outputs = [file]
  for (const rel of deliverablesFor(s, id)) {
    const t = checkDeliverable(dir, rel, gaps)
    if (t && rel.endsWith('research-kit.md')) {
      const k = blocks(sectionBody(t, 'What to run')).length
      if (k > LIMITS.kitItems) gaps.push(`research-kit.md has ${k} kit items (limit ${LIMITS.kitItems})`)
    }
    outputs.push(rel)
  }
  if (id === 'S9') outputs.splice(1, 0, 'action-sheet.csv')
  return { gaps, decisions: open, outputs, text }
}

// Section-level change log (№93): name every section that changed since the step last passed.
function trackChanges (dir, s, files) {
  s.sections ||= {}
  for (const rel of files) {
    const fp = path.join(dir, rel)
    if (!fs.existsSync(fp) || !rel.endsWith('.md')) continue
    const now = sectionHashes(fs.readFileSync(fp, 'utf8'))
    const before = s.sections[rel]
    if (before) {
      const changed = Object.keys(now).filter((k) => before[k] !== now[k])
      const gone = Object.keys(before).filter((k) => !(k in now))
      if (changed.length || gone.length) log(s, `changed ${rel}: ${[...changed, ...gone.map((g) => `${g} (removed)`)].join(', ')}`)
    }
    s.sections[rel] = now
  }
}

function addDecisions (s, id, list) {
  const own = s.decisions.filter((d) => !d.startsWith(`${id} · `))
  const seen = new Set(own.map((d) => d.replace(/^S\d+ · /, '').toLowerCase()))
  const fresh = []
  for (const d of list) { const k = d.toLowerCase(); if (!seen.has(k)) { seen.add(k); fresh.push(`${id} · ${d}`) } }
  s.decisions = own.concat(fresh)
}

function reset (s, ids, why) {
  for (const st of s.steps) if (ids.includes(st.id)) { st.status = 'not started'; st.evidence = '' }
  s.decisions = s.decisions.filter((d) => !ids.includes(d.split(' · ')[0]))
  log(s, `reopened ${ids.join(', ')}: ${why}`)
}

switch (cmd) {
  case 'init': {
    const dir = projectDir(project)
    if (readState(dir)) fail(`project "${project}" already exists; continue it, or pick a new name`)
    const kind = a.kind || 'review'
    if (!['review', 'test'].includes(kind)) fail('--kind is review or test')
    if (!a.goal || a.goal === true) fail('--goal is required, in the person\'s words')
    const s = {
      project, kind, goal: a.goal, created: today(), sheetVersion: 1, resultsVersion: 0, closed: false,
      steps: kind === 'test' ? [] : STEPS.map((d) => ({ id: d.id, name: d.name, status: d.id === 'S11' ? 'not in scope' : 'not started', evidence: d.id === 'S11' ? 'runs when results come back' : '' })),
      milestones: [], decisions: [], tests: [], sections: {}, history: [],
    }
    for (const sub of ['inputs', 'pages', 'deliverables', 'versions'].concat(kind === 'test' ? ['tests'] : [])) fs.mkdirSync(path.join(dir, sub), { recursive: true })
    log(s, `project created (${kind}): ${a.goal}`)
    writeState(dir, s)
    console.log(JSON.stringify(next(s)))
    break
  }
  case 'list': console.log(JSON.stringify(listProjects(), null, 2)); break
  case 'show': console.log(JSON.stringify(load().s, null, 2)); break
  case 'next': console.log(JSON.stringify(next(load().s))); break
  case 'start': {
    const { dir, s } = load()
    const ids = stepIds(rest)
    for (const id of ids) { const st = s.steps.find((x) => x.id === id); if (st && st.status !== 'done' && st.status !== 'not in scope') st.status = 'in progress' }
    log(s, `started ${ids.join(', ')}`)
    writeState(dir, s)
    break
  }
  case 'check': {
    const { dir, s } = load()
    let bad = 0
    for (const id of stepIds(rest)) {
      const st = s.steps.find((x) => x.id === id)
      if (!st || st.status === 'not in scope') { console.log(`– ${id}: not in scope`); continue }
      const r = checkStep(dir, s, id)
      if (r.gaps.length) {
        bad++
        st.status = 'in progress'
        st.evidence = `not complete: ${r.gaps.join('; ')}`
        console.log(`✗ ${id}: ${r.gaps.join('; ')}`)
        log(s, `${id} check failed: ${r.gaps.join('; ')}`)
      } else {
        st.status = 'done'
        st.evidence = `${r.outputs.join(', ')}: sections present${r.decisions.length ? `; ${r.decisions.length} open decision(s)` : ''}`
        addDecisions(s, id, r.decisions)
        for (const o of r.outputs.filter((o) => o.startsWith('deliverables/'))) if (!s.milestones.includes(o)) s.milestones.push(o)
        trackChanges(dir, s, r.outputs)
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
    if (s.closed) fail('the project is closed; start a new one')
    if (!a.reason || a.reason === true) fail('--reason is required: the new evidence or change')
    const ids = [...new Set(stepIds(rest).filter((i) => i !== 'S11').concat(['S9', 'S10']))]
    reset(s, ids, a.reason)
    writeState(dir, s)
    console.log(JSON.stringify(next(s)))
    break
  }
  case 'redo': {
    const { dir, s } = load()
    if (s.closed) fail('the project is closed; start a new one')
    if (!a.from || a.from === true || !a.reason || a.reason === true) fail('usage: state.mjs redo <project> --from S<n> --reason "<why>"')
    const [from] = stepIds([a.from])
    const ids = s.steps.filter((st) => +st.id.slice(1) >= +from.slice(1) && st.id !== 'S11').map((st) => st.id)
    reset(s, ids, `redo from ${from}: ${a.reason}`)
    writeState(dir, s)
    console.log(JSON.stringify(next(s)))
    break
  }
  case 'results': {
    const { dir, s } = load()
    if (s.closed) fail('the project is closed; start a new one')
    if (s.kind !== 'review') fail('results belong to a conversion review project')
    s.resultsVersion += 1
    const s11 = s.steps.find((x) => x.id === 'S11')
    s11.status = 'not started'; s11.evidence = ''
    reset(s, ['S9', 'S10'], `results v${s.resultsVersion} arrived; re-rank after reading them`)
    writeState(dir, s)
    console.log(JSON.stringify({ resultsVersion: s.resultsVersion, file: `11-results-v${s.resultsVersion}.md`, deliverable: `deliverables/M3-results-v${s.resultsVersion}.md`, next: next(s) }))
    break
  }
  case 'decide': {
    const { dir, s } = load()
    const words = rest.join(' ').trim().toLowerCase()
    if (!words) fail('usage: state.mjs decide <project> "<words from the decision>"')
    const hit = s.decisions.filter((d) => d.toLowerCase().includes(words))
    if (hit.length !== 1) fail(hit.length ? `"${words}" matches ${hit.length} decisions; use more words` : `no open decision matches "${words}"`)
    s.decisions = s.decisions.filter((d) => d !== hit[0])
    log(s, `decided: ${hit[0]}`)
    writeState(dir, s)
    console.log(hit[0])
    break
  }
  case 'test': {
    const { dir, s } = load()
    const [slug] = rest
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) fail('usage: state.mjs test <project> <slug>')
    const rel = `tests/${slug}.md`
    const fp = path.join(dir, rel)
    if (!fs.existsSync(fp)) fail(`${rel} is missing`)
    const t = fs.readFileSync(fp, 'utf8')
    const gaps = TEST_SECTIONS.filter((h) => !headings(t).has(h.toLowerCase())).map((h) => `${rel} has no "## ${h}" section`)
    if (!/we believe/i.test(sectionBody(t, 'Hypothesis') || '')) gaps.push(`${rel} hypothesis is not in the "We believe that doing … " form`)
    if (gaps.length) { console.log(`✗ ${gaps.join('; ')}`); log(s, `test ${slug} check failed`); writeState(dir, s); process.exit(1) }
    if (!s.tests.includes(slug)) s.tests.push(slug)
    trackChanges(dir, s, [rel])
    log(s, `test design written: ${rel}`)
    writeState(dir, s)
    console.log(`✓ ${rel}`)
    break
  }
  case 'close': {
    const { dir, s } = load()
    const gaps = []
    checkDeliverable(dir, 'deliverables/closing-summary.md', gaps)
    if (gaps.length) fail(`write the closing summary first: ${gaps.join('; ')}`)
    s.closed = true
    if (!s.milestones.includes('deliverables/closing-summary.md')) s.milestones.push('deliverables/closing-summary.md')
    log(s, 'closed')
    writeState(dir, s)
    break
  }
  case 'input': {
    const { dir } = load()
    const [name] = rest
    if (!name || !/^[a-z0-9-]+$/.test(name)) fail('usage: state.mjs input <project> <request|evidence|results|change|name> < text')
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
    fail('usage: state.mjs init|list|show|next|start|check|wait|resume|reopen|redo|results|decide|test|close|input <project> …')
}
