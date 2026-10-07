#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Write our email sequence).
// Only the product is required: without it there is no job. Every other input is assumed when
// missing, and the deliverable's Assumptions section gives each one a line starting "**<label>:**" (D40).
// No prompts; JSON on stdout; exit 1 only when the required input is missing; writes nothing.
import fs from 'node:fs'
import { empty, isDirect } from './lib.mjs'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
const REQUIRED = { product: /^(?:product|app|website|saas)\s*[:—-]\s*(.+)$/im }
export const OPTIONAL = {
  goal: [/^(?:goal|objective|conversion)\s*[:—-]\s*(.+)$/im, 'Goal'],
  audience: [/^(?:who[ _]receives[ _]it|audience|recipients|segment)\s*[:—-]\s*(.+)$/im, 'Who receives it'],
  offers: [/^(?:offers?(?:[ _]and[ _]resources)?|resources)\s*[:—-]\s*(.+)$/im, 'Offers and resources'],
  sender: [/^(?:sender|from)\s*[:—-]\s*(.+)$/im, 'Sender'],
  postal_address: [/^(?:postal[ _]address|address)\s*[:—-]\s*(.+)$/im, 'Postal address'],
  email_tool: [/^(?:email[ _]tool|tool|esp)\s*[:—-]\s*(.+)$/im, 'Email tool'],
  number_of_emails: [/^(?:number[ _]of[ _]emails|emails|length)\s*[:—-]\s*(\d+)\b.*$/im, 'Number of emails'],
}
const ASK = { product: "the product's name and website" }
// A goal the request states in its own words counts as given ("a trial-to-paid sequence", "our trial emails").
export const kind = t => /trial[- ]to[- ]paid|trial (?:emails|sequence|users)/i.test(t) ? 'trial users start a paid plan (from the request)' : /\blaunch/i.test(t) ? 'people try what launched (from the request)' : /onboarding/i.test(t) ? 'new users reach their first result (from the request)' : null
export function check (text) {
  const found = {}, missing = [], assume = []
  for (const [k, re] of Object.entries(REQUIRED)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else missing.push(k) }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else if (k === 'goal' && kind(text)) found.goal = kind(text); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? `To do this I need: ${missing.map(k => ASK[k]).join('; ')}.` : '' }
}
if (isDirect(import.meta.url)) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const full = check('Write our email sequence\nProduct: Fernway, https://fernway.example\nGoal: trial users start a paid plan\nWho receives it: new trial users\nOffers: a setup call\nSender: Dana, founder\nPostal address: 1 Example St, Springfield\nEmail tool: Loops\nNumber of emails: 5'),
    ids = check('write our onboarding emails\nproduct: Fernway, https://fernway.example\npostal_address: 1 Example St\nemail_tool: Loops\nnumber_of_emails: 5\nwho_receives_it: new trial users')
    const thin = check('Write our sequence\nProduct: Fernway, https://fernway.example')
    const none = check('Write our email sequence for us')
    const worded = check('write a trial-to-paid sequence\nProduct: Fernway, https://fernway.example')
    const ok = worded.found.goal && !worded.assume.some(x => x.field === 'goal') && full.ok && !full.assume.length && ids.found.postal_address && ids.found.email_tool && ids.found.number_of_emails && ids.found.audience && thin.ok && thin.assume.length === 7 && !none.ok && none.missing[0] === 'product' && /product/.test(none.say)
    console.log(JSON.stringify({ ok, cases: 3 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
