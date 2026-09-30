#!/usr/bin/env node
// The project's progress: artifacts/<project>/state.md. The only writer of that file.
//
//   state.mjs init <project> --kind plan|campaign --goal "<words>" --trigger "<quarter|stalled growth|launch|…>" [--parent <plan project>]
//   state.mjs list                       every project, its kind, state and next action (JSON)
//   state.mjs show <project>             the machine copy (JSON)
//   state.mjs next <project>             what runs next: {"kind":"run","skill":…,"steps":[…]} | waiting | complete | closed
//   state.mjs start <project> <step>…    mark steps in progress
//   state.mjs check <project> <step>…    check each step's definition of complete; done if it passes, else exit 1 with the gaps
//   state.mjs wait <project> <step> --reason "<what the person must do>"
//   state.mjs resume <project>           steps waiting on the person go back to not started
//   state.mjs reopen <project> <step> --reason "<why>"   that step and every later one go back to not started
//   state.mjs close <project>            needs 99-closing.md
//   state.mjs input <project> <request|change|results|file-name> < text   saves to inputs/<name>-<date>.md; never overwrites (adds -2, -3 …)
import fs from 'node:fs'
import path from 'node:path'
import { STEPS, SECTIONS, DELIVERABLE_SECTIONS, ARTIFACTS, projectDir, readState, writeState, next, nextAction, complete, log, headings, sectionBody, bullets, deliverablesFor, fail, args, today } from './lib.mjs'

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
    const r = /^S([1-6])(?:[–-]S?([1-6]))?$/i.exec(id)
    if (!r) fail(`unknown step "${id}": use S1 … S6, or a range such as S4-S6`)
    for (let i = +r[1]; i <= +(r[2] || r[1]); i++) out.push(`S${i}`)
  }
  return out
}

function checkStep (dir, s, id) {
  const def = STEPS.find((d) => d.id === id)
  const gaps = []
  const file = path.join(dir, def.file)
  if (!fs.existsSync(file)) return { gaps: [`${def.file} is missing`] }
  const text = fs.readFileSync(file, 'utf8')
  const hs = headings(text)
  for (const h of SECTIONS[id]) if (!hs.has(h.toLowerCase())) gaps.push(`${def.file} has no "## ${h}" section`)
  const open = bullets(sectionBody(text, 'Open decisions')).filter((b) => !/^none\b/i.test(b))
  if (/\[TBD\]/.test(text) && open.length === 0) gaps.push(`${def.file} marks something [TBD] but lists no open decision for it`)
  const count = (sec) => (sectionBody(text, sec) || '').split('\n').filter((l) => /^###\s+/.test(l)).length
  if (id === 'S1' && count('Competitors') > 5) gaps.push('more than 5 competitors in S1 (limit 5)')
  if (id === 'S1' && bullets(sectionBody(text, 'Key findings')).length > 5) gaps.push('more than 5 key findings in S1 (limit 5)')
  if (id === 'S2' && count('Objectives') > 3) gaps.push('more than 3 objectives in S2 (limit 3)')
  if (id === 'S2' && count('Objectives') === 0) gaps.push('S2 has no objectives (each one a "### " heading under Objectives)')
  if (id === 'S4' && bullets(sectionBody(text, 'Channels to test')).length > 3) gaps.push('more than 3 test channels in S4 (limit 3)')
  const decisions = [...open, ...(id === 'S3' ? bullets(sectionBody(text, 'Decisions for you')) : [])]
  const outputs = [def.file]
  for (const rel of deliverablesFor(s, id)) {
    const f = path.join(dir, rel)
    if (!fs.existsSync(f)) { gaps.push(`${rel} is missing`); continue }
    const t = fs.readFileSync(f, 'utf8')
    const need = rel.startsWith('deliverables/') ? DELIVERABLE_SECTIONS : ['Assumptions']
    for (const h of need) if (!headings(t).has(h.toLowerCase())) gaps.push(`${rel} has no "## ${h}" section`)
    if (/see state\.md/i.test(t)) gaps.push(`${rel} points to state.md instead of standing alone`)
    outputs.push(rel)
  }
  return { gaps, decisions, outputs }
}

switch (cmd) {
  case 'init': {
    const dir = projectDir(project)
    if (readState(dir)) fail(`project "${project}" already exists; continue it, or pick a new name`)
    const kind = a.kind || 'plan'
    if (!['plan', 'campaign'].includes(kind)) fail('--kind is plan or campaign')
    if (!a.goal || a.goal === true) fail('--goal is required, in the person\'s words')
    if (a.parent && !readState(projectDir(a.parent))) fail(`--parent "${a.parent}" is not a project`)
    const s = {
      project, kind, goal: a.goal, trigger: a.trigger === true ? '' : (a.trigger || 'not given'), parent: a.parent || null,
      created: today(), planVersion: 1, closed: false,
      steps: STEPS.map((d) => ({ id: d.id, name: d.name, status: 'not started', evidence: '' })),
      milestones: [], decisions: [], history: [],
    }
    for (const sub of ['inputs', 'deliverables', 'versions']) fs.mkdirSync(path.join(dir, sub), { recursive: true })
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
        st.evidence = `${r.outputs.join(', ')}: sections present${r.decisions.length ? `; ${r.decisions.length} open decision(s)` : ''}`
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
    for (const st of s.steps) if (+st.id.slice(1) >= from) { st.status = 'not started'; st.evidence = '' }
    s.decisions = s.decisions.filter((d) => +d.slice(1, 2) < from)
    log(s, `reopened from ${id}: ${a.reason}`)
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
    if (!name || !/^[a-z0-9-]+$/.test(name)) fail('usage: state.mjs input <project> <request|change|results|name> < text')
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
    fail('usage: state.mjs init|list|show|next|start|check|wait|resume|reopen|close|input <project> …')
}
