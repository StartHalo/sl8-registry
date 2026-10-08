#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic only (D40) for the trial-path action sheet. Never
// wording or quality: whether the changes are the right ones is the person's check against the references.
//   node validate.mjs <artifacts/<product>/trial-path-review.md> --pages <file|dir> [--pages <dir> …]
//        [--request <request.md>] | --selftest | --help
// Checks: every section filled; each path step has a full URL (or is "not seen"), a label from the set and,
// unless "not seen", the words the visitor meets in quotes; what was checked has a row for Technical, each
// of the five lenses ("Heuristic: relevance" …) and the four other ResearchXL steps, and each lens row
// quotes its evidence or says "not judged"; every quote in the path, what was checked and the changes
// (Now and Evidence; never the new words in Change) is found word for word in the pages read or the
// request (SHORTCOMINGS №185); a captcha or a submit that page script disables, in the form facts of a
// page on the path, is named in the friction row; each change has an ID, a URL and section, a quote, a change,
// evidence, a bucket from the five and a PXL; no Test bucket when the request gave no traffic; each PXL
// row's points are 0 or the header's weight and add up to its total, which equals the change's PXL; changes
// in descending PXL order; "Pages read" is the number of pages saved; what the review cannot show names
// speed, the phone, the fold, page script and the screens after sign-up; the three kit parts; one
// Assumptions line per input the request left out; no [TBD]. No prompts; JSON on stdout; exit 1 on any error.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'

