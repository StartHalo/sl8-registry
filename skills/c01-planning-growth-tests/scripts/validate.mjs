#!/usr/bin/env node
// validate.mjs: completeness checks for the experiment backlog (job card: Plan next quarter's growth tests).
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
const HELP = 'usage: node validate.mjs <growth-tests.md> --budget <number> | --selftest\n  prints {"ok","errors":[…],"rows":n,"totalCost":n,"words":n}'
const COLS = ['#', 'Hypothesis', 'Segment', 'Channel', 'Metric and target', 'I', 'C', 'E', 'ICE', 'Cost', 'Owner', 'Start week']
const MAX_WORDS = 900
const num = v => { const m = String(v).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN }
export function check(md, budget) {
  const errors = []
  const words = md.split(/\s+/).filter(Boolean).length
  if (words > MAX_WORDS) errors.push(`${words} words; the limit is ${MAX_WORDS}`)
  if (/\bTBD\b/i.test(md)) errors.push('contains TBD: fill it or move it to Assumptions')
  const lines = md.split('\n').filter(l => /^\s*\|/.test(l))
  const head = lines.findIndex(l => l.split('|').slice(1, -1).map(c => c.trim()).join('|') === COLS.join('|'))
  if (head < 0) { errors.push(`no table with the exact header: | ${COLS.join(' | ')} |`); return { ok: false, errors, rows: 0, totalCost: 0, words } }
  const rows = lines.slice(head + 2).map(l => l.split('|').slice(1, -1).map(c => c.trim())).filter(r => r.length === COLS.length)
  if (rows.length !== 10) errors.push(`${rows.length} rows; write exactly 10`)
  let total = 0
  rows.forEach((r, i) => {
    const n = i + 1
    r.forEach((c, j) => { if (!c || c === '—' || c === '-') errors.push(`row ${n}: "${COLS[j]}" is empty`) })
    if (!/\b(if|because|by|when)\b/i.test(r[1]) || !/\b(then|will|increase|reduce|raise|lift|grow|cut)\b/i.test(r[1])) errors.push(`row ${n}: hypothesis must name a cause and an effect ("If we …, then … will …")`)
    if (!/\d/.test(r[4])) errors.push(`row ${n}: the target needs a number`)
    const [I, C, E, ICE] = [r[5], r[6], r[7], r[8]].map(num)
    for (const [k, v] of [['I', I], ['C', C], ['E', E]]) if (!Number.isInteger(v) || v < 1 || v > 10) errors.push(`row ${n}: ${k} must be a whole number 1–10`)
    if (Math.abs((I + C + E) / 3 - ICE) > 0.05) errors.push(`row ${n}: ICE must be the average of I, C, E (${((I + C + E) / 3).toFixed(1)})`)
    const cost = num(r[9]); if (Number.isNaN(cost)) errors.push(`row ${n}: cost needs a number (0 if free)`); else total += cost
    if (!/^(?:W|week\s*)?(1[0-3]|[1-9])$/i.test(r[11])) errors.push(`row ${n}: start week must be W1–W13`)
  })
  if (budget != null && total > budget) errors.push(`costs total ${total}, over the budget of ${budget}`)
  const ices = rows.map(r => num(r[8]))
  if (ices.some((v, i) => i && v > ices[i - 1])) errors.push('sort the rows by ICE, highest first')
  if (!/^## Assumptions\s*$/m.test(md)) errors.push('no "## Assumptions" section (write "None" if there are none)')
  return { ok: !errors.length, errors: errors.slice(0, 30), rows: rows.length, totalCost: total, words }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
const budget = a.includes('--budget') ? num(a[a.indexOf('--budget') + 1]) : null
if (a.includes('--selftest')) {
  const row = (n, ice) => `| ${n} | If we add a referral card after a session, then invites will increase | New users | In-app | 5% of sessions send an invite | ${ice} | ${ice} | ${ice} | ${ice} | 100 | Growth lead | W${n} |`
  const t = rs => `# Tests\n\n| ${COLS.join(' | ')} |\n|${COLS.map(() => '---').join('|')}|\n${rs.join('\n')}\n\n## Assumptions\nNone\n`
  const good = t([10, 9, 9, 8, 8, 7, 6, 5, 4, 3].map((v, i) => row(i + 1, v)))
  const bad = t([10, 9, 9].map((v, i) => row(i + 1, v)).concat(['| 4 | grow | x | y | more | 11 | 2 | 3 | 9 | lots | — | W20 |']))
  const g = check(good, 1000), b = check(bad, 100)
  const ok = g.ok && !b.ok && b.errors.some(e => /rows/.test(e)) && b.errors.some(e => /W1–W13/.test(e)) && b.errors.some(e => /over the budget/.test(e))
  console.log(JSON.stringify({ ok, cases: 2, goodErrors: g.errors })); process.exit(ok ? 0 : 1)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
if (budget == null) { console.log(JSON.stringify({ ok: false, errors: ['give --budget <number> from inputs.mjs'] })); process.exit(2) }
const r = check(fs.readFileSync(a[0], 'utf8'), budget); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
