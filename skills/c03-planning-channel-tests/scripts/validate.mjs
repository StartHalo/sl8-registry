#!/usr/bin/env node
// validate.mjs: completeness and arithmetic of the channel test plan (job card: Plan next quarter's
// channel tests). D40: every header field and section filled, "Against the goal" included (SHORTCOMINGS
// №177); all 19 Traction channels ranked A, B or C with a reason; every test cell filled and every test's
// channel ranked A; the total cost is the sum of the tests' and standing actions' costs and within the
// budget; in every week W1–W13 the hours of the running tests plus the standing actions are within the
// founder's hours, and so are they with a launch brief's actions added when the project has one (№172);
// every test starts and ends in W1–W13; every quotation found word for word in a page page.mjs saved, the
// request or an attached file, and every page cited read with page.mjs (№170, №173); no part marked
// (assumed) or (proposed) with "None" under Assumptions; the Method line; one Assumptions line per input the
// request left out. It never checks length, the number of tests or wording: the person judges quality.
// The budget and hours limits are the request's when it gives them (the header must then agree), else
// the header's stated values (explained under Assumptions), else 0 and 5.
// The project folder is --project, else the plan's own folder (its sources/, inputs/ and launch-brief.md).
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
import { section, header, table, unfilled, num, amount, assumptionLines, marksNeedAssumptions, methodLine, tbd, body, read, arg, week, channelLoad, combinedHours, TEST_COLS, STANDING_COLS } from './lib.mjs'
import { exact, checkQuotes, checkLinks, checkTags } from './page.mjs'
const HELP = 'usage: node validate.mjs <channel-tests.md> --request <request.md> [--icp <icp.md>] [--project artifacts/<product>] | --selftest\n  prints {"ok","errors":[…],"warnings":[…],"tests":n,"totalCost":n,"peakHours":n}'
export const CHANNELS = ['Viral marketing', 'Public relations', 'Unconventional PR', 'Search engine marketing', 'Social and display ads', 'Offline ads', 'Search engine optimization', 'Content marketing', 'Email marketing', 'Engineering as marketing', 'Targeting blogs', 'Business development', 'Sales', 'Affiliate programs', 'Existing platforms', 'Trade shows', 'Offline events', 'Speaking engagements', 'Community building']
const norm = s => String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/optimisation/g, 'optimization').replace(/\bpr\b/g, 'public relations').replace(/unconventional public relations/, 'unconventional pr').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
const canon = s => CHANNELS.find(c => norm(c) === norm(s) || (norm(s).startsWith(norm(c)) && norm(c).length > 4)) || null
const HEADER = ['Product', 'Goal', 'Against the goal', 'Budget', 'Founder hours', 'Weeks', 'Total cost']
const SECTIONS = ['Channels ranked', 'Tests', 'Standing actions', 'When a test clears']
// check(md, { limits, assume, project, request, file })
export function check (md, { limits = {}, assume = [], project = null, request = null, file = null } = {}) {
  const errors = [...methodLine(md)], warnings = []
  for (const h of HEADER) { const v = header(md, h); if (v === null || unfilled(v)) errors.push(`header: "- **${h}:**" is missing or empty${h === 'Against the goal' ? ' (what the thresholds add up to against the goal, and what reaching the goal needs beyond these tests)' : ''}`) }
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
  const tests = table(section(md, 'Tests'), TEST_COLS) || []
  if (section(md, 'Tests') !== null && !tests.length) errors.push('"## Tests" needs the table | # | Channel | What to do | Start week | Weeks | Cost | Hours a week | Threshold (set now) |')
  let total = 0
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
  })
  const standing = table(section(md, 'Standing actions'), STANDING_COLS) || []
  if (section(md, 'Standing actions') !== null && !standing.length) errors.push('"## Standing actions" needs the table | Action | Where | Hours a week | Cost |')
  standing.forEach((r, i) => {
    r.slice(0, 4).forEach((c, j) => { if (unfilled(c)) errors.push(`standing action ${i + 1}: column ${j + 1} is not filled`) })
    const h = num(r[2]), cost = num(r[3])
    if (Number.isNaN(h)) errors.push(`standing action ${i + 1}: hours a week must be a number`)
    if (Number.isNaN(cost)) errors.push(`standing action ${i + 1}: cost must be a number`); else total += cost
  })
  // limits
  const hb = amount(header(md, 'Budget')), hh = amount(header(md, 'Founder hours')), ht = header(md, 'Total cost')
  if (limits.budget != null && hb != null && Math.abs(hb - limits.budget) > 0.5) errors.push(`header budget (${hb}) is not the request's budget (${limits.budget})`)
  if (limits.hours != null && hh != null && Math.abs(hh - limits.hours) > 0.01) errors.push(`header founder hours (${hh}) are not the request's (${limits.hours})`)
  const budget = limits.budget ?? hb ?? 0, hours = limits.hours ?? hh ?? 5
  if (ht && !Number.isNaN(num(ht)) && Math.abs(num(ht) - total) > 0.5) errors.push(`the stated total cost (${num(ht)}) is not the sum of the tests' and standing actions' costs (${total})`)
  if (total > budget + 0.5) errors.push(`costs total ${total}, over the budget of ${budget}${budget === 0 ? ' (no budget was given: tests cost only the founder\'s time, 0)' : ''}`)
  const { load } = channelLoad(md)
  const over = load.map((h, k) => [k, h]).filter(([k, h]) => k >= 1 && h > hours + 0.01)
  for (const [k, h] of over.slice(0, 5)) errors.push(`W${k}: ${h} hours a week of tests and standing actions, over the founder's ${hours}`)
  // the founder's week across the project's plans: a launch brief's actions add to these weeks (№172)
  const launch = project && path.join(project, 'launch-brief.md')
  if (launch && fs.existsSync(launch) && path.resolve(launch) !== file) { const c = combinedHours(md, read(launch), hours); errors.push(...c.errors); warnings.push(...c.warnings) }
  // exact words and pages read (№170, №173)
  const ex = exact({ project, request, also: ['icp.md', 'launch-brief.md'].map(f => project && path.join(project, f)).filter(f => f && path.resolve(f) !== file) })
  errors.push(...ex.refused, ...checkQuotes(md, ex), ...checkLinks(md.replace(/^## Assumptions[\s\S]*$/m, ''), ex), ...checkTags(md, ex))
  errors.push(...marksNeedAssumptions(md), ...tbd(md), ...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 30), warnings, tests: tests.length, totalCost: total, peakHours: Math.max(...load) }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const results = []; const t = (n, ok) => results.push({ name: n, pass: !!ok })
  const ex = path.join(import.meta.dirname, '..', 'reference', 'examples')
  const ours = fs.readdirSync(ex).filter(f => /^good-/.test(f) && /written by us/.test(read(path.join(ex, f)).split('\n')[0]))
  // the example's project, as the machine holds it: the request it answers
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c03-ct-')), proj = path.join(tmp, 'artifacts', 'ledgerline'), file = path.join(proj, 'channel-tests.md')
  fs.mkdirSync(path.join(proj, 'inputs'), { recursive: true })
  const req = path.join(proj, 'inputs', 'request-channel-tests.md')
  fs.writeFileSync(req, 'Plan next quarter\'s channel tests\nProduct: Ledgerline, https://ledgerline.example\nGoal: 40 new trials a month by 31 March 2027 (today about 15 a month)\nBudget: $1,500\nFounder hours: 6 a week\nICP: bookkeeping firms of 3-10 staff\n')
  const v = (md, limits = {}, assume = []) => check(md, { limits, assume, project: proj, request: req, file })
  for (const f of ours) { const r = v(body(read(path.join(ex, f)))); t(`template example ${f} passes${r.ok ? '' : ': ' + r.errors.join('; ')}`, r.ok) }
  t('at least one template example', ours.length > 0)
  const good = body(read(path.join(ex, ours[0] || 'good-1.md')))
  t('the example passes with the request\'s limits', v(good, { budget: 1500, hours: 6 }).ok)
  t('a channel not ranked fails', v(good.replace(/^\| Trade shows .*\n/m, '')).errors.some(e => /not ranked: Trade shows/.test(e)))
  t('a test from the B list fails', v(good.replace('| 3 | Targeting blogs |', '| 3 | Content marketing |')).errors.some(e => /ranked B/.test(e)))
  t('costs over the budget fail', v(good, { budget: 1000, hours: 6 }).errors.some(e => /over the budget/.test(e) || /not the request's budget/.test(e)))
  t('with no budget anywhere, any cost fails', v(good.replace(/^- \*\*Budget:\*\*.*\n/m, '- **Budget:** none given\n')).errors.some(e => /over the budget of 0/.test(e)))
  t('a stated total that is not the sum fails', v(good.replace('**Total cost:** 1,200', '**Total cost:** 1,400')).errors.some(e => /not the sum/.test(e)))
  t('hours over the founder\'s in a week fail', v(good, { budget: 1500, hours: 4 }).errors.some(e => /^W\d+: .*over the founder's 4/.test(e)))
  t('a test past W13 fails', v(good.replace('| W6 | 4 | 0 | 3 |', '| W12 | 4 | 0 | 3 |')).errors.some(e => /past W13/.test(e)))
  t('an empty test cell fails', v(good.replace('| 6 trials from the two links by the end of W8 |', '| — |')).errors.some(e => /test 3: column 8/.test(e)))
  t('no "Against the goal" line fails (SHORTCOMINGS №177)', v(good.replace(/^- \*\*Against the goal:\*\*.*\n/m, '')).errors.some(e => /Against the goal/.test(e)))
  t('a quotation not in the sources fails (№170)', v(good.replace('*chase client receipts*', '"chase client receipts"')).errors.some(e => /"chase client receipts" is not word for word/.test(e)))
  t('a page cited but never read fails (№173)', v(good.replace('| the review sites buyers use (the founder checks which) |', '| https://reviews.example/ledgerline |')).errors.some(e => /reviews\.example\/ledgerline is cited, but page\.mjs never saved it/.test(e)))
  // a launch brief in the same project shares the founder's week (№172): W2 (11 January) holds 2 + 2 + 1 hours of
  // tests and the standing action; a launch action of 4 hours on 13 January makes 9, over 6
  const brief = '# Ledgerline: launch brief, sync\n\n- **Launch date:** 3 February 2027\n- **Budget:** 0\n- **Founder hours:** 6 a week\n\n## Actions\n| Week | Date | Action | Owner | Founder hours | Cost |\n|---|---|---|---|---|---|\n| L-3 | 2027-01-13 | Write the help page | Founder | 4 | 0 |\n| L0 | 2027-02-03 | Announce | Founder | 1 | 0 |\n'
  fs.writeFileSync(path.join(proj, 'launch-brief.md'), brief)
  t('with a launch brief in the project, the combined week over the founder\'s hours fails', v(good, { budget: 1500, hours: 6 }).errors.some(e => /^W2 of the channel tests \(week of 2027-01-11\): 5 hours .* plus 4 of launch actions \(L-3\) make 9, over the founder's 6/.test(e)))
  fs.writeFileSync(path.join(proj, 'launch-brief.md'), brief.replace('| 4 | 0 |', '| 1 | 0 |'))
  t('and a combined week within the hours passes', v(good, { budget: 1500, hours: 6 }).ok)
  fs.rmSync(path.join(proj, 'launch-brief.md'))
  t('a part marked (proposed) with "None" under Assumptions fails', v(good.replace('(today about 15 a month)', '(proposed)')).errors.some(e => /marked \(assumed\) or \(proposed\)/.test(e)))
  t('an input left out with no Assumptions line fails', v(good, {}, [{ field: 'goal', label: 'Goal' }]).errors.some(e => /"Goal"/.test(e)))
  t('no Method line fails', v(good.replace(/^\*\*Method:\*\*.*\n/m, '')).errors.some(e => /Method/.test(e)))
  fs.rmSync(tmp, { recursive: true, force: true })
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = arg(a, '--request')
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file>: it gives the budget, the hours and the inputs to list under Assumptions'] })); process.exit(2) }
const i = inputs(read(req), arg(a, '--icp')), proj = arg(a, '--project'), file = path.resolve(a[0])
const r = check(read(a[0]), { limits: { budget: i.budget, hours: i.hours }, assume: i.assume, project: proj && fs.existsSync(proj) ? path.resolve(proj) : path.dirname(file), request: req, file })
console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
