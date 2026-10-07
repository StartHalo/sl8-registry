#!/usr/bin/env node
// validate.mjs: completeness and arithmetic of the launch brief (job card: Brief a feature or integration
// launch). D40: every header field and section filled; the actions table has every cell filled and at
// least one action before (L-n), on (L0) and after (L+n) launch day; each action's date is the launch date
// plus 7n days; the founder's hours in each week are within the stated hours; the budget lines sum to the
// total, the actions' costs sum to the same total, and it is within the budget; the Method line; one
// Assumptions line per input the request left out. It never checks length, counts or wording.
// The budget and hours limits are the request's when it gives them (the header must then agree), else
// the header's stated values (explained under Assumptions), else 0 and 5.
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
import { section, header, table, unfilled, num, amount, assumptionLines, methodLine, tbd, body, read, arg } from './lib.mjs'
const HELP = 'usage: node validate.mjs <launch-brief.md> --request <request.md> | --selftest\n  prints {"ok","errors":[…],"actions":n,"budgetTotal":n}'
const HEADER = ['Launch date', 'Budget', 'Founder hours']
const SECTIONS = ['Objective', 'Proposition', 'Reasons to believe', 'Audience', 'KPI', 'Channels', 'Actions', 'Budget', 'Out of scope']
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
// a date as UTC midnight: 2027-02-03, 3 February 2027, February 3, 2027 (3-letter months too)
export function day (v) {
  const s = String(v || '').replace(/\(.*?\)/g, '').trim(), iso = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3])
  const mi = t => MONTHS.findIndex(m => m.startsWith(t.toLowerCase().slice(0, 3)))
  let m = s.match(/(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/); if (m && mi(m[2]) >= 0) return Date.UTC(+m[3], mi(m[2]), +m[1])
  m = s.match(/([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/); if (m && mi(m[1]) >= 0) return Date.UTC(+m[3], mi(m[1]), +m[2])
  return NaN
}
const lweek = v => { const m = String(v).replace(/[−–]/g, '-').match(/^\s*L\s*([+-]\s*\d{1,2}|0)\s*$/i); return m ? Number(m[1].replace(/\s/g, '')) : NaN }
const iso = t => new Date(t).toISOString().slice(0, 10)
export function check (md, limits = {}, assume = []) {
  const errors = [...methodLine(md)]
  for (const h of HEADER) { const v = header(md, h); if (v === null || unfilled(v)) errors.push(`header: "- **${h}:**" is missing or empty`) }
  for (const h of SECTIONS) { const s = section(md, h); if (s === null) errors.push(`no "## ${h}" section`); else if (unfilled(s)) errors.push(`"## ${h}" is empty`) }
  const launch = day(header(md, 'Launch date'))
  if (header(md, 'Launch date') && Number.isNaN(launch)) errors.push('header: the launch date is not a date (write e.g. "3 February 2027")')
  const hb = amount(header(md, 'Budget')), hh = amount(header(md, 'Founder hours'))
  if (limits.budget != null && hb != null && Math.abs(hb - limits.budget) > 0.5) errors.push(`header budget (${hb}) is not the request's budget (${limits.budget})`)
  if (limits.hours != null && hh != null && Math.abs(hh - limits.hours) > 0.01) errors.push(`header founder hours (${hh}) are not the request's (${limits.hours})`)
  const budget = limits.budget ?? hb ?? 0, hours = limits.hours ?? hh ?? 5
  const rows = table(section(md, 'Actions'), ['Week', 'Date', 'Action', 'Owner', 'Founder hours', 'Cost']) || []
  if (section(md, 'Actions') !== null && !rows.length) errors.push('"## Actions" needs the table | Week | Date | Action | Owner | Founder hours | Cost |')
  const load = {}, phases = new Set(); let actionCost = 0
  rows.forEach((r, i) => {
    const n = i + 1
    r.slice(0, 6).forEach((c, j) => { if (unfilled(c)) errors.push(`action ${n}: column ${j + 1} is not filled`) })
    const w = lweek(r[0]); if (Number.isNaN(w)) { errors.push(`action ${n}: week "${r[0]}" is not L-n, L0 or L+n`); return }
    phases.add(Math.sign(w))
    if (!Number.isNaN(launch)) { const want = launch + w * 7 * 864e5; if (day(r[1]) !== want) errors.push(`action ${n}: ${r[0]} is ${iso(want)}, not "${r[1]}" (the launch date plus ${w} weeks)`) }
    const h = num(r[4]), c = num(r[5])
    if (Number.isNaN(h)) errors.push(`action ${n}: founder hours must be a number (0 when someone else does it)`); else load[w] = (load[w] || 0) + h
    if (Number.isNaN(c)) errors.push(`action ${n}: cost must be a number (0 for time only)`); else actionCost += c
  })
  if (rows.length) for (const [s, name] of [[-1, 'before launch day (L-n)'], [0, 'on launch day (L0)'], [1, 'after launch day (L+n)']]) if (!phases.has(s)) errors.push(`no action ${name}`)
  for (const [w, h] of Object.entries(load)) if (h > hours + 0.01) errors.push(`L${w > 0 ? '+' : ''}${w}: ${h} founder hours, over the ${hours} a week`)
  const items = (section(md, 'Budget') || '').split('\n').filter(l => /^\s*[-*]\s+\S/.test(l))
  const lines = items.filter(l => !/^\s*[-*]\s*\**total/i.test(l)), totalLine = items.find(l => /^\s*[-*]\s*\**total/i.test(l))
  const amt = l => num(l.split(':').slice(1).join(':'))
  if (section(md, 'Budget') !== null && !totalLine) errors.push('the budget needs a "- Total: <amount>" line (0 when everything is the founder\'s time)')
  if (lines.some(l => Number.isNaN(amt(l)))) errors.push('every budget line needs "- <item>: <amount>"')
  const sum = lines.map(amt).filter(x => !Number.isNaN(x)).reduce((x, y) => x + y, 0), total = totalLine ? amt(totalLine) : sum
  if (totalLine && Math.abs(total - sum) > 0.5) errors.push(`the budget's total (${total}) is not the sum of its lines (${sum})`)
  if (rows.length && Math.abs(actionCost - total) > 0.5) errors.push(`the actions cost ${actionCost} in all, but the budget's total is ${total}`)
  if (total > budget + 0.5) errors.push(`the total of ${total} is over the budget of ${budget}${budget === 0 ? ' (no budget was given: owned channels and the founder\'s time only, 0)' : ''}`)
  errors.push(...tbd(md), ...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 30), actions: rows.length, budgetTotal: total }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const results = []; const t = (n, ok) => results.push({ name: n, pass: !!ok })
  const ex = path.join(import.meta.dirname, '..', 'reference', 'examples')
  const ours = fs.readdirSync(ex).filter(f => /^good-/.test(f) && /written by us/.test(read(path.join(ex, f)).split('\n')[0]))
  for (const f of ours) { const r = check(body(read(path.join(ex, f)))); t(`template example ${f} passes${r.ok ? '' : ': ' + r.errors.join('; ')}`, r.ok) }
  t('at least one template example', ours.length > 0)
  const good = body(read(path.join(ex, ours[0] || 'good-1.md')))
  t('the example passes with the request\'s limits', check(good, { budget: 500, hours: 8 }).ok)
  t('dates parse in three forms', day('2027-02-03') === day('3 February 2027') && day('Feb 3, 2027') === day('3 Feb 2027'))
  t('a date that is not launch + 7n fails', check(good.replace('| L-2 | 2027-01-20 | Write the announcement', '| L-2 | 2027-01-21 | Write the announcement')).errors.some(e => /L-2 is 2027-01-20/.test(e)))
  t('no action after launch day fails', check(good.replace(/^\| L\+\d.*\n/gm, '')).errors.some(e => /after launch day/.test(e)))
  t('hours over the stated hours in a week fail', check(good, { budget: 500, hours: 6 }).errors.some(e => /L-6: 7 founder hours, over the 6/.test(e)))
  t('budget lines that do not sum to the total fail', check(good.replace('- Total: 500', '- Total: 600')).errors.some(e => /not the sum/.test(e)))
  t('a total over the budget fails', check(good, { budget: 400, hours: 8 }).errors.some(e => /over the budget/.test(e) || /not the request's budget/.test(e)))
  t('actions that cost more than the budget lines fail', check(good.replace('| Founder | 4 | 0 |\n| L+4', '| Founder | 4 | 50 |\n| L+4')).errors.some(e => /actions cost 550/.test(e)))
  t('a missing section fails', check(good.replace(/^## Out of scope[\s\S]*?(?=^## Assumptions)/m, '')).errors.some(e => /Out of scope/.test(e)))
  t('an input left out with no Assumptions line fails', check(good, {}, [{ field: 'launch_date', label: 'Launch date' }]).errors.some(e => /"Launch date"/.test(e)))
  t('no Method line fails', check(good.replace(/^\*\*Method:\*\*.*\n/m, '')).errors.some(e => /Method/.test(e)))
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = arg(a, '--request')
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file>: it gives the budget, the hours and the inputs to list under Assumptions'] })); process.exit(2) }
const i = inputs(read(req))
const r = check(read(a[0]), { budget: i.budget, hours: i.hours }, i.assume); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
