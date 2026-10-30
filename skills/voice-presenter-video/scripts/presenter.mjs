#!/usr/bin/env node
// presenter.mjs: voice-presenter-video's scripted checks (house rule HR13). SL8-authored from the method
// recorded in the capability assessment (WF22-a6 steps 2, 5, 6, 16); no vendor code. Node >= 20, no
// dependencies; ffprobe measures images.
//   plan   <artifacts/<p>/plan.json>
//          the plan carries a route, a target aspect, a presenter source and a voice source that are not a real
//          person (refused until SL8's consent text is approved), and a declared frame, fps, audio and length
//   photo  <file> [--aspect 16:9|9:16|1:1] [--min 512] [--max-mb 10]
//          JPEG or PNG by magic bytes, both sides >= min, under max-mb, EXIF turn applied, orientation against
//          the target; prints the ffmpeg filter that turns it upright and crops it (centred) to the target
//   script <script.txt> [--say say.json] [--wpm 150] [--target-s N] [--max-chars 10000] [--max-scene-s 45]
//          [--out work/<p>/scenes.json]
//          splits scenes (a line "---" or a "## title" line; else blank-line paragraphs), counts words,
//          checks sentences, break tags, placeholders and written-form figures, estimates seconds; with --out
//          it also writes captions-script.txt (one scene's written form per line) next to scenes.json
//   audio  <scenes.json> --dir artifacts/<p>/audio
//          finds scene-NN.<ext> for every scene, measures it, writes audio_s and the whole billed seconds
//          into scenes.json, and fails a missing file or a scene over the talking-head limit
//   fill   <template.txt> --vars vars.json --out-dir DIR
//          one filled script per row ({name} placeholders); every placeholder filled, every key used
// Prints one JSON line {check, exit, ...figures, fails[], warns[]}. It never prints PASS: the exit code is the
// verdict (HR14). Exit 0 ok (warnings allowed) · 1 check failed · 2 usage · 3 a tool is missing.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const argv = process.argv.slice(2)
const cmd = argv[0]
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i > 0 && argv[i + 1] !== undefined ? argv[i + 1] : d }
const out = (o) => { console.log(JSON.stringify(o)); process.exit(o.exit) }
const usage = (m) => out({ check: cmd ?? null, exit: 2, fails: [m], warns: [] })

// A break tag in the form the method uses: <break time="0.5s"/> (a space before "/>" is accepted).
const BREAK_ANY = /<\s*break\b[^>]*>(?:\s*<\/\s*break\s*>)?/gi
const BREAK_OK = /^<break time="(\d+(?:\.\d+)?)s"\s?\/>$/
const MAX_BREAK_S = 3 // enrichment: ElevenLabs v2 pauses of at most 3 s (creative-claw cc-model-contracts-speech#31)

// EXIF orientation (1-8) of a JPEG, 1 when absent. ffprobe 5.1 does not report it, so it is read here.
function exifOrientation (file) {
  try {
    const b = fs.readFileSync(file); let i = 2
    while (i + 4 < b.length && b[i] === 0xff) {
      const m = b[i + 1]; const len = b.readUInt16BE(i + 2)
      if (m === 0xe1 && b.slice(i + 4, i + 10).toString('latin1') === 'Exif\0\0') {
        const t = i + 10; const le = b.toString('latin1', t, t + 2) === 'II'
        const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o)); const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o))
        const ifd = t + u32(t + 4); const n = u16(ifd)
        for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12; if (u16(e) === 0x0112) return u16(e + 8) }
        return 1
      }
      if (m === 0xda) break
      i += 2 + len
    }
  } catch {}
  return 1
}
const EXIF_FIX = { 2: 'hflip', 3: 'hflip,vflip', 4: 'vflip', 5: 'transpose=0', 6: 'transpose=1', 7: 'transpose=3', 8: 'transpose=2' }

