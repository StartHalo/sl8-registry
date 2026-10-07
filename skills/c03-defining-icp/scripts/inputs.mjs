#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Define our ideal customer and
// positioning). Only the product is required: a "Product:" line, or a website link in the request.
// Every other input is assumed when missing, and the one-pager's Assumptions section gives each one a
// line starting "**<label>:**" (D40).
// No prompts; JSON on stdout; exit 1 only when the product is missing; writes nothing; --dry-run is the same.
import fs from 'node:fs'
import { empty, isDirect } from './lib.mjs'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}; exit 1 only when the product is missing'
const OPTIONAL = {
  sales_motion: [/^(?:sales[ _]motion(?: and price)?|how we sell|price|pricing)\s*[:—-]\s*(.+)$/im, 'Sales motion and price'],
  best_customers: [/^(?:best[ _]customers(?: today)?|current customers|customers)\s*[:—-]\s*(.+)$/im, 'Best customers today'],
  competitors: [/^(?:competitors|alternatives)\s*[:—-]\s*(.+)$/im, 'Competitors'],
  review_text: [/^(?:review[ _]text|reviews|quotes|customer quotes)\s*[:—-]\s*(.+)$/im, 'Review text'],
}
export function check (text) {
  const found = {}, missing = [], assume = []
  const p = text.match(/^(?:product|website|company)\s*[:—-]\s*(.+)$/im)
  if (p && !empty(p[1])) found.product = p[1].trim()
  else { const u = text.match(/https?:\/\/[^\s)>\]]+/); if (u) found.product = u[0]; else missing.push('product') }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? 'To do this I need: your product\'s name and website.' : '' }
}
if (isDirect(import.meta.url)) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const full = check('Define our ideal customer and positioning\nProduct: Ledgerline, https://ledgerline.example\nSales motion and price: 14-day trial, $49 a month\nBest customers today: bookkeeping firms\nCompetitors: spreadsheets, Receiptly\nReviews: pasted below')
    const thin = check('Define our ideal customer and positioning\nProduct: Ledgerline\nCompetitors: <tbd>')
    const link = check('who is our ideal customer? we are https://ledgerline.example')
    const none = check('Define our ideal customer and positioning for our bookkeeping tool')
    const ok = full.ok && !full.assume.length && thin.ok && thin.assume.length === 4 && link.ok && /ledgerline/.test(link.found.product) && !none.ok && none.missing[0] === 'product' && /website/.test(none.say)
    console.log(JSON.stringify({ ok, cases: 4 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
