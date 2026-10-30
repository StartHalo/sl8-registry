#!/usr/bin/env node
// avatar.mjs: voice-avatar-identity's scripted checks and params files (house rule HR13). Node >= 20, no
// dependencies; ffprobe and ffmpeg measure the media.
//   photo     <file> [--min 512]           JPEG or PNG by magic bytes (an HTML page saved as .jpg fails), both sides >= min
//   params    image --model M --prompt-file F --ratio 9:16|16:9|1:1 [--count 1-4] [--lock] --out P.json
//   params    tts --voice V --text-file F [--language xx] [--speed 1] --out P.json   (Hebrew: niqqud on every word)
//   place     --result R.json --to <path stem> [--pick N]  move each download to <stem>-aN[-cK].<ext> (N = next free attempt, nothing is overwritten);
//             a single file is also copied to <stem>.<ext> (the delivered name); --pick N copies candidate N instead
//   shortlist --state S.json (--pick A,B,C | --next)  three untried voices for the next batch; batch index from 0
//   pace      --text-file F --speech A              measures: words, seconds, words per second, the air at each end, billed seconds (no limit)
//   record    <AVATAR-NAME.md> [--stage identity|saved]   the record's sections and SL8 fields; identity also fails a photo or footage Reference without a Consent line (HR17)
//   clause    <slug>                               print one row of references/prompts.json
// Prints one JSON line {check, exit, ...figures, fails[], notes[]}. It never prints PASS: the exit code is the
// verdict (HR14). Exit 0 ok · 1 check failed · 2 usage · 3 a tool is missing.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROWS = JSON.parse(fs.readFileSync(path.join(here, '..', 'references', 'prompts.json'), 'utf8')).rows
// The 21 verified ElevenLabs preset names (media-audio-generation, facts schema-voice-names). The sources give
// no gender or tone label for any of them: a shortlist is a guess that listening corrects.
export const PRESETS = ['Aria', 'Roger', 'Sarah', 'Laura', 'Charlie', 'George', 'Callum', 'River', 'Liam', 'Charlotte',
  'Alice', 'Matilda', 'Will', 'Jessica', 'Eric', 'Chris', 'Brian', 'Daniel', 'Lily', 'Bill', 'Rachel']
const RATIOS = ['9:16', '16:9', '1:1']
// GPT Image sizes per ratio: SL8's choice inside fal's limits (facts schema-gpt2-size: multiples of 16,
// 655,360-8,294,400 px, aspect <= 3:1).
const GPT_SIZE = { '9:16': [1152, 2048], '16:9': [2048, 1152], '1:1': [1536, 1536] }
const IMAGE_ROUTES = {
  // aspect_ratio pinned (default 1:1 on the text route, auto on /edit); resolution 2K bills as 1K (facts
  // price-nbp); limit_generations and enable_web_search pinned at their defaults (HR4).
  'fal-ai/nano-banana-pro': (r) => ({ aspect_ratio: r, resolution: '2K', limit_generations: true, enable_web_search: false }),
  'fal-ai/nano-banana-pro/edit': (r) => ({ aspect_ratio: r, resolution: '2K', limit_generations: true, enable_web_search: false }),
  'openai/gpt-image-2': (r) => gpt(r),
  'openai/gpt-image-2/edit': (r) => gpt(r)
}
function gpt (r) {
  const [width, height] = GPT_SIZE[r]
  return { image_size: { width, height }, quality: 'high', output_format: 'png', enable_safety_checker: true, sync_mode: false }
}

const [cmd, ...rest] = process.argv.slice(2)
const opt = (n) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined }
const flag = (n) => rest.includes(`--${n}`)
function out (check, figures, fails = [], notes = [], code) {
  const exit = code ?? (fails.length ? 1 : 0)
  console.log(JSON.stringify({ check, exit, ...figures, fails, notes }))
  process.exit(exit)
}
const usage = (check, msg) => out(check, {}, [msg], [], 2)
const readText = (check, f) => { try { return fs.readFileSync(f, 'utf8') } catch { return usage(check, `cannot read ${f}`) } }
const norm = (s) => String(s).replace(/\s+/g, ' ').trim()

