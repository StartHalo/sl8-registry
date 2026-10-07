#!/usr/bin/env node
// validate.mjs: completeness and wiring only (D40) for the voice rules. Never wording or quality:
// whether the traits are right is the person's check against the references.
//   node validate.mjs <artifacts/<app>/voice-rules.md> --copy <file|dir> [--copy …] [--request <request.md>] [--project artifacts/<app>]
//   --selftest | --help
// Checks: every section filled; each trait headed "### <n>. X, not Y" with Means, Do and Don't lines;
// each of the six moments has a row with tone and example; each rewrite's "before" is quoted and found,
// word for word, in the copy saved for this job; Use and Avoid lines; one Assumptions line per input the
// request left out; no [TBD]. No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'

const HELP = 'usage: node validate.mjs <voice-rules.md> --copy <file|dir> [--request <request.md>] [--project artifacts/<app>] | --selftest\n  prints {"ok","traits":n,"rewrites":n,"errors":[…]}'
const SECTIONS = ['Traits', 'Tone by moment', 'Rewrites', 'Words', 'Method', 'Assumptions']
export const MOMENTS = ['First open', 'Reminder', 'Error', 'Milestone', 'Store listing', 'Social']
const read = f => fs.readFileSync(f, 'utf8')
const norm = t => String(t).replace(/<[^>]+>/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
const table = s => (s || '').split('\n').filter(l => /^\|/.test(l)).slice(2).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim()))
function copyText (paths) {
  const files = []
  for (const p of paths) { if (!fs.existsSync(p)) continue; if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p)) { if (/\.(md|txt|html?)$/i.test(f)) files.push(path.join(p, f)) } else files.push(p) }
  return { files, text: norm(files.map(read).join('\n')) }
}

export function validate (file, copyPaths, requestText = null, project = []) {
  const errors = [], text = read(file), sec = sections(text)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  const traits = (sec.Traits || '').split(/^(?=###\s)/m).filter(p => /^###\s/.test(p))
  if (!traits.length) errors.push('Traits: no "### " trait')
  traits.forEach((t, i) => {
    const head = t.split('\n')[0].replace(/^###\s+/, '')
    if (!/^\d+\.\s+.+,\s+not\s+\S/i.test(head)) errors.push(`trait ${i + 1}: heading "${head}" is not "<n>. X, not Y"`)
    for (const k of ['Means', 'Do', "Don't"]) if (!new RegExp(`^[-*]\\s+${k}:\\s*\\S`, 'm').test(t)) errors.push(`trait ${i + 1} (${head}): no "- ${k}:" line`)
  })
  const rows = table(sec['Tone by moment'])
  for (const m of MOMENTS) { const r = rows.find(r => norm(r[0]) === norm(m)); if (!r) errors.push(`Tone by moment: no row for "${m}"`); else if (r.length < 3 || r.slice(0, 3).some(c => !c)) errors.push(`Tone by moment: "${m}" has an empty cell`) }
  const rw = table(sec.Rewrites), cp = copyText(copyPaths)
  if (!rw.length) errors.push('Rewrites: no rows')
  if (rw.length && !cp.files.length) errors.push('no copy file to check the "before" lines against (--copy)')
  rw.forEach((r, i) => {
    const [n, where, before, after, trait] = r
    if (r.length < 5 || [n, where, before, after, trait].some(c => !c)) { errors.push(`rewrite ${i + 1}: a cell is empty`); return }
    const q = /^["“](.*)["”]$/.exec(before)?.[1]
    if (q == null) errors.push(`rewrite ${n}: the before line is not quoted ("…")`)
    else if (cp.files.length && !cp.text.includes(norm(q))) errors.push(`rewrite ${n}: the before line is not in the copy: "${q.slice(0, 80)}"`)
  })
  for (const k of ['Use', 'Avoid']) if (!new RegExp(`^[-*]\\s+${k}:\\s*\\S`, 'm').test(sec.Words || '')) errors.push(`Words: no "- ${k}:" line`)
  if (requestText != null) for (const { label } of check(requestText, { project }).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, traits: traits.length, rewrites: rw.length, errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples')
    const good = path.join(ex, 'good-1.md'), copy = [path.join(ex, 'copy-1.md')], orig = read(good)
    const req = 'Write our voice rules\nApp: Quillo, https://apps.apple.com/app/id000\nCopy: the store description\nMessaging house: attached'
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-voice-')), f = path.join(tmp, 'v.md'), t = []
    const g = validate(good, copy, req); t.push(['the template example passes', g.ok])
    fs.writeFileSync(f, orig.replace('"Oops! Something went wrong. Please try again later."', '"Oops! Something broke."')); t.push(['a before line not in the copy is an error', validate(f, copy, req).errors.some(e => /rewrite 2: the before line/.test(e))])
    fs.writeFileSync(f, orig.replace('### 2. Calm, not flat', '### 2. Calm')); t.push(['a trait with no "not" is an error', validate(f, copy, req).errors.some(e => /not "<n>. X, not Y"/.test(e))])
    fs.writeFileSync(f, orig.replace(/^\| Error \|.*\n/m, '')); t.push(['a missing moment is an error', validate(f, copy, req).errors.some(e => /"Error"/.test(e))])
    fs.writeFileSync(f, orig.replace('- Don\'t: "Sync complete."', '')); t.push(['a trait with no don\'t line is an error', validate(f, copy, req).errors.some(e => /no "- Don't:"/.test(e))])
    t.push(['an input left out with no Assumptions line is an error', validate(good, copy, 'Write our voice rules\nApp: Quillo').errors.some(e => /"Copy to rewrite"/.test(e))])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  const copies = []; let reqFile = null, proj = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--copy') copies.push(a[++i]); else if (a[i] === '--request') reqFile = a[++i]; else if (a[i] === '--project') proj = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const project = proj && fs.existsSync(proj) ? fs.readdirSync(proj) : []
  const r = validate(a[0], copies, reqFile && fs.existsSync(reqFile) ? read(reqFile) : null, project)
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
