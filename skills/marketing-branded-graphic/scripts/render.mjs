#!/usr/bin/env node
// render.mjs: the headless-browser half of marketing-branded-graphic (Playwright on chrome-headless-shell).
//
//   probe                                   is a browser usable here? prints {playwright, chrome}; exit 3 if not
//   shot FILE.html|FILE.svg --width W --height H --out OUT.png [--scale 2] [--format png|jpeg]
//        serves the file's folder on 127.0.0.1 (file:// pages cannot load @font-face files), opens it at a
//        W x H viewport (deviceScaleFactor --scale, default 1; never CSS zoom or a bigger viewport), waits
//        for document.fonts.ready and every image, then writes OUT.png, OUT.ground.png (the same frame with
//        the copy made transparent) and OUT.boxes.json: each [data-copy] element's text, box, colour and
//        size, the logo box ([data-logo]), the fonts each copy element really rendered with (CDP), images
//        that failed to load, and any visible text outside [data-copy]. Exit 1 when a font or image failed.
//   raster LOGO.svg --width N --out LOGO.png   an SVG logo to a transparent PNG, shape and proportions kept
//   extract URL --out DIR                   read the official site as rendered: :root custom properties,
//        computed colours by element role, font families, @font-face sources and logo candidates
//        (DIR/candidates.json, DIR/page.html). It proposes; the agent assigns roles and keeps the sources.
// Browser: $SL8_CHROME_PATH, else /etc/sl8/chrome-path, else Playwright's own.
// Every shot records overflow (content larger than its element), the PNG's sha256 and the fonts each copy element
// rendered with; a shot whose font check could not run fails instead of passing silently.
// Exit 0 ok, 1 failed (reason printed), 2 usage, 3 no browser on this machine.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import os from 'node:os'

const args = process.argv.slice(2)
const cmd = args[0]
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const out = (o) => console.log(JSON.stringify(o, null, 1))
const die = (m, code = 1) => { out({ ok: false, error: m }); process.exit(code) }

async function loadPlaywright () {
  for (const name of ['playwright', 'playwright-core']) { try { return (await import(name)).chromium } catch {} }
  const g = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout?.trim()
  if (g) {
    const req = createRequire(path.join(g, 'noop.js'))
    for (const name of ['playwright', 'playwright-core']) { try { return req(name).chromium } catch {} }
  }
  return null
}
function executable () {
  if (process.env.SL8_CHROME_PATH) return process.env.SL8_CHROME_PATH
  try { const p = fs.readFileSync('/etc/sl8/chrome-path', 'utf8').trim(); if (p && fs.existsSync(p)) return p } catch {}
  return undefined
}
async function launch () {
  const chromium = await loadPlaywright()
  if (!chromium) die('Playwright is not on this machine (no runtime installs, HR21): use the Pillow route', 3)
  try { return await chromium.launch({ headless: true, executablePath: executable() }) } catch (e) { die(`no headless browser could start: ${String(e.message).split('\n')[0]}`, 3) }
}

const TYPES = { '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.css': 'text/css' }
function serve (root) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      const fp = path.join(root, rel)
      if (!fp.startsWith(root) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end() }
      res.writeHead(200, { 'content-type': TYPES[path.extname(fp).toLowerCase()] ?? 'application/octet-stream' })
      fs.createReadStream(fp).pipe(res)
    })
    srv.listen(0, '127.0.0.1', () => resolve(srv))
  })
}

