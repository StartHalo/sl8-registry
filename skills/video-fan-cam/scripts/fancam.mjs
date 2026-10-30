#!/usr/bin/env node
// video-fan-cam: check the brief, then write each paid call's params file from references/prompts.json.
//   node fancam.mjs brief <brief.json>                                   # validate, fill stated defaults, print both
//   node fancam.mjs params still <brief.json> --model <id> --out <file> [--reframe]
//   node fancam.mjs params clip  <brief.json> --model <id> --out <file>
//   node fancam.mjs check  still|clip <brief.json> <params file> [--reframe] # prompt in the file == the brief's prompt
// check compares every field the script writes (prompt, size, quality, duration, sound, safety).
// Exit: 0 ok; 1 a brief problem (each one named) or a failed check; 2 usage, an unknown model or an unreadable file.
// The image never goes in a params file: ai-gen's media flags upload it inside the call (--ref for the still,
// --image for the clip). Exact score text and graphics are never put in a prompt (HR10).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const table = JSON.parse(fs.readFileSync(path.join(here, '..', 'references', 'prompts.json'), 'utf8'))
const row = Object.fromEntries(table.rows.map((r) => [r.slug, r]))
const [cmd, kind, ...rest] = process.argv.slice(2)
const flag = (n) => process.argv.includes(`--${n}`)
const opt = (n) => { const a = process.argv; const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined }
const usage = (msg) => { console.error(msg); process.exit(2) }
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')

const REACTIONS = ['shocked', 'celebrating', 'nervous', 'chanting', 'laughing', 'emotional']
const FORMATS = ['close-up cutaway', 'crowd pan', 'scoreboard moment', 'replay']
const CROPS = ['9:16', '16:9']
// Stated defaults (HR12): ours, not the source's; the delivery names each one used.
const DEFAULTS = { reaction: 'celebrating', format: 'close-up cutaway', crop: '9:16', duration_s: 5, crowd_mood: 'excited', venue: 'a packed venue typical of the sport', context: '', audio: false }
const TEXT = ['sport', 'context', 'venue', 'crowd_mood', 'consent', 'action', 'overlay_text', 'still_note', 'motion_note', 'reaction', 'format', 'crop']
const TIGHT = ['close-up cutaway', 'replay'] // head-and-shoulders framings: a reaction row may carry a `tight` variant that stays in frame
const CONSENT = /^(owner|written permission from \S.*)$/

// Still routes. GPT Image edit takes image_size only (facts schema-gpt2-size, schema-gpt2-edit-fields: multiples
// of 16, 655,360-8,294,400 px; no aspect field, no input_fidelity); the sizes are SL8's choice near 2K.
// Nano Banana Pro edit takes aspect_ratio and a resolution tier (schema-nbp-aspect, schema-nbp-resolution).
const GPT_SIZE = { '9:16': [1152, 2048], '16:9': [2048, 1152] }
const STILL = {
  'openai/gpt-image-2/edit': (b) => {
    const [width, height] = GPT_SIZE[b.crop]
    return { fields: { image_size: { width, height }, quality: 'high', num_images: 1, output_format: 'png', enable_safety_checker: true, sync_mode: false }, declared: { width, height, aspect: b.crop, format: 'png' } }
  },
  'fal-ai/nano-banana-pro/edit': (b) => ({ fields: { aspect_ratio: b.crop, resolution: '2K', num_images: 1, limit_generations: true, enable_web_search: false }, declared: { aspect: b.crop } })
}
// Clip routes. Duration is a string enum on both (schema-kling-v3: "3"-"15"; schema-seedance20-duration: "4"-"15");
// generate_audio defaults true on both and is pinned (HR4). Kling i2v has no aspect or resolution field: the clip
// takes the still's shape. Seedance takes aspect_ratio and resolution (default 720p, pinned).
const CLIP = {
  'fal-ai/kling-video/v3/pro/image-to-video': { min: 3, max: 15, fields: (b) => ({ duration: String(b.duration_s), generate_audio: b.audio }) },
  'bytedance/seedance-2.0/image-to-video': { min: 4, max: 15, fields: (b) => ({ duration: String(b.duration_s), aspect_ratio: b.crop, resolution: '720p', generate_audio: b.audio }) }
}

