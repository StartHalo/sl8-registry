#!/usr/bin/env node
// status.mjs: the one standard project status writer (Factory v12.1, C-D2, synthesis S1; D42).
// Ships inside every bot's router, <prefix>-router/scripts/, generated from factory/standard/router/
// (until D42 it shipped in run-sl8-job). Every skill calls it as its last checklist step, from the
// router's folder beside its own: node $S/../<prefix>-router/scripts/status.mjs. It merges the
// job's record into artifacts/<project>/.status.json and rewrites
// artifacts/<project>/STATUS.md from it, so STATUS.md is never written by hand.
// Agent caller rules: no prompts, JSON on stdout, safe to re-run (same record twice = no change),
// --dry-run writes nothing, bounded output.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const HELP = `usage: node status.mjs --project <slug> --record <job.json> [--artifacts <dir>] [--dry-run]
       node status.mjs --check <STATUS.md>          completeness check of a status file
       node status.mjs --selftest
  The record is JSON: {"job","what","state":"active|waiting|closed","context":{field:value|{value,from}},
   "decisions":[{"id","text","state":"open|made","needs"}],"deliverables":[{"name","file"}],"blockers":"none"?}
  Refuses (exit 1, writes nothing) when the record says there are no blockers while a decision is open.
  Prints {"ok","project","wrote":[…],"changed":{…}}.`
const HEADINGS = ['## Stored context', '## Decisions', '## Deliverables', '## What changed last time']
const STATES = new Set(['active', 'waiting', 'closed'])
// The stamp in every STATUS.md. Files written before D42 carry the run-sl8-job stamp and still pass.
const MARK = 'the router\'s scripts/status.mjs'
const MARKS = [MARK, 'run-sl8-job/scripts/status.mjs']

const sha = f => (fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12) : null)
const today = () => new Date().toISOString().slice(0, 16).replace('T', ' ')
const key = d => (d.id ? `id:${d.id}` : `t:${String(d.text).toLowerCase().replace(/\s+/g, ' ').trim()}`)
const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')

export function merge(prev, rec, { artifactsDir, project, now = today() }) {
  const errors = []
  if (!rec || typeof rec !== 'object') return { errors: ['record is not a JSON object'] }
  if (!rec.job) errors.push('record has no "job"')
  if (rec.state && !STATES.has(rec.state)) errors.push(`state "${rec.state}" is not one of ${[...STATES].join(', ')}`)
  const store = structuredClone(prev || { project, what: '', state: 'active', context: {}, decisions: [], deliverables: [], last: null, history: [] })
  const changed = { context: [], decisionsOpened: [], decisionsClosed: [], deliverablesAdded: [], deliverablesChanged: [] }
  if (rec.what && rec.what !== store.what) store.what = rec.what
  for (const [k, v] of Object.entries(rec.context || {})) {
    const val = v && typeof v === 'object' ? v.value : v
    const from = v && typeof v === 'object' && v.from ? v.from : `job ${rec.job}`
    if (!store.context[k] || store.context[k].value !== val) { changed.context.push(k); store.context[k] = { value: val, from, since: now } }
  }
  for (const d of rec.decisions || []) {
    if (!d.text && !d.id) { errors.push('a decision has neither id nor text'); continue }
    const i = store.decisions.findIndex(x => key(x) === key(d))
    const state = d.state === 'made' ? 'made' : 'open'
    if (i < 0) { store.decisions.push({ id: d.id || null, text: d.text, state, needs: d.needs || '', since: now }); if (state === 'open') changed.decisionsOpened.push(d.text || d.id) }
    else {
      const x = store.decisions[i]
      if (x.state !== state) { if (state === 'made') changed.decisionsClosed.push(x.text || x.id); else changed.decisionsOpened.push(x.text || x.id); x.state = state; x.since = now }
      if (d.text) x.text = d.text
      if (d.needs !== undefined) x.needs = d.needs
    }
  }
  for (const d of rec.deliverables || []) {
    if (!d.file) { errors.push(`deliverable "${d.name}" has no file`); continue }
    const h = sha(path.join(artifactsDir, d.file))
    if (h === null) errors.push(`deliverable file missing: ${d.file}`)
    const i = store.deliverables.findIndex(x => x.file === d.file)
    if (i < 0) { store.deliverables.push({ name: d.name || d.file, file: d.file, date: now, job: rec.job, hash: h }); changed.deliverablesAdded.push(d.file) }
    else if (store.deliverables[i].hash !== h) { Object.assign(store.deliverables[i], { date: now, job: rec.job, hash: h }); changed.deliverablesChanged.push(d.file) }
  }
  const open = store.decisions.filter(d => d.state === 'open')
  const saysNone = rec.blockers !== undefined && (rec.blockers === 'none' || (Array.isArray(rec.blockers) && rec.blockers.length === 0))
  if (saysNone && open.length) errors.push(`the record says no blockers, but ${open.length} decision(s) are open: ${open.slice(0, 3).map(d => d.text || d.id).join('; ')}`)
  store.state = rec.state || (open.some(d => d.needs) ? 'waiting' : store.state)
  const any = Object.values(changed).some(a => a.length)
  if (any || !store.last) { store.last = { job: rec.job, at: now, changed }; store.history.push({ job: rec.job, at: now }); store.history = store.history.slice(-50) }
  return { errors, store, changed, any }
}

export function render(s) {
  const st = { active: 'active', waiting: 'waiting on you', closed: 'closed' }[s.state] || s.state
  const ch = s.last?.changed || {}
  const lines = [
    ...(ch.context || []).map(k => `- Context: \`${k}\` set to "${cell(s.context[k]?.value)}"`),
    ...(ch.decisionsOpened || []).map(t => `- Decision opened: ${t}`),
    ...(ch.decisionsClosed || []).map(t => `- Decision made: ${t}`),
    ...(ch.deliverablesAdded || []).map(f => `- Added: \`${f}\``),
    ...(ch.deliverablesChanged || []).map(f => `- Changed: \`${f}\``)]
  return `<!-- Written by ${MARK} from .status.json. Do not edit by hand. -->

# ${s.project}: status

**What this project is:** ${s.what || '(not stated yet)'}
**State:** ${st} · updated ${s.last?.at || ''} by job ${s.last?.job || ''}

## Stored context
| Field | Value | From |
|---|---|---|
${Object.entries(s.context).map(([k, v]) => `| ${cell(k)} | ${cell(v.value)} | ${cell(v.from)} |`).join('\n') || '| (none) | | |'}

## Decisions
| # | Decision | State | Since |
|---|---|---|---|
${s.decisions.map((d, i) => `| ${i + 1} | ${cell(d.text || d.id)} | ${d.state === 'open' ? `open${d.needs ? `: ${cell(d.needs)}` : ''}` : 'made'} | ${d.since} |`).join('\n') || '| | (none) | | |'}

## Deliverables
| Deliverable | File | Date | Job |
|---|---|---|---|
${s.deliverables.map(d => `| ${cell(d.name)} | \`${cell(d.file)}\` | ${d.date} | ${cell(d.job)} |`).join('\n') || '| (none) | | | |'}

