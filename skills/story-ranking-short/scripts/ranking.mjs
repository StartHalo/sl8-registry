#!/usr/bin/env node
// story-ranking-short helper (SL8-authored). No network, no paid calls: it checks files, writes params
// files and measures the stitched result with ffprobe.
//
//   node ranking.mjs refs                                    every reference file the steps open exists
//   node ranking.mjs windows --items N [--total 23.5]        default per-item windows and render lengths
//   node ranking.mjs check-script <script.json>              the script's shape, order, filmers and windows
//   node ranking.mjs params still|edit|clip --script <s> --rank <r> [--model <id>] [--fix a,b] [--drift]
//                          [--no-boom] --out <params.json>   one params file, prompt assembled, unchanged
//   node ranking.mjs ready master|stills|clips --script <s>   exit 1 unless the approvals the next paid step needs are recorded
//   node ranking.mjs list --script <s> --dir <norm dir> --out <list.txt>   concat list in display order
//   node ranking.mjs verify --script <s> --file <final.mp4> [--dir <norm dir>] [--tol 0.1]
//
// Exit 0 ok, 1 a problem (listed), 2 usage.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REFS = path.join(HERE, '..', 'references')
const args = process.argv.slice(2)
const cmd = args[0]
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const flag = (n) => args.includes(`--${n}`)
const out = (o, code = 0) => { console.log(JSON.stringify(o, null, 2)); process.exit(code) }
const usage = (m) => { console.error(m); process.exit(2) }
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

const REF_FILES = ['ideas.md', 'style-bible.md', 'scripts.md', 'look.md', 'reference-frames.md', 'pacing.md', 'audio.md', 'classes.md', 'prompts.json']
const LOOKS = ['classic', 'boxed', 'yellow', 'clean']
const ROUTES = ['overlay', 'painted']

// Default: these models and fields; a kit or brief may name another model (it then writes its own params file).
const MODELS = {
  'fal-ai/nano-banana-pro': { kind: 'still', fields: () => ({ aspect_ratio: '9:16', resolution: '2K', num_images: 1 }) },
  'openai/gpt-image-2': { kind: 'still', fields: () => ({ image_size: { width: 1152, height: 2048 }, quality: 'high', num_images: 1 }) },
  'fal-ai/nano-banana-pro/edit': { kind: 'edit', fields: () => ({ aspect_ratio: '9:16', resolution: '2K', num_images: 1 }) },
  'openai/gpt-image-2/edit': { kind: 'edit', fields: () => ({ image_size: { width: 1152, height: 2048 }, quality: 'high', num_images: 1, output_format: 'png' }) },
  'bytedance/seedance-2.0/image-to-video': { kind: 'clip', fields: (it) => ({ aspect_ratio: '9:16', resolution: '720p', duration: it.render, generate_audio: true }) },
  'bytedance/seedance-2.0/fast/image-to-video': { kind: 'clip', fields: (it) => ({ aspect_ratio: '9:16', resolution: '720p', duration: it.render, generate_audio: true }) }
}
const DEFAULT_MODEL = { still: 'fal-ai/nano-banana-pro', edit: 'fal-ai/nano-banana-pro/edit', clip: 'bytedance/seedance-2.0/image-to-video' }

