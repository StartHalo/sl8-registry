#!/usr/bin/env node
// selftest.mjs: media-qc's self-test, Studio check IMG-T3 ("every mediaqc check gives the right exit
// code on good and known-bad fixtures"). It builds the synthetic fixtures (fixtures.sh) in a temp
// folder, runs every subcommand on a good and a known-bad input, and asserts the exit code, that
// stdout is exactly one JSON line, and the figures that make each check discriminate. If a check
// stops telling good from bad, a case goes wrong and this exits 1.
//
//   node selftest.mjs [--dir DIR] [--keep]
// Exit 0 every case as expected · 1 a case went wrong · 3 cannot run (ffmpeg, ffprobe or sh missing).
// A case whose fixture this ffmpeg cannot encode (webm, mp3) is printed as skip and does not count.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const QC = path.join(HERE, 'mediaqc.mjs')
const args = process.argv.slice(2)
const keep = args.includes('--keep')
const di = args.indexOf('--dir')
const dir = di >= 0 ? path.resolve(args[di + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'mediaqc-selftest-'))

for (const bin of ['ffmpeg', 'ffprobe']) {
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' })
  if (r.error) { console.log(JSON.stringify({ check: 'selftest', exit: 3, error: `${bin} is not installed on this machine` })); process.exit(3) }
}
const ffv = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).stdout.split('\n')[0].replace(/ Copyright.*/, '')
const fx = spawnSync('sh', [path.join(HERE, 'fixtures.sh'), dir], { encoding: 'utf8' })
if (fx.status !== 0) { console.log(JSON.stringify({ check: 'selftest', exit: 3, error: `fixtures.sh exit ${fx.status}: ${fx.stderr.trim()}` })); process.exit(3) }
const skipped = fx.stdout.split('\n').filter((l) => l.startsWith('skip '))

const F = (n) => path.join(dir, n)
const P = (n) => path.join(dir, 'plans', n)
const O = (n) => path.join(dir, 'out', n)
const fig = (j) => j.figures ?? {}
const has = (j, code) => (j.fails ?? []).some((f) => f.startsWith(code))
const expectFail = (code) => (j) => has(j, code) || `no ${code} in fails`

