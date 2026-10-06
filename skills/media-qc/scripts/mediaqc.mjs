#!/usr/bin/env node
// mediaqc.mjs: media-qc's deterministic media checks (house rule HR13: checks are scripts).
// node >= 20, ESM, no npm dependencies. Measures with ffprobe and ffmpeg only (no ImageMagick, no python).
//
// Contract, the same for every check:
//   - prints exactly ONE JSON line on stdout: {check, exit, ...figures, fails[], notes[]}
//   - exit 0 = the file is what was asked     1 = it is not (each fails[] entry starts with its QC code)
//     exit 2 = usage error                    3 = cannot check (nothing declared, no rule, a tool missing)
//   - it never prints PASS: the exit code is the verdict and the figures are the evidence (HR14).
//
// Image Studio 1.0.0
//   artifact <file|dir>...      exists, non-empty, magic bytes match the extension, first frame/second decodes
//   image    <file> [--w W] [--h H] [--aspect 16:9] [--tol 0.01] [--min-long N]
//            [--alpha required|forbidden] [--format png|jpeg|webp|gif]
//   declared --plan plan.json|request.json --file F [--id ID] [--tol 0.01] [--dur-tol 0.1]
//   sheet    <file|dir>... --out contact.jpg [--cols N] [--cell 320] [--max 48]
// Added in 1.1.0 (Video Studio 1.0.0); `declared` also compares duration_s, fps and audio
//   streams  <video> [--audio yes|no|any] [--fps N] [--vcodec h264] [--pix-fmt yuv420p]
//   clipset  <clip|dir>...                         every clip agrees with the majority before a concat
//   motion   <clip> --control <frozen clip> [--floor F]
//   endpoints <video> <first.png> <last.png> [--floor 0.8]
//   takes    <file> [--n N] [--floor -50] [--tol 0.5]
//   loudness <file> [--target -16] [--tol 1] [--tp -1.5] [--tp-slack 0.2]
//   plan-measured <plan.json> [--root DIR] [--tol 0.1] [--max-gap 2.5] [--max-tail 1.5]
//   duck     <mix> --bed <bed as mixed> --plan plan.json [--root DIR] [--min-sep 9] [--max-depth 12] [--sync-tol 1]
//   identical <dir> <dir>...                       byte-identical real copies, no links
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const VERSION = '1.1.0'
const USAGE = {
  artifact: 'artifact <file|dir>...',
  image: 'image <file> [--w W] [--h H] [--aspect W:H] [--tol 0.01] [--min-long N] [--alpha required|forbidden] [--format png|jpeg|webp|gif]',
  declared: 'declared --plan plan.json|request.json --file F [--id ID] [--tol 0.01] [--dur-tol 0.1]',
  sheet: 'sheet <file|dir>... --out contact.jpg|png [--cols N] [--cell 320] [--max 48]',
  streams: 'streams <video> [--audio yes|no|any] [--fps N] [--vcodec h264|any] [--pix-fmt yuv420p|any]',
  clipset: 'clipset <clip|dir>...',
  motion: 'motion <clip> --control <frozen clip> [--floor F]',
  endpoints: 'endpoints <video> <first.png> <last.png> [--floor 0.8]',
  takes: 'takes <file> [--n N] [--floor -50] [--tol 0.5]',
  loudness: 'loudness <file> [--target -16] [--tol 1] [--tp -1.5] [--tp-slack 0.2]',
  'plan-measured': 'plan-measured <plan.json> [--root DIR] [--tol 0.1] [--max-gap 2.5] [--max-tail 1.5]',
  duck: 'duck <mix> --bed <bed as mixed> --plan plan.json [--root DIR] [--min-sep 9] [--max-depth 12] [--sync-tol 1]',
  identical: 'identical <dir> <dir>...'
}

// ---------- exits
class Done extends Error {
  constructor (code, body) { super(body.error ?? `exit ${code}`); this.code = code; this.body = body }
}
let CMD = null
const usage = (error) => { throw new Done(2, { error, usage: USAGE[CMD] ?? Object.values(USAGE) }) }
const cannot = (error, extra = {}) => { throw new Done(3, { error, ...extra }) }

// ---------- arguments: --flag value or --flag=value; every flag takes a value
const RATIO = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/
function parse (argv, spec) {
  const pos = []; const opt = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { pos.push(a); continue }
    const eq = a.indexOf('=')
    const k = eq > 0 ? a.slice(2, eq) : a.slice(2)
    const v = eq > 0 ? a.slice(eq + 1) : argv[++i]
    if (!(k in spec)) usage(`unknown option --${k}`)
    if (v === undefined || v === '') usage(`--${k} needs a value`)
    const t = spec[k]
    if (t === 'int') { if (!/^\d+$/.test(v) || Number(v) < 1) usage(`--${k} must be a positive integer, got '${v}'`); opt[k] = Number(v) }
    else if (t === 'num') { const n = Number(v); if (!Number.isFinite(n) || n < 0) usage(`--${k} must be a number >= 0, got '${v}'`); opt[k] = n }
    else if (t === 'snum') { const n = Number(v); if (!Number.isFinite(n)) usage(`--${k} must be a number, got '${v}'`); opt[k] = n }
    else if (t === 'ratio') { if (!RATIO.test(v)) usage(`--${k} must be W:H such as 16:9, got '${v}'`); opt[k] = v }
    else if (Array.isArray(t)) { if (!t.includes(v)) usage(`--${k} must be one of ${t.join('|')}, got '${v}'`); opt[k] = v }
    else opt[k] = v
  }
  return { pos, opt }
}

// ---------- tools
// ffmpeg's first error line is the cause; later lines are the pipeline unwinding. Strip the [demuxer @ 0x..] tags.
const firstError = (s) => (String(s ?? '').split('\n').map((l) => l.replace(/^(\[[^\]]*\]\s*)+/, '').trim()).find(Boolean) ?? '')
function tool (bin, args, binary = false) {
  const r = spawnSync(bin, args, { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.error?.code === 'ENOENT') cannot(`${bin} is not installed on this machine; report it, do not install it (HR21)`)
  if (r.error) cannot(`${bin} could not run: ${r.error.message}`)
  return r
}
function ffprobe (file) {
  const r = tool('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file])
  if (r.status !== 0) return { ok: false, error: firstError(r.stderr) || `ffprobe exit ${r.status}`, streams: [] }
  try { const j = JSON.parse(r.stdout); return { ok: true, streams: j.streams ?? [], format: j.format ?? {} } } catch { return { ok: false, error: 'ffprobe printed no JSON', streams: [] } }
}
// null when the first video frame (sel 'v') or the first second of audio (sel 'a') decodes, else the error
function decodeError (file, sel) {
  const r = tool('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-map', `0:${sel}:0`, ...(sel === 'v' ? ['-frames:v', '1'] : ['-t', '1']), '-f', 'null', '-'])
  return r.status === 0 ? null : (firstError(r.stderr) || `ffmpeg exit ${r.status}`)
}
function tmpDir (tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `mediaqc-${tag}-`)) }