function tool (bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8' })
  if (r.error && r.error.code === 'ENOENT') out(cmd, {}, [`${bin} is not on this machine (HR21: report it, do not install it)`], [], 3)
  return r
}
function kindOf (file) {
  const b = Buffer.alloc(16); const fd = fs.openSync(file, 'r'); fs.readSync(fd, b, 0, 16, 0); fs.closeSync(fd)
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  if (b.subarray(4, 8).toString('latin1') === 'ftyp') return /heic|heix|mif1|msf1/.test(b.subarray(8, 12).toString('latin1')) ? 'heic' : 'iso-media'
  if (/^\s*<(!doctype|html|\?xml|svg)/i.test(b.toString('latin1'))) return 'html-or-xml'
  return 'unknown'
}
function duration (file) {
  const r = tool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  const d = Number(String(r.stdout).trim())
  return Number.isFinite(d) && d > 0 ? d : null
}

// Hebrew letters (U+05D0-U+05EA) need vowel points (U+05B0-U+05BD, U+05BF, U+05C1, U+05C2, U+05C4, U+05C5,
// U+05C7) on every spoken word (WF08 enrichment 10). This checks the payload only: it proves nothing about how
// the voice reads it, and other scripts the normaliser misreads are not detected.
const HEB_WORD = /[\u0591-\u05C7\u05D0-\u05EA\u05F0-\u05F4]+/g
const HEB_LETTER = /[\u05D0-\u05EA]/
const POINT = /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/
function unpointedHebrew (text) {
  return (text.match(HEB_WORD) ?? []).filter((w) => HEB_LETTER.test(w) && !POINT.test(w))
}

