#!/usr/bin/env node
// statics.mjs: batch layout, numbering and names for marketing-static-ad-production.
// SL8-authored from the behaviour the capability assessment records for JuicyLucy's ad-naming tool
// and workspace conventions (research juicylucy-ads/adnaming-d7bdfd, juicylucy-b90136); no vendor
// code is copied. Dependency-free except `capture` (Playwright on the machine's headless browser).
//
//   where    [--conventions DIR]                       the conventions in force, per key group
//   history  --root artifacts/<p>                       prior batches by concept: last date, days since
//   reserve  --root artifacts/<p> [--count N]           next contiguous #NNNN block (scan only, writes nothing)
//   folder   --seq N --lang LL --batch B --ads N         one ad-set folder name
//   name     --lang LL --concept C --ratio 9x16 --mode copy|visual|remix [--date D] [--dir FULL PATH of the ad-set folder] [--ext png]
//   inherit  --filename F --lang LL                      a localized copy's name
//   map      --approved DIR --src LL --targets a,b --root artifacts/<p> --out map.json
//                                                       reserves numbers for every target folder, writes the
//                                                       marketing-ad-localization --map file, prints the table
//   verify   --cycle artifacts/<p>/<date>/c<k> --ads N|name [--width W --height H] [--size-advisory]
//            (--ads name checks each folder against its own name only, for localized folders whose count differs;
//            --size-advisory reports a size mismatch under findings instead of failing)
//   capture  URL --out FILE.png [--width 1280] [--height 2400] [--wait 4000]   one headless screenshot, no saved login state
//
// Exit 0 ok, 1 a failed check or bad input, 2 usage, 3 no headless browser.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEFAULTS = path.join(HERE, '..', 'references', 'conventions.json')
const args = process.argv.slice(2)
const cmd = args[0]
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d }
const out = (o) => console.log(JSON.stringify(o, null, 1))
const die = (m, code = 1) => { console.error(`statics: ${m}`); process.exit(code) }
const need = (n) => { const v = opt(n); if (v === undefined || v === '') die(`--${n} is required`, 2); return v }

function conventions () {
  let base
  try { base = JSON.parse(fs.readFileSync(DEFAULTS, 'utf8')) } catch (e) { die(`conventions unreadable: ${DEFAULTS} (${e.message}); never name files from memory`) }
  const dir = opt('conventions')
  const origin = Object.fromEntries(Object.keys(base).map((k) => [k, 'default']))
  if (dir) {
    const f = path.join(dir, 'conventions.json')
    if (!fs.existsSync(f)) die(`no conventions.json in ${dir}`)
    let over
    try { over = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { die(`conventions unreadable: ${f} is not valid JSON (${e.message})`) }
    for (const [k, v] of Object.entries(over)) { base[k] = v; origin[k] = f }
  }
  return { c: base, origin }
}

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '.')
const pad = (n, d) => String(n).padStart(d, '0')
const walk = (d) => { const o = []; if (!fs.existsSync(d)) return o; for (const n of fs.readdirSync(d)) { const p = path.join(d, n); o.push(p); if (fs.statSync(p).isDirectory()) o.push(...walk(p)) } return o }
const IMG = /\.(png|jpe?g|webp)$/i

function highest (root, digits) {
  let max = 0
  const re = new RegExp(`#(\\d{${digits}})(?!\\d)`, 'g')
  for (const p of walk(root)) for (const m of path.basename(p).matchAll(re)) max = Math.max(max, Number(m[1]))
  return max
}

function folderName (c, { seq, lang, batch, ads }) {
  const bad = []
  if (!Number.isInteger(seq) || seq < 1) bad.push('seq')
  if (!/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(lang || '')) bad.push('lang')
  if (!batch || /_| - /.test(batch)) bad.push('batch (no underscore, no " - ")')
  if (!Number.isInteger(ads) || ads < 1) bad.push('ads')
  if (bad.length) die(`invalid field(s): ${bad.join(', ')}`)
  return c.ad_set.pattern.replace('{seq}', pad(seq, c.sequence.digits)).replace('{LL}', lang.toUpperCase()).replace('{batch}', batch).replace('{ads}', String(ads))
}

function fileName (c, { lang, concept, ratio, mode, date, version, ext }) {
  const bad = []
  if (!/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(lang || '')) bad.push('lang')
  if (!concept || /_| - /.test(concept)) bad.push('concept (no underscore, no " - ")')
  if (!/^\d{1,2}x\d{1,2}$/.test(ratio || '')) bad.push('ratio (like 9x16)')
  if (!(c.file.values?.mode ?? ['copy', 'visual', 'remix']).includes(mode)) bad.push('mode (copy, visual or remix)')
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(date)) bad.push('date (YYYY.MM.DD)')
  if (bad.length) die(`invalid field(s): ${bad.join(', ')}`)
  return c.file.pattern.replace('{LL}', lang.toUpperCase()).replace('{concept}', concept).replace('{ratio}', ratio)
    .replace('{mode}', mode).replace('{date}', date).replace('{version}', String(version)).replace('{ext}', ext)
}

