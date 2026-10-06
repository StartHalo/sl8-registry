#!/usr/bin/env node
// selftest.mjs: media-qc's self-test, Studio checks IMG-T3 and VID-T3 ("every mediaqc check gives the
// right exit code on good and known-bad fixtures"). It builds the synthetic fixtures (fixtures.sh) in a temp
// folder, runs every subcommand on a good and a known-bad input, and asserts the exit code, that
// stdout is exactly one JSON line, and the figures that make each check discriminate. If a check
// stops telling good from bad, a case goes wrong and this exits 1.
//
//   node selftest.mjs [--dir DIR] [--keep]
// Exit 0 every case as expected · 1 a case went wrong · 3 cannot run (ffmpeg, ffprobe or sh missing).
// A case whose fixture this ffmpeg cannot encode (webm, mp3; h264 for the stream and shimmer cases) is
// printed as skip and does not count.
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
const T = (n) => path.join(dir, 'plans', 'timeline', n)
const K = (n) => path.join(dir, 'kits', n)
const H264 = /\slibx264\s/.test(spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout ?? '')
const lacks = (n) => (n === '@h264' ? !H264 : !fs.existsSync(F(n)))
const fig = (j) => j.figures ?? {}
const has = (j, code) => (j.fails ?? []).some((f) => f.startsWith(code))
const expectFail = (code) => (j) => has(j, code) || `no ${code} in fails`

