#!/usr/bin/env node
// record.mjs: writes this job's status record for the standard status script (run-sl8-job's status.mjs)
// from the test design itself, so the project's open decisions follow its Assumptions lines one to one,
// plus the step that starts the measuring (SHORTCOMINGS №183), and nothing is typed by hand.
//   node record.mjs artifacts/<product>/tests/<change>.md [--context "<field>=<value>"] [--dry-run]
//   node record.mjs --waiting change --project <product> [--artifacts artifacts] [--dry-run]
//   node record.mjs artifacts/<product>/tests/<change>.md --check artifacts/<product>/inputs/job-test.json
//   node record.mjs --selftest | --help
// Writes artifacts/<product>/inputs/job-test.json and prints {"ok","file","decisions","next"}; run `next`
// (the status script) after it. Decisions: one per Assumptions line that asks for something ("Send … to
// replace it"), then "Ship the change and note the date" (ship and measure), "Start the A/B test and note the
// date" (A/B test) or "Run the preference test" (preference test). Context: the change tested, the route, the
// weeks an A/B test needs (marked when the figures are examples) and when the decision rule is read, from the
// design; --context overrides one. --waiting writes the record of a job that ends partial (no change). No
// prompts; JSON on stdout; --check compares a written record's decisions with the ones the deliverable implies
// (exit 1 when they differ), for audits; exit 1 when the design has no Assumptions section or no route; safe to re-run.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HELP = 'usage: node record.mjs artifacts/<product>/tests/<change>.md [--context "<field>=<value>"] [--dry-run] [--check <job.json>]\n       node record.mjs --waiting change --project <product> [--artifacts artifacts] [--dry-run] | --selftest\n  prints {"ok","file","decisions","next"}'
const JOB = 'test-design', FILE = 'job-test.json'
const WAIT = { change: { text: 'Send the change to test', needs: 'change' } }
const START = { 'ship and measure': { text: 'Ship the change and note the date', needs: 'ship date' }, 'A/B test': { text: 'Start the A/B test and note the date', needs: 'start date' }, 'preference test': { text: 'Run the preference test', needs: 'preference test' } }
function section (text, name) { for (const part of String(text).split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m && m[1] === name) return part.slice(part.indexOf('\n') + 1) } return null }
const line = (text, label) => (new RegExp(`^-\\s*${label}:\\s*(.+)$`, 'mi').exec(text) || [])[1]?.trim() || ''

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
const routeOf = text => { const r = /\*\*Route:\*\*\s*([^.\n]+)/i.exec(section(text, 'Route') || '')?.[1] || ''; return /^a\/?b test/i.test(r) ? 'A/B test' : /^preference test/i.test(r) ? 'preference test' : /^ship and measure/i.test(r) ? 'ship and measure' : null }

