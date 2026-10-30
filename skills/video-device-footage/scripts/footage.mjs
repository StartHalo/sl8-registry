#!/usr/bin/env node
// footage.mjs: the scripted steps of video-device-footage (SL8-authored; HR13). Node >= 20, no dependencies.
//   frame  <variant> [--format json]
//          print the variant's fixed texts from references/frames.json (openers, closers, headers, phrases)
//   check  <reply.txt> --variant V [--lane L] [--resolution R] [--max-chars N] [--prefix clip] [--out-dir DIR]
//          split the writer's reply into blocks (one paragraph, then 'Duration: Ns'), write
//          <out-dir>/<prefix>-<k>.prompt.txt (the paragraph alone) and <prefix>-<k>.check.json, and lint each block
//   params <prompt.txt> --lane L --out <clip>.params.json [--duration N] [--resolution R] [--negative TEXT]
//          [--safety 1-6] [--auto-fix true|false] [--seed N]
//          write the exact payload for the lane and <clip>.request.json (the declared output, HR1)
//   sheet  <clip.mp4> | --result <result.json>  --out <sheet.png> [--fps 2] [--cols 6] [--cells 12] [--width 270]
//          contact sheets that cover the whole clip, at most 12 cells (6 s) each: <stem>-1.png, <stem>-2.png ...
// Variants: bodycam courtroom cctv doorbell phone press nature.  Lanes: seedance seedance-fast kling veo.
// Exit: 0 ok (WARN lines may print) · 1 a check failed or a value was refused · 2 usage · 3 a tool is missing.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRAMES = path.join(HERE, '..', 'references', 'frames.json')