// [label, mediaqc args, expected exit, needs (fixture files), assert(json) -> true | 'why']
const CASES = [
  // ---- artifact: exists, non-empty, magic = extension, decodes (BQ-01 / BQ-02)
  ['artifact png', ['artifact', F('square-1024.png')], 0],
  ['artifact jpg', ['artifact', F('photo.jpg')], 0],
  ['artifact webp', ['artifact', F('pixel.webp')], 0],
  ['artifact gif', ['artifact', F('still.gif')], 0],
  ['artifact mp4', ['artifact', F('clip.mp4')], 0, [], (j) => j.rows[0].duration_s > 0 || 'no duration'],
  ['artifact mov', ['artifact', F('clip.mov')], 0],
  ['artifact webm', ['artifact', F('clip.webm')], 0, ['clip.webm']],
  ['artifact wav', ['artifact', F('tone.wav')], 0],
  ['artifact mp3', ['artifact', F('tone.mp3')], 0, ['tone.mp3']],
  ['artifact folder of good pictures', ['artifact', F('set')], 0, [], (j) => j.files === 4 || `files ${j.files}, want 4`],
  ['artifact JPEG named .png', ['artifact', F('jpeg-named.png')], 1, [], expectFail('BQ-02')],
  ['artifact text named .mp4', ['artifact', F('text-named.mp4')], 1, [], expectFail('BQ-02')],
  ['artifact truncated PNG (ffprobe reads it, pixels do not decode)', ['artifact', F('truncated.png')], 1, [], expectFail('BQ-02')],
  ['artifact empty file', ['artifact', F('empty.png')], 1, [], expectFail('BQ-01')],
  ['artifact missing file', ['artifact', F('nothing-here.png')], 1, [], expectFail('BQ-01')],
  ['artifact fixture folder holding bad files', ['artifact', dir], 1],
  ['artifact .txt has no magic rule', ['artifact', F('notes.txt')], 3],
  ['artifact usage', ['artifact'], 2],

  // ---- image: format by magic, dimensions, aspect, real alpha, bit depth (BQ-02, IQ-03/04/05)
  ['image square as asked', ['image', F('square-1024.png'), '--w', '1024', '--h', '1024', '--aspect', '1:1', '--format', 'png', '--alpha', 'forbidden'], 0, [],
    (j) => (fig(j).bit_depth === 8 && fig(j).real_alpha === false) || `bit_depth ${fig(j).bit_depth}, real_alpha ${fig(j).real_alpha}`],
  ['image 1280x720 is 16:9', ['image', F('wide-1280x720.png'), '--aspect', '16:9'], 0],
  ['image 864x496 is not 16:9', ['image', F('wide-864x496.png'), '--aspect', '16:9'], 1, [],
    (j) => (has(j, 'IQ-03') && j.compared[0].off_pct > 1.9 && j.compared[0].off_pct < 2.1) || `off_pct ${j.compared?.[0]?.off_pct}`],
  ['image 864x496 is not 1280x720', ['image', F('wide-864x496.png'), '--w', '1280', '--h', '720'], 1, [], expectFail('IQ-03')],
  ['image long side under minimum', ['image', F('square-1024.png'), '--min-long', '1600'], 1, [], expectFail('IQ-03')],
  ['image cutout has real alpha', ['image', F('cutout-rgba.png'), '--alpha', 'required'], 0, [],
    (j) => (fig(j).transparent_share > 0.5 && fig(j).alpha_min === 0) || `transparent_share ${fig(j).transparent_share}`],
  ['image cutout where alpha is forbidden', ['image', F('cutout-rgba.png'), '--alpha', 'forbidden'], 1, [], expectFail('IQ-05')],
  ['image opaque RGBA has no real alpha', ['image', F('opaque-rgba.png'), '--alpha', 'required'], 1, [],
    (j) => (has(j, 'IQ-05') && fig(j).alpha_channel === true && fig(j).real_alpha === false) || 'alpha channel not told apart from real alpha'],
  ['image opaque RGBA where alpha is forbidden', ['image', F('opaque-rgba.png'), '--alpha', 'forbidden'], 0],
  ['image JPEG asked as jpeg', ['image', F('photo.jpg'), '--format', 'jpeg'], 0],
  ['image JPEG asked as png', ['image', F('photo.jpg'), '--format', 'png'], 1, [], expectFail('IQ-04')],
  ['image webp asked as webp', ['image', F('pixel.webp'), '--format', 'webp'], 0],
  ['image 16-bit PNG depth', ['image', F('deep-16bit.png')], 0, [], (j) => fig(j).bit_depth === 16 || `bit_depth ${fig(j).bit_depth}, want 16`],
  ['image JPEG named .png', ['image', F('jpeg-named.png')], 1, [], expectFail('BQ-02')],
  ['image truncated PNG', ['image', F('truncated.png')], 1, [], expectFail('BQ-02')],
  ['image empty file', ['image', F('empty.png')], 1, [], expectFail('BQ-01')],
  ['image usage: bad --alpha value', ['image', F('square-1024.png'), '--alpha', 'maybe'], 2],
  ['image usage: no file', ['image'], 2],

  // ---- declared: delivered vs declared (IQ-03/04/05); no declaration = cannot check (3)
  ['declared request 1280x720, delivered 1280x720', ['declared', '--plan', P('request-1280x720.json'), '--file', F('wide-1280x720.png')], 0],
  ['declared request 1280x720, delivered 864x496', ['declared', '--plan', P('request-1280x720.json'), '--file', F('wide-864x496.png')], 1, [],
    (j) => (has(j, 'IQ-03') && fig(j).w === 864 && fig(j).h === 496) || 'measured size missing'],
  ['declared 720p, delivered 1280x720', ['declared', '--plan', P('request-720p.json'), '--file', F('wide-1280x720.png')], 0],
  ['declared 720p, delivered 864x496', ['declared', '--plan', P('request-720p.json'), '--file', F('wide-864x496.png')], 1, [], expectFail('IQ-03')],
  ['declared jpg, delivered JPEG', ['declared', '--plan', P('request-jpeg.json'), '--file', F('photo.jpg')], 0],
  ['declared jpg, delivered PNG', ['declared', '--plan', P('request-jpeg.json'), '--file', F('square-1024.png')], 1, [], expectFail('IQ-04')],
  ['declared cutout, delivered cutout', ['declared', '--plan', P('request-cutout.json'), '--file', F('cutout-rgba.png')], 0],
  ['declared cutout, delivered opaque RGBA', ['declared', '--plan', P('request-cutout.json'), '--file', F('opaque-rgba.png')], 1, [], expectFail('IQ-05')],
  ['declared root flat fields', ['declared', '--plan', P('request-flat.json'), '--file', F('square-1024.png')], 0],
  ['declared plan entry found by file name (hero)', ['declared', '--plan', P('plan.json'), '--file', F('wide-864x496.png')], 1, [],
    (j) => j.where === 'assets[0].declared' || `where ${j.where}`],
  ['declared plan entry found by file name (square)', ['declared', '--plan', P('plan.json'), '--file', F('square-1024.png')], 0, [],
    (j) => j.where === 'assets[1].declared' || `where ${j.where}`],
  ['declared plan entry chosen by --id', ['declared', '--plan', P('plan.json'), '--file', F('square-1024.png'), '--id', 'hero'], 1, [], expectFail('IQ-03')],
  ['declared manifest row found by files[].path', ['declared', '--plan', P('manifest.json'), '--file', F('wide-864x496.png')], 1, [],
    (j) => (j.where === 'assets[0].declared' && has(j, 'IQ-03')) || `where ${j.where}`],
  ['declared manifest row found by a string in files[]', ['declared', '--plan', P('manifest.json'), '--file', F('cutout-rgba.png')], 0, [],
    (j) => (j.where === 'assets[2].declared' && j.compared.some((r) => r.field === 'alpha')) || `where ${j.where}`],
  ['declared manifest row by --id, wrong file delivered', ['declared', '--plan', P('manifest.json'), '--file', F('opaque-rgba.png'), '--id', 'cut#1'], 1, [], expectFail('IQ-05')],
  ['declared manifest --id item takes the latest attempt', ['declared', '--plan', P('manifest.json'), '--file', F('wide-1280x720.png'), '--id', 'hero'], 0, [],
    (j) => j.entry === 'assets[1]' || `entry ${j.entry}`],
  ['declared deliverable empty', ['declared', '--plan', P('request-1280x720.json'), '--file', F('empty.png')], 1, [], expectFail('BQ-01')],
  ['declared plan entry with no declaration', ['declared', '--plan', P('plan.json'), '--file', F('photo.jpg')], 3],
  ['declared unknown --id', ['declared', '--plan', P('plan.json'), '--file', F('photo.jpg'), '--id', 'nosuch'], 3],
  ['declared request with no declaration', ['declared', '--plan', P('request-none.json'), '--file', F('square-1024.png')], 3],
  ['declared only video fields (1.1.0)', ['declared', '--plan', P('request-video-only.json'), '--file', F('wide-1280x720.png')], 3],
  ['declared plan missing', ['declared', '--plan', P('no-such-plan.json'), '--file', F('square-1024.png')], 3],
  ['declared plan not JSON', ['declared', '--plan', P('broken.json'), '--file', F('square-1024.png')], 3],
  ['declared usage: no --file', ['declared', '--plan', P('plan.json')], 2],

  // ---- sheet: contact sheet (ffmpeg scale + pad + tile)
  ['sheet folder 2x2', ['sheet', F('set'), '--out', O('set.jpg'), '--cols', '2'], 0, [],
    (j) => (j.tiles === 4 && j.grid === '2x2' && j.wh === '652x652' && fs.existsSync(O('set.jpg'))) || `tiles ${j.tiles} grid ${j.grid} wh ${j.wh}`],
  ['sheet three files, partial last row', ['sheet', F('square-1024.png'), F('photo.jpg'), F('cutout-rgba.png'), '--out', O('three.png'), '--cols', '2', '--cell', '200'], 0, [],
    (j) => (j.tiles === 3 && j.wh === '412x412') || `tiles ${j.tiles} wh ${j.wh}`],
  ['sheet with an undecodable input', ['sheet', F('square-1024.png'), F('truncated.png'), '--out', O('bad.jpg')], 1, [],
    (j) => (has(j, 'BQ-02') && !fs.existsSync(O('bad.jpg'))) || 'a sheet was written over a failed tile'],
  ['sheet with an empty input', ['sheet', F('empty.png'), '--out', O('empty.jpg')], 1, [], expectFail('BQ-01')],
  ['sheet usage: no --out', ['sheet', F('set')], 2]
]

