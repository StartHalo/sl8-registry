#!/usr/bin/env node
// Turn the founder's own contact list into one import file per segment. It never finds, buys or
// invents contacts; it only reshapes the list it is given. Output columns: email,first_name,company,segment.
//
//   contacts.mjs split <campaign> <list.csv> --map "email=<col>,first_name=<col>,company=<col>"
//        [--segment <name>]                                   every row into one segment
//        [--segment-col <col> --segments "<value>=<segment>,…"] rows split by a column's value; others are left out
//        [--exclude-col <col> --exclude "<value>,<value>"]    suppressed rows (customers, unsubscribed …)
//   contacts.mjs template <campaign> --segments "<segment>,<segment>"   empty files with the right columns
//
// Prints counts as JSON. Rows without a valid email and repeated emails are skipped and counted.
import fs from 'node:fs'
import path from 'node:path'
import { fail, args, campaignDir, slugify } from './lib.mjs'

const a = args(process.argv.slice(2))
const [cmd, campaign, input] = a._
const HEAD = ['email', 'first_name', 'company', 'segment']
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i

export function parseCsv (text) {
  const rows = []; let row = []; let cell = ''; let q = false
  text = text.replace(/^﻿/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim()))
}
const csvCell = (v) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
const pairs = (s) => Object.fromEntries(String(s || '').split(',').map((x) => x.split('=').map((y) => y.trim())).filter((x) => x[0]))

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!['split', 'template'].includes(cmd) || !campaign) fail('usage: contacts.mjs split <campaign> <list.csv> --map "…" [--segment …|--segment-col … --segments …] [--exclude-col … --exclude …] | template <campaign> --segments "a,b"')
  const dir = campaignDir(campaign)
  const out = path.join(dir, 'pack', 'contacts')
  fs.mkdirSync(out, { recursive: true })

  if (cmd === 'template') {
    const segs = String(a.segments || 'contacts').split(',').map((x) => slugify(x.trim())).filter(Boolean)
    for (const s of segs) fs.writeFileSync(path.join(out, `${s}.csv`), HEAD.join(',') + '\n')
    fs.writeFileSync(path.join(out, 'contacts-template.csv'), HEAD.join(',') + '\n')
    console.log(JSON.stringify({ template: true, files: [...segs.map((s) => `contacts/${s}.csv`), 'contacts/contacts-template.csv'] }))
    process.exit(0)
  }

  if (!input) fail('give the founder\'s CSV file')
  if (/\.xlsx?$/i.test(input)) fail('this is a spreadsheet file: ask the founder to save it as CSV')
  const file = path.isAbsolute(input) ? input : path.resolve(input)
  if (!fs.existsSync(file)) fail(`no file ${file}`)
  const rows = parseCsv(fs.readFileSync(file, 'utf8'))
  if (rows.length < 2) fail('the CSV has no data rows')
  const head = rows[0].map((h) => h.trim())
  const col = (name) => { if (!name) return -1; const i = head.findIndex((h) => h.toLowerCase() === String(name).toLowerCase()); if (i < 0) fail(`no column "${name}"; columns: ${head.join(', ')}`); return i }
  const map = pairs(a.map)
  if (!map.email) fail('--map must name the email column, e.g. --map "email=Email Address,first_name=First Name"')
  const ci = { email: col(map.email), first_name: map.first_name ? col(map.first_name) : -1, company: map.company ? col(map.company) : -1 }
  const segCol = a['segment-col'] ? col(a['segment-col']) : -1
  const segMap = pairs(a.segments)
  const exCol = a['exclude-col'] ? col(a['exclude-col']) : -1
  const exVals = String(a.exclude || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
  if (segCol < 0 && !a.segment) fail('give --segment <name> or --segment-col with --segments')

  const seen = new Set(); const bySeg = {}; const n = { rows: rows.length - 1, invalid: 0, duplicate: 0, excluded: 0, unmatched: 0 }
  for (const r of rows.slice(1)) {
    const email = (r[ci.email] || '').trim().toLowerCase()
    if (!EMAIL.test(email)) { n.invalid++; continue }
    if (seen.has(email)) { n.duplicate++; continue }
    if (exCol >= 0 && exVals.includes((r[exCol] || '').trim().toLowerCase())) { n.excluded++; continue }
    let seg = a.segment && a.segment !== true ? a.segment : null
    if (segCol >= 0) seg = segMap[(r[segCol] || '').trim()] || null
    if (!seg) { n.unmatched++; continue }
    seen.add(email)
    const s = slugify(seg)
    ;(bySeg[s] ||= []).push([email, ci.first_name >= 0 ? (r[ci.first_name] || '').trim() : '', ci.company >= 0 ? (r[ci.company] || '').trim() : '', s])
  }
  for (const [s, list] of Object.entries(bySeg)) fs.writeFileSync(path.join(out, `${s}.csv`), [HEAD, ...list].map((r) => r.map(csvCell).join(',')).join('\n') + '\n')
  console.log(JSON.stringify({ ...n, segments: Object.fromEntries(Object.entries(bySeg).map(([s, l]) => [s, l.length])) }))
}