// Seedance 2.0 takes duration as a string of bare integers "4".."15" (facts schema-seedance20-duration), and
// has returned about 1 s less than asked (beh-seedance-length), so each window renders at ceil(window)+1.
const render = (w) => String(Math.min(15, Math.max(4, Math.ceil(w) + 1)))
const MIN_WINDOW = 3 // a payoff must be visible by second 3 (references/pacing.md), so no window is shorter
const MAX_ITEMS = 9 // a top 10 is not offered on this machine yet (SKILL.md, STO-D393)
// 5 and 6 items keep the ~23.5 s total; 7 to 9 items grow it so that no window is under MIN_WINDOW.
const defaultTotal = (n) => (n === 5 || n === 6 || n < 5 ? 23.5 : Math.max(23.5, Math.round(n * 3.7 * 10) / 10))
function windows (n, total = defaultTotal(n)) {
  let w
  if (n === 6 && total === 23.5) w = [3.5, 3.5, 3.5, 4, 4, 5]
  else if (n === 5 && total === 23.5) w = [4, 4, 4.5, 5, 6]
  else {
    const ramp = Array.from({ length: n }, (_, i) => 0.85 + 0.3 * (n === 1 ? 1 : i / (n - 1)))
    const s = ramp.reduce((a, b) => a + b, 0)
    w = ramp.map((r) => Math.round((r * total / s) * 10) / 10)
    w[n - 1] = Math.round((total - w.slice(0, -1).reduce((a, b) => a + b, 0)) * 10) / 10
  }
  return w.map((x) => ({ window: x, render: render(x) }))
}
function windowProblems (n, total) {
  if (n > MAX_ITEMS) return [`${n} items: a top 10 is not offered on this machine yet; 3 to ${MAX_ITEMS} items`]
  const short = windows(n, total).filter((x) => x.window < MIN_WINDOW)
  return short.length ? [`${n} items in ${total} s give a window of ${short[0].window} s, under ${MIN_WINDOW} s: raise --total to ${Math.ceil(n * 3.7)} s or use fewer items`] : []
}

function prompts () {
  const t = readJson(path.join(REFS, 'prompts.json'))
  return Object.fromEntries(t.rows.map((r) => [r.slug, r.prompt]))
}

function checkScript (s) {
  const p = []
  const items = s.items ?? []
  const n = items.length
  if (s.schema !== 'sl8.story.ranking/1') p.push('schema must be sl8.story.ranking/1')
  if (!ROUTES.includes(s.route)) p.push(`route must be one of ${ROUTES.join(', ')}`)
  if (!LOOKS.includes(s.look)) p.push(`look must be one of ${LOOKS.join(', ')}`)
  if (!/^Ranking \S/.test(s.title ?? '')) p.push('title must start "Ranking " (shape in references/scripts.md)')
  if ((s.title ?? '').length > 40) p.push(`title is ${(s.title ?? '').length} characters; keep it to 40 or fewer`)
  if (n < 3) p.push(`${n} items; 3 to ${MAX_ITEMS} are supported (default 6, or 5 for a top 5)`)
  if (n > MAX_ITEMS) p.push(`${n} items: a top 10 is not offered on this machine yet; ${MAX_ITEMS} items at most (SKILL.md)`)
  const warn = []
  items.forEach((it, i) => {
    const want = n - i
    if (it.rank !== want) p.push(`item ${i + 1} has rank ${it.rank}; display order runs from #${n} down to #1, so it must be ${want}`)
    for (const f of ['line', 'scene', 'action', 'payoff', 'impact', 'follow_up']) if (!String(it[f] ?? '').trim()) p.push(`#${it.rank}: ${f} is empty`)
    for (const f of ['who', 'voice', 'emotion', 'words']) if (!String(it.filmer?.[f] ?? '').trim()) p.push(`#${it.rank}: filmer.${f} is empty`)
    if (!(Number(it.impact_s) >= 0.5)) p.push(`#${it.rank}: impact_s (seconds from the clip start when the impact lands, 0.5 or more) is missing`)
    else if (Number(it.impact_s) > Number(it.window) - 0.5) p.push(`#${it.rank}: impact_s ${it.impact_s} must be at most window ${it.window} minus 0.5, or the cut takes the boom and the reaction`)
    if (Number(it.window) > 0 && Number(it.window) < MIN_WINDOW) p.push(`#${it.rank}: window ${it.window} s is under ${MIN_WINDOW} s; the payoff would not be visible in time`)
    if (!String(it.emoji ?? '').trim()) warn.push(`#${it.rank}: emoji is empty; the list line is drawn without one`)
    if (String(it.line ?? '').length > 28) p.push(`#${it.rank}: menu line is ${it.line.length} characters; keep it to 28 or fewer`)
    if (!(Number(it.window) > 0)) p.push(`#${it.rank}: window missing (node ranking.mjs windows --items ${n})`)
    if (!/^\d+$/.test(String(it.render ?? '')) || Number(it.render) < 4 || Number(it.render) > 15) p.push(`#${it.rank}: render must be a bare integer string "4".."15"`)
    else if (Number(it.render) < Number(it.window)) p.push(`#${it.rank}: render ${it.render} s is shorter than its window ${it.window} s (never pad a clip)`)
  })
  const who = new Set(items.map((it) => String(it.filmer?.who ?? '').toLowerCase().trim()))
  const voice = new Set(items.map((it) => String(it.filmer?.voice ?? '').toLowerCase().trim()))
  if (n && (who.size < n || voice.size < n)) p.push('every item needs its own filmer: a different person and a different voice (references/audio.md)')
  const ws = items.map((it) => Number(it.window))
  if (n > 1 && ws.every((w) => w === ws[0])) p.push('every window is the same length; the windows must vary (references/pacing.md)')
  const sum = Math.round(ws.reduce((a, b) => a + b, 0) * 100) / 100
  if (s.total_s !== undefined && Math.abs(Number(s.total_s) - sum) > 0.1) warn.push(`total_s ${s.total_s} differs from the windows' sum ${sum}`)
  return { problems: p, warnings: warn, items: n, total_s: sum }
}

