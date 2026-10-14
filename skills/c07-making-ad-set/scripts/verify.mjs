#!/usr/bin/env node
// verify.mjs: completeness check of a social ad job's deliverables (Factory v12.1, D40). Checks that every
// frame plan.json declares exists in final/, and that qc/contact.jpg, manifest.json, DELIVERY.md and
// PROGRESS.md (six sections) are there. Completeness only: size, aspect and spend are media-qc's and
// manifest.mjs's checks; quality is the person's.
// Written for an agent caller: no prompts, short --help, JSON on stdout, safe to re-run, writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HELP = `usage: node verify.mjs --project <project> [--artifacts <dir>] [--selftest]
  checks artifacts/<project>/: every plan.json frame file, qc/contact.jpg, manifest.json, DELIVERY.md, PROGRESS.md (6 sections)
  prints JSON: {"ok":true|false, "errors":[…]}`
const SECTIONS = ['Summary', 'Decisions', 'Asset inventory', 'Pipeline', 'Known gaps', 'Next steps']

function out(obj, code = 0) { process.stdout.write(JSON.stringify(obj, null, 2) + '\n'); process.exit(code) }

export function check(dir) {
  const errors = []
  const f = (p) => path.join(dir, p)
  if (!fs.existsSync(dir)) return [`missing project folder ${dir}`]
  let plan = null
  try { plan = JSON.parse(fs.readFileSync(f('plan.json'), 'utf8')) } catch (e) { errors.push(`plan.json missing or not JSON (${e.code || e.message})`) }
  const frames = Array.isArray(plan?.frames) ? plan.frames : []
  if (plan && !frames.length) errors.push('plan.json lists no frames')
  for (const fr of frames) {
    const rel = String(fr.file || '').replace(/^artifacts\/[^/]+\//, '')
    if (!rel) errors.push(`frame "${fr.role}" has no file`)
    else if (!fs.existsSync(f(rel)) && !fs.existsSync(f(rel.replace(/\.png$/, '-r2.png')))) errors.push(`frame "${fr.role}": ${rel} missing`)
  }
  for (const p of ['qc/contact.jpg', 'manifest.json', 'DELIVERY.md']) if (!fs.existsSync(f(p))) errors.push(`${p} missing`)
  if (fs.existsSync(f('PROGRESS.md'))) {
    const t = fs.readFileSync(f('PROGRESS.md'), 'utf8')
    for (const s of SECTIONS) if (!new RegExp(`^## ${s}\\s*$`, 'mi').test(t)) errors.push(`PROGRESS.md has no "## ${s}" section`)
  } else errors.push('PROGRESS.md missing')
  return errors
}

function selftest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c07-verify-'))
  const make = (frames) => {
    const d = fs.mkdtempSync(path.join(tmp, 'p-'))
    fs.mkdirSync(path.join(d, 'final')); fs.mkdirSync(path.join(d, 'qc'))
    fs.writeFileSync(path.join(d, 'plan.json'), JSON.stringify({ frames: frames.map(r => ({ role: r, file: `artifacts/x/final/${r}.png` })) }))
    for (const r of frames) fs.writeFileSync(path.join(d, 'final', `${r}.png`), 'x')
    for (const p of ['qc/contact.jpg', 'manifest.json', 'DELIVERY.md']) fs.writeFileSync(path.join(d, p), 'x')
    fs.writeFileSync(path.join(d, 'PROGRESS.md'), SECTIONS.map(s => `## ${s}\n\nx\n`).join('\n'))
    return d
  }
  const good = make(['hook', 'proof', 'lifestyle', 'conversion'])
  const noFrame = make(['single']); fs.rmSync(path.join(noFrame, 'final', 'single.png'))
  const retry = make(['single']); fs.renameSync(path.join(retry, 'final', 'single.png'), path.join(retry, 'final', 'single-r2.png'))
  const noSection = make(['single']); fs.writeFileSync(path.join(noSection, 'PROGRESS.md'), '## Summary\n')
  const cases = [[good, true], [retry, true], [noFrame, false], [noSection, false]]
  const failed = cases.filter(([d, ok]) => (check(d).length === 0) !== ok)
  fs.rmSync(tmp, { recursive: true, force: true })
  out({ ok: failed.length === 0, cases: cases.length, failed: failed.length }, failed.length ? 1 : 0)
}

const argv = process.argv.slice(2)
if (argv.includes('--help') || argv.includes('-h')) { process.stdout.write(HELP + '\n'); process.exit(0) }
if (argv.includes('--selftest')) selftest()
const project = argv.includes('--project') ? argv[argv.indexOf('--project') + 1] : null
if (!project) out({ ok: false, errors: ['give --project <project>; see --help'] }, 2)
const root = argv.includes('--artifacts') ? argv[argv.indexOf('--artifacts') + 1] : 'artifacts'
const errors = check(path.join(root, project))
out({ ok: errors.length === 0, errors: errors.slice(0, 20), more: Math.max(0, errors.length - 20) }, errors.length ? 1 : 0)
