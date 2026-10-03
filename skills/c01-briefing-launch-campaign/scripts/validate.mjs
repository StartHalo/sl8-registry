#!/usr/bin/env node
// validate.mjs: completeness checks for the launch campaign brief (job card: Brief a launch campaign).
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
const HELP = 'usage: node validate.mjs <campaign-brief.md> --budget <number> [--backlog <growth-tests.md>] | --selftest\n  prints {"ok","errors":[…],"words":n}'
const HEADS = ['Objective', 'Proposition', 'Reasons to believe', 'Audience', 'KPI', 'Channels', 'Budget', 'Deliverables', 'Out of scope', 'Assumptions']
const MAX_WORDS = 600
const num = v => { const m = String(v).replace(/,/g, '').match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN }
const section = (md, h) => { const parts = md.split(new RegExp(`^## ${h}\\s*$`, 'm')); return parts.length < 2 ? null : parts[1].split(/^## /m)[0].trim() }
const items = s => (s || '').split('\n').filter(l => /^\s*(?:-|\d+\.)\s+\S/.test(l))
export function check(md, budget, backlog) {
  const errors = []
  const words = md.split(/\s+/).filter(Boolean).length
  if (words > MAX_WORDS) errors.push(`${words} words; the limit is ${MAX_WORDS}`)
  if (/\bTBD\b/i.test(md)) errors.push('contains TBD: fill it or move it to Assumptions')
  for (const h of HEADS) { const s = section(md, h); if (s === null) errors.push(`no "## ${h}" section`); else if (!s) errors.push(`"## ${h}" is empty`) }
  const prop = section(md, 'Proposition') || ''
  const sentences = prop.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(x => x.trim())
  if (sentences.length !== 1) errors.push(`the proposition has ${sentences.length} sentences; write exactly one`)
  if (prop.split(/\s+/).filter(Boolean).length > 25) errors.push('the proposition is over 25 words')
  if (items(section(md, 'Reasons to believe')).length !== 3) errors.push(`${items(section(md, 'Reasons to believe')).length} reasons to believe; write exactly 3`)
  const kpi = section(md, 'KPI') || ''
  if (!/\d/.test(kpi.replace(/20\d\d/g, '')) || !/(20\d\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|week \d|day \d)/i.test(kpi)) errors.push('the KPI needs a number and a date')
  const ch = items(section(md, 'Channels')).length
  if (ch < 1 || ch > 3) errors.push(`${ch} channels; list 1 to 3`)
  const lines = items(section(md, 'Budget'))
  const total = lines.filter(l => !/total/i.test(l)).map(l => num(l.split(/[:—–]/).slice(1).join(':') || l)).filter(n => !Number.isNaN(n)).reduce((a, b) => a + b, 0)
  if (!lines.length) errors.push('the budget needs one line per item: "- <item>: <amount>"')
  else if (budget != null && total > budget) errors.push(`budget lines total ${total}, over the budget of ${budget}`)
  if (backlog) { const p = prop.toLowerCase(); if (p.length > 20 && backlog.toLowerCase().includes(p.slice(0, 60))) errors.push('the proposition is copied from the growth backlog') }
  return { ok: !errors.length, errors: errors.slice(0, 25), words, budgetTotal: total }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
const budget = a.includes('--budget') ? num(a[a.indexOf('--budget') + 1]) : null
if (a.includes('--selftest')) {
  const good = `# Brief\n\n## Objective\nWin first bookings.\n\n## Proposition\nYour evenings, booked in two taps.\n\n## Reasons to believe\n- a\n- b\n- c\n\n## Audience\nUK office workers\n\n## KPI\n300 bookings by 31 March 2027\n\n## Channels\n- Instagram\n- Partners\n\n## Budget\n- Creators: 2,000\n- Partners: 1,500\n\n## Deliverables\n- 3 reels\n\n## Out of scope\nPaid search\n\n## Assumptions\nNone\n`
  const bad = good.replace('Your evenings, booked in two taps.', 'Book evenings. Meet people. Grow.').replace('- c\n', '').replace('300 bookings by 31 March 2027', 'lots of bookings').replace('## Channels\n- Instagram\n- Partners', '## Channels\n- A\n- B\n- C\n- D')
  const g = check(good, 4000), b = check(bad, 3000)
  const ok = g.ok && !b.ok && ['sentences', 'reasons', 'KPI', 'channels', 'over the budget'].every(k => b.errors.some(e => e.includes(k)))
  console.log(JSON.stringify({ ok, cases: 2, goodErrors: g.errors, badErrors: b.errors.length })); process.exit(ok ? 0 : 1)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
if (budget == null) { console.log(JSON.stringify({ ok: false, errors: ['give --budget <number> from inputs.mjs'] })); process.exit(2) }
const bl = a.includes('--backlog') && fs.existsSync(a[a.indexOf('--backlog') + 1]) ? fs.readFileSync(a[a.indexOf('--backlog') + 1], 'utf8') : null
const r = check(fs.readFileSync(a[0], 'utf8'), budget, bl); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
