#!/usr/bin/env node
// validate.mjs: completeness check of a social ad job's deliverables (Factory v12.1, D40). Checks that every
// frame plan.json declares exists in final/ and has a done manifest.json row naming it, and that qc/contact.jpg,
// manifest.json, DELIVERY.md and PROGRESS.md (six sections) are there. Completeness only: size, aspect and spend
// are media-qc's and manifest.mjs's checks; quality is the person's.
// Written for an agent caller: no prompts, short --help, JSON on stdout, safe to re-run, writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HELP = `usage: node validate.mjs --project <project> [--artifacts <dir>] | <a file inside artifacts/<project>/> [--request <file>] | --selftest
  checks artifacts/<project>/: every plan.json frame file and its done manifest row, qc/contact.jpg, manifest.json,
  DELIVERY.md, PROGRESS.md (6 sections)
  prints JSON: {"ok":true|false, "errors":[…]}`
const SECTIONS = ['Summary', 'Decisions', 'Asset inventory', 'Pipeline', 'Known gaps', 'Next steps']

function out (obj, code = 0) { process.stdout.write(JSON.stringify(obj, null, 2) + '\n'); process.exit(code) }

// a manifest files[] entry is an object {path, sha256, bytes} (media-ai-gen manifest.mjs); a plain string is accepted too
const entryPath = (e) => (typeof e === 'string' ? e : e && typeof e.path === 'string' ? e.path : '')

/** The project folder holding a file: the nearest folder above it that has plan.json (else the file's folder). */
export function projectOf (file) {
  let d = fs.statSync(file).isDirectory() ? file : path.dirname(file)
  for (let i = 0; i < 4; i++) { if (fs.existsSync(path.join(d, 'plan.json'))) return d; d = path.dirname(d) }
  return fs.statSync(file).isDirectory() ? file : path.dirname(file)
}

export function check (dir) {
  const errors = []
  const f = (p) => path.join(dir, p)
  if (!fs.existsSync(dir)) return [`missing project folder ${dir}`]
  let plan = null
  try { plan = JSON.parse(fs.readFileSync(f('plan.json'), 'utf8')) } catch (e) { errors.push(`plan.json missing or not JSON (${e.code || e.message})`) }
  let man = null
  if (fs.existsSync(f('manifest.json'))) { try { man = JSON.parse(fs.readFileSync(f('manifest.json'), 'utf8')) } catch { errors.push('manifest.json is not JSON') } }
  const done = new Set((man?.assets || []).filter((r) => r.status === 'done').flatMap((r) => (r.files || []).map(entryPath)))
  const frames = Array.isArray(plan?.frames) ? plan.frames : []
  if (plan && !frames.length) errors.push('plan.json lists no frames')
  for (const fr of frames) {
    const rel = String(fr.file || '').replace(/^artifacts\/[^/]+\//, '')
    if (!rel) { errors.push(`frame "${fr.role}" has no file`); continue }
    const r2 = rel.replace(/\.png$/, '-r2.png')
    const have = fs.existsSync(f(rel)) ? rel : fs.existsSync(f(r2)) ? r2 : null
    if (!have) errors.push(`frame "${fr.role}": ${rel} missing`)
    else if (man && !done.has(have)) errors.push(`frame "${fr.role}": manifest.json has no done row naming ${have}`)
  }
  for (const p of ['qc/contact.jpg', 'manifest.json', 'DELIVERY.md']) if (!fs.existsSync(f(p))) errors.push(`${p} missing`)
  if (fs.existsSync(f('PROGRESS.md'))) {
    const t = fs.readFileSync(f('PROGRESS.md'), 'utf8')
    for (const s of SECTIONS) if (!new RegExp(`^## ${s}\\s*$`, 'mi').test(t)) errors.push(`PROGRESS.md has no "## ${s}" section`)
  } else errors.push('PROGRESS.md missing')
  return errors
}