// ---------- kinds by magic bytes
const ascii = (b, s, e) => b.toString('latin1', s, e)
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const MOV_ATOMS = ['moov', 'wide', 'mdat', 'free', 'skip', 'pnot']
const KINDS = {
  png: { media: 'image', ext: ['png'], test: (b) => b.subarray(0, 8).equals(PNG_SIG) },
  jpeg: { media: 'image', ext: ['jpg', 'jpeg'], test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  webp: { media: 'image', ext: ['webp'], test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP' },
  gif: { media: 'image', ext: ['gif'], test: (b) => /^GIF8[79]a$/.test(ascii(b, 0, 6)) },
  mp4: { media: 'video', ext: ['mp4', 'm4v'], test: (b) => ascii(b, 4, 8) === 'ftyp' },
  mov: { media: 'video', ext: ['mov'], test: (b) => ascii(b, 4, 8) === 'ftyp' || MOV_ATOMS.includes(ascii(b, 4, 8)) },
  webm: { media: 'video', ext: ['webm'], test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  wav: { media: 'audio', ext: ['wav'], test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE' },
  mp3: { media: 'audio', ext: ['mp3'], test: (b) => ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) }
}
const KIND_OF_EXT = Object.fromEntries(Object.entries(KINDS).flatMap(([k, d]) => d.ext.map((e) => [e, k])))
const IMAGE_EXT = new Set(Object.entries(KIND_OF_EXT).filter(([, k]) => KINDS[k].media === 'image').map(([e]) => e))
const VIDEO_EXT = new Set(Object.entries(KIND_OF_EXT).filter(([, k]) => KINDS[k].media === 'video').map(([e]) => e))
const extOf = (f) => path.extname(f).slice(1).toLowerCase()
const normFormat = (f) => { const s = String(f).toLowerCase(); return s === 'jpg' ? 'jpeg' : s }
function sniff (b) {
  for (const k of ['png', 'jpeg', 'gif', 'webp', 'wav', 'webm']) if (KINDS[k].test(b)) return k
  if (ascii(b, 4, 8) === 'ftyp') return ascii(b, 8, 12) === 'qt  ' ? 'mov' : 'mp4'
  if (MOV_ATOMS.includes(ascii(b, 4, 8))) return 'mov'
  if (KINDS.mp3.test(b)) return 'mp3'
  if (b.length && [...b].every((c) => c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c >= 128)) return 'text'
  return 'unknown'
}
function head (file, n = 64) {
  const fd = fs.openSync(file, 'r')
  try { const b = Buffer.alloc(n); return b.subarray(0, fs.readSync(fd, b, 0, n, 0)) } finally { fs.closeSync(fd) }
}
function walk (dir, depth = 0, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (depth < 6) walk(p, depth + 1, out) } else if (e.isFile()) out.push(p)
  }
  return out
}

// ---------- picture measurement, shared by image, declared and sheet
const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d
const gcd = (a, b) => (b ? gcd(b, a % b) : a)
const NAMED = ['1:1', '5:4', '4:5', '4:3', '3:4', '3:2', '2:3', '16:10', '10:16', '16:9', '9:16', '21:9', '9:21']
const ratioValue = (r) => { const m = RATIO.exec(r); return Number(m[1]) / Number(m[2]) }
const ALPHA_FMT = /^(rgba|bgra|argb|abgr|ya8|ya16|yuva|gbrap|rgba64|bgra64|pal8|rgbaf)/
function bitDepth (kind, b, v) {
  if (kind === 'png' && b.length >= 26 && ascii(b, 12, 16) === 'IHDR') return b[24]
  const raw = Number(v.bits_per_raw_sample); if (raw > 0) return raw
  const p = /p(9|10|12|14|16)(le|be)$/.exec(v.pix_fmt ?? ''); if (p) return Number(p[1])
  return /(48|64)(le|be)?$|gray16|ya16/.test(v.pix_fmt ?? '') ? 16 : 8
}
function alphaStats (file) {
  const r = tool('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-frames:v', '1', '-vf', 'format=rgba,alphaextract', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], true)
  if (r.status !== 0 || !r.stdout.length) return null
  let min = 255; let partial = 0; let clear = 0
  for (const a of r.stdout) { if (a < min) min = a; if (a < 255) partial++; if (a === 0) clear++ }
  return { alpha_min: min, transparent_share: round(partial / r.stdout.length), clear_share: round(clear / r.stdout.length) }
}
// -> { ok, figures, fails }: ok means a picture was measured; fails carry BQ-01 / BQ-02.
// A video also gets duration_s (its video stream), fps and audio, which `declared` compares.
function measure (file) {
  const base = path.basename(file); const figures = {}
  if (!fs.existsSync(file)) return { ok: false, figures, fails: [`BQ-01 ${file}: does not exist`] }
  const st = fs.statSync(file)
  if (!st.isFile()) return { ok: false, figures, fails: [`BQ-01 ${file}: not a file`] }
  figures.bytes = st.size
  if (!st.size) return { ok: false, figures, fails: [`BQ-01 ${base}: empty (0 bytes)`] }
  const b = head(file); const ext = extOf(file); const magic = sniff(b); const fails = []
  Object.assign(figures, { ext, magic })
  if (KIND_OF_EXT[ext] && !KINDS[KIND_OF_EXT[ext]].test(b)) fails.push(`BQ-02 ${base}: named .${ext} but the bytes are ${magic}`)
  const pr = ffprobe(file)
  const v = pr.streams.find((s) => s.codec_type === 'video' && s.width > 0 && s.height > 0)
  if (!v) return { ok: false, figures, fails: [...fails, `BQ-02 ${base}: no picture ffprobe can read (${pr.ok ? 'no video stream with a size' : pr.error})`] }
  const w = v.width; const h = v.height; const g = gcd(w, h)
  Object.assign(figures, { codec: v.codec_name, w, h })
  const err = decodeError(file, 'v')
  if (err) return { ok: false, figures, fails: [...fails, `BQ-02 ${base}: ffprobe reads ${w}x${h} but the first frame does not decode (${err})`] }
  const near = NAMED.map((n) => ({ n, off: Math.abs(w / h - ratioValue(n)) / ratioValue(n) })).sort((x, y) => x.off - y.off)[0]
  const hasAlpha = ALPHA_FMT.test(v.pix_fmt ?? '')
  const a = hasAlpha ? alphaStats(file) : null
  if (hasAlpha && !a) fails.push(`BQ-02 ${base}: the alpha plane could not be read`)
  Object.assign(figures, {
    long_side: Math.max(w, h),
    aspect: `${w / g}:${h / g}`,
    aspect_value: round(w / h),
    nearest_aspect: near.n,
    nearest_off_pct: round(near.off * 100, 2),
    pix_fmt: v.pix_fmt,
    bit_depth: bitDepth(magic, b, v),
    alpha_channel: hasAlpha,
    real_alpha: !!a && a.alpha_min < 255,
    alpha_min: a ? a.alpha_min : 255,
    transparent_share: a ? a.transparent_share : 0
  })
  if (KINDS[magic]?.media === 'video') {
    const s = streamsFrom(pr)
    Object.assign(figures, { duration_s: s.vdur == null ? null : round(s.vdur, 3), container_duration_s: s.cdur == null ? null : round(s.cdur, 3), fps: round(rat(v.r_frame_rate), 3), audio: s.a ? `${s.a.codec_name} ${s.a.sample_rate}Hz ${s.a.channels}ch` : null })
  }
  return { ok: true, figures, fails }
}

// spec: { w, h, short_side, aspect, tol, min_long, format, alpha, duration_s, dur_tol, fps, audio } -> rows + fails
// (IQ-03 size, IQ-04 format, IQ-05 alpha, VQ-03 duration or fps, AQ-01 sound)
function compare (m, spec) {
  const rows = []; const fails = []
  const row = (field, want, got, match, why, extra = {}) => { rows.push({ field, want, got, match, ...extra }); if (!match) fails.push(why) }
  const tol = spec.tol ?? 0.01
  if (spec.w != null) row('w', spec.w, m.w, m.w === spec.w, `IQ-03 width ${m.w} is not ${spec.w}`)
  if (spec.h != null) row('h', spec.h, m.h, m.h === spec.h, `IQ-03 height ${m.h} is not ${spec.h}`)
  if (spec.short_side != null) { const s = Math.min(m.w, m.h); row('short_side', spec.short_side, s, s === spec.short_side, `IQ-03 ${m.w}x${m.h}: short side ${s} is not ${spec.short_side} (${spec.short_side}p)`) }
  if (spec.aspect) {
    const want = ratioValue(spec.aspect); const off = Math.abs(m.w / m.h - want) / want
    row('aspect', `${spec.aspect} (${round(want)})`, `${m.aspect} (${m.aspect_value})`, off <= tol,
      `IQ-03 aspect ${m.w}x${m.h} = ${m.aspect_value} is ${round(off * 100, 2)}% off ${spec.aspect} (${round(want)}); tolerance ${round(tol * 100, 2)}%`,
      { off_pct: round(off * 100, 2), tol_pct: round(tol * 100, 2) })
  }
  if (spec.min_long != null) row('min_long', spec.min_long, m.long_side, m.long_side >= spec.min_long, `IQ-03 long side ${m.long_side} is under ${spec.min_long}`)
  if (spec.format) row('format', spec.format, m.magic, m.magic === spec.format, `IQ-04 the bytes are ${m.magic}, asked ${spec.format}`)
  if (spec.alpha) {
    const got = m.real_alpha ? `transparent ${round(m.transparent_share * 100, 2)}% (min alpha ${m.alpha_min})` : (m.alpha_channel ? 'alpha channel, every pixel opaque' : 'no alpha channel')
    if (spec.alpha === 'required') row('alpha', 'required', got, m.real_alpha, `IQ-05 no real transparency: ${got}`)
    else row('alpha', 'forbidden', got, !m.real_alpha, `IQ-05 transparency where none is allowed: ${got}`)
  }
  if (spec.duration_s != null) {
    const dt = Math.max(1, (spec.dur_tol ?? 0.1) * spec.duration_s); const off = m.duration_s == null ? Infinity : Math.abs(m.duration_s - spec.duration_s)
    row('duration_s', spec.duration_s, m.duration_s, off <= dt, `VQ-03 the picture runs ${m.duration_s} s, declared ${spec.duration_s} s (${round(off, 3)} s off; tolerance ${round(dt, 3)} s)`, { off_s: round(off, 3), tol_s: round(dt, 3) })
  }
  if (spec.fps != null) row('fps', spec.fps, m.fps, Math.abs(m.fps - spec.fps) <= 0.01, `VQ-03 ${m.fps} fps, declared ${spec.fps}`)
  if (spec.audio) {
    const sounding = !!m.audio && m.audio_mean_db != null && m.audio_mean_db > SILENT_DB
    const got = !m.audio ? 'no audio stream' : `${m.audio}, mean ${m.audio_mean_db ?? '-inf'} dB${sounding ? '' : ' (silent)'}`
    if (spec.audio === 'required') row('audio', 'required', got, sounding, `AQ-01 sound declared, but ${got}`)
    else row('audio', 'forbidden', got, !sounding, `AQ-01 declared silent, but the file carries sound: ${got}`)
  }
  return { rows, fails }
}

// ---------- artifact: is each deliverable what its name says? (BQ-01 nothing delivered, BQ-02 wrong kind)
function artifact (argv) {
  const { pos } = parse(argv, {})
  if (!pos.length) usage('name at least one file or folder')
  const files = []; const fails = []; const notes = []
  for (const p of pos) {
    if (!fs.existsSync(p)) { fails.push(`BQ-01 ${p}: does not exist`); continue }
    if (!fs.statSync(p).isDirectory()) { files.push(p); continue }
    const inside = walk(p).filter((f) => KIND_OF_EXT[extOf(f)])
    if (!inside.length) fails.push(`BQ-01 ${p}: no media file inside (${Object.keys(KIND_OF_EXT).join(', ')})`)
    files.push(...inside)
  }
  const rows = []; let unchecked = 0
  for (const f of files) {
    const base = path.basename(f); const ext = extOf(f); const kind = KIND_OF_EXT[ext]
    const size = fs.statSync(f).size
    const r = { file: f, bytes: size, ext }
    rows.push(r)
    if (!size) { fails.push(`BQ-01 ${base}: empty (0 bytes)`); continue }
    const b = head(f); r.magic = sniff(b)
    if (!kind) { unchecked++; notes.push(`${base}: no magic rule for .${ext || '(none)'}; its kind was not checked`); continue }
    if (!KINDS[kind].test(b)) { fails.push(`BQ-02 ${base}: named .${ext} but the bytes are ${r.magic}`); continue }
    const pr = ffprobe(f)
    const v = pr.streams.find((s) => s.codec_type === 'video' && s.width > 0 && s.height > 0)
    const a = pr.streams.find((s) => s.codec_type === 'audio')
    const media = KINDS[kind].media
    const seen = pr.streams.map((s) => s.codec_type === 'video' ? `video ${s.width ?? 0}x${s.height ?? 0}` : s.codec_type).join(', ') || 'none'
    if (!pr.ok || (media === 'audio' ? !a : !v)) { fails.push(`BQ-02 ${base}: ffprobe finds no ${media === 'audio' ? 'audio stream' : 'picture with a size'} (${pr.ok ? `streams: ${seen}` : pr.error})`); continue }
    if (v) Object.assign(r, { codec: v.codec_name, w: v.width, h: v.height })
    if (media !== 'image') Object.assign(r, { duration_s: round(Number(pr.format.duration) || 0, 3), audio: a ? `${a.codec_name} ${a.sample_rate}Hz ${a.channels}ch` : null })
    const err = decodeError(f, media === 'audio' ? 'a' : 'v')
    if (err) fails.push(`BQ-02 ${base}: does not decode (${err})`)
  }
  const code = fails.length ? 1 : (unchecked && unchecked === files.length) ? 3 : 0
  return [code, { files: files.length, rows: rows.slice(0, 50), fails, notes }]
}

