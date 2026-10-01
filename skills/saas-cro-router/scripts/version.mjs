#!/usr/bin/env node
// Keep the current review before new evidence, results or a change rewrites it.
//
//   version.mjs snapshot <project>
//
// Copies the files the ranking rewrites (09-action-sheet.md, action-sheet.csv, 10-hypotheses.md,
// deliverables/M1-conversion-review.md, deliverables/M2-test-plan.md) and the page-review files
// (02, 03, 04, 05) to versions/<name>-v<N>.<ext> (N = the current sheet version), then counts the
// sheet version up by one. Never overwrites an earlier version. A project with no ranking yet
// has nothing to keep.
import fs from 'node:fs'
import path from 'node:path'
import { projectDir, readState, writeState, log, fail, args } from './lib.mjs'

const KEEP = ['02-technical.md', '03-heuristic.md', '04-analytics.md', '05-research.md', '09-action-sheet.md', 'action-sheet.csv', '10-hypotheses.md', 'deliverables/M1-conversion-review.md', 'deliverables/M2-test-plan.md', 'deliverables/research-kit.md']

const a = args(process.argv.slice(2))
const [cmd, project] = a._
if (cmd !== 'snapshot' || !project) fail('usage: version.mjs snapshot <project>')
const dir = projectDir(project)
const s = readState(dir)
if (!s) fail(`no project "${project}"`)
if (!fs.existsSync(path.join(dir, 'action-sheet.csv'))) { console.log(JSON.stringify({ kept: [], sheetVersion: s.sheetVersion, note: 'no ranking yet' })); process.exit(0) }
const v = s.sheetVersion
const kept = []
for (const rel of KEEP) {
  const src = path.join(dir, rel)
  if (!fs.existsSync(src)) continue
  const ext = path.extname(rel)
  const dest = path.join(dir, 'versions', `${path.basename(rel, ext)}-v${v}${ext}`)
  if (fs.existsSync(dest)) fail(`${path.relative(dir, dest)} already exists; versions are never overwritten`)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  kept.push(path.relative(dir, dest))
}
s.sheetVersion += 1
log(s, `kept review v${v} in versions/ (${kept.length} files); now writing v${s.sheetVersion}`)
writeState(dir, s)
console.log(JSON.stringify({ kept, sheetVersion: s.sheetVersion }))
