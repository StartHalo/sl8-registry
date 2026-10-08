#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic only (D40) for the test design. Never wording or
// quality: whether the route, measures and rule are right is the person's check against the references.
//   node validate.mjs <artifacts/<product>/tests/<change>.md> [--request <request.md>] | --selftest | --help
// Checks: every section filled; the hypothesis has its four parts; the Inputs, Tier, Visitors per arm
// and Weeks lines match a stats.mjs rerun on the stated inputs; assumed rates are labelled; the route
// is one of three and not an A/B test over 8 weeks, and "an A/B test would take about <n> weeks" gives
// the rerun's weeks; for ship and measure, the "Before and after" line matches the rerun (conversions a
// period, the smallest change it can tell from noise, whether the lift is large enough to see, and
// "indicative, not proof") and the decision rule names that smallest change (SHORTCOMINGS №184); the
// three measures; one Assumptions line per input the request left out; no [TBD]. No prompts; JSON on
// stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
import { check } from './inputs.mjs'
import { plan, MAX_TEST_WEEKS } from './stats.mjs'

const HELP = 'usage: node validate.mjs <test-design.md> [--request <request.md>] | --selftest\n  prints {"ok","errors":[…],"rerun":{…}}'
const SECTIONS = ['The change', 'Hypothesis', 'The arithmetic', 'Route', 'Measures', 'Decision rule', 'What to send back', 'Method', 'Assumptions']
const ROUTES = [['A/B test', /^a\/?b test/i], ['preference test', /^preference test/i], ['ship and measure', /^ship and measure/i]]
const read = f => fs.readFileSync(f, 'utf8')
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
const n = s => s == null ? NaN : Number(String(s).replace(/,/g, ''))

