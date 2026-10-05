#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Define our ideal customer).
// Only the app is required: without it there is no job. Every other input is assumed when missing, and
// the deliverable's Assumptions section gives each one a line starting "**<label>:**" (D40).
// No prompts; JSON on stdout; exit 1 only when the required input is missing; writes nothing.
import fs from 'node:fs'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}; exit 1 only when the app is missing'
const REQUIRED = { app: /^(?:app|product)\s*[:—-]\s*(.+)$/im }
const OPTIONAL = {
  what_it_does: [/^(?:what it does|what it is|it is|is becoming|pivot|change|what's changing|description)\s*[:—-]\s*(.+)$/im, 'What it does'],
  market: [/^(?:market|markets|where|country|countries|audience)\s*[:—-]\s*(.+)$/im, 'Market'],
  current_users: [/^(?:current users|users|installs)\s*[:—-]\s*(.+)$/im, 'Current users'],
  competitors: [/^(?:competitors|alternatives)\s*[:—-]\s*(.+)$/im, 'Competitors'],
}
const ASK = { app: 'the app name and its store link' }
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)
export function check(text) {
  const found = {}, missing = [], assume = []
  for (const [k, re] of Object.entries(REQUIRED)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else missing.push(k) }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  // a free-text request may describe the change in prose: accept a sentence with "pivot" or "becoming" when no label
  const wi = assume.findIndex(x => x.field === 'what_it_does')
  if (wi >= 0) { const m = text.match(/[^.\n]*(?:is becoming|pivot(?:ing)?|is changing|we are adding|will become)[^.\n]*\./i); if (m) { found.what_it_does = m[0].trim(); assume.splice(wi, 1) } }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? `To do this I need: ${missing.map(k => ASK[k]).join('; ')}.` : '' }
}
// run as a command only when called directly (validate.mjs imports check); real paths, because skills are reached through a symlink (SHORTCOMINGS №121)
const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const full = check('Define our ideal customer\nApp: Breathwell, https://x\nMarket: UK office workers\nCurrent users: 40k installs\nCompetitors: Calm\nBreathwell is becoming a live group sessions app.')
  const thin = check('Define our ideal customer\nApp: Breathwell\nMarket: <tbd>')
  const none = check('Define our ideal customer for our breathing app')
  const ok = full.ok && !full.assume.length && thin.ok && ['market', 'what_it_does', 'current_users', 'competitors'].every(f => thin.assume.some(x => x.field === f)) && !none.ok && none.missing[0] === 'app' && /store link/.test(none.say)
  console.log(JSON.stringify({ ok, cases: 3 })); process.exit(ok ? 0 : 1)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
