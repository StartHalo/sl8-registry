#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Write our messaging house).
// Only the app is required (an "App:" line or a store link). Positioning counts as given when the
// project holds BOT-C01's icp.md (--project artifacts/<app>). Every other input is assumed when
// missing, and the Assumptions section gives each one a line starting "- **<label>:**" (D40).
//   node inputs.mjs <request.md> [--project artifacts/<app>] | --selftest | --help
// No prompts; JSON on stdout; exit 1 only when the app is missing; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
const HELP = 'usage: node inputs.mjs <request.md> [--attachments artifacts/attachments] [--project artifacts/<app>] | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
const SAY = 'To do this I need: the app (its App Store or Google Play link, or its name and what it does).'
const REQUIRED = [{ field: 'app', get: t => appOf(t) }]
export const OPTIONAL = [
  { field: 'positioning', label: 'Positioning', names: 'positioning|icp|ideal customer', file: 'icp.md' },
  { field: 'audiences', label: 'Audiences', names: 'audiences?|who it is for|users' },
  { field: 'proof', label: 'Proof', names: 'proof|proof points|evidence' },
  { field: 'competitors', label: 'Competitors', names: 'competitors?|alternatives' },
]
function selftest () {
  const full = check('Write our messaging house\nApp: Quillo, https://apps.apple.com/app/id000\nPositioning: for households who shop together\nAudiences: couples, house-shares\nProof: 1M lists shared\nCompetitors: AnyList, Bring!')
  const link = check('what should we say about our app https://play.google.com/store/apps/details?id=example')
  const icp = check('Write our messaging house\nApp: Quillo', { project: ['artifacts/quillo/icp.md'] })
  const none = check('Write our messaging house please')
  const ok = full.ok && !full.assume.length && link.ok && link.assume.length === 4 && icp.found.positioning && icp.assume.length === 3 && !none.ok && none.missing[0] === 'app'
  return { ok, cases: 4 }
}
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|none given|-|—|\?)\s*$/i.test(v)
const STORE = /https?:\/\/(?:apps\.apple\.com|play\.google\.com)\/\S+/i
const lineOf = (text, names) => { const m = new RegExp(`^\\s*(?:${names.replace(/ /g, '[ _]')})\\s*[:—-]\\s*(.+)$`, 'im').exec(text); return m && !empty(m[1]) ? m[1].trim() : null }
// The app: an "App:" line, or a store link anywhere in the request.
export const appOf = text => lineOf(text, 'app|product|app name|store link|listing') || (STORE.exec(text) || [])[0] || null
// check(text, { attachments: [files], project: [files already in artifacts/<app>/] })
export function check (text, ctx = {}) {
  const attachments = ctx.attachments || [], project = (ctx.project || []).map(f => f.split('/').pop())
  const found = {}, missing = [], assume = []
  for (const r of REQUIRED) { const v = r.get(text, attachments, project); if (v) found[r.field] = v; else missing.push(r.field) }
  for (const o of OPTIONAL) {
    // "the messaging house you wrote" counts only when that file is in the project; else it is assumed.
    const said = lineOf(text, o.names), earlier = said && /\b(?:you|this bot|the bot) (?:wrote|made|did)\b/i.test(said)
    const v = (said && !(earlier && o.file && !project.includes(o.file)) ? said : null) || (o.file && project.includes(o.file) ? `artifacts/<app>/${o.file} (an earlier job)` : null) || (o.extra ? o.extra(text, attachments, project) : null)
    if (v) found[o.field] = v; else assume.push({ field: o.field, label: o.label })
  }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? SAY : '' }
}
const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) { const r = selftest(); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1) }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const opt = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null }
  const ls = d => d && fs.existsSync(d) ? fs.readdirSync(d).filter(f => !f.startsWith('.')).map(f => path.join(d, f)) : []
  const r = check(fs.readFileSync(a[0], 'utf8'), { attachments: ls(opt('--attachments')), project: ls(opt('--project')) })
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