export function validate (text, requestText = null) {
  const errors = [], sec = sections(text)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  const h = (sec.Hypothesis || '').toLowerCase().replace(/\s+/g, ' ') // a line break inside a part is not a missing part
  for (const [part, re] of [['Because we saw', /because we saw/], ['we expect that', /we expect that/], ['will cause', /will cause/], ["We'll measure this using", /we['’]ll measure this using/]]) if (sec.Hypothesis && !re.test(h)) errors.push(`hypothesis: no "${part}" part`)
  const ar = sec['The arithmetic'] || ''
  const inp = /^-\s*Inputs:\s*(.+)$/im.exec(ar)?.[1] || ''
  const base = /baseline\s+(\d+(?:\.\d+)?)\s*%/i.exec(inp), lift = /lift\s+(\d+(?:\.\d+)?)\s*%/i.exec(inp), vpw = /visitors per week\s+([\d,]+)/i.exec(inp)
  let rerun = null
  if (!base || !lift || !vpw) errors.push('arithmetic: the Inputs line needs "baseline <n>%", "lift <n>%" and "visitors per week <n>"')
  else {
    rerun = plan({ baseline: +base[1] / 100, lift: +lift[1] / 100, visitorsPerWeek: n(vpw[1]) })
    const tier = /^-\s*Tier:\s*(high|medium|low)\s*\(([\d,]+)\s*conversions per 4 weeks/im.exec(ar)
    const arm = /^-\s*Visitors per arm:\s*([\d,]+)/im.exec(ar), wk = /^-\s*Weeks:\s*([\d,.]+)/im.exec(ar)
    if (!tier) errors.push('arithmetic: no "Tier: <high|medium|low> (<n> conversions per 4 weeks" line')
    else if (tier[1].toLowerCase() !== rerun.tier || Math.abs(n(tier[2]) - rerun.conversionsPer4Weeks) > 1) errors.push(`arithmetic: tier says ${tier[1]} (${tier[2]}), stats.mjs gives ${rerun.tier} (${rerun.conversionsPer4Weeks})`)
    if (!arm) errors.push('arithmetic: no "Visitors per arm:" line')
    else if (n(arm[1]) !== rerun.visitorsPerArm) errors.push(`arithmetic: visitors per arm says ${arm[1]}, stats.mjs gives ${rerun.visitorsPerArm}`)
    if (!wk) errors.push('arithmetic: no "Weeks:" line')
    else if (Math.abs(n(wk[1]) - rerun.weeks) > 0.1) errors.push(`arithmetic: weeks says ${wk[1]}, stats.mjs gives ${rerun.weeks}`)
  }
  const route = /\*\*Route:\*\*\s*([^.\n]+)/i.exec(sec.Route || '')?.[1]?.trim()
  const which = route && ROUTES.find(([, re]) => re.test(route))
  if (!which) errors.push('route: no "**Route:** A/B test | preference test | ship and measure …" line')
  else if (which[0] === 'A/B test' && rerun && rerun.weeks > MAX_TEST_WEEKS) errors.push(`route: an A/B test needs ${rerun.weeks} weeks, more than ${MAX_TEST_WEEKS}`)
  if (rerun) for (const m of (sec.Route || '').matchAll(/a\/?b test (?:would take|takes|needs) about ([\d,.]+) weeks/gi)) if (n(m[1]) !== rerun.aboutWeeks && n(m[1]) !== rerun.weeks) errors.push(`route: "about ${m[1]} weeks", but stats.mjs gives ${rerun.weeks} (about ${rerun.aboutWeeks})`)
  // before and after: what 4 weeks against the 4 before can tell, from the design's own figures
  const ba = /^-\s*Before and after \((\d+) weeks each\):\s*([\d,]+) conversions a period; a change under ([\d,]+) conversions \((\d+)%\) is within the noise, so a ([\d.]+)% lift is (large enough to see|too small to see): indicative, not proof/im.exec(ar)
  if (rerun) {
    const b = rerun.beforeAfter
    if (ba && (n(ba[2]) !== b.conversionsPerPeriod || n(ba[3]) !== b.noiseConversions || +ba[4] !== b.noisePct || (ba[6] === 'large enough to see') !== b.liftVisible)) errors.push(`arithmetic: the before-and-after line does not match stats.mjs, which gives "${b.line.slice(2)}"`)
    if (which && which[0] === 'ship and measure') {
      if (!ba) errors.push(`arithmetic: ship and measure needs the before-and-after line from stats.mjs plan: "${b.line.slice(2)}"`)
      if (!new RegExp(`(^|[^\\d])${b.noisePct}%`).test(sec['Decision rule'] || '')) errors.push(`decision rule: name the smallest change the before and after can tell from noise (${b.noisePct}%, ${b.noiseConversions} conversions)`)
    }
  }
  for (const m of ['Primary', 'Secondary', 'Guardrail']) if (!new RegExp(`^-\\s*${m}:\\s*\\S`, 'mi').test(sec.Measures || '')) errors.push(`measures: no "${m}:" line`)
  if (requestText != null) {
    const r = check(requestText)
    for (const { field, label } of r.assume) {
      if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
      if (field === 'baseline' && !/baseline\s+[\d.]+\s*%\s*\(example/i.test(inp)) errors.push('arithmetic: the baseline was assumed but the Inputs line does not label it "(example rate, assumed)"')
      if (field === 'visitors_per_week' && !/visitors per week\s+[\d,]+\s*\(example/i.test(inp)) errors.push('arithmetic: the visitors were assumed but the Inputs line does not label them "(example, assumed)"')
    }
  }
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, errors, rerun: rerun && { tier: rerun.tier, conversionsPer4Weeks: rerun.conversionsPer4Weeks, visitorsPerArm: rerun.visitorsPerArm, weeks: rerun.weeks, abAllowed: rerun.abAllowed, beforeAfter: rerun.beforeAfter.line.slice(2) } }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const good = read(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples', 'good-1.md'))
    const req = 'Design a test for one change\nChange: C2\nProduct: Ledgerline, https://ledgerline.example'
    const t = []
    const g = validate(good, req); t.push(['the template example passes', g.ok])
    t.push(['visitors per arm that do not match the rerun are an error', validate(good.replace('21,109', '20,000'), req).errors.some(e => /visitors per arm/.test(e))])
    t.push(['weeks that do not match are an error', validate(good.replace('Weeks: 84.4', 'Weeks: 6'), req).errors.some(e => /weeks says/.test(e))])
    t.push(['an A/B test over 8 weeks is an error', validate(good.replace('**Route:** ship and measure', '**Route:** A/B test'), req).errors.some(e => /more than 8/.test(e))])
    t.push(['a missing section is an error', validate(good.replace(/^## What to send back[\s\S]*?(?=^## Method)/m, ''), req).errors.some(e => /What to send back/.test(e))])
    t.push(['a missing guardrail is an error', validate(good.replace(/^- Guardrail:.*$/m, ''), req).errors.some(e => /Guardrail/.test(e))])
    t.push(['an unlabelled example rate is an error', validate(good.replace('2% (example rate, assumed)', '2%'), req).errors.some(e => /label/.test(e))])
    t.push(['a missing Assumptions line is an error', validate(good.replace(/^- \*\*Lift worth detecting:\*\*.*$/m, ''), req).errors.some(e => /Lift worth detecting/.test(e))])
    t.push(['a hypothesis part broken across two lines still counts', validate(good.replace('we expect that naming', 'we\nexpect that naming'), req).ok])
    t.push(['ship and measure without the before-and-after line is an error', validate(good.replace(/^- Before and after.*\n/m, ''), req).errors.some(e => /before-and-after line from stats/.test(e))])
    t.push(['a before-and-after line that does not match the rerun is an error', validate(good.replace('a change under 18 conversions (45%)', 'a change under 8 conversions (20%)'), req).errors.some(e => /does not match stats/.test(e)) && validate(good.replace('lift is too small to see', 'lift is large enough to see'), req).errors.some(e => /does not match stats/.test(e))])
    t.push(['a decision rule that does not name the smallest visible change is an error', validate(good.replace(/45%/g, 'a lot').replace('a change under 18 conversions (a lot)', 'a change under 18 conversions (45%)'), req).errors.some(e => /decision rule: name the smallest change/.test(e))])
    t.push(['"about <n> weeks" that is not the rerun\'s is an error', validate(good.replace('would take about 85 weeks', 'would take about 84 weeks'), req).errors.some(e => /about 84 weeks/.test(e))])
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  let reqFile = null; const i = a.indexOf('--request'); if (i > -1) reqFile = a[i + 1]
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = validate(read(a[0]), reqFile && fs.existsSync(reqFile) ? read(reqFile) : null)
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
