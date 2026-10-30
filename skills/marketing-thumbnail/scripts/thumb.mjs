#!/usr/bin/env node
// thumb.mjs: prompt assembly and checks for marketing-thumbnail. No network, no paid call.
//   assemble --brief B --variants V --dir D   one prompt file and one params file per variant (D/vNN.*);
//                                             prints one JSON line per variant: model, refs in CHARACTER order, declared
//   check    --brief B --variants V --dir D   the pre-submit checklist on every variant; exit 1 on any NO
//   tweak    --kind emotion|background|recolor|rim --value TEXT --model ID --ratio R [--resolution 2K] --out F
//   logo3d   --out F [--side 2880]            params for the 3D logo call (openai/gpt-image-2/edit)
//   record   --variants V --n N --result R    copies the result's file, request id, model and returned seed (rendered_seed) into V
//   size     --ratio R --resolution 1K|2K|4K  the openai/gpt-image-2 image_size for a ratio
// The wording comes only from ../references/library.json. Exit 0 ok, 1 check failed, 2 usage.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LIB = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'references', 'library.json'), 'utf8'))
const ROW = Object.fromEntries(LIB.rows.map((r) => [r.slug, r.prompt]))
const args = process.argv.slice(2)
const cmd = args[0]
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const die = (m, code = 2) => { console.error(`thumb.mjs: ${m}`); process.exit(code) }
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { die(`cannot read ${f}: ${e.message}`) } }
const fill = (slug, vals = {}) => ROW[slug].replace(/\{(\w+)\}/g, (m, k) => (vals[k] ?? m))
const NBP = new Set(['fal-ai/nano-banana-pro', 'fal-ai/nano-banana-pro/edit'])
const GPT_EDIT = 'openai/gpt-image-2/edit'
const SEEDREAM_EDIT = 'bytedance/seedream/v5/lite/edit'
const RATIOS = ['16:9', '9:16', '4:3', '3:4', '4:5', '1:1']

// openai/gpt-image-2 sizes: multiples of 16, 655,360 to 8,294,400 px, long edge <= 3840 (facts schema-gpt2-size).
const GPT_SIZE = {
  '4K': { '16:9': [3840, 2160], '9:16': [2160, 3840], '4:3': [3264, 2448], '3:4': [2448, 3264], '4:5': [2560, 3200], '1:1': [2880, 2880] },
  '2K': { '16:9': [2048, 1152], '9:16': [1152, 2048], '4:3': [2048, 1536], '3:4': [1536, 2048], '4:5': [1632, 2048], '1:1': [2048, 2048] },
  '1K': { '16:9': [1280, 720], '9:16': [720, 1280], '4:3': [1024, 768], '3:4': [768, 1024], '4:5': [832, 1040], '1:1': [1024, 1024] }
}
// Seedream presets by ratio; there is no 4:5 (a2 fine point #27).
const SEEDREAM_SIZE = { '16:9': 'landscape_16_9', '9:16': 'portrait_16_9', '4:3': 'landscape_4_3', '3:4': 'portrait_4_3', '1:1': 'square_hd' }

function gptSize (ratio, res) {
  const s = GPT_SIZE[res]?.[ratio]
  if (!s) die(`no openai/gpt-image-2 size for ratio ${ratio} at ${res}`)
  return { width: s[0], height: s[1] }
}

function modelParams (model, prompt, ratio, res) {
  if (!RATIOS.includes(ratio)) die(`ratio ${ratio} is not one of ${RATIOS.join(', ')}`)
  if (NBP.has(model)) {
    // Every default-on flag pinned (HR4); aspect and resolution always explicit (the defaults are 1:1 or auto, and 1K).
    return { prompt, aspect_ratio: ratio, resolution: res, num_images: 1, output_format: 'png', limit_generations: true, enable_web_search: false, safety_tolerance: '4' }
  }
  if (model === GPT_EDIT) return { prompt, image_size: gptSize(ratio, res), quality: 'high', num_images: 1, output_format: 'png' }
  if (model === SEEDREAM_EDIT) {
    if (!SEEDREAM_SIZE[ratio]) die(`${SEEDREAM_EDIT} has no ${ratio}: tweak at 3:4 and say so, or keep the tweak on fal-ai/nano-banana-pro/edit`)
    return { prompt, image_size: SEEDREAM_SIZE[ratio], num_images: 1, max_images: 1 }
  }
  die(`no params mapping for model ${model}`)
}

