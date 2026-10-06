#!/usr/bin/env node
// gate.mjs: gate files for headless jobs (HR12). A spend the brief did not approve stops the job as
// `partial` with the question written down; the next job of the same project reads the answer and resumes.
//   open   --project P --slug S --question Q --options JSON --resume-at STEP [--quote N] [--kind spend|text]
//          writes artifacts/P/gates/NN-S.json + .md, indexes it in the manifest; a spend gate (the default kind)
//          also writes artifacts/P/outcome.json partial, a text gate needs --default and prints proceed_with
//   answer --project P --gate NN --option ID [--by WHO]   refused (exit 1) for a spend gate opened by this same
//          job run (SL8_SPEND_LEDGER): a job never answers its own spend gate (HR12, 1.0.2)
//   status --project P          exit 10 while a spend gate is open and unanswered · 0 otherwise. An open text
//          gate never stops a job (it proceeds on its default, HR12): it is listed under open_text, exit 0
//   waive  --project P --gate NN --instruction TEXT     the user's explicit instruction (HR20)
// Options: --artifacts DIR (default ./artifacts), --outcome FILE (default <artifacts>/P/outcome.json, which persists).
// --options is a JSON array: [{"id":"a","label":"Render 2 clips at 480p","credits":216}, …].
// Exit: 0 ok · 1 refused · 2 usage · 10 open spend gate (status only). Node >= 20, no dependencies.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Fail, parseArgs, projectDir, init, load, save, withLock, budget } from './manifest.mjs'

export const GATE_SCHEMA = 'sl8.media.gate/1'
const gatesDir = (dir) => path.join(dir, 'gates')

function listGates (dir) {
  const g = gatesDir(dir)
  if (!fs.existsSync(g)) return []
  return fs.readdirSync(g).filter((f) => /^\d{2}-.+\.json$/.test(f)).sort()
    .map((f) => ({ file: path.join(g, f), ...JSON.parse(fs.readFileSync(path.join(g, f), 'utf8')) }))
}

function findGate (dir, nn) {
  const id = String(nn).padStart(2, '0')
  const gate = listGates(dir).find((x) => x.id === id)
  if (!gate) throw new Fail(`no gate ${id} in ${gatesDir(dir)}`, 2)
  return gate
}

function render (g) {
  const rows = g.options.map((x) => `| ${x.id} | ${x.label} | ${x.credits ?? '—'} |`).join('\n')
  const answer = g.answer ? `\n**Answer:** option ${g.answer.option}${g.answer.by ? ` (${g.answer.by})` : ''}, ${g.answer.at}\n` : ''
  const waiver = g.waiver ? `\n**Waived:** "${g.waiver.instruction}", ${g.waiver.at}\n` : ''
  return `# Gate ${g.id} · ${g.slug}\n\n**Status:** ${g.status} · **Kind:** ${g.kind} · **Opened:** ${g.opened_at}\n\n` +
    `**Question:** ${g.question}\n\n| Option | What happens | Credits |\n|---|---|---|\n${rows}\n\n` +
    `**Quote:** ${g.quote?.credits ?? '—'} credits for the next step` +
    (g.quote?.remaining != null ? ` (run budget remaining: ${g.quote.remaining})` : '') + '\n\n' +
    `**No answer:** ${g.no_answer === 'stop' ? 'stop. Nothing further is spent; the work so far is delivered.' : `proceed with option ${g.default}.`}\n\n` +
    `**Resume at:** ${g.resume_at}\n${answer}${waiver}\nTo answer, reply with an option id.\n`
}

function write (dir, g) {
  const base = path.join(gatesDir(dir), `${g.id}-${g.slug}`)
  const { file, ...body } = g
  fs.writeFileSync(`${base}.json`, JSON.stringify(body, null, 2) + '\n')
  fs.writeFileSync(`${base}.md`, render(body))
  const m = load(dir)
  m.gates = (m.gates ?? []).filter((x) => x.id !== g.id)
  m.gates.push({ id: g.id, slug: g.slug, status: g.status, file: `gates/${g.id}-${g.slug}.json` })
  m.gates.sort((a, b) => a.id.localeCompare(b.id))
  return m
}

