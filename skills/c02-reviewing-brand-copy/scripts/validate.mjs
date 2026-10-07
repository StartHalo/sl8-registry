#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic only (D40) for the brand copy review, plus the
// stores' field limits for a fix to a store field (limits.mjs, the same count as the store listing).
// Never wording or quality: whether the findings are the right ones is the person's check against the
// references.
//   node validate.mjs <artifacts/<app>/brand-review.md> [--request <request.md>] [--project artifacts/<app>] [--material <file|dir> …]
//   --selftest | --help
// Checks: every section; every finding row filled; each quoted line is found, word for word, in the
// material saved for this job: pages page.mjs saved (sources/), text pasted in the request, attached
// files, or the project's store-listing.md when given with --material ("the listing you wrote")
// (SHORTCOMINGS №160); a fix to a store field fits its limit; each rule names its source; each severity
// is high, medium or low; the swap, hand and field tests each have a line; "Fix first" names one to
// three findings that exist; the counts add up to the findings; the claims table; one Assumptions line
// per input the request left out; no [TBD]. The project folder is --project, else the deliverable's
// own folder. A --material file that is none of those is refused.
// No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'
import { exactText, norm } from './page.mjs'
import { fieldOf, count } from './limits.mjs'

const HELP = 'usage: node validate.mjs <brand-review.md> [--request <request.md>] [--project artifacts/<app>] [--material <file|dir>] | --selftest\n  prints {"ok","findings":n,"material":[…],"errors":[…]}'
const SECTIONS = ['Findings', 'Tests on the whole', 'Fix first', 'Counts', 'Claims to verify', 'Method', 'Assumptions']
const SEVERITY = ['high', 'medium', 'low']
const read = f => fs.readFileSync(f, 'utf8')
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
const lastQuoted = s => { const all = [...String(s).matchAll(/["“]([^"“”]+)["”]/g)]; return all.length ? all[all.length - 1][1] : null }

// validate(file, { request, project, material }): request is the saved request's path; project the
// project folder; material any further files or folders holding the copy reviewed
export function validate (file, { request = null, project = null, material = [] } = {}) {
  const errors = [], text = read(file), sec = sections(text)
  const dir = project || path.dirname(file)
  const requestText = request && fs.existsSync(request) ? read(request) : null
  const listing = material.filter(p => fs.existsSync(p) && fs.statSync(p).isFile() && path.basename(p) === 'store-listing.md')
  const mt = exactText([path.join(dir, 'sources'), path.join(dir, '..', 'attachments'), ...material], { trusted: [request, ...listing] })
  for (const r of mt.refused) errors.push(`material: ${r}`)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  const rows = (sec.Findings || '').split('\n').filter(l => /^\|/.test(l)).slice(2).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim()))
  if (!rows.length) errors.push('findings: no rows')
  if (!mt.files.length) errors.push('no material saved word for word to check the quoted lines against (a page page.mjs saved, the request, an attached file, or --material store-listing.md)')
  const tally = { high: 0, medium: 0, low: 0 }, nums = []
  rows.forEach((r, i) => {
    const [n, where, line, problem, rule, sev, fix] = r
    if (r.length < 7 || r.slice(0, 7).some(c => !c)) { errors.push(`finding ${i + 1}: a cell is empty`); return }
    nums.push(+n)
    const q = /^["“](.*)["”]$/.exec(line)?.[1]
    if (q == null) errors.push(`finding ${n}: the line is not quoted ("…")`)
    else if (mt.files.length && !mt.text.includes(norm(q))) errors.push(`finding ${n}: the quoted line is not word for word in the material saved for this job: "${q.slice(0, 80)}"`)
    if (!/\(.+\)/.test(rule)) errors.push(`finding ${n}: the rule names no source in brackets`)
    if (!SEVERITY.includes(sev.toLowerCase())) errors.push(`finding ${n}: severity "${sev}" is not high, medium or low`)
    else tally[sev.toLowerCase()]++
    const field = fieldOf(where)
    if (field) { const c = count(field, lastQuoted(fix) ?? fix); if (c.over) errors.push(`finding ${n} (${where}): the fix is ${c.length} ${c.unit}, over the ${c.field} limit of ${c.limit}`) }
  })
  for (const t of ['Swap', 'Hand', 'Field']) if (!new RegExp(`^[-*]\\s+\\*\\*${t}:\\*\\*\\s*\\S`, 'm').test(sec['Tests on the whole'] || '')) errors.push(`Tests on the whole: no "- **${t}:**" line`)
  const first = ((sec['Fix first'] || '').match(/\d+/g) || []).map(Number)
  if (!first.length || first.length > 3) errors.push(`"Fix first" names ${first.length} findings: name one to three`)
  for (const f of first) if (!nums.includes(f)) errors.push(`"Fix first" names finding ${f}, which does not exist`)
  const c = /(\d+)\s*high\W+(\d+)\s*medium\W+(\d+)\s*low/i.exec(sec.Counts || '')
  if (!c) errors.push('"Counts" is not "<n> high, <n> medium, <n> low"')
  else if (+c[1] !== tally.high || +c[2] !== tally.medium || +c[3] !== tally.low) errors.push(`"Counts" says ${c[1]}/${c[2]}/${c[3]} but the findings are ${tally.high}/${tally.medium}/${tally.low} (high/medium/low)`)
  if ((sec['Claims to verify'] || '').split('\n').filter(l => /^\|/.test(l)).length < 2) errors.push('Claims to verify: no table (write one row per claim, or a row saying none was found)')
  if (requestText != null) for (const { label } of check(requestText, { project: fs.existsSync(dir) ? fs.readdirSync(dir) : [], attachments: fs.existsSync(path.join(dir, '..', 'attachments')) ? fs.readdirSync(path.join(dir, '..', 'attachments')).filter(f => !f.startsWith('.')) : [] }).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, findings: rows.length, material: mt.files.map(f => path.basename(f)), errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples'), orig = read(path.join(ex, 'good-1.md'))
    // the example's project, as the machine holds it: the material pasted in the saved request, and the
    // voice rules from an earlier job
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-review-')), proj = path.join(tmp, 'artifacts', 'quillo'), t = []
    fs.mkdirSync(path.join(proj, 'inputs'), { recursive: true })
    fs.writeFileSync(path.join(proj, 'voice-rules.md'), '# earlier job\n')
    const req = path.join(proj, 'inputs', 'request-review.md'), f = path.join(proj, 'brand-review.md')
    const full = `Review our brand copy\nApp: Quillo\nBrand rules: the voice rules you wrote\nMaterial: our App Store description, pasted below\n\n${read(path.join(ex, 'material-1.md')).split('\n').slice(2).join('\n')}`
    fs.writeFileSync(req, full)
    const run = (body, o = {}) => { fs.writeFileSync(f, body); return validate(f, { request: req, project: proj, ...o }) }
    const g = run(orig); t.push(['the template example passes', g.ok])
    t.push(['a quoted line not in the material is an error', run(orig.replace('| "Never forget anything again." |', '| "Never forget a thing." |')).errors.some(e => /finding 2: the quoted line is not word for word/.test(e))])
    t.push(['a fix to a store field over its limit is an error', run(orig.replace('| 1 | Description, first line |', '| 1 | App Store subtitle |')).errors.some(e => /finding 1 \(App Store subtitle\): the fix is \d+ characters, over the Apple App Store: Subtitle limit of 30/.test(e))])
    t.push(['counts that do not add up are an error', run(orig.replace('1 high, 2 medium, 1 low', '1 high, 3 medium, 1 low')).errors.some(e => /Counts/.test(e))])
    t.push(['a fix-first number that does not exist is an error', run(orig.replace('\n1, 2, 3\n', '\n1, 9\n')).errors.some(e => /finding 9/.test(e))])
    t.push(['a missing test is an error', run(orig.replace(/^- \*\*Field:\*\*.*\n/m, '')).errors.some(e => /Field/.test(e))])
    t.push(['a severity outside the set is an error', run(orig.replace('| low | "That', '| minor | "That')).errors.some(e => /severity "minor"/.test(e))])
    fs.writeFileSync(path.join(proj, 'inputs', 'material.md'), 'Summary of the page: Quillo is the ultimate revolutionary shopping list app')
    t.push(['a material file the agent wrote is refused', run(orig, { material: [path.join(proj, 'inputs', 'material.md')] }).errors.some(e => /material\.md: not an exact source/.test(e))])
    fs.writeFileSync(path.join(proj, 'store-listing.md'), read(path.join(ex, 'material-1.md')))
    fs.writeFileSync(req, 'Review our brand copy\nApp: Quillo\nBrand rules: the voice rules you wrote\nMaterial: the listing you wrote')
    t.push(['"the listing you wrote" is checked against store-listing.md', run(orig, { material: [path.join(proj, 'store-listing.md')] }).ok])
    fs.rmSync(path.join(proj, 'voice-rules.md'))
    fs.writeFileSync(req, 'Review our brand copy\nMaterial: pasted\nQuillo is the ultimate revolutionary shopping list app that will totally change the way you shop forever!!')
    t.push(['an input left out with no Assumptions line is an error', run(orig).errors.some(e => /"Brand rules"/.test(e))])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  const mats = []; let reqFile = null, proj = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--material') mats.push(a[++i]); else if (a[i] === '--request') reqFile = a[++i]; else if (a[i] === '--project') proj = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = validate(a[0], { request: reqFile, project: proj && fs.existsSync(proj) ? proj : null, material: mats })
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
