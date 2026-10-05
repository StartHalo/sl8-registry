#!/usr/bin/env node
// validate.mjs: completeness and arithmetic of the experiment backlog (job card: Plan next quarter's
// growth tests). D40: it checks that the table has every column and every cell filled, the Method line,
// one Assumptions line per input the request left out, and the sums: ICE is the average of I, C and E,
// the stated total is the sum of the Cost column, and the total stays within the budget (0 when none
// was given). It never checks length, the number of tests or wording: the person judges quality.
// No prompts; JSON on stdout; exit 1 with the list of problems; writes nothing; bounded output.
import fs from 'node:fs'
import path from 'node:path'
import { check as inputs } from './inputs.mjs'
const HELP = 'usage: node validate.mjs <growth-tests.md> --request <request.md> | --selftest\n  prints {"ok","errors":[…],"rows":n,"totalCost":n}; the budget comes from the request (0 when none was given)'
const COLS = ['#', 'Hypothesis', 'Segment', 'Channel', 'Metric and target', 'I', 'C', 'E', 'ICE', 'Cost', 'Owner', 'Start week']
const num = v => { const m = String(v).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN }
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
export function check(md, budget = null, assume = []) {
  const errors = []
  if (!/^\*\*Method:\*\*\s*\S{3,}/m.test(md)) errors.push('no "**Method:**" line naming the method')
  const lines = md.split('\n').filter(l => /^\s*\|/.test(l))
  const cells = l => l.split('|').slice(1, -1).map(c => c.trim())
  const head = lines.findIndex(l => cells(l).join('|').toLowerCase() === COLS.join('|').toLowerCase())
  if (head < 0) { errors.push(`no table with the columns: | ${COLS.join(' | ')} |`); errors.push(...assumptionLines(md, assume)); return { ok: false, errors, rows: 0, totalCost: 0 } }
  const rows = lines.slice(head + 2).map(cells).filter(r => r.length === COLS.length)
  if (!rows.length) errors.push('the table has no tests')
  let total = 0
  rows.forEach((r, i) => {
    const n = i + 1
    r.forEach((c, j) => { if (unfilled(c)) errors.push(`row ${n}: "${COLS[j]}" is not filled`) })
    const [I, C, E, ICE] = [r[5], r[6], r[7], r[8]].map(num)
    if ([I, C, E, ICE].some(Number.isNaN)) errors.push(`row ${n}: I, C, E and ICE must be numbers`)
    else if (Math.abs((I + C + E) / 3 - ICE) > 0.05) errors.push(`row ${n}: ICE must be the average of I, C and E (${((I + C + E) / 3).toFixed(1)})`)
    const cost = num(r[9]); if (Number.isNaN(cost)) errors.push(`row ${n}: cost must be a number (0 for team time only)`); else total += cost
  })
  const stated = md.match(/\*\*Total cost:\*\*\s*([^·\n]+)/i)
  if (stated && !Number.isNaN(num(stated[1])) && Math.abs(num(stated[1]) - total) > 0.5) errors.push(`the stated total cost (${num(stated[1])}) is not the sum of the Cost column (${total})`)
  if (budget != null && total > budget) errors.push(`costs total ${total}, over the budget of ${budget}${budget === 0 ? ' (no budget was given, so tests use team time only: cost 0)' : ''}`)
  const tbd = (md.match(/\[TBD\]/gi) || []).length
  if (tbd) errors.push(`${tbd} [TBD] left: fill each part with what you know, and put the gap under Assumptions with what to send`)
  errors.push(...assumptionLines(md, assume))
  return { ok: !errors.length, errors: errors.slice(0, 30), rows: rows.length, totalCost: total }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const results = []; const t = (n, ok) => results.push({ name: n, pass: !!ok })
  const ex = path.join(import.meta.dirname, '..', 'reference', 'examples')
  const ours = fs.readdirSync(ex).filter(f => /^good-/.test(f) && /written by us/.test(fs.readFileSync(path.join(ex, f), 'utf8').split('\n')[0]))
  for (const f of ours) { const r = check(fs.readFileSync(path.join(ex, f), 'utf8')); t(`template example ${f} passes${r.ok ? '' : ': ' + r.errors.join('; ')}`, r.ok) }
  t('at least one template example', ours.length > 0)
  const row = (n, ice, cost = 100) => `| ${n} | If we add a referral card, then invites rise | New users | In-app | Invites: 5% by W4 | ${ice} | ${ice} | ${ice} | ${ice} | ${cost} | Growth lead | W${n} |`
  const doc = (rs, total, extra = '') => `# Tests\n\n**Goal:** 300 by June · **Budget:** 500 · **Total cost:** ${total}\n\n**Method:** ICE-ranked backlog.\n\n| ${COLS.join(' | ')} |\n|${COLS.map(() => '---').join('|')}|\n${rs.join('\n')}\n\n## Assumptions\n- **Channels allowed:** not given. Assumed any. Send limits to replace it.${extra}\n`
  const good = doc([row(1, 8), row(2, 6)], 200)
  t('a complete backlog passes, whatever the number of tests', check(good, 500, [{ label: 'Channels allowed' }]).ok)
  t('an ICE that is not the average fails', check(doc([row(1, 8).replace('| 8 | Growth', '| 9 | Growth').replace(/\| 8 \| 8 \| 8 \| 8 \|/, '| 8 | 8 | 8 | 9 |')], 100), 500).errors.some(e => /average/.test(e)))
  t('costs over the budget fail', check(good, 150).errors.some(e => /over the budget/.test(e)))
  t('with no budget given, any cost fails', check(good, 0).errors.some(e => /team time only/.test(e)))
  t('a stated total that is not the sum fails', check(doc([row(1, 8), row(2, 6)], 999), 5000).errors.some(e => /not the sum/.test(e)))
  t('an empty cell fails', check(doc([row(1, 8).replace('Growth lead', '—')], 100), 500).errors.some(e => /Owner/.test(e)))
  t('an input left out with no Assumptions line fails', check(good, 500, [{ label: 'Goal' }]).errors.some(e => /"Goal"/.test(e)))
  t('no Method line fails', check(good.replace(/\*\*Method:\*\*.*\n/, ''), 500).errors.some(e => /Method/.test(e)))
  const failed = results.filter(r => !r.pass)
  console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`missing file: ${a[0] || '(none given)'}`] })); process.exit(2) }
const req = a.includes('--request') ? a[a.indexOf('--request') + 1] : null
if (!req || !fs.existsSync(req)) { console.log(JSON.stringify({ ok: false, errors: ['give --request <the saved request file>: it gives the budget and the inputs to list under Assumptions'] })); process.exit(2) }
const i = inputs(fs.readFileSync(req, 'utf8'))
const r = check(fs.readFileSync(a[0], 'utf8'), i.budget, i.assume); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
