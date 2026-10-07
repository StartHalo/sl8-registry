#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic only (D40) for the email sequence pack. Never
// lengths or wording: those are the person's check against the references.
//   node validate.mjs <artifacts/<product>/sequence.md> --request <request.md>   |  --selftest  |  --help
// Checks: every header field, storyboard row and email part; one email per storyboard row; build.mjs
// ran (emails/ has each HTML and text file); HTML and text carry the same links; links to the product's
// site carry UTM tags; each footer has the unsubscribe and postal-address merge tags (or the address);
// each HTML under Gmail's 102 KB clip; the setup sheet names what adds the footer; one Assumptions line
// per input the request left out; no [TBD]. No prompts; JSON on stdout; exit 1 on any error; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { TOKENS, PURPOSES, EMAIL_FIELDS, GMAIL_CLIP, read, sections, parseEmails, storyboard, link, links, host, isDirect } from './lib.mjs'
import { check } from './inputs.mjs'
import { build } from './build.mjs'

const HELP = 'usage: node validate.mjs <sequence.md> --request <request.md> | --selftest\n  prints {"ok","errors":[…],"emails":n}'
const HEADER = ['Product', 'Goal', 'Who receives it', 'Sender', 'Postal address', 'Email tool']
const SECTIONS = ['Storyboard', 'Setup sheet', 'Send checklist', 'How to tell it worked', 'Method', 'Assumptions']