// Runs in the page after fonts and images settle.
function observe () {
  const toHex = (v) => {
    const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(v || '')
    return m ? '#' + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('') : null
  }
  const boxes = []
  for (const el of document.querySelectorAll('[data-copy]')) {
    const s = getComputedStyle(el)
    const isSvg = el instanceof SVGElement
    // the ink box (the text's own rectangles), not the element's: a wide block over a photo is not measured wholesale
    let r = el.getBoundingClientRect()
    try { const rg = document.createRange(); rg.selectNodeContents(el); const rs = [...rg.getClientRects()].filter((q) => q.width > 0); if (rs.length) { const x0 = Math.min(...rs.map((q) => q.left)); const y0 = Math.min(...rs.map((q) => q.top)); r = { x: x0, y: y0, width: Math.max(...rs.map((q) => q.right)) - x0, height: Math.max(...rs.map((q) => q.bottom)) - y0 } } } catch {}
    const overflow = !isSvg && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) ? `${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}` : null
    const fam = s.fontFamily.split(',')[0].trim()
    const spec = `${s.fontStyle} ${s.fontWeight} ${parseFloat(s.fontSize)}px ${fam}`
    boxes.push({ role: 'text', id: el.getAttribute('data-copy') || null, text: (isSvg ? el.textContent : el.innerText).replace(/\r/g, ''), box: [r.x, r.y, r.width, r.height].map(Math.round), color: toHex(isSvg ? s.fill : s.color), px_size: parseFloat(s.fontSize), bold: Number(s.fontWeight) >= 600, font_family: s.fontFamily, font_check: document.fonts.check(spec, el.textContent || 'x'), overflow })
  }
  const lg = document.querySelector('[data-logo]')
  if (lg) {
    const r = lg.getBoundingClientRect()
    const src = lg.getAttribute('src') || lg.getAttribute('href') || lg.getAttribute('xlink:href')
    boxes.push({ role: 'logo', file: src, box: [r.x, r.y, r.width, r.height].map(Math.round), source_size: lg.naturalWidth ? [lg.naturalWidth, lg.naturalHeight] : null, scale: lg.naturalWidth ? +(r.width / lg.naturalWidth).toFixed(3) : null, clearspace_ratio: Number(lg.getAttribute('data-clearspace-ratio')) || null, min_width_px: Number(lg.getAttribute('data-min-width-px')) || null })
  }
  const badImages = [...document.images].filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute('src'))
  // visible text that is not inside a [data-copy] element (copy must come only from copy.txt)
  const stray = []
  const walk = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.textContent.trim(); if (!t) continue
    const p = n.parentElement; if (!p || p.closest('style,script,title,defs,[data-copy]')) continue
    const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden') continue
    stray.push(t)
  }
  const parseError = document.querySelector('parsererror') ? document.querySelector('parsererror').textContent.slice(0, 300) : null
  return { boxes, badImages, stray, parseError, fontsStatus: document.fonts.status, loadedFaces: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`), failedFaces: [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family) }
}

async function shot () {
  const file = args[1]; const W = Number(opt('width')); const H = Number(opt('height')); const dest = opt('out')
  const scale = Number(opt('scale', 1)); const fmt = (opt('format', 'png')).toLowerCase()
  if (!file || !W || !H || !dest) die('shot FILE --width W --height H --out OUT.png [--scale 2]', 2)
  if (!fs.existsSync(file)) die(`missing ${file}`, 1)
  const root = path.dirname(path.resolve(file))
  const srv = await serve(root)
  const b = await launch()
  try {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale })
    const page = await ctx.newPage()
    const failed = []
    page.on('requestfailed', (r) => failed.push(r.url()))
    page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })
    page.setDefaultTimeout(60000)
    await page.goto(`http://127.0.0.1:${srv.address().port}/${encodeURIComponent(path.basename(file))}`, { waitUntil: 'load' })
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((res) => { i.onload = i.onerror = res })))
    })
    const obs = await page.evaluate(observe)
    // which fonts each copy element really used (Chrome DevTools Protocol)
    try {
      const cdp = await ctx.newCDPSession(page)
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
      const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true })
      const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector: '[data-copy]' })
      const used = []
      for (const id of nodeIds) {
        let fonts = []
        try {
          const kids = (await cdp.send('DOM.describeNode', { nodeId: id, depth: 3 })).node
          const ids = [id]
          const visit = (n) => { for (const c of n.children ?? []) { if (c.nodeId) ids.push(c.nodeId); visit(c) } }
          visit(kids)
          for (const nid of ids) { try { fonts.push(...(await cdp.send('CSS.getPlatformFontsForNode', { nodeId: nid })).fonts) } catch {} }
        } catch {}
        fonts = [...new Map(fonts.map((f) => [f.postScriptName || f.familyName, f])).values()]
        used.push(fonts.map((f) => ({ family: f.familyName, postscript: f.postScriptName, custom: f.isCustomFont, glyphs: f.glyphCount })))
      }
      obs.boxes.filter((x) => x.role === 'text').forEach((x, i) => { x.rendered_fonts = used[i] ?? [] })
    } catch (e) { obs.cdp_error = String(e.message).split('\n')[0] }
    // logo source size when the logo is an SVG <image> or an SVG file
    for (const lb of obs.boxes.filter((x) => x.role === 'logo' && !x.source_size && x.file)) {
      const fp = path.join(root, lb.file)
      if (fs.existsSync(fp) && fp.endsWith('.svg')) {
        const t = fs.readFileSync(fp, 'utf8'); const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(t)
        const w = /<svg[^>]*\swidth="([\d.]+)/.exec(t); const h = /<svg[^>]*\sheight="([\d.]+)/.exec(t)
        lb.source_size = vb ? [Number(vb[1]), Number(vb[2])] : (w && h ? [Number(w[1]), Number(h[1])] : null)
      }
    }
    fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true })
    const stem = dest.replace(/\.[a-z0-9]+$/i, '')
    await page.screenshot({ path: dest, type: fmt === 'jpg' ? 'jpeg' : fmt, fullPage: false })
    // hide the copy for the ground frame (works in an HTML page and in a bare SVG document, which has no <head>)
    await page.evaluate((css) => {
      const root = document.documentElement
      const st = document.createElementNS(root.namespaceURI || 'http://www.w3.org/1999/xhtml', 'style')
      st.textContent = css
      root.appendChild(st)
    }, '[data-copy],[data-copy] *{color:transparent!important;fill:transparent!important;stroke:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}')
    await page.screenshot({ path: `${stem}.ground.png`, type: 'png', fullPage: false })
    // the face that rendered must be the first family the composition asks for, not a fallback
    const first = (fam) => fam.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase()
    // (a loaded @font-face file reports custom: true under the font's own internal name)
    const fontFails = obs.boxes.filter((x) => x.role === 'text' && x.rendered_fonts?.length && !x.rendered_fonts.every((f) => f.custom || (f.family || '').toLowerCase() === first(x.font_family)))
    const sha = crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')
    const meta = { png_sha256: sha, canvas: [W, H], scale, format: fmt, renderer: 'chromium', boxes: obs.boxes, stray_text: obs.stray, fonts_status: obs.fontsStatus, loaded_faces: obs.loadedFaces, failed_faces: obs.failedFaces, failed_requests: failed, bad_images: obs.badImages, cdp_error: obs.cdp_error }
    fs.writeFileSync(`${stem}.boxes.json`, JSON.stringify(meta, null, 1))
    const fails = []
    if (obs.parseError) fails.push(`the composition does not parse: ${obs.parseError}`)
    if (obs.badImages.length) fails.push(`images not loaded: ${obs.badImages.join(', ')}`)
    if (obs.failedFaces.length) fails.push(`font faces failed: ${obs.failedFaces.join(', ')}`)
    if (failed.length) fails.push(`requests failed: ${failed.join(', ')}`)
    if (obs.cdp_error) fails.push(`fonts_unverified: the rendered-font check could not run (${obs.cdp_error})`)
    for (const x of obs.boxes.filter((b) => b.role === 'text' && !obs.cdp_error && !(b.rendered_fonts?.length))) fails.push(`fonts_unverified: text ${x.id} reported no rendered font`)
    for (const x of obs.boxes.filter((b) => b.overflow)) fails.push(`text ${x.id} overflows its element (${x.overflow}): enlarge the box or lower the size`)
    for (const x of fontFails) fails.push(`text ${x.id}: rendered in ${(x.rendered_fonts ?? []).map((f) => `${f.family}${f.custom ? '' : ' (system)'}`).join(', ')}, not only the requested ${x.font_family.split(',')[0]}`)
    out({ ok: !fails.length, out: dest, size: [W * scale, H * scale], boxes: obs.boxes.length, stray_text: obs.stray, fails })
    process.exitCode = fails.length ? 1 : 0
  } finally { await b.close(); srv.close() }
}

