#!/usr/bin/env node
// validate.mjs: Factory's completeness check for this kit skill (job card: Make our product-page images). Completeness and
// wiring only (D40): the delivered image is a real PNG, the project has the kit's fixed parts (contact
// sheet, manifest with at least one row, PROGRESS.md with its six sections, Decisions filled), and with
// --request every input the request left out is named in PROGRESS.md as a default or assumption. It never
// judges the image: the person does, against research/references. No prompts; JSON on stdout; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import osL from 'node:os'
import pathL from 'node:path'
import { check as inputs } from './inputs.mjs'
const HELP = 'usage: node validate.mjs <artifacts/<project>/final/<image>.png> [--request <request.md>] | --selftest\n  prints {"ok","errors":[…]}'
const SECTIONS = ['Summary', 'Decisions', 'Asset inventory', 'Pipeline', 'Known gaps', 'Next steps']
const EXTRA = ["plan.json"]   // the kit's other fixed parts, relative to the project folder
export function validate (file, requestText = null) {
  const errors = []
  if (!fs.existsSync(file)) return { ok: false, errors: [`no ${file}`] }
  const head = fs.readFileSync(file).subarray(0, 8)
  if (!head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) errors.push(`${path.basename(file)} is not a PNG`)
  const proj = path.basename(path.dirname(file)) === 'final' ? path.dirname(path.dirname(file)) : path.dirname(file)
  // every cell in final/ is checked, not only the file named (checks.json 0.1.0 found one of three checked; 0.1.1)
  const finalDir = path.join(proj, 'final')
  if (fs.existsSync(finalDir)) for (const c of fs.readdirSync(finalDir).filter(f => /\.png$/i.test(f) && path.join(finalDir, f) !== path.resolve(file))) {
    if (!fs.readFileSync(path.join(finalDir, c)).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) errors.push(`${c} is not a PNG`)
  }
  for (const f of ['qc/contact.jpg', ...EXTRA]) if (!fs.existsSync(path.join(proj, f))) errors.push(`missing ${f}`)
  let rows = 0
  try { const m = JSON.parse(fs.readFileSync(path.join(proj, 'manifest.json'), 'utf8')); rows = (m.assets || []).length } catch { errors.push('manifest.json missing or not JSON') }
  if (fs.existsSync(path.join(proj, 'manifest.json')) && !rows) errors.push('manifest.json has no rows (assets)')
  const prog = fs.existsSync(path.join(proj, 'PROGRESS.md')) ? fs.readFileSync(path.join(proj, 'PROGRESS.md'), 'utf8') : null
  if (prog === null) errors.push('missing PROGRESS.md')
  else {
    for (const s of SECTIONS) if (!new RegExp(`^##\\s+${s}\\s*$`, 'im').test(prog)) errors.push(`PROGRESS.md has no "## ${s}" section`)
    const dec = (prog.split(/^##\s+Decisions\s*$/im)[1] || '').split(/^##\s/m)[0]
    if (!dec.trim()) errors.push('PROGRESS.md Decisions is empty: the defaults used must be named')
    if (requestText !== null && dec.trim()) {
      const gaps = inputs(requestText).assume
      if (gaps.length && !/default|assum/i.test(dec)) errors.push(`the request left out ${gaps.map(g => g.label).join(', ')}, but Decisions names no default or assumption`)
    }
  }
  if (/\[TBD\]|TODO/.test(prog || '')) errors.push('PROGRESS.md has a placeholder ([TBD] or TODO)')
  return { ok: !errors.length, errors }
}
// Compare real paths: on the machine skills are reached through a symlinked folder (audit product-hero-1, 0.1.1).
const realOf = p => { try { return fs.realpathSync(p) } catch { return p } }
if (process.argv[1] && realOf(fileURLToPath(import.meta.url)) === realOf(process.argv[1])) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-')), p = path.join(tmp, 'proj'), img = path.join(p, 'final', 'x.png')
    fs.mkdirSync(path.join(p, 'final'), { recursive: true }); fs.mkdirSync(path.join(p, 'qc'), { recursive: true })
    fs.writeFileSync(img, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]))
    fs.writeFileSync(path.join(p, 'qc', 'contact.jpg'), 'x')
    for (const f of EXTRA) { fs.mkdirSync(path.dirname(path.join(p, f)), { recursive: true }); fs.writeFileSync(path.join(p, f), '{}') }
    fs.writeFileSync(path.join(p, 'manifest.json'), JSON.stringify({ assets: [{ item: 'x', status: 'done', files: [{ path: 'final/x.png', sha256: '0', bytes: 24 }] }] }))  // objects-shaped files[], as manifest.mjs writes (0.1.1)
    const good = SECTIONS.map(s => `## ${s}\n\n${s === 'Decisions' ? 'Aspect 1:1 (default); setting: neutral seamless (default).' : 'text'}\n`).join('\n')
    fs.writeFileSync(path.join(p, 'PROGRESS.md'), good)
    const r1 = validate(img, 'Product: mug')
    fs.writeFileSync(path.join(p, 'PROGRESS.md'), good.replace('## Known gaps', '## Gaps'))
    const r2 = validate(img)
    fs.writeFileSync(path.join(p, 'PROGRESS.md'), good.replace(/Aspect 1:1 \(default\); setting: neutral seamless \(default\)\./, 'Kept it simple.'))
    const r3 = validate(img, 'Product: mug')
    fs.writeFileSync(path.join(p, 'final', 'y.png'), 'not a png'); const r5 = validate(img); fs.rmSync(path.join(p, 'final', 'y.png'))
    fs.writeFileSync(img, 'not a png'); const r4 = validate(img)
    fs.rmSync(tmp, { recursive: true, force: true })
    const viaLink = (() => { const d = fs.mkdtempSync(osL.tmpdir() + '/link-'), l = d + '/scripts'; fs.symlinkSync(pathL.dirname(fileURLToPath(import.meta.url)), l)
      try { return execFileSync(process.execPath, [l + '/' + pathL.basename(fileURLToPath(import.meta.url)), '--help'], { encoding: 'utf8' }) } catch { return '' } finally { fs.rmSync(d, { recursive: true, force: true }) } })()
    const linkOk = /usage: node/.test(viaLink)
    const ok = (r1.ok && !r2.ok && /Known gaps/.test(r2.errors.join()) && !r3.ok && /left out/.test(r3.errors.join()) && !r4.ok && !r5.ok && /y\.png is not a PNG/.test(r5.errors.join())) && linkOk
    console.log(JSON.stringify({ ok, cases: 6 })); process.exit(ok ? 0 : 1)
  }
  const ri = a.indexOf('--request'), req = ri > -1 && a[ri + 1] && fs.existsSync(a[ri + 1]) ? fs.readFileSync(a[ri + 1], 'utf8') : null
  if (!a[0] || a[0].startsWith('--')) { console.log(JSON.stringify({ ok: false, errors: ['give the delivered image; see --help'] })); process.exit(2) }
  const r = validate(a[0], req); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1)
}