function expression (brief, v) {
  if (v.custom) return v.custom
  if (!v.emotion) return null
  const row = LIB.rows.find((r) => r.emotion === v.emotion)
  if (!row) die(`unknown emotion ${v.emotion}: use one of ${LIB.emotion_ladder.join(', ')} or a custom phrase`)
  return row.prompt
}

function refsOf (brief) {
  const chars = brief.characters ?? []
  if (chars.length > 3) die(`${chars.length} characters: the method takes 0-3 character images`)
  chars.forEach((c, i) => { if (!c.ref) die(`characters[${i}] has no "ref" file`) })
  const refs = chars.map((c) => c.ref)
  const logo = brief.logo
  if (logo && (logo.mode === '2d' || logo.mode === '3d')) {
    const f = logo.mode === '3d' ? logo.render : logo.file
    if (!f) die(logo.mode === '3d' ? 'logo.mode 3d needs logo.render: make the 3D logo first (SKILL.md step 10), then assemble' : 'logo.mode 2d needs logo.file')
    refs.push(f)
  }
  return refs
}

function assembleOne (brief, v) {
  const ratio = brief.ratio ?? '16:9'
  const rnote = LIB.ratio_notes[ratio]
  const medium = brief.medium
  const chars = brief.characters ?? []
  const people = brief.people ?? []
  const anyone = chars.length + people.length > 0
  // A real person's face is refused until SL8's consent text and privacy note are approved (learnings MKT-L412, MKT-L434).
  const real = chars.filter((c) => c.kind !== 'character')
  if (real.length) die(`characters ${real.map((c) => c.ref).join(', ')}: only "kind": "character" images are accepted; a real person's face photo is refused on this machine for now (SKILL.md step 6)`, 1)
  // Each character image says whether it is photographic or an illustrated/3D design (MKT-D435 note): an illustrated one is never given the photo lock.
  chars.forEach((c, i) => {
    if (!['photo', 'illustrated'].includes(c.look)) die(`characters[${i}] (${c.ref}): set "look" to "photo" (a generated or photographic person) or "illustrated" (a mascot, cartoon or 3D character)`)
    if (c.look === 'illustrated' && !medium) die(`characters[${i}] (${c.ref}) is illustrated: set brief.medium to that character's own medium (for example "a clean 3D-animated render") so it keeps its design and is never turned photographic`)
  })
  const exp = expression(brief, v)
  if (anyone && !exp) die(`variant ${v.n}: a person is in frame, so it needs an emotion or a custom expression`)
  const refs = refsOf(brief)
  const out = []
  if (refs.length >= 2) {
    const list = refs.map((r, i) => i < chars.length ? `image ${i + 1} is the reference for CHARACTER ${i + 1}` : `image ${i + 1} is the brand logo${brief.logo.mode === '3d' ? ' (its 3D render)' : ''}`)
    out.push(fill('manifest', { list: list.join('; ') }))
  }
  // Block 1
  if (medium) out.push(fill('medium-open', { medium }), ROW['medium-close'])
  else if (brief.split) {
    const s = brief.split; const count = s.count ?? 2
    if (typeof s !== 'object' || s === null) die('brief.split must be an object {mode, count, panels[], custom}: `true` is not enough')
    if (s.mode === 'custom') { if (!String(s.custom ?? '').trim()) die('split.mode custom needs split.custom text') } else if (!Array.isArray(s.panels) || s.panels.length < count || s.panels.some((x) => !String(x ?? '').trim())) die(`split needs ${count} non-empty split.panels (one line per side of the story)`)
    if (s.mode === 'before-after' && count !== 2) die('split.mode before-after takes exactly 2 panels')
    out.push(fill('split-open', { ratio: rnote, count: String(count), panels: count === 2 ? 'halves' : 'upright panels' }))
    if (s.mode === 'before-after') out.push(fill('split-before-after', { before: s.panels?.[0], after: s.panels?.[1] }))
    else if (s.mode === 'versus') out.push(fill('split-versus', { panels_desc: (s.panels ?? []).join('; ') }))
    else if (s.mode === 'custom') out.push(String(s.custom ?? '').trim())
    else out.push(fill('split-plain', { panels_desc: (s.panels ?? []).join('; ') }))
    out.push(ROW['split-suffix'])
  } else out.push(fill('frame', { ratio: rnote }))
  if (ratio === '9:16' && !medium) out.push(anyone ? ROW['tall-clause'] : ROW['tall-no-people'])
  // Block 2
  if (brief.scene) out.push(fill('scene', { scene: brief.scene }))
  // Block 3
  const t = brief.text ?? { mode: 'none' }
  if (t.mode === 'headline') out.push(fill('text-headline', { text: t.text }))
  else if (t.mode === 'baked-ui') out.push(fill('baked-ui', { ui_kind: t.ui_kind, ui_text: t.ui_text }))
  else out.push(ROW['no-text'])
  // Block 4
  if (anyone) {
    chars.forEach((c, i) => out.push(fill(medium ? 'design-lock' : 'identity-lock', { n: String(i + 1), k: String(i + 1), expression: exp })))
    people.forEach((p, i) => out.push(fill('described-person', { n: String(chars.length + i + 1), description: p.description, expression: exp })))
    out.push(medium ? ROW['medium-characters'] : ROW['subject-guidance'], ROW['subject-closing'])
  }
  // Blocks 5 to 9
  if (brief.key_elements == null) die('key_elements is empty: write the elements (default: the topic\'s most concrete noun, with the key-elements-default row) or "none"')
  if (brief.key_elements !== 'none') out.push(fill('key-elements', { elements: brief.key_elements }))
  if (brief.logo?.mode === '2d') out.push(ROW['logo-2d'])
  if (brief.logo?.mode === '3d') out.push(ROW['logo-3d'])
  if (brief.location) out.push(fill('location', { location: brief.location }))
  out.push(fill('composition', { composition: brief.composition ?? ROW['composition-default'] }))
  out.push(fill('background', { background: brief.background ?? ROW['background-default'] }))
  // Block 10, the take line, the reference's own emotion detail, block 11
  if (anyone && !medium) out.push(brief.rim ? fill('rig-rim', { color: LIB.rim_palette[brief.rim] ?? brief.rim }) : ROW['rig-plain'])
  if (v.take && v.take > 1) { if (!ROW[`take-${v.take}`]) die(`variant ${v.n}: take ${v.take} is not 1-4`); out.push(ROW[`take-${v.take}`]) }
  if (v.keep_reference_emotion && brief.emotion_detail) out.push(brief.emotion_detail)
  if (!medium) out.push(brief.grade ? `${brief.grade} Frame: ${rnote}.` : fill('grade', { ratio: rnote }))
  const prompt = out.filter(Boolean).join('\n')
  const model = v.model ?? (refs.length ? 'fal-ai/nano-banana-pro/edit' : 'fal-ai/nano-banana-pro')
  const params = modelParams(model, prompt, ratio, brief.resolution ?? '4K')
  if (v.seed != null && NBP.has(model) && v.reuse_seed) params.seed = v.seed
  return { prompt, model, params, refs }
}

