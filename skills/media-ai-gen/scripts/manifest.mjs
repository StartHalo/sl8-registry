#!/usr/bin/env node
// manifest.mjs: the project manifest, artifacts/<project>/manifest.json (sl8.media.manifest/1). HR9.
//   init   --project P                         create artifacts/P/ and work/P/ and an empty manifest
//   add    --project P --json '<row>' [--json-file F] [--result R.json] [--params P.json]
//          one row per generation: hashes every file, fills endpoint/request id/files/credits from an
//          ai-gen result envelope, refuses a third attempt on one route (HR7). Same request id = update.
//   verify --project P                         re-hash every file; exit 1 on a missing or changed file
//   budget [--project P]                       ceiling, ledger spend, remaining, pending async jobs
//   waive  --project P --rule HRn --instruction TEXT [--cost TEXT] [--item I]   (HR20)
// Options: --artifacts DIR (default ./artifacts), --work DIR (default ./work).
// Exit: 0 ok · 1 check failed · 2 usage. Node >= 20, no dependencies.
import fs from 'node:fs'; import path from 'node:path'
import { createHash } from 'node:crypto'; import { pathToFileURL } from 'node:url'

export const SCHEMA = 'sl8.media.manifest/1'
export class Fail extends Error { constructor (msg, code = 1) { super(msg); this.code = code } }
export function parseArgs (argv) { // --key value pairs; a bare --flag is true
  const o = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const v = argv[i + 1]
    if (!a.startsWith('--')) o._.push(a); else if (v === undefined || v.startsWith('--')) o[a.slice(2)] = true; else { o[a.slice(2)] = v; i++ }
  }
  return o
}
export function projectDir (o) {
  const p = o.project
  if (typeof p !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(p)) throw new Fail('--project must be a kebab-case name', 2)
  return path.resolve(o.artifacts ?? 'artifacts', p)
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
// One writer at a time: fan-out jobs may add rows concurrently.
export function withLock (dir, fn) {
  const lock = path.join(dir, '.manifest.lock')
  for (let i = 0; ; i++) {
    try { fs.mkdirSync(lock); break } catch (e) {
      if (e.code !== 'EEXIST') throw e
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 30000) { fs.rmSync(lock, { recursive: true, force: true }); continue } } catch {}
      if (i > 200) throw new Fail(`manifest is locked: ${lock}`)
      sleep(50)
    }
  }
  try { return fn() } finally { fs.rmSync(lock, { recursive: true, force: true }) }
}

export function load (dir) {
  const f = path.join(dir, 'manifest.json')
  if (!fs.existsSync(f)) throw new Fail(`no manifest at ${f}: run manifest.mjs init --project <p> first`)
  const m = JSON.parse(fs.readFileSync(f, 'utf8'))
  if (m.schema !== SCHEMA) throw new Fail(`${f}: schema is ${m.schema}, expected ${SCHEMA}`)
  return m
}
export function save (dir, m) {
  m.updated_at = new Date().toISOString()
  const f = path.join(dir, 'manifest.json'); const tmp = `${f}.tmp-${process.pid}`
  fs.writeFileSync(tmp, JSON.stringify(m, null, 2) + '\n'); fs.renameSync(tmp, f)
}
export function init (o) {
  const dir = projectDir(o)
  fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(path.resolve(o.work ?? 'work', o.project), { recursive: true })
  const f = path.join(dir, 'manifest.json')
  if (fs.existsSync(f)) { load(dir); return { ok: true, manifest: f, created: false } }
  const now = new Date().toISOString()
  save(dir, { schema: SCHEMA, project: o.project, created_at: now, updated_at: now, assets: [], gates: [], waivers: [] })
  return { ok: true, manifest: f, created: true }
}

const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { throw new Fail(`cannot read JSON ${f}: ${e.message}`, 2) } }
function fileEntry (dir, p) {
  const abs = [path.resolve(p), path.resolve(dir, p)].find((c) => fs.existsSync(c))
  if (!abs) throw new Fail(`file not found: ${p}`)
  const rel = path.relative(dir, abs)
  return { path: rel.startsWith('..') || path.isAbsolute(rel) ? abs : rel.split(path.sep).join('/'), sha256: sha(abs), bytes: fs.statSync(abs).size }
}

