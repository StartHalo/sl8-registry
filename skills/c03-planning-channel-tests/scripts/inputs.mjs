#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Plan next quarter's channel tests).
// Only the product is required. Every other input is assumed when missing, and the plan's Assumptions
// section gives each one a line starting "**<label>:**" (D40). With no budget the tests cost only the
// founder's time (budget 0); with no hours, 5 a week. An ICP counts as given when the request has an
// "ICP:" line or --icp names a file that exists (the first job's icp.md).
// No prompts; JSON on stdout; exit 1 only when the product is missing; writes nothing.
import fs from 'node:fs'
import { empty, amount, isDirect, arg } from './lib.mjs'
const HELP = 'usage: node inputs.mjs <request.md> [--icp artifacts/<product>/icp.md] | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[…],"budget":n|null,"hours":n|null,"say":"…"}; budget and hours are null when not given'
const OPTIONAL = {
  goal: [/^(?:goal|target|objective)\s*[:—-]\s*(.+)$/im, 'Goal'],
  budget: [/^(?:budget|spend)\s*[:—-]\s*(.+)$/im, 'Budget'],
  founder_hours: [/^(?:founder[ _]hours|hours|time)\s*[:—-]\s*(.+)$/im, 'Founder hours'],
  icp: [/^(?:icp|ideal customer|segment|audience)\s*[:—-]\s*(.+)$/im, 'ICP'],
}
export function check (text, icpFile = null) {
  const found = {}, missing = [], assume = []
  const p = text.match(/^(?:product|website|company)\s*[:—-]\s*(.+)$/im)
  if (p && !empty(p[1])) found.product = p[1].trim()
  else { const u = text.match(/https?:\/\/[^\s)>\]]+/); if (u) found.product = u[0]; else missing.push('product') }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) {
    const m = text.match(re)
    if (m && !empty(m[1]) && (!['budget', 'founder_hours'].includes(k) || amount(m[1]) !== null)) found[k] = m[1].trim()
    else if (k === 'icp' && icpFile && fs.existsSync(icpFile)) found.icp = icpFile
    else assume.push({ field: k, label })
  }
  return { ok: !missing.length, found, missing, assume, budget: found.budget ? amount(found.budget) : null, hours: found.founder_hours ? amount(found.founder_hours) : null, say: missing.length ? 'To do this I need: your product\'s name and website.' : '' }
}
if (isDirect(import.meta.url)) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const g = check('Plan next quarter\'s channel tests\nProduct: Ledgerline, https://ledgerline.example\nGoal: 40 new trials a month by 31 March 2027\nBudget: $1,500\nFounder hours: 6 a week\nICP: bookkeeping firms')
    const t = check('Plan next quarter\'s channel tests\nProduct: Ledgerline\nBudget: some')
    const f = check('Product: Ledgerline', import.meta.filename)
    const n = check('Plan our channel tests')
    const ok = g.ok && g.budget === 1500 && g.hours === 6 && !g.assume.length && t.ok && t.budget === null && t.assume.length === 4 && f.found.icp && f.assume.length === 3 && !n.ok && n.missing[0] === 'product'
    console.log(JSON.stringify({ ok, cases: 4 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8'), arg(a, '--icp')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
