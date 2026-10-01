#!/usr/bin/env node
// The company profile: artifacts/context.md. The router is its only writer, through this script.
// Same eight fields, labels and table as the app marketing strategy bot (BOT-C01's router), so a
// customer who uses both is asked once; either router reads what the other wrote.
//
//   context.mjs read                          {"exists", "fields": {key: {value, source, updated}}, "missing": [required keys]}
//   context.mjs set <key> "<value>" [<key> "<value>" …] [--source you|assumed|store listing]
//   context.mjs assume                        fills every empty optional field with its default, marked assumed
//
// Keys: company, app, what, model, platforms, health, markets, preferences.
import fs from 'node:fs'
import path from 'node:path'
import { ARTIFACTS, today, fail, args } from './lib.mjs'

export const FIELDS = [
  { key: 'company', label: 'Company name', required: true },
  { key: 'app', label: 'App name and store link(s)', required: true },
  { key: 'what', label: 'What the app does', required: true },
  { key: 'model', label: 'Business model', def: 'free with in-app purchase' },
  { key: 'platforms', label: 'Platforms', def: 'Android and iOS' },
  { key: 'health', label: 'Health-feature category', def: 'general wellness, no medical claims' },
  { key: 'markets', label: 'Markets and languages', def: "the store listing's market and language" },
  { key: 'preferences', label: 'Preferences', def: 'plain and direct tone; no leadership summary' },
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

The short profile every job reads first. Kept by the agent's router; it is the only writer.
Project facts (goals, brand decisions, figures, competitors) live in each project's folder, not here.
To change a field, give the new value in any job, for example "Business model: subscription".

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
