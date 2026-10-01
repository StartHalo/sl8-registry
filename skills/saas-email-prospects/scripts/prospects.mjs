#!/usr/bin/env node
// The prospect list's folder and its check. Plain Node 22, no dependencies.
//
//   prospects.mjs new <slug>                       creates artifacts/prospects/<slug>/ (adds -2, -3 … rather than overwrite); prints the folder
//   prospects.mjs check <folder> [--max <n>]       checks prospects.csv and prospects.md; exit 1 with the problems
//
// prospects.csv columns, in order: email,first_name,company,segment,role,source_url,fit_reason
// The check: the header; a valid email in every row; an https source_url; a fit reason; no repeated
// email or organisation; at most --max rows; prospects.md has its headings. Free-mail addresses
// (gmail, yahoo …) are warnings: a business contact is usually on the organisation's own domain.
import fs from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const HOME = path.resolve(HERE, '..', '..', '..', '..')
const ARTIFACTS = process.env.SL8_ARTIFACTS ||
  (['.claude', '.agents'].includes(path.basename(path.resolve(HERE, '..', '..', '..'))) ? path.join(HOME, 'artifacts') : path.resolve('artifacts'))
export const HEAD = ['email', 'first_name', 'company', 'segment', 'role', 'source_url', 'fit_reason']
const MD = ['What was done', 'How the list was built', 'What to verify before sending', 'Skipped', 'Decisions', 'Assumptions']
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i
const FREE = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|proton|protonmail|gmx)\./i
const fail = (m) => { console.error(m); process.exit(2) }

export function parseCsv (text) {
  const rows = []; let row = []; let cell = ''; let q = false
  text = text.replace(/^﻿/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim()))
}

export function check (dir, max) {
  const problems = []; const warnings = []
  const csvFile = path.join(dir, 'prospects.csv')
  if (!fs.existsSync(csvFile)) return { problems: ['prospects.csv is missing'], warnings, rows: 0 }
  const rows = parseCsv(fs.readFileSync(csvFile, 'utf8'))
  const head = (rows[0] || []).map((h) => h.trim().toLowerCase())
  if (head.join(',') !== HEAD.join(',')) problems.push(`the header must be exactly: ${HEAD.join(',')}`)
  const data = rows.slice(1)
  if (!data.length) problems.push('prospects.csv has no rows')
  if (max && data.length > max) problems.push(`${data.length} rows; at most ${max} were asked for`)
  const emails = new Set(); const orgs = new Set()
  data.forEach((r, i) => {
    const n = i + 2
    const [email, , company, , , src, fit] = HEAD.map((_, k) => (r[k] || '').trim())
    if (!EMAIL.test(email)) problems.push(`row ${n}: "${email}" is not an email address`)
    else if (FREE.test(email)) warnings.push(`row ${n}: ${email} is a free-mail address; prefer one on the organisation's own domain`)
    if (!company) problems.push(`row ${n}: no organisation`)
    if (!/^https:\/\/\S+$/.test(src)) problems.push(`row ${n}: source_url must be the https page the address was read on`)
    if (!fit) problems.push(`row ${n}: no fit reason`)
    const e = email.toLowerCase(); const o = company.toLowerCase()
    if (e && emails.has(e)) problems.push(`row ${n}: ${email} appears twice`)
    if (o && orgs.has(o)) problems.push(`row ${n}: ${company} appears twice (one contact per organisation)`)
    emails.add(e); orgs.add(o)
  })
  const mdFile = path.join(dir, 'prospects.md')
  if (!fs.existsSync(mdFile)) problems.push('prospects.md is missing')
  else {
    const hs = new Set([...fs.readFileSync(mdFile, 'utf8').matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].toLowerCase()))
    for (const h of MD) if (!hs.has(h.toLowerCase())) problems.push(`prospects.md has no "## ${h}" section`)
  }
  return { problems, warnings, rows: data.length }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg, ...rest] = process.argv.slice(2)
  if (cmd === 'new') {
    if (!arg || !/^[a-z0-9][a-z0-9-]{0,60}$/.test(arg)) fail('usage: prospects.mjs new <slug> (lowercase, digits, hyphens)')
    let dir = path.join(ARTIFACTS, 'prospects', arg)
    for (let n = 2; fs.existsSync(dir); n++) dir = path.join(ARTIFACTS, 'prospects', `${arg}-${n}`)
    fs.mkdirSync(dir, { recursive: true })
    console.log(dir)
  } else if (cmd === 'check') {
    if (!arg) fail('usage: prospects.mjs check <folder> [--max <n>]')
    const dir = path.isAbsolute(arg) ? arg : (fs.existsSync(arg) ? path.resolve(arg) : path.join(ARTIFACTS, 'prospects', arg))
    const mi = rest.indexOf('--max')
    const r = check(dir, mi >= 0 ? +rest[mi + 1] : 0)
    for (const p of r.problems) console.log(`✗ ${p}`)
    for (const w of r.warnings) console.log(`· ${w}`)
    console.log(r.problems.length ? `✗ ${r.problems.length} problem(s) in ${r.rows} rows` : `✓ ${r.rows} prospects; the list passes the check`)
    process.exit(r.problems.length ? 1 : 0)
  } else fail('usage: prospects.mjs new <slug> | check <folder> [--max <n>]')
}
