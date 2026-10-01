#!/usr/bin/env node
// The company profile: artifacts/context.md. The router is its only writer, through this script.
//
//   context.mjs read                          {"exists", "fields": {key: {value, source, updated}}, "missing": [required keys]}
//   context.mjs set <key> "<value>" [<key> "<value>" …] [--source you|assumed|site]
//   context.mjs assume                        fills every empty field that has a default, marked assumed
//
// Keys: url, product, buyers, path, price, traffic, tools, time.
import fs from 'node:fs'
import path from 'node:path'
import { ARTIFACTS, today, fail, args } from './lib.mjs'

export const FIELDS = [
  { key: 'url', label: 'Website', required: true },
  { key: 'product', label: 'Company and product', site: true },
  { key: 'buyers', label: 'Who buys', site: true },
  { key: 'path', label: 'Sales path', site: true },
  { key: 'price', label: 'Price and billing', def: 'not known' },
  { key: 'traffic', label: 'Monthly visitors and conversions', def: 'not known' },
  { key: 'tools', label: 'Tools in place', def: 'none known' },
  { key: 'time', label: "Founder's time for changes", def: 'a few hours a week' },
]

const FILE = path.join(ARTIFACTS, 'context.md')
const SECRET = /(password|passwd|api[_ -]?key|secret|token|bearer\s)/i

export function readProfile () {
  const fields = {}
  if (!fs.existsSync(FILE)) return { exists: false, fields, missing: FIELDS.filter((f) => f.required).map((f) => f.key), fromSite: FIELDS.filter((f) => f.site).map((f) => f.key) }
  const text = fs.readFileSync(FILE, 'utf8')
  for (const f of FIELDS) {
    const row = text.split('\n').find((l) => l.startsWith(`| ${f.label} |`))
    if (!row) continue
    const cells = row.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim().replace(/\\\|/g, '|'))
    if (cells[1] && cells[1] !== '—') fields[f.key] = { value: cells[1], source: cells[2] || 'you', updated: cells[3] || '' }
  }
  return {
    exists: true,
    fields,
    missing: FIELDS.filter((f) => f.required && !fields[f.key]).map((f) => f.key),
    fromSite: FIELDS.filter((f) => f.site && !fields[f.key]).map((f) => f.key),
  }
}

function write (fields) {
  const esc = (v) => String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const rows = FIELDS.map((f) => {
    const v = fields[f.key]
    return `| ${f.label} | ${v ? esc(v.value) : '—'} | ${v ? v.source : ''} | ${v ? v.updated : ''} |`
  }).join('\n')
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  fs.writeFileSync(FILE, `# Company profile

The short profile every job reads first. Kept by the conversion router; it is the only writer.
Project facts (figures for a period, notes, screenshots, competitors) live in each project's folder.
To change a field, give the new value in any job, for example "Sales path: free trial only".

| Field | Value | Source | Updated |
|---|---|---|---|
${rows}
`)
}

// Run as a script, also through the .claude/skills/<id> → .agents/skills/<id> link: Node resolves
// import.meta.url to the real path while argv[1] keeps the link, so compare real paths.
const isMain = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (isMain) {
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
      const value = String(kv[i + 1]).trim()
      if (!value) fail(`empty value for ${f.key}`)
      if (SECRET.test(value)) fail(`refused: ${f.key} looks like a secret; the profile never holds passwords or keys`)
      if (f.key === 'url' && !/^https?:\/\/\S+$/.test(value)) fail('url must start with http:// or https://')
      if (p.fields[f.key]?.value !== value) { p.fields[f.key] = { value, source, updated: today() }; changed.push(f.key) }
    }
    write(p.fields)
    const r = readProfile()
    console.log(JSON.stringify({ changed, missing: r.missing, fromSite: r.fromSite }))
  } else if (cmd === 'assume') {
    const changed = []
    for (const f of FIELDS) if (f.def && !p.fields[f.key]) { p.fields[f.key] = { value: f.def, source: 'assumed', updated: today() }; changed.push(f.key) }
    write(p.fields)
    const r = readProfile()
    console.log(JSON.stringify({ changed, missing: r.missing, fromSite: r.fromSite }))
  } else {
    fail('usage: context.mjs read | set <key> "<value>" … [--source …] | assume')
  }
}
