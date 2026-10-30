#!/usr/bin/env node
// ugc.mjs: the scripted checks of marketing-ugc (HR13). SL8-authored; no vendor code. Free: it never
// calls ai-gen or the network, and only runs ffprobe/ffmpeg on local files.
//
//   brief    --in artifacts/<p>/ugc/brief.json [--write]     resolve defaults, refuse real people (MKT-L521), pick the workflow and routes
//   claims   --in artifacts/<p>/ugc/claims.json              every claim user-quoted or an observation
//   script   --in artifacts/<p>/ugc/script.json --brief B [--claims C] [--rate W] [--hook-max N] [--write-text F]
//                                                          six beats in order, word budget, hook length, claims; prints spoken_text (the TTS `text`)
//   prompts  --in artifacts/<p>/ugc/prompts.json [--aspect 9:16] [--write]
//                                                          seven layers in order, guardrails last; --write composes `prompt`
//   variants --in artifacts/<p>/ugc/variants.json [--brief B] [--hook-max N] [--final]   3-5 variants, one angle each, one endpoint; --final rejects pending defects
//   clipplan --seconds S --clips N                          per-clip seconds so the b-roll total covers the voiceover (S measured with ffprobe)
//   assembly --voice A --final F [--clips DIR|FILE...]      the stitched cut is not shorter than the voiceover; the clip total covers it
//   grabs    <clip> --out <dir>                             ffprobe duration; frames at 0.5 s, 1.5 s, midpoint, last
//   compare  <source> <clip> --out <dir> [--audio A]        side-by-side frames at 25, 50 and 75 %; the clip runs as long as the new audio A (lip-sync check)
//
// Exit: 0 pass · 1 check failed (each problem printed) · 2 usage · 3 a tool is missing (report it, HR21).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const cmd = args[0]
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const flag = (n) => args.includes(`--${n}`)
const pos = args.slice(1).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--') && !['--write'].includes(all[i - 1])))
const problems = []
const out = {}
const usage = (m) => { console.error(m); process.exit(2) }
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { usage(`cannot read ${p}: ${e.message}`) } }
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean)