// ---------- image: measure one picture, compare with what the flags ask
function image (argv) {
  const { pos, opt } = parse(argv, { w: 'int', h: 'int', aspect: 'ratio', tol: 'num', 'min-long': 'int', alpha: ['required', 'forbidden'], format: ['png', 'jpeg', 'jpg', 'webp', 'gif'] })
  if (pos.length !== 1) usage('image takes exactly one file')
  const spec = { w: opt.w, h: opt.h, aspect: opt.aspect, tol: opt.tol, min_long: opt['min-long'], alpha: opt.alpha, format: opt.format && normFormat(opt.format) }
  const m = measure(pos[0]); const notes = []
  if (!m.ok) return [1, { file: pos[0], figures: m.figures, compared: [], fails: m.fails, notes }]
  const c = compare(m.figures, spec)
  if (!c.rows.length) notes.push('no expectation given: figures only')
  const fails = [...m.fails, ...c.fails]
  return [fails.length ? 1 : 0, { file: pos[0], figures: m.figures, compared: c.rows, fails, notes }]
}

// ---------- declared: delivered vs the declaration in the plan, request record or manifest (HR1)
// A declaration is a `declared` object (media-ai-gen's manifest rows and plan.json carry one). It is
// looked up on the entry that names the file (a key file|path|output|out|local_path, or a files[]
// entry, object or string), else on an object above that entry, else at the root; flat fields at
// the root of a request record also count. --id picks the entry instead: an exact `id` ("hero#2"),
// else the LAST entry with that `item` (the latest attempt), else the first with that `node`/`name`.
const DECL_KEYS = ['w', 'width', 'h', 'height', 'resolution', 'size', 'aspect', 'aspect_ratio', 'format', 'alpha', 'min_long', 'duration_s', 'duration', 'dur_s', 'fps', 'audio']
const VIDEO_FIELDS = ['duration_s', 'fps', 'audio'] // compared on a video; a picture lists them as unchecked
const DECL_FORMATS = new Set(['png', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'webm'])
const AUDIO_OFF = new Set(['false', 'off', 'no', 'none', 'silent', 'mute', 'muted', 'forbidden'])
const SILENT_DB = -60 // mean volume at or under this is an empty track (the Video machine's audio skill, Step 4)
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o)
function findDeclaration (doc, file, id) {
  const base = path.basename(file)
  const refs = (o) => [...['file', 'path', 'output', 'out', 'local_path'].map((k) => o[k]), ...(Array.isArray(o.files) ? o.files : [])].filter((v) => typeof v === 'string')
  const nodes = [] // every object, in document order, with its trail and the objects above it
  const visit = (node, trail, up) => {
    if (Array.isArray(node)) { node.forEach((c, i) => visit(c, `${trail}[${i}]`, up)); return }
    if (!isObj(node)) return
    nodes.push({ node, trail, up })
    for (const [k, v] of Object.entries(node)) if (k !== 'declared' && k !== 'measured') visit(v, trail ? `${trail}.${k}` : k, [{ node, trail }, ...up])
  }
  visit(doc, '', [])
  const is = (n, k) => n.node[k] != null && String(n.node[k]) === String(id)
  const hit = id != null
    ? (nodes.find((n) => is(n, 'id')) ?? nodes.filter((n) => is(n, 'item')).pop() ?? nodes.find((n) => is(n, 'node') || is(n, 'name')))
    : nodes.find((n) => refs(n.node).some((r) => r === file || path.basename(r) === base))
  if (id != null && !hit) return { miss: `no entry with id, item, node or name '${id}'` }
  const chain = hit ? [{ node: hit.node, trail: hit.trail }, ...hit.up] : [{ node: doc, trail: '' }]
  const entry = hit ? hit.trail || '(root)' : null
  for (const c of chain) if (isObj(c.node.declared)) return { decl: c.node.declared, where: `${c.trail || '(root)'}.declared`, entry }
  if (isObj(doc) && DECL_KEYS.some((k) => k in doc)) return { decl: Object.fromEntries(DECL_KEYS.filter((k) => k in doc).map((k) => [k, doc[k]])), where: '(root, flat fields)', entry }
  return { miss: hit ? `${entry} names ${id != null ? `'${id}'` : base} but nothing on it or above it is a 'declared' object` : `nothing in the record names ${base}, and its root declares nothing` }
}
// seconds from 4, 4.0, "4", "4s", "4.5 s"; null for anything else
const secs = (v) => { if (typeof v === 'number') return Number.isFinite(v) ? v : null; const m = /^\s*(\d+(?:\.\d+)?)\s*s?\s*$/i.exec(String(v ?? '')); return m ? Number(m[1]) : null }
function normaliseDeclared (d) {
  const spec = {}; const notes = []
  const int = (k, v) => { if (v == null) return undefined; if (/^\d+$/.test(String(v))) return Number(v); notes.push(`${k} '${v}' is not a whole number; not compared`) }
  spec.w = int('w', d.w ?? d.width); spec.h = int('h', d.h ?? d.height); spec.min_long = int('min_long', d.min_long)
  const res = d.resolution ?? d.size
  if (res != null) {
    const s = String(res).trim(); let m
    if ((m = /^(\d{2,5})\s*[x×]\s*(\d{2,5})$/i.exec(s))) { spec.w ??= Number(m[1]); spec.h ??= Number(m[2]) } else if ((m = /^(\d{3,4})p$/i.exec(s))) spec.short_side = Number(m[1]); else notes.push(`resolution '${s}' is neither WxH nor <N>p; not compared`)
  }
  const asp = d.aspect ?? d.aspect_ratio
  if (asp != null) { if (RATIO.test(String(asp).trim())) spec.aspect = String(asp).trim(); else notes.push(`aspect '${asp}' is not W:H; not compared`) }
  if (d.format != null) { const f = normFormat(d.format); if (DECL_FORMATS.has(f)) spec.format = f; else notes.push(`format '${d.format}' is not one media-qc reads by magic bytes; not compared`) }
  if (d.alpha != null) { const a = d.alpha === true ? 'required' : d.alpha === false ? 'forbidden' : String(d.alpha); if (a === 'required' || a === 'forbidden') spec.alpha = a; else notes.push(`alpha '${d.alpha}' is not required|forbidden|true|false; not compared`) }
  const dur = d.duration_s ?? d.duration ?? d.dur_s
  if (dur != null) { const s = secs(dur); if (s != null && s > 0) spec.duration_s = s; else notes.push(`duration '${dur}' is not a number of seconds; not compared`) }
  if (d.fps != null) { const f = Number(d.fps); if (Number.isFinite(f) && f > 0) spec.fps = f; else notes.push(`fps '${d.fps}' is not a number; not compared`) }
  if (d.audio != null) { const a = String(d.audio).trim().toLowerCase(); if (a === 'n/a' || a === '') notes.push(`audio '${d.audio}': not compared`); else spec.audio = AUDIO_OFF.has(a) ? 'forbidden' : 'required' }
  for (const k of Object.keys(spec)) if (spec[k] === undefined) delete spec[k]
  return { spec, notes }
}
function declared (argv) {
  const { pos, opt } = parse(argv, { plan: 'str', file: 'str', id: 'str', tol: 'num', 'dur-tol': 'num' })
  if (pos.length) usage(`unexpected argument '${pos[0]}'`)
  if (!opt.plan || !opt.file) usage('declared needs --plan and --file')
  if (!fs.existsSync(opt.plan)) cannot(`no plan or request record at ${opt.plan}: nothing was declared, so nothing can be compared (HR1: declare before generating)`, { file: opt.file, plan: opt.plan })
  let doc
  try { doc = JSON.parse(fs.readFileSync(opt.plan, 'utf8')) } catch (e) { cannot(`${opt.plan} is not JSON (${e.message}); fix the record, then re-run`, { file: opt.file, plan: opt.plan }) }
  const found = findDeclaration(doc, opt.file, opt.id)
  if (found.miss) cannot(`no declaration for ${path.basename(opt.file)}: ${found.miss}`, { file: opt.file, plan: opt.plan })
  const { spec, notes } = normaliseDeclared(found.decl)
  if (!Object.keys(spec).length) cannot(`the declaration at ${found.where} has no field media-qc compares (w, h, resolution, aspect, format, alpha, min_long, duration_s, fps, audio)`, { file: opt.file, plan: opt.plan, where: found.where, declared: found.decl, notes })
  Object.assign(spec, { tol: opt.tol, dur_tol: opt['dur-tol'] })
  const m = measure(opt.file); const unchecked = []
  const base = { file: opt.file, plan: opt.plan, where: found.where, entry: found.entry, declared: found.decl }
  if (!m.ok) return [1, { ...base, figures: m.figures, compared: [], unchecked, fails: m.fails, notes }]
  if (m.figures.duration_s === undefined) { // a picture: it has no duration, fps or audio
    for (const k of VIDEO_FIELDS) if (spec[k] != null) { unchecked.push(k); delete spec[k] }
    if (unchecked.length) notes.push(`${unchecked.join(', ')} declared, but ${path.basename(opt.file)} is a picture: not compared`)
    if (!Object.keys(spec).some((k) => spec[k] != null && k !== 'tol' && k !== 'dur_tol')) return [3, { ...base, figures: m.figures, compared: [], unchecked, error: `the declaration at ${found.where} holds only video fields and ${path.basename(opt.file)} is a picture`, notes }]
  }
  if (spec.audio && m.figures.audio) m.figures.audio_mean_db = meanDb(opt.file)
  const c = compare(m.figures, spec)
  const fails = [...m.fails, ...c.fails]
  return [fails.length ? 1 : 0, { ...base, figures: m.figures, compared: c.rows, unchecked, fails, notes }]
}

