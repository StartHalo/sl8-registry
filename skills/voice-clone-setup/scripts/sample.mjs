#!/usr/bin/env node
// sample.mjs: check and prepare a voice recording for cloning (voice-clone-setup step 7).
//   prep <recording> --route minimax|qwen|oneshot --dir artifacts/<p>/audio/voices/<role> [--force]
//        keeps the person's recording as <dir>/original.<ext> (copied once), derives
//        <dir>/sample-<route>.mp3 from that original once (mono, 128 kb/s, capped per route), measures
//        it and prints ONE JSON line. An existing sample is measured again, never re-encoded.
//        --force replaces a different recording already kept for the role (a confirmed replacement,
//        step 13) and removes the samples derived from the old one.
//   measure <file>     the same figures for any audio or video file; nothing is written
// Exit: 0 usable for the route · 1 not usable (no audio, under the route minimum, silent) or refused ·
//       2 usage · 3 ffmpeg or ffprobe missing or failed.
// It prints figures, never a PASS (HR14): noise, music, other voices, echo and clipping are judged by
// listening, by the person and, only when audio inspection really ran, by the agent.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

// min: 10 s on every route (fal MiniMax clone >=10 s; the approach applies 10 s to every route, step 6);
// rec: Creative Claw's recommendation (60 s, 1-2 min ideal);
// cap: MiniMax 120 s (the vendor's 2-minute mono sample), Qwen 300 s (fal limit), one-shot 30 s.
const ROUTES = {
  minimax: { min: 10, rec: 60, cap: 120 },
  qwen: { min: 10, rec: 60, cap: 300 },
  oneshot: { min: 10, rec: 10, cap: 30 }
}
const SILENT_DB = -60 // mean volume below about -60 dB is an empty file (fal audio verification checks)
const SILENCE = { noise_db: -35, min_s: 2 } // a reporting choice: silences of 2 s or more at -35 dB are listed
const INLINE_CAP = 3 * 1024 * 1024 // ai-gen inlines a local file up to 3 MB when proxy storage is unavailable

function out (exit, body) {
  process.stdout.write(JSON.stringify({ check: 'sample', exit, ...body }) + '\n')
  process.exit(exit)
}
function usage (msg) { out(2, { error: msg, usage: 'sample.mjs prep <recording> --route minimax|qwen|oneshot --dir <role dir> [--force] | measure <file>' }) }
function tool (cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.error) out(3, { error: r.error.code === 'ENOENT' ? `${cmd} is not on this machine: the machine is broken, report it (HR21)` : `${cmd}: ${r.error.message}` })
  return r
}
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const round = (x, n = 2) => x == null || Number.isNaN(x) ? null : Math.round(x * 10 ** n) / 10 ** n

function probe (f) {
  const r = tool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=index,codec_type,codec_name,channels,sample_rate', '-of', 'json', f])
  if (r.status !== 0) out(3, { error: `ffprobe cannot read ${f}: ${(r.stderr || '').trim().split('\n').pop()}` })
  const j = JSON.parse(r.stdout || '{}')
  const a = (j.streams || []).find((s) => s.codec_type === 'audio')
  return {
    duration_s: round(Number(j.format?.duration)),
    audio: a ? { codec: a.codec_name, channels: a.channels, sample_rate: Number(a.sample_rate) } : null,
    video: (j.streams || []).some((s) => s.codec_type === 'video')
  }
}

function levels (f, duration) {
  const r = tool('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-vn', '-af', `silencedetect=noise=${SILENCE.noise_db}dB:d=${SILENCE.min_s},volumedetect`, '-f', 'null', '-'])
  if (r.status !== 0) out(3, { error: `ffmpeg cannot decode ${f}: ${(r.stderr || '').trim().split('\n').pop()}` })
  const err = r.stderr || ''
  const num = (re) => { const m = re.exec(err); return m ? Number(m[1]) : null }
  const silences = []
  let open = null
  for (const line of err.split('\n')) {
    const s = /silence_start: (-?[\d.]+)/.exec(line)
    const e = /silence_end: (-?[\d.]+)/.exec(line)
    if (s) open = Math.max(0, Number(s[1]))
    if (e && open != null) { silences.push({ from_s: round(open), to_s: round(Number(e[1])) }); open = null }
  }
  if (open != null && duration != null) silences.push({ from_s: round(open), to_s: duration })
  return {
    mean_db: num(/mean_volume: (-?[\d.]+) dB/),
    max_db: num(/max_volume: (-?[\d.]+) dB/),
    silences,
    silence_total_s: round(silences.reduce((t, x) => t + (x.to_s - x.from_s), 0))
  }
}

