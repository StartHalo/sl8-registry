#!/usr/bin/env node
// Keep the current brand book before it is rewritten.
//
//   version.mjs snapshot <project>
//
// Copies brand-book.md to versions/brand-book-v<N>.md (N = the current book version), then counts
// the book version up by one. Never overwrites an earlier version. Run it before a change, a redo
// or a refresh rewrites the book. A project with no brand book yet has nothing to keep.
import fs from 'node:fs'
import path from 'node:path'
import { projectDir, readState, writeState, log, fail, args } from './lib.mjs'

const a = args(process.argv.slice(2))
const [cmd, project] = a._
if (cmd !== 'snapshot' || !project) fail('usage: version.mjs snapshot <project>')
const dir = projectDir(project)
const s = readState(dir)
if (!s) fail(`no project "${project}"`)
const cur = path.join(dir, 'brand-book.md')
if (!fs.existsSync(cur)) { console.log(JSON.stringify({ kept: null, bookVersion: s.bookVersion, note: 'no brand book yet' })); process.exit(0) }
const dest = path.join(dir, 'versions', `brand-book-v${s.bookVersion}.md`)
if (fs.existsSync(dest)) fail(`${dest} already exists; versions are never overwritten`)
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.copyFileSync(cur, dest)
s.bookVersion += 1
log(s, `kept brand book v${s.bookVersion - 1} in versions/; now writing v${s.bookVersion}`)
writeState(dir, s)
console.log(JSON.stringify({ kept: path.relative(dir, dest), bookVersion: s.bookVersion }))
