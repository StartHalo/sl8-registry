#!/usr/bin/env node
// inputs.mjs: checks the request has this job's required inputs (job card: Brief a launch campaign).
// No prompts; JSON on stdout; exit 1 when a required input is missing; writes nothing.
import fs from 'node:fs'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"budget":n|null,"say":"…"}'
const REQUIRED = {
  what_launches: /^(?:launch|launching|what launches|what's launching|feature|product)\s*[:—-]\s*(.+)$/im,
  launch_date: /^(?:launch date|date|launches on|going live)\s*[:—-]\s*(.+)$/im,
  audience: /^(?:audience|market|who|target)\s*[:—-]\s*(.+)$/im,
  budget: /^(?:budget|spend)\s*[:—-]\s*(.+)$/im,
}
const ASK = { what_launches: 'what is launching', launch_date: 'the launch date', audience: 'the audience or market for the launch', budget: 'the campaign budget, with its currency' }
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)
export const amount = v => { const m = String(v).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|m|thousand|million|lakh|lac)?/i); if (!m) return null; const mult = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, lakh: 1e5, lac: 1e5 }[(m[2] || '').toLowerCase()] || 1; return Number(m[1]) * mult }
export function check(text) {
  const found = {}, missing = []
  for (const [k, re] of Object.entries(REQUIRED)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else missing.push(k) }
  if (found.launch_date && !/(\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(found.launch_date)) { missing.push('launch_date'); delete found.launch_date }
  if (found.budget && amount(found.budget) === null) { missing.push('budget'); delete found.budget }
  return { ok: !missing.length, found, missing, budget: found.budget ? amount(found.budget) : null, say: missing.length ? `To brief the launch I need: ${missing.map(k => ASK[k]).join('; ')}.` : '' }
}
const a = process.argv.slice(2)
if (a.includes('--help')) { console.log(HELP); process.exit(0) }
if (a.includes('--selftest')) {
  const g = check('Launch: live group sessions\nLaunch date: 2 February 2027\nAudience: UK office workers\nBudget: £4,000')
  const b = check('Plan the launch of live sessions\nAudience: UK office workers\nAssume for me: yes')
  const ok = g.ok && g.budget === 4000 && !b.ok && ['what_launches', 'launch_date', 'budget'].every(k => b.missing.includes(k))
  console.log(JSON.stringify({ ok, cases: 2 })); process.exit(ok ? 0 : 1)
}
if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
