#!/usr/bin/env node
// validate.mjs: completeness checks for the ICP one-pager (job card: Define our ideal customer).
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
const HELP = 'usage: node validate.mjs <icp.md> | --selftest\n  prints {"ok","errors":[…],"words":n}; fix every error and rerun until ok'
const FIELDS = ['Job', 'Pains', 'Trigger', 'Where to reach', 'Evidence']
const MAX_WORDS = 900
export function check(md) {
  const errors = []
  const words = md.split(/\s+/).filter(Boolean).length
  if (words > MAX_WORDS) errors.push(`${words} words; the limit is ${MAX_WORDS}: cut repetition, keep every field`)
  if (/\bTBD\b/i.test(md)) errors.push('contains TBD: fill it from the request or a page you opened, or move it to Assumptions')
  const segs = md.split(/^## Segment \d+:/m).slice(1)
  if (segs.length < 2 || segs.length > 3) errors.push(`${segs.length} segments; write 2 or 3 as "## Segment N: <name>"`)
  segs.forEach((s, i) => {
    const body = s.split(/^## /m)[0]
    for (const f of FIELDS) { const m = body.match(new RegExp(`^\\s*-\\s*\\*\\*${f}:\\*\\*\\s*(.+)$`, 'mi')); if (!m || m[1].trim().length < 8) errors.push(`segment ${i + 1}: "${f}" missing or too thin`) }
    const ev = (body.match(/^\s*-\s*\*\*Evidence:\*\*\s*(.+)$/mi) || [])[1] || ''
    if (ev && !/https?:\/\/|request|store page|review|interview|survey|study|data|report|n\s*=\s*\d|\d+\s*(?:people|users|respondents)/i.test(ev)) errors.push(`segment ${i + 1}: evidence must name its source: a link, the request, store reviews, interviews, a survey or data`)
  })
  const pos = (md.split(/^## Positioning[^\n]*$/m)[1] || '').split(/^## /m)[0]
  if (!pos.trim()) errors.push('no "## Positioning" section')
  else {
    const stmts = pos.split('\n').filter(l => /^\s*>?\s*\*?\*?For\b/i.test(l))
    if (stmts.length !== 1) errors.push(`${stmts.length} positioning statements; write exactly one line starting "For"`)
    const s = stmts[0] || ''
    for (const [k, re] of [['who', /\bwho\b/i], ['is a', /\bis an?\b/i], ['that', /\bthat\b/i], ['unlike', /\bunlike\b/i]]) if (s && !re.test(s)) errors.push(`positioning statement lacks "${k}"`)
  }
  const proof = (md.split(/^## Proof points[^\n]*$/m)[1] || '').split(/^## /m)[0]
  const pts = proof.split('\n').filter(l => /^\s*(?:-|\d+\.)\s+\S/.test(l))
  if (pts.length !== 3) errors.push(`${pts.length} proof points; write exactly 3`)
  if (!/^## Assumptions\s*$/m.test(md)) errors.push('no "## Assumptions" section (write "None" if there are none)')
  return { ok: !errors.length, errors: errors.slice(0, 25), words }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const seg = n => `## Segment ${n}: Night-shift nurses\n- **Job:** fall asleep fast after a shift\n- **Pains:** wired after 12 hours on their feet\n- **Trigger:** a rota change to nights\n- **Where to reach:** r/nursing and hospital staff WhatsApp groups\n- **Evidence:** store page reviews mention shifts (https://example.com)\n`
  const good = `# ICP\n\n${seg(1)}\n${seg(2)}\n## Positioning\nFor night-shift nurses who cannot switch off, Breathwell is a breathing app that gets them asleep in 10 minutes, unlike meditation apps built for mornings.\n\n## Proof points\n- 1\n- 2\n- 3\n\n## Assumptions\nNone\n`
  const bad = good.replace(seg(2), '').replace('- 3\n', '').replace('**Trigger:** a rota change to nights', '**Trigger:** TBD')
  const g = check(good), b = check(bad)
  const ok = g.ok && !b.ok && b.errors.some(e => /segments/.test(e)) && b.errors.some(e => /proof points/.test(e)) && b.errors.some(e => /TBD/.test(e))
  console.log(JSON.stringify({ ok, cases: 2, goodErrors: g.errors })); process.exit(ok ? 0 : 1)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
