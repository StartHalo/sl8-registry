#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Write our voice rules).
// Only the app is required (an "App:" line or a store link). The messaging house counts as given when
// the project holds messaging-house.md (--project artifacts/<app>); copy to rewrite counts as given
// when it is pasted ("Copy:") or attached. Every other input is assumed when missing, and the
// Assumptions section gives each one a line starting "- **<label>:**" (D40).
//   node inputs.mjs <request.md> [--attachments <dir>] [--project artifacts/<app>] | --selftest | --help
// No prompts; JSON on stdout; exit 1 only when the app is missing; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
const HELP = 'usage: node inputs.mjs <request.md> [--attachments artifacts/attachments] [--project artifacts/<app>] | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
const SAY = 'To do this I need: the app (its App Store or Google Play link, or its name and what it does).'
const REQUIRED = [{ field: 'app', get: t => appOf(t) }]
export const OPTIONAL = [
  { field: 'copy', label: 'Copy to rewrite', names: 'copy|copy to rewrite|current copy', extra: (t, att) => att.length ? `${att.length} attached file(s)` : null },
  { field: 'messaging_house', label: 'Messaging house', names: 'messaging house|messaging|promise', file: 'messaging-house.md' },
  { field: 'words_to_avoid', label: 'Words to avoid', names: 'words to avoid|avoid|banned words' },
]
function selftest () {
  const full = check('Write our voice rules\nApp: Quillo\nCopy: Quillo is the ultimate list app\nMessaging house: attached\nWords to avoid: hack, hustle')
  const att = check('how should our app sound https://apps.apple.com/app/id000', { attachments: ['a.md'], project: ['x/messaging-house.md'] })
  const none = check('write our tone of voice')
  const ghost = check('Write our voice rules\nApp: Quillo\nMessaging house: the messaging house you wrote')
  const ok = full.ok && !full.assume.length && att.ok && att.found.copy && att.found.messaging_house && att.assume.length === 1 && !none.ok && ghost.assume.some(a => a.field === 'messaging_house')
  return { ok, cases: 3 }
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
