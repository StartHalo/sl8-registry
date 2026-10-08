#!/usr/bin/env node
// record.mjs: writes this job's status record for the standard status script (run-sl8-job's status.mjs)
// from the review itself, so the project's open decisions follow the review's Assumptions lines one to
// one (SHORTCOMINGS №183) and nothing is typed by hand.
//   node record.mjs artifacts/<product>/trial-path-review.md [--context "top three changes=C1 …, C2 …, C3 …"] [--dry-run]
//   node record.mjs --waiting product|pages --project <product> [--artifacts artifacts] [--dry-run]
//   node record.mjs artifacts/<product>/trial-path-review.md --check artifacts/<product>/inputs/job-review.json
//   node record.mjs --selftest | --help
// Writes artifacts/<product>/inputs/job-review.json and prints {"ok","file","decisions","next"}; run `next`
// (the status script) after it. Decisions: one per Assumptions line that asks for something ("Send … to
// replace it"). Context: the review's Product, Path reviewed and Traffic lines, and the top three changes
// (given with --context, else the first words of C1–C3's Change). --waiting writes the record of a job that
// ends partial (no product, or no page could be read). --check compares a written record's decisions with
// the ones the review implies (exit 1 when they differ), for audits. No prompts; JSON on stdout; exit 1
// when the review has no Assumptions section; safe to re-run (the same review gives the same record).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HELP = 'usage: node record.mjs artifacts/<product>/trial-path-review.md [--context "<field>=<value>"] [--dry-run] [--check <job.json>]\n       node record.mjs --waiting product|pages --project <product> [--artifacts artifacts] [--dry-run] | --selftest\n  prints {"ok","file","decisions","next"}'
const JOB = 'trial-path-review', FILE = 'job-review.json'
const WAIT = {
  product: { text: "Send the product's website", needs: 'product' },
  pages: { text: 'Send the text or screenshots of your home, pricing and sign-up pages: the site could not be read', needs: 'pages' },
}
function section (text, name) { for (const part of String(text).split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m && m[1] === name) return part.slice(part.indexOf('\n') + 1) } return null }
const line = (text, label) => (new RegExp(`^-\\s*${label}:\\s*(.+)$`, 'mi').exec(text) || [])[1]?.trim() || ''
const table = s => (s || '').split('\n').filter(l => /^\|/.test(l)).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim())).slice(2)

// one open decision per Assumptions line that asks for something
export function decisionsOf (text) {
  const sec = section(text, 'Assumptions')
  if (sec == null) return null
  const out = []
  for (const l of sec.split('\n')) {
    const m = /^[-*]\s+\*\*(.+?):\*\*\s*(.*)$/.exec(l.trim())
    const ask = m && /\bSend (.+?) to replace it\b/i.exec(m[2])
    if (ask) out.push({ text: `Send ${ask[1].trim()}`, state: 'open', needs: m[1].trim().toLowerCase() })
  }
  return out
}
const firstWords = s => { const head = String(s).split(/;|: |\. | \(/)[0].trim(), w = (head.split(/\s+/).length >= 3 ? head : String(s)).split(/\s+/); return w.length > 8 ? `${w.slice(0, 8).join(' ')}…` : w.join(' ') }

export function recordOf (text, file, context = {}) {
  const decisions = decisionsOf(text)
  if (!decisions) return { errors: ['the review has no "## Assumptions" section'] }
  const project = path.basename(path.dirname(file)), product = line(text, 'Product')
  const name = product.split(',')[0].trim()
  const top = table(section(text, 'Ranked changes')).slice(0, 3).map(r => `${r[0]} ${firstWords(r[3] || '')}`).join(', ')
  return {
    record: {
      job: JOB, what: `${name && !/^https?:/i.test(name) ? name : project}: conversion`, state: 'active',
      context: { 'product site': (/https?:\/\/\S+/.exec(product) || [''])[0].replace(/[),.]+$/, ''), 'path reviewed': line(text, 'Path reviewed'), 'traffic known': /^not given/i.test(line(text, 'Traffic')) ? 'no' : 'yes', 'top three changes': top, ...context },
      decisions,
      deliverables: [{ name: 'Trial-path review', file: `${project}/${path.basename(file)}` }],
    },
    project, artifacts: path.dirname(path.dirname(file)),
  }
}
export const waitingOf = (needs, project) => WAIT[needs] ? { job: JOB, what: `${project}: conversion`, state: 'waiting', context: {}, decisions: [{ ...WAIT[needs], state: 'open' }], deliverables: [] } : null

