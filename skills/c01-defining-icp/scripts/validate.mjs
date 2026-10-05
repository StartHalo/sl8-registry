#!/usr/bin/env node
// validate.mjs: completeness of the ICP one-pager (job card: Define our ideal customer). D40: it checks
// that every part is present and filled, the Method line, and one Assumptions line per input the request
// left out. It never checks length, counts of points or wording: the person judges quality.
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
const HELP = 'usage: node validate.mjs <icp.md> --request <request.md> | --selftest\n  prints {"ok","errors":[…]}; fix every error and rerun until ok'
const FIELDS = ['Job', 'Pains', 'Trigger', 'Where to reach', 'Evidence']
const unfilled = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?|…)\s*$/i.test(v) || /\[tbd\]/i.test(v)
const section = (md, h) => { const parts = md.split(new RegExp(`^## ${h}[^\\n]*$`, 'm')); return parts.length < 2 ? null : parts[1].split(/^## /m)[0].trim() }
export function assumptionLines(md, assume) {
  const errors = [], a = section(md, 'Assumptions')
  if (a === null) return ['no "## Assumptions" section']
  if (!a) return ['"## Assumptions" is empty: list what you assumed, or write "None"']
  const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // the label inputs.mjs prints ("Launch date"); its field name ("launch_date", "launch date") is accepted too
  for (const { label, field = label } of assume) if (!new RegExp(`^\\s*-\\s*\\*{0,2}(?:${[label, field, field.replace(/_/g, ' ')].map(esc).join('|')})\\*{0,2}\\s*:`, 'im').test(a)) errors.push(`no Assumptions line for "${label}", which the request left out: add "- **${label}:** not given. Assumed …. Send … to replace it."`)
  return errors
}
export function check(md, assume = []) {
  const errors = []
  if (!/^\*\*Method:\*\*\s*\S{3,}/m.test(md)) errors.push('no "**Method:**" line naming the method')
  const segs = md.split(/^## Segment \d+:/m).slice(1)
  if (!segs.length) errors.push('no segment: write each as "## Segment N: <name>" with its five fields')
  segs.forEach((s, i) => {
    const body = s.split(/^## /m)[0]
    for (const f of FIELDS) { const m = body.match(new RegExp(`^\\s*-\\s*\\*\\*${f}:\\*\\*\\s*(.*)$`, 'mi')); if (!m || unfilled(m[1])) errors.push(`segment ${i + 1}: "${f}" is missing or not filled`) }
  })
  for (const h of ['Positioning', 'Proof points']) { const s = section(md, h); if (s === null) errors.push(`no "## ${h}" section`); else if (!s || unfilled(s)) errors.push(`"## ${h}" is empty`) }
  const tbd = (md.match(/\[TBD\]/gi) || []).length
  if (tbd) errors.push(`${tbd} [TBD] left: fill each part with what you know, and put the gap under Assumptions with what to send`)
  errors.push(...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 25) }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const results = []; const t = (n, ok) => results.push({ name: n, pass: !!ok })
  // the template examples are what the agent imitates: each must pass (real published references are for the person, D40)
  const ex = path.join(import.meta.dirname, '..', 'reference', 'examples')
  const ours = fs.readdirSync(ex).filter(f => /^good-/.test(f) && /written by us/.test(fs.readFileSync(path.join(ex, f), 'utf8').split('\n')[0]))
  for (const f of ours) { const r = check(fs.readFileSync(path.join(ex, f), 'utf8')); t(`template example ${f} passes${r.ok ? '' : ': ' + r.errors.join('; ')}`, r.ok) }
  t('at least one template example', ours.length > 0)
  const seg = n => `## Segment ${n}: Night-shift nurses\n- **Job:** fall asleep fast after a shift\n- **Pains:** wired after 12 hours\n- **Trigger:** a rota change to nights\n- **Where to reach:** r/nursing\n- **Evidence:** store reviews\n`
  const good = `# ICP\n\n**Method:** Jobs to be Done with Moore's positioning statement.\n\n${seg(1)}\n## Positioning\nFor nurses who cannot switch off, Breathwell is a breathing app that gets them asleep, unlike meditation apps.\n\n## Proof points\n- 1\n\n## Assumptions\n- **Market:** not given. Assumed UK. Send your market to replace it.\n`
  t('a complete one-pager passes, whatever its length or counts', check(good, [{ label: 'Market' }]).ok)
  t('a part not filled fails', check(good.replace('a rota change to nights', '[TBD]')).errors.some(e => /Trigger/.test(e)))
  t('a missing section fails', check(good.replace(/## Proof points\n- 1\n/, '')).errors.some(e => /Proof points/.test(e)))
  t('no Method line fails', check(good.replace(/\*\*Method:\*\*.*\n/, '')).errors.some(e => /Method/.test(e)))
  t('an input left out with no Assumptions line fails', check(good, [{ label: 'Competitors' }]).errors.some(e => /Competitors/.test(e)))
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = a.includes('--request') ? a[a.indexOf('--request') + 1] : null
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file> so the Assumptions lines can be checked'] })); process.exit(2) }
const r = check(fs.readFileSync(a[0], 'utf8'), inputs(fs.readFileSync(req, 'utf8')).assume); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