export function open (o) {
  const dir = projectDir(o)
  if (typeof o.slug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(o.slug)) throw new Fail('--slug must be kebab-case', 2)
  if (!o.question || !o['resume-at'] || !o.options) throw new Fail('open needs --question, --options and --resume-at', 2)
  let options
  try { options = JSON.parse(o.options) } catch { throw new Fail('--options must be a JSON array', 2) }
  if (!Array.isArray(options) || options.length < 2 || options.some((x) => !x.id || !x.label)) throw new Fail('--options needs at least two {id, label} entries', 2)
  const kind = o.kind ?? 'spend'
  if (!['spend', 'text'].includes(kind)) throw new Fail('--kind is spend or text', 2)
  if (kind === 'text' && !o.default) throw new Fail('a text gate needs --default <option id> (HR12)', 2)
  init(o)
  return withLock(dir, () => {
    fs.mkdirSync(gatesDir(dir), { recursive: true })
    const existing = listGates(dir)
    const same = existing.find((x) => x.slug === o.slug && x.status === 'open')
    if (same) return { ok: true, gate: same.id, kind: same.kind, file: same.file, reused: true }
    const id = String(existing.reduce((n, x) => Math.max(n, Number(x.id)), 0) + 1).padStart(2, '0')
    const g = {
      schema: GATE_SCHEMA, id, slug: o.slug, project: o.project, kind, status: 'open', question: o.question, options,
      quote: o.quote !== undefined ? { credits: Number(o.quote), remaining: budget({}).remaining } : null,
      default: kind === 'text' ? o.default : null, no_answer: kind === 'spend' ? 'stop' : 'default',
      resume_at: o['resume-at'], opened_at: new Date().toISOString(), answer: null, waiver: null,
      // The job run that opened it (sl8-agent's ledger path), so that run cannot answer its own spend gate.
      opened_by_run: process.env.SL8_SPEND_LEDGER ? path.resolve(process.env.SL8_SPEND_LEDGER) : null
    }
    save(dir, write(dir, g))
    if (kind === 'spend') {
      const outcome = path.resolve(o.outcome ?? path.join(dir, 'outcome.json'))
      fs.writeFileSync(outcome, JSON.stringify({ status: 'partial', reason: `Stopped at gate ${id} (${o.slug}): ${o.question} Nothing further was spent; the next job resumes at: ${o['resume-at']}.` }, null, 2) + '\n')
      return { ok: true, gate: id, file: `gates/${id}-${o.slug}.json`, outcome }
    }
    return { ok: true, gate: id, file: `gates/${id}-${o.slug}.json`, proceed_with: o.default }
  })
}

export function answer (o) {
  const dir = projectDir(o)
  if (!o.gate || !o.option) throw new Fail('answer needs --gate NN and --option ID', 2)
  return withLock(dir, () => {
    const g = findGate(dir, o.gate)
    if (g.status !== 'open') throw new Fail(`gate ${g.id} is already ${g.status}`)
    if (!g.options.some((x) => x.id === o.option)) throw new Fail(`option '${o.option}' is not one of: ${g.options.map((x) => x.id).join(', ')}`, 2)
    // HR12: a spend gate is the owner's question. The run that opened it never answers it; a later job
    // whose brief carries the owner's answer (a different run), or the owner outside any job, does.
    const run = process.env.SL8_SPEND_LEDGER ? path.resolve(process.env.SL8_SPEND_LEDGER) : null
    if (g.kind !== 'text' && g.opened_by_run && run && run === g.opened_by_run) throw new Fail(`gate ${g.id} is a spend gate this job opened: a job never answers its own spend gate (HR12); end the job partial and let the owner answer`)
    g.status = 'answered'; g.answer = { option: o.option, by: o.by ?? null, at: new Date().toISOString() }
    save(dir, write(dir, g))
    return { ok: true, gate: g.id, option: o.option, resume_at: g.resume_at }
  })
}

export function waive (o) {
  const dir = projectDir(o)
  if (!o.gate || !o.instruction) throw new Fail('waive needs --gate NN and --instruction "<the user\'s words>"', 2)
  return withLock(dir, () => {
    const g = findGate(dir, o.gate)
    if (g.status !== 'open') throw new Fail(`gate ${g.id} is already ${g.status}`)
    const at = new Date().toISOString()
    g.status = 'waived'; g.waiver = { instruction: o.instruction, at }
    const m = write(dir, g)
    m.waivers.push({ rule: 'HR12', gate: g.id, instruction: o.instruction, cost: o.cost ?? null, at })
    save(dir, m)
    return { ok: true, gate: g.id, status: 'waived', resume_at: g.resume_at }
  })
}

// Only an open spend gate stops the next job (exit 10, listed under `open`). An open text gate is
// listed under `open_text` with its default and exits 0: the job proceeds on the default and the
// delivery flags it (HR12). Any gate whose kind is not `text` counts as spend, so it blocks.
export function status (o) {
  const dir = projectDir(o)
  const gates = fs.existsSync(dir) ? listGates(dir) : []
  const row = (g) => ({ id: g.id, slug: g.slug, kind: g.kind === 'text' ? 'text' : 'spend', question: g.question, default: g.default ?? null, resume_at: g.resume_at, answer: g.answer?.option ?? null })
  const pick = (s, test = () => true) => gates.filter((g) => g.status === s && test(g)).map(row)
  const open = pick('open', (g) => g.kind !== 'text'); const openText = pick('open', (g) => g.kind === 'text')
  const answered = pick('answered'); const waived = pick('waived')
  const last = [...answered, ...waived].sort((a, b) => a.id.localeCompare(b.id)).pop()
  return { code: open.length ? 10 : 0, body: { open, open_text: openText, answered, waived, resume_at: open.length ? null : last?.resume_at ?? null } }
}

function main () {
  const [cmd, ...rest] = process.argv.slice(2); const o = parseArgs(rest)
  try {
    if (cmd === 'open') console.log(JSON.stringify(open(o)))
    else if (cmd === 'answer') console.log(JSON.stringify(answer(o)))
    else if (cmd === 'waive') console.log(JSON.stringify(waive(o)))
    else if (cmd === 'status') { const r = status(o); console.log(JSON.stringify(r.body, null, 2)); process.exitCode = r.code }
    else throw new Fail('usage: gate.mjs open|answer|status|waive --project <p> …', 2)
  } catch (e) { console.error(`gate.mjs: ${e.message}`); process.exitCode = e.code ?? 1 }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
