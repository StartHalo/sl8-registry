#!/usr/bin/env node
// validate.mjs: completeness and arithmetic of the launch campaign brief (job card: Brief a launch
// campaign). D40: it checks that every section is present and filled, the Method line, one Assumptions
// line per input the request left out, and that the budget lines add up within the budget (0 when none
// was given). It never checks length, the number of reasons or channels, or wording: the person judges
// quality.
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
const HELP = 'usage: node validate.mjs <campaign-brief.md> --request <request.md> | --selftest\n  prints {"ok","errors":[…],"budgetTotal":n}; the budget comes from the request (0 when none was given)'
const HEADS = ['Objective', 'Proposition', 'Reasons to believe', 'Audience', 'KPI', 'Channels', 'Budget', 'Deliverables', 'Out of scope', 'Assumptions']
const num = v => { const m = String(v).replace(/,/g, '').match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN }
const unfilled = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?|…)\s*$/i.test(v)
const section = (md, h) => { const parts = md.split(new RegExp(`^## ${h}[^\\n]*$`, 'm')); return parts.length < 2 ? null : parts[1].split(/^## /m)[0].trim() }
const items = s => (s || '').split('\n').filter(l => /^\s*(?:-|\d+\.)\s+\S/.test(l))
export function assumptionLines(md, assume) {
  const errors = [], a = section(md, 'Assumptions')
  if (a === null || !a) return []
  const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // the label inputs.mjs prints ("Launch date"); its field name ("launch_date", "launch date") is accepted too
  for (const { label, field = label } of assume) if (!new RegExp(`^\\s*-\\s*\\*{0,2}(?:${[label, field, field.replace(/_/g, ' ')].map(esc).join('|')})\\*{0,2}\\s*:`, 'im').test(a)) errors.push(`no Assumptions line for "${label}", which the request left out: add "- **${label}:** not given. Assumed …. Send … to replace it."`)
  return errors
}
export function check(md, budget = null, assume = []) {
  const errors = []
  if (!/^\*\*Method:\*\*\s*\S{3,}/m.test(md)) errors.push('no "**Method:**" line naming the method')
  for (const h of HEADS) { const s = section(md, h); if (s === null) errors.push(`no "## ${h}" section`); else if (unfilled(s)) errors.push(`"## ${h}" is not filled${h === 'Assumptions' ? ': list what you assumed, or write "None"' : ''}`) }
  const lines = items(section(md, 'Budget')).filter(l => !/total/i.test(l))
  const amounts = lines.map(l => num(l.split(/:/).slice(1).join(':') || l))
  const total = amounts.filter(n => !Number.isNaN(n)).reduce((x, y) => x + y, 0)
  const totalLine = items(section(md, 'Budget')).find(l => /total/i.test(l))
  if (section(md, 'Budget') && !lines.length) errors.push('the budget needs one line per item: "- <item>: <amount>" (0 when an item costs only team time)')
  if (amounts.some(Number.isNaN)) errors.push('every budget line needs an amount (0 for team time only)')
  if (totalLine && !Number.isNaN(num(totalLine.split(/:/).slice(1).join(':'))) && Math.abs(num(totalLine.split(/:/).slice(1).join(':')) - total) > 0.5) errors.push(`the budget's total line is not the sum of its items (${total})`)
  if (budget != null && total > budget) errors.push(`budget lines total ${total}, over the budget of ${budget}${budget === 0 ? ' (no budget was given, so the brief uses owned channels and team time only: 0)' : ''}`)
  const tbd = (md.match(/\[TBD\]/gi) || []).length
  if (tbd) errors.push(`${tbd} [TBD] left: fill each part with what you know, and put the gap under Assumptions with what to send`)
  errors.push(...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 25), budgetTotal: total }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const results = []; const t = (n, ok) => results.push({ name: n, pass: !!ok })
  const ex = path.join(import.meta.dirname, '..', 'reference', 'examples')
  const ours = fs.readdirSync(ex).filter(f => /^good-/.test(f) && /written by us/.test(fs.readFileSync(path.join(ex, f), 'utf8').split('\n')[0]))
  for (const f of ours) { const r = check(fs.readFileSync(path.join(ex, f), 'utf8')); t(`template example ${f} passes${r.ok ? '' : ': ' + r.errors.join('; ')}`, r.ok) }
  t('at least one template example', ours.length > 0)
  const good = `# Brief\n\n**Method:** single-minded brief.\n\n## Objective\nWin first bookings.\n\n## Proposition\nYour evenings, booked in two taps. Really.\n\n## Reasons to believe\n- a\n- b\n\n## Audience\nUK office workers\n\n## KPI\nlots of bookings\n\n## Channels\n- Instagram\n- Partners\n- Email\n- Events\n\n## Budget\n- Creators: 2,000\n- Partners: 1,500\n- Total: 3,500\n\n## Deliverables\n- 3 reels\n\n## Out of scope\nPaid search\n\n## Assumptions\n- **Launch date:** not given. Assumed 6 weeks out. Send the date to replace it.\n`
  t('a complete brief passes, whatever its sentences, counts or wording', check(good, 4000, [{ label: 'Launch date' }]).ok)
  t('a missing section fails', check(good.replace(/## Out of scope\nPaid search\n\n/, ''), 4000).errors.some(e => /Out of scope/.test(e)))
  t('an empty section fails', check(good.replace('Win first bookings.', '—'), 4000).errors.some(e => /Objective/.test(e)))
  t('budget lines over the budget fail', check(good, 3000).errors.some(e => /over the budget/.test(e)))
  t('with no budget given, any spend fails', check(good, 0).errors.some(e => /owned channels/.test(e)))
  t('a total line that is not the sum fails', check(good.replace('Total: 3,500', 'Total: 4,000'), 9000).errors.some(e => /not the sum/.test(e)))
  t('an input left out with no Assumptions line fails', check(good, 4000, [{ label: 'Budget' }]).errors.some(e => /"Budget"/.test(e)))
  t('no Method line fails', check(good.replace(/\*\*Method:\*\*.*\n/, ''), 4000).errors.some(e => /Method/.test(e)))
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = a.includes('--request') ? a[a.indexOf('--request') + 1] : null
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file>: it gives the budget and the inputs to list under Assumptions'] })); process.exit(2) }
const i = inputs(fs.readFileSync(req, 'utf8'))
const r = check(fs.readFileSync(a[0], 'utf8'), i.budget, i.assume); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