export function recordOf (text, file, context = {}) {
  const decisions = decisionsOf(text), route = routeOf(text)
  if (!decisions) return { errors: ['the test design has no "## Assumptions" section'] }
  if (!route) return { errors: ['the test design has no "**Route:**" line'] }
  const project = path.basename(path.dirname(path.dirname(file)))
  const name = line(text, 'Product').split(',')[0].trim()
  const title = (/^#\s.*test design for "(.+?)"/mi.exec(text) || [])[1] || line(text, 'Change')
  const id = (/^-\s*Change:\s*(C\d+)\b/mi.exec(text) || [])[1]
  const ar = section(text, 'The arithmetic') || ''
  const weeks = (/^-\s*Weeks:\s*([\d,.]+)/mi.exec(ar) || [])[1] || ''
  const arm = (/^-\s*Visitors per arm:\s*([\d,]+)/mi.exec(ar) || [])[1] || ''
  const example = /\(example/i.test(line(ar, 'Inputs'))
  const read = route === 'ship and measure' ? 'after 4 full weeks from shipping' : route === 'A/B test' ? `at ${arm} visitors per arm (about ${Math.ceil(Number(weeks.replace(/,/g, '')) || 0)} weeks)` : 'when the preference test answers are in'
  return {
    record: {
      job: JOB, what: `${name && !/^(https?:|not given)/i.test(name) ? name : project}: conversion`, state: 'active',
      context: { 'change tested': `${id && !title.startsWith(id) ? `${id} ` : ''}${title}`, route: route === 'ship and measure' ? 'ship and measure before and after' : route, weeks: weeks ? `${weeks} for an A/B test${example ? ' (example figures)' : ''}` : '', 'decision date': read, ...context },
      decisions: [...decisions, { ...START[route], state: 'open' }],
      deliverables: [{ name: `Test design: ${title}`, file: `${project}/tests/${path.basename(file)}` }],
    },
    project, artifacts: path.dirname(path.dirname(path.dirname(file))),
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
  const good = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples', 'good-1.md'), 'utf8')
  const f = 'artifacts/ledgerline/tests/pricing-headline.md'
  const r = recordOf(good, f)
  const ab = recordOf(good.replace('**Route:** ship and measure before and after', '**Route:** A/B test'), f)
  const prod = recordOf(good.replace('## Assumptions\n', '## Assumptions\n- **Product:** not given. Assumed Ledgerline, the project of the review. Send the product name to replace it.\n'), f)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c04-test-record-'))
  const w = write(waitingOf('change', 'ledgerline'), tmp, 'ledgerline', false)
  const saved = JSON.parse(fs.readFileSync(w.file, 'utf8'))
  fs.rmSync(tmp, { recursive: true, force: true })
  const t = [
    ['one open decision per Assumptions line, then shipping the change', r.record.decisions.length === 4 && r.record.decisions[0].text === "Send the share of pricing-page visitors who start a trial over the last 4 weeks" && r.record.decisions[0].needs === 'baseline conversion' && r.record.decisions[3].text === 'Ship the change and note the date'],
    ['a Product line is a decision too (five here)', prod.record.decisions.length === 5 && prod.record.decisions[0].needs === 'product'],
    ['context from the design: the change, the route, the weeks marked as example figures, when the rule is read', r.record.context['change tested'] === 'C2 the pricing headline names the per-invoice cost' && r.record.context.route === 'ship and measure before and after' && r.record.context.weeks === '84.4 for an A/B test (example figures)' && r.record.context['decision date'] === 'after 4 full weeks from shipping'],
    ['an A/B test starts the test and is read at its sample', ab.record.decisions.at(-1).needs === 'start date' && ab.record.context['decision date'] === 'at 21,109 visitors per arm (about 85 weeks)'],
    ['the deliverable and the project come from the path', r.project === 'ledgerline' && r.record.deliverables[0].file === 'ledgerline/tests/pricing-headline.md' && r.record.what === 'Ledgerline: conversion'],
    ['no Assumptions section or no route is refused', recordOf('# x\n## Route\n**Route:** A/B test.\n', f).errors?.length === 1 && recordOf('# x\n## Assumptions\n- None: every input was given.\n', f).errors?.length === 1],
    ['--check: the record of a design passes; one that merges two asks and drops the product fails', compare(prod.record, prod.record).ok && (() => { const c = compare(prod.record, { decisions: [{ text: 'Send the weekly visitors and conversions' }, prod.record.decisions[3], prod.record.decisions[4]] }); return !c.ok && c.missing.length === 3 && c.extra.length === 1 })()],
    ['--waiting writes the partial record with its one decision; the status command it prints works from any folder', w.next.endsWith(`--artifacts ${path.resolve(tmp)}`) && path.isAbsolute(w.file) && saved.state === 'waiting' && saved.decisions[0].needs === 'change' && !saved.deliverables.length],
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
  if (!file || !fs.existsSync(file)) say({ ok: false, errors: ['give the test design\'s path (artifacts/<product>/tests/<change>.md); see --help'] }, 2)
  const context = {}
  a.forEach((x, k) => { if (x === '--context' && a[k + 1]) { const [key, ...v] = a[k + 1].split('='); if (key && v.length) context[key.trim()] = v.join('=').trim() } })
  const r = recordOf(fs.readFileSync(file, 'utf8'), file, context)
  if (r.errors) say({ ok: false, errors: r.errors }, 1)
  if (opt('--check')) { const c = compare(r.record, JSON.parse(fs.readFileSync(opt('--check'), 'utf8'))); say(c, c.ok ? 0 : 1) }
  say(write(r.record, r.artifacts, r.project, dry), 0)
}
