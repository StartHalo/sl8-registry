#!/usr/bin/env node
// The company profile: artifacts/context.md. The router is its only writer, through this script.
//
//   context.mjs read                          {"exists", "fields": {key: {value, source, updated}}, "missing": [required keys], "beforeSending": [keys still needed before sending]}
//   context.mjs set <key> "<value>" [<key> "<value>" …] [--source you|assumed|website]
//   context.mjs assume                        fills every empty field that has a default, marked assumed
//
// Keys: company, website, what, buyers, sender, address, region, brand, voice, tool.
// sender and address are never assumed: the pack shows a visible [TBD] until the founder gives them.
import fs from 'node:fs'
import path from 'node:path'
import { ARTIFACTS, today, fail, args } from './lib.mjs'

export const FIELDS = [
  { key: 'company', label: 'Company and product name', required: true },
  { key: 'website', label: 'Website', required: true },
  { key: 'what', label: 'What the product does', required: true },
  { key: 'buyers', label: 'Who buys it' },
  { key: 'sender', label: 'Sender name, email and reply-to', beforeSending: true },
  { key: 'address', label: 'Postal address', beforeSending: true },
  { key: 'region', label: 'Region and recipients', def: 'US (CAN-SPAM), business recipients' },
  { key: 'brand', label: 'Brand: logo URL and colour', def: 'logo: none · colour: #1f4e79' },
  { key: 'voice', label: 'Voice and sign-off', def: "plain and direct; signed with the founder's first name" },
  { key: 'tool', label: 'Email tool', def: 'none named; neutral merge tokens' },
]

const FILE = path.join(ARTIFACTS, 'context.md')
const SECRET = /(password|passwd|api[_ -]?key|secret|token|bearer\s)/i

export function readProfile () {
  const fields = {}
  const need = (keys) => ({ missing: FIELDS.filter((f) => f.required && !keys[f.key]).map((f) => f.key), beforeSending: FIELDS.filter((f) => f.beforeSending && !keys[f.key]).map((f) => f.key) })
  if (!fs.existsSync(FILE)) return { exists: false, fields, ...need(fields) }
  const text = fs.readFileSync(FILE, 'utf8')
  for (const f of FIELDS) {
    const row = text.split('\n').find((l) => l.startsWith(`| ${f.label} |`))
    if (!row) continue
    const cells = row.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim().replace(/\\\|/g, '|'))
    if (cells[1] && cells[1] !== '—') fields[f.key] = { value: cells[1], source: cells[2] || 'you', updated: cells[3] || '' }
  }
  return { exists: true, fields, ...need(fields) }
}

function write (fields) {
  const esc = (v) => String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const rows = FIELDS.map((f) => {
    const v = fields[f.key]
    return `| ${f.label} | ${v ? esc(v.value) : '—'} | ${v ? v.source : ''} | ${v ? v.updated : ''} |`
  }).join('\n')
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.writeFileSync(FILE, `# Company profile

The short profile every campaign reads first. Kept by the email campaign router; it is the only writer.
Campaign facts (goal, segments, offer, lists, results) live in each campaign's folder, not here.
To change a field, give the new value in any job, for example "Postal address: 12 Main St, Austin TX 78701".

| Field | Value | Source | Updated |
|---|---|---|---|
${rows}
`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = args(process.argv.slice(2))
  const [cmd, ...kv] = a._
  const p = readProfile()
  if (cmd === 'read') {
    console.log(JSON.stringify(p, null, 2))
  } else if (cmd === 'set') {
    if (!kv.length || kv.length % 2) fail('usage: context.mjs set <key> "<value>" [<key> "<value>" …]')
    const source = a.source && a.source !== true ? a.source : 'you'
    const changed = []
    for (let i = 0; i < kv.length; i += 2) {
      const f = FIELDS.find((x) => x.key === kv[i])
      if (!f) fail(`unknown field "${kv[i]}"; fields: ${FIELDS.map((x) => x.key).join(', ')}`)
      const value = kv[i + 1].trim()
      if (!value) fail(`empty value for ${f.key}`)
      if (SECRET.test(value)) fail(`refused: ${f.key} looks like a secret; the profile never holds passwords or keys`)
      if ((f.key === 'sender' || f.key === 'address') && source === 'assumed') fail(`refused: ${f.key} is never assumed; leave it empty and the pack shows [TBD]`)
      if (p.fields[f.key]?.value !== value) { p.fields[f.key] = { value, source, updated: today() }; changed.push(f.key) }
    }
    write(p.fields)
    const after = readProfile()
    console.log(JSON.stringify({ changed, missing: after.missing, beforeSending: after.beforeSending }))
  } else if (cmd === 'assume') {
    const changed = []
    for (const f of FIELDS) if (f.def && !p.fields[f.key]) { p.fields[f.key] = { value: f.def, source: 'assumed', updated: today() }; changed.push(f.key) }
    write(p.fields)
    const after = readProfile()
    console.log(JSON.stringify({ changed, missing: after.missing, beforeSending: after.beforeSending }))
  } else {
    fail('usage: context.mjs read | set <key> "<value>" … [--source …] | assume')
  }
}