const key = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
// compare(rec, written): one written decision per decision the deliverable implies, matched by what it
// needs or by its words (each written decision used once); the rest are missing or extra
export function compare (rec, written) {
  const left = [...(written?.decisions || [])], missing = []
  for (const d of rec.decisions) {
    const i = left.findIndex(w => (w.needs && key(w.needs) === key(d.needs)) || key(w.text) === key(d.text))
    if (i < 0) missing.push(d.text); else left.splice(i, 1)
  }
  return { ok: !missing.length && !left.length, expected: rec.decisions.length, found: (written?.decisions || []).length, missing, extra: left.map(w => w.text) }
}
function write (rec, artifacts, project, dry) {
  const dir = path.resolve(artifacts), file = path.join(dir, project, 'inputs', FILE) // absolute: the status command works from any folder
  if (!dry) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(rec, null, 2) + '\n') }
  return { ok: true, file, wrote: !dry, decisions: rec.decisions.length, record: rec, next: `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project ${project} --record ${file} --artifacts ${dir}` }
}

function selftest () {
  const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples', 'good-1.md')
  const good = fs.readFileSync(ex, 'utf8')
  const r = recordOf(good, 'artifacts/ledgerline/trial-path-review.md')
  const given = recordOf(good.replace(/^- \*\*(Path|Customer voice|Screenshots):\*\*.*\n/gm, ''), 'artifacts/ledgerline/trial-path-review.md', { 'top three changes': 'C1 phone field, C2 company size, C3 one label' })
  const none = recordOf(good.replace(/## Assumptions[\s\S]*$/, '## Assumptions\n- None: every input was given.\n'), 'artifacts/ledgerline/trial-path-review.md')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c04-record-'))
  const w = write(waitingOf('product', 'new-project'), tmp, 'new-project', false)
  const saved = JSON.parse(fs.readFileSync(w.file, 'utf8'))
  fs.rmSync(tmp, { recursive: true, force: true })
  const t = [
    ['one open decision per Assumptions line, its words and label', r.record.decisions.length === 4 && r.record.decisions[1].text === 'Send visits and trials for the last month' && r.record.decisions[1].needs === 'traffic' && r.record.decisions.every(d => d.state === 'open')],
    ['context from the review: site, path, traffic known and the top three', r.record.context['product site'] === 'https://ledgerline.example' && /^home → sign-up/.test(r.record.context['path reviewed']) && r.record.context['traffic known'] === 'no' && r.record.context['top three changes'].startsWith('C1 remove the phone field from sign-up, C2 move company size')],
    ['the deliverable and the project come from the path', r.project === 'ledgerline' && r.record.deliverables[0].file === 'ledgerline/trial-path-review.md' && r.record.what === 'Ledgerline: conversion'],
    ['given context wins; fewer Assumptions lines, fewer decisions', given.record.context['top three changes'] === 'C1 phone field, C2 company size, C3 one label' && given.record.decisions.length === 1],
    ['"None: every input was given" opens no decision; a review with no Assumptions is refused', none.record.decisions.length === 0 && recordOf('# x\n', 'a/p/r.md').errors?.length === 1],
    ['--check: a record whose decisions follow the Assumptions lines passes; one that merges or drops lines fails', compare(r.record, r.record).ok && (() => { const c = compare(r.record, { decisions: [r.record.decisions[1], { text: 'Send traffic and voice' }] }); return !c.ok && c.missing.length === 3 && c.extra.length === 1 })()],
    ['--waiting writes the partial record with its one decision; the status command it prints works from any folder', w.next.endsWith(`--artifacts ${path.resolve(tmp)}`) && path.isAbsolute(w.file) && saved.state === 'waiting' && saved.decisions[0].needs === 'product' && !saved.deliverables.length && w.file.endsWith(path.join('new-project', 'inputs', FILE))],
  ]
  const failed = t.filter(x => !x[1]).map(x => x[0])
  console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed })); process.exit(failed.length ? 1 : 0)
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  const say = (o, code) => { console.log(JSON.stringify(o, null, 2)); process.exit(code) }
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) selftest()
  const opt = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null }
  const dry = a.includes('--dry-run')
  if (a.includes('--waiting')) {
    const needs = opt('--waiting'), project = opt('--project') || 'new-project', rec = waitingOf(needs, project)
    if (!rec) say({ ok: false, errors: [`--waiting must be one of ${Object.keys(WAIT).join(', ')}`] }, 2)
    say(write(rec, opt('--artifacts') || 'artifacts', project, dry), 0)
  }
  const takes = new Set(['--context', '--waiting', '--project', '--artifacts', '--check'])
  const file = a.find((x, k) => !x.startsWith('--') && !takes.has(a[k - 1]))
  if (!file || !fs.existsSync(file)) say({ ok: false, errors: [`give the review's path (artifacts/<product>/trial-path-review.md); see --help`] }, 2)
  const context = {}
  a.forEach((x, k) => { if (x === '--context' && a[k + 1]) { const [key, ...v] = a[k + 1].split('='); if (key && v.length) context[key.trim()] = v.join('=').trim() } })
  const r = recordOf(fs.readFileSync(file, 'utf8'), file, context)
  if (r.errors) say({ ok: false, errors: r.errors }, 1)
  if (opt('--check')) { const c = compare(r.record, JSON.parse(fs.readFileSync(opt('--check'), 'utf8'))); say(c, c.ok ? 0 : 1) }
  say(write(r.record, r.artifacts, r.project, dry), 0)
}