function readJson (p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { usage(`cannot read ${p}: ${e.message}`) }
}

function normalise (raw) {
  const b = { ...raw }; const used = []; const problems = []
  for (const [k, v] of Object.entries(DEFAULTS)) if (b[k] === undefined || b[k] === null || b[k] === '') { b[k] = v; if (k !== 'context') used.push(`${k}: ${JSON.stringify(v)}`) }
  if (!b.portrait) problems.push('portrait missing: ask only for the photo (a bot job ends and says so)')
  else if (!fs.existsSync(b.portrait)) problems.push(`portrait ${b.portrait} not found`)
  else if (!/\.(jpe?g|png|webp)$/i.test(b.portrait)) problems.push(`portrait ${b.portrait}: convert it to JPEG or PNG with media-photo-editing first`)
  if (!CONSENT.test(String(b.consent ?? '').trim())) problems.push('consent missing (HR17): record "owner" or "written permission from <name>"; quote and spend nothing until then')
  if (!String(b.sport ?? '').trim()) problems.push('sport missing: ask only for it (a bot job ends and says so)')
  if (!REACTIONS.includes(b.reaction)) problems.push(`reaction '${b.reaction}' is not one of: ${REACTIONS.join(', ')}`)
  if (!FORMATS.includes(b.format)) problems.push(`format '${b.format}' is not one of: ${FORMATS.join(', ')}`)
  if (!CROPS.includes(b.crop)) problems.push(`crop '${b.crop}' is not 9:16 or 16:9`)
  if (!Number.isInteger(b.duration_s) || b.duration_s < 3 || b.duration_s > 15) problems.push(`duration_s ${b.duration_s} is not a whole number of seconds from 3 to 15`)
  if (typeof b.audio !== 'boolean') problems.push('audio is true or false')
  for (const k of TEXT) if (b[k] !== undefined && b[k] !== null && typeof b[k] !== 'string') problems.push(`${k} must be text, not ${typeof b[k]}`)
  const notes = []
  if (b.duration_s === 3) notes.push('3 s: only Kling v3 pro renders it (Seedance takes 4-15 s); two failed Kling clips end the job')
  return { b, used, problems, notes }
}

// A beat for a clip under 4 s keeps its last two moves (change, settled state): three beats do not fit.
const shortBeat = (beat, d) => { const parts = beat.split(', then '); return d < 4 && parts.length > 2 ? parts.slice(1).join(', then ') : beat }
const tail = (s) => (s && String(s).trim() ? ` ${String(s).trim().replace(/([^.!?])$/, '$1.')}` : '')
function fill (tpl, slots) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => { if (!(k in slots)) usage(`template slot ${m} has no value`); return slots[k] })
}

function prompt (which, b, reframe, gpt = false) {
  const f = row[`format:${b.format}`]; const base = row[`reaction:${b.reaction}`]
  const r = TIGHT.includes(b.format) && base.tight && !reframe ? { ...base, ...base.tight } : base
  if (which === 'still') {
    return fill(row.still.prompt, {
      sport: b.sport.trim(), venue: b.venue.trim(), context: b.context && b.context.trim() ? `, ${b.context.trim()}` : '', crowd_mood: b.crowd_mood.trim(),
      framing: reframe ? row['variant:reframe'].prompt : f.prompt, expression: r.prompt, still_note: tail(b.still_note), aspect_line: gpt ? '' : ` Aspect ${b.crop}.`
    })
  }
  return fill(row.motion.prompt, {
    may_move: r.may_move, beat: shortBeat(b.action && String(b.action).trim() ? String(b.action).trim() : r.beat, b.duration_s), range: r.range,
    camera: f.camera, camera_end: f.camera_end, motion_note: tail(b.motion_note)
  })
}