// Credits the spend ledger records for one request id (null when absent or unpriced).
export function ledgerCredits (requestId, env = process.env) {
  const f = env.SL8_SPEND_LEDGER
  if (!requestId || !f || !fs.existsSync(f)) return undefined
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    try { const e = JSON.parse(line); if (e.request_id === requestId) return e.credits_used ?? null } catch {}
  }
  return undefined
}

export function add (o) {
  const dir = projectDir(o)
  let row = o['json-file'] ? readJson(o['json-file']) : o.json ? JSON.parse(o.json) : {}
  if (o.result) { // an ai-gen envelope: --format json result, or the {request_id, model} of --async
    const env = readJson(o.result)
    if (env.success === false) throw new Fail(`--result is an error envelope (${env.error?.code}); record the failure with status "failed"`)
    row = { endpoint: env.model, request_id: env.request_id ?? null, mode: env.request_id ? (env.files ? 'queue' : 'async') : 'sync', ...row }
    if (env.files && !row.files) row.files = env.files.map((x) => x.local_path).filter(Boolean)
    if (env.text !== undefined && row.text === undefined) row.text = env.text
    row.credits = { ...(row.credits ?? {}) }
    if (env.credits_used !== undefined && row.credits.used === undefined) row.credits.used = env.credits_used
    if (env.credits_basis && !row.credits.basis) row.credits.basis = env.credits_basis
    if (env.files && !row.status) row.status = 'done'
  }
  if (o.params) { row.params = row.params ?? readJson(o.params); row.params_file = row.params_file ?? o.params }
  if (row.prompt === undefined && typeof row.params?.prompt === 'string') row.prompt = row.params.prompt
  return withLock(dir, () => {
    const m = load(dir)
    const idx = row.request_id ? m.assets.findIndex((a) => a.request_id === row.request_id) : -1
    if (idx >= 0) row = { ...m.assets[idx], ...row, mode: m.assets[idx].mode ?? row.mode, credits: { ...m.assets[idx].credits, ...row.credits } }
    const problems = []
    for (const k of ['item', 'node', 'declared']) if (row[k] === undefined) problems.push(`${k} is required`)
    if (!row.endpoint && !row.tool) problems.push('endpoint (generation) or tool (local step) is required')
    if (row.endpoint) {
      if (typeof row.params !== 'object' || row.params === null) problems.push('params is required for a generation (use --params)')
      if (!row.credits || !('estimate' in row.credits)) problems.push('credits.estimate is required (null if unpriced, HR5)')
      if (!('request_id' in row)) problems.push('request_id is required (null only for a sync call)')
    }
    row.status = row.status ?? 'done'
    if (!['done', 'pending', 'failed', 'rejected', 'accepted'].includes(row.status)) problems.push(`status '${row.status}' unknown`)
    const files = row.files ?? []
    if (!files.length && !['pending', 'failed'].includes(row.status)) problems.push('files is empty (allowed only for pending or failed rows)')
    const prior = m.assets.filter((a, i) => a.item === row.item && i !== idx)
    if (idx < 0) {
      const attempt = row.attempt ?? prior.length + 1
      if (prior.some((a) => a.attempt === attempt)) problems.push(`item ${row.item} already has attempt ${attempt}`)
      if (attempt > 1 && !row.lever) problems.push('a retry must name the lever it moved (HR7)')
      const sameRoute = prior.filter((a) => (a.endpoint ?? a.tool) === (row.endpoint ?? row.tool)).length
      if (sameRoute >= 2 && !row.waiver) problems.push(`third attempt on ${row.endpoint ?? row.tool} for ${row.item}: go to the fallback route or a gate (HR7)`)
      row.attempt = attempt
    }
    if (problems.length) throw new Fail(problems.join('; '))
    row.files = files.map((f) => fileEntry(dir, typeof f === 'string' ? f : f.path))
    if (row.credits && row.credits.ledger === undefined) { const c = ledgerCredits(row.request_id); if (c !== undefined) row.credits.ledger = c }
    row.id = row.id ?? `${row.item}#${row.attempt}`
    row.at = new Date().toISOString()
    if (row.waiver) m.waivers.push({ rule: 'HR7', item: row.item, instruction: row.waiver, at: row.at })
    if (idx >= 0) m.assets[idx] = row; else m.assets.push(row)
    save(dir, m)
    return { ok: true, id: row.id, attempt: row.attempt, status: row.status, updated: idx >= 0, files: row.files }
  })
}

