#!/usr/bin/env node
// validate.mjs: completeness and arithmetic of the channel test plan (job card: Plan next quarter's
// channel tests). D40: every header field and section filled; all 19 Traction channels ranked A, B or C
// with a reason; every test cell filled and every test's channel ranked A; the total cost is the sum of
// the tests' and standing actions' costs and within the budget; in every week W1–W13 the hours of the
// running tests plus the standing actions are within the founder's hours; every test starts and ends in
// W1–W13; the Method line; one Assumptions line per input the request left out. It never checks length,
// the number of tests or wording: the person judges quality.
// The budget and hours limits are the request's when it gives them (the header must then agree), else
// the header's stated values (explained under Assumptions), else 0 and 5.
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
import { section, header, table, unfilled, num, amount, assumptionLines, methodLine, tbd, body, read, arg } from './lib.mjs'
const HELP = 'usage: node validate.mjs <channel-tests.md> --request <request.md> [--icp <icp.md>] | --selftest\n  prints {"ok","errors":[…],"tests":n,"totalCost":n,"peakHours":n}'
export const CHANNELS = ['Viral marketing', 'Public relations', 'Unconventional PR', 'Search engine marketing', 'Social and display ads', 'Offline ads', 'Search engine optimization', 'Content marketing', 'Email marketing', 'Engineering as marketing', 'Targeting blogs', 'Business development', 'Sales', 'Affiliate programs', 'Existing platforms', 'Trade shows', 'Offline events', 'Speaking engagements', 'Community building']
const norm = s => String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/optimisation/g, 'optimization').replace(/\bpr\b/g, 'public relations').replace(/unconventional public relations/, 'unconventional pr').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
const canon = s => CHANNELS.find(c => norm(c) === norm(s) || (norm(s).startsWith(norm(c)) && norm(c).length > 4)) || null
const HEADER = ['Product', 'Goal', 'Budget', 'Founder hours', 'Weeks', 'Total cost']
const SECTIONS = ['Channels ranked', 'Tests', 'Standing actions', 'When a test clears']
const week = v => { const m = String(v).match(/^\s*W?(\d{1,2})\s*$/i); return m ? Number(m[1]) : NaN }
export function check (md, limits = {}, assume = []) {
  const errors = [...methodLine(md)]
  for (const h of HEADER) { const v = header(md, h); if (v === null || unfilled(v)) errors.push(`header: "- **${h}:**" is missing or empty`) }
  for (const h of SECTIONS) { const s = section(md, h); if (s === null) errors.push(`no "## ${h}" section`); else if (unfilled(s)) errors.push(`"## ${h}" is empty`) }
  // ranks
  const ranked = table(section(md, 'Channels ranked'), ['Channel', 'Rank', 'Reason']) || []
  if (section(md, 'Channels ranked') !== null && !ranked.length) errors.push('"## Channels ranked" needs the table | Channel | Rank | Reason |')
  const rank = {}
  ranked.forEach((r, i) => {
    const c = canon(r[0]); if (!c) { errors.push(`ranked row ${i + 1}: "${r[0]}" is not one of the 19 Traction channels`); return }
    if (!/^[ABC]$/.test((r[1] || '').trim())) errors.push(`${c}: rank must be A, B or C`)
    if (unfilled(r[2])) errors.push(`${c}: no reason`)
    rank[c] = (r[1] || '').trim()
  })
  const missingCh = CHANNELS.filter(c => !(c in rank))
  if (ranked.length && missingCh.length) errors.push(`not ranked: ${missingCh.join(', ')} (rank all 19 channels)`)
  // tests
  const tests = table(section(md, 'Tests'), ['#', 'Channel', 'What to do', 'Start week', 'Weeks', 'Cost', 'Hours a week', 'Threshold']) || []
  if (section(md, 'Tests') !== null && !tests.length) errors.push('"## Tests" needs the table | # | Channel | What to do | Start week | Weeks | Cost | Hours a week | Threshold (set now) |')
  const load = Array(14).fill(0); let total = 0
  tests.forEach((r, i) => {
    const n = i + 1
    r.slice(0, 8).forEach((c, j) => { if (unfilled(c)) errors.push(`test ${n}: column ${j + 1} is not filled`) })
    const c = canon(r[1]); if (!c) errors.push(`test ${n}: "${r[1]}" is not one of the 19 Traction channels`); else if (rank[c] && rank[c] !== 'A') errors.push(`test ${n}: ${c} is ranked ${rank[c]}; tests come from the A list`)
    const s = week(r[3]), w = num(r[4]), cost = num(r[5]), h = num(r[6])
    if (!(s >= 1 && s <= 13)) errors.push(`test ${n}: start week must be W1–W13`)
    if (!(w >= 1) || !Number.isInteger(w)) errors.push(`test ${n}: weeks must be a whole number of weeks`)
    else if (s >= 1 && s + w - 1 > 13) errors.push(`test ${n}: runs W${s}–W${s + w - 1}, past W13`)
    if (Number.isNaN(cost)) errors.push(`test ${n}: cost must be a number (0 for the founder's time only)`); else total += cost
    if (Number.isNaN(h)) errors.push(`test ${n}: hours a week must be a number`)
    else if (s >= 1 && w >= 1) for (let k = s; k <= Math.min(13, s + w - 1); k++) load[k] += h
  })
  const standing = table(section(md, 'Standing actions'), ['Action', 'Where', 'Hours a week', 'Cost']) || []
  if (section(md, 'Standing actions') !== null && !standing.length) errors.push('"## Standing actions" needs the table | Action | Where | Hours a week | Cost |')
  standing.forEach((r, i) => {
    r.slice(0, 4).forEach((c, j) => { if (unfilled(c)) errors.push(`standing action ${i + 1}: column ${j + 1} is not filled`) })
    const h = num(r[2]), cost = num(r[3])
    if (Number.isNaN(h)) errors.push(`standing action ${i + 1}: hours a week must be a number`); else for (let k = 1; k <= 13; k++) load[k] += h
    if (Number.isNaN(cost)) errors.push(`standing action ${i + 1}: cost must be a number`); else total += cost
  })
  // limits
  const hb = amount(header(md, 'Budget')), hh = amount(header(md, 'Founder hours')), ht = header(md, 'Total cost')
  if (limits.budget != null && hb != null && Math.abs(hb - limits.budget) > 0.5) errors.push(`header budget (${hb}) is not the request's budget (${limits.budget})`)
  if (limits.hours != null && hh != null && Math.abs(hh - limits.hours) > 0.01) errors.push(`header founder hours (${hh}) are not the request's (${limits.hours})`)
  const budget = limits.budget ?? hb ?? 0, hours = limits.hours ?? hh ?? 5
  if (ht && !Number.isNaN(num(ht)) && Math.abs(num(ht) - total) > 0.5) errors.push(`the stated total cost (${num(ht)}) is not the sum of the tests' and standing actions' costs (${total})`)
  if (total > budget + 0.5) errors.push(`costs total ${total}, over the budget of ${budget}${budget === 0 ? ' (no budget was given: tests cost only the founder\'s time, 0)' : ''}`)
  const over = load.map((h, k) => [k, h]).filter(([k, h]) => k >= 1 && h > hours + 0.01)
  for (const [k, h] of over.slice(0, 5)) errors.push(`W${k}: ${h} hours a week of tests and standing actions, over the founder's ${hours}`)
  errors.push(...tbd(md), ...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 30), tests: tests.length, totalCost: total, peakHours: Math.max(...load) }
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
  t('the example passes with the request\'s limits', check(good, { budget: 1500, hours: 6 }).ok)
  t('a channel not ranked fails', check(good.replace(/^\| Trade shows .*\n/m, '')).errors.some(e => /not ranked: Trade shows/.test(e)))
  t('a test from the B list fails', check(good.replace('| 3 | Targeting blogs |', '| 3 | Content marketing |')).errors.some(e => /ranked B/.test(e)))
  t('costs over the budget fail', check(good, { budget: 1000, hours: 6 }).errors.some(e => /over the budget/.test(e) || /not the request's budget/.test(e)))
  t('with no budget anywhere, any cost fails', check(good.replace(/^- \*\*Budget:\*\*.*\n/m, '- **Budget:** none given\n')).errors.some(e => /over the budget of 0/.test(e)))
  t('a stated total that is not the sum fails', check(good.replace('**Total cost:** 1,200', '**Total cost:** 1,400')).errors.some(e => /not the sum/.test(e)))
  t('hours over the founder\'s in a week fail', check(good, { budget: 1500, hours: 4 }).errors.some(e => /^W\d+: .*over the founder's 4/.test(e)))
  t('a test past W13 fails', check(good.replace('| W6 | 4 | 0 | 3 |', '| W12 | 4 | 0 | 3 |')).errors.some(e => /past W13/.test(e)))
  t('an empty test cell fails', check(good.replace('| 6 trials from the two links by the end of W8 |', '| — |')).errors.some(e => /test 3: column 8/.test(e)))
  t('an input left out with no Assumptions line fails', check(good, {}, [{ field: 'goal', label: 'Goal' }]).errors.some(e => /"Goal"/.test(e)))
  t('no Method line fails', check(good.replace(/^\*\*Method:\*\*.*\n/m, '')).errors.some(e => /Method/.test(e)))
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = arg(a, '--request')
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file>: it gives the budget, the hours and the inputs to list under Assumptions'] })); process.exit(2) }
const i = inputs(read(req), arg(a, '--icp'))
const r = check(read(a[0]), { budget: i.budget, hours: i.hours }, i.assume); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
