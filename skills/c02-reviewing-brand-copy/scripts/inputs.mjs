#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Review our brand copy).
// Only the material is required: a "Material:" or "Copy:" line (pasted text, a public link, or "the
// listing you wrote"), text pasted after the first line, or files in the attachments folder. Brand
// rules count as given when the project holds messaging-house.md or voice-rules.md (--project
// artifacts/<app>). Every other input is assumed when missing, and the Assumptions section gives each
// one a line starting "- **<label>:**" (D40).
//   node inputs.mjs <request.md> [--attachments <dir>] [--project artifacts/<app>] | --selftest | --help
// No prompts; JSON on stdout; exit 1 only when the material is missing; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
const HELP = 'usage: node inputs.mjs <request.md> [--attachments artifacts/attachments] [--project artifacts/<app>] | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
const SAY = 'To do this I need: the copy to review (paste it, attach it, or send its public link).'
const material = (t, att) => {
  const m = /^\s*(?:material|copy|text|review|link)\s*[:—-]\s*(.+)$/im.exec(t)
  if (m && !/^\s*(<[^>]*>|tbd|-|\?)\s*$/i.test(m[1])) return m[1].trim()
  if (att.length) return `${att.length} attached file(s)`
  const body = t.split('\n').slice(1).filter(l => l.trim() && !/^\s*[\w ]{2,30}\s*:\s/.test(l)).join(' ')
  if (body.split(/\s+/).length >= 12) return 'pasted in the request'
  const url = /https?:\/\/\S+/.exec(t); if (url) return url[0]
  return null
}
// "the listing you wrote" is material only when store-listing.md is in the project.
const REQUIRED = [{ field: 'material', get: (t, att, proj) => { const m = material(t, att); return m && /\b(?:you|this bot) wrote\b/i.test(m) && !proj.includes('store-listing.md') ? null : m } }]
export const OPTIONAL = [
  { field: 'brand_rules', label: 'Brand rules', names: 'brand rules|rules|brand guide|style guide', extra: (t, att, proj) => proj.find(f => /^(messaging-house|voice-rules)\.md$/.test(f)) ? 'the project\'s messaging-house.md or voice-rules.md' : null },
  { field: 'app', label: 'App', names: 'app|product|app name', extra: t => (/https?:\/\/(?:apps\.apple\.com|play\.google\.com)\/\S+/i.exec(t) || [])[0] || null },
]
function selftest () {
  const named = check('Review our brand copy\nMaterial: https://apps.apple.com/app/id000\nBrand rules: our voice guide\nApp: Quillo')
  const pasted = check('does this copy sound like us\nQuillo is the ultimate revolutionary shopping list app that will totally change the way you shop forever!!')
  const att = check('check our listing', { attachments: ['a.md'], project: ['x/voice-rules.md'] })
  const none = check('review our brand copy')
  const ghost = check('Review our brand copy\nMaterial: the listing you wrote')
  const real = check('Review our brand copy\nMaterial: the listing you wrote', { project: ['a/store-listing.md'] })
  const ok = named.ok && !named.assume.length && pasted.ok && pasted.assume.length === 2 && att.ok && att.found.brand_rules && att.assume.length === 1 && !none.ok && none.missing[0] === 'material' && !ghost.ok && real.ok
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
