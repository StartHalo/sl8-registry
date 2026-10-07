#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic only (D40) for the trial-path action sheet. Never
// wording or quality: whether the changes are the right ones is the person's check against the references.
//   node validate.mjs <artifacts/<product>/trial-path-review.md> --pages <file|dir> [--request <request.md>]
//   --selftest | --help
// Checks: every section filled; each path step has a full URL (or is "not seen") and a label from the
// set; all six ResearchXL steps listed; each change has an ID, a URL and section, a quote found word for
// word in the pages read, a change, evidence, a bucket from the five and a PXL; no Test bucket when the
// request gave no traffic; each PXL row's points are 0 or the header's weight and add up to its total,
// which equals the change's PXL; changes in descending PXL order; the three kit parts; one Assumptions
// line per input the request left out; no [TBD]. No prompts; JSON on stdout; exit 1 on any error.
import fs from 'node:fs'
import path from 'node:path'
import { check } from './inputs.mjs'

const HELP = 'usage: node validate.mjs <trial-path-review.md> --pages <file|dir> [--request <request.md>] | --selftest\n  prints {"ok","changes":n,"errors":[…]}'
const SECTIONS = ['The path', 'What was checked', 'Ranked changes', 'PXL scores', 'What this review cannot show', 'Research kit', 'Method', 'Assumptions']
const LABELS = ['green', 'yellow', 'red', 'not seen']
const BUCKETS = ['just do it', 'test', 'instrument', 'hypothesize', 'investigate']
const STEPS = ['Technical', 'Heuristic', 'Digital analytics', 'Mouse tracking', 'Qualitative', 'User testing']
const KIT = ['Interview script', 'Five-user test', 'Recording setup']
const read = f => fs.readFileSync(f, 'utf8')
const norm = t => String(t).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
const table = s => (s || '').split('\n').filter(l => /^\|/.test(l)).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim()))
export function pagesText (paths) {
  const files = []
  for (const p of paths) { if (!fs.existsSync(p)) continue; if (fs.statSync(p).isDirectory()) { for (const f of fs.readdirSync(p)) if (/\.(md|txt|html?)$/i.test(f)) files.push(path.join(p, f)) } else files.push(p) }
  return { files, text: norm(files.map(read).join('\n')) }
}

