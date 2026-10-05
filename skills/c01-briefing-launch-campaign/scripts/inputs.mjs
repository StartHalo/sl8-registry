#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Brief a launch campaign).
// Only what launches is required: without it there is no job. Every other input is assumed when
// missing, and the deliverable's Assumptions section gives each one a line starting "**<label>:**"
// (D40). With no budget the brief uses owned channels and team time only, so the budget is 0.
// No prompts; JSON on stdout; exit 1 only when the required input is missing; writes nothing.
import fs from 'node:fs'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"budget":n,"say":"…"}; budget is 0 when none was given'
const REQUIRED = { what_launches: /^(?:launch|launching|what launches|what's launching|feature|product)\s*[:—-]\s*(.+)$/im }
const OPTIONAL = {
  launch_date: [/^(?:launch date|date|launches on|going live)\s*[:—-]\s*(.+)$/im, 'Launch date'],
  audience: [/^(?:audience|market|who|target)\s*[:—-]\s*(.+)$/im, 'Audience'],
  budget: [/^(?:budget|spend)\s*[:—-]\s*(.+)$/im, 'Budget'],
}
const ASK = { what_launches: 'what is launching (the app, a relaunch or a feature)' }
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)
export const amount = v => { const m = String(v).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|m|thousand|million|lakh|lac)?/i); if (!m) return null; const mult = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, lakh: 1e5, lac: 1e5 }[(m[2] || '').toLowerCase()] || 1; return Number(m[1]) * mult }
export function check(text) {
  const found = {}, missing = [], assume = []
  for (const [k, re] of Object.entries(REQUIRED)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else missing.push(k) }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && !empty(m[1]) && (k !== 'budget' || amount(m[1]) !== null)) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, budget: found.budget ? amount(found.budget) : 0, say: missing.length ? `To brief the launch I need: ${missing.map(k => ASK[k]).join('; ')}.` : '' }
}
// run as a command only when called directly (validate.mjs imports check); real paths, because skills are reached through a symlink (SHORTCOMINGS №121)
const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const g = check('Launch: live group sessions\nLaunch date: 2 February 2027\nAudience: UK office workers\nBudget: £4,000')
  const t = check('Launch: live group sessions')
  const n = check('Plan the launch\nAudience: UK office workers')
  const ok = g.ok && g.budget === 4000 && !g.assume.length && t.ok && t.budget === 0 && ['launch_date', 'audience', 'budget'].every(f => t.assume.some(x => x.field === f)) && !n.ok && n.missing[0] === 'what_launches'
  console.log(JSON.stringify({ ok, cases: 3 })); process.exit(ok ? 0 : 1)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
