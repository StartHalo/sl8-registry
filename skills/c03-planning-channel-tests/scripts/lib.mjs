// lib.mjs: shared parsing for this skill's scripts (completeness, wiring and arithmetic only, D40).
// Pure functions; reads and writes nothing. Copied into each c03 skill so each publishes on its own.
import fs from 'node:fs'
export const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?|…)\s*$/i.test(v)
export const unfilled = v => empty(v) || /\[tbd\]/i.test(v)
export const num = v => { const m = String(v ?? '').replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN }
export const amount = v => { const m = String(v ?? '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|m|thousand|million)?\b/i); if (!m) return null; const mult = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6 }[(m[2] || '').toLowerCase()] || 1; return Number(m[1]) * mult }
export const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// the body of "## <heading>" up to the next "## " heading, or null when the heading is absent
export const section = (md, h) => { const parts = md.split(new RegExp(`^## ${esc(h)}[^\\n]*$`, 'm')); return parts.length < 2 ? null : parts[1].split(/^## /m)[0].trim() }
// "- **Label:** value" in the part of the document before the first "## "
export const header = (md, label) => { const top = md.split(/^## /m)[0]; const m = top.match(new RegExp(`^\\s*[-*]\\s*\\*\\*${esc(label)}:\\*\\*\\s*(.*)$`, 'mi')); return m ? m[1].trim() : null }
export const field = (body, label) => { const m = body.match(new RegExp(`^\\s*[-*]\\s*\\*\\*${esc(label)}:\\*\\*\\s*(.*)$`, 'mi')); return m ? m[1].trim() : null }
// a markdown table whose header row starts with the given columns (case-insensitive); rows as arrays
export function table (text, cols) {
  const lines = (text || '').split('\n').filter(l => /^\s*\|/.test(l))
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
  const head = lines.findIndex(l => { const c = cells(l).map(x => x.toLowerCase()); return cols.every((k, i) => (c[i] || '').startsWith(k.toLowerCase())) })
  if (head < 0) return null
  return lines.slice(head + 2).map(cells).filter(r => r.some(c => c))
}
// one Assumptions line per input the request left out: "- **<label>:** …" (the field name is accepted too)
export function assumptionLines (md, assume) {
  const a = section(md, 'Assumptions')
  if (a === null) return ['no "## Assumptions" section']
  if (!a) return ['"## Assumptions" is empty: list what you assumed, or write "- None: every input was given."']
  const errors = []
  for (const { label, field: f = label } of assume) if (!new RegExp(`^\\s*-\\s*\\*{0,2}(?:${[label, f, f.replace(/_/g, ' ')].map(esc).join('|')})\\*{0,2}\\s*:`, 'im').test(a)) errors.push(`no Assumptions line for "${label}", which the request left out: add "- **${label}:** not given. Assumed …. Send … to replace it."`)
  return errors
}
export const methodLine = md => /^\*\*Method:\*\*\s*\S{3,}/m.test(md) ? [] : ['no "**Method:**" line naming the method']
export const tbd = md => { const n = (md.match(/\[TBD\]/gi) || []).length; return n ? [`${n} [TBD] left: fill each part with what you know, and put the gap under Assumptions with what to send`] : [] }
// a reference example starts with a "Source: …" line that a deliverable does not have
export const body = md => md.replace(/^Source:[^\n]*\n/, '')
export const read = f => fs.readFileSync(f, 'utf8')
// true when this file was run as a command (skills are reached through a symlink, SHORTCOMINGS №121)
export const isDirect = url => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(url).pathname) } catch { return false } }
export const arg = (a, k) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null }