function judge (lim, original, sample, fails, notes) {
  if (!original.audio) fails.push('no audio stream: there is no voice to clone')
  else if (original.duration_s != null && original.duration_s < lim.min) fails.push(`the recording runs ${original.duration_s} s, under the route minimum of ${lim.min} s: ask for a longer take`)
  if (sample && sample.mean_db != null && sample.mean_db < SILENT_DB) fails.push(`mean volume ${sample.mean_db} dB is under ${SILENT_DB} dB: the recording is silent or nearly so`)
  if (original.audio && original.duration_s != null && original.duration_s >= lim.min) {
    if (lim.rec > lim.min && original.duration_s < lim.rec) notes.push(`${original.duration_s} s is under the recommended ${lim.rec} s (1 to 2 minutes is ideal); it is usable, but a longer clean take usually clones better`)
    if (original.duration_s > lim.cap) notes.push(`the original runs ${original.duration_s} s: the sample keeps the first ${lim.cap} s (cut_at_s) and the original is kept whole (no re-upload is needed); a transcript for the qwen route covers those ${lim.cap} s only`)
  }
  if (sample?.max_db != null && sample.max_db >= -0.1) notes.push(`peaks reach ${sample.max_db} dB: listen for clipping before cloning`)
  if (sample?.silences?.length) notes.push(`${sample.silences.length} silence(s) of ${SILENCE.min_s} s or more at ${SILENCE.noise_db} dB, ${sample.silence_total_s} s in all: long silences weaken a clone, ask for a cleaner take if they are pauses rather than breaths`)
  if (sample?.bytes > INLINE_CAP) notes.push(`the sample is ${sample.bytes} bytes, over ai-gen's 3 MB inline limit: the upload needs proxy storage (an inline fallback would fail with exit 2)`)
  notes.push('noise, music, other speakers and echo are not measured here: they are judged by listening')
}

const [cmd, ...rest] = process.argv.slice(2)
const opt = {}; const pos = []
for (let i = 0; i < rest.length; i++) {
  const a = rest[i]
  if (a === '--force') opt.force = true
  else if (a.startsWith('--')) { opt[a.slice(2)] = rest[i + 1]; i++ } else pos.push(a)
}

if (cmd === 'measure') {
  if (pos.length !== 1 || !fs.existsSync(pos[0])) usage('measure takes one existing file')
  const p = probe(pos[0])
  const l = p.audio ? levels(pos[0], p.duration_s) : null
  const fails = []; const notes = []
  if (!p.audio) fails.push('no audio stream')
  if (l && l.mean_db != null && l.mean_db < SILENT_DB) fails.push(`mean volume ${l.mean_db} dB is under ${SILENT_DB} dB: silent`)
  out(fails.length ? 1 : 0, { file: pos[0], figures: { ...p, ...(l || {}), bytes: fs.statSync(pos[0]).size }, fails, notes })
}
if (cmd !== 'prep') usage('unknown command')
if (pos.length !== 1 || !fs.existsSync(pos[0])) usage('prep takes one existing recording')
const lim = ROUTES[opt.route]
if (!lim) usage('--route is minimax, qwen or oneshot')
if (!opt.dir) usage('--dir artifacts/<project>/audio/voices/<role> is required')
const dir = path.resolve(opt.dir)
fs.mkdirSync(dir, { recursive: true })

const fails = []; const notes = []
const input = path.resolve(pos[0])
const ext = (path.extname(input) || '.audio').toLowerCase()
const kept = fs.readdirSync(dir).filter((f) => /^original\./.test(f)).map((f) => path.join(dir, f))
let original = kept[0]
if (original && path.resolve(original) !== input && sha(original) !== sha(input)) {
  if (!opt.force) out(1, { route: opt.route, fails: [`a different recording is already kept for this role (${path.relative(process.cwd(), original)}): replacing it destroys the existing clone, so name the voice, confirm with the person, then rerun with --force`], notes })
  for (const f of fs.readdirSync(dir).filter((f) => /^(original\.|sample-)/.test(f))) fs.rmSync(path.join(dir, f))
  notes.push('replaced the kept recording and removed the samples derived from it')
  original = undefined
}
let copied = false
if (!original) {
  original = path.join(dir, `original${ext}`)
  if (path.resolve(original) !== input) { fs.copyFileSync(input, original); copied = true }
}
const op = probe(original)
const sampleFile = path.join(dir, `sample-${opt.route}.mp3`)
let reused = false
let wrote = false
if (op.audio && op.duration_s != null && op.duration_s >= lim.min) {
  if (fs.existsSync(sampleFile)) reused = true
  else {
    wrote = true
    // One lossy pass from the original, never from an earlier sample (HR11; fal: never re-encode twice).
    const r = tool('ffmpeg', ['-v', 'error', '-y', '-i', original, '-vn', '-ac', '1', '-t', String(lim.cap), '-b:a', '128k', sampleFile])
    if (r.status !== 0) out(3, { error: `ffmpeg could not write ${sampleFile}: ${(r.stderr || '').trim().split('\n').pop()}` })
  }
}
let sample = null
if (fs.existsSync(sampleFile)) {
  const sp = probe(sampleFile)
  sample = { path: path.relative(process.cwd(), sampleFile), sha256: sha(sampleFile), bytes: fs.statSync(sampleFile).size, duration_s: sp.duration_s, channels: sp.audio?.channels ?? null, reused, ...levels(sampleFile, sp.duration_s) }
}
judge(lim, op, sample, fails, notes)
const originalSha = sha(original)
if (fails.length) {
  // A recording that cannot be used is not kept: nothing of it stays behind for a later record or retake.
  if (wrote && fs.existsSync(sampleFile)) { fs.rmSync(sampleFile); if (sample) sample.removed = true }
  if (copied) { fs.rmSync(original); notes.push('the unusable copy was removed; the person\'s own upload is untouched') }
}
out(fails.length ? 1 : 0, {
  route: opt.route,
  limits: { min_s: lim.min, recommended_s: lim.rec, cap_s: lim.cap, silent_below_db: SILENT_DB, silence_report: SILENCE },
  original: { path: path.relative(process.cwd(), original), sha256: originalSha, duration_s: op.duration_s, audio: op.audio, video: op.video, kept: fs.existsSync(original) },
  sample,
  ...(op.duration_s != null && op.duration_s > lim.cap ? { cut_at_s: lim.cap } : {}),
  fails,
  notes
})