const menuLine = (it) => `${it.rank}. ${it.line}${it.emoji ? ' ' + it.emoji : ''}`
function menuState (s, rank) {
  const n = s.items.length
  const lines = []
  for (let k = 1; k <= n; k++) {
    const it = s.items.find((x) => x.rank === k)
    lines.push(k >= rank ? menuLine(it) : `${k}.`)
  }
  return lines
}

function params (kind) {
  const sp = opt('script'); const rank = Number(opt('rank')); const o = opt('out')
  if (!sp || !rank || !o) usage('params needs --script, --rank and --out')
  const s = readJson(sp)
  const chk = checkScript(s)
  if (chk.problems.length) out({ ok: false, problems: chk.problems }, 1)
  const it = s.items.find((x) => x.rank === rank)
  if (!it) out({ ok: false, problems: [`no item with rank ${rank}`] }, 1)
  const first = s.items[0].rank === rank
  const model = opt('model', DEFAULT_MODEL[kind])
  const m = MODELS[model]
  if (!m) out({ ok: false, problems: [`no field mapping for ${model}; a kit that names another model writes its own params file (fields from ai-gen info and the raw OpenAPI)`] }, 1)
  if (m.kind !== kind) out({ ok: false, problems: [`${model} is a ${m.kind} model, not ${kind}`] }, 1)
  if (kind === 'edit' && s.route !== 'painted') out({ ok: false, problems: ['edits are the painted route only; on the overlay route every still is a still'] }, 1)
  if (kind === 'edit' && first) out({ ok: false, problems: ['the first still in display order is the master: use params still'] }, 1)
  if (kind === 'still' && s.route === 'painted' && !first) out({ ok: false, problems: ['on the painted route only the master is a still; the others are edits of the previous approved still'] }, 1)
  const P = prompts()
  const fixes = String(opt('fix', '')).split(',').map((x) => x.trim()).filter(Boolean)
  for (const f of fixes) if (!P[f]) out({ ok: false, problems: [`--fix ${f} is not a prompt row in references/prompts.json`] }, 1)
  const lead = fixes.length ? ['Most important: ' + fixes.map((f) => P[f]).join(' ')] : []
  let parts = []
  const refs = []
  if (kind === 'still' || kind === 'edit') {
    const scene = `Scene: ${it.scene}. The frame shows the moment just before the action: ${it.action}.`
    if (kind === 'edit') {
      parts.push(model.includes('gpt-image-2') ? P['edit-lead-plain'] : P['edit-lead'])
      if (flag('drift')) { parts.push(model.includes('gpt-image-2') ? P['drift-guard'].replace('@Image2', 'The second image') : P['drift-guard']); refs.push('--ref <previous approved still>', '--ref <master>') } else refs.push('--ref <previous approved still>')
      parts.push(scene, `New line, slot ${it.rank}: "${menuLine(it)}".`)
    } else parts.push(scene)
    parts.push(P['look-line'], P.realism, P['full-frame'])
    if (s.route === 'painted') {
      if (kind === 'still') {
        parts.push(P['size-rules'], P['text-block'])
        const look = s.look === 'classic' ? 'white heavy sans-serif letters with a thick black outline' : s.look === 'boxed' ? 'black heavy letters on a white rounded box' : s.look === 'yellow' ? 'yellow heavy letters with a thick black outline' : 'white clean sans-serif letters with a soft shadow'
        parts.push(`Text look: ${look}, the same for the title and the list.`, `Title, written exactly: "${s.title}".`, `Numbered list, one per line from top to bottom, written exactly: ${menuState(s, rank).map((l) => `"${l}"`).join(' / ')}.`)
      } else parts.push(P['text-block'])
      parts.push(P['no-stray-text'])
    } else parts.push(P['composition-overlay'], P['plain-surfaces'])
  } else {
    const cap = (x) => String(x).charAt(0).toUpperCase() + String(x).slice(1)
    let sound = `Sound: a short pop at the very start; the person filming, ${it.filmer.who} (${it.filmer.voice}, ${it.filmer.emotion}), says "${it.filmer.words}"`
    if (!flag('no-boom')) sound += `; a deep bass hit on the impact (${it.impact}).`
    else sound += '.'
    const extra = [!flag('no-boom') && P.boom, first && P['frame0-drop']].filter(Boolean)
    parts = [P['speed-lead'], `Filmed on a phone by ${it.filmer.who}. ${cap(it.action)}; ${it.payoff}.`, P['payoff-timing'], `The impact lands at about ${it.impact_s} seconds, and the follow-up and the words are finished by ${Math.round((Number(it.window) - 0.3) * 10) / 10} seconds.`, `Then one clear follow-up: ${it.follow_up}.`, P.steady, P.continuity, P['motion-realism'], sound, ...extra, s.route === 'painted' ? P['text-lock-painted'] : P['text-lock-overlay'], `${P['keep-lead']} ${s.route === 'painted' ? 'the painted title and list, ' : ''}the framing, the person filming.`]
    refs.push('--image <this item\'s approved still>')
  }
  const prompt = [...lead, ...parts].join(' ').replace(/\s+/g, ' ').trim()
  const body = { prompt, ...m.fields(it) }
  fs.mkdirSync(path.dirname(path.resolve(o)), { recursive: true })
  fs.writeFileSync(o, JSON.stringify(body, null, 2) + '\n')
  const declared = kind === 'clip' ? { aspect: '9:16', audio: true } : { aspect: '9:16' }
  out({ ok: true, out: o, model, kind, rank, route: s.route, media_flags: refs, fixes, no_boom: flag('no-boom'), declared, prompt_words: prompt.split(' ').length })
}