export function validate (seqFile, requestText) {
  const errors = [], text = read(seqFile), dir = path.dirname(seqFile), sec = sections(text)
  const top = text.split(/^##\s/m)[0]
  for (const h of HEADER) if (!new RegExp(`^[-*]\\s+${h}:\\s*\\S`, 'mi').test(top)) errors.push(`header: "- ${h}:" is missing or empty`)
  for (const s of SECTIONS) if (!(sec[s] || '').trim()) errors.push(`section "## ${s}" is missing or empty`)
  if (!/^Exit:\s*\S/m.test(sec.Storyboard || '')) errors.push('storyboard: no "Exit:" line (when a person leaves the sequence)')
  const rows = storyboard(text), emails = parseEmails(text)
  rows.forEach((r, i) => { if (r.length < 5 || r.some(c => !c)) errors.push(`storyboard row ${i + 1}: a cell is empty`); else if (!PURPOSES.includes(r[1])) errors.push(`storyboard row ${i + 1}: purpose "${r[1]}" is not one of ${PURPOSES.join(', ')}`) })
  if (!rows.length) errors.push('storyboard: no rows')
  if (rows.length !== emails.length) errors.push(`storyboard has ${rows.length} rows but there are ${emails.length} "## Email" sections`)
  emails.forEach((e, i) => {
    if (e.n !== i + 1) errors.push(`email ${e.n}: numbered out of order (expected ${i + 1})`)
    for (const f of EMAIL_FIELDS) if (!e.fields[f]) errors.push(`email ${e.n}: "- ${f}:" is missing or empty`)
    if (e.fields.Purpose && !PURPOSES.includes(e.fields.Purpose)) errors.push(`email ${e.n}: purpose "${e.fields.Purpose}" is not one of ${PURPOSES.join(', ')}`)
    if (e.fields['Call to action'] && !/^https:\/\//.test(link(e.fields['Call to action'])?.url || '')) errors.push(`email ${e.n}: the call to action is not a [text](https://…) link`)
    if (!e.body) errors.push(`email ${e.n}: "### Body" is missing or empty`)
  })
  // wiring: build.mjs ran and its files match the emails
  const bj = path.join(dir, 'emails', 'build.json')
  if (!fs.existsSync(bj)) errors.push('emails/build.json is missing: run build.mjs')
  else {
    const b = JSON.parse(read(bj))
    if (b.emails.length !== emails.length) errors.push(`emails/ has ${b.emails.length} built emails but sequence.md has ${emails.length}: rerun build.mjs`)
    for (const e of b.emails) {
      const hf = path.join(dir, e.html), tf = path.join(dir, e.text)
      if (!fs.existsSync(hf) || !fs.existsSync(tf)) { errors.push(`email ${e.n}: ${e.html} or ${e.text} is missing: rerun build.mjs`); continue }
      const html = read(hf), txt = read(tf)
      const strip = arr => [...new Set(arr.filter(u => !u.includes('{{')))].sort()
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'))
      const hl = strip(hrefs), tl = strip(links(txt))
      if (JSON.stringify(hl) !== JSON.stringify(tl)) errors.push(`email ${e.n}: the HTML and text versions carry different links`)
      for (const u of hl) if (b.site && host(u) && (host(u) === b.site || host(u).endsWith('.' + b.site)) && !/utm_campaign=/.test(u)) errors.push(`email ${e.n}: link ${u} has no UTM tags`)
      if (!html.includes(TOKENS.unsub) || !txt.includes(TOKENS.unsub)) errors.push(`email ${e.n}: the footer has no ${TOKENS.unsub}`)
      if (Buffer.byteLength(html) >= GMAIL_CLIP) errors.push(`email ${e.n}: the HTML is ${Buffer.byteLength(html)} bytes, over Gmail's 102 KB clip`)
      if (html.includes('%%')) errors.push(`email ${e.n}: a template slot was left unfilled`)
    }
  }
  const setup = (sec['Setup sheet'] || '').toLowerCase()
  if (!/unsubscribe/.test(setup) || !/address/.test(setup)) errors.push('setup sheet: does not say what adds the unsubscribe link and the postal address')
  // completeness of the assumptions: one line per input the request left out
  if (requestText != null) for (const { label } of check(requestText).assume) if (!new RegExp(`^[-*]\\s+\\*\\*${label}:\\*\\*`, 'mi').test(sec.Assumptions || '')) errors.push(`Assumptions: no line for "${label}" (the request left it out)`)
  if (/\[TBD\]/i.test(text)) errors.push('a [TBD] is left: state it as an assumption instead')
  return { ok: !errors.length, emails: emails.length, errors }
}

if (isDirect(import.meta.url)) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples', 'good-1.md')
    const req = 'Write our email sequence\nProduct: Fernway, https://fernway.example\nGoal: trial users start a paid plan\nWho receives it: new trial users\nSender: Dana, founder'
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c05-validate-')), f = path.join(tmp, 'fernway', 'sequence.md')
    fs.mkdirSync(path.dirname(f)); fs.copyFileSync(ex, f)
    const t = (name, ok) => ({ name, ok })
    const res = []
    res.push(t('before build.mjs runs, the missing emails/ is an error', validate(f, req).errors.some(e => /build\.json/.test(e))))
    build(f)
    const good = validate(f, req); res.push(t('the template example passes once built', good.ok))
    const orig = read(f)
    fs.writeFileSync(f, orig.replace('- Subject: Answer your next customer from Fernway\n', '')); build(f)
    res.push(t('a missing part (email 2 subject) is an error', validate(f, req).errors.some(e => /email 2: "- Subject:"/.test(e))))
    fs.writeFileSync(f, orig.replace(/^- \*\*Email tool:\*\*.*\n/m, '')); build(f)
    res.push(t('a missing Assumptions line is an error', validate(f, req).errors.some(e => /Email tool/.test(e))))
    fs.writeFileSync(f, orig.replace('| 5 | Action | The trial ends soon: what you keep on a paid plan | +4 days | Choose a plan |\n', '')); build(f)
    res.push(t('storyboard rows that do not add up to the emails are an error', validate(f, req).errors.some(e => /4 rows but there are 5/.test(e))))
    fs.writeFileSync(f, orig); build(f); fs.appendFileSync(path.join(tmp, 'fernway', 'emails', '01-connect-your-inbox.txt'), '\nhttps://elsewhere.example/x\n')
    res.push(t('HTML and text with different links are an error', validate(f, req).errors.some(e => /different links/.test(e))))
    fs.rmSync(tmp, { recursive: true, force: true })
    const failed = res.filter(r => !r.ok)
    console.log(JSON.stringify({ ok: !failed.length, cases: res.length, failed, exampleErrors: good.errors })); process.exit(failed.length ? 1 : 0)
  }
  const i = a.indexOf('--request'), reqFile = i > -1 ? a[i + 1] : null
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = validate(a[0], reqFile && fs.existsSync(reqFile) ? read(reqFile) : null)
  if (!reqFile) r.warnings = ['no --request given: the Assumptions lines were not checked']
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
