#!/usr/bin/env node
// validate.mjs: completeness and wiring of the ICP and positioning one-pager (job card: Define our ideal
// customer and positioning). D40: every section present and filled, every segment field filled ("not
// found: looked in …" counts as filled), the primary segment named, every link in the body listed under
// Sources, the Method line, and one Assumptions line per input the request left out. It never checks
// length, the number of segments or wording: the person judges quality.
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
import { section, field, unfilled, assumptionLines, methodLine, tbd, body, read, arg } from './lib.mjs'
const HELP = 'usage: node validate.mjs <icp.md> --request <request.md> | --selftest\n  prints {"ok","errors":[…],"segments":n}; fix every error and rerun until ok'
const SECTIONS = ['Competitive alternatives', 'Unique attributes', 'Value', 'Market category', 'Positioning', 'Sources']
const FIELDS = ['Company type and size', 'Buyer', 'User', 'Trigger', 'Where to reach', 'Evidence']
const urls = t => [...(t || '').matchAll(/https?:\/\/[^\s)>\]`"'*]+/g)].map(m => m[0].replace(/[.,;:]+$/, ''))
export function check (md, assume = []) {
  const errors = [...methodLine(md)]
  for (const h of SECTIONS) { const s = section(md, h); if (s === null) errors.push(`no "## ${h}" section`); else if (unfilled(s)) errors.push(`"## ${h}" is empty`) }
  const segs = md.split(/^## Segment \d+:/m).slice(1)
  if (!segs.length) errors.push('no segment: write each as "## Segment N: <name>" with its six fields')
  segs.forEach((s, i) => { const b = s.split(/^## /m)[0]; for (const f of FIELDS) { const v = field(b, f); if (v === null || unfilled(v)) errors.push(`segment ${i + 1}: "${f}" is missing or empty (write "not found: looked in <where>" if you could not find it)`) } })
  if (!/^\*\*Primary segment:\*\*\s*\S/m.test(md)) errors.push('no "**Primary segment:**" line')
  const src = section(md, 'Sources') || '', rest = md.replace(/^## Sources[\s\S]*?(?=^## |(?![\s\S]))/m, '')
  const listed = new Set(urls(src).map(u => u.replace(/\/$/, '')))
  const unlisted = [...new Set(urls(rest).map(u => u.replace(/\/$/, '')))].filter(u => !listed.has(u))
  for (const u of unlisted.slice(0, 10)) errors.push(`${u} is cited but not listed under "## Sources"`)
  errors.push(...tbd(md), ...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 25), segments: segs.length }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const results = []; const t = (n, ok) => results.push({ name: n, pass: !!ok })
  // the template examples are what the agent imitates: each must pass (real published references are for the person, D40)
  const ex = path.join(import.meta.dirname, '..', 'reference', 'examples')
  const ours = fs.readdirSync(ex).filter(f => /^good-/.test(f) && /written by us/.test(read(path.join(ex, f)).split('\n')[0]))
  for (const f of ours) { const r = check(body(read(path.join(ex, f)))); t(`template example ${f} passes${r.ok ? '' : ': ' + r.errors.join('; ')}`, r.ok) }
  t('at least one template example', ours.length > 0)
  const good = body(read(path.join(ex, ours[0] || 'good-1.md')))
  t('a part not filled fails', check(good.replace(/(\*\*Trigger:\*\*).*/, '$1 [TBD]')).errors.some(e => /Trigger/.test(e)))
  t('"not found: looked in …" counts as filled', check(good.replace(/(\*\*Trigger:\*\*).*/, '$1 not found: looked in the site and the request')).ok)
  t('a missing section fails', check(good.replace(/^## Market category[\s\S]*?(?=^## Positioning)/m, '')).errors.some(e => /Market category/.test(e)))
  t('a link not listed under Sources fails', check(good.replace('## Value\n', '## Value\n- Faster close (https://other.example/case)\n')).errors.some(e => /other\.example/.test(e)))
  t('no Method line fails', check(good.replace(/^\*\*Method:\*\*.*\n/m, '')).errors.some(e => /Method/.test(e)))
  t('an input left out with no Assumptions line fails', check(good, [{ field: 'competitors', label: 'Competitors' }]).errors.some(e => /Competitors/.test(e)))
  t('an empty Assumptions section fails', check(good.replace(/## Assumptions[\s\S]*$/, '## Assumptions\n')).errors.some(e => /Assumptions/.test(e)))
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = arg(a, '--request')
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file> so the Assumptions lines can be checked'] })); process.exit(2) }
const r = check(read(a[0]), inputs(read(req)).assume); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
