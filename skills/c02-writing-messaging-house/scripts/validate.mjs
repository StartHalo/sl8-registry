#!/usr/bin/env node
// validate.mjs: completeness and wiring only (D40) for the messaging house. Never wording or quality:
// whether the promise is sharp is the person's check against the references.
//   node validate.mjs <artifacts/<app>/messaging-house.md> [--request <request.md>] [--project artifacts/<app>]
//   --selftest | --help
// Checks: every section filled; each pillar has its message and at least one proof point; every proof
// point ends (source: <where>, "<the words>") and those words are found, word for word, on a page
// page.mjs saved (sources/), in the request, an attached file or icp.md (SHORTCOMINGS №160, №161); the
// audience table has filled rows; one Assumptions line per input the request left out, and an assumed
// Competitors line that names rivals rather than none (№162); no [TBD]. The project folder is
// --project, else the deliverable's own folder.
// No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'
import { exactText, norm } from './page.mjs'

const HELP = 'usage: node validate.mjs <messaging-house.md> [--request <request.md>] [--project artifacts/<app>] | --selftest\n  prints {"ok","pillars":n,"errors":[…]}'
const SECTIONS = ['Brand promise', 'Pillars', 'By audience', 'Boilerplate', 'Method', 'Assumptions']
const SOURCE = /\(source:\s*([^"“]+?)\s*,\s*["“](.+)["”]\)\s*$/i
const read = f => fs.readFileSync(f, 'utf8')
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }

// validate(file, { request, project }): request is the saved request's path; project the project folder
export function validate (file, { request = null, project = null } = {}) {
  const errors = [], text = read(file), sec = sections(text)
  const dir = project || path.dirname(file)
  const requestText = request && fs.existsSync(request) ? read(request) : null
  const src = exactText([path.join(dir, 'sources'), path.join(dir, '..', 'attachments')], { trusted: [request, path.join(dir, 'icp.md')] })
  for (const r of src.refused) errors.push(`sources: ${r}`)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  const pillars = (sec.Pillars || '').split(/^(?=###\s)/m).filter(p => /^###\s/.test(p))
  if (!pillars.length) errors.push('Pillars: no "### " pillar')
  pillars.forEach((p, i) => {
    const name = p.split('\n')[0].replace(/^###\s+/, '')
    if (!/^[-*]\s+Message:\s*\S/m.test(p)) errors.push(`pillar ${i + 1} (${name}): no "- Message:" line`)
    const proofs = p.split('\n').filter(l => /^[-*]\s+Proof:/.test(l))
    if (!proofs.length) errors.push(`pillar ${i + 1} (${name}): no "- Proof:" line`)
    proofs.forEach((l, k) => {
      const m = SOURCE.exec(l)
      if (!m) errors.push(`pillar ${i + 1} proof ${k + 1}: does not end (source: <the App Store page | the Google Play page | the request | icp.md | <URL>>, "<the words there>")`)
      else if (!src.text.includes(norm(m[2]))) errors.push(`pillar ${i + 1} proof ${k + 1}: "${m[2].slice(0, 80)}" is not word for word on a page page.mjs saved, in the request or icp.md`)
    })
  })
  const rows = (sec['By audience'] || '').split('\n').filter(l => /^\|/.test(l)).slice(2).map(l => l.split('|').slice(1, -1).map(c => c.trim()))
  if (!rows.length) errors.push('By audience: no rows')
  rows.forEach((r, i) => { if (r.length < 2 || r.some(c => !c)) errors.push(`By audience row ${i + 1}: a cell is empty`) })
  if (requestText != null) {
    const assume = check(requestText, { project: fs.existsSync(dir) ? fs.readdirSync(dir) : [] }).assume
    for (const { label } of assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
    const comp = /^[-*]\s+\*\*Competitors:\*\*(.*)$/mi.exec(sec.Assumptions || '')?.[1] || ''
    if (assume.some(x => x.field === 'competitors') && /\bassumed (?:none|no (?:competitors?|rivals?))\b|\bnone (?:were|was|are|is) (?:needed|assumed)\b/i.test(comp)) errors.push('Assumptions: the Competitors line assumes no rival; name three from the store page\'s similar apps or its category (the card\'s default), for the swap test')
  }
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, pillars: pillars.length, sources: src.files.map(f => path.basename(f)), errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples'), orig = read(path.join(ex, 'good-1.md'))
    // the example's project, as the machine holds it: the App Store page page.mjs saved and the request
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-mh-')), proj = path.join(tmp, 'artifacts', 'quillo'), t = []
    fs.mkdirSync(path.join(proj, 'sources'), { recursive: true }); fs.mkdirSync(path.join(proj, 'inputs'))
    fs.copyFileSync(path.join(ex, 'page-1.md'), path.join(proj, 'sources', 'app-store-000.md'))
    const req = path.join(proj, 'inputs', 'request-messaging.md'), f = path.join(proj, 'messaging-house.md')
    const full = 'Write our messaging house\nApp: Quillo, https://apps.apple.com/app/id000\nPositioning: for households who shop together\nAudiences: couples, house-shares, parents\nProof: 1M lists shared'
    fs.writeFileSync(req, full)
    const run = body => { fs.writeFileSync(f, body); return validate(f, { request: req, project: proj }) }
    const g = run(orig); t.push(['the template example passes', g.ok])
    t.push(['a proof point with no source is an error', run(orig.replace(' (source: the request, "1M lists shared")', '')).errors.some(e => /does not end \(source:/.test(e))])
    t.push(['a proof whose words are not on the saved page is an error', run(orig.replace('"Smart lists that sort themselves by aisle"', '"Lists that sort by aisle in every shop"')).errors.some(e => /is not word for word/.test(e))])
    t.push(['a missing part is an error', run(orig.replace(/^## Boilerplate[\s\S]*?(?=^## Method)/m, '')).errors.some(e => /Boilerplate/.test(e))])
    t.push(['a pillar with no message is an error', run(orig.replace('- Message: No signal', '- Note: No signal')).errors.some(e => /no "- Message:"/.test(e))])
    t.push(['an assumed Competitors line that assumes none is an error', run(orig.replace(/^- \*\*Competitors:\*\*.*$/m, '- **Competitors:** not given. Assumed none were needed.')).errors.some(e => /assumes no rival/.test(e))])
    fs.writeFileSync(path.join(proj, 'sources', 'notes.md'), 'paraphrased: lists sort by aisle')
    t.push(['a hand-written file in sources/ is refused', run(orig).errors.some(e => /notes\.md: not an exact source/.test(e))])
    fs.rmSync(path.join(proj, 'sources', 'notes.md'))
    fs.writeFileSync(req, 'Write our messaging house\nApp: Quillo')
    t.push(['an input left out with no Assumptions line is an error', run(orig).errors.some(e => /"Positioning"/.test(e))])
    fs.writeFileSync(req, full.replace(/Positioning:.*\n/, '')); fs.writeFileSync(path.join(proj, 'icp.md'), '# ICP\n')
    t.push(['icp.md in the project counts as positioning given', !run(orig).errors.some(e => /Positioning/.test(e))])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  let reqFile = null, proj = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--request') reqFile = a[++i]; else if (a[i] === '--project') proj = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = validate(a[0], { request: reqFile, project: proj && fs.existsSync(proj) ? proj : null })
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
