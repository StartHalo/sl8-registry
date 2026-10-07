#!/usr/bin/env node
// validate.mjs: completeness, wiring and the stores' own field limits for the store-listing copy.
// The limits are platform rules, counted by limits.mjs (locked by khalid 2026-10-07 as an exception to
// D40); nothing here judges wording or quality, which is the person's check against the references.
//   node validate.mjs <artifacts/<app>/store-listing.md> [--request <request.md>] [--project artifacts/<app>]
//   --selftest | --help
// Checks: every field under "## Apple App Store" and "## Google Play" with Current, a fenced Proposed
// block and Reason; each proposed field within its limit (characters; Apple keywords in UTF-8 bytes);
// keywords comma-separated with no spaces after commas; each quoted Current found word for word in
// the pages page.mjs saved (sources/), else (none), (not public) or (not read); the claims table, each
// claim's Source quoted word for word from a saved page or the request, or "none" with an
// "Unsourced claims" Assumptions line (SHORTCOMINGS №160, №161); Method; one Assumptions line per input
// the request left out; no [TBD]. The project folder is --project, else the deliverable's own folder.
// No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'
import { FIELDS, chars, bytes } from './limits.mjs'
import { exactText, norm, render, parse } from './page.mjs'

export { FIELDS, chars, bytes }
const HELP = 'usage: node validate.mjs <store-listing.md> [--request <request.md>] [--project artifacts/<app>] | --selftest\n  prints {"ok","fields":{name:{length,limit}},"errors":[…]}'
const SECTIONS = ['Apple App Store', 'Google Play', 'Claims to verify', 'Method', 'Assumptions']
const PLACEHOLDER = /^\((none|not public|not read|not on the page)\)/i
const read = f => fs.readFileSync(f, 'utf8')
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
function subsections (body) { const out = {}; for (const part of (body || '').split(/^(?=###\s)/m)) { const m = /^###\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1) } return out }
const table = s => (s || '').split('\n').filter(l => /^\|/.test(l)).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim()))
const quoted = s => /^["“](.*)["”](?:\s*\(([^)]*)\))?\s*$/.exec(String(s).trim())

// validate(file, { request, project }): request is the saved request's path; project the project folder
export function validate (file, { request = null, project = null } = {}) {
  const errors = [], text = read(file), sec = sections(text), fields = {}
  const dir = project || path.dirname(file)
  const requestText = request && fs.existsSync(request) ? read(request) : null
  const src = exactText([path.join(dir, 'sources'), path.join(dir, '..', 'attachments')], { trusted: [request] })
  for (const r of src.refused) errors.push(`sources: ${r}`)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  for (const [store, limits] of Object.entries(FIELDS)) {
    const sub = subsections(sec[store])
    for (const [field, limit] of Object.entries(limits)) {
      const body = sub[field]
      if (body == null) { errors.push(`${store}: no "### ${field}"`); continue }
      const cur = /^[-*]\s+Current:\s*(\S.*)$/m.exec(body)?.[1]
      if (!cur) errors.push(`${store} ${field}: no "- Current:" line (write "(none)" when the field is empty)`)
      else if (!PLACEHOLDER.test(cur)) {
        const q = quoted(cur)?.[1]
        if (q == null) errors.push(`${store} ${field}: Current is not the field's words in quotes, (none), (not public) or (not read)`)
        else if (!src.text.includes(norm(q))) errors.push(`${store} ${field}: Current is not word for word on a page page.mjs saved: "${q.slice(0, 80)}"`)
      }
      if (!/^[-*]\s+Reason:\s*\S/m.test(body)) errors.push(`${store} ${field}: no "- Reason:" line`)
      const m = /^[-*]\s+Proposed:\s*\n```[a-z]*\n([\s\S]*?)\n```/m.exec(body)
      if (!m || !m[1].trim()) { errors.push(`${store} ${field}: no fenced "- Proposed:" block`); continue }
      const v = m[1].replace(/\s+$/, '')
      const isKw = store === 'Apple App Store' && field === 'Keywords'
      const n = isKw ? bytes(v) : chars(v)
      fields[`${store}: ${field}`] = { length: n, limit, unit: isKw ? 'bytes' : 'characters' }
      if (n > limit) errors.push(`${store} ${field}: ${n} ${isKw ? 'bytes' : 'characters'}, over the limit of ${limit}`)
      if (isKw) {
        if (/\n/.test(v)) errors.push('Apple Keywords: one line, comma-separated')
        if (/,\s/.test(v)) errors.push('Apple Keywords: a space after a comma (wasted bytes; write "a,b,c")')
        if (!/,/.test(v)) errors.push('Apple Keywords: not comma-separated')
      }
    }
  }
  const claims = table(sec['Claims to verify'])
  if (claims.length < 2) errors.push('Claims to verify: no table (write one row per claim, or a row saying none was found)')
  else {
    const head = claims[0].map(c => c.toLowerCase()), si = head.indexOf('source')
    if (si < 0) errors.push('Claims to verify: no "Source" column (the words on the saved page or in the request that back each claim)')
    let unsourced = 0
    claims.slice(2).forEach((r, i) => {
      if (si < 0 || /^none found/i.test(r[0] || '')) return
      const s = r[si] || '', q = quoted(s)
      if (/^none\b/i.test(s)) unsourced++
      else if (!q) errors.push(`claim ${i + 1}: Source is not the backing words in quotes with where they are, nor "none"`)
      else if (!src.text.includes(norm(q[1]))) errors.push(`claim ${i + 1}: Source is not word for word on a saved page or in the request: "${q[1].slice(0, 80)}"`)
    })
    if (unsourced && !/^[-*]\s+\*\*Unsourced claims:\*\*/mi.test(sec.Assumptions || '')) errors.push(`Assumptions: ${unsourced} claim(s) have Source "none" but there is no "- **Unsourced claims:**" line`)
  }
  if (requestText != null) for (const { label } of check(requestText, { project: fs.existsSync(dir) ? fs.readdirSync(dir) : [] }).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, fields, sources: src.files.map(f => path.basename(f)), errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples'), orig = read(path.join(ex, 'good-1.md'))
    // the example's project, as the machine holds it: both store pages page.mjs saved, the earlier
    // messaging house and voice rules, and the saved request
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-listing-')), proj = path.join(tmp, 'artifacts', 'quillo'), t = []
    fs.mkdirSync(path.join(proj, 'sources'), { recursive: true }); fs.mkdirSync(path.join(proj, 'inputs'))
    fs.copyFileSync(path.join(ex, 'page-1.md'), path.join(proj, 'sources', 'app-store-000.md'))
    fs.copyFileSync(path.join(ex, 'page-2.md'), path.join(proj, 'sources', 'google-play-com.example.quillo.md'))
    for (const f of ['messaging-house.md', 'voice-rules.md']) fs.writeFileSync(path.join(proj, f), '# earlier job\n')
    const req = path.join(proj, 'inputs', 'request-listing.md'), f = path.join(proj, 'store-listing.md')
    fs.writeFileSync(req, "Write our store-listing copy\nApp: Quillo, https://apps.apple.com/app/id000\nWhat's new: shared budgets, from December\nMarket: UK, English\nMessaging house: the messaging house you wrote\nVoice rules: the voice rules you wrote")
    const run = body => { fs.writeFileSync(f, body); return validate(f, { request: req, project: proj }) }
    const g = run(orig); t.push(['the template example passes', g.ok])
    t.push(['a subtitle over 30 characters is an error', run(orig.replace('One list for the whole house\n', 'One shared list for the whole house\n')).errors.some(e => /Subtitle: 35 characters/.test(e))])
    t.push(['a space after a keyword comma is an error', run(orig.replace('grocery,groceries,', 'grocery, groceries,')).errors.some(e => /space after a comma/.test(e))])
    t.push(['keywords are counted in bytes', run(orig.replace('grocery,groceries,family', 'épicerie,épiceries,famille,ménage,courses,rayon,hors-ligne,recettes,repas,planificateur,couples,colocataires')).errors.some(e => /Keywords: \d+ bytes/.test(e))])
    t.push(['a missing field is an error', run(orig.replace(/^### Short description[\s\S]*?(?=^### Full description)/m, '')).errors.some(e => /Short description/.test(e))])
    t.push(['a missing claims section is an error', run(orig.replace(/^## Claims to verify[\s\S]*?(?=^## Method)/m, '')).errors.some(e => /Claims to verify/.test(e))])
    t.push(['a Current that summarises the page is an error', run(orig.replace('- Current: "The ultimate list app"', '- Current: opens with "The ultimate list app" (rest summarised)')).errors.some(e => /Subtitle: Current is not the field's words/.test(e))])
    t.push(['a quoted Current that is not on the saved page is an error', run(orig.replace('- Current: "The ultimate list app"', '- Current: "The ultimate shopping app"')).errors.some(e => /Subtitle: Current is not word for word/.test(e))])
    t.push(['a claim whose Source is not on the page is an error', run(orig.replace('"see changes instantly" (App Store page)', '"changes sync in real time" (App Store page)')).errors.some(e => /claim 1: Source is not word for word/.test(e))])
    t.push(['an unsourced claim needs its Assumptions line', run(orig.replace('| "see changes instantly" (App Store page) |', '| none |')).errors.some(e => /Unsourced claims/.test(e))])
    fs.writeFileSync(path.join(proj, 'inputs', 'current-listing.md'), 'paraphrased: the ultimate shopping app')
    t.push(['a hand-written page in sources/ is refused', (() => { fs.copyFileSync(path.join(proj, 'inputs', 'current-listing.md'), path.join(proj, 'sources', 'notes.md')); const r = run(orig); fs.rmSync(path.join(proj, 'sources', 'notes.md')); return r.errors.some(e => /notes\.md: not an exact source/.test(e)) })()])
    fs.writeFileSync(req, 'Write our store-listing copy\nApp: Quillo')
    for (const x of ['messaging-house.md', 'voice-rules.md']) fs.rmSync(path.join(proj, x))
    t.push(['an input left out with no Assumptions line is an error', run(orig).errors.some(e => /"What is new"/.test(e))])
    const pageOk = (() => { const p = parse('<html><body><p>x</p></body></html>', 'https://example.com/'); return typeof render === 'function' && p.fields.length === 1 })()
    t.push(['page.mjs is beside this script', pageOk])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors, fields: g.fields })); process.exit(failed.length ? 1 : 0)
  }
  let reqFile = null, proj = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--request') reqFile = a[++i]; else if (a[i] === '--project') proj = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = validate(a[0], { request: reqFile, project: proj && fs.existsSync(proj) ? proj : null })
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