function photo () {
  const file = argv[1]
  if (!file || !fs.existsSync(file)) usage('photo needs an existing file')
  const min = Number(opt('min', 512)); const maxMb = Number(opt('max-mb', 10)); const aspect = opt('aspect')
  const fails = []; const warns = []
  const head = Buffer.alloc(16); const fd = fs.openSync(file, 'r'); fs.readSync(fd, head, 0, 16, 0); fs.closeSync(fd)
  const kind = head[0] === 0xff && head[1] === 0xd8 ? 'jpeg' : head.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'png' : null
  const heic = head.slice(4, 8).toString() === 'ftyp' && /^(heic|heix|hevc|mif1|msf1)/.test(head.slice(8, 12).toString())
  if (!kind) fails.push(heic ? 'a HEIC photo: convert it to JPEG or PNG with media-photo-editing (Image Studio) first, then run photo again' : 'not a JPEG or PNG by its first bytes (convert it locally first)')
  const exif = kind === 'jpeg' ? exifOrientation(file) : 1
  const mb = fs.statSync(file).size / 1048576
  if (mb >= maxMb) fails.push(`${mb.toFixed(1)} MB: must be under ${maxMb} MB`)
  const p = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file], { encoding: 'utf8' })
  if (p.error) out({ check: 'photo', exit: 3, fails: ['ffprobe is missing: the machine is broken (HR21)'], warns })
  const s = (JSON.parse(p.stdout || '{}').streams ?? [])[0] ?? {}
  const rawW = s.width ?? 0; const rawH = s.height ?? 0
  const turned = exif >= 5 && exif <= 8 // the stored pixels are on their side
  const w = turned ? rawH : rawW; const h = turned ? rawW : rawH
  if (!w || !h) fails.push('no image dimensions could be read')
  else if (Math.min(w, h) < min) fails.push(`${w}x${h}: both sides must be at least ${min} px`)
  const orientation = w > h ? 'horizontal' : w < h ? 'vertical' : 'square'
  let filter = null
  if (exif > 1) warns.push(`EXIF orientation ${exif}: the figures here are for the upright photo; run ffmpeg with -noautorotate and ffmpeg_filter`)
  if (aspect && w && h) {
    const want = { '16:9': 'horizontal', '9:16': 'vertical', '1:1': 'square' }[aspect]
    if (!want) usage('--aspect is 16:9, 9:16 or 1:1')
    const [aw, ah] = aspect.split(':')
    const crop = `crop=w='min(iw,ih*${aw}/${ah})':h='min(ih,iw*${ah}/${aw})'`
    filter = [EXIF_FIX[exif], crop].filter(Boolean).join(',')
    const ratio = w / h; const target = aw / ah
    if (Math.abs(ratio - target) / target > 0.01) warns.push(`photo is ${w}x${h} (${orientation}), target ${aspect}: the talking-head clip keeps the photo's frame, so crop it first with ffmpeg_filter (centred; look at the result, and if the face is cut or small ask for another photo, never stretch)`)
  } else if (exif > 1) filter = EXIF_FIX[exif]
  warns.push('look at the photo yourself: one clear front-facing face, even light, neutral expression, simple background; a side profile or full-body shot animates poorly')
  out({ check: 'photo', exit: fails.length ? 1 : 0, file, kind, width: w, height: h, exif_orientation: exif, mb: Number(mb.toFixed(2)), orientation, ffmpeg_filter: filter, fails, warns })
}

function splitScenes (text) {
  const lines = text.replace(/\r/g, '').split('\n')
  if (lines.some((l) => /^---\s*$/.test(l) || /^##\s+/.test(l))) {
    const scenes = []; let cur = { title: null, body: [] }
    const push = () => { const b = cur.body.join('\n').trim(); if (b) scenes.push({ title: cur.title, body: b }) }
    for (const l of lines) {
      if (/^---\s*$/.test(l)) { push(); cur = { title: null, body: [] } } else if (/^##\s+/.test(l)) { push(); cur = { title: l.replace(/^##\s+/, '').trim(), body: [] } } else cur.body.push(l)
    }
    push(); return scenes
  }
  return text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((body) => ({ title: null, body }))
}

const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w))

