#!/usr/bin/env node
// inputs.mjs: reads the request for this job's inputs (job card: Design a test for one change), and with
// --save saves it word for word in the product's folder, so nothing is written before the product is known
// (SHORTCOMINGS №182). Only the change is required: a "Change:" line, a change ID from the trial-path review
// (C1, C2 …), or the change named in the ask ("test the new headline"). Every other input is assumed when
// missing, with the value the plan uses, and the test design's Assumptions section gives each one a line
// starting "**<label>:**" (D40). Prints the stats.mjs inputs to run.
//   node inputs.mjs <request.md | -> [--save <artifacts dir>] [--artifacts <artifacts dir>]  |  --selftest  |  --help
// "-" reads the request from stdin (a quoted heredoc). The project is the product the request names; else,
// with --artifacts, the project whose status was updated last (the one a change ID such as C2 points to);
// else new-project. --save writes the request to <artifacts>/<project>/inputs/request-test.md
// (request-test-2.md … when a different earlier request is there: it never overwrites) and prints "saved".
// No prompts; JSON on stdout; exit 1 only when the change is missing; writes nothing without --save.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HELP = 'usage: node inputs.mjs <request.md | -> [--save artifacts] [--artifacts artifacts] | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label","value"}],"stats":{"baseline","visitorsPerWeek","lift"},"run","project","projectFrom","saved","say"}'
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?|none|unknown|not known)\s*$/i.test(v)
export const DEFAULTS = { baseline: '2%', visitorsPerWeek: 500, lift: '20%' }
export const OPTIONAL = {
  product: [/^(?:product|website|site|url)\s*[:—-]\s*(.+)$/im, 'Product', 'from the change or the project'],
  baseline: [/^(?:conversion(?: rate)?|baseline(?: conversion)?|rate)\s*[:—-]\s*(.+)$/im, 'Baseline conversion', `${DEFAULTS.baseline}, an example rate`],
  visitors_per_week: [/^(?:visitors(?: per week| a week)?|traffic)\s*[:—-]\s*(.+)$/im, 'Visitors per week', `${DEFAULTS.visitorsPerWeek} a week, an example`],
  lift: [/^(?:lift(?: worth detecting)?|smallest lift|mde)\s*[:—-]\s*(.+)$/im, 'Lift worth detecting', `${DEFAULTS.lift} relative (the smallest a low-traffic test can see)`],
}
const pct = s => { const m = /(\d+(?:\.\d+)?)\s*%/.exec(s); return m ? `${m[1]}%` : null }
// "2,400 visits a month" → per week; "800 a week" → 800
export function perWeek (s) {
  const m = /([\d,]+(?:\.\d+)?)\s*(k)?/i.exec(s); if (!m) return null
  let n = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1)
  if (/month|\/mo\b|monthly/i.test(s)) n = Math.round(n * 12 / 52)
  else if (/day|daily/i.test(s)) n = n * 7
  return n > 0 ? n : null
}
export const slug = s => String(s).toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\..*$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-project'
export function check (text) {
  const found = {}, missing = [], assume = []
  const line = /^(?:change|the change)\s*[:—-]\s*(.+)$/im.exec(text)
  const id = /\b(C\d{1,2})\b/.exec(text)
  const asked = /\btest (?:the|our|a|this|that) ((?!change\b)[^?.\n]{3,})/i.exec(text)
  if (line && !empty(line[1])) found.change = line[1].trim()
  else if (id) found.change = id[1]
  else if (asked) found.change = asked[1].trim()
  else missing.push('change')
  for (const [k, [re, label, value]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else assume.push({ field: k, label, value }) }
  const stats = {
    baseline: (found.baseline && pct(found.baseline)) || DEFAULTS.baseline,
    visitorsPerWeek: (found.visitors_per_week && perWeek(found.visitors_per_week)) || DEFAULTS.visitorsPerWeek,
    lift: (found.lift && pct(found.lift)) || DEFAULTS.lift,
  }
  const named = /^(?:product|website|site|url)\s*[:—-]\s*([^,\n]+)/im.exec(text)
  return {
    ok: !missing.length, found, missing, assume, stats,
    run: `node stats.mjs plan --baseline ${stats.baseline} --visitors-per-week ${stats.visitorsPerWeek} --lift ${stats.lift}`,
    project: named && !empty(named[1]) ? slug(named[1].trim()) : null,
    say: missing.length ? 'To do this I need: the change to test (in words, or a change number such as C2 from the trial-path review).' : '',
  }
}
// newestProject(dir): the project under artifacts/ whose status was updated last (its .status.json, else STATUS.md's time)
export function newestProject (artifactsDir) {
  if (!artifactsDir || !fs.existsSync(artifactsDir)) return null
  let best = null
  for (const d of fs.readdirSync(artifactsDir)) {
    const sm = path.join(artifactsDir, d, 'STATUS.md'), sj = path.join(artifactsDir, d, '.status.json')
    if (d.startsWith('.') || d === 'attachments' || !fs.existsSync(sm)) continue
    let at = ''
    try { at = String(JSON.parse(fs.readFileSync(sj, 'utf8')).last?.at || '').replace(' ', 'T') } catch {}
    const key = at || fs.statSync(sm).mtime.toISOString()
    if (!best || key > best.key) best = { d, key }
  }
  return best?.d || null
}
// save(text, artifactsDir, project): the request, word for word, never over a different earlier one
export function save (text, artifactsDir, project) {
  const dir = path.join(artifactsDir, project || 'new-project', 'inputs')
  fs.mkdirSync(dir, { recursive: true })
  for (let k = 1; k < 100; k++) {
    const f = path.join(dir, k === 1 ? 'request-test.md' : `request-test-${k}.md`)
    if (!fs.existsSync(f)) { fs.writeFileSync(f, text); return f }
    if (fs.readFileSync(f, 'utf8') === text) return f
  }
  throw new Error(`more than 99 saved requests in ${dir}`)
}
const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const full = check('Design a test for one change\nChange: the pricing headline names the per-invoice cost\nProduct: Ledgerline, https://ledgerline.example\nConversion: 3%\nVisitors per week: 800\nLift: 20%')
    const id = check('Design a test for one change\nChange: C2')
    const asked = check('can we A/B test the new headline?')
    const none = check('Design a test for one change')
    const monthly = check('how do we know if this change works?\nChange: shorter form\nTraffic: 2,600 visits a month')
    const t = [
      ['a full request assumes nothing', full.ok && !full.assume.length && full.stats.baseline === '3%' && full.stats.visitorsPerWeek === 800 && full.project === 'ledgerline'],
      ['a change ID is the change; the rest is assumed with example values', id.ok && id.assume.length === 4 && id.stats.baseline === '2%' && id.stats.visitorsPerWeek === 500],
      ['a change named in the ask counts', asked.ok && /new headline/.test(asked.found.change)],
      ['no change ends partial', !none.ok && none.missing[0] === 'change'],
      ['monthly traffic becomes weekly', monthly.stats.visitorsPerWeek === 600],
      ['the project whose status was updated last is the default project; --save writes there word for word and never overwrites', (() => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c04-test-inputs-')), A = path.join(tmp, 'artifacts')
        for (const [p, at] of [['older', '2026-01-01 10:00'], ['ledgerline', '2026-02-01 09:30']]) { fs.mkdirSync(path.join(A, p), { recursive: true }); fs.writeFileSync(path.join(A, p, 'STATUS.md'), '# s\n'); fs.writeFileSync(path.join(A, p, '.status.json'), JSON.stringify({ last: { at } })) }
        fs.mkdirSync(path.join(A, 'stray', 'inputs'), { recursive: true })
        const cli = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '-', '--save', A, '--artifacts', A], { input: 'Design a test for one change\nChange: C2\n', encoding: 'utf8' })
        const r = JSON.parse(cli.stdout || '{}'), again = save('Design a test for one change\nChange: C2\n', A, 'ledgerline'), other = save('Design a test for one change\nChange: C3\n', A, 'ledgerline')
        const ok = cli.status === 0 && r.project === 'ledgerline' && r.saved === path.join(A, 'ledgerline', 'inputs', 'request-test.md') && fs.readFileSync(r.saved, 'utf8') === 'Design a test for one change\nChange: C2\n' && again === r.saved && other.endsWith('request-test-2.md') && newestProject(path.join(tmp, 'none')) === null
        fs.rmSync(tmp, { recursive: true, force: true })
        return ok
      })()],
      ['a named product wins over the newest project', check('Design a test for one change\nChange: shorter form\nProduct: Ledgerline, https://ledgerline.example').project === 'ledgerline'],
    ]
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed })); process.exit(failed.length ? 1 : 0)
  }
  const takes = new Set(['--save', '--artifacts'])
  const src = a.find((x, k) => (x === '-' || !x.startsWith('--')) && !takes.has(a[k - 1]))
  if (!src || (src !== '-' && !fs.existsSync(src))) { console.log(JSON.stringify({ ok: false, errors: ['give the request: a saved file, or "-" with the request on stdin; see --help'] })); process.exit(2) }
  const text = src === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(src, 'utf8')
  const opt = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null }
  const r = check(text), newest = newestProject(opt('--artifacts'))
  r.projectFrom = r.project ? 'request' : newest ? 'the project whose status was updated last' : 'none'
  r.project = r.project || newest || 'new-project'
  if (opt('--save')) r.saved = save(text, opt('--save'), r.project)
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