export function validate (text, pagePaths, requestText = null) {
  const errors = [], sec = sections(text)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  // the path
  const steps = table(sec['The path']).slice(2)
  if (!steps.length) errors.push('the path: no steps')
  steps.forEach((r, i) => {
    const [n, url, , label] = r
    const lab = String(label || '').toLowerCase()
    if (!LABELS.includes(lab)) errors.push(`path step ${n || i + 1}: label "${label}" is not green, yellow, red or not seen`)
    else if (lab !== 'not seen' && !/^https?:\/\/\S+/.test(url || '')) errors.push(`path step ${n || i + 1}: no full URL (only a "not seen" step may lack one)`)
  })
  // what was checked
  const checked = table(sec['What was checked']).slice(2).map(r => norm(r[0]))
  for (const s of STEPS) if (sec['What was checked'] && !checked.includes(s.toLowerCase())) errors.push(`what was checked: no row for "${s}"`)
  // ranked changes
  const pg = pagesText(pagePaths)
  if (!pg.files.length) errors.push('no pages to check the quotes against (--pages)')
  const req = requestText != null ? check(requestText) : null
  const changes = table(sec['Ranked changes']).slice(2), pxlOf = new Map(), order = []
  if (!changes.length) errors.push('ranked changes: no rows')
  changes.forEach((r, i) => {
    const [id, page, now, change, evidence, bucket, pxl] = r
    if (r.length < 7 || r.slice(0, 7).some(c => !c)) { errors.push(`change ${id || i + 1}: a cell is empty`); return }
    if (!/^C\d+$/.test(id)) errors.push(`change ${id}: the ID is not C1, C2 …`)
    if (!/^https?:\/\/\S+,\s*\S/.test(page)) errors.push(`change ${id}: the page is not "<full URL>, <section>"`)
    const q = /^["“](.*)["”]$/.exec(now)?.[1]
    if (q == null) errors.push(`change ${id}: "now" is not quoted ("…")`)
    else if (pg.files.length && !pg.text.includes(norm(q))) errors.push(`change ${id}: the quote is not in the pages read: "${q.slice(0, 80)}"`)
    const b = bucket.toLowerCase()
    if (!BUCKETS.includes(b)) errors.push(`change ${id}: bucket "${bucket}" is not one of Just Do It, Test, Instrument, Hypothesize, Investigate`)
    if (b === 'test' && req && !req.trafficGiven) errors.push(`change ${id}: Test bucket, but the request gave no traffic (low traffic: Just Do It or Hypothesize)`)
    if (!/^\d+$/.test(pxl)) errors.push(`change ${id}: PXL "${pxl}" is not a whole number`)
    pxlOf.set(id, +pxl); order.push(+pxl)
  })
  for (let i = 1; i < order.length; i++) if (order[i] > order[i - 1]) { errors.push(`ranked changes: not in descending PXL order (${changes[i][0]} scores ${order[i]} after ${order[i - 1]})`); break }
  // PXL arithmetic
  const pt = table(sec['PXL scores'])
  if (pt.length) {
    const head = pt[0].slice(1, -1).map(h => { const m = /\((\d+)(?:\s*[–-]\s*(\d+))?\)/.exec(h); return m ? (m[2] ? { name: h, max: +m[2], range: true } : { name: h, max: +m[1] }) : null })
    if (head.some(h => !h)) errors.push('PXL scores: every question in the header needs its weight in brackets, e.g. "Adds or removes (2)"')
    const seen = new Set()
    for (const r of pt.slice(2)) {
      const id = r[0], vals = r.slice(1, -1).map(Number), total = Number(r[r.length - 1]); seen.add(id)
      if (vals.some(v => !Number.isInteger(v)) || !Number.isInteger(total)) { errors.push(`PXL ${id}: a cell is not a whole number`); continue }
      vals.forEach((v, j) => { const h = head[j]; if (h && (h.range ? v < 0 || v > h.max : v !== 0 && v !== h.max)) errors.push(`PXL ${id}: "${h.name}" is ${v}; it must be ${h.range ? `0–${h.max}` : `0 or ${h.max}`}`) })
      const sum = vals.reduce((a, b) => a + b, 0)
      if (sum !== total) errors.push(`PXL ${id}: the points add up to ${sum}, but the total says ${total}`)
      if (pxlOf.has(id) && pxlOf.get(id) !== total) errors.push(`PXL ${id}: the total is ${total}, but Ranked changes says ${pxlOf.get(id)}`)
      if (!pxlOf.has(id)) errors.push(`PXL ${id}: no such change in Ranked changes`)
    }
    for (const id of pxlOf.keys()) if (!seen.has(id)) errors.push(`PXL scores: no row for ${id}`)
  }
  // the kit
  for (const k of KIT) { const m = new RegExp(`^###\\s+${k}\\s*$([\\s\\S]*?)(?=^###|$(?![\\s\\S]))`, 'mi').exec(sec['Research kit'] || ''); if (sec['Research kit'] && !(m && m[1].trim())) errors.push(`research kit: "### ${k}" is missing or empty`) }
  if (req) for (const { label } of req.assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, changes: changes.length, errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples')
    const good = read(path.join(ex, 'good-1.md')), pages = [path.join(ex, 'pages-1.md')]
    const req = 'Review our trial path\nProduct: Ledgerline, https://ledgerline.example'
    const t = [], v = (s, r = req) => validate(s, pages, r)
    const g = v(good); t.push(['the template example passes', g.ok])
    t.push(['a quote not in the pages is an error', v(good.replace('| "Phone number" |', '| "Mobile number" |')).errors.some(e => /C1: the quote/.test(e))])
    t.push(['PXL points that do not add up are an error', v(good.replace('| C3 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 3 | 4 |', '| C3 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 3 | 5 |')).errors.some(e => /PXL C3: the points add up/.test(e))])
    t.push(['a point that is not 0 or the weight is an error', v(good.replace('| C1 | 0 | 0 | 2 |', '| C1 | 0 | 0 | 1 |')).errors.some(e => /must be 0 or 2/.test(e))])
    t.push(['changes out of PXL order are an error', v(good.replace('| Just Do It | 4 |', '| Just Do It | 7 |')).errors.some(e => /descending PXL|Ranked changes says/.test(e))])
    t.push(['a Test bucket without traffic is an error', v(good.replace('| Hypothesize | 4 |\n| C5', '| Test | 4 |\n| C5')).errors.some(e => /Test bucket/.test(e))])
    t.push(['a Test bucket with traffic given is allowed', !v(good.replace('| Hypothesize | 4 |\n| C5', '| Test | 4 |\n| C5'), req + '\nTraffic: 9,000 visits a month, 400 trials').errors.some(e => /Test bucket/.test(e))])
    t.push(['a bucket outside the set is an error', v(good.replace('| Just Do It | 6 |', '| Quick win | 6 |')).errors.some(e => /bucket "Quick win"/.test(e))])
    t.push(['a missing kit part is an error', v(good.replace('### Recording setup', '### Something else')).errors.some(e => /Recording setup/.test(e))])
    t.push(['a missing ResearchXL step is an error', v(good.replace('| Mouse tracking | not done', '| Heatmaps | not done')).errors.some(e => /Mouse tracking/.test(e))])
    t.push(['a missing Assumptions line is an error', v(good.replace(/^- \*\*Screenshots:\*\*.*$/m, '')).errors.some(e => /Screenshots/.test(e))])
    t.push(['a path step without a URL is an error', v(good.replace('| 2 | https://ledgerline.example/pricing |', '| 2 | pricing |')).errors.some(e => /path step 2/.test(e))])
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  const files = []; let reqFile = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--pages') files.push(a[++i]); else if (a[i] === '--request') reqFile = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = validate(read(a[0]), files, reqFile && fs.existsSync(reqFile) ? read(reqFile) : null)
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines and the Test rule were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
