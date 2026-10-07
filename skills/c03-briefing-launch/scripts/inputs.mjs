#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Brief a feature or integration
// launch). Only what launches is required. Every other input is assumed when missing, and the brief's
// Assumptions section gives each one a line starting "**<label>:**" (D40). With no budget the brief uses
// owned channels and the founder's time (budget 0); with no hours, 5 a week.
// No prompts; JSON on stdout; exit 1 only when what launches is missing; writes nothing.
import fs from 'node:fs'
import { empty, amount, isDirect } from './lib.mjs'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[…],"budget":n|null,"hours":n|null,"say":"…"}; budget and hours are null when not given'
const OPTIONAL = {
  product: [/^(?:product|website|company)\s*[:—-]\s*(.+)$/im, 'Product'],
  launch_date: [/^(?:launch[ _]date|date|launches on|going live)\s*[:—-]\s*(.+)$/im, 'Launch date'],
  audience: [/^(?:audience|who it is for|for|segment)\s*[:—-]\s*(.+)$/im, 'Audience'],
  budget: [/^(?:budget|spend)\s*[:—-]\s*(.+)$/im, 'Budget'],
  founder_hours: [/^(?:founder[ _]hours|hours|time)\s*[:—-]\s*(.+)$/im, 'Founder hours'],
  partner: [/^(?:partner|marketplace|integration partner)\s*[:—-]\s*(.+)$/im, 'Partner'],
}
export function check (text) {
  const found = {}, missing = [], assume = []
  const w = text.match(/^(?:launch|launching|what[ _]launches|what.s launching|feature|integration|new feature)\s*[:—-]\s*(.+)$/im)
  if (w && !empty(w[1])) found.what_launches = w[1].trim(); else missing.push('what_launches')
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) {
    const m = text.match(re)
    if (m && !empty(m[1]) && (!['budget', 'founder_hours'].includes(k) || amount(m[1]) !== null)) found[k] = m[1].trim()
    else if (k === 'product' && /https?:\/\//.test(text)) found.product = text.match(/https?:\/\/[^\s)>\]]+/)[0]
    else assume.push({ field: k, label })
  }
  return { ok: !missing.length, found, missing, assume, budget: found.budget ? amount(found.budget) : null, hours: found.founder_hours ? amount(found.founder_hours) : null, say: missing.length ? 'To brief the launch I need: what is launching (the feature, integration or plan).' : '' }
}
if (isDirect(import.meta.url)) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const g = check('Brief a feature or integration launch\nLaunch: two-way Tallybook sync\nProduct: https://ledgerline.example\nLaunch date: 3 February 2027\nAudience: existing customers on Tallybook\nBudget: $500\nFounder hours: 8 a week\nPartner: Tallybook app marketplace')
    const t = check('Brief a feature or integration launch\nLaunch: two-way Tallybook sync')
    const n = check('Plan the launch\nBudget: $500')
    const ok = g.ok && g.budget === 500 && g.hours === 8 && !g.assume.length && t.ok && t.budget === null && t.assume.length === 6 && !n.ok && n.missing[0] === 'what_launches'
    console.log(JSON.stringify({ ok, cases: 3 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
