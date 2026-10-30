#!/usr/bin/env node
// image-product-presets: resolve preset slugs and write the params file for one edit call.
//   node preset.mjs list                                 # the 45 presets: token, family, visible effect
//   node preset.mjs effect <slug>                        # the one line you may say about a preset
//   node preset.mjs resolve <slug> [<slug> ...]          # every slug of a set, before any upload
//   node preset.mjs params <slug> --model <id> --out <file> [--ratio 3:4|1:1|16:9|9:16] [--count 1-4]
//   node preset.mjs check <slug> <params file>           # prompt in the file == table row, byte for byte
// Exit: 0 ok; 1 unknown slug (the list is printed) or a failed check; 2 usage or an unreadable file.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const table = JSON.parse(fs.readFileSync(path.join(here, '..', 'references', 'presets.json'), 'utf8'))
const bySlug = new Map(table.presets.map((p) => [p.slug, p]))
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')
const [cmd, ...rest] = process.argv.slice(2)
const opt = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined }
const usage = (msg) => { console.error(msg); process.exit(2) }

// Size per ratio for each default model. The GPT Image sizes are SL8's choice inside fal's schema
// limits (multiples of 16, 655,360-8,294,400 px, aspect <= 3:1; facts row schema-gpt2-size), sized
// near the recipes' 2K tier. Nano Banana Pro takes aspect_ratio and a resolution tier
// (schema-nbp-aspect, schema-nbp-resolution: 1K/2K/4K, default 1K; 2K bills as 1K).
const GPT_SIZE = { '3:4': [1536, 2048], '1:1': [1536, 1536], '16:9': [2048, 1152], '9:16': [1152, 2048] }
const ROUTES = {
  'openai/gpt-image-2/edit': (ratio) => {
    const [width, height] = GPT_SIZE[ratio]
    // quality pinned high (the recipes' tier); png, safety checker on and sync off pinned (HR4).
    return { image_size: { width, height }, quality: 'high', output_format: 'png', enable_safety_checker: true, sync_mode: false }
  },
  // limit_generations and enable_web_search pinned at their defaults (HR4); no output_format field.
  'fal-ai/nano-banana-pro/edit': (ratio) => ({ aspect_ratio: ratio, resolution: '2K', limit_generations: true, enable_web_search: false })
}

function row (slug) {
  const p = bySlug.get(String(slug ?? '').replace(/^\//, ''))
  if (p && p.prompt && p.prompt.trim()) return p
  console.error(`unknown preset '${slug}'. The 45 presets: ${table.presets.map((x) => x.token).join(' ')}`)
  process.exit(1)
}

if (cmd === 'list') {
  for (const p of table.presets) console.log(`${p.token}\t${p.family}\t${p.visible_effect}`)
} else if (cmd === 'effect') {
  console.log(row(rest[0]).visible_effect)
} else if (cmd === 'resolve') {
  if (!rest.length) usage('resolve needs at least one slug')
  const rows = rest.map(row) // exits 1 on the first unknown slug: one unknown stops the whole set
  console.log(JSON.stringify(rows.map((p) => ({ slug: p.slug, family: p.family, effect: p.visible_effect }))))
} else if (cmd === 'params') {
  const p = row(rest[0])
  const model = opt('model'); const out = opt('out'); const ratio = opt('ratio') ?? '3:4'
  if (!model || !out) usage('params needs --model and --out')
  if (!ROUTES[model]) usage(`no size mapping for ${model}: the defaults are ${Object.keys(ROUTES).join(', ')}; for another model write the params file by hand from ai-gen info and the raw OpenAPI (HR2)`)
  if (!GPT_SIZE[ratio]) usage('--ratio is one of 3:4, 1:1, 16:9, 9:16')
  const count = Number(opt('count') ?? 1)
  if (!Number.isInteger(count) || count < 1 || count > 4) usage('--count is 1-4')
  const params = { prompt: p.prompt, num_images: count, ...ROUTES[model](ratio) }
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(params, null, 2) + '\n')
  const declared = model.includes('gpt-image') ? { width: params.image_size.width, height: params.image_size.height, aspect: ratio, format: 'png' } : { aspect: ratio }
  console.log(JSON.stringify({ slug: p.slug, model, out, ratio, count, declared, prompt_sha256: sha(p.prompt), chars: p.prompt.length }))
} else if (cmd === 'check') {
  const p = row(rest[0])
  let sent
  try { sent = JSON.parse(fs.readFileSync(rest[1], 'utf8')).prompt } catch (e) { usage(`cannot read params file ${rest[1]}: ${e.message}`) }
  const ok = sent === p.prompt
  console.log(JSON.stringify({ slug: p.slug, match: ok, want: sha(p.prompt), got: sha(String(sent)) }))
  process.exit(ok ? 0 : 1)
} else {
  usage('usage: preset.mjs list | effect <slug> | resolve <slug>... | params <slug> --model <id> --out <file> [--ratio r] [--count n] | check <slug> <params file>')
}