// Bands: [min s, max s, character guide, beats]. Bands are guides: any whole second that fits is allowed.
const CINEMA = ['cut to', 'close-up', 'close up', 'angle on', 'we see']
const VARIANTS = {
  bodycam: { bands: [[5, 6, '900-1,400', '2'], [7, 9, '1,600-2,400', '3-4'], [10, 12, '2,400-3,000', '4-5']], veoNote: 'on veo a force sequence is written for 8 s with fewer events (the 6-8 s band)', labels: ['Scene geography:', 'Beat one:', 'Audio:'], speech: 'braces', banned: [...CINEMA, 'zoom', 'pan'] },
  courtroom: { bands: [[4, 5, '600-1,000', '2'], [6, 8, '1,200-2,000', '3-4'], [9, 12, '2,000-2,800', '4-5']], labels: [/Scene geography(, established first)?:/, 'Beat one:', 'Audio:'], speech: 'quotes', lineMax: 10, banned: [...CINEMA, 'zoom', 'pan'] },
  cctv: { bands: [[4, 6, '1,500-2,000', '2'], [6, 9, '2,000-2,600', '3-4'], [9, 12, '2,500-3,000', '4-5']], labels: ['Scene geography:', 'Beat one:', 'Audio:'], speech: 'braces', banned: [...CINEMA, 'zoom', 'pan', 'the camera follows'] },
  doorbell: { bands: [[4, 6, '900-1,400', '2'], [6, 9, '1,600-2,400', '3'], [9, 12, '2,400-3,000', '4']], labels: ['Scene geography:', 'Beat one:', 'Audio:'], speech: 'braces', banned: [...CINEMA, 'zoom in', 'the camera pans', 'we push in', 'reveal'] },
  phone: { bands: [[5, 6, '2,000-2,500', '2-3'], [7, 9, '2,300-2,800', '3-4'], [10, 12, '2,500-3,000', '4-5']], labels: ['Scene geography:', 'Beat one:', 'Audio:'], speech: 'braces', banned: [...CINEMA, 'zoom in on', 'pan across'], phoneActor: true, allow916: true },
  press: { bands: [[4, 5, '1,700-2,100', '2'], [5, 7, '2,000-2,500', '3-4'], [6, 8, '2,300-2,700', '3-4 (slow motion)'], [7, 9, '2,500-2,900', '4-5 (two-stage)']], labels: ['Setup:', 'Audio:'], speech: 'braces', lineMax: 12, banned: [...CINEMA, 'zoom', 'pan', 'cinematic', 'dramatic angle'] },
  nature: { bands: [[5, 10, '900-1,500', 'one action']], labels: [], speech: 'none', hardCap: 1900, banned: ['cinematic', 'cinema camera', 'film look', '4k', '8k', 'hdr', 'epic', 'breathtaking', 'masterful', 'broadcast documentary camera', 'golden hour', 'gimbal', 'drone', 'whip pan'], allow916: true }
}
const SOFT_CAP = 3000
// Camera uses only: a noun ('a frying pan', 'no zoom') is fine; the move is not.
const CAMERA = {
  pan: 'pan(?:s|ning|ned)?\\s+(?:left|right|across|up|down|over|to|back|around|along)|(?:camera|phone|view|frame|shot|it)\\s+pans|panning',
  zoom: 'zoom(?:s|ed|ing)?\\s+(?:in|out|on|into|to|back)|(?:camera|phone|view|frame|shot|it)\\s+zooms|zooming'
}
// Safe-lane lint (WARN): real-looking identifiers and brands. A cheap net, not a proof.
const SAFE = [
  [/\b(?:unit|badge|plate|car|squad|engine|medic|ladder|no\.?|number)\s?#?\s?\d{2,}\b/i, 'a number next to unit, badge, plate or car'],
  [/\b(?:police|fire|sheriff'?s?)\s+(?:department|dept\.?)\b|\bsheriff\b|\bcounty\s+(?:police|sheriff|fire)\b/i, 'a named department or sheriff'],
  [/\b(?:ring|nest|arlo|wyze|eufy|hikvision|dahua|axon|taser|gopro|iphone|samsung|apple|nike|coca-cola|walmart|target|starbucks|mcdonald'?s|amazon|ford|toyota|tesla)\b/i, 'a real brand']
]
const LANES = {
  seedance: { model: 'bytedance/seedance-2.0/text-to-video', durations: range(4, 15), resolutions: ['480p', '720p'], resolution: '720p' },
  'seedance-fast': { model: 'bytedance/seedance-2.0/fast/text-to-video', durations: range(4, 15), resolutions: ['480p', '720p'], resolution: '720p', ceiling: { '480p': 12, '720p': 10 } },
  kling: { model: 'fal-ai/kling-video/v3/pro/text-to-video', durations: range(3, 15), resolutions: [], negative: true },
  veo: { model: 'fal-ai/veo3.1/fast', durations: [4, 6, 8], resolutions: ['720p', '1080p'], resolution: '720p', negative: true, veo: true }
}
// The default exclusions for the lanes that take negative_prompt (WF36 enrichment fal n=25). Kling ships
// "blur, distort, and low quality" as its default, which fights the degradation these clips ask for.
const NEGATIVE = 'on-screen text, captions, subtitles, timestamp, date stamp, logo, watermark, camera interface, recording icons, phone or hand in frame'

function range (a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o }
class Fail extends Error { constructor (m, code = 1) { super(m); this.code = code } }
function args (argv) {
  const o = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const v = argv[i + 1]
    if (!a.startsWith('--')) o._.push(a); else if (v === undefined || v.startsWith('--')) o[a.slice(2)] = true; else { o[a.slice(2)] = v; i++ }
  }
  return o
}
const out = (o) => console.log(JSON.stringify(o))
const norm = (s) => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
const wordsOf = (s) => (String(s).match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) ?? [])
function frames (variant) {
  const t = JSON.parse(fs.readFileSync(FRAMES, 'utf8'))
  return t.rows.filter((r) => r.variant === variant)
}
function variantOf (v) {
  if (!VARIANTS[v]) throw new Fail(`--variant must be one of ${Object.keys(VARIANTS).join(', ')}`, 2)
  return VARIANTS[v]
}

// ---------- frame
function frame (o) {
  const v = o._[0]; variantOf(v)
  const rows = frames(v)
  if (o.format === 'json') { out({ variant: v, rows }); return 0 }
  for (const r of rows) console.log(`## ${r.slug} (${r.part}${r.group ? `, one of ${r.group}` : ''})\n${r.prompt}\n`)
  return 0
}

// ---------- check
function spoken (text, mode) {
  const lines = []
  if (mode === 'braces' || mode === 'none') for (const m of text.matchAll(/\{([^{}]*)\}/g)) lines.push(m[1])
  if (mode === 'quotes') {
    // single-quoted lines; an apostrophe between two letters (it's, ma'am) is not a quote
    const re = /(^|[\s:(—-])['‘]((?:[^'‘’]|(?<=\p{L})['’](?=\p{L}))+?)['’](?=$|[\s.,;:!?)—-])/gu
    for (const m of text.matchAll(re)) lines.push(m[2])
  }
  return lines.map((l) => ({ text: l.trim(), words: wordsOf(l).length }))
}
function negated (low, idx) {
  const before = low.slice(0, idx).split(/\s+/).slice(-6)
  return before.some((w) => /^(no|not|never|without|nor|none|nothing|nowhere)$/.test(w.replace(/[^a-z]/g, '')))
}
function fixedSegments (template) {
  return template.split(/\[[^\]]*\]/).map((s) => norm(s).replace(/^[\s,;:.\-]+|[\s,;:.\-]+$/g, '')).filter((s) => s.length >= 12)
}
function fixedCheck (para, rows) {
  const low = norm(para); const report = []
  const groups = new Map()
  for (const r of rows.filter((x) => x.check)) {
    const key = r.group ?? r.slug
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  for (const [key, members] of groups) {
    let best = null
    for (const r of members) {
      const segs = fixedSegments(r.prompt); let at = 0; const missing = []
      for (const s of segs) { const i = low.indexOf(s, at); if (i < 0) missing.push(s); else at = i + s.length }
      if (!best || missing.length < best.missing.length) best = { slug: r.slug, segments: segs.length, missing }
    }
    report.push({ fixed: key, part: members[0].part, closest: best.slug, segments: best.segments, missing: best.missing.length, first_missing: best.missing[0] ?? null })
  }
  return report
}
function check (o) {
  const file = o._[0]
  if (!file || !o.variant) throw new Fail('usage: check <reply.txt> --variant V [--lane L] [--max-chars N] [--prefix clip] [--out-dir DIR]', 2)
  const V = variantOf(o.variant)
  if (o.lane && !LANES[o.lane]) throw new Fail(`--lane must be one of ${Object.keys(LANES).join(', ')}`, 2)
  if (!fs.existsSync(file)) throw new Fail(`no reply file at ${file}`, 2)
  const outDir = o['out-dir'] ?? path.dirname(file); const prefix = o.prefix ?? 'clip'
  const rows = frames(o.variant)
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim()
  const blocks = []
  // a blank line before the tag, or inside a paragraph, does not make a new clip: a block that is only the tag joins the one before
  for (const b of raw.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)) {
    if (/^Duration:\s*\d+s$/.test(b) && blocks.length && !/(^|\n)Duration:\s*\d+s$/.test(blocks.at(-1))) blocks[blocks.length - 1] += `\n${b}`
    else blocks.push(b)
  }
  let failed = 0; const results = []
  blocks.forEach((block, i) => {
    const k = i + 1; const fails = []; const warns = []
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const last = lines[lines.length - 1] ?? ''
    const tag = /^Duration:\s*(\d+)s$/.exec(last)
    if (!tag) fails.push(`block ${k}: the last line must be the tag 'Duration: Ns' (a whole number of seconds), found '${last.slice(0, 60)}'`)
    const body = tag ? lines.slice(0, -1) : lines
    if (body.length > 1) warns.push(`block ${k}: the paragraph spans ${body.length} lines; joined with spaces (write one paragraph)`)
    const para = body.join(' ').trim()
    const N = tag ? Number(tag[1]) : null
    if (/^(prompt|here is|here's)\b/i.test(para) || /^["'`]/.test(para) || /```|^#|^\s*[-*] /m.test(block)) fails.push(`block ${k}: the reply must be the bare paragraph (no label, quotes, markdown or list)`)
    if (/Duration:/i.test(para)) fails.push(`block ${k}: a Duration tag sits inside the paragraph`)
    const chars = [...para].length
    if (V.hardCap && chars > V.hardCap) fails.push(`block ${k}: ${chars} characters, over the hard cap of ${V.hardCap}`)
    if (!V.hardCap && chars > SOFT_CAP) warns.push(`block ${k}: ${chars} characters, over the ~${SOFT_CAP} soft guide; trim optional detail, never the fixed text, and record it`)
    if (o['max-chars'] && chars > Number(o['max-chars'])) fails.push(`block ${k}: ${chars} characters, over the route's stated prompt limit ${o['max-chars']}`)
    const band = N == null ? null : V.bands.find(([a, b]) => N >= a && N <= b)
    const veoBand = o.lane === 'veo' && N != null ? [4, 6, 8].reduce((a, b) => (Math.abs(b - N) < Math.abs(a - N) ? b : a)) : null
    if (o.lane === 'veo') console.error(`NOTE block ${k}: the veo lane renders 4, 6 or 8 s${V.veoNote ? `; ${V.veoNote}` : '; take the nearest to the variant band'}${veoBand != null && veoBand !== N ? ` (${N} s is not offered: nearest is ${veoBand} s)` : ''}`)
    if (N != null && !band) warns.push(`block ${k}: ${N} s is outside the ${o.variant} bands (${V.bands.map(([a, b]) => `${a}-${b}`).join(', ')}); bands are guides`)
    if (V.hardCap && (chars < 900 || chars > 1500)) warns.push(`block ${k}: ${chars} characters against the 900-1,500 target`)
    if (o.lane && N != null) {
      const L = LANES[o.lane]; const res = o.resolution ?? L.resolution
      if (!L.durations.includes(N)) fails.push(`block ${k}: ${N} s is not offered by the ${o.lane} lane (${L.veo ? '4, 6 or 8' : `${L.durations[0]}-${L.durations.at(-1)}`})`)
      if (L.ceiling && res && N > L.ceiling[res]) fails.push(`block ${k}: ${N} s at ${res} is over the ${o.lane} lane's measured ceiling of ${L.ceiling[res]} s (facts beh-seedance-fast-ceiling)`)
    }
    for (const lab of V.labels) {
      const ok = lab instanceof RegExp ? lab.test(para) : para.includes(lab)
      if (!ok) fails.push(`block ${k}: missing the section label ${lab instanceof RegExp ? 'Scene geography:' : `'${lab}'`}`)
    }
    const low = norm(para)
    for (const term of V.banned) {
      const src = CAMERA[term] ?? term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])(?:${src})(?=$|[^\\p{L}\\p{N}])`, 'gu')
      for (const m of low.matchAll(re)) if (!negated(low, m.index + m[1].length)) { fails.push(`block ${k}: camera or cinema word '${term}' (write the device's or wearer's own motion instead)`); break }
    }
    if (V.phoneActor) {
      const m = /\bthe phone (jerks|whips|drifts|holds|finds|swings|tilts|shakes|pans|moves|overshoots|pushes|loses|catches|follows|refinds|re-finds|tracks|hunts|zooms|lurches|reaches|aims|points)\b/i.exec(para)
      if (m) fails.push(`block ${k}: '${m[0]}' makes the phone an actor; write it as the view or the frame (it invites a hand holding a phone)`)
    }
    const setting = [/\b\d+(?:\.\d+)?\s?(?:secs?|seconds)\b/i, /\b(?:[1-9]|1[0-5])s\b/, /\b(?:seedance|kling|veo|ai-gen|fal\.ai)\b/i, /\b(?:aspect ratio|720p|1080p|480p)\b/i, /\bprompt\b/i]
    if (!V.allow916) setting.push(/\b9:16\b/)
    for (const re of setting) { const m = re.exec(para); if (m) fails.push(`block ${k}: setting or tool word '${m[0]}' in the paragraph (length and settings live only in the tag and the params file)`) }
    const speech = spoken(para, V.speech)
    const total = speech.reduce((a, l) => a + l.words, 0)
    if (V.speech === 'none' && speech.length) fails.push(`block ${k}: spoken words in a clip that carries no voice`)
    if (total > 20) fails.push(`block ${k}: ${total} spoken words, over the ~20 ceiling (about two words a second)`)
    else if (total > 15) warns.push(`block ${k}: ${total} spoken words, over the ~15 budget`)
    if (V.lineMax) for (const l of speech) if (l.words > V.lineMax) fails.push(`block ${k}: a spoken line of ${l.words} words, over ${V.lineMax}: '${l.text.slice(0, 50)}'`)
    if (V.speech === 'quotes' && speech.length > 2) warns.push(`block ${k}: ${speech.length} quoted lines; the courtroom writer allows the judge line and one short reply`)
    if (V.speech === 'quotes' && /\{[^}]*\}/.test(para)) warns.push(`block ${k}: braces in a courtroom paragraph; its dialogue uses single quotes`)
    for (const [re, what] of SAFE) { const m = re.exec(para); if (m) warns.push(`block ${k}: safe lane: ${what} ('${m[0]}'); the clip must stay fictional, no real brand, plate, department or number`) }
    if (V.speech === 'braces') {
      for (const m of para.matchAll(/\{([^{}]*)\}/g)) {
        const around = para.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80)
        if (!/\b(male|female|man|woman|voice|flat|tinny|shouted|calm|stern|raspy|low|high|young|older|child|clipped|distorted)\b/i.test(around)) warns.push(`block ${k}: braced line '${m[1].slice(0, 40)}' has no voice gender or register tag nearby`)
        if (/\b(radio|speaker|dispatch|intercom)\b/i.test(para.slice(Math.max(0, m.index - 60), m.index)) && o.variant === 'bodycam') warns.push(`block ${k}: a radio or speaker line is scripted in braces ('${m[1].slice(0, 40)}'); the bodycam writer keeps radio voices as unintelligible chatter`)
      }
    }
    const fixed = fixedCheck(para, rows)
    for (const f of fixed) if (f.missing && ['opener', 'closer', 'header'].includes(f.part)) fails.push(`block ${k}: fixed ${f.part} '${f.fixed}' is missing or rewritten (${f.missing} of ${f.segments} segment(s), first: '${f.first_missing.slice(0, 60)}'); it carries the no-text and no-interface ban, so keep it as written`)
    else if (f.missing) warns.push(`block ${k}: fixed text '${f.fixed}' differs from frames.json in ${f.missing} of ${f.segments} segment(s), first: '${f.first_missing.slice(0, 60)}'`)
    const rec = { block: k, variant: o.variant, lane: o.lane ?? null, duration_s: N, chars, band: band ? { seconds: `${band[0]}-${band[1]}`, chars: band[2], beats: band[3] } : null, spoken_words: total, spoken_lines: speech, fixed, fails, warns }
    if (!fails.length) {
      fs.mkdirSync(outDir, { recursive: true })
      const stem = path.join(outDir, `${prefix}-${k}`)
      fs.writeFileSync(`${stem}.prompt.txt`, para + '\n')
      fs.writeFileSync(`${stem}.check.json`, JSON.stringify(rec, null, 2) + '\n')
      rec.prompt_file = `${stem}.prompt.txt`
    } else failed++
    results.push(rec)
  })
  if (!blocks.length) { out({ check: 'reply', file, fails: ['the reply is empty'] }); return 1 }
  for (const r of results) {
    for (const w of r.warns) console.error(`WARN ${w}`)
    for (const f of r.fails) console.error(`FAIL ${f}`)
    out({ block: r.block, duration_s: r.duration_s, chars: r.chars, band: r.band, spoken_words: r.spoken_words, prompt_file: r.prompt_file ?? null, fails: r.fails.length, warns: r.warns.length })
  }
  return failed ? 1 : 0
}

// ---------- params
function params (o) {
  const pf = o._[0]
  if (!pf || !o.lane || !o.out) throw new Fail('usage: params <prompt.txt> --lane L --out <clip>.params.json [--duration N] [--resolution R] [--negative TEXT] [--safety 1-6] [--auto-fix true|false] [--seed N]', 2)
  const L = LANES[o.lane]; if (!L) throw new Fail(`--lane must be one of ${Object.keys(LANES).join(', ')}`, 2)
  if (!fs.existsSync(pf)) throw new Fail(`no prompt file at ${pf}`, 2)
  const prompt = fs.readFileSync(pf, 'utf8').trim()
  if (!prompt) throw new Fail('the prompt file is empty')
  if (/Duration:/i.test(prompt)) throw new Fail('the prompt file still carries a Duration tag: run check first')
  const checkFile = pf.replace(/\.prompt\.txt$/, '.check.json')
  const rec = fs.existsSync(checkFile) ? JSON.parse(fs.readFileSync(checkFile, 'utf8')) : null
  const N = o.duration != null ? Number(o.duration) : rec?.duration_s
  if (!Number.isInteger(N)) throw new Fail('no duration: pass --duration N or run check first (it writes <clip>.check.json)', 2)
  if (rec?.duration_s != null && o.duration != null && rec.duration_s !== N) console.error(`WARN the tag said ${rec.duration_s} s and --duration says ${N} s; the payload uses ${N} s (say why in the run notes)`)
  if (!L.durations.includes(N)) throw new Fail(`${N} s is not offered by ${L.model} (${L.veo ? '"4s", "6s" or "8s"' : `"${L.durations[0]}"-"${L.durations.at(-1)}"`})`)
  const p = { prompt }
  if (L.veo) p.duration = `${N}s`; else p.duration = String(N)
  p.aspect_ratio = '9:16'
  let res = null
  if (L.resolutions.length) {
    res = o.resolution ?? L.resolution
    if (!L.resolutions.includes(res)) throw new Fail(`resolution ${res} is not offered by ${L.model} (${L.resolutions.join(', ')})`)
    if (L.ceiling && N > L.ceiling[res]) throw new Fail(`${N} s at ${res} is over the measured ceiling of ${L.ceiling[res]} s on ${L.model} (facts beh-seedance-fast-ceiling): stay on the base route`)
    p.resolution = res
  } else if (o.resolution) throw new Fail(`${L.model} has no resolution field`)
  p.generate_audio = true
  if (L.negative) p.negative_prompt = typeof o.negative === 'string' ? o.negative : NEGATIVE
  else if (o.negative) throw new Fail(`${L.model} has no negative_prompt field: the exclusions stay in the paragraph and are unenforced`)
  if (L.veo) {
    const s = String(o.safety ?? '4'); if (!/^[1-6]$/.test(s)) throw new Fail('--safety must be "1"-"6"')
    p.safety_tolerance = s
    p.auto_fix = o['auto-fix'] === 'true'
  } else if (o.safety || o['auto-fix']) throw new Fail(`${L.model} has no safety_tolerance or auto_fix field`)
  if (o.seed != null) { if (!/^\d+$/.test(String(o.seed))) throw new Fail('--seed must be a whole number'); p.seed = Number(o.seed) }
  fs.mkdirSync(path.dirname(o.out), { recursive: true })
  fs.writeFileSync(o.out, JSON.stringify(p, null, 2) + '\n')
  const declared = { aspect: '9:16', duration_s: N, audio: 'native', format: 'mp4', ...(res ? { resolution: res } : {}) }
  const reqFile = o.out.replace(/\.params\.json$/, '') + '.request.json'
  fs.writeFileSync(reqFile, JSON.stringify({ schema: 'sl8.video-device-footage.request/1', variant: rec?.variant ?? null, lane: o.lane, model: L.model, params_file: o.out, prompt_file: pf, declared }, null, 2) + '\n')
  out({ model: L.model, lane: o.lane, params_file: o.out, request_file: reqFile, duration: p.duration, declared, fields: Object.keys(p) })
  return 0
}

// ---------- sheet
function have (bin) { return spawnSync(bin, ['-version'], { encoding: 'utf8' }).status === 0 }
function sheet (o) {
  let clip = o._[0]
  if (!clip && o.result) {
    const env = JSON.parse(fs.readFileSync(o.result, 'utf8'))
    const e = env.success === false ? env.error?.details?.envelope : env
    clip = (e?.files ?? []).find((f) => f.kind === 'video' || /\.(mp4|mov|webm)$/.test(f.local_path ?? ''))?.local_path
    if (!clip) throw new Fail(`no video file in ${o.result}`)
  }
  if (!clip || !o.out) throw new Fail('usage: sheet <clip.mp4> | --result <result.json> --out <sheet.png> [--fps 2] [--cols 6] [--cells 12] [--width 270]', 2)
  if (!fs.existsSync(clip)) throw new Fail(`no clip at ${clip}`)
  if (!have('ffprobe') || !have('ffmpeg')) throw new Fail('ffmpeg or ffprobe is missing: the machine is broken (HR21); report it', 3)
  const fps = Number(o.fps ?? 2); const cols = Number(o.cols ?? 6); const width = Number(o.width ?? 270)
  const perSheet = Number(o.cells ?? 12) // at most 12 cells (6 s at 2 fps) so each cell stays readable
  const pr = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration:format=duration', '-of', 'json', clip], { encoding: 'utf8' })
  const j = pr.status === 0 ? JSON.parse(pr.stdout) : {}
  const dur = Number(j.streams?.[0]?.duration ?? j.format?.duration)
  if (!Number.isFinite(dur) || dur <= 0) throw new Fail(`ffprobe reads no duration from ${clip}`)
  const frames = Math.ceil(dur * fps)
  const nSheets = Math.ceil(frames / perSheet); const span = perSheet / fps
  const stem = o.out.replace(/\.png$/i, '')
  fs.mkdirSync(path.dirname(o.out), { recursive: true })
  const sheets = []
  for (let n = 0; n < nSheets; n++) {
    const cells = Math.min(perSheet, frames - n * perSheet); const rows = Math.ceil(cells / cols)
    const file = `${stem}-${n + 1}.png`
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(n * span), '-t', String(span), '-i', clip, '-vf', `fps=${fps},scale=${width}:-2,tile=${cols}x${rows}`, '-frames:v', '1', file], { encoding: 'utf8' })
    if (r.status !== 0 || !fs.existsSync(file)) throw new Fail(`ffmpeg wrote no sheet: ${(r.stderr || '').trim().slice(0, 300)}`)
    sheets.push({ file, from_s: n * span, cells, grid: `${cols}x${rows}` })
  }
  out({ clip, duration_s: Math.round(dur * 1000) / 1000, fps, sheets, frames_expected: frames, order: 'left to right, top to bottom; cell n of sheet m is at about (m-1)*cells/fps + n/fps seconds' })
  return 0
}

const COMMANDS = { frame, check, params, sheet }
const [cmd, ...rest] = process.argv.slice(2)
try {
  if (!COMMANDS[cmd]) throw new Fail('usage: footage.mjs frame|check|params|sheet … (see the header of this file)', 2)
  process.exitCode = COMMANDS[cmd](args(rest))
} catch (e) {
  if (!(e instanceof Fail)) throw e
  console.error(`FAIL ${e.message}`)
  process.exitCode = e.code
}