// ---------- sheet: one contact sheet from a set of pictures (ffmpeg scale + pad + tile; no drawtext)
function sheet (argv) {
  const { pos, opt } = parse(argv, { out: 'str', cols: 'int', cell: 'int', max: 'int' })
  if (!opt.out) usage('sheet needs --out <file.jpg|png>')
  if (!['jpg', 'jpeg', 'png'].includes(extOf(opt.out))) usage('--out must end in .jpg, .jpeg or .png')
  if (!pos.length) usage('name the pictures or a folder of them')
  const outAbs = path.resolve(opt.out); const fails = []; const notes = []
  let inputs = []
  for (const p of pos) {
    if (!fs.existsSync(p)) { fails.push(`BQ-01 ${p}: does not exist`); continue }
    if (fs.statSync(p).isDirectory()) inputs.push(...walk(p).filter((f) => IMAGE_EXT.has(extOf(f)) && path.resolve(f) !== outAbs))
    else if (!fs.statSync(p).size) fails.push(`BQ-01 ${path.basename(p)}: empty (0 bytes)`)
    else inputs.push(p)
  }
  if (!inputs.length && !fails.length) fails.push(`BQ-01 ${pos.join(' ')}: no picture to put on a sheet`)
  if (fails.length) return [1, { out: opt.out, tiles: 0, fails, notes }]
  const max = opt.max ?? 48
  if (inputs.length > max) { notes.push(`${inputs.length - max} picture(s) after the first ${max} left off (raise --max or sheet in parts)`); inputs = inputs.slice(0, max) }
  if (inputs.some((f) => KINDS[KIND_OF_EXT[extOf(f)]]?.media === 'video')) notes.push('a video contributes its first frame only')
  const cell = opt.cell ?? 320; const cols = Math.min(opt.cols ?? Math.ceil(Math.sqrt(inputs.length)), inputs.length); const rows = Math.ceil(inputs.length / cols)
  const pad = 4; const margin = 4
  const tmp = tmpDir('sheet')
  try {
    // transparency shows as mid grey (0x6b6b6b), letterbox as 0x202020, unused cells as 0x101010
    const fit = `[0:v:0]format=rgba,scale=${cell}:${cell}:force_original_aspect_ratio=decrease,split[a][b];[a]drawbox=t=fill:c=0x6b6b6b[bg];[bg][b]overlay=format=auto,pad=${cell}:${cell}:(ow-iw)/2:(oh-ih)/2:color=0x202020,format=rgb24[o]`
    inputs.forEach((f, i) => {
      const r = tool('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-i', f, '-filter_complex', fit, '-map', '[o]', '-frames:v', '1', '-update', '1', path.join(tmp, `${String(i).padStart(3, '0')}.png`)])
      if (r.status !== 0) fails.push(`BQ-02 ${path.basename(f)}: no frame decoded for its tile (${firstError(r.stderr) || `ffmpeg exit ${r.status}`})`)
    })
    if (fails.length) return [1, { out: opt.out, tiles: 0, fails: [...fails, 'no sheet written: a sheet with a missing tile would hide the file that failed'], notes }]
    fs.mkdirSync(path.dirname(outAbs), { recursive: true })
    const r = tool('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-framerate', '1', '-i', path.join(tmp, '%03d.png'), '-vf', `tile=${cols}x${rows}:padding=${pad}:margin=${margin}:color=0x101010`, '-frames:v', '1', '-update', '1', ...(extOf(opt.out) === 'png' ? [] : ['-q:v', '2']), outAbs])
    if (r.status !== 0) return [1, { out: opt.out, tiles: 0, fails: [`BQ-01 ${opt.out}: ffmpeg did not write the sheet (${firstError(r.stderr)})`], notes }]
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
  const want = [cols * cell + (cols - 1) * pad + 2 * margin, rows * cell + (rows - 1) * pad + 2 * margin]
  const pr = ffprobe(outAbs); const v = pr.streams.find((s) => s.codec_type === 'video')
  const wh = v ? `${v.width}x${v.height}` : null
  if (wh !== `${want[0]}x${want[1]}`) fails.push(`BQ-02 ${opt.out}: the sheet measures ${wh ?? 'unreadable'}, expected ${want[0]}x${want[1]} for ${cols}x${rows} cells of ${cell}`)
  return [fails.length ? 1 : 0, { out: opt.out, tiles: inputs.length, grid: `${cols}x${rows}`, cell, wh, bytes: fs.existsSync(outAbs) ? fs.statSync(outAbs).size : 0, order: inputs.map((f) => path.basename(f)), fails, notes }]
}

// ======================================================================== media-qc 1.1.0: video and audio
// ---------- shared: presence, streams, loudness, volume
const rat = (s) => { if (s == null || s === '0/0' || s === 'N/A') return NaN; const [a, b] = String(s).split('/').map(Number); return b ? a / b : a }
const num = (x) => { if (x == null || x === '' || x === 'N/A') return null; const n = Number(x); return Number.isFinite(n) ? n : null }
const EPS = 0.05 // seconds of slack on window edges
// BQ-01 missing or empty, BQ-02 named one kind but the bytes are another
function present (file) {
  const base = path.basename(file)
  if (!fs.existsSync(file)) return { ok: false, fails: [`BQ-01 ${file}: does not exist`] }
  const st = fs.statSync(file)
  if (!st.isFile()) return { ok: false, fails: [`BQ-01 ${file}: not a file`] }
  if (!st.size) return { ok: false, fails: [`BQ-01 ${base}: empty (0 bytes)`] }
  const b = head(file); const ext = extOf(file); const magic = sniff(b)
  if (KIND_OF_EXT[ext] && !KINDS[KIND_OF_EXT[ext]].test(b)) return { ok: false, fails: [`BQ-02 ${base}: named .${ext} but the bytes are ${magic}`] }
  return { ok: true, fails: [], bytes: st.size, magic }
}
// the first video stream with a size (cover art excluded), the first audio stream, and their lengths:
// a stream's own duration where the container records one, else the container's (webm)
function streamsFrom (pr) {
  const v = pr.streams.find((s) => s.codec_type === 'video' && s.width > 0 && s.height > 0 && !s.disposition?.attached_pic)
  const a = pr.streams.find((s) => s.codec_type === 'audio')
  const cdur = num(pr.format?.duration)
  return { ok: pr.ok, error: pr.error, streams: pr.streams, format: pr.format ?? {}, v, a, cdur, vdur: v ? (num(v.duration) ?? cdur) : null, adur: a ? (num(a.duration) ?? cdur) : null }
}
const streamsOf = (file) => streamsFrom(ffprobe(file))
const seenOf = (s) => (s.ok ? `streams: ${s.streams.map((x) => x.codec_type).join(', ') || 'none'}` : s.error)
// EBU R128 (ebur128, true peak on) over the whole first audio stream, or over regions [[from, to], ...]
// cut with atrim and joined. -> { I, LRA, TP } in LUFS, LU, dBTP; null where ffmpeg prints -inf.
function lufs (file, regions) {
  const meter = 'ebur128=peak=true:framelog=verbose'
  const graph = regions?.length
    ? `[0:a:0]asplit=${regions.length}${regions.map((_, i) => `[x${i}]`).join('')};` +
      regions.map(([s, e], i) => `[x${i}]atrim=start=${s.toFixed(3)}:end=${e.toFixed(3)},asetpts=PTS-STARTPTS[t${i}]`).join(';') +
      `;${regions.map((_, i) => `[t${i}]`).join('')}concat=n=${regions.length}:v=0:a=1,${meter}[o]`
    : `[0:a:0]${meter}[o]`
  const r = tool('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-i', file, '-filter_complex', graph, '-map', '[o]', '-f', 'null', '-'])
  const at = r.stderr.lastIndexOf('Summary:')
  if (r.status !== 0 || at < 0) return { error: firstError(r.stderr.split('\n').filter((l) => /error|invalid|no such|not/i.test(l)).join('\n')) || `ebur128 printed no summary (ffmpeg exit ${r.status})` }
  const s = r.stderr.slice(at)
  const g = (rx) => { const m = rx.exec(s); return !m || m[1] === '-inf' ? null : Number(m[1]) }
  return { I: g(/I:\s+(-?[\d.]+|-inf)\s+LUFS/), LRA: g(/LRA:\s+(-?[\d.]+|-inf)\s+LU/), TP: g(/Peak:\s+(-?[\d.]+|-inf)\s+dB/) }
}
const silentLufs = (x) => x == null || x <= -69.9 // ebur128 reads -70 when every block is under its absolute gate
// volumedetect's mean volume (dB) of the first audio stream, or of [from, from+dur]; null = -inf or no reading
function meanDb (file, from, dur) {
  const r = tool('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', ...(from != null ? ['-ss', String(round(from, 3)), '-t', String(round(dur, 3))] : []), '-i', file, '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-'])
  const m = /mean_volume:\s+(-?[\d.]+|-inf) dB/.exec(r.stderr)
  return m && m[1] !== '-inf' ? Number(m[1]) : null
}
// moov before mdat = the file plays while it downloads (faststart); null when it is not an ISO/QuickTime file
function faststart (file) {
  const fd = fs.openSync(file, 'r'); const size = fs.fstatSync(fd).size; const h = Buffer.alloc(16)
  try {
    for (let at = 0, n = 0; at + 8 <= size && n < 64; n++) {
      fs.readSync(fd, h, 0, 16, at)
      let len = h.readUInt32BE(0); const type = ascii(h, 4, 8)
      if (type === 'moov') return true
      if (type === 'mdat') return false
      if (len === 1) len = Number(h.readBigUInt64BE(8)); else if (len === 0) return null
      if (len < 8) return null
      at += len
    }
  } finally { fs.closeSync(fd) }
  return null
}