const HELP = 'usage: node validate.mjs <trial-path-review.md> --pages <file|dir> [--pages <dir>] [--request <request.md>] | --selftest\n  prints {"ok","changes":n,"quotes":n,"errors":[…]}'
const SECTIONS = ['The path', 'What was checked', 'Ranked changes', 'PXL scores', 'What this review cannot show', 'Research kit', 'Method', 'Assumptions']
const LABELS = ['green', 'yellow', 'red', 'not seen']
const BUCKETS = ['just do it', 'test', 'instrument', 'hypothesize', 'investigate']
const LENSES = ['relevance', 'clarity', 'value', 'friction', 'distraction']
const STEPS = ['Technical', ...LENSES.map(l => `Heuristic: ${l}`), 'Digital analytics', 'Mouse tracking', 'Qualitative', 'User testing']
const KIT = ['Interview script', 'Five-user test', 'Recording setup']
const CANNOT = [['speed', /speed|core web vitals/i], ['how pages look on a phone', /phone|mobile/i], ['the fold', /fold/i], ['what page script builds or changes', /script/i], ['the screens after sign-up', /after sign(ing)?[ -]?up/i]]
const read = f => fs.readFileSync(f, 'utf8')
// how quotes are compared: case, spacing, quote, dash and ellipsis forms differ between a page and a quote
// of it without changing a word; nothing else is forgiven
export const norm = t => String(t).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[“”„‟″]/g, '"').replace(/[‘’‚‛′]/g, "'").replace(/[‐‑‒–—―−]/g, '-').replace(/…/g, '...').replace(/[​-‍﻿]/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
// the words in quotation marks in a cell ("…" or “…”)
export const quotes = cell => [...String(cell || '').matchAll(/["“]([^"”\n]+?)["”]/g)].map(m => m[1].trim()).filter(q => q.length >= 2)
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
const table = s => (s || '').split('\n').filter(l => /^\|/.test(l)).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim()))
const site = u => String(u || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/i, '').toLowerCase()

// pagesText(paths): the pages read (each starts "Source: <url>"), their form facts, and the words to quote from
export function pagesText (paths) {
  const files = []
  for (const p of paths) { if (!p || !fs.existsSync(p)) continue; if (fs.statSync(p).isDirectory()) { for (const f of fs.readdirSync(p).sort()) if (/\.(md|txt|html?|eml|csv)$/i.test(f) && !f.startsWith('.')) files.push(path.join(p, f)) } else files.push(p) }
  const pages = []
  for (const f of files) for (const part of read(f).split(/^(?=Source: )/m)) {
    const m = /^Source: (\S+)/.exec(part)
    if (m) pages.push({ file: f, url: m[1], forms: part.split('\n').filter(l => /^- Form \d+:/.test(l)) })
  }
  return { files, pages, text: norm(files.map(read).join('\n').replace(/^(## |- )/gm, '')) }
}

export function validate (text, pagePaths, requestText = null) {
  const errors = [], sec = sections(text)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  const pg = pagesText(pagePaths)
  if (!pg.files.length) errors.push('no pages to check the quotes against (--pages)')
  const hay = pg.text + ' ' + norm(requestText || '')
  let quoted = 0
  const found = q => q.split(/…|\.\.\./).map(norm).filter(x => x.length >= 2).every(x => hay.includes(x))
  const checkQuotes = (where, cell) => { for (const q of quotes(cell)) { quoted++; if (pg.files.length && !found(q)) errors.push(`${where}: the quote is not in the pages read or the request: "${q.slice(0, 80)}"`) } }
  // the path
  const steps = table(sec['The path']).slice(2)
  if (!steps.length) errors.push('the path: no steps')
  const pathUrls = new Set()
  steps.forEach((r, i) => {
    const [n, url, , label, meets] = r
    const lab = String(label || '').toLowerCase(), id = `path step ${n || i + 1}`
    if (!LABELS.includes(lab)) errors.push(`${id}: label "${label}" is not green, yellow, red or not seen`)
    else if (lab !== 'not seen' && !/^https?:\/\/\S+/.test(url || '')) errors.push(`${id}: no full URL (only a "not seen" step may lack one)`)
    else if (lab !== 'not seen' && !quotes(meets).length) errors.push(`${id}: what the visitor meets is not quoted ("…")`)
    if (/^https?:\/\//.test(url || '')) pathUrls.add(site(url))
    checkQuotes(id, meets)
  })
  // what was checked: one row per step and per lens; a lens row quotes its evidence or says "not judged"
  const rows = table(sec['What was checked']).slice(2)
  for (const s of STEPS) {
    const row = rows.find(r => norm(r[0]) === norm(s))
    if (!sec['What was checked']) break
    if (!row) { errors.push(`what was checked: no row for "${s}"`); continue }
    if (s.startsWith('Heuristic') && !quotes(row[2]).length && !/^not judged\b/i.test(row[2] || '')) errors.push(`what was checked, "${s}": the finding quotes no page ("…"); quote the words it rests on, or write "not judged: <why>"`)
  }
  for (const r of rows) checkQuotes(`what was checked, "${r[0]}"`, r[2])
  // ranked changes
  const req = requestText != null ? check(requestText) : null
  const changes = table(sec['Ranked changes']).slice(2), pxlOf = new Map(), order = []
  if (!changes.length) errors.push('ranked changes: no rows')
  changes.forEach((r, i) => {
    const [id, page, now, change, evidence, bucket, pxl] = r
    if (r.length < 7 || r.slice(0, 7).some(c => !c)) { errors.push(`change ${id || i + 1}: a cell is empty`); return }
    if (!/^C\d+$/.test(id)) errors.push(`change ${id}: the ID is not C1, C2 …`)
    if (!/^https?:\/\/\S+,\s*\S/.test(page)) errors.push(`change ${id}: the page is not "<full URL>, <section>"`)
    if (!/^["“](.*)["”]$/.test(now)) errors.push(`change ${id}: "now" is not quoted ("…")`)
    checkQuotes(`change ${id}, now`, now)
    checkQuotes(`change ${id}, evidence`, evidence)
    const b = bucket.toLowerCase()
    if (!BUCKETS.includes(b)) errors.push(`change ${id}: bucket "${bucket}" is not one of Just Do It, Test, Instrument, Hypothesize, Investigate`)
    if (b === 'test' && req && !req.trafficGiven) errors.push(`change ${id}: Test bucket, but the request gave no traffic (low traffic: Just Do It or Hypothesize)`)
    if (!/^\d+$/.test(pxl)) errors.push(`change ${id}: PXL "${pxl}" is not a whole number`)
    pxlOf.set(id, +pxl); order.push(+pxl)
  })
  for (let i = 1; i < order.length; i++) if (order[i] > order[i - 1]) { errors.push(`ranked changes: not in descending PXL order (${changes[i][0]} scores ${order[i]} after ${order[i - 1]})`); break }
  // form facts of the pages on the path that the friction row must name
  const friction = (rows.find(r => norm(r[0]) === 'heuristic: friction') || [])[2] || ''
  for (const p of pg.pages) {
    if (!pathUrls.has(site(p.url))) continue
    for (const f of p.forms) {
      if (/captcha: (yes|a captcha script)/i.test(f) && !/captcha/i.test(friction)) errors.push(`${p.url}: its form has a captcha (fetch facts); name it in "Heuristic: friction"`)
      else if (/disabled until page script/i.test(f) && !/captcha|disabled/i.test(friction)) errors.push(`${p.url}: its submit button is disabled until page script enables it (fetch facts); say so in "Heuristic: friction"`)
    }
  }
  // pages read
  const said = /^-\s*Pages read:\s*(\d+)/im.exec(text)
  if (pg.pages.length && (!said || +said[1] !== pg.pages.length)) errors.push(`"- Pages read: <n>" must give the ${pg.pages.length} page(s) saved${said ? `, not ${said[1]}` : ''}`)
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
  // what the review cannot show
  const cannot = sec['What this review cannot show'] || ''
  if (cannot) for (const [what, re] of CANNOT) if (!re.test(cannot)) errors.push(`what this review cannot show: nothing on ${what}`)
  // the kit
  for (const k of KIT) { const m = new RegExp(`^###\\s+${k}\\s*$([\\s\\S]*?)(?=^###|$(?![\\s\\S]))`, 'mi').exec(sec['Research kit'] || ''); if (sec['Research kit'] && !(m && m[1].trim())) errors.push(`research kit: "### ${k}" is missing or empty`) }
  if (req) for (const { label } of req.assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, changes: changes.length, quotes: quoted, errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples')
    const good = read(path.join(ex, 'good-1.md')), pages = [path.join(ex, 'pages-1.md')]
    const req = 'Review our trial path\nProduct: Ledgerline, https://ledgerline.example'
    const t = [], v = (s, r = req, p = pages) => validate(s, p, r)
    const g = v(good); t.push(['the template example passes', g.ok])
    t.push(['a quote not in the pages is an error', v(good.replace('| "Phone number" |', '| "Mobile number" |')).errors.some(e => /change C1, now: the quote/.test(e))])
    t.push(['a quote in the path not in the pages is an error', v(good.replace('"Starter $0.40 an invoice"', '"Starter from $0.40"')).errors.some(e => /path step 2: the quote/.test(e))])
    t.push(['a quote in the evidence not in the pages is an error', v(good.replace('| the only plan without a price;', '| "Agency: talk to sales" is the only plan without a price;')).errors.some(e => /change C4, evidence: the quote/.test(e))])
    t.push(['a lens row that quotes no page is an error', v(good.replace(/^\| Heuristic: distraction \|.*$/m, '| Heuristic: distraction | sign-up, form | distraction is low |')).errors.some(e => /"Heuristic: distraction": the finding quotes no page/.test(e))])
    t.push(['a lens row may say "not judged"', !v(good.replace(/^\| Heuristic: distraction \|.*$/m, '| Heuristic: distraction | sign-up, form | not judged: needs a screenshot |')).errors.some(e => /distraction/.test(e))])
    t.push(['a missing lens row is an error', v(good.replace(/^\| Heuristic: value \|.*\n/m, '')).errors.some(e => /no row for "Heuristic: value"/.test(e))])
    t.push(['a path step without a quote is an error', v(good.replace('| hero | green | "Send your first invoice in two minutes" |', '| hero | green | the headline |')).errors.some(e => /path step 1: what the visitor meets is not quoted/.test(e))])
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c04-validate-')), cap = path.join(tmp, 'pages.md')
    fs.writeFileSync(cap, read(pages[0]).replace(/^- Form 1: POST \/signup; submit button "Create account"; captcha: none in the HTML;/m, '- Form 1: POST /signup; submit button "Create account", disabled until page script enables it; captcha: yes, in the form (class "g-recaptcha");'))
    const capErr = v(good, req, [cap]).errors, capOk = v(good.replace('| sign-up, form (fetch facts) | four required fields', '| sign-up, form (fetch facts) | a captcha must pass before "Create account" works; four required fields'), req, [cap]).errors
    fs.rmSync(tmp, { recursive: true, force: true })
    t.push(['a captcha in the form facts of a page on the path must be named under friction', capErr.some(e => /has a captcha/.test(e)) && !capOk.some(e => /captcha|disabled/.test(e))])
    t.push(['"Pages read" that is not the number of pages saved is an error', v(good.replace('- Pages read: 3,', '- Pages read: 4,')).errors.some(e => /Pages read/.test(e))])
    t.push(['what the review cannot show must name page script', v(good.replace(/^- Anything page script builds.*$/m, '')).errors.some(e => /page script builds or changes/.test(e))])
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
    t.push(['quote, dash and space forms are forgiven, words are not', norm('“Start free trial” — now…') === norm('"start free trial" - now...') && norm('free trial') !== norm('free trials')])
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