const FILE_RE = /^([A-Z]{2,3}(?:-[A-Z]{2,4})?) - (.+?) - S_R-(\d{1,2}x\d{1,2})_M-(copy|visual|remix)_(\d{4}\.\d{2}\.\d{2})_v(\d+)\.([a-z0-9]+)$/
const FOLDER_RE = /^#(\d+) ([A-Z]{2,3}(?:-[A-Z]{2,4})?) - (.+) - (\d+) Ads$/

function inherit (filename, lang) {
  if (!FILE_RE.test(filename)) die(`off-pattern source filename: ${filename}`)
  return lang.toUpperCase() + filename.slice(filename.indexOf(' - '))
}

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')

function history () {
  const root = need('root')
  const rows = {}
  for (const p of walk(root).filter((f) => path.basename(f) === 'batch.json')) {
    let b
    try { b = JSON.parse(fs.readFileSync(p, 'utf8')) } catch { console.error(`unreadable record ${p} (skipped; check it by eye)`); continue }
    for (const m of b.masters ?? []) {
      const r = rows[m.concept] ??= { concept: m.concept, batches: [], modes: new Set(), languages: new Set() }
      r.batches.push(`${b.date}/c${String(b.cycle).replace(/^c/i, '')}`)
      for (const l of m.languages ?? []) r.languages.add(l)
      if (m.mode) r.modes.add(m.mode)
    }
    if (!(b.masters ?? []).some((m) => m.languages)) for (const f of b.folders ?? []) for (const m of b.masters ?? []) rows[m.concept]?.languages.add(f.code)
  }
  const now = Date.now()
  const list = Object.values(rows).map((r) => {
    const last = r.batches.map((x) => x.split('/')[0]).sort().at(-1)
    const days = last ? Math.floor((now - Date.parse(last.replace(/\./g, '-'))) / 86400000) : null
    return { concept: r.concept, last_iterated: last, days_since: days, batches: r.batches, modes: [...r.modes], languages: [...r.languages] }
  }).sort((a, b) => String(b.last_iterated).localeCompare(String(a.last_iterated)))
  out({ root, concepts: list, note: 'from batch.json records only; confirm uncertain matches against the images (filenames can mislead)' })
}

function mapCmd (c) {
  const approved = need('approved'); const src = need('src').toUpperCase(); const root = need('root'); const dest = need('out')
  const targets = need('targets').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  if (targets.includes(src) || new Set(targets).size !== targets.length) die('targets must be distinct and differ from --src')
  const folders = fs.readdirSync(approved).filter((n) => fs.statSync(path.join(approved, n)).isDirectory()).sort()
  if (!folders.length) die(`no ad-set folders under ${approved}`)
  let next = highest(root, c.sequence.digits) + 1
  const map = {}; const table = []
  for (const code of targets) {
    const lmap = map[code.toLowerCase()] = {}
    for (const f of folders) {
      const m = FOLDER_RE.exec(f)
      if (!m || m[2] !== src) die(`approved folder '${f}' is not a ${src} ad-set name from statics.mjs folder`)
      const files = fs.readdirSync(path.join(approved, f)).filter((x) => IMG.test(x)).sort()
      if (files.length !== Number(m[4])) die(`'${f}' holds ${files.length} images, its name says ${m[4]}`)
      const tf = folderName(c, { seq: next++, lang: code, batch: m[3], ads: Number(m[4]) })
      lmap[f] = tf
      for (const x of files) lmap[`${f}/${x}`] = inherit(x, code)
      table.push({ language: code, source_folder: f, target_folder: tf, files: files.map((x) => inherit(x, code)) })
    }
  }
  fs.writeFileSync(dest, JSON.stringify(map, null, 1))
  out({ map: dest, reserved: `${pad(highest(root, c.sequence.digits) + 1, c.sequence.digits)}..${pad(next - 1, c.sequence.digits)}`, table, next_step: 'run marketing-ad-localization loc.py plan with --map now: nothing is locked until its folders exist' })
}