const nn = (n) => String(n).padStart(2, '0')
function load () {
  const brief = readJson(opt('brief') ?? die('--brief is required'))
  const variants = readJson(opt('variants') ?? die('--variants is required'))
  if (!Array.isArray(variants) || !variants.length) die('variants must be a non-empty JSON array')
  if (variants.length > 16) die(`${variants.length} variants: the cap is 16 (emotions x takes)`)
  const keys = new Set(variants.map((v) => `${v.custom ?? v.emotion}|${v.take ?? 1}`))
  if (keys.size !== variants.length) die('two variants share the same expression and take: each pair must differ')
  return { brief, variants, dir: opt('dir') ?? die('--dir is required') }
}

if (cmd === 'assemble') {
  const { brief, variants, dir } = load()
  fs.mkdirSync(dir, { recursive: true })
  for (const v of variants) {
    const a = assembleOne(brief, v)
    fs.writeFileSync(path.join(dir, `v${nn(v.n)}.prompt.txt`), a.prompt + '\n')
    fs.writeFileSync(path.join(dir, `v${nn(v.n)}.params.json`), JSON.stringify(a.params, null, 2) + '\n')
    // media-qc compares w, h, aspect_ratio, format and min_long (a floor); it does not read "4K" or image_size, so the declaration uses those keys (MKT-D439 note).
    const MIN_LONG = { '4K': 3000, '2K': 1800, '1K': 900 }
    const declared = { format: 'png', ...(a.params.image_size ? { w: a.params.image_size.width, h: a.params.image_size.height } : { aspect_ratio: a.params.aspect_ratio, min_long: MIN_LONG[a.params.resolution] }) }
    console.log(JSON.stringify({ n: v.n, model: a.model, params: path.join(dir, `v${nn(v.n)}.params.json`), refs: a.refs, declared }))
  }
} else if (cmd === 'check') {
  const { brief, variants, dir } = load()
  const refs = refsOf(brief)
  let bad = 0
  const manifestFile = opt('manifest')
  const waivers = manifestFile && fs.existsSync(manifestFile) ? (readJson(manifestFile).waivers ?? []) : null
  const needsHr10 = (brief.text && ['headline', 'baked-ui'].includes(brief.text.mode)) || ['2d', '3d'].includes(brief.logo?.mode)
  if (needsHr10 && (waivers === null || !waivers.some((w) => w.rule === 'HR10'))) { console.log(`brief NO  in-render text or logo is set but no HR10 waiver is recorded${waivers === null ? ' (pass --manifest artifacts/<p>/manifest.json)' : ''}: run manifest.mjs waive --rule HR10`); bad++ }
  for (const r of refs) if (!fs.existsSync(r)) { console.log(`brief NO  reference file missing: ${r}`); bad++ }
  for (const v of variants) {
    const f = path.join(dir, `v${nn(v.n)}.params.json`)
    if (!fs.existsSync(f)) { console.log(`v${nn(v.n)} NO  params file missing: run assemble`); bad++; continue }
    const p = readJson(f); const lines = String(p.prompt ?? '').split('\n'); const model = v.model ?? (refs.length ? 'fal-ai/nano-banana-pro/edit' : 'fal-ai/nano-banana-pro')
    const anyone = (brief.characters ?? []).length + (brief.people ?? []).length > 0
    const opener = brief.medium ? 'Render everything in precisely' : brief.split ? 'SPLIT-FRAME' : 'Make a loud'
    const checks = [
      ['route', NBP.has(model) ? (refs.length ? model.endsWith('/edit') : !model.endsWith('/edit')) : model === GPT_EDIT && refs.length > 0],
      ['block 1 first', lines[refs.length >= 2 ? 1 : 0]?.startsWith(opener) && (refs.length < 2 || lines[0].startsWith('IMAGE REFERENCES'))],
      ['grade last', brief.medium ? !/^GRADE:/m.test(p.prompt) : (brief.grade ? lines.at(-1).includes('Frame:') : lines.at(-1).startsWith('GRADE:'))],
      ['lighting on people', brief.medium ? !/^LIGHTING:/m.test(p.prompt) : (!anyone || /^LIGHTING:/m.test(p.prompt))],
      ['one lock per photo', (p.prompt.match(brief.medium ? /^CHARACTER \d+, from reference/gm : /^IDENTITY LOCK for CHARACTER/gm) ?? []).length === (brief.characters ?? []).length],
      ['no real-person photo', (brief.characters ?? []).every((c) => c.kind === 'character')],
      ['style reference not sent', !brief.style_reference || !refs.includes(brief.style_reference)],
      ['one image per call', p.num_images === 1],
      ['no-lettering line', (brief.text?.mode ?? 'none') !== 'none' || p.prompt.includes(ROW['no-text'])],
      ['placeholders filled', !/\{\w+\}|<[^>\n]{1,40}>/.test(p.prompt)],
      ['size explicit', NBP.has(model) ? Boolean(p.aspect_ratio && p.resolution) : Boolean(p.image_size)]
    ]
    const no = checks.filter(([, ok]) => !ok).map(([k]) => k)
    console.log(`v${nn(v.n)} ${no.length ? 'NO ' : 'ok '} ${model}${no.length ? `  failed: ${no.join(', ')}` : ''}`)
    if (no.length) bad++
  }
  if (bad) { console.log(`${bad} variant(s) fail the pre-submit check: fix the brief or variants and assemble again`); process.exit(1) }
  console.log('pre-submit: every variant ok (now quote the plan)')
} else if (cmd === 'tweak') {
  const kind = opt('kind'); const value = opt('value'); const model = opt('model', 'fal-ai/nano-banana-pro/edit')
  if (!['emotion', 'background', 'recolor', 'rim'].includes(kind) || !value) die('tweak needs --kind emotion|background|recolor|rim and --value')
  const params = modelParams(model, fill(`tweak-${kind}`, { phrase: value }), opt('ratio') ?? die('--ratio is required: pass the job\'s ratio (a tweak of a 4K master returns the --resolution asked, 2K by default)'), opt('resolution', '2K'))
  const out = opt('out') ?? die('--out is required')
  fs.writeFileSync(out, JSON.stringify(params, null, 2) + '\n')
  console.log(JSON.stringify({ model, params: out }))
} else if (cmd === 'logo3d') {
  const side = Number(opt('side', 2880))
  if (side % 16 || side * side > 8294400 || side * side < 655360) die('--side must be a multiple of 16 between 816 and 2880')
  const out = opt('out') ?? die('--out is required')
  fs.writeFileSync(out, JSON.stringify({ prompt: ROW.logo3d, image_size: { width: side, height: side }, quality: 'high', num_images: 1, output_format: 'png' }, null, 2) + '\n')
  console.log(JSON.stringify({ model: GPT_EDIT, params: out }))
} else if (cmd === 'record') {
  const vf = opt('variants') ?? die('--variants is required'); const n = Number(opt('n'))
  const variants = readJson(vf); const r = readJson(opt('result') ?? die('--result is required'))
  const v = variants.find((x) => x.n === n) ?? die(`no variant ${n} in ${vf}`)
  if (!r.success) die(`the result envelope is a failure (${r.error?.code ?? 'unknown'})`, 1)
  Object.assign(v, { file: r.files?.[0]?.local_path ?? null, request_id: r.request_id ?? null, model_used: r.model, rendered_seed: r.raw?.seed ?? null })
  fs.writeFileSync(vf, JSON.stringify(variants, null, 2) + '\n')
  console.log(JSON.stringify({ n, file: v.file, rendered_seed: v.rendered_seed, request_id: v.request_id }))
} else if (cmd === 'size') {
  console.log(JSON.stringify(gptSize(opt('ratio', '16:9'), opt('resolution', '2K'))))
} else die('usage: thumb.mjs assemble|check|tweak|logo3d|record|size … (see the header)')
