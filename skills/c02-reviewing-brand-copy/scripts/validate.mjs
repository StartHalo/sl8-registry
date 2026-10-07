#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic only (D40) for the brand copy review. Never wording
// or quality: whether the findings are the right ones is the person's check against the references.
//   node validate.mjs <artifacts/<app>/brand-review.md> --material <file|dir> [--material …] [--request <request.md>] [--project artifacts/<app>]
//   --selftest | --help
// Checks: every section; every finding row filled; each quoted line is found, word for word, in the
// material saved for this job; each rule names its source; each severity is high, medium or low; the
// swap, hand and field tests each have a line; "Fix first" names one to three findings that exist; the
// counts add up to the findings; the claims table; one Assumptions line per input the request left out;
// no [TBD]. No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'

const HELP = 'usage: node validate.mjs <brand-review.md> --material <file|dir> [--request <request.md>] [--project artifacts/<app>] | --selftest\n  prints {"ok","findings":n,"errors":[…]}'
const SECTIONS = ['Findings', 'Tests on the whole', 'Fix first', 'Counts', 'Claims to verify', 'Method', 'Assumptions']
const SEVERITY = ['high', 'medium', 'low']
const read = f => fs.readFileSync(f, 'utf8')
const norm = t => String(t).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#\d+;/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
export function materialText (paths) {
  const files = []
  for (const p of paths) { if (!fs.existsSync(p)) continue; if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p)) { if (/\.(md|txt|html?|eml)$/i.test(f)) files.push(path.join(p, f)) } else files.push(p) }
  return { files, text: norm(files.map(read).join('\n')) }
}

export function validate (file, materialPaths, requestText = null, project = []) {
  const errors = [], text = read(file), sec = sections(text)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  const rows = (sec.Findings || '').split('\n').filter(l => /^\|/.test(l)).slice(2).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim()))
  if (!rows.length) errors.push('findings: no rows')
  const mt = materialText(materialPaths)
  if (!mt.files.length) errors.push('no material file to check the quoted lines against (--material)')
  const tally = { high: 0, medium: 0, low: 0 }, nums = []
  rows.forEach((r, i) => {
    const [n, where, line, problem, rule, sev, fix] = r
    if (r.length < 7 || r.slice(0, 7).some(c => !c)) { errors.push(`finding ${i + 1}: a cell is empty`); return }
    nums.push(+n)
    const q = /^["“](.*)["”]$/.exec(line)?.[1]
    if (q == null) errors.push(`finding ${n}: the line is not quoted ("…")`)
    else if (mt.files.length && !mt.text.includes(norm(q))) errors.push(`finding ${n}: the quoted line is not in the material: "${q.slice(0, 80)}"`)
    if (!/\(.+\)/.test(rule)) errors.push(`finding ${n}: the rule names no source in brackets`)
    if (!SEVERITY.includes(sev.toLowerCase())) errors.push(`finding ${n}: severity "${sev}" is not high, medium or low`)
    else tally[sev.toLowerCase()]++
  })
  for (const t of ['Swap', 'Hand', 'Field']) if (!new RegExp(`^[-*]\\s+\\*\\*${t}:\\*\\*\\s*\\S`, 'm').test(sec['Tests on the whole'] || '')) errors.push(`Tests on the whole: no "- **${t}:**" line`)
  const first = ((sec['Fix first'] || '').match(/\d+/g) || []).map(Number)
  if (!first.length || first.length > 3) errors.push(`"Fix first" names ${first.length} findings: name one to three`)
  for (const f of first) if (!nums.includes(f)) errors.push(`"Fix first" names finding ${f}, which does not exist`)
  const c = /(\d+)\s*high\W+(\d+)\s*medium\W+(\d+)\s*low/i.exec(sec.Counts || '')
  if (!c) errors.push('"Counts" is not "<n> high, <n> medium, <n> low"')
  else if (+c[1] !== tally.high || +c[2] !== tally.medium || +c[3] !== tally.low) errors.push(`"Counts" says ${c[1]}/${c[2]}/${c[3]} but the findings are ${tally.high}/${tally.medium}/${tally.low} (high/medium/low)`)
  if ((sec['Claims to verify'] || '').split('\n').filter(l => /^\|/.test(l)).length < 2) errors.push('Claims to verify: no table (write one row per claim, or a row saying none was found)')
  if (requestText != null) for (const { label } of check(requestText, { project }).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, findings: rows.length, errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples')
    const good = path.join(ex, 'good-1.md'), mat = [path.join(ex, 'material-1.md')], orig = read(good)
    const req = 'Review our brand copy\nMaterial: our App Store description (pasted)\nBrand rules: the voice rules you wrote\nApp: Quillo'
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-review-')), f = path.join(tmp, 'r.md'), t = []
    const g = validate(good, mat, req); t.push(['the template example passes', g.ok])
    fs.writeFileSync(f, orig.replace('| "Never forget anything again." |', '| "Never forget a thing." |')); t.push(['a quoted line not in the material is an error', validate(f, mat, req).errors.some(e => /finding 2: the quoted line/.test(e))])
    fs.writeFileSync(f, orig.replace('1 high, 2 medium, 1 low', '1 high, 3 medium, 1 low')); t.push(['counts that do not add up are an error', validate(f, mat, req).errors.some(e => /Counts/.test(e))])
    fs.writeFileSync(f, orig.replace('\n1, 2, 3\n', '\n1, 9\n')); t.push(['a fix-first number that does not exist is an error', validate(f, mat, req).errors.some(e => /finding 9/.test(e))])
    fs.writeFileSync(f, orig.replace(/^- \*\*Field:\*\*.*\n/m, '')); t.push(['a missing test is an error', validate(f, mat, req).errors.some(e => /Field/.test(e))])
    fs.writeFileSync(f, orig.replace('| low | "That', '| minor | "That')); t.push(['a severity outside the set is an error', validate(f, mat, req).errors.some(e => /severity "minor"/.test(e))])
    t.push(['an input left out with no Assumptions line is an error', validate(good, mat, 'Review our brand copy\nMaterial: pasted').errors.some(e => /"Brand rules"/.test(e))])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  const mats = []; let reqFile = null, proj = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--material') mats.push(a[++i]); else if (a[i] === '--request') reqFile = a[++i]; else if (a[i] === '--project') proj = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const project = proj && fs.existsSync(proj) ? fs.readdirSync(proj) : []
  const r = validate(a[0], mats, reqFile && fs.existsSync(reqFile) ? read(reqFile) : null, project)
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
