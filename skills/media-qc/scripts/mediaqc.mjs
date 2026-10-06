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
//   declared --plan plan.json|request.json --file F [--id ID] [--tol 0.01]
//   sheet    <file|dir>... --out contact.jpg [--cols N] [--cell 320] [--max 48]
//
// Added with Video Studio (each = one COMMANDS entry + selftest cases + a references/checks.md section):
//   streams, clipset, takes, loudness, plan-measured, motion, duck, endpoints, identical;
//   `declared` gains duration_s / fps / audio in normaliseDeclared() (they are listed as unchecked today).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const VERSION = '1.0.0'
const USAGE = {
  artifact: 'artifact <file|dir>...',
  image: 'image <file> [--w W] [--h H] [--aspect W:H] [--tol 0.01] [--min-long N] [--alpha required|forbidden] [--format png|jpeg|webp|gif]',
  declared: 'declared --plan plan.json|request.json --file F [--id ID] [--tol 0.01]',
  sheet: 'sheet <file|dir>... --out contact.jpg|png [--cols N] [--cell 320] [--max 48]'
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
// -> { ok, figures, fails }: ok means a picture was measured; fails carry BQ-01 / BQ-02
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
  return { ok: true, figures, fails }
}

// spec: { w, h, short_side, aspect, tol, min_long, format, alpha } -> rows + fails (IQ-03 size, IQ-04 format, IQ-05 alpha)
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
const LATER = ['duration_s', 'duration', 'dur_s', 'fps', 'audio'] // compared from media-qc 1.1.0 (Video Studio)
const DECL_FORMATS = new Set(['png', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'webm'])
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
function normaliseDeclared (d) {
  const spec = {}; const notes = []; const later = LATER.filter((k) => d[k] !== undefined)
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
  for (const k of Object.keys(spec)) if (spec[k] === undefined) delete spec[k]
  if (later.length) notes.push(`${later.join(', ')} declared: compared from media-qc 1.1.0 (Video Studio), not by 1.0.0`)
  return { spec, notes, later }
}
function declared (argv) {
  const { pos, opt } = parse(argv, { plan: 'str', file: 'str', id: 'str', tol: 'num' })
  if (pos.length) usage(`unexpected argument '${pos[0]}'`)
  if (!opt.plan || !opt.file) usage('declared needs --plan and --file')
  if (!fs.existsSync(opt.plan)) cannot(`no plan or request record at ${opt.plan}: nothing was declared, so nothing can be compared (HR1: declare before generating)`, { file: opt.file, plan: opt.plan })
  let doc
  try { doc = JSON.parse(fs.readFileSync(opt.plan, 'utf8')) } catch (e) { cannot(`${opt.plan} is not JSON (${e.message}); fix the record, then re-run`, { file: opt.file, plan: opt.plan }) }
  const found = findDeclaration(doc, opt.file, opt.id)
  if (found.miss) cannot(`no declaration for ${path.basename(opt.file)}: ${found.miss}`, { file: opt.file, plan: opt.plan })
  const { spec, notes, later } = normaliseDeclared(found.decl)
  if (!Object.keys(spec).length) cannot(`the declaration at ${found.where} has no field media-qc 1.0.0 compares (w, h, resolution, aspect, format, alpha, min_long)`, { file: opt.file, plan: opt.plan, where: found.where, declared: found.decl, unchecked: later, notes })
  spec.tol = opt.tol
  const m = measure(opt.file)
  const base = { file: opt.file, plan: opt.plan, where: found.where, entry: found.entry, declared: found.decl }
  if (!m.ok) return [1, { ...base, figures: m.figures, compared: [], unchecked: later, fails: m.fails, notes }]
  const c = compare(m.figures, spec)
  const fails = [...m.fails, ...c.fails]
  return [fails.length ? 1 : 0, { ...base, figures: m.figures, compared: c.rows, unchecked: later, fails, notes }]
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
  if (inputs.some((f) => KINDS[KIND_OF_EXT[extOf(f)]]?.media === 'video')) notes.push('a video contributes its first frame only in 1.0.0')
  const cell = opt.cell ?? 320; const cols = Math.min(opt.cols ?? Math.ceil(Math.sqrt(inputs.length)), inputs.length); const rows = Math.ceil(inputs.length / cols)
  const pad = 4; const margin = 4
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mediaqc-sheet-'))
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

// ---------- main
const COMMANDS = { artifact, image, declared, sheet }
const [cmd, ...argv] = process.argv.slice(2)
CMD = cmd
let code; let body
try {
  if (!COMMANDS[cmd]) usage(cmd ? `unknown check '${cmd}'` : 'name a check')
  ;[code, body] = COMMANDS[cmd](argv)
} catch (e) {
  if (e instanceof Done) { code = e.code; body = e.body } else { code = 3; body = { error: `the check could not run: ${firstError(e?.message ?? e)}` } }
}
process.stdout.write(JSON.stringify({ check: cmd ?? null, exit: code, ...body, mediaqc: VERSION }) + '\n')
process.exitCode = code
