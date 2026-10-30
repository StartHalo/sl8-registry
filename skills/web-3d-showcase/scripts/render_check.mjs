#!/usr/bin/env node
// web-3d-showcase checks (SL8-authored; the source method ships no check script).
//
//   node render_check.mjs brief  --in work/<p>/brief.json [--write]
//       validate the intake record; print the defaults it applied (--write stores them)
//   node render_check.mjs size   --dir <folder> --max-mb <n> [--total-mb <n>]
//       list every asset with its size; fail on any asset over the per-file limit or the total
//   node render_check.mjs render --root <folder> --page <path?query> --out <dir>
//                                [--views 0,90,180,270] [--mobile] [--target-height <n>]  (target height and per-character model are read from <root>/showcase.json when present) [--allow-network] [--chrome <path>] [--timeout <ms>]
//       serve <folder> on 127.0.0.1 (never file://), open the page in headless Chromium with WebGL,
//       wait for window.__viewer or window.__showcase (references/app-contract.md), screenshot each
//       view or character, and fail on a blank frame, a console or page error, a failed request, or
//       (offline, the default) any request that leaves 127.0.0.1
//
// Exit 0 pass, 1 check failed, 2 tool missing (playwright, Chromium or WebGL) or bad usage.
// It prints figures; the agent still looks at every screenshot (HR14).
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const args = process.argv.slice(2)
const cmd = args[0]
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d }
const flag = (n) => args.includes(`--${n}`)
const die = (code, msg) => { console.error(msg); process.exit(code) }

const FORMATS = ['static-html', 'react', 'asset-pack', 'glb-set']
const BACKGROUNDS = ['video', 'still', 'none']
const COMPANIONS = ['still', '3d', 'none']
const MODEL_FORMATS = ['glb', 'obj', 'ply']

function brief () {
  const file = opt('in')
  if (!file || !fs.existsSync(file)) die(2, 'brief needs --in <brief.json>')
  const b = JSON.parse(fs.readFileSync(file, 'utf8'))
  const problems = []
  const defaults = []
  const def = (k, v, why) => { if (b[k] === undefined || b[k] === null || b[k] === '') { b[k] = v; defaults.push(`${k}=${JSON.stringify(v)} (${why})`) } }
  if (!b.project || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.project)) problems.push('project: kebab-case name required')
  if (!b.theme) problems.push('theme: required')
  if (!Array.isArray(b.characters) || !b.characters.length) problems.push('characters: at least one entry required')
  for (const [i, c] of (b.characters ?? []).entries()) {
    if (!c.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) problems.push(`characters[${i}].id: kebab-case required`)
    for (const k of ['archetype', 'palette', 'biome']) if (!c[k] || (Array.isArray(c[k]) && !c[k].length)) problems.push(`characters[${i}].${k}: required`)
  }
  const ids = (b.characters ?? []).map((c) => c.id)
  if (new Set(ids).size !== ids.length) problems.push('characters: ids must be unique')
  def('output_format', 'static-html', 'stated default')
  def('model_format', 'glb', 'stated default')
  def('background', b.output_format === 'glb-set' || b.output_format === 'asset-pack' ? 'none' : 'video', 'stated default')
  def('companions', 'still', 'stated default: a still unless the experience needs a 3D companion')
  def('rigging', false, 'stated default')
  def('network', 'offline', 'stated default: three vendored, no CDN')
  def('max_asset_mb', 5, 'SL8 stated default; the source gives no number (learnings WEB-L304)')
  def('target_height', 1.8, 'SL8 stated default: scene units, every model is scaled to it')
  def('texture_px', 1024, 'SL8 stated default, bounded by max_asset_mb')
  if (!FORMATS.includes(b.output_format)) problems.push(`output_format: one of ${FORMATS.join(', ')}`)
  if (!BACKGROUNDS.includes(b.background)) problems.push(`background: one of ${BACKGROUNDS.join(', ')}`)
  if (!COMPANIONS.includes(b.companions)) problems.push(`companions: one of ${COMPANIONS.join(', ')}`)
  if (!MODEL_FORMATS.includes(b.model_format)) problems.push(`model_format: one of ${MODEL_FORMATS.join(', ')}`)
  if (typeof b.rigging !== 'boolean') problems.push('rigging: true or false')
  if (!(Number(b.target_height) > 0)) problems.push('target_height: a positive number')
  if (!(Number(b.max_asset_mb) > 0)) problems.push('max_asset_mb: a positive number')
  if (!(Number.isInteger(b.texture_px) && b.texture_px >= 256 && b.texture_px <= 4096)) problems.push('texture_px: integer 256..4096')
  for (const [i, c] of (b.characters ?? []).entries()) for (const [j, col] of (Array.isArray(c.palette) ? c.palette : []).entries()) if (!/^#[0-9a-fA-F]{6}$/.test(col)) problems.push(`characters[${i}].palette[${j}]: #rrggbb required`)
  if (b.max_total_mb !== undefined && b.max_total_mb !== null && !(Number(b.max_total_mb) > 0)) problems.push('max_total_mb: a positive number')
  for (const [i, h] of (b.approved_stills ?? []).entries()) if (!/^[0-9a-f]{64}$/i.test(String(h))) problems.push(`approved_stills[${i}]: a 64-hex sha256`)
  if (b.budget_credits !== undefined && b.budget_credits !== null && (typeof b.budget_credits !== 'number' || !(b.budget_credits >= 0))) problems.push('budget_credits: a number of credits, or null')
  if (b.output_format === 'react') console.log('note output_format react: the React app route is not offered on this machine yet; deliver the static app with mountShowcase (SKILL.md step 7)')
  b.defaults_used = [...new Set([...(b.defaults_used ?? []), ...defaults])]
  for (const d of defaults) console.log(`default ${d}`)
  console.log(`characters ${ids.length}: ${ids.join(', ')}; format ${b.output_format}; background ${b.background}; companions ${b.companions}; rigging ${b.rigging}; max_asset_mb ${b.max_asset_mb}`)
  for (const p of problems) console.log(`FAIL ${p}`)
  if (!problems.length && flag('write')) fs.writeFileSync(file, JSON.stringify(b, null, 2) + '\n')
  console.log(`brief: ${problems.length} problem(s)${flag('write') && !problems.length ? '; written' : ''}`)
  process.exit(problems.length ? 1 : 0)
}

