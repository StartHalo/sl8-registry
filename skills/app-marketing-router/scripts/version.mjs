#!/usr/bin/env node
// Keep the current plan before it is rewritten.
//
//   version.mjs snapshot <project>
//
// Copies marketing-plan.md to versions/marketing-plan-v<N>.md (N = the current plan version),
// then counts the plan version up by one. Never overwrites an earlier version. Run it before a
// change, a redo or an update rewrites the plan. A project with no plan yet has nothing to keep.
import fs from 'node:fs'
import path from 'node:path'
import { projectDir, readState, writeState, log, fail, args } from './lib.mjs'

const a = args(process.argv.slice(2))
const [cmd, project] = a._
if (cmd !== 'snapshot' || !project) fail('usage: version.mjs snapshot <project>')
const dir = projectDir(project)
const s = readState(dir)
if (!s) fail(`no project "${project}"`)
const name = s.kind === 'campaign' ? 'campaign-plan' : 'marketing-plan'
const cur = path.join(dir, `${name}.md`)
if (!fs.existsSync(cur)) { console.log(JSON.stringify({ kept: null, planVersion: s.planVersion, note: 'no plan yet' })); process.exit(0) }
const dest = path.join(dir, 'versions', `${name}-v${s.planVersion}.md`)
if (fs.existsSync(dest)) fail(`${dest} already exists; versions are never overwritten`)
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.copyFileSync(cur, dest)
s.planVersion += 1
log(s, `kept ${name} v${s.planVersion - 1} in versions/; now writing v${s.planVersion}`)
writeState(dir, s)
console.log(JSON.stringify({ kept: path.relative(dir, dest), planVersion: s.planVersion }))
