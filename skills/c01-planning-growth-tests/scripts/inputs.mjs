#!/usr/bin/env node
// inputs.mjs: checks the request has this job's required inputs (job card: Plan next quarter's growth tests).
// No prompts; JSON on stdout; exit 1 when a required input is missing; writes nothing.
import fs from 'node:fs'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"budget":n|null,"say":"…"}'
const REQUIRED = {
  app: /^(?:app|product)\s*[:—-]\s*(.+)$/im,
  goal_with_date: /^(?:goal|target|objective)\s*[:—-]\s*(.+)$/im,
  budget: /^(?:budget|spend)\s*[:—-]\s*(.+)$/im,
}
const ASK = { app: 'the app name and its store link', goal_with_date: 'the goal with a number and a date (e.g. "200 paid bookings by 31 March")', budget: 'the budget for the quarter, with its currency' }
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)
export const amount = v => { const m = String(v).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|m|thousand|million|lakh|lac)?/i); if (!m) return null; const mult = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, lakh: 1e5, lac: 1e5 }[(m[2] || '').toLowerCase()] || 1; return Number(m[1]) * mult }
export function check(text) {
  const found = {}, missing = []
  for (const [k, re] of Object.entries(REQUIRED)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else missing.push(k) }
  if (found.goal_with_date && !(/\d/.test(found.goal_with_date) && /(20\d\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|quarter|week|month)/i.test(found.goal_with_date))) { missing.push('goal_with_date'); delete found.goal_with_date }
  if (found.budget && amount(found.budget) === null) { missing.push('budget'); delete found.budget }
  return { ok: !missing.length, found, missing, budget: found.budget ? amount(found.budget) : null, say: missing.length ? `To do this I need: ${missing.map(k => ASK[k]).join('; ')}.` : '' }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const g = check('App: Breathwell\nGoal: 5,000 weekly active users by 31 March 2027\nBudget: £6,000 for the quarter')
  const b = check('App: Breathwell\nGoal: grow a lot\nAssume for me: yes')
  const ok = g.ok && g.budget === 6000 && !b.ok && b.missing.includes('budget') && b.missing.includes('goal_with_date')
  console.log(JSON.stringify({ ok, cases: 2 })); process.exit(ok ? 0 : 1)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
