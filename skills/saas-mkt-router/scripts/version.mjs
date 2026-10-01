#!/usr/bin/env node
// Keep the current plan before it is rewritten, and say exactly which sections changed.
//
//   version.mjs snapshot <project>   copies the plan and step files to versions/v<N>/ (N = the
//                                    current plan version), then counts the version up by one.
//                                    Never overwrites. Run it before a change, redo or update.
//   version.mjs diff <project>       every "## " section that differs between the newest
//                                    snapshot and the current files (JSON)
import fs from 'node:fs'
import path from 'node:path'
import { STEPS, projectDir, readState, writeState, log, sections, fail, args, isMain } from './lib.mjs'

const planName = (s) => (s.kind === 'launch' ? 'launch-plan.md' : 'marketing-plan.md')
const tracked = (s) => [planName(s), ...STEPS.map((d) => d.file)]

export function latestSnapshot (dir) {
  const v = path.join(dir, 'versions')
  if (!fs.existsSync(v)) return null
  const ns = fs.readdirSync(v).map((d) => /^v(\d+)$/.exec(d)?.[1]).filter(Boolean).map(Number).sort((x, y) => y - x)
  return ns.length ? { n: ns[0], dir: path.join(v, `v${ns[0]}`) } : null
}

export function diff (dir, s) {
  const snap = latestSnapshot(dir)
  if (!snap) return { against: null, changed: [] }
  const changed = []
  for (const f of tracked(s)) {
    const oldF = path.join(snap.dir, f)
    const newF = path.join(dir, f)
    const before = fs.existsSync(oldF) ? sections(fs.readFileSync(oldF, 'utf8')) : {}
    const after = fs.existsSync(newF) ? sections(fs.readFileSync(newF, 'utf8')) : {}
    for (const h of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[h] === after[h]) continue
      changed.push(`${f} › ${h}${!(h in before) ? ' (new)' : !(h in after) ? ' (removed)' : ''}`)
    }
  }
  return { against: `v${snap.n}`, changed }
}

// Keep the current version. Returns null when nothing has been written yet.
export function snapshot (dir, s) {
  const present = tracked(s).filter((f) => fs.existsSync(path.join(dir, f)))
  if (!present.length) return null
  const dest = path.join(dir, 'versions', `v${s.planVersion}`)
  if (fs.existsSync(dest)) throw new Error(`${dest} already exists; versions are never overwritten`)
  fs.mkdirSync(dest, { recursive: true })
  for (const f of present) fs.copyFileSync(path.join(dir, f), path.join(dest, f))
  s.planVersion += 1
  s.unkept = false
  log(s, `kept v${s.planVersion - 1} in versions/; now writing v${s.planVersion}`)
  return { kept: path.relative(dir, dest), files: present, planVersion: s.planVersion }
}

if (isMain(import.meta.url)) {
  const a = args(process.argv.slice(2))
  const [cmd, project] = a._
  if (!['snapshot', 'diff'].includes(cmd) || !project) fail('usage: version.mjs snapshot|diff <project>')
  const dir = projectDir(project)
  const s = readState(dir)
  if (!s) fail(`no project "${project}"`)
  if (cmd === 'diff') {
    console.log(JSON.stringify(diff(dir, s), null, 2))
  } else {
    let r
    try { r = snapshot(dir, s) } catch (e) { fail(e.message) }
    if (!r) { console.log(JSON.stringify({ kept: null, planVersion: s.planVersion, note: 'nothing written yet' })); process.exit(0) }
    writeState(dir, s)
    console.log(JSON.stringify(r))
  }
}