const ASSET = /\.(glb|gltf|bin|obj|ply|png|jpe?g|webp|avif|ktx2|mp4|webm|mov)$/i
function walk (d, out = []) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p, out) : out.push(p) } return out }

function size () {
  const dir = opt('dir'); const max = Number(opt('max-mb')); const total = opt('total-mb') ? Number(opt('total-mb')) : null
  if (!dir || !fs.existsSync(dir) || !(max > 0)) die(2, 'size needs --dir <folder> --max-mb <n>')
  let sum = 0; const over = []
  for (const f of walk(dir).filter((f) => ASSET.test(f)).sort()) {
    const mb = fs.statSync(f).size / 1048576; sum += mb
    const bad = mb > max
    if (bad) over.push(f)
    console.log(`${bad ? 'OVER' : 'ok  '} ${mb.toFixed(2).padStart(8)} MB  ${path.relative(dir, f)}`)
  }
  console.log(`total ${sum.toFixed(2)} MB${total ? ` (limit ${total})` : ''}; per-file limit ${max} MB`)
  const fail = over.length + (total && sum > total ? 1 : 0)
  for (const f of over) console.log(`FAIL ${path.relative(dir, f)} is over ${max} MB`)
  if (total && sum > total) console.log(`FAIL total ${sum.toFixed(2)} MB is over ${total} MB`)
  console.log(`size: ${fail} problem(s)`)
  process.exit(fail ? 1 : 0)
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ktx2': 'image/ktx2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.obj': 'text/plain', '.ply': 'application/octet-stream' }

function serve (root) {
  const base = path.resolve(root)
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let fp = path.resolve(base, '.' + rel)
    if (fp !== base && !fp.startsWith(base + path.sep)) { res.writeHead(403).end(); return }
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html')
    if (!fs.existsSync(fp)) { res.writeHead(404).end(); return }
    const buf = fs.readFileSync(fp)
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range)
    const type = MIME[path.extname(fp).toLowerCase()] ?? 'application/octet-stream'
    if (range) {
      const s = range[1] ? Number(range[1]) : 0; const e = range[2] ? Number(range[2]) : buf.length - 1
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${s}-${e}/${buf.length}`, 'accept-ranges': 'bytes', 'content-length': e - s + 1 })
      res.end(buf.subarray(s, e + 1)); return
    }
    res.writeHead(200, { 'content-type': type, 'content-length': buf.length, 'accept-ranges': 'bytes' }).end(buf)
  })
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)))
}

async function loadPlaywright () {
  for (const name of ['playwright', 'playwright-core']) { try { return (await import(name)).default ?? (await import(name)) } catch {} }
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim()
    const req = createRequire(path.join(root, 'noop.js'))
    for (const name of ['playwright', 'playwright-core']) { try { return req(name) } catch {} }
  } catch {}
  return null
}

function chromePath () {
  if (opt('chrome')) return opt('chrome')
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  for (const b of ['chrome-headless-shell', 'chromium', 'google-chrome']) { try { const p = execSync(`command -v ${b}`, { encoding: 'utf8', shell: '/bin/bash' }).trim(); if (p) return p } catch {} }
  return undefined
}

// Blank test on a screenshot, computed inside the page from a data URL (no image library needed):
// quantise a 96x96 copy to 4 bits a channel; `varied` is the share of pixels unlike the modal colour.
const STATS = `async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
  const c = document.createElement('canvas'); c.width = 96; c.height = 96
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, 96, 96)
  const d = g.getImageData(0, 0, 96, 96).data; const h = new Map()
  for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4); h.set(k, (h.get(k) || 0) + 1) }
  const mode = Math.max(...h.values()); return { varied: 1 - mode / (96 * 96), colours: h.size }
}`

async function render () {
  const root = opt('root'); const page = opt('page', 'index.html'); const out = opt('out')
  const timeout = Number(opt('timeout', 120000)); const allowNet = flag('allow-network')
  if (!root || !out || !fs.existsSync(root)) die(2, 'render needs --root <folder> --page <path> --out <dir>')
  fs.mkdirSync(out, { recursive: true })
  const pw = await loadPlaywright()
  if (!pw) die(2, 'playwright is not installed on this machine (HR21: report it, do not install it)')
  const srv = await serve(root)
  const origin = `http://127.0.0.1:${srv.address().port}`
  let browser
  try {
    browser = await pw.chromium.launch({ headless: true, executablePath: chromePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] })
  } catch (e) { srv.close(); die(2, `Chromium did not start: ${e.message.split('\n')[0]}`) }
  const report = { page, origin_root: root, network: allowNet ? 'allowed' : 'offline', webgl: null, shots: [], errors: [], failed_requests: [], blocked_requests: [] }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const pg = await ctx.newPage()
  await pg.route('**/*', (route) => {
    const u = route.request().url()
    if (allowNet || u.startsWith(origin) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue()
    report.blocked_requests.push(u); return route.abort()
  })
  pg.on('console', (m) => { if (m.type() === 'error') report.errors.push(`console: ${m.text()}`) })
  pg.on('pageerror', (e) => report.errors.push(`page: ${e.message}`))
  report.notes = []
  pg.on('requestfailed', (r) => {
    if (report.blocked_requests.includes(r.url())) return
    const err = r.failure()?.errorText ?? ''
    // Chromium aborts and re-issues range requests on a looping <video>; a note for media, a failure otherwise
    if (r.resourceType() === 'media' && /ERR_ABORTED/.test(err)) { report.notes.push(`media range request aborted (normal): ${r.url()}`); return }
    report.failed_requests.push(`${r.url()} ${err}`)
  })
  pg.on('response', (r) => { if (r.status() >= 400) report.failed_requests.push(`${r.url()} HTTP ${r.status()}`) })
  const shoot = async (name) => {
    const buf = await pg.screenshot({ type: 'png' })
    const file = path.join(out, `${name}.png`); fs.writeFileSync(file, buf)
    const s = await pg.evaluate(`(${STATS})(${JSON.stringify(buf.toString('base64'))})`)
    const row = { name, file, varied: Number(s.varied.toFixed(4)), colours: s.colours, blank: s.varied < 0.02 }
    report.shots.push(row); return row
  }
  let code = 0
  try {
    const resp = await pg.goto(`${origin}/${page.replace(/^\//, '')}`, { waitUntil: 'load', timeout })
    if (!resp || resp.status() >= 400) throw new Error(`page ${page} answered HTTP ${resp ? resp.status() : 'none'}`)
    report.webgl = await pg.evaluate(() => { const c = document.createElement('canvas'); return c.getContext('webgl2') ? 'webgl2' : (c.getContext('webgl') ? 'webgl' : null) })
    if (!report.webgl) { code = 2; report.errors.push('no WebGL context in headless Chromium: the nonblank line cannot be proven') }
    else {
      await pg.waitForFunction(() => window.__viewer || window.__showcase, null, { timeout })
      const kind = await pg.evaluate(() => (window.__viewer ? 'viewer' : 'showcase'))
      report.kind = kind
      if (kind === 'viewer') {
        report.stats = await pg.evaluate(async () => { await window.__viewer.ready; return window.__viewer.stats })
        for (const yaw of String(opt('views', '0,90,180,270')).split(',').map(Number)) {
          await pg.evaluate(async (y) => window.__viewer.setYaw(y), yaw); await pg.waitForTimeout(300)
          await shoot(`yaw${yaw}`)
        }
      } else {
        await pg.evaluate(async () => window.__showcase.ready)
        const ids = await pg.evaluate(() => window.__showcase.ids)
        let cfg = {}
        try { cfg = JSON.parse(fs.readFileSync(path.join(root, 'showcase.json'), 'utf8')) } catch {}
        const entries = new Map((Array.isArray(cfg) ? cfg : (cfg.characters ?? [])).map((e) => [e.id, e]))
        const showcaseTarget = opt('target-height') ? Number(opt('target-height')) : (Number(cfg.target_height) || null)
        report.characters = []
        for (const id of ids) {
          const info = await pg.evaluate(async (i) => window.__showcase.select(i), id); await pg.waitForTimeout(500)
          const vid = await pg.evaluate(async () => { const v = document.querySelector('video'); if (!v) return null; try { await v.play() } catch {} await new Promise((r) => setTimeout(r, 1000)); return { readyState: v.readyState, currentTime: Number(v.currentTime.toFixed(2)), error: v.error ? v.error.code : null } })
          const targetH = showcaseTarget
          const h = info && Array.isArray(info.bbox) ? info.bbox[1] : null
          report.characters.push({ id, info: info ?? null, video: vid, height: h, target: targetH }); await shoot(`desktop-${id}`)
          if (entries.get(id)?.model) {
            if (!info || info.model !== 'loaded' || !(info.meshes > 0)) report.errors.push(`${id}: has a model but select returned ${JSON.stringify(info)}`)
            else if (targetH && !(h > 0)) report.errors.push(`${id}: select returned no bbox height to compare with target ${targetH}`)
            else if (targetH && Math.abs(h - targetH) / targetH > 0.05) report.errors.push(`${id}: height ${h} is more than 5% off target ${targetH}`)
          }
        }
        if (flag('mobile')) {
          await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(500)
          for (const id of ids) { await pg.evaluate(async (i) => window.__showcase.select(i), id); await pg.waitForTimeout(500); await shoot(`mobile-${id}`) }
          report.mobile_overflow_x = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        }
      }
    }
  } catch (e) { report.errors.push(`check: ${e.message.split('\n')[0]}`) }
  await browser.close(); srv.close()
  for (const s of report.shots) console.log(`${s.blank ? 'BLANK' : 'ok   '} ${s.name}: varied ${s.varied}, colours ${s.colours} -> ${s.file}`)
  if (report.stats) console.log(`stats ${JSON.stringify(report.stats)}`)
  for (const c of report.characters ?? []) {
    console.log(`select ${c.id}: ${JSON.stringify(c.info)}`)
    if (c.video) console.log(c.video.readyState >= 2 && !c.video.error && c.video.currentTime > 0 ? `video ${c.id}: plays (readyState ${c.video.readyState}, currentTime ${c.video.currentTime})` : `UNPROVEN video ${c.id}: background video not decodable here (readyState ${c.video.readyState}, error ${c.video.error}); say so in the handover`)
  }
  for (const n of report.notes) console.log(`note ${n}`)
  if (report.mobile_overflow_x) console.log('FAIL mobile viewport scrolls sideways')
  for (const e of report.errors) console.log(`FAIL ${e}`)
  for (const r of report.failed_requests) console.log(`FAIL request ${r}`)
  for (const r of report.blocked_requests) console.log(`FAIL left 127.0.0.1 while offline: ${r}`)
  const fails = report.shots.filter((s) => s.blank).length + report.errors.length + report.failed_requests.length + report.blocked_requests.length + (report.mobile_overflow_x ? 1 : 0) + (report.shots.length ? 0 : 1)
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`render: ${fails} problem(s); webgl ${report.webgl}; report ${path.join(out, 'report.json')}`)
  process.exit(code || (fails ? 1 : 0))
}

if (cmd === 'brief') brief()
else if (cmd === 'size') size()
else if (cmd === 'render') await render()
else die(2, 'usage: render_check.mjs brief|size|render … (see the header of this file)')