function script () {
  const file = argv[1]
  if (!file || !fs.existsSync(file)) usage('script needs an existing script file')
  const wpm = Number(opt('wpm', 150)); const maxChars = Number(opt('max-chars', 10000))
  const target = opt('target-s') ? Number(opt('target-s')) : null
  const maxSceneS = Number(opt('max-scene-s', 45)) || null // Default 45 s of speech per talking-head job; 0 turns the limit off
  const say = opt('say') ? JSON.parse(fs.readFileSync(opt('say'), 'utf8')) : {}
  const fails = []; const warns = []
  const scenes = splitScenes(fs.readFileSync(file, 'utf8')).map((sc, i) => {
    const n = i + 1; const issues = []
    let breaks = 0; let run = 0
    // Break tags: exact form, a space on each side, seconds with "s", self-closing, at most 3 s; adjacent ones add up.
    const re = new RegExp(BREAK_ANY.source, 'gi'); let m; let lastEnd = -1
    while ((m = re.exec(sc.body))) {
      const tag = m[0]; const ok = BREAK_OK.exec(tag)
      if (!ok) issues.push(`fail: break tag ${tag} is not <break time="Xs"/> (seconds with s, self-closing)`)
      const before = sc.body[m.index - 1]; const after = sc.body[m.index + tag.length]
      if (before !== undefined && !/\s/.test(before)) issues.push(`fail: no space before ${tag}`)
      if (after !== undefined && !/\s/.test(after)) issues.push(`fail: no space after ${tag}`)
      const secs = ok ? Number(ok[1]) : 0
      const between = lastEnd >= 0 ? sc.body.slice(lastEnd, m.index) : 'x'
      run = /^\s*$/.test(between) ? run + secs : secs
      if (run > MAX_BREAK_S) issues.push(`fail: pause of ${run} s here (adjacent tags add up); keep each pause at most ${MAX_BREAK_S} s`)
      else if (run >= 2) issues.push(`warn: pause of ${run} s; 2 s or more is for rare dramatic beats`)
      breaks += secs; lastEnd = m.index + tag.length
    }
    const plain = sc.body.replace(new RegExp(BREAK_ANY.source, 'gi'), ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim()
    let spoken = plain; let tts = sc.body
    for (const [k, v] of Object.entries(say)) {
      const r = new RegExp(`(?<![\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu')
      spoken = spoken.replace(r, v); tts = tts.replace(r, v)
    }
    for (const ph of plain.match(/\[[^\]]*\]|\{[^}]*\}/g) ?? []) issues.push(`fail: ${ph} is an unfilled placeholder or a bracket tag; ElevenLabs v2 does not take v3 square-bracket tags`)
    const sentences = plain.replace(/\n/g, ' ').split(/(?<=[.!?…])\s+/).map((t) => t.trim()).filter(Boolean).map((t) => words(t).length)
    sentences.forEach((c, k) => {
      if (c >= 30) issues.push(`fail: sentence ${k + 1} has ${c} words (never 30 or more; aim for 10-20)`)
      else if (c > 20) issues.push(`warn: sentence ${k + 1} has ${c} words (aim for 10-20)`)
    })
    for (const tok of spoken.match(/\S*\d\S*|\b[A-Z]{2,}s?\b|\S+\.(?:com|io|ai|org|net)\b|\S+@\S+|[%$€£#&]/g) ?? []) {
      issues.push(`warn: "${tok}" is in written form; the voice reads literally, so add it to --say with its spoken form (the overlay and captions keep the written form)`)
    }
    const wc = words(spoken).length
    const est = Number((wc / wpm * 60 + breaks).toFixed(1))
    if (tts.length > maxChars) issues.push(`fail: ${tts.length} characters; split the scene (one TTS request takes at most ${maxChars})`)
    if (maxSceneS && est > maxSceneS) issues.push(`fail: about ${est} s; split at a sentence end (one talking-head job takes at most ${maxSceneS} s)`)
    return { n, title: sc.title, words: wc, chars: tts.length, breaks_s: Number(breaks.toFixed(2)), est_s: est, sentence_words: sentences, tts_text: tts.trim(), spoken_text: spoken, display_text: plain, issues }
  })
  if (!scenes.length) fails.push('the script has no text')
  const all = scenes.map((s) => s.display_text).join(' ')
  const bangs = (all.match(/!/g) ?? []).length
  if (bangs > 1) warns.push(`${bangs} exclamation marks; one in a script is usually enough`)
  for (const s of scenes) for (const i of s.issues) (i.startsWith('fail') ? fails : warns).push(`scene ${s.n}: ${i.replace(/^(fail|warn): /, '')}`)
  const totalWords = scenes.reduce((a, s) => a + s.words, 0)
  const est = Number(scenes.reduce((a, s) => a + s.est_s, 0).toFixed(1))
  if (target) {
    const want = Math.round(target / 60 * wpm)
    if (Math.abs(est - target) > target * 0.1) warns.push(`about ${est} s against a ${target} s target: at ${wpm} words a minute that is about ${want} words, the script has ${totalWords}`)
  }
  // Context for the TTS neighbours: the spoken text of the scene before and after (no tags); none at the ends.
  scenes.forEach((sc, i) => { sc.prev_text = i > 0 ? scenes[i - 1].spoken_text : null; sc.next_text = i < scenes.length - 1 ? scenes[i + 1].spoken_text : null })
  const report = { check: 'script', exit: fails.length ? 1 : 0, wpm, scenes: scenes.length, total_words: totalWords, est_s: est, target_s: target, max_scene_s: maxSceneS, fails, warns }
  if (opt('out')) {
    fs.mkdirSync(path.dirname(opt('out')), { recursive: true })
    fs.writeFileSync(opt('out'), JSON.stringify({ ...report, source: file, say, scene_list: scenes }, null, 1) + '\n')
    report.out = opt('out')
    const cap = path.join(path.dirname(opt('out')), 'captions-script.txt')
    fs.writeFileSync(cap, scenes.map((sc) => sc.display_text.replace(/\s*\n\s*/g, ' ')).join('\n') + '\n')
    report.captions_script = cap
  }
  out(report)
}

function audio () {
  const file = argv[1]; const dir = opt('dir')
  if (!file || !fs.existsSync(file) || !dir) usage('audio needs <scenes.json> --dir artifacts/<p>/audio')
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')); const list = doc.scene_list ?? []
  const fails = []; const warns = []; const rows = []
  if (!list.length) fails.push('scenes.json has no scene_list: run presenter.mjs script --out first')
  for (const sc of list) {
    const nn = String(sc.n).padStart(2, '0')
    const f = ['mp3', 'wav', 'm4a', 'ogg', 'flac'].map((x) => path.join(dir, `scene-${nn}.${x}`)).find((x) => fs.existsSync(x))
    if (!f) { fails.push(`scene ${sc.n}: no ${dir}/scene-${nn}.mp3 (or .wav .m4a .ogg .flac): rename the ai-gen file to this name first`); continue }
    const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' })
    if (p.error) out({ check: 'audio', exit: 3, fails: ['ffprobe is missing: the machine is broken (HR21)'], warns })
    const d = Number(String(p.stdout).trim())
    if (!(d > 0)) { fails.push(`scene ${sc.n}: ${f} has no readable duration`); continue }
    sc.audio_s = Number(d.toFixed(2)); sc.audio_file = f; sc.billed_s = Math.ceil(d - 1e-6)
    if (doc.max_scene_s && d > doc.max_scene_s) fails.push(`scene ${sc.n}: ${sc.audio_s} s of speech is over the ${doc.max_scene_s} s talking-head limit; split the scene at a sentence end`)
    if (sc.est_s && Math.abs(d - sc.est_s) / sc.est_s > 0.25) warns.push(`scene ${sc.n}: measured ${sc.audio_s} s against ${sc.est_s} s estimated; quote the talking head from the measured seconds`)
    rows.push({ n: sc.n, file: f, audio_s: sc.audio_s, billed_s: sc.billed_s, words_per_s: Number((sc.words / d).toFixed(2)) })
  }
  const total = rows.reduce((a, r) => a + r.audio_s, 0); const billed = rows.reduce((a, r) => a + r.billed_s, 0)
  if (!fails.length) fs.writeFileSync(file, JSON.stringify(doc, null, 1) + '\n')
  out({ check: 'audio', exit: fails.length ? 1 : 0, scenes: list.length, total_audio_s: Number(total.toFixed(2)), billed_s: billed, rows, fails, warns })
}

// Real people are refused (SL8's consent text and privacy note are not approved yet: learnings VID-L444, VID-L528).
const REFUSED = { 'real-photo': 'a real person\'s photo', 'real-footage': 'footage of a real person', 'human-recording': 'a real person\'s recorded voice', 'clone': 'a cloned voice' }
const SOURCES = ['generated', 'avatar', 'character']
const VOICES = ['tts', 'synthetic-file']
function plan () {
  const file = argv[1]
  if (!file || !fs.existsSync(file)) usage('plan needs an existing plan.json')
  let d; try { d = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { usage(`plan.json is not JSON: ${e.message}`) }
  const fails = []; const warns = []
  if (!['A', 'A-own-audio', 'B', 'C'].includes(d.route)) fails.push('route must be A, A-own-audio, B or C')
  if (!['16:9', '9:16', '1:1'].includes(d.aspect)) fails.push('aspect must be 16:9, 9:16 or 1:1')
  const src = d.presenter?.source; const vs = d.voice_source ?? (d.route === 'A-own-audio' ? undefined : 'tts')
  if (REFUSED[src]) fails.push(`${REFUSED[src]} is refused: SL8's consent text and privacy note are not approved yet (VID-L444, VID-L528); use a generated presenter, an AVATAR record of an invented person or a non-human character`)
  else if (!SOURCES.includes(src)) fails.push(`presenter.source must be one of ${SOURCES.join(', ')}`)
  if (REFUSED[vs]) fails.push(`${REFUSED[vs]} is refused: SL8's consent text and privacy note are not approved yet (VID-L444, VID-L528)`)
  else if (!VOICES.includes(vs)) fails.push(`voice_source must be one of ${VOICES.join(', ')} (a human recording is refused)`)
  const dc = d.declared ?? {}
  if (!dc.aspect) fails.push('declared.aspect is missing')
  if (!(Number(dc.fps) > 0)) fails.push('declared.fps is missing (assemble.py --fps is pinned to it)')
  if (!dc.audio) fails.push('declared.audio is missing ("required")')
  if (!(Number(dc.duration_s) > 0)) fails.push('declared.duration_s is missing (the script estimate in seconds)')
  if (d.route === 'C' ? false : !d.voice) warns.push('no voice recorded yet: step 5 stops until one is chosen')
  out({ check: 'plan', exit: fails.length ? 1 : 0, route: d.route, aspect: d.aspect, presenter_source: src ?? null, voice_source: vs ?? null, declared: dc, fails, warns })
}

function fill () {
  const file = argv[1]; const varsFile = opt('vars'); const dir = opt('out-dir')
  if (!file || !fs.existsSync(file) || !varsFile || !dir) usage('fill needs <template> --vars vars.json --out-dir DIR')
  const tpl = fs.readFileSync(file, 'utf8')
  const keys = [...new Set((tpl.match(/\{([A-Za-z0-9_]+)\}/g) ?? []).map((k) => k.slice(1, -1)))]
  let rows = JSON.parse(fs.readFileSync(varsFile, 'utf8')); if (!Array.isArray(rows)) rows = [rows]
  const fails = []; const written = []; const ready = []
  rows.forEach((row, i) => {
    const id = String(row.id ?? i + 1).replace(/[^\w.-]+/g, '-')
    const missing = keys.filter((k) => row[k] === undefined || String(row[k]).trim() === '')
    const unused = Object.keys(row).filter((k) => k !== 'id' && !keys.includes(k))
    if (missing.length) fails.push(`row ${id}: no value for ${missing.join(', ')}`)
    if (unused.length) fails.push(`row ${id}: ${unused.join(', ')} matches no placeholder in the template`)
    if (!missing.length && !unused.length) ready.push([id, tpl.replace(/\{([A-Za-z0-9_]+)\}/g, (_, k) => String(row[k]))])
  })
  if (!fails.length) {
    fs.mkdirSync(dir, { recursive: true })
    for (const [id, text] of ready) { const f = path.join(dir, `script-${id}.txt`); fs.writeFileSync(f, text); written.push(f) }
  }
  out({ check: 'fill', exit: fails.length ? 1 : 0, placeholders: keys, rows: rows.length, written, fails, warns: fails.length ? ['nothing was written: every row must fill before any script is made'] : [] })
}

if (cmd === 'photo') photo()
else if (cmd === 'script') script()
else if (cmd === 'audio') audio()
else if (cmd === 'plan') plan()
else if (cmd === 'fill') fill()
else usage('usage: presenter.mjs plan|photo|script|audio|fill … (see the header)')