function verify () {
  const cyc = need('cycle'); const adsArg = need('ads'); const ads = adsArg === 'name' ? null : Number(adsArg)
  const advisory = args.includes('--size-advisory'); const findings = []
  if (ads !== null && !Number.isInteger(ads)) die('--ads is a number or the word name', 2)
  const W = opt('width') ? Number(opt('width')) : null; const H = opt('height') ? Number(opt('height')) : null
  const finals = path.join(cyc, 'final')
  if (!fs.existsSync(finals)) die(`no ${finals}`)
  const problems = []; const seen = new Map(); let total = 0
  const report = []
  for (const code of fs.readdirSync(finals).sort()) {
    const ld = path.join(finals, code)
    if (!fs.statSync(ld).isDirectory()) continue
    for (const f of fs.readdirSync(ld).sort()) {
      const fd = path.join(ld, f)
      if (!fs.statSync(fd).isDirectory()) { problems.push(`${code}/${f}: a file directly in the language folder`); continue }
      const m = FOLDER_RE.exec(f)
      if (!m) problems.push(`${code}/${f}: folder name off pattern`)
      else if (m[2].toLowerCase() !== code.toLowerCase()) problems.push(`${code}/${f}: folder language ${m[2]} under ${code}`)
      const files = fs.readdirSync(fd).filter((x) => IMG.test(x)).sort()
      if (ads !== null && files.length !== ads) problems.push(`${code}/${f}: ${files.length} files, ${ads} requested`)
      if (m && Number(m[4]) !== files.length) problems.push(`${code}/${f}: name says ${m[4]} Ads, holds ${files.length}`)
      for (const x of files) {
        total++
        const fm = FILE_RE.exec(x)
        if (!fm) problems.push(`${code}/${f}/${x}: file name off pattern`)
        else if (fm[1].toLowerCase() !== code.toLowerCase()) problems.push(`${code}/${f}/${x}: name language ${fm[1]} under ${code}`)
        const h = sha(path.join(fd, x))
        if (seen.has(h)) problems.push(`${code}/${f}/${x}: same bytes as ${seen.get(h)} (never duplicate a file to fill a count)`)
        else seen.set(h, `${code}/${f}/${x}`)
        if (W && H) {
          const r = spawnSync('identify', ['-format', '%w %h', path.join(fd, x)], { encoding: 'utf8' })
          if (r.status !== 0) problems.push(`${code}/${f}/${x}: does not decode`)
          else if (r.stdout.trim() !== `${W} ${H}`) (advisory ? findings : problems).push(`${code}/${f}/${x}: ${r.stdout.trim()}, ${W} ${H} declared`)
        }
      }
      report.push({ code, folder: f, files: files.length })
    }
  }
  out({ cycle: cyc, folders: report, total, problems, findings })
  process.exit(problems.length ? 1 : 0)
}

async function capture () {
  const url = args[1]; const file = need('out')
  if (!/^https?:\/\//.test(url || '')) die('capture needs a http(s) URL', 2)
  let chromium = null
  for (const n of ['playwright', 'playwright-core']) { try { chromium = (await import(n)).chromium; break } catch {} }
  if (!chromium) die('no Playwright on this machine', 3)
  let exe = process.env.SL8_CHROME_PATH
  if (!exe) { try { exe = fs.readFileSync('/etc/sl8/chrome-path', 'utf8').trim() } catch {} }
  let browser
  try { browser = await chromium.launch({ headless: true, ...(exe && fs.existsSync(exe) ? { executablePath: exe } : {}) }) } catch (e) { die(`no headless browser could start (${e.message.split('\n')[0]})`, 3) }
  const ctx = await browser.newContext({ viewport: { width: Number(opt('width', 1280)), height: Number(opt('height', 2400)) } })
  try {
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(Number(opt('wait', 4000)))
    await page.screenshot({ path: file, fullPage: false })
    out({ url, out: file, title: await page.title() })
  } catch (e) { die(`capture failed: ${e.message.split('\n')[0]} (use the customer's competitor statics)`) } finally { await ctx.close(); await browser.close() }
}

const { c, origin } = ['where', 'reserve', 'folder', 'name', 'inherit', 'map'].includes(cmd) ? conventions() : { c: null, origin: null }
if (cmd === 'where') out({ defaults: DEFAULTS, origin, conventions: c })
else if (cmd === 'history') history()
else if (cmd === 'reserve') {
  const root = need('root'); const n = Number(opt('count', 1)); const max = highest(root, c.sequence.digits)
  out({ root, digits: c.sequence.digits, max, next: Array.from({ length: n }, (_, i) => max + 1 + i), tokens: Array.from({ length: n }, (_, i) => `#${pad(max + 1 + i, c.sequence.digits)}`) })
} else if (cmd === 'folder') console.log(folderName(c, { seq: Number(need('seq')), lang: need('lang'), batch: need('batch'), ads: Number(need('ads')) }))
else if (cmd === 'name') {
  const f = { lang: need('lang'), concept: need('concept'), ratio: need('ratio'), mode: need('mode'), date: opt('date', today()), ext: opt('ext', 'png') }
  const dir = opt('dir'); let v = 1
  if (dir && !fs.existsSync(dir)) die(`--dir ${dir} does not exist: give the full path of the ad-set folder (a bare folder name never finds a taken name)`)
  while (dir && fs.existsSync(path.join(dir, fileName(c, { ...f, version: v })))) v++
  console.log(fileName(c, { ...f, version: v }))
} else if (cmd === 'inherit') console.log(inherit(need('filename'), need('lang')))
else if (cmd === 'map') mapCmd(c)
else if (cmd === 'verify') verify()
else if (cmd === 'capture') await capture()
else die('usage: statics.mjs where|history|reserve|folder|name|inherit|map|verify|capture … (see the header)', 2)
