#!/usr/bin/env node
// Keep the current pack before it is rewritten.
//
//   version.mjs snapshot <campaign>
//
// Copies 04-storyboard.md, 05-copy.md and pack/ to versions/pack-v<N>/ (N = the current pack
// version), then counts the pack version up by one. Never overwrites an earlier version. Run it
// before a change rewrites emails. A campaign with no copy yet has nothing to keep.
import fs from 'node:fs'
import path from 'node:path'
import { projectDir, readState, writeState, log, fail, args } from './lib.mjs'

const a = args(process.argv.slice(2))
const [cmd, project] = a._
if (cmd !== 'snapshot' || !project) fail('usage: version.mjs snapshot <campaign>')
const dir = projectDir(project)
const s = readState(dir)
if (!s) fail(`no campaign "${project}"`)
if (!fs.existsSync(path.join(dir, '05-copy.md'))) { console.log(JSON.stringify({ kept: null, packVersion: s.packVersion, note: 'no copy yet' })); process.exit(0) }
const dest = path.join(dir, 'versions', `pack-v${s.packVersion}`)
if (fs.existsSync(dest)) fail(`${dest} already exists; versions are never overwritten`)
fs.mkdirSync(dest, { recursive: true })
for (const f of ['04-storyboard.md', '05-copy.md']) if (fs.existsSync(path.join(dir, f))) fs.copyFileSync(path.join(dir, f), path.join(dest, f))
if (fs.existsSync(path.join(dir, 'pack'))) fs.cpSync(path.join(dir, 'pack'), path.join(dest, 'pack'), { recursive: true })
s.packVersion += 1
log(s, `kept pack v${s.packVersion - 1} in versions/; now building v${s.packVersion}`)
writeState(dir, s)
console.log(JSON.stringify({ kept: path.relative(dir, dest), packVersion: s.packVersion }))