// [label, mediaqc args, expected exit, needs (fixture files, or @h264), assert(json) -> true | 'why']
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
  ['declared only video fields, on a picture', ['declared', '--plan', P('request-video-only.json'), '--file', F('wide-1280x720.png')], 3],
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
  ['sheet usage: no --out', ['sheet', F('set')], 2],

  // ======== media-qc 1.1.0 (Video Studio check VID-T3)
  // ---- streams: VQ-02 stream format, VQ-03 asked fps, AQ-01 sound present and spanning the picture
  ['streams h264 + AAC as delivered', ['streams', F('video/av.mp4'), '--audio', 'yes', '--fps', '24'], 0, ['@h264'],
    (j) => (fig(j).frames === 72 && fig(j).video_duration_s === 3 && fig(j).sample_rate === 48000 && fig(j).faststart === false) || `frames ${fig(j).frames} dur ${fig(j).video_duration_s}`],
  ['streams 24/30 fps stream-copy concat', ['streams', F('video/vfr.mp4')], 1, [],
    (j) => (j.fails.some((x) => /^VQ-02 .*variable frame rate/.test(x)) && fig(j).frames !== fig(j).frames_expected) || 'VFR or frame count not caught'],
  ['streams 96 kHz audio', ['streams', F('video/audio96k.mp4')], 1, [], (j) => (has(j, 'VQ-02') && fig(j).sample_rate === 96000) || `rate ${fig(j).sample_rate}`],
  ['streams audio 2 s short of the picture', ['streams', F('video/short-audio.mp4')], 1, [], (j) => (has(j, 'AQ-01') && fig(j).av_offset_s === 2) || `offset ${fig(j).av_offset_s}`],
  ['streams no audio where asked', ['streams', F('video/moving.mp4'), '--audio', 'yes'], 1, [], expectFail('AQ-01')],
  ['streams audio where none was asked', ['streams', F('video/av.mp4'), '--audio', 'no'], 1, [], expectFail('AQ-01')],
  ['streams not the asked fps', ['streams', F('video/av.mp4'), '--fps', '30'], 1, [], expectFail('VQ-03')],
  ['streams 4:4:4 pixel format', ['streams', F('video/yuv444.mp4')], 1, ['video/yuv444.mp4'], (j) => (has(j, 'VQ-02') && fig(j).pix_fmt === 'yuv444p') || `pix_fmt ${fig(j).pix_fmt}`],
  ['streams passes a silent track (takes catches it)', ['streams', F('video/silent-track.mp4')], 0, ['@h264']],
  ['streams on audio only', ['streams', F('tone.wav')], 1, [], expectFail('BQ-02')],
  ['streams usage: no file', ['streams'], 2],

  // ---- clipset: VQ-01 a clip that disagrees with the majority before the concat
  ['clipset three matching clips', ['clipset', F('clips-good')], 0, [], (j) => j.clips === 3 || `clips ${j.clips}`],
  ['clipset clip-02 at 30 fps', ['clipset', F('clips-bad')], 1, [], (j) => (j.fails.length === 1 && /^VQ-01 clip-02\.mp4: fps 30\/1/.test(j.fails[0])) || `fails ${j.fails}`],
  ['clipset one clip: nothing to compare', ['clipset', F('clips-good/clip-01.mp4')], 3],
  ['clipset missing folder', ['clipset', F('no-clips')], 1, [], expectFail('BQ-01')],
  ['clipset usage', ['clipset'], 2],

  // ---- motion: VQ-04 the quietest one-second window under the floor from a frozen control
  ['motion moving clip, local frozen control', ['motion', F('video/moving.mp4'), '--control', F('video/frozen.mp4')], 0, [],
    (j) => (fig(j).min_window > 30 && fig(j).control_max_window < 0.01 && fig(j).floor === 1 && j.notes.some((n) => /local control/.test(n))) || `min ${fig(j).min_window} ctrl ${fig(j).control_max_window}`],
  ['motion a still in a video container', ['motion', F('video/still.mp4'), '--control', F('video/frozen.mp4')], 1, [], (j) => (has(j, 'VQ-04') && fig(j).min_window < 0.01) || `min ${fig(j).min_window}`],
  ['motion a freeze in the middle: the minimum, not the average', ['motion', F('video/freeze-mid.mp4'), '--control', F('video/frozen.mp4')], 1, [],
    (j) => (has(j, 'VQ-04') && fig(j).mean_window > fig(j).floor && fig(j).min_window_at_s >= 1.4 && fig(j).min_window_at_s <= 2.1) || `mean ${fig(j).mean_window} at ${fig(j).min_window_at_s}`],
  ['motion route shimmer passes a local control (the known gap)', ['motion', F('video/shimmer-static.mp4'), '--control', F('video/frozen.mp4')], 0, ['video/shimmer-static.mp4'],
    (j) => (fig(j).min_window > 20 && j.notes.some((n) => /local control/.test(n))) || `min ${fig(j).min_window}`],
  ['motion route shimmer fails the route control', ['motion', F('video/shimmer-static.mp4'), '--control', F('video/route-static.mp4')], 1, ['video/shimmer-static.mp4'],
    (j) => (has(j, 'VQ-04') && fig(j).floor_from === '1.5 x control max window' && fig(j).control_max_window > 20) || `floor ${fig(j).floor} from ${fig(j).floor_from}`],
  ['motion real motion under the route shimmer', ['motion', F('video/moving-shimmer.mp4'), '--control', F('video/route-static.mp4')], 0, ['video/moving-shimmer.mp4'],
    (j) => fig(j).min_window > fig(j).floor || `min ${fig(j).min_window} floor ${fig(j).floor}`],
  ['motion --floor overrides the control', ['motion', F('video/moving.mp4'), '--control', F('video/frozen.mp4'), '--floor', '1000'], 1, [], (j) => (has(j, 'VQ-04') && fig(j).floor_from === '--floor') || `from ${fig(j).floor_from}`],
  ['motion usage: no --control', ['motion', F('video/moving.mp4')], 2],
  ['motion control missing', ['motion', F('video/moving.mp4'), '--control', F('video/no-control.mp4')], 3],
  ['motion clip missing', ['motion', F('video/nothing.mp4'), '--control', F('video/frozen.mp4')], 1, [], expectFail('BQ-01')],

  // ---- endpoints: VQ-05 first and last frames against their keyframes (SSIM floor, and closer to its own)
  ['endpoints starts on A, ends on B', ['endpoints', F('video/a-to-b.mp4'), F('video/key-a.png'), F('video/key-b.png')], 0, [],
    (j) => (fig(j).first_vs_first > 0.95 && fig(j).last_vs_last > 0.95) || `ssim ${fig(j).first_vs_first} ${fig(j).last_vs_last}`],
  ['endpoints keyframes swapped', ['endpoints', F('video/a-to-b.mp4'), F('video/key-b.png'), F('video/key-a.png')], 1, [], expectFail('VQ-05')],
  ['endpoints never leaves A, against B', ['endpoints', F('video/stays-a.mp4'), F('video/key-a.png'), F('video/key-b.png')], 1, [], expectFail('VQ-05')],
  ['endpoints near-identical keyframes: the closeness rule, not the floor', ['endpoints', F('video/stays-a.mp4'), F('video/key-a.png'), F('video/key-c.png')], 1, [],
    (j) => (fig(j).last_vs_last >= fig(j).floor && j.fails.length === 1 && /no closer/.test(j.fails[0])) || `last ${fig(j).last_vs_last} fails ${j.fails}`],
  ['endpoints usage', ['endpoints', F('video/a-to-b.mp4'), F('video/key-a.png')], 2],

  // ---- takes: AQ-01 an audio stream that spans the picture and sounds in every stretch
  ['takes tone under the picture', ['takes', F('video/av.mp4')], 0, [], (j) => fig(j).stretches[0].mean_db > -50 || `mean ${fig(j).stretches?.[0]?.mean_db}`],
  ['takes silent AAC track', ['takes', F('video/silent-track.mp4')], 1, [], (j) => (has(j, 'AQ-01') && fig(j).stretches[0].mean_db <= -80) || `mean ${fig(j).stretches?.[0]?.mean_db}`],
  ['takes no audio stream', ['takes', F('video/moving.mp4')], 1, [], expectFail('AQ-01')],
  ['takes audio short of the picture', ['takes', F('video/short-audio.mp4')], 1, [], expectFail('AQ-01')],
  ['takes a silent middle hides in one stretch', ['takes', F('video/gap-audio.mp4')], 0],
  ['takes a silent middle in three stretches', ['takes', F('video/gap-audio.mp4'), '--n', '3'], 1, [], (j) => (has(j, 'AQ-01') && /stretch 2 of 3/.test(j.fails[0])) || `fails ${j.fails}`],
  ['takes audio file alone', ['takes', F('tone.wav')], 0, [], (j) => j.notes.some((n) => /no picture/.test(n)) || 'no note'],

  // ---- loudness: AQ-03 integrated loudness and true peak (defaults -16 LUFS, -1.5 dBTP, 0.2 dB slack)
  ['loudness -16 LUFS', ['loudness', F('audio/mix-16.wav')], 0, [], (j) => Math.abs(fig(j).integrated_lufs + 16) <= 0.2 || `I ${fig(j).integrated_lufs}`],
  ['loudness -23 LUFS against -16', ['loudness', F('audio/mix-23.wav')], 1, [], (j) => (has(j, 'AQ-03') && fig(j).off_lu <= -6.5) || `off ${fig(j).off_lu}`],
  ['loudness -23 LUFS against --target -23', ['loudness', F('audio/mix-23.wav'), '--target', '-23'], 0],
  ['loudness 2 LU hot', ['loudness', F('audio/mix-14.wav')], 1, [], expectFail('AQ-03')],
  ['loudness true peak -1.4 inside the slack', ['loudness', F('audio/mix-tp14.wav')], 0, [], (j) => (fig(j).true_peak_dbtp > -1.5 && fig(j).true_peak_dbtp <= -1.3) || `TP ${fig(j).true_peak_dbtp}`],
  ['loudness true peak -1.4 with no slack', ['loudness', F('audio/mix-tp14.wav'), '--tp-slack', '0'], 1, [], expectFail('AQ-03')],
  ['loudness true peak -0.5', ['loudness', F('audio/mix-peak.wav')], 1, [], (j) => j.fails.some((x) => /^AQ-03 .*true peak/.test(x)) || `fails ${j.fails}`],
  ['loudness no audio stream', ['loudness', F('video/moving.mp4')], 1, [], expectFail('AQ-01')],
  ['loudness usage: bad --target', ['loudness', F('audio/mix-16.wav'), '--target', 'loud'], 2],

  // ---- plan-measured: AQ-02 the plan's timing against the takes that exist; a missing take is exit 3
  ['plan-measured takes fit and spread', ['plan-measured', T('plan-good.json')], 0, [],
    (j) => (fig(j).largest_gap_s === 0.8 && fig(j).thirds.every(Boolean) && fig(j).rows.every((r) => r.measured_s === 2.2)) || `gap ${fig(j).largest_gap_s}`],
  ['plan-measured typed, not measured', ['plan-measured', T('plan-typed.json')], 1, [], (j) => (has(j, 'AQ-02') && /typed, not measured/.test(j.fails[0])) || `fails ${j.fails}`],
  ['plan-measured a take overruns its window', ['plan-measured', T('plan-overrun.json')], 1, [], (j) => (has(j, 'AQ-02') && /overrun/.test(j.fails[0])) || `fails ${j.fails}`],
  ['plan-measured a take opens before its shot', ['plan-measured', T('plan-early.json')], 1, [], (j) => (has(j, 'AQ-02') && /before its shot/.test(j.fails[0])) || `fails ${j.fails}`],
  ['plan-measured a 2.8 s gap and a 2.7 s tail', ['plan-measured', T('plan-gap.json')], 1, [], (j) => (j.fails.length === 2 && fig(j).largest_gap_s === 2.8 && fig(j).tail_s === 2.7) || `fails ${j.fails}`],
  ['plan-measured a silent shot is intended silence', ['plan-measured', T('plan-silent-shot.json')], 0, [], (j) => fig(j).gaps.some((g) => g.s > 2.5 && g.exempt_by_shots) || 'no exempt gap'],
  ['plan-measured the duck timeline', ['plan-measured', T('plan-duck.json')], 0],
  ['plan-measured takes missing', ['plan-measured', P('timeline-noaudio/plan.json')], 3, [], (j) => /missing takes/.test(j.error) || `error ${j.error}`],
  ['plan-measured plan with no rows', ['plan-measured', T('plan-norows.json')], 3],
  ['plan-measured plan missing', ['plan-measured', T('no-plan.json')], 3],
  ['plan-measured usage', ['plan-measured'], 2],

  // ---- duck: AQ-04 two ways: speech 9 LU over the bed under it; the bed within 12 dB of its own level, never silent
  ['duck an 8 dB duck', ['duck', T('duck/mix-ducked.wav'), '--bed', T('duck/bed-ducked.wav'), '--plan', T('plan-duck.json')], 0, [],
    (j) => (fig(j).separation_lu >= 9 && fig(j).duck_depth_db >= 6 && fig(j).duck_depth_db <= 9) || `sep ${fig(j).separation_lu} depth ${fig(j).duck_depth_db}`],
  ['duck the same mix normalised 6 dB up', ['duck', T('duck/mix-ducked-norm.wav'), '--bed', T('duck/bed-ducked.wav'), '--plan', T('plan-duck.json')], 0, [],
    (j) => Math.abs(fig(j).stem_gain_db - 6) <= 0.2 || `gain ${fig(j).stem_gain_db}`],
  ['duck no duck: bed too loud', ['duck', T('duck/mix-loud.wav'), '--bed', T('duck/bed-loud.wav'), '--plan', T('plan-duck.json')], 1, [],
    (j) => (j.fails.length === 1 && /^AQ-04 bed too loud/.test(j.fails[0]) && fig(j).separation_lu < 9) || `fails ${j.fails}`],
  ['duck the bed muted under speech', ['duck', T('duck/mix-muted.wav'), '--bed', T('duck/bed-muted.wav'), '--plan', T('plan-duck.json')], 1, [],
    (j) => j.fails.some((x) => /^AQ-04 bed vanished: the bed is digital silence/.test(x)) || `fails ${j.fails}`],
  ['duck the bed 15 dB under speech', ['duck', T('duck/mix-deep.wav'), '--bed', T('duck/bed-deep.wav'), '--plan', T('plan-duck.json')], 1, [],
    (j) => (j.fails.length === 1 && /^AQ-04 bed vanished: the bed drops/.test(j.fails[0]) && fig(j).separation_lu >= 9) || `fails ${j.fails}`],
  ['duck the mix does not follow the plan', ['duck', T('duck/mix-ducked.wav'), '--bed', T('duck/bed-ducked.wav'), '--plan', T('plan-duck-long.json')], 3],
  ['duck bed stem missing', ['duck', T('duck/mix-ducked.wav'), '--bed', T('duck/no-bed.wav'), '--plan', T('plan-duck.json')], 3],
  ['duck usage: no --bed', ['duck', T('duck/mix-ducked.wav'), '--plan', T('plan-duck.json')], 2],

  // ---- identical: BQ-03 copies that differ, or are links rather than copies
  ['identical two real copies', ['identical', K('kit'), K('copy-1'), K('copy-2')], 0, [], (j) => (fig(j).shared === 2 && fig(j).identical === 2) || `shared ${fig(j).shared}`],
  ['identical one byte changed', ['identical', K('kit'), K('copy-changed')], 1, [], (j) => (has(j, 'BQ-03') && /side\.jpg: differs/.test(j.fails[0])) || `fails ${j.fails}`],
  ['identical a linked folder', ['identical', K('kit'), K('copy-link')], 1, [], (j) => (has(j, 'BQ-03') && /a link to/.test(j.fails[0])) || `fails ${j.fails}`],
  ['identical a hard link', ['identical', K('kit'), K('copy-hard')], 1, [], (j) => (has(j, 'BQ-03') && /hard-linked/.test(j.fails[0])) || `fails ${j.fails}`],
  ['identical nothing in common', ['identical', K('kit'), K('elsewhere')], 1, [], expectFail('BQ-03')],
  ['identical a copy missing', ['identical', K('kit'), K('nothere')], 1, [], expectFail('BQ-01')],
  ['identical usage: one folder', ['identical', K('kit')], 2],

  // ---- declared on a video: VQ-03 duration (max 1 s, 10%) and fps; AQ-01 sound declared vs carried
  ['declared video as declared', ['declared', '--plan', P('request-video.json'), '--file', F('video/av.mp4')], 0, [],
    (j) => ['duration_s', 'fps', 'audio'].every((k) => j.compared.some((r) => r.field === k && r.match)) || 'video fields not compared'],
  ['declared sound, delivered a silent track', ['declared', '--plan', P('request-video.json'), '--file', F('video/silent-track.mp4')], 1, [], expectFail('AQ-01')],
  ['declared sound, delivered no audio', ['declared', '--plan', P('request-video.json'), '--file', F('video/moving.mp4')], 1, [], expectFail('AQ-01')],
  ['declared 8 s at 30 fps, delivered 3 s at 24', ['declared', '--plan', P('request-video-8s.json'), '--file', F('video/av.mp4')], 1, [],
    (j) => j.fails.filter((x) => x.startsWith('VQ-03')).length === 2 || `fails ${j.fails}`],
  ['declared "4s" with audio off', ['declared', '--plan', P('request-video-off.json'), '--file', F('video/moving.mp4')], 0],
  ['declared audio off, delivered sound', ['declared', '--plan', P('request-video-off.json'), '--file', F('video/av.mp4')], 1, [], expectFail('AQ-01')]
]

