#!/usr/bin/env node
// validate.mjs: completeness and wiring of the ICP and positioning one-pager (job card: Define our ideal
// customer and positioning). D40: every section present and filled; every field of every segment filled,
// "## Segment N (optional):" included (SHORTCOMINGS №175; "not found: looked in …" counts as filled); the
// primary segment named; every link in the body listed under Sources, and every page under Sources read
// word for word by page.mjs into sources/ (№173, №176); every quotation found word for word in those pages,
// the request or an attached file, and a "(source: <where>, "<words>")" tag's words on the source it names
// (№170); every value with its source tag or "not found: looked in …"; a "- Searched:" line under Sources
// when the request named no competitors (№171); no part marked (assumed) with "None" under Assumptions;
// the Method line; one Assumptions line per input the request left out. It never checks length, the number
// of segments or wording: the person judges quality.
// The project folder is --project, else the one-pager's own folder (its sources/ and inputs/ are read).
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
import { section, field, unfilled, bullets, assumptionLines, marksNeedAssumptions, methodLine, tbd, body, read, arg } from './lib.mjs'
import { exact, checkQuotes, checkLinks, checkTags, tagsIn, urlsIn, canonUrl } from './page.mjs'
const HELP = 'usage: node validate.mjs <icp.md> --request <request.md> [--project artifacts/<product>] | --selftest\n  prints {"ok","errors":[…],"segments":n,"sources":[…]}; fix every error and rerun until ok'
const SECTIONS = ['Competitive alternatives', 'Unique attributes', 'Value', 'Market category', 'Positioning', 'Sources']
const FIELDS = ['Company type and size', 'Buyer', 'User', 'Trigger', 'Where to reach', 'Evidence']
const OTHER = ['channel-tests.md', 'launch-brief.md']
// check(md, { assume, project, request, file }): the one-pager's text and the inputs the request left out
export function check (md, { assume = [], project = null, request = null, file = null } = {}) {
  const errors = [...methodLine(md)]
  for (const h of SECTIONS) { const s = section(md, h); if (s === null) errors.push(`no "## ${h}" section`); else if (unfilled(s)) errors.push(`"## ${h}" is empty`) }
  // every "## Segment N" heading starts a segment, "(optional)" or not
  const segs = md.split(/^## Segment \d+\b.*$/m).slice(1)
  if (!segs.length) errors.push('no segment: write each as "## Segment N: <name>" with its six fields')
  segs.forEach((s, i) => { const b = s.split(/^## /m)[0]; for (const f of FIELDS) { const v = field(b, f); if (v === null || unfilled(v)) errors.push(`segment ${i + 1}: "${f}" is missing or empty (write "not found: looked in <where>" if you could not find it)`) } })
  if (!/^\*\*Primary segment:\*\*\s*\S/m.test(md)) errors.push('no "**Primary segment:**" line')
  // Sources: every link in the body is listed; every listed page was read word for word
  const src = section(md, 'Sources') || ''
  const rest = md.replace(/^## (?:Sources|Assumptions)[^\n]*\n[\s\S]*?(?=^## |(?![\s\S]))/gm, '')
  const listed = new Set(urlsIn(src).map(canonUrl))
  const unlisted = [...new Set(urlsIn(rest))].filter(u => !listed.has(canonUrl(u)))
  for (const u of unlisted.slice(0, 10)) errors.push(`${u} is cited but not listed under "## Sources"`)
  const ex = exact({ project, request, also: OTHER.map(f => project && path.join(project, f)).filter(f => f && f !== file) })
  for (const r of ex.refused) errors.push(r)
  errors.push(...checkLinks(src, ex, { saved: true }), ...checkQuotes(md, ex), ...checkTags(md, ex))
  // value: each has its proof's words, or says where you looked
  bullets(section(md, 'Value')).forEach((b, i) => { if (!tagsIn(b).length && !/not found: looked in/i.test(b)) errors.push(`value ${i + 1}: end it with its proof, (source: <a page you read, the request or review text sent>, "<the words, copied exactly>"), or write "not found: looked in <where>"`) })
  // the alternatives search, when the request named no competitors
  if (assume.some(x => x.field === 'competitors')) { const s = (src.match(/^\s*[-*]\s*\**Searched:?\**:?\s*(.*)$/mi) || [])[1]; if (!s || unfilled(s)) errors.push('the request named no competitors, so Sources needs "- Searched: *<query>*, *<query>*" (the searches you ran), or "- Searched: none: <why>" with an Assumptions line saying how you chose them') }
  errors.push(...marksNeedAssumptions(md), ...tbd(md), ...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 30), segments: segs.length, sources: ex.pages.map(p => path.basename(p.file)) }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const results = []; const t = (n, ok) => results.push({ name: n, pass: !!ok })
  // the template example is what the agent imitates: it must pass in its project, the saved pages it
  // quotes beside it (real published references are for the person, D40)
  const ex = path.join(import.meta.dirname, '..', 'reference', 'examples')
  const ours = fs.readdirSync(ex).filter(f => /^good-/.test(f) && /written by us/.test(read(path.join(ex, f)).split('\n')[0]))
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c03-icp-')), proj = path.join(tmp, 'artifacts', 'ledgerline'), file = path.join(proj, 'icp.md')
  fs.mkdirSync(path.join(proj, 'sources'), { recursive: true }); fs.mkdirSync(path.join(proj, 'inputs'))
  for (const p of fs.readdirSync(ex).filter(f => /^page-\d+\.md$/.test(f))) fs.copyFileSync(path.join(ex, p), path.join(proj, 'sources', p))
  const req = path.join(proj, 'inputs', 'request-icp.md')
  fs.writeFileSync(req, 'Define our ideal customer and positioning\nProduct: Ledgerline, https://ledgerline.example\nSales motion and price: 14-day trial, $49 a month\nBest customers today: bookkeeping firms\n')
  const assume = inputs(read(req)).assume
  const v = (md, as = assume) => check(md, { assume: as, project: proj, request: req, file })
  for (const f of ours) { const r = v(body(read(path.join(ex, f)))); t(`template example ${f} passes${r.ok ? '' : ': ' + r.errors.join('; ')}`, r.ok) }
  t('at least one template example', ours.length > 0)
  const good = body(read(path.join(ex, ours[0] || 'good-1.md')))
  t('a part not filled fails', v(good.replace(/(\*\*Trigger:\*\*).*/, '$1 [TBD]')).errors.some(e => /Trigger/.test(e)))
  t('"not found: looked in …" counts as filled', v(good.replace(/(\*\*Trigger:\*\*).*/, '$1 not found: looked in the site and the request')).ok)
  t('an optional segment is checked too (SHORTCOMINGS №175)', /^## Segment 2 \(optional\)/m.test(good) && v(good.replace(/(## Segment 2 \(optional\)[\s\S]*?\*\*Trigger:\*\*).*/, '$1')).errors.some(e => /segment 2: "Trigger"/.test(e)))
  t('a missing section fails', v(good.replace(/^## Market category[\s\S]*?(?=^## Positioning)/m, '')).errors.some(e => /Market category/.test(e)))
  t('a link not listed under Sources fails', v(good.replace('## Value\n', '## Value\n- Faster close: not found: looked in https://other.example/case\n')).errors.some(e => /other\.example\/case is cited but not listed/.test(e)))
  t('a page under Sources that page.mjs never saved fails (№173, №176)', v(good.replace('## Sources\n', '## Sources\n- https://other.example/case\n')).errors.some(e => /other\.example\/case is cited, but page\.mjs never saved it/.test(e)))
  t('a quotation not word for word on a saved page fails (№170)', v(good.replace('"Our pilot firms closed month-end in 3 days instead of 6"', '"Our pilot firms close month-end twice as fast"')).errors.some(e => /is not word for word/.test(e)))
  t('a quoted search phrase fails: phrases go in italics', v(good.replace('*chase client receipts*', '"chase client receipts"')).errors.some(e => /"chase client receipts" is not word for word/.test(e)))
  t('a tag whose words are on another page fails', v(good.replace(/\(source: https:\/\/ledgerline\.example, "Our pilot/, '(source: https://receiptly.example/pricing, "Our pilot')).errors.some(e => /is not on https:\/\/receiptly\.example\/pricing/.test(e)))
  t('a value with no proof tag fails', v(good.replace(/^(- Month-end close takes less time):.*$/m, '$1: 3 days instead of 6.')).errors.some(e => /value 1: end it with its proof/.test(e)))
  t('competitors assumed and no Searched line fails (№171)', v(good.replace(/^- Searched:.*\n/m, '')).errors.some(e => /needs "- Searched:/.test(e)))
  t('competitors given: no Searched line needed', v(good.replace(/^- Searched:.*\n/m, ''), assume.filter(x => x.field !== 'competitors')).errors.every(e => !/Searched/.test(e)))
  t('a part marked (assumed) with "None" under Assumptions fails', v(good.replace(/## Assumptions[\s\S]*$/, '## Assumptions\n- None: every input was given.\n'), []).errors.some(e => /marked \(assumed\)/.test(e)))
  t('no Method line fails', v(good.replace(/^\*\*Method:\*\*.*\n/m, '')).errors.some(e => /Method/.test(e)))
  t('an input left out with no Assumptions line fails', v(good.replace(/^- \*\*Review text:\*\*.*\n/m, '')).errors.some(e => /"Review text"/.test(e)))
  t('an empty Assumptions section fails', v(good.replace(/## Assumptions[\s\S]*$/, '## Assumptions\n')).errors.some(e => /Assumptions/.test(e)))
  fs.writeFileSync(path.join(proj, 'sources', 'notes.md'), 'paraphrased: pilot firms closed faster')
  t('a file the agent wrote in sources/ is refused', v(good).errors.some(e => /notes\.md: not saved by page\.mjs/.test(e)))
  fs.rmSync(tmp, { recursive: true, force: true })
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = arg(a, '--request')
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file> so the Assumptions lines can be checked'] })); process.exit(2) }
const proj = arg(a, '--project'), file = path.resolve(a[0])
const r = check(read(a[0]), { assume: inputs(read(req)).assume, project: proj && fs.existsSync(proj) ? path.resolve(proj) : path.dirname(file), request: req, file })
console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