// ---------- streams: is the video sound for delivery and for a concat? (VQ-02 format, VQ-03 asked fps, AQ-01 sound)
function streams (argv) {
  const { pos, opt } = parse(argv, { audio: ['yes', 'no', 'any'], fps: 'num', vcodec: 'str', 'pix-fmt': 'str' })
  if (pos.length !== 1) usage('streams takes exactly one video')
  const f = pos[0]; const base = path.basename(f); const notes = []
  const p = present(f); if (!p.ok) return [1, { file: f, figures: {}, fails: p.fails, notes }]
  const s = streamsOf(f)
  if (!s.v) return [1, { file: f, figures: {}, fails: [`BQ-02 ${base}: no video stream (${seenOf(s)})`], notes }]
  const v = s.v; const a = s.a; const fails = []
  const wantCodec = opt.vcodec ?? 'h264'; const wantPix = opt['pix-fmt'] ?? 'yuv420p'
  if (wantCodec !== 'any' && v.codec_name !== wantCodec) fails.push(`VQ-02 ${base}: video codec ${v.codec_name}, not ${wantCodec}`)
  if (wantPix !== 'any' && v.pix_fmt !== wantPix) fails.push(`VQ-02 ${base}: pixel format ${v.pix_fmt}, not ${wantPix}${v.pix_fmt === 'yuvj420p' ? ' (full range)' : ''}`)
  if (v.width % 2 || v.height % 2) fails.push(`VQ-02 ${base}: odd dimensions ${v.width}x${v.height}`)
  const sar = v.sample_aspect_ratio ?? 'N/A'
  if (!['1:1', '0:1', 'N/A'].includes(sar)) fails.push(`VQ-02 ${base}: non-square pixels (SAR ${sar})`)
  const r = rat(v.r_frame_rate); const avg = rat(v.avg_frame_rate)
  if (r > 0 && avg > 0 && Math.abs(r - avg) / r > 0.005) fails.push(`VQ-02 ${base}: variable frame rate: r_frame_rate ${v.r_frame_rate}, average ${round(avg, 3)}`)
  if (opt.fps != null && !(Math.abs(r - opt.fps) <= 0.01)) fails.push(`VQ-03 ${base}: ${round(r, 3)} fps, asked ${opt.fps}`)
  const cp = tool('ffprobe', ['-v', 'error', '-select_streams', `${v.index}`, '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f])
  const frames = num(cp.stdout.trim().split(/[\s,]/)[0])
  const expect = s.vdur != null && r > 0 ? Math.round(s.vdur * r) : null
  if (frames != null && expect != null && Math.abs(frames - expect) > Math.max(2, 0.01 * expect)) fails.push(`VQ-02 ${base}: ${frames} frames, but ${round(s.vdur, 3)} s at ${round(r, 3)} fps is ${expect}`)
  const want = opt.audio ?? 'any'
  if (want === 'yes' && !a) fails.push(`AQ-01 ${base}: no audio stream`)
  if (want === 'no' && a) fails.push(`AQ-01 ${base}: an audio stream (${a.codec_name}) where none was asked`)
  let off = null
  if (a) {
    const sr = Number(a.sample_rate)
    if (![44100, 48000].includes(sr)) fails.push(`VQ-02 ${base}: audio at ${sr} Hz, not 44.1 or 48 kHz`)
    if (s.adur != null && s.vdur != null) {
      off = round(Math.abs(s.adur - s.vdur), 3)
      if (off > 0.5) fails.push(`AQ-01 ${base}: the audio runs ${round(s.adur, 3)} s against the picture's ${round(s.vdur, 3)} s (${off} s apart; tolerance 0.5 s)`)
    }
    if (a.channels === 1) notes.push('mono audio')
  } else if (want === 'any') notes.push('no audio stream (not asked either way; --audio yes|no asks)')
  const fast = ['mp4', 'mov'].includes(p.magic) ? faststart(f) : null
  if (fast === false) notes.push('moov after mdat: no faststart, so the file cannot play until it has downloaded (ffmpeg -movflags +faststart)')
  const figures = {
    container: p.magic, video_codec: v.codec_name, w: v.width, h: v.height, pix_fmt: v.pix_fmt, sar, fps: round(r, 3), fps_avg: round(avg, 3),
    frames, frames_expected: expect, video_duration_s: s.vdur == null ? null : round(s.vdur, 3), container_duration_s: s.cdur == null ? null : round(s.cdur, 3),
    audio_codec: a?.codec_name ?? null, sample_rate: a ? Number(a.sample_rate) : null, channels: a?.channels ?? null,
    audio_duration_s: s.adur == null ? null : round(s.adur, 3), av_offset_s: off, faststart: fast
  }
  return [fails.length ? 1 : 0, { file: f, figures, fails, notes }]
}

// ---------- clipset: do the clips agree before a concat? (VQ-01) A stream-copy concat of mismatched
// clips keeps its length, so only the inputs show it.
const CLIP_FIELDS = ['codec', 'wh', 'pix_fmt', 'fps', 'sar', 'audio']
function clipset (argv) {
  const { pos } = parse(argv, {})
  if (!pos.length) usage('name the clips, or a folder of them')
  const files = []; const fails = []; const notes = []
  for (const p of pos) {
    if (!fs.existsSync(p)) { fails.push(`BQ-01 ${p}: does not exist`); continue }
    if (!fs.statSync(p).isDirectory()) { files.push(p); continue }
    const inside = fs.readdirSync(p).filter((n) => !n.startsWith('.') && VIDEO_EXT.has(extOf(n))).sort().map((n) => path.join(p, n))
    if (!inside.length) fails.push(`BQ-01 ${p}: no clip directly inside (${[...VIDEO_EXT].join(', ')})`)
    files.push(...inside)
  }
  const rows = []
  for (const f of files) {
    const p = present(f); if (!p.ok) { fails.push(...p.fails); continue }
    const s = streamsOf(f)
    if (!s.v) { fails.push(`BQ-02 ${path.basename(f)}: no video stream (${seenOf(s)})`); continue }
    const sar = ['0:1', 'N/A', undefined].includes(s.v.sample_aspect_ratio) ? '1:1' : s.v.sample_aspect_ratio
    rows.push({ file: path.basename(f), codec: s.v.codec_name, wh: `${s.v.width}x${s.v.height}`, pix_fmt: s.v.pix_fmt, fps: s.v.r_frame_rate, sar, audio: s.a ? `${s.a.codec_name} ${s.a.sample_rate}Hz ${s.a.channels}ch` : 'none' })
  }
  if (!fails.length && rows.length < 2) return [3, { clips: rows.length, rows, error: `${rows.length} clip: nothing to compare it with`, fails, notes }]
  const majority = {}
  for (const k of CLIP_FIELDS) {
    const count = new Map(); for (const r of rows) count.set(r[k], (count.get(r[k]) ?? 0) + 1)
    const ranked = [...count].sort((x, y) => y[1] - x[1]) // stable: ties keep the first clip's value
    if (!ranked.length) continue
    majority[k] = ranked[0][0]
    if (ranked.length > 1 && ranked[1][1] === ranked[0][1]) notes.push(`no majority on ${k}: ${rows[0].file}'s value ${ranked[0][0]} is the reference`)
    for (const r of rows) if (r[k] !== majority[k]) fails.push(`VQ-01 ${r.file}: ${k} ${r[k]} (the others ${majority[k]})`)
  }
  return [fails.length ? 1 : 0, { clips: rows.length, majority, rows: rows.slice(0, 50), fails, notes }]
}

// ---------- motion: did the clip move in every second? (VQ-04) The mean absolute luminance difference of
// each adjacent frame pair at the delivered size, summed over every one-second window (sliding by one
// frame); the MINIMUM window is the figure, because averaging hides a clip that freezes in its middle.
// The floor comes from a frozen control: 1.5 x the control's highest window, never under 1.0. A control
// rendered by the route itself carries the route's static shimmer; a locally frozen frame reads about 0.
function lumaDiffs (file) {
  const tmp = tmpDir('motion'); const log = path.join(tmp, 'yavg.txt')
  try {
    const r = tool('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-vf', `format=yuv420p,tblend=all_mode=difference,signalstats,metadata=mode=print:key=lavfi.signalstats.YAVG:file=${log.replace(/[\\':]/g, '\\$&')}`, '-f', 'null', '-'])
    if (r.status !== 0) return { error: firstError(r.stderr) || `ffmpeg exit ${r.status}` }
    const text = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : ''
    return { d: [...text.matchAll(/lavfi\.signalstats\.YAVG=(-?[\d.]+(?:e[-+]?\d+)?)/gi)].map((m) => Number(m[1])) }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}
function motionOf (file) {
  const base = path.basename(file)
  const p = present(file); if (!p.ok) return { fails: p.fails }
  const s = streamsOf(file)
  if (!s.v) return { fails: [`BQ-02 ${base}: no video stream (${seenOf(s)})`] }
  const fps = rat(s.v.avg_frame_rate) || rat(s.v.r_frame_rate)
  const L = lumaDiffs(file)
  if (L.error) return { fails: [`BQ-02 ${base}: the frames do not decode (${L.error})`] }
  const k = Math.max(1, Math.round(fps || 1)); const d = L.d; const w = Math.min(k, d.length); const sums = []
  for (let i = 0, acc = 0; i < d.length; i++) { acc += d[i]; if (i >= w) acc -= d[i - w]; if (i >= w - 1) sums.push(acc) }
  const fig = { w: s.v.width, h: s.v.height, fps: round(fps, 3), frames: d.length + 1, window_frames: k, windows: sums.length }
  if (!sums.length) return { fig, fails: [`VQ-04 ${base}: one frame: there is no motion to measure`] }
  let at = 0; for (let i = 1; i < sums.length; i++) if (sums[i] < sums[at]) at = i
  Object.assign(fig, { min_window: round(sums[at]), min_window_at_s: round(at / (fps || 1), 2), mean_window: round(sums.reduce((x, y) => x + y, 0) / sums.length), max_window: round(Math.max(...sums)) })
  return { fig, fails: [], short: d.length < k }
}
function motion (argv) {
  const { pos, opt } = parse(argv, { control: 'str', floor: 'num' })
  if (pos.length !== 1) usage('motion takes exactly one clip')
  if (!opt.control) usage('motion needs --control <frozen clip>: a fixed floor is how this check passes a still (render the control through the same route, or freeze the first frame locally)')
  const f = pos[0]; const base = path.basename(f); const notes = []
  const m = motionOf(f)
  if (m.fails.length) return [1, { file: f, control: opt.control, figures: m.fig ?? {}, fails: m.fails, notes }]
  const c = motionOf(opt.control)
  if (c.fails.length) return [3, { file: f, control: opt.control, figures: m.fig, error: `the control cannot be measured, so there is no floor: ${c.fails.join('; ')}`, notes }]
  const floor = opt.floor ?? Math.max(1.5 * c.fig.max_window, 1)
  const floorFrom = opt.floor != null ? '--floor' : (1.5 * c.fig.max_window >= 1 ? '1.5 x control max window' : 'minimum 1.0 (control reads near 0)')
  if (c.fig.max_window < 1) notes.push('the control reads near 0, as a locally frozen frame does: the floor rests on a local control, so a clip only just above it is unproven motion, not live motion (a static scene rendered by the same route is the control that catches route shimmer)')
  if (c.fig.fps !== m.fig.fps || c.fig.w !== m.fig.w || c.fig.h !== m.fig.h) notes.push(`the control is ${c.fig.w}x${c.fig.h} at ${c.fig.fps} fps and the clip ${m.fig.w}x${m.fig.h} at ${m.fig.fps} fps: their windows are not in the same units`)
  if (m.short) notes.push(`the clip is shorter than one second: its one window holds ${m.fig.frames - 1} frame pairs`)
  const fails = []
  if (m.fig.min_window < floor) fails.push(`VQ-04 ${base}: the quietest one-second window (from ${m.fig.min_window_at_s} s) sums ${m.fig.min_window}, under the floor ${round(floor)} (control max window ${c.fig.max_window})`)
  const figures = { ...m.fig, control_min_window: c.fig.min_window, control_max_window: c.fig.max_window, floor: round(floor), floor_from: floorFrom }
  return [fails.length ? 1 : 0, { file: f, control: opt.control, figures, fails, notes }]
}

// ---------- endpoints: does the clip start on the first keyframe and end on the last? (VQ-05)
// SSIM on 64-px-wide thumbnails (composition, not grain). Each end must reach the floor against its own
// image AND be closer to it than to the other image, because two keyframes that share a background
// score about 0.99 against each other and a floor alone passes a clip that never left the first one.
function endpoints (argv) {
  const { pos, opt } = parse(argv, { floor: 'num' })
  if (pos.length !== 3) usage('endpoints takes <video> <first.png> <last.png>')
  const [f, first, last] = pos; const base = path.basename(f); const floor = opt.floor ?? 0.8; const notes = []
  const pres = [f, first, last].flatMap((x) => present(x).fails)
  if (pres.length) return [1, { file: f, figures: {}, fails: pres, notes }]
  const s = streamsOf(f)
  if (!s.v) return [1, { file: f, figures: {}, fails: [`BQ-02 ${base}: no video stream (${seenOf(s)})`], notes }]
  const sc = `64:${Math.max(2, Math.round((64 * s.v.height) / s.v.width / 2) * 2)}`
  const tmp = tmpDir('ends'); const fa = path.join(tmp, 'first.png'); const fz = path.join(tmp, 'last.png')
  try {
    const r1 = tool('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-i', f, '-map', '0:v:0', '-frames:v', '1', '-update', '1', fa])
    // the video stream's own last frame: seek from its end, never the container's (audio can run longer)
    const from = s.vdur != null && s.vdur > 2 ? ['-ss', String(round(s.vdur - 1.5, 3))] : []
    const r2 = tool('ffmpeg', ['-v', 'error', '-nostdin', '-y', ...from, '-i', f, '-map', '0:v:0', '-update', '1', fz])
    if (r1.status || r2.status || !fs.existsSync(fa) || !fs.existsSync(fz)) return [1, { file: f, figures: {}, fails: [`BQ-02 ${base}: the first and last frames could not be extracted (${firstError(r1.stderr || r2.stderr)})`], notes }]
    const ssim = (x, y) => {
      const r = tool('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-i', x, '-i', y, '-filter_complex', `[0:v]scale=${sc}:flags=area,format=yuv420p[a];[1:v]scale=${sc}:flags=area,format=yuv420p[b];[a][b]ssim`, '-f', 'null', '-'])
      const all = [...r.stderr.matchAll(/All:([\d.]+)/g)].pop()
      return all ? round(Number(all[1])) : null
    }
    const figures = { thumb: sc.replace(':', 'x'), first_vs_first: ssim(fa, first), first_vs_last: ssim(fa, last), last_vs_last: ssim(fz, last), last_vs_first: ssim(fz, first), images_ssim: ssim(first, last), floor }
    if (Object.values(figures).some((x) => x === null)) cannot('ffmpeg ssim printed no score', { file: f, figures })
    const distinct = figures.images_ssim < 0.9999; const fails = []
    if (!distinct) notes.push('the two keyframes are the same picture: only the floor is compared')
    if (figures.first_vs_first < floor) fails.push(`VQ-05 ${base}: the first frame scores ${figures.first_vs_first} against ${path.basename(first)}, under ${floor}`)
    if (figures.last_vs_last < floor) fails.push(`VQ-05 ${base}: the last frame scores ${figures.last_vs_last} against ${path.basename(last)}, under ${floor}`)
    if (distinct && !(figures.first_vs_first > figures.first_vs_last)) fails.push(`VQ-05 ${base}: the first frame is no closer to ${path.basename(first)} (${figures.first_vs_first}) than to ${path.basename(last)} (${figures.first_vs_last})`)
    if (distinct && !(figures.last_vs_last > figures.last_vs_first)) fails.push(`VQ-05 ${base}: the last frame is no closer to ${path.basename(last)} (${figures.last_vs_last}) than to ${path.basename(first)} (${figures.last_vs_first})`)
    return [fails.length ? 1 : 0, { file: f, first, last, figures, fails, notes }]
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}

// ---------- takes: is there sound, for the whole picture, in every stretch? (AQ-01) A silent AAC track
// passes a codec check at -91 dB; "has audio" is not "has sound".
function takes (argv) {
  const { pos, opt } = parse(argv, { n: 'int', floor: 'snum', tol: 'num' })
  if (pos.length !== 1) usage('takes takes exactly one file')
  const f = pos[0]; const base = path.basename(f); const notes = []
  const n = opt.n ?? 1; const floor = opt.floor ?? -50; const tol = opt.tol ?? 0.5
  const p = present(f); if (!p.ok) return [1, { file: f, figures: {}, fails: p.fails, notes }]
  const s = streamsOf(f)
  const figures = { video_duration_s: s.vdur == null ? null : round(s.vdur, 3), audio_duration_s: s.adur == null ? null : round(s.adur, 3), floor_db: floor }
  if (!s.a) return [1, { file: f, figures, fails: [`AQ-01 ${base}: no audio stream: the takes are not in it`], notes }]
  const fails = []
  if (s.v && s.vdur != null && s.adur != null) {
    figures.av_offset_s = round(Math.abs(s.adur - s.vdur), 3)
    if (figures.av_offset_s > tol) fails.push(`AQ-01 ${base}: the audio runs ${figures.audio_duration_s} s against the picture's ${figures.video_duration_s} s (${figures.av_offset_s} s apart; tolerance ${tol} s)`)
  } else if (!s.v) notes.push('no picture: the span against the picture is not compared')
  if (!(s.adur > 0)) return [3, { file: f, figures, error: `${base}: ffprobe gives the audio no length`, fails, notes }]
  figures.stretches = Array.from({ length: n }, (_, i) => {
    const from = (s.adur / n) * i; const db = meanDb(f, from, s.adur / n)
    return { from_s: round(from, 2), to_s: round(from + s.adur / n, 2), mean_db: db }
  })
  const quiet = figures.stretches.map((x, i) => [i + 1, x]).filter(([, x]) => x.mean_db == null || x.mean_db <= floor)
  if (quiet.length) fails.push(`AQ-01 ${base}: ${n > 1 ? `stretch ${quiet.map(([i]) => i).join(', ')} of ${n}` : 'the audio'} is silent (mean ${quiet.map(([, x]) => x.mean_db ?? '-inf').join(', ')} dB; floor ${floor} dB)`)
  return [fails.length ? 1 : 0, { file: f, figures, fails, notes }]
}

// ---------- loudness: is the programme at its target? (AQ-03) EBU R128 integrated loudness and true
// peak. The target is a bot or platform parameter; -16 LUFS / -1.5 dBTP are the defaults. loudnorm lands
// true peak at -1.4 to -1.5, so the peak limit has 0.2 dB of slack.
function loudness (argv) {
  const { pos, opt } = parse(argv, { target: 'snum', tol: 'num', tp: 'snum', 'tp-slack': 'num' })
  if (pos.length !== 1) usage('loudness takes exactly one file')
  const f = pos[0]; const base = path.basename(f); const notes = []
  const target = opt.target ?? -16; const tol = opt.tol ?? 1; const tp = opt.tp ?? -1.5; const slack = opt['tp-slack'] ?? 0.2
  const p = present(f); if (!p.ok) return [1, { file: f, figures: {}, fails: p.fails, notes }]
  const s = streamsOf(f)
  if (!s.a) return [1, { file: f, figures: {}, fails: [`AQ-01 ${base}: no audio stream: loudness is undefined`], notes }]
  const L = lufs(f)
  if (L.error) cannot(`ebur128 could not read ${base}: ${L.error}`, { file: f })
  const off = L.I == null ? null : round(L.I - target, 1)
  const figures = { integrated_lufs: L.I, true_peak_dbtp: L.TP, lra_lu: L.LRA, target_lufs: target, tol_lu: tol, off_lu: off, tp_max_dbtp: tp, tp_slack_db: slack, duration_s: s.adur == null ? null : round(s.adur, 3) }
  const fails = []
  if (silentLufs(L.I)) fails.push(`AQ-03 ${base}: integrated ${L.I ?? '-inf'} LUFS: the audio is silent`)
  else if (Math.abs(off) > tol) fails.push(`AQ-03 ${base}: integrated ${L.I} LUFS is ${off > 0 ? '+' : ''}${off} LU from the target ${target} (tolerance ±${tol})`)
  if (L.TP != null && L.TP > tp + slack) fails.push(`AQ-03 ${base}: true peak ${L.TP} dBTP is above ${tp} dBTP (+${slack} dB slack)`)
  return [fails.length ? 1 : 0, { file: f, figures, fails, notes }]
}

// ---------- the plan's timing contract and its takes (shared by plan-measured and duck)
// plan.json `rows` (sl8.media.plan/1): n, start, dur, vo, vo_start; a row's take is its `vo_file`
// (relative to the plan's folder or --root), else audio/vo-NN.<ext> (the stable name the Video machine's audio skill gives each part).
const VO_EXT = ['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'opus']
const hasVo = (r) => (typeof r.vo === 'string' && r.vo.trim() !== '') || typeof r.vo_file === 'string'
function readPlan (file) {
  if (!fs.existsSync(file)) cannot(`no plan at ${file}: the timing contract was never written (HR1)`, { plan: file })
  let doc
  try { doc = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { cannot(`${file} is not JSON (${e.message}); fix the plan, then re-run`, { plan: file }) }
  if (!Array.isArray(doc?.rows) || !doc.rows.length) cannot(`${file} has no rows: there is no timing contract to measure against (media-ai-gen references/gates-and-manifest.md §plan.json)`, { plan: file })
  return doc
}
function takesOf (doc, root) {
  return doc.rows.map((r, i) => {
    const t = { n: r.n ?? i + 1, start: num(r.start), dur: num(r.dur), vo_start: num(r.vo_start), vo: hasVo(r) }
    if (!t.vo) return t
    const typed = num(r.vo_measured_s ?? r.vo_dur ?? r.vo_s)
    if (typed != null) t.typed_s = typed
    const nn = String(t.n).padStart(2, '0')
    const file = typeof r.vo_file === 'string' ? path.resolve(root, r.vo_file) : VO_EXT.map((e) => path.join(root, 'audio', `vo-${nn}.${e}`)).find((x) => fs.existsSync(x))
    if (!file || !fs.existsSync(file)) { t.looked = typeof r.vo_file === 'string' ? r.vo_file : `audio/vo-${nn}.{${VO_EXT.join(',')}}`; return t }
    t.file = path.relative(root, file) || file
    const p = present(file); if (!p.ok) { t.bad = p.fails; return t }
    const s = streamsOf(file)
    if (!s.a || !(s.adur > 0)) { t.bad = [`BQ-02 ${t.file}: no audio with a length (${seenOf(s)})`]; return t }
    t.measured_s = round(s.adur, 3)
    t.vo_end = round((t.vo_start ?? t.start ?? 0) + t.measured_s, 3)
    return t
  })
}
const runtimeOf = (doc, T) => secs(doc.declared?.duration_s ?? doc.declared?.duration) ?? Math.max(...T.filter((t) => t.start != null && t.dur != null).map((t) => t.start + t.dur))
const overlap = ([a, b], [c, d]) => Math.max(0, Math.min(b, d) - Math.max(a, c))
function merged (iv) {
  const out = []
  for (const [a, b] of [...iv].sort((x, y) => x[0] - y[0])) { const last = out[out.length - 1]; if (last && a <= last[1]) last[1] = Math.max(last[1], b); else out.push([a, b]) }
  return out
}
// [0, end] minus the intervals
function complement (iv, end) {
  const out = []; let at = 0
  for (const [a, b] of merged(iv)) { if (a > at) out.push([at, Math.min(a, end)]); at = Math.max(at, b) }
  if (at < end) out.push([at, end])
  return out.filter(([a, b]) => b > a)
}

// ---------- plan-measured: does the plan's timing hold against the takes that exist? (AQ-02)
// Each take measured by ffprobe against its typed length (tol 0.1 s), its window (an overrun is a defect,
// an underrun is not), its own shot (never before its start, never past its end); then the distribution
// re-measured: no gap over 2.5 s (a gap inside a shot with an empty fragment is intended silence), no tail
// over 1.5 s, speech in every third. A missing take is exit 3 (cannot check), never a failure.
function planMeasured (argv) {
  const { pos, opt } = parse(argv, { root: 'str', tol: 'num', 'max-gap': 'num', 'max-tail': 'num' })
  if (pos.length !== 1) usage('plan-measured takes exactly one plan.json')
  const planFile = pos[0]; const doc = readPlan(planFile); const root = opt.root ?? path.dirname(planFile)
  const tol = opt.tol ?? 0.1; const maxGap = opt['max-gap'] ?? 2.5; const maxTail = opt['max-tail'] ?? 1.5
  const T = takesOf(doc, root); const fails = []; const notes = []; const missing = []
  if (!T.some((t) => t.vo)) cannot('no row carries a voiceover fragment (vo or vo_file): there is no take to measure', { plan: planFile })
  for (const t of T) {
    if (t.start == null || t.dur == null) { fails.push(`AQ-02 shot ${t.n}: no start or dur: its window was never written`); continue }
    if (!t.vo) continue
    if (t.bad) { fails.push(...t.bad); continue }
    if (t.measured_s == null) { missing.push(`shot ${t.n}: no take at ${t.looked}`); continue }
    if (t.typed_s != null && Math.abs(t.typed_s - t.measured_s) > tol) fails.push(`AQ-02 shot ${t.n}: the plan types ${t.typed_s} s, but ${t.file} runs ${t.measured_s} s (tolerance ${tol} s): typed, not measured`)
    if (t.measured_s > t.dur + EPS) fails.push(`AQ-02 shot ${t.n}: the take runs ${t.measured_s} s in a ${t.dur} s window: an overrun (shorten the line or move a boundary)`)
    else if (t.vo_start == null) notes.push(`shot ${t.n}: no vo_start; the take is placed at the shot's start for the gap figures`)
    else if (t.vo_start < t.start - EPS) fails.push(`AQ-02 shot ${t.n}: vo_start ${t.vo_start} opens ${round(t.start - t.vo_start, 2)} s before its shot (start ${t.start})`)
    else if (t.vo_end > t.start + t.dur + EPS) fails.push(`AQ-02 shot ${t.n}: from vo_start ${t.vo_start} the take ends at ${t.vo_end}, past its shot's end ${round(t.start + t.dur, 3)}: re-centre it on its window`)
  }
  const runtime = runtimeOf(doc, T)
  const placed = T.filter((t) => t.vo_end != null)
  const figures = { runtime_s: Number.isFinite(runtime) ? round(runtime, 3) : null, takes: placed.length, rows: T.filter((t) => t.vo).map(({ n, file, measured_s, typed_s, start, dur, vo_start, vo_end }) => ({ n, file, measured_s, typed_s, start, dur, vo_start, vo_end })) }
  if (!missing.length && placed.length && Number.isFinite(runtime)) {
    const speech = merged(placed.map((t) => [t.vo_start ?? t.start, t.vo_end]))
    const silentShots = T.filter((t) => !t.vo && t.start != null && t.dur != null).map((t) => ({ n: t.n, w: [t.start, t.start + t.dur] }))
    const gaps = complement(speech, runtime).map(([a, b]) => {
      const by = silentShots.filter((x) => overlap(x.w, [a, b]) > EPS).map((x) => x.n)
      return { from_s: round(a, 3), to_s: round(b, 3), s: round(b - a, 3), tail: b >= runtime - 1e-6 && a > 0, exempt_by_shots: by.length ? by : undefined }
    })
    const counted = gaps.filter((g) => !g.exempt_by_shots)
    const largest = counted.reduce((x, g) => (g.s > (x?.s ?? -1) ? g : x), null)
    const tail = gaps.find((g) => g.tail)
    const spoken = speech.reduce((x, [a, b]) => x + Math.min(b, runtime) - Math.min(a, runtime), 0)
    const thirds = [0, 1, 2].map((i) => speech.some((iv) => overlap(iv, [(runtime * i) / 3, (runtime * (i + 1)) / 3]) > EPS))
    Object.assign(figures, { speech_s: round(spoken, 3), coverage_pct: round((100 * spoken) / runtime, 1), lead_s: round(speech[0][0], 3), largest_gap_s: largest?.s ?? 0, largest_gap_from_s: largest?.from_s ?? null, tail_s: tail?.s ?? 0, gaps, thirds })
    if (largest && largest.s > maxGap) fails.push(`AQ-02 a ${largest.s} s silence from ${largest.from_s} s to ${largest.to_s} s; at most ${maxGap} s (shift vo_start values to spread the air)`)
    if (tail && !tail.exempt_by_shots && tail.s > maxTail) fails.push(`AQ-02 the last ${tail.s} s are silent; at most ${maxTail} s at the tail`)
    thirds.forEach((ok, i) => { if (!ok) fails.push(`AQ-02 no speech in the ${['first', 'second', 'last'][i]} third (${round((runtime * i) / 3, 2)}-${round((runtime * (i + 1)) / 3, 2)} s)`) })
    const ex = gaps.filter((g) => g.exempt_by_shots)
    if (ex.length) notes.push(`intended silence (a shot with an empty fragment): ${ex.map((g) => `${g.s} s from ${g.from_s} s (shot ${g.exempt_by_shots.join(', ')})`).join('; ')}`)
  } else if (missing.length) notes.push('the gaps, tail and thirds need every take: not measured')
  const code = fails.length ? 1 : missing.length ? 3 : 0
  return [code, { plan: planFile, root, figures, fails, notes, ...(code === 3 ? { error: `missing takes, so the plan cannot be measured: ${missing.join('; ')} (HR1: the timing comes from audio that exists)` } : {}) }]
}

// ---------- duck: does the bed dip under the voice, and come back? (AQ-04) Two ways: speech at least
// 9 LU above the bed under it (bed too loud), and the bed under speech within 12 dB of its own bed-only
// level and never digital silence (bed vanished). Speech regions come from the plan's vo_start and the
// measured takes, trimmed 0.15 s at each end; bed-only regions keep 0.5 s from any speech (attack and
// release). --bed is the bed AS MIXED (after the sidechain duck, before the voice is added). The plan
// timeline is trusted only when the mix runs the plan's length (within --sync-tol); otherwise exit 3.
function duck (argv) {
  const { pos, opt } = parse(argv, { bed: 'str', plan: 'str', root: 'str', 'min-sep': 'num', 'max-depth': 'num', 'sync-tol': 'num' })
  if (pos.length !== 1) usage('duck takes exactly one mix')
  if (!opt.bed || !opt.plan) usage('duck needs --bed <the bed as mixed> and --plan <plan.json>')
  const mix = pos[0]; const base = path.basename(mix); const notes = []
  const minSep = opt['min-sep'] ?? 9; const maxDepth = opt['max-depth'] ?? 12; const syncTol = opt['sync-tol'] ?? 1
  const pm = present(mix); if (!pm.ok) return [1, { mix, figures: {}, fails: pm.fails, notes }]
  const sm = streamsOf(mix)
  if (!sm.a) return [1, { mix, figures: {}, fails: [`AQ-01 ${base}: no audio stream: there is no mix to measure`], notes }]
  const pb = present(opt.bed)
  if (!pb.ok) cannot(`the bed stem cannot be read (${pb.fails.join('; ')}): keep the bed as mixed beside the mix`, { mix, bed: opt.bed })
  const sb = streamsOf(opt.bed)
  if (!sb.a) cannot(`${path.basename(opt.bed)} has no audio stream (${seenOf(sb)})`, { mix, bed: opt.bed })
  const doc = readPlan(opt.plan); const T = takesOf(doc, opt.root ?? path.dirname(opt.plan))
  const lost = T.filter((t) => t.vo && t.measured_s == null).map((t) => `shot ${t.n}: ${t.bad?.join('; ') ?? `no take at ${t.looked}`}`)
  if (lost.length) cannot(`the speech regions come from the plan's takes: ${lost.join('; ')}`, { mix, plan: opt.plan })
  const runtime = runtimeOf(doc, T)
  const figures = { mix_duration_s: round(sm.adur, 3), plan_runtime_s: Number.isFinite(runtime) ? round(runtime, 3) : null, bed_duration_s: round(sb.adur, 3) }
  if (!Number.isFinite(runtime) || Math.abs(sm.adur - runtime) > syncTol) cannot(`the mix runs ${figures.mix_duration_s} s and the plan ${figures.plan_runtime_s} s: it does not follow the plan's timeline, so its speech regions cannot be located (check declared duration first; tolerance ${syncTol} s)`, { mix, plan: opt.plan, figures })
  const end = Math.min(sm.adur, sb.adur)
  if (sb.adur < sm.adur - syncTol) notes.push(`the bed stem stops at ${figures.bed_duration_s} s, before the mix ends`)
  const said = T.filter((t) => t.vo_end != null).map((t) => [t.vo_start ?? t.start, t.vo_end])
  const speech = said.map(([a, b]) => [Math.max(0, a + 0.15), Math.min(end, b - 0.15)]).filter(([a, b]) => b - a >= 0.3)
  const bedOnly = complement(said.map(([a, b]) => [a - 0.5, b + 0.5]), end).filter(([a, b]) => b - a >= 0.4)
  Object.assign(figures, { speech_regions: speech.length, speech_s: round(speech.reduce((x, [a, b]) => x + b - a, 0), 2), bed_only_regions: bedOnly.length, bed_only_s: round(bedOnly.reduce((x, [a, b]) => x + b - a, 0), 2) })
  if (!speech.length) cannot('no speech region of 0.3 s to measure', { mix, plan: opt.plan, figures })
  const read = (file, regions) => { const L = lufs(file, regions); if (L.error) cannot(`ebur128 could not read ${path.basename(file)}: ${L.error}`, { mix, figures }); return L.I }
  const bedS = read(opt.bed, speech); const mixS = read(mix, speech)
  const bedG = bedOnly.length ? read(opt.bed, bedOnly) : null; const mixG = bedOnly.length ? read(mix, bedOnly) : null
  Object.assign(figures, { mix_speech_lufs: mixS, mix_bed_only_lufs: mixG, bed_under_speech_lufs: bedS, bed_only_lufs: bedG })
  // the stem's gain into the mix, read where the mix is the bed alone (0 when there is no such stretch)
  let k = 0
  if (bedOnly.length && !silentLufs(bedG) && !silentLufs(mixG)) k = mixG - bedG
  else notes.push('no bed-only stretch to read the stem\'s gain into the mix: the stem is taken at its mix level')
  const fails = []; let sep = null; let depth = null
  if (silentLufs(bedS)) fails.push(`AQ-04 bed vanished: the bed is digital silence under speech (a mute, not a duck)`)
  else {
    const bedInMix = bedS + k; const pMix = 10 ** (mixS / 10); const pBed = 10 ** (bedInMix / 10)
    const speechL = !silentLufs(mixS) && pMix > pBed ? 10 * Math.log10(pMix - pBed) : null
    sep = speechL == null ? null : round(speechL - bedInMix, 1)
    Object.assign(figures, { bed_in_mix_under_speech_lufs: round(bedInMix, 1), speech_lufs: speechL == null ? null : round(speechL, 1) })
    if (sep == null || sep < minSep) fails.push(`AQ-04 bed too loud: speech sits ${sep ?? 'no'} LU above the bed under it; at least ${minSep}`)
  }
  if (bedOnly.length) {
    if (silentLufs(bedG)) fails.push('AQ-04 no bed: the bed stem is silent where it plays alone')
    else if (!silentLufs(bedS)) {
      depth = round(bedG - bedS, 1)
      if (depth > maxDepth) fails.push(`AQ-04 bed vanished: the bed drops ${depth} dB under speech; at most ${maxDepth} (past that the music has stopped)`)
      if (depth < 1) notes.push(`the bed does not dip under speech (${depth} dB): the duck did not happen, or --bed is the bed before ducking (pass the bed as mixed)`)
    }
  }
  Object.assign(figures, { stem_gain_db: round(k, 1), separation_lu: sep, duck_depth_db: depth, min_sep_lu: minSep, max_depth_db: maxDepth })
  const code = fails.length ? 1 : depth == null ? 3 : 0
  return [code, { mix, bed: opt.bed, plan: opt.plan, figures, fails, notes, ...(code === 3 ? { error: 'no bed-only stretch of 0.4 s, 0.5 s clear of speech: the duck depth cannot be measured' } : {}) }]
}

// ---------- identical: are the copies byte-identical, and really copies? (BQ-03) Every media file at the
// same relative path in two or more copies must hash the same; a copy that is a link to another folder,
// a file that is a symlink, or a hard link shared across copies is one file, not two.
function identical (argv) {
  const { pos } = parse(argv, {})
  if (pos.length < 2) usage('identical needs at least two folders (the copies)')
  const fails = []; const notes = []; const reals = new Map(); const copies = []
  for (const p of pos) {
    if (!fs.existsSync(p)) { fails.push(`BQ-01 ${p}: does not exist`); continue }
    if (!fs.statSync(p).isDirectory()) { fails.push(`BQ-01 ${p}: not a folder`); continue }
    const real = fs.realpathSync(p)
    if (fs.lstatSync(p).isSymbolicLink()) { fails.push(`BQ-03 ${p}: a link to ${real}, not a copy`); continue }
    if (reals.has(real)) { fails.push(`BQ-03 ${reals.get(real)} and ${p} are the same folder, not two copies`); continue }
    reals.set(real, p); copies.push({ p, real })
  }
  const byRel = new Map(); const linked = []
  const visit = (copy, dir, depth) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith('.')) continue
      const full = path.join(dir, e.name)
      if (e.isSymbolicLink()) {
        let to = '(a broken link)'; try { to = fs.realpathSync(full) } catch {}
        if (KIND_OF_EXT[extOf(e.name)] || fs.statSync(full, { throwIfNoEntry: false })?.isDirectory()) linked.push(`${full} -> ${to}`)
        continue
      }
      if (e.isDirectory()) { if (depth < 6) visit(copy, full, depth + 1); continue }
      if (!e.isFile() || !KIND_OF_EXT[extOf(e.name)]) continue
      const st = fs.statSync(full); const rel = path.relative(copy.real, full)
      const sha = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')
      if (!byRel.has(rel)) byRel.set(rel, [])
      byRel.get(rel).push({ copy: copy.p, sha, ino: `${st.dev}:${st.ino}` })
    }
  }
  for (const c of copies) visit(c, c.real, 0)
  for (const l of linked) fails.push(`BQ-03 ${l}: a link, not a copy`)
  const shared = [...byRel].filter(([, v]) => v.length > 1)
  const only = byRel.size - shared.length
  if (copies.length >= 2 && !shared.length) fails.push(`BQ-03 no media file appears in two of the ${copies.length} copies: nothing was copied`)
  for (const [rel, v] of shared) {
    if (new Set(v.map((x) => x.ino)).size < v.length) fails.push(`BQ-03 ${rel}: hard-linked across copies, one file and not two`)
    else if (new Set(v.map((x) => x.sha)).size > 1) fails.push(`BQ-03 ${rel}: differs between copies (${new Set(v.map((x) => x.sha)).size} versions in ${v.length} copies)`)
  }
  if (only) notes.push(`${only} media file(s) appear in one copy only: not compared`)
  const figures = { copies: copies.length, shared: shared.length, identical: shared.filter(([, v]) => new Set(v.map((x) => x.sha)).size === 1 && new Set(v.map((x) => x.ino)).size === v.length).length, only_in_one: only, files: shared.slice(0, 50).map(([rel, v]) => ({ file: rel, copies: v.length, sha256: v[0].sha.slice(0, 16) })) }
  return [fails.length ? 1 : 0, { figures, fails, notes }]
}

// ---------- main
const COMMANDS = { artifact, image, declared, sheet, streams, clipset, motion, endpoints, takes, loudness, 'plan-measured': planMeasured, duck, identical }
const [cmd, ...argv] = process.argv.slice(2)
CMD = cmd
let code; let body
try {
  if (!Object.hasOwn(COMMANDS, cmd ?? '')) usage(cmd ? `unknown check '${cmd}'` : 'name a check')
  ;[code, body] = COMMANDS[cmd](argv)
} catch (e) {
  if (e instanceof Done) { code = e.code; body = e.body } else { code = 3; body = { error: `the check could not run: ${firstError(e?.message ?? e)}` } }
}
process.stdout.write(JSON.stringify({ check: cmd ?? null, exit: code, ...body, mediaqc: VERSION }) + '\n')
process.exitCode = code