async function raster () {
  const file = args[1]; const W = Number(opt('width')); const dest = opt('out')
  if (!file || !W || !dest || !file.endsWith('.svg')) die('raster LOGO.svg --width N --out LOGO.png', 2)
  const t = fs.readFileSync(file, 'utf8')
  const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(t)
  const ww = /<svg[^>]*\swidth="([\d.]+)/.exec(t); const hh = /<svg[^>]*\sheight="([\d.]+)/.exec(t)
  const [sw, sh] = vb ? [Number(vb[1]), Number(vb[2])] : (ww && hh ? [Number(ww[1]), Number(hh[1])] : [0, 0])
  if (!sw || !sh) die('the SVG states no viewBox or width/height: its proportions are unknown')
  const H = Math.round(W * sh / sw)
  const root = path.dirname(path.resolve(file))
  const html = path.join(root, `.raster-${process.pid}.html`)
  const cleanup = () => { try { fs.rmSync(html, { force: true }) } catch {} }
  process.on('exit', cleanup)
  fs.writeFileSync(html, `<!doctype html><html><head><style>html,body{margin:0;background:transparent;overflow:hidden}img{display:block;width:${W}px;height:${H}px}</style></head><body><img src="${encodeURIComponent(path.basename(file))}"></body></html>`)
  const srv = await serve(root); const b = await launch()
  try {
    const page = await (await b.newContext({ viewport: { width: W, height: H } })).newPage()
    await page.goto(`http://127.0.0.1:${srv.address().port}/${path.basename(html)}`, { waitUntil: 'load' })
    const ok = await page.evaluate(() => { const i = document.images[0]; return i.complete && i.naturalWidth > 0 })
    if (!ok) { process.exitCode = 1; out({ ok: false, error: 'the SVG did not load in the browser' }); return }
    await page.screenshot({ path: dest, omitBackground: true })
    out({ ok: true, out: dest, size: [W, H], source_ratio: +(sw / sh).toFixed(4) })
  } finally { await b.close(); srv.close(); cleanup() }
}

