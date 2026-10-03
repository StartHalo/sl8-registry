#!/usr/bin/env node
// inputs.mjs: checks the request has this job's required inputs (job card: Define our ideal customer).
// No prompts; JSON on stdout; exit 1 when a required input is missing; writes nothing.
import fs from 'node:fs'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"say":"…"}; exit 1 when a required input is missing'
const REQUIRED = {
  app: /^(?:app|product)\s*[:—-]\s*(.+)$/im,
  what_it_does: /^(?:what it does|what it is|it is|is becoming|pivot|change|what's changing|description)\s*[:—-]\s*(.+)$/im,
  market: /^(?:market|markets|where|country|countries|audience)\s*[:—-]\s*(.+)$/im,
}
const ASK = { app: 'the app name and its store link', what_it_does: 'what the app does (or is becoming)', market: 'the market or audience you want first' }
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)
export function check(text) {
  const found = {}, missing = []
  for (const [k, re] of Object.entries(REQUIRED)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else missing.push(k) }
  // a free-text request may describe the change in prose: accept a sentence with "pivot" or "becoming" when no label
  if (missing.includes('what_it_does')) { const m = text.match(/[^.\n]*(?:is becoming|pivot(?:ing)?|is changing|we are adding|will become)[^.\n]*\./i); if (m) { found.what_it_does = m[0].trim(); missing.splice(missing.indexOf('what_it_does'), 1) } }
  return { ok: !missing.length, found, missing, say: missing.length ? `To do this I need: ${missing.map(k => ASK[k]).join('; ')}.` : '' }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const good = check('Define our ideal customer\nApp: Breathwell, https://x\nMarket: UK office workers\nBreathwell is becoming a live group sessions app.')
  const bad = check('Define our ideal customer\nApp: Breathwell\nMarket: <tbd>\nAssume for me: yes')
  const ok = good.ok && !bad.ok && bad.missing.includes('market') && bad.missing.includes('what_it_does')
  console.log(JSON.stringify({ ok, cases: 2 })); process.exit(ok ? 0 : 1)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
