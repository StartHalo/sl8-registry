#!/usr/bin/env node
// validate.mjs: completeness, wiring and the stores' own field limits for the store-listing copy.
// The limits are platform rules, counted (locked by khalid 2026-10-07 as an exception to D40); nothing
// here judges wording or quality, which is the person's check against the references.
//   node validate.mjs <artifacts/<app>/store-listing.md> [--request <request.md>] [--project artifacts/<app>]
//   --selftest | --help
// Checks: every field under "## Apple App Store" and "## Google Play" with Current, a fenced Proposed
// block and Reason; each proposed field within its limit (characters; Apple keywords in UTF-8 bytes);
// keywords comma-separated with no spaces after commas; the claims table; Method; one Assumptions line
// per input the request left out; no [TBD]. No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'

const HELP = 'usage: node validate.mjs <store-listing.md> [--request <request.md>] [--project artifacts/<app>] | --selftest\n  prints {"ok","fields":{name:{length,limit}},"errors":[…]}'
// Apple: App Store Connect Help (app information; platform version information). Google: Play Console Help answer/9859152.
export const FIELDS = {
  'Apple App Store': { Name: 30, Subtitle: 30, 'Promotional text': 170, Keywords: 100, Description: 4000 },
  'Google Play': { Title: 30, 'Short description': 80, 'Full description': 4000 },
}
const SECTIONS = ['Apple App Store', 'Google Play', 'Claims to verify', 'Method', 'Assumptions']
const read = f => fs.readFileSync(f, 'utf8')
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
function subsections (body) { const out = {}; for (const part of (body || '').split(/^(?=###\s)/m)) { const m = /^###\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1) } return out }
export const chars = s => [...s].length
export const bytes = s => Buffer.byteLength(s, 'utf8')

export function validate (file, requestText = null, project = []) {
  const errors = [], text = read(file), sec = sections(text), fields = {}
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  for (const [store, limits] of Object.entries(FIELDS)) {
    const sub = subsections(sec[store])
    for (const [field, limit] of Object.entries(limits)) {
      const body = sub[field]
      if (body == null) { errors.push(`${store}: no "### ${field}"`); continue }
      if (!/^[-*]\s+Current:\s*\S/m.test(body)) errors.push(`${store} ${field}: no "- Current:" line (write "(none)" when the field is empty)`)
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
  const claims = (sec['Claims to verify'] || '').split('\n').filter(l => /^\|/.test(l))
  if (claims.length < 2) errors.push('Claims to verify: no table (write one row per claim, or a row saying none was found)')
  if (requestText != null) for (const { label } of check(requestText, { project }).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, fields, errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const good = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples', 'good-1.md'), orig = read(good)
    const req = "Write our store-listing copy\nApp: Quillo, https://apps.apple.com/app/id000\nWhat's new: shared budgets, from December\nMarket: UK, English\nMessaging house: attached\nVoice rules: attached"
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-listing-')), f = path.join(tmp, 'l.md'), t = []
    const g = validate(good, req); t.push(['the template example passes', g.ok])
    fs.writeFileSync(f, orig.replace('One list for the whole house\n', 'One shared list for the whole house\n')); t.push(['a subtitle over 30 characters is an error', validate(f, req).errors.some(e => /Subtitle: 35 characters/.test(e))])
    fs.writeFileSync(f, orig.replace('grocery,groceries,', 'grocery, groceries,')); t.push(['a space after a keyword comma is an error', validate(f, req).errors.some(e => /space after a comma/.test(e))])
    fs.writeFileSync(f, orig.replace('grocery,groceries,family', 'épicerie,épiceries,famille,ménage,courses,rayon,hors-ligne,recettes,repas,planificateur,couples,colocataires')); t.push(['keywords are counted in bytes', validate(f, req).errors.some(e => /Keywords: \d+ bytes/.test(e))])
    fs.writeFileSync(f, orig.replace(/^### Short description[\s\S]*?(?=^### Full description)/m, '')); t.push(['a missing field is an error', validate(f, req).errors.some(e => /Short description/.test(e))])
    fs.writeFileSync(f, orig.replace(/^## Claims to verify[\s\S]*?(?=^## Method)/m, '')); t.push(['a missing claims section is an error', validate(f, req).errors.some(e => /Claims to verify/.test(e))])
    t.push(['an input left out with no Assumptions line is an error', validate(good, 'Write our store-listing copy\nApp: Quillo').errors.some(e => /"What is new"/.test(e))])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors, fields: g.fields })); process.exit(failed.length ? 1 : 0)
  }
  let reqFile = null, proj = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--request') reqFile = a[++i]; else if (a[i] === '--project') proj = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const project = proj && fs.existsSync(proj) ? fs.readdirSync(proj) : []
  const r = validate(a[0], reqFile && fs.existsSync(reqFile) ? read(reqFile) : null, project)
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