## What changed last time
${lines.join('\n') || '- Nothing changed.'}
`
}

export function checkStatus(text) {
  const errors = []
  for (const h of HEADINGS) if (!text.includes(h)) errors.push(`missing heading "${h}"`)
  if (!/^\*\*State:\*\* (active|waiting on you|closed)/m.test(text)) errors.push('missing or invalid State line')
  if (!/^\*\*What this project is:\*\*/m.test(text)) errors.push('missing "What this project is"')
  if (!MARKS.some(m => text.includes(`Written by ${m}`))) errors.push('not written by the standard status script')
  return errors
}

export function run({ artifactsDir, project, record, dryRun = false, now }) {
  const dir = path.join(artifactsDir, project)
  const storeFile = path.join(dir, '.status.json')
  const prev = fs.existsSync(storeFile) ? JSON.parse(fs.readFileSync(storeFile, 'utf8')) : null
  const r = merge(prev, record, { artifactsDir, project, now })
  if (r.errors.length) return { ok: false, project, errors: r.errors, wrote: [] }
  const wrote = []
  if (!dryRun) {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(storeFile, JSON.stringify(r.store, null, 2))
    fs.writeFileSync(path.join(dir, 'STATUS.md'), render(r.store))
    wrote.push(path.join(project, 'STATUS.md'), path.join(project, '.status.json'))
  }
  return { ok: true, project, state: r.store.state, openDecisions: r.store.decisions.filter(d => d.state === 'open').length, changed: r.changed, wrote, dryRun }
}

function selftest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'status-'))
  const A = path.join(tmp, 'artifacts'); fs.mkdirSync(path.join(A, 'p'), { recursive: true })
  fs.writeFileSync(path.join(A, 'p', 'listing.md'), 'v1')
  const rec = { job: 'write-listing', what: 'Store listing for an app', state: 'active', context: { app_link: 'https://x' }, decisions: [{ id: 'd1', text: 'Choose the subtitle', state: 'open', needs: 'pick A or B' }], deliverables: [{ name: 'Store listing', file: 'p/listing.md' }] }
  const results = []
  const t = (name, ok) => results.push({ name, pass: !!ok })
  const r1 = run({ artifactsDir: A, project: 'p', record: rec, now: 'T1' })
  const md1 = fs.readFileSync(path.join(A, 'p', 'STATUS.md'), 'utf8')
  t('writes STATUS.md that passes its own check', r1.ok && checkStatus(md1).length === 0)
  t('open decision listed once', (md1.match(/Choose the subtitle/g) || []).length === 2) // table + what changed
  const r2 = run({ artifactsDir: A, project: 'p', record: rec, now: 'T2' })
  t('same record twice changes nothing', r2.ok && !Object.values(r2.changed).some(a => a.length))
  const md2 = fs.readFileSync(path.join(A, 'p', 'STATUS.md'), 'utf8')
  t('re-run keeps the file identical', md1 === md2)
  const r3 = run({ artifactsDir: A, project: 'p', record: { ...rec, blockers: 'none' }, now: 'T3' })
  t('refuses "no blockers" with an open decision', !r3.ok && /no blockers/.test(r3.errors.join()))
  fs.writeFileSync(path.join(A, 'p', 'listing.md'), 'v2')
  const r4 = run({ artifactsDir: A, project: 'p', record: { job: 'revise', decisions: [{ id: 'd1', state: 'made' }], deliverables: [{ name: 'Store listing', file: 'p/listing.md' }], blockers: 'none' }, now: 'T4' })
  t('decision made and changed deliverable are exact', r4.ok && r4.changed.decisionsClosed.length === 1 && r4.changed.deliverablesChanged[0] === 'p/listing.md' && r4.openDecisions === 0)
  const r5 = run({ artifactsDir: A, project: 'p', record: { job: 'x', deliverables: [{ name: 'gone', file: 'p/missing.md' }] }, now: 'T5' })
  t('refuses a missing deliverable file', !r5.ok)
  t('check catches a hand-written status', checkStatus('# p\n**State:** fine\n').length >= 3)
  const r6 = run({ artifactsDir: A, project: 'q', record: rec, dryRun: true })
  t('--dry-run writes nothing', r6.ok && !fs.existsSync(path.join(A, 'q')))
  t('a status written before D42 (run-sl8-job stamp) still passes its check', checkStatus(md1.replace(`Written by ${MARK}`, 'Written by run-sl8-job/scripts/status.mjs')).length === 0)
  // Skills call this script through a symlinked skills folder (run-sl8-job 1.1.0 exited silently there).
  const link = path.join(tmp, 'linked'); fs.symlinkSync(path.dirname(fileURLToPath(import.meta.url)), link)
  let viaLink = ''; try { viaLink = execFileSync(process.execPath, [path.join(link, 'status.mjs'), '--help'], { encoding: 'utf8' }) } catch {}
  t('runs when called through a symlinked folder', /usage: node status\.mjs/.test(viaLink))
  fs.rmSync(tmp, { recursive: true, force: true })
  const failed = results.filter(r => !r.pass)
  process.stdout.write(JSON.stringify({ ok: !failed.length, cases: results.length, failed }, null, 2) + '\n')
  process.exit(failed.length ? 1 : 0)
}

// Compare real paths: skills call this script through a symlinked skills folder.
const real = p => { try { return fs.realpathSync(p) } catch { return path.resolve(p) } }
if (process.argv[1] && real(fileURLToPath(import.meta.url)) === real(process.argv[1])) {
  const argv = process.argv.slice(2)
  const opt = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null)
  const out = (o, c) => { process.stdout.write(JSON.stringify(o, null, 2) + '\n'); process.exit(c) }
  if (argv.includes('--help') || argv.includes('-h')) { process.stdout.write(HELP + '\n'); process.exit(0) }
  if (argv.includes('--selftest')) selftest()
  if (opt('--check')) { const f = opt('--check'); if (!fs.existsSync(f)) out({ ok: false, errors: [`missing: ${f}`] }, 2); const e = checkStatus(fs.readFileSync(f, 'utf8')); out({ ok: !e.length, errors: e }, e.length ? 1 : 0) }
  const project = opt('--project'), recFile = opt('--record')
  if (!project || !recFile) out({ ok: false, errors: ['need --project and --record; see --help'] }, 2)
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(project)) out({ ok: false, errors: [`project "${project}" must be a plain folder name`] }, 2)
  if (!fs.existsSync(recFile)) out({ ok: false, errors: [`missing record ${recFile}`] }, 2)
  let record; try { record = JSON.parse(fs.readFileSync(recFile, 'utf8')) } catch (e) { out({ ok: false, errors: [`record is not JSON: ${e.message}`] }, 2) }
  const res = run({ artifactsDir: opt('--artifacts') || 'artifacts', project, record, dryRun: argv.includes('--dry-run') })
  out(res, res.ok ? 0 : 1)
}
