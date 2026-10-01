#!/usr/bin/env node
// The company profile: artifacts/context.md. The router is its only writer, through this script.
//
//   context.mjs read                          {"exists", "fields": {key: {value, source, updated}}, "missing": [required keys]}
//   context.mjs set <key> "<value>" [<key> "<value>" …] [--source you|assumed|website|pricing page]
//   context.mjs assume                        fills every empty optional field with its default, marked assumed
//
// Keys: company, site, what, buyer, price, motion, stage, hours, channels, preferences.
import fs from 'node:fs'
import path from 'node:path'
import { ARTIFACTS, today, fail, args } from './lib.mjs'

export const FIELDS = [
  { key: 'company', label: 'Company and product name', required: true },
  { key: 'site', label: 'Website', required: true },
  { key: 'what', label: 'What the product does', required: true },
  { key: 'buyer', label: 'Who buys', required: true },
  { key: 'price', label: 'Price and billing', def: 'not known: send the pricing page or your price' },
  { key: 'motion', label: 'Sales motion', def: 'hybrid: demo request and trial' },
  { key: 'stage', label: 'Stage', def: 'early: under 50 paying customers' },
  { key: 'hours', label: 'Founder hours for marketing', def: '5 hours a week' },
  { key: 'channels', label: 'Channels in use', def: 'none known' },
  { key: 'preferences', label: 'Preferences', def: 'plain and direct tone; 90-day plan horizon; 90-day review cadence' },
]

const FILE = path.join(ARTIFACTS, 'context.md')
const SECRET = /(password|passwd|api[_ -]?key|secret|token|bearer\s)/i

export function readProfile () {
  const fields = {}
  if (!fs.existsSync(FILE)) return { exists: false, fields, missing: FIELDS.filter((f) => f.required).map((f) => f.key) }
  const text = fs.readFileSync(FILE, 'utf8')
  for (const f of FIELDS) {
    const row = text.split('\n').find((l) => l.startsWith(`| ${f.label} |`))
    if (!row) continue
    const cells = row.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim().replace(/\\\|/g, '|'))
    if (cells[1] && cells[1] !== '—') fields[f.key] = { value: cells[1], source: cells[2] || 'you', updated: cells[3] || '' }
  }
  return { exists: true, fields, missing: FIELDS.filter((f) => f.required && !fields[f.key]).map((f) => f.key) }
}

function write (fields) {
  const esc = (v) => String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const rows = FIELDS.map((f) => {
    const v = fields[f.key]
    return `| ${f.label} | ${v ? esc(v.value) : '—'} | ${v ? v.source : ''} | ${v ? v.updated : ''} |`
  }).join('\n')
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.writeFileSync(FILE, `# Company profile

The short profile every job reads first. Kept by the micro-SaaS marketing router; it is the only
writer. Project facts (this quarter's goal, budget, figures, competitors, an earlier strategy)
live in each project's folder, not here. To change a field, give the new value in any job, for
example "I have 8 hours a week for marketing now".

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
      if (p.fields[f.key]?.value !== value) { p.fields[f.key] = { value, source, updated: today() }; changed.push(f.key) }
    }
    write(p.fields)
    console.log(JSON.stringify({ changed, missing: readProfile().missing }))
  } else if (cmd === 'assume') {
    const changed = []
    for (const f of FIELDS) if (!f.required && !p.fields[f.key]) { p.fields[f.key] = { value: f.def, source: 'assumed', updated: today() }; changed.push(f.key) }
    write(p.fields)
    console.log(JSON.stringify({ changed, missing: readProfile().missing }))
  } else {
    fail('usage: context.mjs read | set <key> "<value>" … [--source …] | assume')
  }
}
