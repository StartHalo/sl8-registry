#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic only (D40) for the sequence review. Never wording
// or quality: whether the findings are the right ones is the person's check against the references.
//   node validate.mjs <artifacts/<product>/sequence-review.md> --emails <file|dir> [--emails …] [--request <request.md>]
//   --selftest | --help
// Checks: every section; every finding row filled; each quoted line is found, word for word, in the
// emails reviewed; each rule names its source; each severity is blocker, major or minor; "Fix first"
// names up to three findings that exist; the counts add up to the findings; one Assumptions line per
// input the request left out; no [TBD]. No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'

const HELP = 'usage: node validate.mjs <sequence-review.md> --emails <file|dir> [--request <request.md>] | --selftest\n  prints {"ok","findings":n,"errors":[…]}'
const SECTIONS = ['Findings', 'What to keep', 'Verify outside the text', 'Fix first', 'Counts', 'Method', 'Assumptions']
const SEVERITY = ['blocker', 'major', 'minor']
const read = f => fs.readFileSync(f, 'utf8')
const norm = t => String(t).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#\d+;/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
export function emailText (paths) {
  const files = []
  for (const p of paths) { if (!fs.existsSync(p)) continue; if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p)) { if (/\.(md|txt|html?|eml)$/i.test(f)) files.push(path.join(p, f)) } else files.push(p) }
  return { files, text: norm(files.map(read).join('\n')) }
}

export function validate (reviewFile, emailPaths, requestText = null) {
  const errors = [], text = read(reviewFile), sec = sections(text)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  const rows = (sec.Findings || '').split('\n').filter(l => /^\|/.test(l)).slice(2).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim()))
  if (!rows.length) errors.push('findings: no rows')
  const em = emailText(emailPaths)
  if (!em.files.length) errors.push('no email files to check the quoted lines against (--emails)')
  const tally = { blocker: 0, major: 0, minor: 0 }, nums = []
  rows.forEach((r, i) => {
    const [n, email, line, problem, rule, sev, fix] = r
    if (r.length < 7 || r.slice(0, 7).some(c => !c)) { errors.push(`finding ${i + 1}: a cell is empty`); return }
    nums.push(+n)
    const q = /^["“](.*)["”]$/.exec(line)?.[1]
    if (q == null) errors.push(`finding ${n}: the line is not quoted ("…")`)
    else if (em.files.length && !em.text.includes(norm(q))) errors.push(`finding ${n}: the quoted line is not in the emails reviewed: "${q.slice(0, 80)}"`)
    if (!/\(.+\)/.test(rule)) errors.push(`finding ${n}: the rule names no source in brackets`)
    if (!SEVERITY.includes(sev.toLowerCase())) errors.push(`finding ${n}: severity "${sev}" is not blocker, major or minor`)
    else tally[sev.toLowerCase()]++
  })
  const first = ((sec['Fix first'] || '').match(/\d+/g) || []).map(Number)
  if (!first.length || first.length > 3) errors.push(`"Fix first" names ${first.length} findings: name one to three`)
  for (const f of first) if (!nums.includes(f)) errors.push(`"Fix first" names finding ${f}, which does not exist`)
  const c = /(\d+)\s*blockers?\W+(\d+)\s*majors?\W+(\d+)\s*minors?/i.exec(sec.Counts || '')
  if (!c) errors.push('"Counts" is not "<n> blocker, <n> major, <n> minor"')
  else if (+c[1] !== tally.blocker || +c[2] !== tally.major || +c[3] !== tally.minor) errors.push(`"Counts" says ${c[1]}/${c[2]}/${c[3]} but the findings are ${tally.blocker}/${tally.major}/${tally.minor} (blocker/major/minor)`)
  if (requestText != null) for (const { label } of check(requestText).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, findings: rows.length, errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples')
    const good = path.join(ex, 'good-1.md'), emails = [path.join(ex, 'emails-1.md')]
    const req = 'Review our email sequence\n' + read(emails[0]) + '\nGoal: trial users start a paid plan\nProduct: Tallyroom, https://tallyroom.example'
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c05-review-')), f = path.join(tmp, 'r.md'), orig = read(good)
    const t = []
    const g = validate(good, emails, req); t.push(['the template example passes', g.ok])
    fs.writeFileSync(f, orig.replace('"Did you know?"', '"Did you hear?"')); t.push(['a quoted line not in the emails is an error', validate(f, emails, req).errors.some(e => /finding 4: the quoted line/.test(e))])
    fs.writeFileSync(f, orig.replace('2 blocker, 2 major, 2 minor', '2 blocker, 3 major, 2 minor')); t.push(['counts that do not add up are an error', validate(f, emails, req).errors.some(e => /Counts/.test(e))])
    fs.writeFileSync(f, orig.replace('\n1, 3, 2\n', '\n1, 9\n')); t.push(['a fix-first number that does not exist is an error', validate(f, emails, req).errors.some(e => /finding 9/.test(e))])
    fs.writeFileSync(f, orig.replace(/^## What to keep[\s\S]*?(?=^## Verify)/m, '')); t.push(['a missing section is an error', validate(f, emails, req).errors.some(e => /What to keep/.test(e))])
    fs.writeFileSync(f, orig.replace('| minor | Sign as', '| low | Sign as')); t.push(['a severity outside the set is an error', validate(f, emails, req).errors.some(e => /severity "low"/.test(e))])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  const files = []; let reqFile = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--emails') files.push(a[++i]); else if (a[i] === '--request') reqFile = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = validate(a[0], files, reqFile && fs.existsSync(reqFile) ? read(reqFile) : null)
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
