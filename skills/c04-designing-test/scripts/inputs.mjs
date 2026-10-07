#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Design a test for one change).
// Only the change is required: a "Change:" line, a change ID from the trial-path review (C1, C2 …),
// or the change named in the ask ("test the new headline"). Every other input is assumed when
// missing, with the value the plan uses, and the test design's Assumptions section gives each one a
// line starting "**<label>:**" (D40). Prints the stats.mjs inputs to run.
//   node inputs.mjs <request.md>  |  --selftest  |  --help
// No prompts; JSON on stdout; exit 1 only when the change is missing; writes nothing.
import fs from 'node:fs'

const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label","value"}],"stats":{"baseline","visitorsPerWeek","lift"},"project","say"}'
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
    ]
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed })); process.exit(failed.length ? 1 : 0)
  }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