function brief (file) {
  const n = normalise(readJson(file))
  console.log(JSON.stringify({ ok: !n.problems.length, problems: n.problems, notes: n.notes, defaults_used: n.used, brief: n.b }, null, 2))
  return n
}

if (cmd === 'brief') {
  if (!kind) usage('brief needs <brief.json>')
  process.exit(brief(kind).problems.length ? 1 : 0)
} else if (cmd === 'params') {
  const file = rest[0]; const model = opt('model'); const out = opt('out')
  if (!['still', 'clip'].includes(kind) || !file || !model || !out) usage('params still|clip <brief.json> --model <id> --out <file> [--reframe]')
  const n = normalise(readJson(file))
  if (n.problems.length) { console.log(JSON.stringify({ ok: false, problems: n.problems })); process.exit(1) }
  const b = n.b; let fields; let declared
  if (kind === 'still') {
    if (!STILL[model]) usage(`no field mapping for ${model} (mapped: ${Object.keys(STILL).join(', ')}); for another edit route write the params file by hand from ai-gen info and the raw OpenAPI (HR2)`)
    ;({ fields, declared } = STILL[model](b))
  } else {
    const c = CLIP[model]
    if (!c) usage(`no field mapping for ${model} (mapped: ${Object.keys(CLIP).join(', ')}); for another route write the params file by hand from ai-gen info and the raw OpenAPI (HR2)`)
    if (b.duration_s < c.min || b.duration_s > c.max) { console.log(JSON.stringify({ ok: false, problems: [`${model} takes ${c.min}-${c.max} s; the brief asks ${b.duration_s}`] })); process.exit(1) }
    fields = c.fields(b)
    declared = { aspect: b.crop, duration_s: b.duration_s, audio: b.audio ? 'on' : 'off', format: 'mp4' }
  }
  const p = prompt(kind, b, kind === 'still' && flag('reframe'), model.startsWith('openai/gpt-image'))
  const params = { prompt: p, ...fields }
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(params, null, 2) + '\n')
  console.log(JSON.stringify({ ok: true, kind, model, out, reframe: kind === 'still' && flag('reframe'), declared, defaults_used: n.used, prompt_sha256: sha(p), chars: p.length }))
} else if (cmd === 'check') {
  const [file, pfile] = rest
  if (!['still', 'clip'].includes(kind) || !file || !pfile) usage('check still|clip <brief.json> <params file> [--reframe] [--model <id>]')
  const n = normalise(readJson(file))
  if (n.problems.length) { console.log(JSON.stringify({ ok: false, problems: n.problems })); process.exit(1) }
  const got = readJson(pfile)
  const model = opt('model')
  const gpt = kind === 'still' && (model ? model.startsWith('openai/gpt-image') : got.image_size !== undefined)
  const want = prompt(kind, n.b, kind === 'still' && flag('reframe'), gpt)
  // Every field the script writes is compared, not only the prompt: a hand-edited quality, size, duration or sound fails.
  const exp = kind === 'still'
    ? (gpt ? STILL['openai/gpt-image-2/edit'] : STILL['fal-ai/nano-banana-pro/edit'])(n.b).fields
    : (model ? CLIP[model] : (got.resolution !== undefined || got.aspect_ratio !== undefined ? CLIP['bytedance/seedance-2.0/image-to-video'] : CLIP['fal-ai/kling-video/v3/pro/image-to-video'])).fields(n.b)
  const fields = { prompt: got.prompt === want }
  for (const [k, v] of Object.entries(exp)) fields[k] = JSON.stringify(got[k]) === JSON.stringify(v)
  for (const k of Object.keys(got)) if (!(k in fields)) fields[k] = false // a field the script did not write
  const ok = Object.values(fields).every(Boolean)
  console.log(JSON.stringify({ kind, match: ok, fields, want: sha(want), got: sha(String(got.prompt)) }))
  process.exit(ok ? 0 : 1)
} else {
  usage('usage: fancam.mjs brief <brief.json> | params still|clip <brief.json> --model <id> --out <file> [--reframe] | check still|clip <brief.json> <params file> [--reframe]')
}