const rows = []
for (const [label, argv, want, needs = [], check] of CASES) {
  const missing = needs.filter(lacks)
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
  if (f?.w && f.bit_depth != null) return `${f.magic} ${f.w}x${f.h} aspect ${f.aspect_value} depth ${f.bit_depth} alpha ${f.real_alpha ? `real ${f.transparent_share}` : f.alpha_channel ? 'opaque channel' : 'none'}`
  if (j.check === 'sheet') return `${j.tiles} tiles ${j.grid} ${j.wh}`
  if (f?.min_window != null) return `min window ${f.min_window} at ${f.min_window_at_s}s, control max ${f.control_max_window}, floor ${f.floor}`
  if (f?.integrated_lufs !== undefined) return `${f.integrated_lufs} LUFS, true peak ${f.true_peak_dbtp} dBTP`
  if (f?.separation_lu !== undefined) return `speech ${f.separation_lu} LU over the bed, duck ${f.duck_depth_db} dB, stem gain ${f.stem_gain_db} dB`
  if (f?.largest_gap_s !== undefined) return `${f.takes} takes, largest gap ${f.largest_gap_s}s, tail ${f.tail_s}s, thirds ${f.thirds}`
  if (f?.first_vs_first !== undefined) return `ssim first ${f.first_vs_first} (other ${f.first_vs_last}), last ${f.last_vs_last} (other ${f.last_vs_first})`
  if (f?.stretches) return `audio ${f.audio_duration_s}s / picture ${f.video_duration_s ?? 'none'}s, mean ${f.stretches.map((x) => x.mean_db).join(', ')} dB`
  if (f?.frames_expected !== undefined) return `${f.video_codec} ${f.pix_fmt} ${f.fps}/${f.fps_avg} fps ${f.frames}/${f.frames_expected} frames, audio ${f.audio_codec ?? 'none'} ${f.sample_rate ?? ''}`
  if (f?.shared !== undefined) return `${f.copies} copies, ${f.identical}/${f.shared} shared files identical`
  if (j.check === 'clipset') return `${j.clips} clips agree: ${Object.values(j.majority ?? {}).join(' ')}`
  if (j.check === 'artifact') return `${j.files} file(s): ${(j.rows ?? []).map((r) => `${r.magic}${r.w ? ` ${r.w}x${r.h}` : ''}${r.duration_s ? ` ${r.duration_s}s` : ''}`).join(', ')}`
  return ''
}

const wrong = rows.filter((r) => r.state === 'WRONG').length
const skip = rows.filter((r) => r.state === 'skip').length
console.log(`IMG-T3 / VID-T3 media-qc self-test · ${ffv} · node ${process.version} · fixtures ${dir}`)
for (const r of rows) console.log(`${r.state.padEnd(5)} ${r.label.padEnd(58)} ${r.state === 'skip' ? '' : `want ${r.want} got ${r.got}  `}${String(r.note).slice(0, 160)}`)
for (const s of skipped) console.log(`note  fixtures.sh: ${s}`)
const ran = rows.length - skip
console.log(JSON.stringify({ check: 'selftest', exit: wrong ? 1 : 0, cases: rows.length, ran, as_expected: ran - wrong, wrong, skipped: skip, script: QC }))
if (!keep && di < 0) fs.rmSync(dir, { recursive: true, force: true })
process.exitCode = wrong ? 1 : 0