export function verify (o) {
  const dir = projectDir(o); const m = load(dir); const lines = []; let bad = 0; let n = 0; let est = 0; let led = 0
  for (const a of m.assets) {
    for (const f of a.files ?? []) {
      n++
      const abs = path.resolve(dir, f.path)
      if (!fs.existsSync(abs)) { bad++; lines.push(`FAIL ${a.id} missing ${f.path}`); continue }
      const h = sha(abs)
      if (h !== f.sha256) { bad++; lines.push(`FAIL ${a.id} changed ${f.path} sha256 ${h.slice(0, 12)} != ${f.sha256.slice(0, 12)}`) }
    }
    if (a.status === 'pending') lines.push(`WARN ${a.id} pending: fetch it with ai-gen result ${a.request_id}`)
    est += a.credits?.estimate ?? 0; led += a.credits?.ledger ?? a.credits?.used ?? 0
  }
  const open = (m.gates ?? []).filter((g) => g.status === 'open').length
  lines.push(`rows ${m.assets.length} · files ${n} · changed or missing ${bad} · credits estimate ${est} · charged ${led} · open gates ${open} · waivers ${m.waivers.length}`)
  return { code: bad ? 1 : 0, text: lines.join('\n') }
}

export function budget (o, env = process.env) {
  const ceiling = env.SL8_SPEND_CEILING?.trim() ? Number(env.SL8_SPEND_CEILING) : null
  let spent = 0; let calls = 0; let unpriced = 0; const seen = new Set()
  const f = env.SL8_SPEND_LEDGER
  if (f && fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      let e; try { e = JSON.parse(line) } catch { continue }
      if (e.request_id) { if (seen.has(e.request_id)) continue; seen.add(e.request_id) }
      calls++; if (typeof e.credits_used === 'number') spent += e.credits_used; else unpriced++
    }
  }
  const out = { ceiling, spent: Math.round(spent * 100) / 100, remaining: ceiling === null || !Number.isFinite(ceiling) ? null : Math.max(0, Math.round((ceiling - spent) * 100) / 100), calls, unpriced, ledger: f ?? null }
  if (o.project) out.pending_async = load(projectDir(o)).assets.filter((a) => a.status === 'pending').map((a) => a.request_id)
  out.notes = []
  if (out.remaining === null) out.notes.push('SL8_SPEND_CEILING is unset: the brief budget is the only cap')
  if (unpriced) out.notes.push(`${unpriced} ledger call(s) have no price and count 0: the cap cannot see them`)
  return out
}

export function waive (o) {
  const dir = projectDir(o)
  if (!o.rule || !o.instruction) throw new Fail('waive needs --rule HRn and --instruction "<the user\'s words>"', 2)
  return withLock(dir, () => {
    const m = load(dir)
    const w = { rule: o.rule, instruction: o.instruction, cost: o.cost ?? null, item: o.item ?? null, at: new Date().toISOString() }
    m.waivers.push(w); save(dir, m); return { ok: true, waiver: w }
  })
}

function main () {
  const [cmd, ...rest] = process.argv.slice(2); const o = parseArgs(rest)
  try {
    if (cmd === 'init') console.log(JSON.stringify(init(o)))
    else if (cmd === 'add') console.log(JSON.stringify(add(o)))
    else if (cmd === 'verify') { const r = verify(o); console.log(r.text); process.exitCode = r.code }
    else if (cmd === 'budget') console.log(JSON.stringify(budget(o), null, 2))
    else if (cmd === 'waive') console.log(JSON.stringify(waive(o)))
    else throw new Fail('usage: manifest.mjs init|add|verify|budget|waive --project <p> …', 2)
  } catch (e) { console.error(`manifest.mjs: ${e.message}`); process.exitCode = e.code ?? 1 }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