// Gates only warn, so the run asks this before the first paid call of steps 5, 6 and 7 (HR12): the approvals are
// entries in script.json `approvals`, {"stop":"script|master|stills|all","words":"...","by":"customer|brief|gate NN"}.
function ready (stage) {
  const s = readJson(opt('script'))
  const have = (stop) => (s.approvals ?? []).some((a) => (a.stop === stop || a.stop === 'all') && String(a.words ?? '').trim())
  const need = { master: ['script'], stills: ['script', 'master'], clips: ['script', 'master', 'stills'] }[stage]
  if (!need) usage('ready master|stills|clips --script <s>')
  const missing = need.filter((x) => !have(x))
  if (stage !== 'master' && !s.master) missing.push('master (the locked master file in script.json `master`)')
  out({ ok: !missing.length, stage, missing, note: missing.length ? 'Record the approval (or open its gate, SKILL.md steps 4 to 6) before this paid step' : 'Approvals recorded' }, missing.length ? 1 : 0)
}

function ffprobe (f) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', f], { encoding: 'utf8' }))
  return { duration: Number(j.format?.duration), video: (j.streams ?? []).find((x) => x.codec_type === 'video'), audio: (j.streams ?? []).some((x) => x.codec_type === 'audio') }
}
const normName = (i) => `norm_${String(i + 1).padStart(2, '0')}.mp4`