async function extract () {
  const url = args[1]; const dir = opt('out')
  if (!url || !dir) die('extract URL --out DIR', 2)
  fs.mkdirSync(dir, { recursive: true })
  const b = await launch()
  try {
    const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }) } catch (e) { await b.close(); die(`the page did not load: ${String(e.message).split('\n')[0]} (an unreachable site is a missing asset)`) }
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2500) // a bounded settle; networkidle never arrives on sites with analytics or chat widgets
    const found = await page.evaluate(() => {
      const toHex = (v) => { const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(v || ''); if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return null; return '#' + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('') }
      const vars = {}; const skipped = []
      for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules } catch { if (sh.href) skipped.push(sh.href); continue } for (const r of rules) if (r.selectorText === ':root') for (const p of r.style) if (p.startsWith('--')) vars[p] = r.style.getPropertyValue(p).trim() }
      const roles = { body: 'body', heading: 'h1,h2,h3', link: 'a', button: 'button,[role=button]', header: 'header,nav', footer: 'footer' }
      const colors = {}
      for (const [role, sel] of Object.entries(roles)) for (const el of [...document.querySelectorAll(sel)].slice(0, 40)) {
        const s = getComputedStyle(el)
        for (const [k, v] of [['text', s.color], ['background', s.backgroundColor]]) { const h = toHex(v); if (h) { const c = (colors[h] ||= { hex: h, uses: {} }); c.uses[`${role} ${k}`] = (c.uses[`${role} ${k}`] || 0) + 1 } }
      }
      const fonts = {}
      for (const [role, sel] of Object.entries(roles)) { const el = document.querySelector(sel); if (el) fonts[role] = getComputedStyle(el).fontFamily }
      const faces = []
      for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules } catch { continue } for (const r of rules) if (r instanceof CSSFontFaceRule) faces.push({ family: r.style.getPropertyValue('font-family'), weight: r.style.getPropertyValue('font-weight'), src: r.style.getPropertyValue('src'), sheet: sh.href }) }
      const logos = []
      for (const el of document.querySelectorAll('img, svg, a[href="/"] img, [class*=logo], [id*=logo]')) {
        const a = (el.getAttribute('alt') || '') + ' ' + (el.getAttribute('class') || '') + ' ' + (el.getAttribute('id') || '') + ' ' + (el.getAttribute('src') || '')
        if (!/logo|brand|wordmark/i.test(a) && !el.closest('header,nav')) continue
        const r = el.getBoundingClientRect(); if (!r.width) continue
        logos.push({ tag: el.tagName.toLowerCase(), src: el.currentSrc || el.getAttribute('src') || null, inline_svg: el.tagName.toLowerCase() === 'svg' ? el.outerHTML : null, box: [r.x, r.y, r.width, r.height].map(Math.round), hint: a.trim().slice(0, 120) })
      }
      return { skipped_sheets: skipped, vars, colors: Object.values(colors).sort((x, y) => Object.values(y.uses).reduce((a, b) => a + b, 0) - Object.values(x.uses).reduce((a, b) => a + b, 0)).slice(0, 24), fonts, faces, logos: logos.slice(0, 12) }
    })
    // cross-origin stylesheets cannot be read through the CSSOM: fetch each one's text and parse :root and @font-face from it
    const extra = { vars: {}, faces: [], unreadable: [] }
    for (const href of found.skipped_sheets) {
      try {
        const text = await (await page.request.get(href, { timeout: 20000 })).text()
        for (const m of text.matchAll(/:root\s*\{([^}]*)\}/g)) for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) extra.vars[d[1]] = d[2].trim()
        for (const m of text.matchAll(/@font-face\s*\{([^}]*)\}/g)) { const g = (p) => (new RegExp(p + '\\s*:\\s*([^;]+)').exec(m[1]) || [])[1]?.trim(); extra.faces.push({ family: g('font-family'), weight: g('font-weight'), src: g('src'), sheet: href }) }
      } catch { extra.unreadable.push(href) }
    }
    found.vars = { ...found.vars, ...extra.vars }; found.faces = [...found.faces, ...extra.faces]; found.unreadable_sheets = extra.unreadable
    // inline SVG logos are written whole, so each one parses on its own
    fs.mkdirSync(path.join(dir, 'candidates'), { recursive: true })
    found.logos.forEach((l, i) => { if (l.inline_svg) { const f = path.join(dir, 'candidates', `logo-${i + 1}.svg`); fs.writeFileSync(f, l.inline_svg.includes('xmlns=') ? l.inline_svg : l.inline_svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')); l.svg_file = f; l.inline_svg = null } })
    fs.writeFileSync(path.join(dir, 'page.html'), await page.content())
    fs.writeFileSync(path.join(dir, 'candidates.json'), JSON.stringify({ url, read_at: new Date().toISOString(), ...found }, null, 1))
    out({ ok: true, out: path.join(dir, 'candidates.json'), vars: Object.keys(found.vars).length, colors: found.colors.length, faces: found.faces.length, logos: found.logos.length, skipped_sheets: found.skipped_sheets.length, unreadable_sheets: found.unreadable_sheets.length, svg_logo_files: found.logos.filter((l) => l.svg_file).length })
  } finally { await b.close() }
}

if (cmd === 'probe') {
  const chromium = await loadPlaywright()
  if (!chromium) { out({ ok: false, playwright: false }); process.exit(3) }
  try { const b = await chromium.launch({ headless: true, executablePath: executable() }); const v = b.version(); await b.close(); out({ ok: true, playwright: true, chrome: v, executable: executable() ?? 'playwright default' }) } catch (e) { out({ ok: false, playwright: true, chrome: null, error: String(e.message).split('\n')[0] }); process.exit(3) }
} else if (cmd === 'shot') await shot()
else if (cmd === 'raster') await raster()
else if (cmd === 'extract') await extract()
else die('usage: render.mjs probe | shot | raster | extract', 2)