const FORMATS = ['testimonial', 'demo', 'unboxing', 'before-after', 'founder', 'faceless', 'split-screen']
const SPEAKERS = ['portrait', 'footage', 'generated', 'avatar', 'none']
const BEATS = ['hook', 'context', 'product_moment', 'proof', 'turn', 'close']
const LAYERS = ['speaker_frame', 'performance', 'product_action', 'camera', 'light_audio', 'platform', 'guardrails']
const ANGLES = ['pain', 'curiosity', 'proof', 'objection', 'result']
const ARC = ['problem', 'product-action', 'proof', 'lifestyle', 'close']
const SENSITIVE = ['metric', 'testimonial', 'review', 'medical', 'financial', 'legal', 'performance']
const KINDS = [...SENSITIVE, 'visible', 'feature', 'offer', 'other']
const FACE_FORMATS = ['testimonial', 'founder', 'unboxing', 'demo']
// words that make a claim whatever the digits say; each must appear in the claim the beat cites (HR18)
const BANNED = /(?:\b(?:guarantee[sd]?|proven|clinically|clinical|cure[sd]?|doctors?|dermatologists?|recommended by|number one|risk[- ]free|instantly|overnight|best|percent|dozens|hundreds|thousands|millions)\b|#\s?1\b|\bno\.?\s?1\b|%|\bin (?:a few |just )?(?:seconds|minutes|days|weeks)\b|\bworks? in\b)/gi
const IMITATE = /\b(?:looks? like|sounds? like|in the style of|the voice of|impersonat\w*|imitat\w*|clone of|copy of (?:a |the )?(?:person|face|voice))\b/i
const TALKING_HEAD_MAX_S = 20 // longest talking-head render planned without a gate; fabric's own limit is unmeasured (MKT-L530)
const SEED_RATE = 2.82 // fal's Brian figure, unverified on SL8 (facts rate-brian-ml2)
const ROUTE = {
  voice: 'fal-ai/elevenlabs/tts/multilingual-v2',
  portrait: 'veed/fabric-1.0',
  'portrait-text': 'veed/fabric-1.0/text',
  footage: 'fal-ai/sync-lipsync/v2',
  still: 'openai/gpt-image-2/edit',
  draft: 'xai/grok-imagine-video/image-to-video',
  final: 'bytedance/seedance-2.0/image-to-video'
}

function brief () {
  const f = opt('in'); if (!f) usage('brief needs --in <brief.json>')
  const b = readJson(f)
  const used = []
  const def = (k, v, why) => { if (b[k] === undefined || b[k] === null || b[k] === '') { b[k] = v; used.push(`${k}=${JSON.stringify(v)} (${why})`) } }
  const m = b.media ?? (b.media = {})
  if (!String(b.product ?? '').trim()) problems.push('product is required: what is shown, sold, taught or explained (end a bot job here, before any spend)')
  def('aspect', '9:16', 'fal default crop')
  def('runtime_s', 15, 'SL8 default: the longest hook clip and the shortest ad')
  def('tone', 'casual', 'SL8 default')
  def('script_source', b.script_text ? 'exact' : 'draft', 'from the request')
  def('variants', 0, 'no hook test asked')
  def('finish', false, 'no polished finish asked')
  def('assemble', false, 'clips returned in edit order')
  // format first, then the speaker it implies: a face format with no portrait gets a generated creator
  if (!b.format && !b.speaker) {
    const photo = (m.product ?? []).length || m.still
    b.format = photo ? 'faceless' : 'testimonial'
    used.push(`format=${b.format} (${photo ? 'a product photo and no creator asked' : 'no product photo to build b-roll from'})`)
  }
  if (!b.speaker) {
    b.speaker = m.footage ? 'footage' : m.portrait ? 'portrait' : FACE_FORMATS.includes(b.format) ? 'generated' : 'none'
    used.push(`speaker=${b.speaker} (from the format and the media supplied)`)
  }
  if (!b.format) { b.format = b.speaker === 'none' ? 'faceless' : 'testimonial'; used.push(`format=${b.format} (from the speaker)`) }
  if (!SPEAKERS.includes(b.speaker)) problems.push(`speaker '${b.speaker}' is not one of ${SPEAKERS.join(', ')}`)
  if (!FORMATS.includes(b.format)) problems.push(`format '${b.format}' is not one of ${FORMATS.join(', ')}`)
  if (['testimonial', 'founder'].includes(b.format) && b.speaker === 'none') problems.push(`format ${b.format} needs a speaker: use "generated", or format "faceless" for b-roll with a voiceover`)
  if (b.format === 'faceless' && !['none'].includes(b.speaker)) problems.push(`format faceless shows no speaker: speaker "${b.speaker}" contradicts it`)
  if (!/^\d+:\d+$/.test(String(b.aspect))) problems.push(`aspect '${b.aspect}' is not W:H`)
  if (!(b.runtime_s >= 4 && b.runtime_s <= 60)) problems.push(`runtime_s ${b.runtime_s} is outside 4-60 s (hooks 6-15 s, ads 15-45 s)`)
  if (b.variants && !(b.variants >= 3 && b.variants <= 5)) problems.push(`variants ${b.variants}: a hook test is 3 to 5 variants`)
  const v = b.voice ?? (b.voice = {})
  if (!v.role) v.role = 'creator'
  if (!v.approve) { v.approve = 'agent'; used.push('voice.approve=agent (no one is asked; the delivery flags the voice)') }
  const notes = []
  let workflow
  if (b.speaker === 'footage') {
    workflow = 'footage'
    if (!m.footage) problems.push('speaker footage needs media.footage (a real creator clip)')
  } else if (['portrait', 'generated', 'avatar'].includes(b.speaker)) {
    workflow = v.route === 'endpoint' ? 'portrait-text' : 'portrait'
    if (b.speaker === 'portrait' && !m.portrait) problems.push('speaker portrait needs media.portrait')
    if (b.speaker === 'avatar') notes.push('avatar route (fal-ai/creatify/aurora) is not offered on this machine yet: a generated portrait on veed/fabric-1.0 stands in')
    if (b.speaker !== 'portrait') notes.push('portrait generated first (step 9), with wardrobe, setting and any held product in it')
  } else {
    workflow = m.still ? 'broll-supplied' : 'broll-generated'
    if (!m.still && !(m.product ?? []).length) problems.push('faceless b-roll needs a product photo (media.product) or a usable still (media.still): without one no still is product-faithful')
  }
  // HR17 and the owner's rule (Oct 28): a real person's face, footage or voice needs SL8's consent text
  // and privacy note, which are not approved yet (learnings MKT-L521). Until then only a person SL8
  // generated runs: media.<kind>_origin = "generated" plus media.<kind>_from (the manifest row or file).
  const REFUSE = 'is refused on this machine for now: SL8 consent text not yet approved (MKT-L521)'
  const synthetic = (k) => m[`${k}_origin`] === 'generated' && String(m[`${k}_from`] ?? '').trim()
  if (m.portrait && !synthetic('portrait')) problems.push(`media.portrait: a real person's photo ${REFUSE}; use speaker "generated" (or set portrait_origin "generated" and portrait_from for an SL8-made portrait)`)
  if (m.footage && !synthetic('footage')) problems.push(`media.footage: real creator footage ${REFUSE}; use speaker "generated"`)
  if (m.audio && !synthetic('audio')) problems.push(`media.audio: a real voice recording ${REFUSE}; drop it and generate the voice (step 6)`)
  const imitating = [b.product, b.tone, b.script_text].some((x) => IMITATE.test(String(x ?? '')))
  if (imitating) problems.push('product, tone or script_text asks for a likeness or a voice of someone ("looks like", "sounds like", "in the style of"): no one is imitated from a name or a description (HR17); describe the creator in generic terms')
  const photos = [...(m.product ?? []), ...(m.still ? [m.still] : [])]
  if (photos.length && typeof m.product_has_person !== 'boolean') problems.push('media.product_has_person is required (true or false): look at each supplied product photo and still and record whether a real person is in any of them (HR17)')
  if (m.product_has_person === true && !synthetic('product')) problems.push(`media.product: a supplied photo with a real person in it ${REFUSE}; supply a photo without the person, or mark product_origin "generated" and product_from`)
  if (['portrait', 'portrait-text', 'footage'].includes(workflow)) {
    notes.push('talking-head render length is unmeasured beyond the VP-195 clip (about 4 s); the delivery says so (MKT-L530)')
    if (b.runtime_s > TALKING_HEAD_MAX_S && !b.long_render_gate) problems.push(`talking head runtime ${b.runtime_s} s > ${TALKING_HEAD_MAX_S} s: fabric's and sync-lipsync's longest input is unmeasured. Open a spend gate before the first long render (node $S/gate.mjs open --slug long-render ...) and set long_render_gate to its slug, or plan shorter renders`)
  }
  if (b.assemble && !workflow.startsWith('broll')) notes.push('assemble applies to faceless b-roll only; a talking head is one clip already')
  const routes = [workflow === 'footage' || workflow === 'portrait' || workflow.startsWith('broll') ? (m.audio ? null : ROUTE.voice) : null,
    ['portrait', 'portrait-text'].includes(workflow) && b.speaker !== 'portrait' ? ROUTE.still : null,
    workflow === 'broll-generated' ? ROUTE.still : null,
    workflow.startsWith('broll') ? ROUTE.draft : null, workflow.startsWith('broll') ? ROUTE.final : null,
    ROUTE[workflow] ?? null, b.finish ? ROUTE.still : null].filter(Boolean)
  const rate0 = Number(b.voice?.rate_wps ?? SEED_RATE)
  if (b.hook_max === undefined) { b.hook_max = Math.max(3, Math.floor(2 * rate0)); used.push(`hook_max=${b.hook_max} (2 s window x ${rate0} w/s; a kit or brief may set another)`) }
  Object.assign(out, { workflow, variants: b.variants, finish: b.finish, routes: [...new Set(routes)], defaults_used: used, notes })
  if (flag('write') && !problems.length) fs.writeFileSync(f, JSON.stringify(b, null, 1) + '\n')
}

function claims () {
  const f = opt('in'); if (!f) usage('claims needs --in <claims.json>')
  const d = readJson(f)
  const list = d.claims ?? []
  list.forEach((c, i) => {
    const id = `claims[${i}]`
    if (!String(c.text ?? '').trim()) problems.push(`${id}: empty text`)
    if (!String(c.id ?? '').trim()) problems.push(`${id}: id is required (a script beat cites it)`)
    if (!KINDS.includes(c.kind)) problems.push(`${id}: kind is required, one of ${KINDS.join(', ')}`)
    if (!['user', 'observation'].includes(c.source)) problems.push(`${id}: source must be "user" (quoted) or "observation"`)
    if (c.source === 'user' && !String(c.quote ?? '').trim()) problems.push(`${id}: a user claim carries the user's words in quote`)
    if (SENSITIVE.includes(c.kind) && (c.source !== 'user' || String(c.quote ?? '').trim() !== String(c.text ?? '').trim())) problems.push(`${id}: a ${c.kind} claim runs only in the user's exact wording (text equal to quote)`)
    if (c.source === 'observation' && SENSITIVE.includes(c.kind)) problems.push(`${id}: an observation cannot be a ${c.kind} claim`)
  })
  for (const [i, r] of (d.removed ?? []).entries()) if (!r.reason) problems.push(`removed[${i}]: say why it was removed`)
  const ids = list.map((c) => c.id); const dup = ids.filter((x, i) => x && ids.indexOf(x) !== i)
  if (dup.length) problems.push(`claim ids repeat: ${[...new Set(dup)].join(', ')}`)
  Object.assign(out, { claims: list.length, removed: (d.removed ?? []).length })
}

function script () {
  const f = opt('in'); const bf = opt('brief'); if (!f || !bf) usage('script needs --in <script.json> --brief <brief.json>')
  const s = readJson(f); const b = readJson(bf)
  if (!(Number(b.runtime_s) > 0)) usage(`${bf} has no runtime_s: run "brief --in ${bf} --write" first`)
  const beats = s.beats ?? []
  const names = beats.map((x) => x.beat)
  if (names.join(',') !== BEATS.join(',')) problems.push(`beats must be ${BEATS.join(', ')} in that order; got ${names.join(', ') || 'none'}`)
  const strip = (t) => String(t ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()
  beats.forEach((x, i) => { if (!String(x.phrase ?? '').trim()) problems.push(`beats[${i}] ${x.beat}: empty phrase (a close may be a final frame: write the spoken line, or only "[final frame]")`) })
  const rate = Number(opt('rate', b.voice?.rate_wps ?? SEED_RATE))
  const spokenText = beats.map((x) => strip(x.phrase)).filter(Boolean).join(' ')
  const spoken = words(spokenText)
  const budget = Math.floor(b.runtime_s * rate)
  const hookMax = Number(opt('hook-max', b.hook_max ?? Math.max(3, Math.floor(2 * rate))))
  const hook = words(strip(beats[0]?.phrase))
  if (spoken.length > budget) problems.push(`${spoken.length} words > ${budget} (runtime ${b.runtime_s} s × ${rate} w/s): trim a beat, do not re-render to chase it`)
  if (hook.length > hookMax) problems.push(`hook is ${hook.length} words > ${hookMax} (the 1-2 s window; a kit or brief may set another): compress the hook-bank line to its image`)
  const cf = opt('claims')
  if (cf) {
    const claims = readJson(cf).claims ?? []
    const byId = new Map(claims.map((c) => [String(c.id), String(c.text ?? '').toLowerCase()]))
    const all = [...byId.values()].join(' \n ')
    const tok = (t) => t.toLowerCase().replace(/^[^\w$€£#]+|[^\w%]+$/g, '')
    const claimToks = new Set(words(all).map(tok))
    for (const t of spoken) if (/[0-9%$€£]/.test(t) && !claimToks.has(tok(t))) problems.push(`'${t}' is a figure not on the claims list (HR18)`)
    beats.forEach((x, i) => {
      const text = strip(x.phrase); const cited = x.claim === undefined ? null : [].concat(x.claim).map(String)
      if (['proof', 'turn'].includes(x.beat) && text && !(cited && cited.length)) problems.push(`beats[${i}] ${x.beat}: cite the claim it rests on (claim: "<id>") or rewrite it as a visible observation with its own id`)
      for (const id of cited ?? []) if (!byId.has(id)) problems.push(`beats[${i}] ${x.beat}: claim '${id}' is not in the claims list`)
      const own = (cited ?? []).map((id) => byId.get(id) ?? '').join(' ')
      for (const m of text.match(BANNED) ?? []) if (!own.includes(m.toLowerCase())) problems.push(`beats[${i}] ${x.beat}: '${m}' makes a claim; it runs only in the words of a claim the beat cites (HR18)`)
    })
  }
  const wf = opt('write-text')
  if (wf && !problems.length) { fs.mkdirSync(path.dirname(wf), { recursive: true }); fs.writeFileSync(wf, spokenText + '\n') }
  Object.assign(out, { words: spoken.length, budget, rate_wps: rate, rate_source: opt('rate') ? 'flag' : b.voice?.rate_wps ? 'brief.voice' : 'seed 2.82 (unverified on SL8)', est_seconds: +(spoken.length / rate).toFixed(1), hook_words: hook.length, hook_max: hookMax, spoken_text: spokenText, text_file: wf && !problems.length ? wf : null })
}

function prompts () {
  const f = opt('in'); if (!f) usage('prompts needs --in <prompts.json>')
  const d = readJson(f); const aspect = opt('aspect', '9:16')
  const list = d.prompts ?? []
  if (!list.length) problems.push('no prompts')
  const broll = {}
  list.forEach((p, i) => {
    const id = p.id ?? `prompts[${i}]`
    const L = p.layers ?? {}
    const keys = Object.keys(L)
    if (keys.join(',') !== LAYERS.join(',')) problems.push(`${id}: layers must be ${LAYERS.join(', ')} in that order (guardrails last)`)
    for (const k of LAYERS) if (!String(L[k] ?? '').trim()) problems.push(`${id}: layer ${k} is empty`)
    const pl = String(L.platform ?? '').toLowerCase(); const g = String(L.guardrails ?? '').toLowerCase()
    if (!pl.includes(aspect)) problems.push(`${id}: platform layer does not name ${aspect}`)
    if (!/caption/.test(pl)) problems.push(`${id}: platform layer does not forbid generated captions`)
    for (const w of ['claim', 'logo', 'packaging']) if (!g.includes(w)) problems.push(`${id}: guardrail layer does not cover ${w}`)
    if (p.kind === 'broll') {
      ;(broll[p.variant ?? 'base'] ??= []).push(p.beat)
      if (!ARC.includes(p.beat)) problems.push(`${id}: b-roll beat '${p.beat}' is not one of ${ARC.join(', ')}`)
      if (!/single continuous shot/i.test(Object.values(L).join(' '))) problems.push(`${id}: b-roll needs "single continuous shot, no scene cuts"`)
    }
    const composed = LAYERS.map((k) => String(L[k] ?? '').trim().replace(/[.;,]$/, '')).join('. ') + '.'
    if (flag('write')) p.prompt = composed
    else if (p.prompt !== undefined && p.prompt !== composed) problems.push(`${id}: prompt differs from its layers (rerun with --write)`)
  })
  for (const [g, l] of Object.entries(broll)) if (!(l.length >= 2 && l.length <= 5)) problems.push(`${l.length} b-roll clips for ${g === 'base' ? 'the ad' : 'variant ' + g}: plan 2 to 5 per ad (add a variant field to group a hook test)`)
  if (flag('write') && !problems.length) fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n')
  Object.assign(out, { prompts: list.length, broll: Object.fromEntries(Object.entries(broll).map(([g, l]) => [g, l.length])) })
}

function variants () {
  const f = opt('in'); if (!f) usage('variants needs --in <variants.json>')
  const d = readJson(f); const rows = d.variants ?? []; const bf = opt('brief'); const hookMax = Number(opt('hook-max', bf ? (readJson(bf).hook_max ?? 5) : 5))
  if (!(rows.length >= 3 && rows.length <= 5)) problems.push(`${rows.length} variants: a hook test is 3 to 5`)
  if (!d.fixed || !d.fixed.product || !d.fixed.proof) problems.push('fixed must hold the product and proof every variant shares (plus speaker, crop, references)')
  const seen = new Set()
  rows.forEach((r, i) => {
    const want = String.fromCharCode(65 + i)
    if (r.variant !== want) problems.push(`variants[${i}]: letter ${r.variant}, expected ${want}`)
    if (!ANGLES.includes(r.angle)) problems.push(`${want}: angle '${r.angle}' is not one of ${ANGLES.join(', ')}`)
    if (seen.has(r.angle)) problems.push(`${want}: angle ${r.angle} repeats`); seen.add(r.angle)
    if (!words(r.hook).length) problems.push(`${want}: no hook`)
    if (words(r.hook).length > hookMax) problems.push(`${want}: hook ${words(r.hook).length} words > ${hookMax}`)
    if (!String(r.opening_visual ?? '').trim()) problems.push(`${want}: no opening_visual`)
    const dfx = String(r.defects ?? '').trim()
    if (!dfx) problems.push(`${want}: defects is required ("pending" until the quality bar, then "none" or the defect)`)
    else if (flag('final') && /^pending$/i.test(dfx)) problems.push(`${want}: defects is still pending: write what the frame grabs showed ("none" allowed)`)
    if (r.endpoint !== rows[0]?.endpoint) problems.push(`${want}: endpoint ${r.endpoint} differs from A's ${rows[0]?.endpoint}: one route for a fair test`)
  })
  Object.assign(out, { variants: rows.length, angles: [...seen] })
}

function tool (bin, a) {
  const r = spawnSync(bin, a, { encoding: 'utf8' })
  if (r.error) { console.error(`${bin} is missing: the machine is broken; report it, never install it (HR21)`); process.exit(3) }
  return r
}
const duration = (f) => { const r = tool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]); const s = parseFloat(r.stdout); if (!(s > 0)) usage(`no duration for ${f}`); return s }

function grabs () {
  const [clip] = pos; const dir = opt('out'); if (!clip || !dir) usage('grabs <clip> --out <dir>')
  fs.mkdirSync(dir, { recursive: true })
  const dur = duration(clip); const stem = path.basename(clip).replace(/\.[^.]+$/, '')
  const ts = [...new Set([0.5, 1.5, dur / 2, Math.max(dur - 0.1, 0)].filter((t) => t < dur).map((t) => +t.toFixed(2)))]
  const frames = []
  for (const t of ts) {
    const o = path.join(dir, `${stem}-qc-${t.toFixed(2)}s.png`)
    const r = tool('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', clip, '-frames:v', '1', o])
    if (r.status !== 0 || !fs.existsSync(o)) problems.push(`no frame at ${t} s: ${r.stderr.trim()}`); else frames.push(o)
  }
  Object.assign(out, { clip, duration_s: +dur.toFixed(3), frames })
}

function compare () {
  const [src, clip] = pos; const dir = opt('out'); if (!src || !clip || !dir) usage('compare <source> <clip> --out <dir>')
  fs.mkdirSync(dir, { recursive: true })
  const ds = duration(src); const dc = duration(clip); const d = Math.min(ds, dc); const stem = path.basename(clip).replace(/\.[^.]+$/, '')
  const frames = []
  for (const t of [0.25, 0.5, 0.75].map((x) => +(d * x).toFixed(2))) {
    const o = path.join(dir, `${stem}-cmp-${t.toFixed(2)}s.png`)
    const r = tool('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', src, '-ss', String(t), '-i', clip, '-filter_complex', '[0:v]scale=-2:960[a];[1:v]scale=-2:960[b];[a][b]hstack', '-frames:v', '1', o])
    if (r.status !== 0 || !fs.existsSync(o)) problems.push(`no side-by-side at ${t} s: ${r.stderr.trim()}`); else frames.push(o)
  }
  const af = opt('audio'); let audio_s = null
  if (af) { audio_s = duration(af); if (Math.abs(audio_s - dc) > 0.5) problems.push(`clip runs ${dc.toFixed(2)} s, the new audio ${audio_s.toFixed(2)} s: the lip-synced clip should run as long as the speech`) }
  else out.note = 'no --audio given: the clip length was not compared; pass the new speech file'
  Object.assign(out, { source_s: +ds.toFixed(3), clip_s: +dc.toFixed(3), audio_s: audio_s === null ? null : +audio_s.toFixed(3), frames })
}