const rows = []
for (const [label, argv, want, needs = [], check] of CASES) {
  const missing = needs.filter((n) => !fs.existsSync(F(n)))
  if (missing.length) { rows.push({ label, state: 'skip', note: `no fixture ${missing.join(', ')} (encoder missing)` }); continue }
  const r = spawnSync(process.execPath, [QC, ...argv], { encoding: 'utf8' })
  const lines = r.stdout.split('\n').filter(Boolean)
  let j = null; try { j = JSON.parse(lines[0]) } catch {}
  const problems = []
  if (r.status !== want) problems.push(`exit ${r.status}, want ${want}`)
  if (lines.length !== 1 || !j) problems.push(`stdout is ${lines.length} line(s), want one JSON line`)
  else if (j.exit !== r.status) problems.push(`JSON exit ${j.exit} differs from process exit ${r.status}`)
  if (j && check && r.status === want) { const ok = check(j); if (ok !== true) problems.push(ok) }
  const note = j ? (j.fails?.[0] ?? j.error ?? summary(j)) : (r.stderr || '').trim().split('\n')[0]
  rows.push({ label, state: problems.length ? 'WRONG' : '=', want, got: r.status, note: problems.length ? `${problems.join('; ')} · ${note}` : note })
}
function summary (j) {
  const f = j.figures
  if (f?.w) return `${f.magic} ${f.w}x${f.h} aspect ${f.aspect_value} depth ${f.bit_depth} alpha ${f.real_alpha ? `real ${f.transparent_share}` : f.alpha_channel ? 'opaque channel' : 'none'}`
  if (j.check === 'sheet') return `${j.tiles} tiles ${j.grid} ${j.wh}`
  if (j.check === 'artifact') return `${j.files} file(s): ${(j.rows ?? []).map((r) => `${r.magic}${r.w ? ` ${r.w}x${r.h}` : ''}${r.duration_s ? ` ${r.duration_s}s` : ''}`).join(', ')}`
  return ''
}

const wrong = rows.filter((r) => r.state === 'WRONG').length
const skip = rows.filter((r) => r.state === 'skip').length
console.log(`IMG-T3 media-qc self-test · ${ffv} · node ${process.version} · fixtures ${dir}`)
for (const r of rows) console.log(`${r.state.padEnd(5)} ${r.label.padEnd(58)} ${r.state === 'skip' ? '' : `want ${r.want} got ${r.got}  `}${String(r.note).slice(0, 160)}`)
for (const s of skipped) console.log(`note  fixtures.sh: ${s}`)
const ran = rows.length - skip
console.log(JSON.stringify({ check: 'selftest', exit: wrong ? 1 : 0, cases: rows.length, ran, as_expected: ran - wrong, wrong, skipped: skip, script: QC }))
if (!keep && di < 0) fs.rmSync(dir, { recursive: true, force: true })
process.exitCode = wrong ? 1 : 0
