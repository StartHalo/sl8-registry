#!/usr/bin/env node
// validate.mjs: completeness and wiring only (D40) for the messaging house. Never wording or quality:
// whether the promise is sharp is the person's check against the references.
//   node validate.mjs <artifacts/<app>/messaging-house.md> [--request <request.md>] [--project artifacts/<app>]
//   --selftest | --help
// Checks: every section filled; each pillar has its message and at least one proof point; every proof
// point names its source (the request, the store page, icp.md or a page's URL); the audience table has
// filled rows; one Assumptions line per input the request left out; no [TBD].
// No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'

const HELP = 'usage: node validate.mjs <messaging-house.md> [--request <request.md>] [--project artifacts/<app>] | --selftest\n  prints {"ok","pillars":n,"errors":[…]}'
const SECTIONS = ['Brand promise', 'Pillars', 'By audience', 'Boilerplate', 'Method', 'Assumptions']
const SOURCE = /\(source:\s*(the request|(?:the )?(?:app store|google play|store) page|icp\.md|https?:\/\/\S+)[^)]*\)\s*$/i
const read = f => fs.readFileSync(f, 'utf8')
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }

export function validate (file, requestText = null, project = []) {
  const errors = [], text = read(file), sec = sections(text)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  const pillars = (sec.Pillars || '').split(/^(?=###\s)/m).filter(p => /^###\s/.test(p))
  if (!pillars.length) errors.push('Pillars: no "### " pillar')
  pillars.forEach((p, i) => {
    const name = p.split('\n')[0].replace(/^###\s+/, '')
    if (!/^[-*]\s+Message:\s*\S/m.test(p)) errors.push(`pillar ${i + 1} (${name}): no "- Message:" line`)
    const proofs = p.split('\n').filter(l => /^[-*]\s+Proof:/.test(l))
    if (!proofs.length) errors.push(`pillar ${i + 1} (${name}): no "- Proof:" line`)
    proofs.forEach((l, k) => { if (!SOURCE.test(l)) errors.push(`pillar ${i + 1} proof ${k + 1}: names no source "(source: the request | the store page | icp.md | <URL>)"`) })
  })
  const rows = (sec['By audience'] || '').split('\n').filter(l => /^\|/.test(l)).slice(2).map(l => l.split('|').slice(1, -1).map(c => c.trim()))
  if (!rows.length) errors.push('By audience: no rows')
  rows.forEach((r, i) => { if (r.length < 2 || r.some(c => !c)) errors.push(`By audience row ${i + 1}: a cell is empty`) })
  if (requestText != null) for (const { label } of check(requestText, { project }).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, pillars: pillars.length, errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const good = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples', 'good-1.md'), orig = read(good)
    const req = 'Write our messaging house\nApp: Quillo, https://apps.apple.com/app/id000\nPositioning: for households who shop together\nAudiences: couples, house-shares, parents\nProof: 1M lists shared'
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-mh-')), f = path.join(tmp, 'm.md'), t = []
    const g = validate(good, req); t.push(['the template example passes', g.ok])
    fs.writeFileSync(f, orig.replace('(source: the request)', '')); t.push(['a proof point with no source is an error', validate(f, req).errors.some(e => /names no source/.test(e))])
    fs.writeFileSync(f, orig.replace(/^## Boilerplate[\s\S]*?(?=^## Method)/m, '')); t.push(['a missing part is an error', validate(f, req).errors.some(e => /Boilerplate/.test(e))])
    fs.writeFileSync(f, orig.replace('- Message: No signal', '- Note: No signal')); t.push(['a pillar with no message is an error', validate(f, req).errors.some(e => /no "- Message:"/.test(e))])
    t.push(['an input left out with no Assumptions line is an error', validate(good, 'Write our messaging house\nApp: Quillo').errors.some(e => /"Positioning"/.test(e))])
    t.push(['icp.md in the project counts as positioning given', !validate(good, req.replace(/Positioning:.*\n/, ''), ['icp.md']).errors.some(e => /Positioning/.test(e))])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  let reqFile = null, proj = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--request') reqFile = a[++i]; else if (a[i] === '--project') proj = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const project = proj && fs.existsSync(proj) ? fs.readdirSync(proj) : []
  const r = validate(a[0], reqFile && fs.existsSync(reqFile) ? read(reqFile) : null, project)
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