function clipplan () {
  const sec = Number(opt('seconds')); const n = Number(opt('clips'))
  if (!(sec > 0) || !(n >= 2 && n <= 5)) usage('clipplan --seconds <measured voiceover seconds> --clips <2-5>')
  const per = Math.min(15, Math.max(4, Math.ceil((sec + 0.5) / n)))
  if (per * n < sec + 0.5) problems.push(`${n} clips of at most 15 s cover ${per * n} s, under the voiceover's ${sec} s + 0.5 s: plan more clips or trim the script`)
  Object.assign(out, { voiceover_s: sec, clips: n, seconds_per_clip: per, seedance_duration: String(per), grok_duration: per, total_s: per * n })
}

function assembly () {
  const voice = opt('voice'); const fin = opt('final'); const clips = opt('clips')
  if (!voice || !fin) usage('assembly --voice <voiceover> --final <ad.mp4> [--clips <dir|file,file>]')
  const v = duration(voice); const f = duration(fin)
  if (f + 0.1 < v) problems.push(`final runs ${f.toFixed(2)} s, shorter than the voiceover ${v.toFixed(2)} s: the voice is cut (-shortest); plan longer clips (clipplan) and re-mux`)
  let total = null
  if (clips) {
    const list = fs.existsSync(clips) && fs.statSync(clips).isDirectory() ? fs.readdirSync(clips).filter((x) => /\.(mp4|mov|webm)$/i.test(x)).map((x) => path.join(clips, x)) : clips.split(',')
    total = list.reduce((a, c) => a + duration(c), 0)
    if (total + 0.1 < v) problems.push(`the clips total ${total.toFixed(2)} s, under the voiceover ${v.toFixed(2)} s`)
  }
  Object.assign(out, { voiceover_s: +v.toFixed(3), final_s: +f.toFixed(3), clips_total_s: total === null ? null : +total.toFixed(3) })
}

const run = { brief, claims, script, prompts, variants, clipplan, assembly, grabs, compare }[cmd]
if (!run) usage('usage: ugc.mjs brief|claims|script|prompts|variants|clipplan|assembly|grabs|compare … (see the header)')
run()
console.log(JSON.stringify({ check: cmd, ok: !problems.length, ...out, problems }, null, 1))
process.exit(problems.length ? 1 : 0)