function photo () {
  const file = rest[0]; const min = Number(opt('min') ?? 512)
  if (!file || !fs.existsSync(file)) return usage('photo', `photo needs an existing file (got ${file})`)
  const bytes = fs.statSync(file).size; const kind = kindOf(file); const fails = []; const notes = []
  if (!bytes) fails.push('the file is empty')
  if (!['jpeg', 'png'].includes(kind)) fails.push(`not a JPEG or PNG: the bytes are ${kind}${kind === 'html-or-xml' ? ' (a web page saved under an image name)' : ''}${['heic', 'webp', 'iso-media'].includes(kind) ? ' (convert it once with: convert <file> -auto-orient -resize 2048x2048\\> out.png; if convert has no delegate for it, ask the customer for a JPEG)' : ''}`)
  if (bytes > 3 * 1024 * 1024) notes.push(`${(bytes / 1048576).toFixed(1)} MB: a local file over about 3 MB goes by proxy storage and can fail with exit 2 (413); downsize it first: convert <file> -resize 2048x2048\\> out.png`)
  const ext = path.extname(file).slice(1).toLowerCase()
  if (['jpeg', 'png'].includes(kind) && ext && ext.replace('jpg', 'jpeg') !== kind) notes.push(`the extension .${ext} does not match the ${kind} bytes: rename it`)
  let width = null; let height = null
  if (['jpeg', 'png'].includes(kind)) {
    const r = tool('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file])
    const m = /^(\d+),(\d+)/.exec(String(r.stdout).trim())
    if (m) { width = Number(m[1]); height = Number(m[2]) } else fails.push('ffprobe read no width and height')
    if (m && (width < min || height < min)) fails.push(`${width}x${height}: both sides must be at least ${min} px`)
  }
  notes.push('the face, the light and a single person are judged by looking at the image; this check does not see them')
  out('photo', { file, kind, bytes, width, height, min }, fails, notes)
}

function paramsImage () {
  const model = opt('model'); const pf = opt('prompt-file'); const ratio = opt('ratio') ?? '9:16'; const o = opt('out')
  const count = Number(opt('count') ?? 1)
  if (!model || !pf || !o) return usage('params', 'params image needs --model, --prompt-file and --out')
  if (!IMAGE_ROUTES[model]) return usage('params', `no params mapping for ${model}: this script knows ${Object.keys(IMAGE_ROUTES).join(', ')}; for another model write the file by hand from ai-gen info and the raw OpenAPI (HR2)`)
  if (!RATIOS.includes(ratio)) return usage('params', `--ratio is one of ${RATIOS.join(', ')}`)
  if (!Number.isInteger(count) || count < 1 || count > 4) return usage('params', '--count is 1-4')
  const prompt = norm(readText('params', pf)); const fails = []
  if (!prompt) fails.push('the prompt is empty')
  if (prompt.length > 1000) fails.push(`the prompt is ${prompt.length} characters: at most 1000`)
  if (/[<>]/.test(prompt)) fails.push('the prompt still holds a <slot> from references/prompts.json: fill it')
  if (flag('lock') && !prompt.includes(norm(ROWS.find((r) => r.slug === 'identity-lock').prompt))) fails.push('--lock: the identity-lock row (node avatar.mjs clause identity-lock) is not in the prompt word for word')
  if (fails.length) out('params', { model, chars: prompt.length }, fails)
  const params = { prompt, num_images: count, ...IMAGE_ROUTES[model](ratio) }
  fs.mkdirSync(path.dirname(path.resolve(o)), { recursive: true })
  fs.writeFileSync(o, JSON.stringify(params, null, 2) + '\n')
  const declared = { aspect: ratio, count }
  if (params.image_size) Object.assign(declared, { width: params.image_size.width, height: params.image_size.height, format: 'png' })
  out('params', { model, out: o, chars: prompt.length, declared }, [], ['the media flags (--ref) stay on the command line: a local path inside the params file is not uploaded'])
}

function paramsTts () {
  const voice = opt('voice'); const tf = opt('text-file'); const o = opt('out'); const lang = opt('language'); const speed = Number(opt('speed') ?? 1)
  if (!tf || !o) return usage('params', 'params tts needs --voice, --text-file and --out')
  const text = norm(readText('params', tf)); const fails = []; const notes = []
  if (!voice) fails.push('voice is required: omitted, it silently becomes Rachel (facts beh-rachel)')
  if (!text) fails.push('the text is empty')
  if (!(speed >= 0.7 && speed <= 1.2)) fails.push('speed is 0.7-1.2 on multilingual-v2')
  if (lang && !/^[a-z]{2}$/.test(lang)) fails.push(`--language takes an ISO 639-1 code (en, ja, he), not ${lang}`)
  const unpointed = unpointedHebrew(text)
  if (unpointed.length) fails.push(`Hebrew words without niqqud: ${unpointed.slice(0, 8).join(' ')}${unpointed.length > 8 ? ' …' : ''}`)
  if (lang === 'he') notes.push('Hebrew on multilingual-v2 is unverified on SL8; the niqqud check proves the payload only')
  if (fails.length) out('params', { voice, chars: text.length }, fails, notes)
  // Registry values pinned (HR4): stability 0.5, similarity_boost 0.75, style 0; normalisation on reads
  // numbers and dates consistently (media-audio-generation). No output_format field: always MP3.
  const params = { text, voice, stability: 0.5, similarity_boost: 0.75, style: 0, speed, apply_text_normalization: 'on' }
  if (lang) params.language_code = lang
  fs.mkdirSync(path.dirname(path.resolve(o)), { recursive: true })
  fs.writeFileSync(o, JSON.stringify(params, null, 2) + '\n')
  out('params', { voice, out: o, chars: text.length, words: words(text), declared: { format: 'mp3', audio: 'speech' } }, [], notes)
}

function place () {
  const r = opt('result'); const to = opt('to'); const pick = opt('pick')
  if (!r || !to) return usage('place', 'place needs --result and --to')
  let env; try { env = JSON.parse(readText('place', r)) } catch { return usage('place', `${r} is not JSON`) }
  if (env.success === false) out('place', {}, [`the result is an error envelope (${env.error?.code}, exit ${env.error?.exit_code})`])
  const files = (env.files ?? []).map((f) => f.local_path).filter(Boolean)
  if (!files.length) out('place', {}, ['the result has no downloaded file: a success with no file is a failed attempt (record it failed, reword the prompt, then the fallback route), or an --async submit (fetch it with ai-gen result first)'])
  const dir = path.dirname(path.resolve(to)); const stem = path.basename(to)
  fs.mkdirSync(dir, { recursive: true })
  const used = fs.readdirSync(dir).map((n) => new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-a(\\d+)`).exec(n)).filter(Boolean).map((m) => Number(m[1]))
  const attempt = used.length ? Math.max(...used) + 1 : 1
  for (const f of files) if (!fs.existsSync(f)) out('place', { placed: [] }, [`missing download ${f}`])
  const placed = files.map((f, i) => {
    const dest = `${to}-a${attempt}${files.length > 1 ? `-c${i + 1}` : ''}${path.extname(f)}`
    fs.renameSync(f, dest)
    return dest
  })
  const n = pick ? Number(pick) : (placed.length === 1 ? 1 : 0)
  let final = null
  if (n) {
    if (!Number.isInteger(n) || n < 1 || n > placed.length) out('place', { placed, attempt }, [`--pick is 1-${placed.length}`])
    final = `${to}${path.extname(placed[n - 1])}`
    for (const x of fs.readdirSync(dir)) if (path.parse(x).name === stem) fs.rmSync(path.join(dir, x))
    fs.copyFileSync(placed[n - 1], final)
  }
  out('place', { placed, attempt, final, request_id: env.request_id ?? null }, [], placed.length > 1 && !final ? [`${placed.length} candidates: show them all, then cp the chosen one to ${to}.<ext> and record that copy as a local step`] : [])
}

function shortlist () {
  const st = opt('state'); const pick = opt('pick')
  if (!st || (!pick && !flag('next'))) return usage('shortlist', 'shortlist needs --state and --pick A,B,C or --next')
  const state = fs.existsSync(st) ? JSON.parse(fs.readFileSync(st, 'utf8')) : { schema: 'voice-avatar-identity.batches/1', batches: [] }
  const tried = new Set(state.batches.flatMap((b) => b.voices))
  const untried = PRESETS.filter((v) => !tried.has(v))
  const want = Math.min(3, untried.length + (pick ? pick.split(',').filter((v) => v.startsWith('id:')).length : 0))
  const voices = pick ? pick.split(',').map((v) => v.trim()).filter(Boolean) : untried.slice(0, 3)
  const fails = []
  if (!want) fails.push('all 21 presets have been tried: ask what is off (age, tone, energy), or take a voice id the customer owns')
  for (const v of voices) {
    if (!v.startsWith('id:') && !PRESETS.includes(v)) fails.push(`${v} is not one of the 21 presets (an ElevenLabs voice id goes in as id:<id>)`)
    if (tried.has(v)) fails.push(`${v} was in an earlier batch: a batch takes untried voices only`)
  }
  if (new Set(voices).size !== voices.length) fails.push('a voice is listed twice')
  if (want && voices.length !== want) fails.push(`a batch holds ${want} voices, not ${voices.length}`)
  if (fails.length) out('shortlist', { batch: state.batches.length, voices }, fails)
  const batch = state.batches.length
  state.batches.push({ batch, voices, at: new Date().toISOString() })
  fs.mkdirSync(path.dirname(path.resolve(st)), { recursive: true })
  fs.writeFileSync(st, JSON.stringify(state, null, 2) + '\n')
  out('shortlist', { batch, voices: voices.map((v) => v.replace(/^id:/, '')), untried_left: PRESETS.filter((v) => !tried.has(v) && !voices.includes(v)).length },
    [], ['no gender or tone labels exist for the presets: the customer\'s ear decides'])
}

const words = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
function pace () {
  const tf = opt('text-file'); const a = opt('speech')
  if (!tf || !a || !fs.existsSync(a)) return usage('pace', 'pace needs --text-file and an existing --speech file')
  const text = norm(readText('pace', tf)); const n = words(text); const d = duration(a); const fails = []; const notes = []
  if (!d) out('pace', { words: n }, ['ffprobe read no duration'])
  const r = tool('ffmpeg', ['-hide_banner', '-nostats', '-i', a, '-af', 'silencedetect=noise=-40dB:d=0.1', '-f', 'null', '-'])
  const starts = [...String(r.stderr).matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1]))
  const ends = [...String(r.stderr).matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]))
  const lead = starts.length && starts[0] <= 0.05 ? (ends[0] ?? d) : 0
  const last = starts[starts.length - 1]
  const tail = starts.length && (ends.length < starts.length || ends[ends.length - 1] >= d - 0.05) && last > 0.05 ? d - last : 0
  const wps = n / d
  if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text)) notes.push('words are counted by spaces, so for Japanese, Chinese or Korean the rate is not meaningful: judge the length by ear')
  else notes.push(`${wps.toFixed(2)} words per second is a measurement, not a limit (SL8's seed rate for a preset voice is 2.82, media-script-writer; a voice's own rate_wps is the figure to compare)`)
  if (lead < 0.4 || tail < 0.4) notes.push(`air ${lead.toFixed(2)} s before and ${tail.toFixed(2)} s after: pad to about 0.5 s at each end`)
  out('pace', { words: n, duration_s: Number(d.toFixed(3)), words_per_second: Number(wps.toFixed(2)), lead_s: Number(lead.toFixed(2)), tail_s: Number(tail.toFixed(2)), billed_seconds: Math.ceil(d) }, fails, notes)
}

const SL8_KEYS = ['Subject', 'Base portrait', 'Looks', 'Portrait source', 'Portrait model and prompt', 'Identity references', 'Voice endpoint', 'Voice', 'Voice Name', 'Voice Designed', 'Voice Settings', 'Voice Batch', 'Consent', 'Last Synced']
function record () {
  const file = rest[0]; const stage = opt('stage') ?? 'saved'
  if (!file || !fs.existsSync(file)) return usage('record', `record needs an existing AVATAR file (got ${file})`)
  if (!['identity', 'saved'].includes(stage)) return usage('record', '--stage is identity or saved')
  const text = fs.readFileSync(file, 'utf8'); const dir = path.dirname(file); const fails = []; const notes = []
  if (!/^AVATAR-[A-Z0-9-]+\.md$/.test(path.basename(file))) fails.push('the file name is AVATAR-<NAME>.md with NAME in capitals')
  if (!/^# Avatar: \S/m.test(text)) fails.push('no "# Avatar: <Name>" title')
  const sections = {}; let cur = null
  for (const line of text.split('\n')) {
    const h = /^## (.+?)\s*$/.exec(line); if (h) { cur = h[1]; sections[cur] = {}; continue }
    const kv = /^- ([^:]+):\s*(.*)$/.exec(line); if (kv && cur) sections[cur][kv[1].trim()] = kv[2].trim()
  }
  const need = { Appearance: ['Age', 'Gender', 'Ethnicity', 'Hair', 'Build', 'Features', 'Style'], Voice: ['Tone', 'Accent', 'Energy', 'Think'] }
  for (const [s, keys] of Object.entries(need)) {
    if (!sections[s]) { fails.push(`no ## ${s} section`); continue }
    for (const k of keys) if (!sections[s][k]) fails.push(`${s}: ${k} is empty (write unspecified rather than invent a trait)`)
  }
  for (const [s, kv] of Object.entries(sections)) for (const [k, v] of Object.entries(kv)) if (/[<>]/.test(v)) fails.push(`${s}: ${k} still holds a <slot>`)
  const s = sections.SL8
  if (stage === 'identity') {
    if (s && Object.entries(s).some(([k, v]) => k !== 'Consent' && v)) fails.push('the SL8 section is filled before the portrait exists: leave it empty (only Consent may be written now) until the record is saved')
    const ref = (sections.Appearance?.Reference ?? '').trim().toLowerCase()
    const consentNow = s?.Consent ?? ''
    if (ref && !['none', 'unspecified', 'n/a'].includes(ref) && !/^(owner|written permission from \S.*)$/.test(consentNow)) fails.push('Appearance Reference is a real person\'s photo or footage: write SL8 Consent (owner, or written permission from <name>) before any file is converted or sent (HR17)')
    return out('record', { file, stage }, fails, notes)
  }
  if (!s) return out('record', { file, stage }, [...fails, 'no ## SL8 section'])
  for (const k of SL8_KEYS) if (!s[k]) fails.push(`SL8: ${k} is empty`)
  if (s.Subject && !['agent', 'user', 'named'].includes(s.Subject)) fails.push('SL8: Subject is agent, user or named')
  if (s['Portrait source'] && !['prompt', 'photo', 'footage-frame'].includes(s['Portrait source'])) fails.push('SL8: Portrait source is prompt, photo or footage-frame')
  const exists = (p) => fs.existsSync(path.resolve(dir, p))
  if (s['Base portrait'] && !exists(s['Base portrait'])) fails.push(`SL8: the base portrait ${s['Base portrait']} is not on disk (paths are relative to the record)`)
  if (s.Looks && s.Looks !== 'none') {
    for (const part of s.Looks.split(',')) {
      const m = /^\s*(landscape|portrait|square)=(.+?)\s*$/.exec(part)
      if (!m) fails.push(`SL8: Looks entry "${part.trim()}" is not landscape=, portrait= or square=<path>`)
      else if (!exists(m[2])) fails.push(`SL8: look ${m[1]} ${m[2]} is not on disk`)
    }
  }
  if (s['Identity references'] && s['Identity references'] !== 'none') for (const p of s['Identity references'].split(',').map((x) => x.trim())) if (!exists(p)) fails.push(`SL8: identity reference ${p} is not on disk`)
  if (s['Voice Designed'] && !['true', 'false'].includes(s['Voice Designed'])) fails.push('SL8: Voice Designed is true or false')
  if (s['Voice Batch'] && s['Voice Batch'] !== 'n/a' && !/^\d+$/.test(s['Voice Batch'])) fails.push('SL8: Voice Batch is a batch index or n/a')
  const consent = s.Consent ?? ''
  if (consent && !/^(owner|written permission from \S.*|n\/a)$/.test(consent)) fails.push('SL8: Consent is owner, written permission from <name>, or n/a')
  const real = s.Subject === 'user' || ['photo', 'footage-frame'].includes(s['Portrait source']) || s['Voice Designed'] === 'true' || (s.Voice && !PRESETS.includes(s.Voice) && s['Voice Designed'] === 'false')
  if (real && (!consent || consent === 'n/a')) fails.push('SL8: a real person\'s face or a cloned voice needs Consent owner or written permission from <name> (HR17)')
  if (s['Last Synced'] && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s['Last Synced']) || Number.isNaN(Date.parse(s['Last Synced'])))) fails.push('SL8: Last Synced is an ISO timestamp')
  if (!/looks are files, not server records/i.test(text)) fails.push('the closing note (looks are files; a clone id expires after 7 days unused) is missing')
  if (s['Voice Designed'] === 'true') notes.push('a cloned voice: a MiniMax custom_voice_id is deleted after 7 days unused; voice-clone-setup re-clones from the kept consented sample')
  out('record', { file, stage, subject: s.Subject ?? null, looks: s.Looks ?? null }, fails, notes)
}

function clause () {
  const row = ROWS.find((r) => r.slug === rest[0])
  if (!row) return usage('clause', `unknown clause ${rest[0]}: ${ROWS.map((r) => r.slug).join(', ')}`)
  console.log(row.prompt)
}

if (cmd === 'photo') photo()
else if (cmd === 'params' && rest[0] === 'image') { rest.shift(); paramsImage() }
else if (cmd === 'params' && rest[0] === 'tts') { rest.shift(); paramsTts() }
else if (cmd === 'place') place()
else if (cmd === 'shortlist') shortlist()
else if (cmd === 'pace') pace()
else if (cmd === 'record') record()
else if (cmd === 'clause') clause()
else { console.error('usage: avatar.mjs photo|params image|params tts|place|shortlist|pace|record|clause …'); process.exit(2) }
