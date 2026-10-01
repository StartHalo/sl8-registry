#!/usr/bin/env node
// Store listing field limits. Counts the characters of each proposed field in a file's
// "## Store listing" table (rows "| <field> | <text> |") against the stores' published limits.
//
//   fields.mjs <file>          prints each field with its length and limit; exit 1 if any is over
//
// state.mjs uses checkFields() for S4 and for Apply pieces that hold a store listing table.
import fs from 'node:fs'
import { sectionBody, fail } from './lib.mjs'

// Apple: App Store product page; Google: Play Console store listing. Lower case keys.
export const LIMITS = {
  'app name': 30,
  name: 30,
  title: 30,
  subtitle: 30,
  'promotional text': 170,
  keywords: 100,
  'short description': 80,
  description: 4000,
  'full description': 4000,
}

export const clean = (t) => t.replace(/\\\|/g, '|').replace(/^[`"“”']+|[`"“”']+$/g, '').replace(/\*\*/g, '').trim()

export function checkFields (text) {
  const body = sectionBody(text, 'Store listing')
  if (body == null) return { rows: [], gaps: [] }
  const rows = []
  for (const line of body.split('\n')) {
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim())
    if (cells.length < 2) continue
    const field = cells[0].replace(/\*\*/g, '').replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase()
    const limit = LIMITS[field.replace(/^(apple|ios|google|play|google play)\s+/, '')]
    if (!limit) continue
    const value = clean(cells[1])
    rows.push({ field: cells[0], length: [...value].length, limit })
  }
  const gaps = rows.filter((r) => r.length > r.limit).map((r) => `Store listing "${r.field}" is ${r.length} characters (limit ${r.limit})`)
  if (!rows.length) gaps.push('the "## Store listing" section has no field table ("| Field | Proposed text |" with App name, Subtitle, …)')
  return { rows, gaps }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file] = process.argv.slice(2)
  if (!file || !fs.existsSync(file)) fail('usage: fields.mjs <file with a "## Store listing" table>')
  const r = checkFields(fs.readFileSync(file, 'utf8'))
  for (const row of r.rows) console.log(`${row.length <= row.limit ? '✓' : '✗'} ${row.field}: ${row.length}/${row.limit}`)
  for (const g of r.gaps) console.log(`✗ ${g}`)
  process.exit(r.gaps.length ? 1 : 0)
}
