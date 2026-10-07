#!/usr/bin/env node
// validate.mjs: completeness and wiring only (D40) for the voice rules, plus the stores' field limits
// for a rewrite of a store field (limits.mjs, the same count as the store listing). Never wording or
// quality: whether the traits are right is the person's check against the references.
//   node validate.mjs <artifacts/<app>/voice-rules.md> [--request <request.md>] [--project artifacts/<app>] [--copy <file|dir> …]
//   --selftest | --help
// Checks: every section filled; each trait headed "### <n>. X, not Y" with Means, Do and Don't lines;
// each of the six moments has a row with tone and example; each rewrite's "before" is quoted and found,
// word for word, in the exact words saved for this job: pages page.mjs saved (sources/), the request,
// attached files (SHORTCOMINGS №160); a rewrite of a store field fits that field's limit (№163); Use and
// Avoid lines; one Assumptions line per input the request left out; no [TBD]. The project folder is
// --project, else the deliverable's own folder. A --copy file that is none of those exact sources is
// refused. No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { check } from './inputs.mjs'
import { exactText, norm } from './page.mjs'
import { fieldOf, count } from './limits.mjs'

const HELP = 'usage: node validate.mjs <voice-rules.md> [--request <request.md>] [--project artifacts/<app>] [--copy <file|dir>] | --selftest\n  prints {"ok","traits":n,"rewrites":n,"sources":[…],"errors":[…]}'
const SECTIONS = ['Traits', 'Tone by moment', 'Rewrites', 'Words', 'Method', 'Assumptions']
export const MOMENTS = ['First open', 'Reminder', 'Error', 'Milestone', 'Store listing', 'Social']
const read = f => fs.readFileSync(f, 'utf8')
function sections (text) { const out = {}; for (const part of text.split(/^(?=##\s)/m)) { const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (m) out[m[1]] = part.slice(part.indexOf('\n') + 1).trim() } return out }
const table = s => (s || '').split('\n').filter(l => /^\|/.test(l)).slice(2).map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim()))
const unquote = s => /^["“](.*)["”]$/.exec(String(s).trim())?.[1]

// validate(file, { request, project, copy }): request is the saved request's path; project the project
// folder; copy any further files or folders holding the copy to rewrite
export function validate (file, { request = null, project = null, copy = [] } = {}) {
  const errors = [], text = read(file), sec = sections(text)
  const dir = project || path.dirname(file)
  const requestText = request && fs.existsSync(request) ? read(request) : null
  const cp = exactText([path.join(dir, 'sources'), path.join(dir, '..', 'attachments'), ...copy], { trusted: [request] })
  for (const r of cp.refused) errors.push(`copy: ${r}`)
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
  const rw = table(sec.Rewrites)
  if (!rw.length && cp.files.length) errors.push('Rewrites: no rows (copy was saved word for word: rewrite 3 to 6 of its lines)')
  if (!rw.length && !cp.files.length && !/^[-*]\s+\*\*(?:Copy to rewrite|Store page):\*\*/mi.test(sec.Assumptions || '')) errors.push('Rewrites: no rows and no copy saved word for word; say so under Assumptions ("- **Copy to rewrite:** …")')
  rw.forEach((r, i) => {
    const [n, where, before, after, trait] = r
    if (r.length < 5 || [n, where, before, after, trait].some(c => !c)) { errors.push(`rewrite ${i + 1}: a cell is empty`); return }
    const q = unquote(before)
    if (q == null) errors.push(`rewrite ${n}: the before line is not quoted ("…")`)
    else if (!cp.text.includes(norm(q))) errors.push(`rewrite ${n}: the before line is not word for word in the request, an attached file or a page page.mjs saved: "${q.slice(0, 80)}"`)
    const field = fieldOf(where)
    if (field) { const c = count(field, unquote(after) ?? after); if (c.over) errors.push(`rewrite ${n} (${where}): the after is ${c.length} ${c.unit}, over the ${c.field} limit of ${c.limit}`) }
  })
  for (const k of ['Use', 'Avoid']) if (!new RegExp(`^[-*]\\s+${k}:\\s*\\S`, 'm').test(sec.Words || '')) errors.push(`Words: no "- ${k}:" line`)
  if (requestText != null) for (const { label } of check(requestText, { project: fs.existsSync(dir) ? fs.readdirSync(dir) : [], attachments: fs.existsSync(path.join(dir, '..', 'attachments')) ? fs.readdirSync(path.join(dir, '..', 'attachments')).filter(f => !f.startsWith('.')) : [] }).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, traits: traits.length, rewrites: rw.length, sources: cp.files.map(f => path.basename(f)), errors }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples'), orig = read(path.join(ex, 'good-1.md'))
    // the example's project, as the machine holds it: the attached copy, the saved App Store page, the
    // messaging house from an earlier job and the saved request
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-voice-')), art = path.join(tmp, 'artifacts'), proj = path.join(art, 'quillo'), t = []
    fs.mkdirSync(path.join(proj, 'sources'), { recursive: true }); fs.mkdirSync(path.join(proj, 'inputs')); fs.mkdirSync(path.join(art, 'attachments'))
    fs.copyFileSync(path.join(ex, 'page-1.md'), path.join(proj, 'sources', 'app-store-000.md'))
    fs.copyFileSync(path.join(ex, 'copy-1.md'), path.join(art, 'attachments', 'copy-1.md'))
    fs.writeFileSync(path.join(proj, 'messaging-house.md'), '# earlier job\n')
    const req = path.join(proj, 'inputs', 'request-voice.md'), f = path.join(proj, 'voice-rules.md')
    fs.writeFileSync(req, 'Write our voice rules\nApp: Quillo, https://apps.apple.com/app/id000\nMessaging house: the messaging house you wrote')
    const run = (body, o = {}) => { fs.writeFileSync(f, body); return validate(f, { request: req, project: proj, ...o }) }
    const g = run(orig); t.push(['the template example passes', g.ok])
    t.push(['a before line not in the saved copy is an error', run(orig.replace('"Oops! Something went wrong. Please try again later."', '"Oops! Something broke."')).errors.some(e => /rewrite 3: the before line is not word for word/.test(e))])
    t.push(['a store-field rewrite over its limit is an error', run(orig.replace('| "One list for the whole house" |', '| "One shared shopping list for the whole house" |')).errors.some(e => /rewrite 1 \(App Store subtitle\): the after is 44 characters, over the Apple App Store: Subtitle limit of 30/.test(e))])
    t.push(['a trait with no "not" is an error', run(orig.replace('### 2. Calm, not flat', '### 2. Calm')).errors.some(e => /not "<n>. X, not Y"/.test(e))])
    t.push(['a missing moment is an error', run(orig.replace(/^\| Error \|.*\n/m, '')).errors.some(e => /"Error"/.test(e))])
    t.push(["a trait with no don't line is an error", run(orig.replace('- Don\'t: "Sync complete."', '')).errors.some(e => /no "- Don't:"/.test(e))])
    fs.writeFileSync(path.join(proj, 'inputs', 'copy.md'), 'Copy (paraphrased from the page): Quillo is a shopping list app')
    t.push(['a copy file the agent wrote is refused', run(orig, { copy: [path.join(proj, 'inputs', 'copy.md')] }).errors.some(e => /copy\.md: not an exact source/.test(e))])
    fs.rmSync(path.join(art, 'attachments', 'copy-1.md'))
    fs.writeFileSync(req, 'Write our voice rules\nApp: Quillo')
    t.push(['an input left out with no Assumptions line is an error', run(orig).errors.some(e => /"Copy to rewrite"/.test(e))])
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed, exampleErrors: g.errors })); process.exit(failed.length ? 1 : 0)
  }
  const copies = []; let reqFile = null, proj = null
  for (let i = 1; i < a.length; i++) { if (a[i] === '--copy') copies.push(a[++i]); else if (a[i] === '--request') reqFile = a[++i]; else if (a[i] === '--project') proj = a[++i] }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = validate(a[0], { request: reqFile, project: proj && fs.existsSync(proj) ? proj : null, copy: copies })
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