function selftest () {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c07-validate-'))
  const make = (frames, { strings = false } = {}) => {
    const d = fs.mkdtempSync(path.join(tmp, 'p-'))
    fs.mkdirSync(path.join(d, 'final')); fs.mkdirSync(path.join(d, 'qc'))
    fs.writeFileSync(path.join(d, 'plan.json'), JSON.stringify({ frames: frames.map((r) => ({ role: r, file: `artifacts/x/final/${r}.png` })) }))
    for (const r of frames) fs.writeFileSync(path.join(d, 'final', `${r}.png`), 'x')
    const files = (r) => (strings ? [`final/${r}.png`] : [{ path: `final/${r}.png`, sha256: 'ab', bytes: 1 }])
    fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify({ assets: frames.map((r) => ({ item: r, status: 'done', files: files(r) })) }))
    for (const p of ['qc/contact.jpg', 'DELIVERY.md']) fs.writeFileSync(path.join(d, p), 'x')
    fs.writeFileSync(path.join(d, 'PROGRESS.md'), SECTIONS.map((s) => `## ${s}\n\nx\n`).join('\n'))
    return d
  }
  const good = make(['hook', 'proof', 'lifestyle', 'conversion'])
  const strings = make(['single'], { strings: true })
  const noFrame = make(['single']); fs.rmSync(path.join(noFrame, 'final', 'single.png'))
  const retry = make(['single']); fs.renameSync(path.join(retry, 'final', 'single.png'), path.join(retry, 'final', 'single-r2.png'))
  fs.writeFileSync(path.join(retry, 'manifest.json'), JSON.stringify({ assets: [{ item: 'single', status: 'done', files: [{ path: 'final/single-r2.png', sha256: 'ab', bytes: 1 }] }] }))
  const noRow = make(['single']); fs.writeFileSync(path.join(noRow, 'manifest.json'), JSON.stringify({ assets: [{ item: 'single', status: 'failed', files: [{ path: 'final/single.png' }] }] }))
  const noSection = make(['single']); fs.writeFileSync(path.join(noSection, 'PROGRESS.md'), '## Summary\n')
  const cases = [['four frames, object files[]', good, true], ['string files[] still accepted', strings, true], ['a retried frame', retry, true],
    ['a frame missing', noFrame, false], ['no done manifest row', noRow, false], ['PROGRESS.md short of sections', noSection, false]]
  const failed = cases.filter(([, d, ok]) => (check(d).length === 0) !== ok).map(([n]) => n)
  // given a deliverable file, the project folder is found from it (Factory's checks.mjs passes final/<frame>.png)
  if (projectOf(path.join(good, 'final', 'hook.png')) !== good) failed.push('project folder from a deliverable file')
  // the main block runs when the script is reached through a symlinked skill folder, as on the machine
  const link = path.join(tmp, 'linked'); fs.symlinkSync(path.dirname(fileURLToPath(import.meta.url)), link)
  try { execFileSync('node', [path.join(link, path.basename(fileURLToPath(import.meta.url))), path.join(good, 'final', 'hook.png')], { encoding: 'utf8' }) } catch { failed.push('runs through a symlinked path') }
  fs.rmSync(tmp, { recursive: true, force: true })
  out({ ok: failed.length === 0, cases: cases.length + 2, failed }, failed.length ? 1 : 0)
}

const real = (p) => { try { return fs.realpathSync(p) } catch { return path.resolve(p) } }
if (process.argv[1] && real(fileURLToPath(import.meta.url)) === real(process.argv[1])) {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) { process.stdout.write(HELP + '\n'); process.exit(0) }
  if (argv.includes('--selftest')) selftest()
  const VAL = ['--project', '--artifacts', '--request']
  const val = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null)
  const pos = argv.find((a, i) => !a.startsWith('--') && !VAL.includes(argv[i - 1]))
  let dir = null
  if (val('--project')) dir = path.join(val('--artifacts') || 'artifacts', val('--project'))
  else if (pos && fs.existsSync(pos)) dir = projectOf(pos)
  if (!dir) out({ ok: false, errors: ['give --project <project> or a file inside artifacts/<project>/; see --help'] }, 2)
  const errors = check(dir)
  out({ ok: errors.length === 0, errors: errors.slice(0, 20), more: Math.max(0, errors.length - 20) }, errors.length ? 1 : 0)
}
