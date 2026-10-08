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
// (the value is the rest of that line only: an empty field never borrows the next line)
export const header = (md, label) => { const top = md.split(/^## /m)[0]; const m = top.match(new RegExp(`^[ \\t]*[-*][ \\t]*\\*\\*${esc(label)}:\\*\\*[ \\t]*(.*)$`, 'mi')); return m ? m[1].trim() : null }
export const field = (body, label) => { const m = body.match(new RegExp(`^[ \\t]*[-*][ \\t]*\\*\\*${esc(label)}:\\*\\*[ \\t]*(.*)$`, 'mi')); return m ? m[1].trim() : null }
// a markdown table whose header row starts with the given columns (case-insensitive); rows as arrays
export function table (text, cols) {
  const lines = (text || '').split('\n').filter(l => /^\s*\|/.test(l))
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
  const head = lines.findIndex(l => { const c = cells(l).map(x => x.toLowerCase()); return cols.every((k, i) => (c[i] || '').startsWith(k.toLowerCase())) })
  if (head < 0) return null
  return lines.slice(head + 2).map(cells).filter(r => r.some(c => c))
}
// the bullets of a section, each with its wrapped lines joined
export function bullets (text) {
  const out = []; let open = false
  for (const l of String(text || '').split('\n')) {
    if (/^\s*[-*+]\s+\S/.test(l)) { out.push(l.replace(/^\s*[-*+]\s+/, '').trim()); open = true } else if (!l.trim() || /^\s*(#|\|)/.test(l)) open = false
    else if (open) out[out.length - 1] += ' ' + l.trim()
  }
  return out
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
// a part marked (assumed) or (proposed) is something nobody gave: then Assumptions cannot say "None"
export function marksNeedAssumptions (md) {
  const a = section(md, 'Assumptions'), rest = md.replace(/^## Assumptions[\s\S]*$/m, '')
  return a && /^\s*-\s*None\b/im.test(a) && /\((?:assumed|proposed)\)/i.test(rest) ? ['a part is marked (assumed) or (proposed), but Assumptions says "None": give each one its line, with what to send'] : []
}
export const methodLine = md => /^\*\*Method:\*\*\s*\S{3,}/m.test(md) ? [] : ['no "**Method:**" line naming the method']
export const tbd = md => { const n = (md.match(/\[TBD\]/gi) || []).length; return n ? [`${n} [TBD] left: fill each part with what you know, and put the gap under Assumptions with what to send`] : [] }
// a reference example starts with a "Source: …" line that a deliverable does not have
export const body = md => md.replace(/^Source:[^\n]*\n/, '')
export const read = f => fs.readFileSync(f, 'utf8')
// true when this file was run as a command (skills are reached through a symlink, SHORTCOMINGS №121)
export const isDirect = url => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(url).pathname) } catch { return false } }
export const arg = (a, k) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null }

// ---- dates and the founder's week, shared by the channel tests and the launch brief (D40 arithmetic) ----
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
export const DAY = 864e5
// the first date in a text, as UTC midnight: 2027-02-03, 3 February 2027, February 3, 2027 (3-letter months too)
export function day (v) {
  const s = String(v || '').replace(/\(.*?\)/g, '').trim(), iso = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3])
  const mi = t => MONTHS.findIndex(m => m.startsWith(t.toLowerCase().slice(0, 3)))
  let m = s.match(/(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/); if (m && mi(m[2]) >= 0) return Date.UTC(+m[3], mi(m[2]), +m[1])
  m = s.match(/([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/); if (m && mi(m[1]) >= 0) return Date.UTC(+m[3], mi(m[1]), +m[2])
  return NaN
}
export const iso = t => new Date(t).toISOString().slice(0, 10)
export const week = v => { const m = String(v).match(/^\s*W?(\d{1,2})\s*$/i); return m ? Number(m[1]) : NaN }
export const lweek = v => { const m = String(v).replace(/[−–]/g, '-').match(/^\s*L\s*([+-]\s*\d{1,2}|0)\s*$/i); return m ? Number(m[1].replace(/\s/g, '')) : NaN }
export const TEST_COLS = ['#', 'Channel', 'What to do', 'Start week', 'Weeks', 'Cost', 'Hours a week', 'Threshold']
export const STANDING_COLS = ['Action', 'Where', 'Hours a week', 'Cost']
export const ACTION_COLS = ['Week', 'Date', 'Action', 'Owner', 'Founder hours', 'Cost']
// channel-tests.md: the founder's hours in each week W1–W13 (the tests running plus the standing
// actions, load[1..13]) and W1's date from "- **Weeks:** W1 = <date> to W13 = <date>"
export function channelLoad (md) {
  const load = Array(14).fill(0)
  for (const r of table(section(md, 'Tests'), TEST_COLS) || []) { const s = week(r[3]), w = num(r[4]), h = num(r[6]); if (s >= 1 && w >= 1 && !Number.isNaN(h)) for (let k = s; k <= Math.min(13, s + w - 1); k++) load[k] += h }
  for (const r of table(section(md, 'Standing actions'), STANDING_COLS) || []) { const h = num(r[2]); if (!Number.isNaN(h)) for (let k = 1; k <= 13; k++) load[k] += h }
  return { load, w1: day(header(md, 'Weeks')) }
}
// launch-brief.md: each action's week from launch day, its date and the founder's hours
export const launchActions = md => (table(section(md, 'Actions'), ACTION_COLS) || []).map(r => ({ week: r[0], w: lweek(r[0]), date: day(r[1]), hours: num(r[4]) }))
// combinedHours(channelMd, launchMd, limit): the two plans of one project share the founder's week. Each
// launch action's hours fall in the channel-test week that holds its date (Wk = W1 + 7(k-1) days) and are
// added to that week's tests and standing actions; the sum stays within the founder's hours (SHORTCOMINGS №172)
export function combinedHours (channelMd, launchMd, limit) {
  const c = channelLoad(channelMd), extra = {}
  if (Number.isNaN(c.w1)) return { errors: [], warnings: ['channel-tests.md gives no date for W1 ("- **Weeks:** W1 = <date> …"), so its hours were not added to the launch\'s'] }
  for (const a of launchActions(launchMd)) {
    if (Number.isNaN(a.date) || Number.isNaN(a.hours)) continue
    const k = Math.floor((a.date - c.w1) / (7 * DAY)) + 1
    if (k < 1 || k > 13) continue
    const x = (extra[k] = extra[k] || { h: 0, weeks: [] }); x.h += a.hours; if (!x.weeks.includes(a.week)) x.weeks.push(a.week)
  }
  const errors = Object.entries(extra).map(([k, x]) => [Number(k), x, c.load[k] + x.h]).filter(([, , total]) => total > limit + 0.01)
    .map(([k, x, total]) => `W${k} of the channel tests (week of ${iso(c.w1 + (k - 1) * 7 * DAY)}): ${c.load[k]} hours of tests and standing actions plus ${x.h} of launch actions (${x.weeks.join(', ')}) make ${total}, over the founder's ${limit} a week`)
  return { errors: errors.slice(0, 8), warnings: [] }
}