if (cmd === 'refs') {
  const missing = REF_FILES.filter((f) => !fs.existsSync(path.join(REFS, f)))
  out({ ok: !missing.length, checked: REF_FILES.length, missing }, missing.length ? 1 : 0)
} else if (cmd === 'windows') {
  const n = Number(opt('items')); const total = Number(opt('total', defaultTotal(n)))
  if (!n) usage('windows needs --items N')
  const wp = windowProblems(n, total)
  if (wp.length) out({ ok: false, problems: wp }, 1)
  const w = windows(n, total)
  out({ items: n, total_s: total, note: 'Starting proposal, never observed upstream: only the ~23.5 s total survives; 7 to 9 items take a longer total so no window is under 3 s (references/pacing.md)', windows: w.map((x, i) => ({ display: i + 1, rank: n - i, ...x })) })
} else if (cmd === 'check-script') {
  if (!args[1]) usage('check-script <script.json>')
  const r = checkScript(readJson(args[1]))
  out({ ok: !r.problems.length, ...r }, r.problems.length ? 1 : 0)
} else if (cmd === 'ready') {
  ready(args[1])
} else if (cmd === 'params') {
  const kind = args[1]
  if (!['still', 'edit', 'clip'].includes(kind)) usage('params still|edit|clip …')
  params(kind)
} else if (cmd === 'list') {
  const s = readJson(opt('script')); const dir = opt('dir'); const o = opt('out')
  if (!dir || !o) usage('list needs --script, --dir and --out')
  const files = s.items.map((_, i) => path.resolve(dir, normName(i)))
  const missing = files.filter((f) => !fs.existsSync(f))
  if (missing.length) out({ ok: false, missing }, 1)
  fs.writeFileSync(o, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n')
  out({ ok: true, out: o, files: files.length })
} else if (cmd === 'verify') {
  const s = readJson(opt('script')); const f = opt('file'); const tol = Number(opt('tol', 0.1)); const dir = opt('dir')
  if (!f) usage('verify needs --script and --file')
  const p = []
  const want = Math.round(s.items.reduce((a, it) => a + Number(it.window), 0) * 1000) / 1000
  const m = ffprobe(f)
  if (!(Math.abs(m.duration - want) <= tol)) p.push(`duration ${m.duration} s against the windows' sum ${want} s (tolerance ${tol} s)`)
  if (!m.audio) p.push('no audio stream: each clip keeps its own sound')
  if (m.video && (m.video.width / m.video.height).toFixed(4) !== (9 / 16).toFixed(4)) p.push(`picture is ${m.video.width}x${m.video.height}, not 9:16`)
  const ws = s.items.map((it) => Number(it.window))
  if (ws.length > 1 && ws.every((w) => w === ws[0])) p.push('every item has the same length')
  const segs = []
  if (dir) {
    s.items.forEach((it, i) => {
      const fp = path.join(dir, normName(i))
      if (!fs.existsSync(fp)) { p.push(`missing ${normName(i)}`); return }
      const g = ffprobe(fp)
      segs.push({ display: i + 1, rank: it.rank, window: Number(it.window), measured: g.duration, audio: g.audio })
      if (Math.abs(g.duration - Number(it.window)) > 0.05) p.push(`${normName(i)} is ${g.duration} s, its window is ${it.window} s`)
      if (!g.audio) p.push(`${normName(i)} has no audio stream`)
    })
  }
  out({ ok: !p.length, file: f, measured_s: m.duration, windows_sum_s: want, size: m.video ? `${m.video.width}x${m.video.height}` : null, audio: m.audio, segments: segs, problems: p }, p.length ? 1 : 0)
} else usage('usage: ranking.mjs refs|windows|check-script|ready|params|list|verify …')
