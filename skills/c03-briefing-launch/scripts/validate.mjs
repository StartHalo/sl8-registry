#!/usr/bin/env node
// validate.mjs: completeness and arithmetic of the launch brief (job card: Brief a feature or integration
// launch). D40: every header field and section filled; the actions table has every cell filled and at
// least one action before (L-n), on (L0) and after (L+n) launch day; each action's date is the launch date
// plus 7n days; the founder's hours in each week are within the stated hours, and so are they with the
// channel tests' hours added when the project has a channel-test plan (SHORTCOMINGS №172); the budget lines
// sum to the total, the actions' costs sum to the same total, and it is within the budget; every reason
// to believe ends with its source tag, (source: <where>, "<the words>"), or "not found: looked in …";
// every quotation found word for word in a page page.mjs saved, the request or an attached file, a tag's
// words on the source it names, and every page cited read with page.mjs (№170, №173); no part marked
// (assumed) or (proposed) with "None" under Assumptions; the Method line; one Assumptions line per input
// the request left out. It never checks length, counts or wording.
// The budget and hours limits are the request's when it gives them (the header must then agree), else
// the header's stated values (explained under Assumptions), else 0 and 5.
// The project folder is --project, else the brief's own folder (its sources/, inputs/ and channel-tests.md).
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
import { section, header, table, unfilled, num, amount, bullets, assumptionLines, marksNeedAssumptions, methodLine, tbd, body, read, arg, day, iso, lweek, DAY, combinedHours, ACTION_COLS } from './lib.mjs'
import { exact, checkQuotes, checkLinks, checkTags, tagsIn } from './page.mjs'
const HELP = 'usage: node validate.mjs <launch-brief.md> --request <request.md> [--project artifacts/<product>] | --selftest\n  prints {"ok","errors":[…],"warnings":[…],"actions":n,"budgetTotal":n}'
const HEADER = ['Launch date', 'Budget', 'Founder hours']
const SECTIONS = ['Objective', 'Proposition', 'Reasons to believe', 'Audience', 'KPI', 'Channels', 'Actions', 'Budget', 'Out of scope']
export { day }
// check(md, { limits, assume, project, request, file })
export function check (md, { limits = {}, assume = [], project = null, request = null, file = null } = {}) {
  const errors = [...methodLine(md)], warnings = []
  for (const h of HEADER) { const v = header(md, h); if (v === null || unfilled(v)) errors.push(`header: "- **${h}:**" is missing or empty`) }
  for (const h of SECTIONS) { const s = section(md, h); if (s === null) errors.push(`no "## ${h}" section`); else if (unfilled(s)) errors.push(`"## ${h}" is empty`) }
  const launch = day(header(md, 'Launch date'))
  if (header(md, 'Launch date') && Number.isNaN(launch)) errors.push('header: the launch date is not a date (write e.g. "3 February 2027")')
  const hb = amount(header(md, 'Budget')), hh = amount(header(md, 'Founder hours'))
  if (limits.budget != null && hb != null && Math.abs(hb - limits.budget) > 0.5) errors.push(`header budget (${hb}) is not the request's budget (${limits.budget})`)
  if (limits.hours != null && hh != null && Math.abs(hh - limits.hours) > 0.01) errors.push(`header founder hours (${hh}) are not the request's (${limits.hours})`)
  const budget = limits.budget ?? hb ?? 0, hours = limits.hours ?? hh ?? 5
  const rows = table(section(md, 'Actions'), ACTION_COLS) || []
  if (section(md, 'Actions') !== null && !rows.length) errors.push('"## Actions" needs the table | Week | Date | Action | Owner | Founder hours | Cost |')
  const load = {}, phases = new Set(); let actionCost = 0
  rows.forEach((r, i) => {
    const n = i + 1
    r.slice(0, 6).forEach((c, j) => { if (unfilled(c)) errors.push(`action ${n}: column ${j + 1} is not filled`) })
    const w = lweek(r[0]); if (Number.isNaN(w)) { errors.push(`action ${n}: week "${r[0]}" is not L-n, L0 or L+n`); return }
    phases.add(Math.sign(w))
    if (!Number.isNaN(launch)) { const want = launch + w * 7 * DAY; if (day(r[1]) !== want) errors.push(`action ${n}: ${r[0]} is ${iso(want)}, not "${r[1]}" (the launch date plus ${w} weeks)`) }
    const h = num(r[4]), c = num(r[5])
    if (Number.isNaN(h)) errors.push(`action ${n}: founder hours must be a number (0 when someone else does it)`); else load[w] = (load[w] || 0) + h
    if (Number.isNaN(c)) errors.push(`action ${n}: cost must be a number (0 for time only)`); else actionCost += c
  })
  if (rows.length) for (const [s, name] of [[-1, 'before launch day (L-n)'], [0, 'on launch day (L0)'], [1, 'after launch day (L+n)']]) if (!phases.has(s)) errors.push(`no action ${name}`)
  for (const [w, h] of Object.entries(load)) if (h > hours + 0.01) errors.push(`L${w > 0 ? '+' : ''}${w}: ${h} founder hours, over the ${hours} a week`)
  // the founder's week across the project's plans: the channel tests' hours add to the launch weeks (№172)
  const tests = project && path.join(project, 'channel-tests.md')
  if (tests && fs.existsSync(tests) && path.resolve(tests) !== file) { const c = combinedHours(read(tests), md, hours); errors.push(...c.errors); warnings.push(...c.warnings) }
  const items = (section(md, 'Budget') || '').split('\n').filter(l => /^\s*[-*]\s+\S/.test(l))
  const lines = items.filter(l => !/^\s*[-*]\s*\**total/i.test(l)), totalLine = items.find(l => /^\s*[-*]\s*\**total/i.test(l))
  const amt = l => num(l.split(':').slice(1).join(':'))
  if (section(md, 'Budget') !== null && !totalLine) errors.push('the budget needs a "- Total: <amount>" line (0 when everything is the founder\'s time)')
  if (lines.some(l => Number.isNaN(amt(l)))) errors.push('every budget line needs "- <item>: <amount>"')
  const sum = lines.map(amt).filter(x => !Number.isNaN(x)).reduce((x, y) => x + y, 0), total = totalLine ? amt(totalLine) : sum
  if (totalLine && Math.abs(total - sum) > 0.5) errors.push(`the budget's total (${total}) is not the sum of its lines (${sum})`)
  if (rows.length && Math.abs(actionCost - total) > 0.5) errors.push(`the actions cost ${actionCost} in all, but the budget's total is ${total}`)
  if (total > budget + 0.5) errors.push(`the total of ${total} is over the budget of ${budget}${budget === 0 ? ' (no budget was given: owned channels and the founder\'s time only, 0)' : ''}`)
  // reasons to believe carry their words; quotations and pages are the sources' own (№170, №173)
  bullets(section(md, 'Reasons to believe')).forEach((b, i) => { if (!tagsIn(b).length && !/not found: looked in/i.test(b)) errors.push(`reason to believe ${i + 1}: end it with (source: <a page you read or the request>, "<the words, copied exactly>"), or write "not found: looked in <where>"`) })
  const ex = exact({ project, request, also: ['icp.md', 'channel-tests.md'].map(f => project && path.join(project, f)).filter(f => f && path.resolve(f) !== file) })
  errors.push(...ex.refused, ...checkQuotes(md, ex), ...checkLinks(md.replace(/^## Assumptions[\s\S]*$/m, ''), ex), ...checkTags(md, ex))
  errors.push(...marksNeedAssumptions(md), ...tbd(md), ...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 30), warnings, actions: rows.length, budgetTotal: total }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const results = []; const t = (n, ok) => results.push({ name: n, pass: !!ok })
  const ex = path.join(import.meta.dirname, '..', 'reference', 'examples')
  const ours = fs.readdirSync(ex).filter(f => /^good-/.test(f) && /written by us/.test(read(path.join(ex, f)).split('\n')[0]))
  // the example's project, as the machine holds it: the pages page.mjs saved and the request
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c03-lb-')), proj = path.join(tmp, 'artifacts', 'ledgerline'), file = path.join(proj, 'launch-brief.md')
  fs.mkdirSync(path.join(proj, 'sources'), { recursive: true }); fs.mkdirSync(path.join(proj, 'inputs'))
  for (const p of fs.readdirSync(ex).filter(f => /^page-\d+\.md$/.test(f))) fs.copyFileSync(path.join(ex, p), path.join(proj, 'sources', p))
  const req = path.join(proj, 'inputs', 'request-launch.md')
  fs.writeFileSync(req, 'Brief a feature or integration launch\nLaunch: two-way Tallybook sync; 10 pilot firms ran it for 6 weeks with no duplicate entries\nProduct: https://ledgerline.example\nLaunch date: 3 February 2027\nAudience: our 400 accounts that also use Tallybook\nTarget: 60 of the 400 accounts connect within 4 weeks\nBudget: $500\nFounder hours: 8 a week\nPartner: Tallybook app marketplace\n')
  const v = (md, limits = {}, assume = []) => check(md, { limits, assume, project: proj, request: req, file })
  for (const f of ours) { const r = v(body(read(path.join(ex, f)))); t(`template example ${f} passes${r.ok ? '' : ': ' + r.errors.join('; ')}`, r.ok) }
  t('at least one template example', ours.length > 0)
  const good = body(read(path.join(ex, ours[0] || 'good-1.md')))
  t('the example passes with the request\'s limits', v(good, { budget: 500, hours: 8 }).ok)
  t('dates parse in three forms', day('2027-02-03') === day('3 February 2027') && day('Feb 3, 2027') === day('3 Feb 2027'))
  t('a date that is not launch + 7n fails', v(good.replace('| L-2 | 2027-01-20 | Write the announcement', '| L-2 | 2027-01-21 | Write the announcement')).errors.some(e => /L-2 is 2027-01-20/.test(e)))
  t('no action after launch day fails', v(good.replace(/^\| L\+\d.*\n/gm, '')).errors.some(e => /after launch day/.test(e)))
  t('hours over the stated hours in a week fail', v(good, { budget: 500, hours: 6 }).errors.some(e => /L-6: 7 founder hours, over the 6/.test(e)))
  t('budget lines that do not sum to the total fail', v(good.replace('- Total: 500', '- Total: 600')).errors.some(e => /not the sum/.test(e)))
  t('a total over the budget fails', v(good, { budget: 400, hours: 8 }).errors.some(e => /over the budget/.test(e) || /not the request's budget/.test(e)))
  t('actions that cost more than the budget lines fail', v(good.replace('| Founder | 4 | 0 |\n| L+4', '| Founder | 4 | 50 |\n| L+4')).errors.some(e => /actions cost 550/.test(e)))
  t('a missing section fails', v(good.replace(/^## Out of scope[\s\S]*?(?=^## Assumptions)/m, '')).errors.some(e => /Out of scope/.test(e)))
  t('a reason to believe with no source tag fails', v(good.replace(/^(- A client added in Tallybook appears in Ledgerline's chase list the same day) \(source:.*$/m, '$1 (sync spec).')).errors.some(e => /reason to believe 2: end it with/.test(e)))
  t('a quotation not word for word in the sources fails (SHORTCOMINGS №170)', v(good.replace('"10 pilot firms ran it for 6 weeks with no duplicate entries"', '"10 pilot firms ran it for 6 weeks with zero duplicates"')).errors.some(e => /"10 pilot firms ran it for 6 weeks with zero duplicates" is not word for word/.test(e)))
  t('a page cited but never read fails (№173)', v(good.replace('## KPI\n', '## KPI\nInstalls from https://tallybook.example/partners/analytics.\n')).errors.some(e => /tallybook\.example\/partners\/analytics is cited, but page\.mjs never saved it/.test(e)))
  t('a tag naming the wrong source fails', v(good.replace('(source: the request, "10 pilot firms ran it for 6 weeks with no duplicate entries")', '(source: https://ledgerline.example/integrations/tallybook, "10 pilot firms ran it for 6 weeks with no duplicate entries")')).errors.some(e => /is not on https:\/\/ledgerline\.example\/integrations\/tallybook/.test(e)))
  // the channel tests in the same project share the founder's week (№172): W2 starts 4 January 2027 + 7 days;
  // its tests take 6 hours, and the launch's L-4 (6 January, W1) and L-2 (20 January, W3) add theirs
  const plan = '# Ledgerline: channel tests\n\n- **Weeks:** W1 = 4 January 2027 to W13 = 29 March 2027\n\n## Tests\n| # | Channel | What to do | Start week | Weeks | Cost | Hours a week | Threshold (set now) |\n|---|---|---|---|---|---|---|---|\n| 1 | Sales | 100 emails | W1 | 4 | 0 | 5 | 5 demos by the end of W4 |\n\n## Standing actions\n| Action | Where | Hours a week | Cost |\n|---|---|---|---|\n| Review ask | review sites | 1 | 0 |\n'
  fs.writeFileSync(path.join(proj, 'channel-tests.md'), plan)
  const c = v(good, { budget: 500, hours: 8 })
  t('with channel tests in the project, a combined week over the founder\'s hours fails', c.errors.some(e => /^W1 of the channel tests \(week of 2027-01-04\): 6 hours .* plus 3 of launch actions \(L-4\) make 9, over the founder's 8/.test(e)) && c.errors.some(e => /^W3 .* plus 7 of launch actions \(L-2\) make 13/.test(e)))
  const open = good.replace('- **Founder hours:** 8 a week', '- **Founder hours:** 13 a week (assumed: 8 given, 5 more in launch weeks)').replace(/## Assumptions[\s\S]*$/, '## Assumptions\n- **Launch hours:** the channel tests fill 6 hours in W1 to W4; assumed 13 a week there. Send whether you can add them, or which test to pause.\n')
  t('an overbooked week stated openly (the header assumes the hours, with its Assumptions line) passes', v(open, { budget: 500 }).ok)
  fs.writeFileSync(path.join(proj, 'channel-tests.md'), plan.replace('| W1 | 4 | 0 | 5 |', '| W9 | 4 | 0 | 5 |'))
  t('and weeks that do not overlap pass', v(good, { budget: 500, hours: 8 }).ok)
  fs.rmSync(path.join(proj, 'channel-tests.md'))
  t('a part marked (assumed) with "None" under Assumptions fails', v(good.replace('- **Launch date:** 3 February 2027', '- **Launch date:** 3 February 2027 (assumed)')).errors.some(e => /marked \(assumed\)/.test(e)))
  t('an input left out with no Assumptions line fails', v(good, {}, [{ field: 'launch_date', label: 'Launch date' }]).errors.some(e => /"Launch date"/.test(e)))
  t('no Method line fails', v(good.replace(/^\*\*Method:\*\*.*\n/m, '')).errors.some(e => /Method/.test(e)))
  fs.rmSync(tmp, { recursive: true, force: true })
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = arg(a, '--request')
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file>: it gives the budget, the hours and the inputs to list under Assumptions'] })); process.exit(2) }
const i = inputs(read(req)), proj = arg(a, '--project'), file = path.resolve(a[0])
const r = check(read(a[0]), { limits: { budget: i.budget, hours: i.hours }, assume: i.assume, project: proj && fs.existsSync(proj) ? path.resolve(proj) : path.dirname(file), request: req, file })
console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
