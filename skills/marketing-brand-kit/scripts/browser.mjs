#!/usr/bin/env node
// browser.mjs: the local headless browser for marketing-brand-kit (Playwright on chrome-headless-shell).
//
//   extract URL --out DIR            read the page as rendered: computed colours and fonts, CSS custom
//                                    properties, @font-face rules, logo and image URLs. Writes DIR/page.html,
//                                    DIR/font-face.css, DIR/css/ (every stylesheet the page loaded, cross-origin ones too),
//                                    DIR/page.png (a look only: colours read off it are guesses) and DIR/candidates.json.
//                                    Colours in any CSS colour space (oklch, lab, color(), hsl, custom properties holding
//                                    rgb/hsl triples) are converted to sRGB hex and flagged 'converted from <space>'.
//                                    It proposes; it never assigns roles.
//   raster FILE.svg --width N --out FILE.png [--color CSS]   an SVG logo to a transparent PNG, shape and proportions kept (--color sets currentColor)
//   shot FILE.html --width W --height H --out FILE.png   an HTML composition to PNG (fonts from the page)
// Browser: $SL8_CHROME_PATH, else the path in /etc/sl8/chrome-path, else Playwright's own.
// Exit 0 ok, 1 failed, 2 usage, 3 no browser on this machine (fall back to the customer's files).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const cmd = args[0]
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const die = (m, code = 1) => { console.error(`browser.mjs: ${m}`); process.exit(code) }

async function loadPlaywright () {
  for (const name of ['playwright', 'playwright-core']) { try { return (await import(name)).chromium } catch {} }
  const g = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout?.trim()
  if (g) {
    const req = createRequire(path.join(g, 'noop.js'))
    for (const name of ['playwright', 'playwright-core']) { try { return req(name).chromium } catch {} }
  }
  die('Playwright is not on this machine: use the customer\'s files or direct URLs instead (no runtime installs, HR21)', 3)
}
function executable () {
  if (process.env.SL8_CHROME_PATH) return process.env.SL8_CHROME_PATH
  try { const p = fs.readFileSync('/etc/sl8/chrome-path', 'utf8').trim(); if (p && fs.existsSync(p)) return p } catch {}
  return undefined
}
async function browser () {
  const chromium = await loadPlaywright()
  try { return await chromium.launch({ headless: true, executablePath: executable() }) } catch (e) { die(`no headless browser could start (${e.message.split('\n')[0]})`, 3) }
}

// Runs inside the page. Returns raw observations only.
function observe () {
  // Any CSS colour (rgb, hsl, oklch, lab, color(srgb ...), named) -> sRGB hex through a 1x1 canvas.
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const converted = {}
  const toHex = (v) => {
    if (!v || v === 'transparent') return null
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = v; cx.fillRect(0, 0, 1, 1)
    const d = cx.getImageData(0, 0, 1, 1).data
    if (d[3] < 128) return null
    const hex = '#' + [d[0], d[1], d[2]].map((x) => x.toString(16).padStart(2, '0')).join('')
    if (!/^rgba?\(/i.test(v)) converted[hex] = (/^[a-z-]+/i.exec(v.trim()) || ['css'])[0].toLowerCase()
    return hex
  }
  const colors = {}
  const note = (hex, ctx) => { if (!hex) return; const c = (colors[hex] ||= { hex, count: 0, contexts: {} }); c.count++; c.contexts[ctx] = (c.contexts[ctx] || 0) + 1 }
  const els = Array.from(document.querySelectorAll('body, body *')).slice(0, 4000)
  const used = {}
  for (const el of els) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue
    const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') continue
    const tag = el.tagName.toLowerCase()
    const role = /^h[1-3]$/.test(tag) ? 'heading' : tag === 'a' ? 'link' : (tag === 'button' || el.getAttribute('role') === 'button') ? 'button' : el.closest('header,nav') ? 'header' : el.closest('footer') ? 'footer' : tag === 'body' ? 'body' : 'other'
    if (el.textContent.trim() && el.children.length === 0) { note(toHex(s.color), `${role} text`); used[s.fontFamily] = true }
    note(toHex(s.backgroundColor), `${role} background`)
    if (parseFloat(s.borderTopWidth) > 0) note(toHex(s.borderTopColor), `${role} border`)
  }
  const fontOf = (sel) => { const el = document.querySelector(sel); return el ? { selector: sel, family: getComputedStyle(el).fontFamily, weight: getComputedStyle(el).fontWeight, style: getComputedStyle(el).fontStyle } : null }
  const fonts = ['h1', 'h2', 'h3', 'body', 'p', 'a', 'button', 'code, pre, kbd'].map(fontOf).filter(Boolean)
  const vars = {}; const faces = []; const unreadable = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules; try { rules = sheet.cssRules } catch { unreadable.push(sheet.href); continue } // a cross-origin sheet: Node reads it from the network response instead
    const walk = (list) => { for (const r of Array.from(list)) {
      if (r.cssRules && !r.style) walk(r.cssRules)
      if (r.type === 5 /* CSSFontFaceRule */) faces.push({ css: r.cssText, family: r.style.getPropertyValue('font-family'), weight: r.style.getPropertyValue('font-weight'), style: r.style.getPropertyValue('font-style'), unicodeRange: r.style.getPropertyValue('unicode-range'), src: r.style.getPropertyValue('src'), base: sheet.href || location.href })
      else if (r.style && /(^|,)\s*(:root|html|body)\s*($|,)/.test(r.selectorText || '')) for (const p of Array.from(r.style)) if (p.startsWith('--')) vars[p] = r.style.getPropertyValue(p).trim()
    } }
    walk(rules)
  }
  const abs = (u) => { try { return new URL(u, location.href).href } catch { return null } }
  const logos = []
  for (const img of Array.from(document.querySelectorAll('img, svg, [style*="background-image"]'))) {
    const hay = [img.getAttribute('alt'), img.getAttribute('class'), img.id, img.getAttribute('src'), img.getAttribute('aria-label'), img.closest('a[href="/"], a[href="./"], [class*="logo" i], [id*="logo" i]') ? 'logo-context' : ''].join(' ')
    if (!/logo|brand|wordmark|logo-context/i.test(hay)) continue
    if (img.tagName.toLowerCase() === 'svg') { const markup = img.outerHTML; logos.push({ type: 'inline-svg', why: hay.trim().slice(0, 80), svg: markup.length > 2000000 ? null : markup, truncated: markup.length > 2000000, length: markup.length, current_color: /currentColor/i.test(markup) }) }
    else if (img.tagName.toLowerCase() === 'img') logos.push({ type: 'img', url: abs(img.currentSrc || img.src), why: hay.trim().slice(0, 80), w: img.naturalWidth, h: img.naturalHeight })
  }
  for (const l of Array.from(document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]'))) logos.push({ type: 'icon', url: abs(l.href), why: l.rel })
  // A press page's downloadable logo pack: links to .svg/.zip/.png/.eps whose text, path or class says logo, brand, press or media.
  for (const a of Array.from(document.querySelectorAll('a[href]'))) {
    const href = abs(a.getAttribute('href')); if (!href || !/\.(svg|zip|png|eps|ai)(\?|#|$)/i.test(href)) continue
    if (/logo|brand|press|media|asset/i.test(`${a.textContent} ${href} ${a.className}`)) logos.push({ type: 'download-link', url: href, why: (a.textContent || '').trim().slice(0, 80) })
  }
  const images = []
  const og = document.querySelector('meta[property="og:image"]'); if (og) images.push({ url: abs(og.content), why: 'og:image' })
  for (const img of Array.from(document.images).filter((i) => i.naturalWidth * i.naturalHeight > 200000).sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight).slice(0, 12)) images.push({ url: abs(img.currentSrc || img.src), w: img.naturalWidth, h: img.naturalHeight, why: 'large image' })
  return { url: location.href, title: document.title, colors: Object.values(colors), converted, fonts, vars, faces, unreadable, logos, images, used_families: Object.keys(used) }
}

// Runs inside the page: resolve custom properties to colours. Values may be hex, rgb(), hsl(), oklch(), a bare triple (37 99 235, or the shadcn 220 90% 56%), or a var() chain.
function resolveVars (names) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const probe = document.createElement('i'); document.body.appendChild(probe)
  const root = getComputedStyle(document.documentElement)
  const out = {}
  for (const n of names) {
    const raw = root.getPropertyValue(n).trim(); if (!raw || raw.length > 120) continue
    if (/^(inherit|initial|unset|revert|currentcolor|transparent|none)$/i.test(raw)) continue
    const cands = /^[\d.]+\s+[\d.]+\s+[\d.]+(\s*\/\s*[\d.%]+)?$/.test(raw) ? [`rgb(${raw})`] : /^[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%(\s*\/\s*[\d.%]+)?$/.test(raw) ? [`hsl(${raw})`] : [raw]
    for (const c of cands) {
      probe.style.color = ''; probe.style.color = c
      if (!probe.style.color) continue
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = getComputedStyle(probe).color; cx.fillRect(0, 0, 1, 1)
      const d = cx.getImageData(0, 0, 1, 1).data; if (d[3] < 128) continue
      out[n] = { raw, hex: '#' + [d[0], d[1], d[2]].map((x) => x.toString(16).padStart(2, '0')).join(''), converted_from: c === raw ? (/^#/.test(raw) || /^rgb/i.test(raw) ? null : (/^[a-z-]+/i.exec(raw) || ['css'])[0].toLowerCase()) : (c.split('(')[0] + ' triple') }
      break
    }
  }
  probe.remove()
  return out
}

const DEFAULT_LINK = ['#0000ee', '#551a8b', '#ee0000']
const STATUS = /(danger|error|success|warning|warn|alert|info|destructive|invalid|valid|positive|negative|critical)/i
const ICON = /(icon|awesome|material symbols|material icons|glyph|dashicons|feather|ionicons|remixicon|bootstrap-icons)/i
const MONO = /(monospace|mono\b|courier|consolas|menlo|code\b)/i

// A @font-face block or a custom-property list parsed from raw CSS text (stylesheets from other hosts cannot be read through cssRules).
function facesFromCss (text, base) {
  const faces = []
  for (const m of text.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const body = m[1]; const get = (p) => { const x = new RegExp(`(?:^|[;\\s])${p}\\s*:\\s*([^;]+)`, 'i').exec(body); return x ? x[1].trim() : '' }
    faces.push({ css: m[0], family: get('font-family'), weight: get('font-weight'), style: get('font-style'), unicodeRange: get('unicode-range'), src: get('src'), base })
  }
  return faces
}
const NETWORK_SETTLE_MS = 8000

async function extract () {
  const url = args[1]; const dir = opt('out')
  if (!url || !dir) die('extract URL --out DIR', 2)
  fs.mkdirSync(path.join(dir, 'css'), { recursive: true })
  const b = await browser()
  try {
    const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
    const sheets = [] // every text/css response, cross-origin ones included
    const pending = []
    page.on('response', (r) => {
      const ct = r.headers()['content-type'] || ''
      if (/text\/css/i.test(ct) || /\.css(\?|$)/i.test(r.url())) pending.push(r.text().then((text) => sheets.push({ url: r.url(), text })).catch(() => {}))
    })
    // 'load', not 'networkidle': marketing sites keep beacons, chat widgets and video open and never go idle.
    let res = await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(() => null)
    if (!res) res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => die(`could not load ${url}: ${e.message.split('\n')[0]}`))
    if (res && res.status() >= 400) die(`${url} answered ${res.status()}`)
    const idle = await page.waitForLoadState('networkidle', { timeout: NETWORK_SETTLE_MS }).then(() => true).catch(() => false)
    await page.waitForTimeout(1500)
    await Promise.all(pending)
    const o = await page.evaluate(observe)
    // Custom properties: names from every stylesheet text, values resolved by the browser.
    const names = new Set(Object.keys(o.vars))
    for (const sh of sheets) for (const m of sh.text.matchAll(/(--[\w-]+)\s*:/g)) names.add(m[1])
    const resolved = await page.evaluate(resolveVars, Array.from(names).slice(0, 600))
    fs.writeFileSync(path.join(dir, 'page.html'), await page.content())
    sheets.forEach((sh, i) => { let h = 'x'; try { h = new URL(sh.url).hostname } catch {} fs.writeFileSync(path.join(dir, 'css', `${String(i + 1).padStart(2, '0')}-${h}.css`), `/* ${sh.url} */\n${sh.text}`) })
    const allFaces = [...o.faces]
    for (const sh of sheets) allFaces.push(...facesFromCss(sh.text, sh.url))
    const seen = new Set(); const uniq = allFaces.filter((f) => { const k = [f.family, f.weight, f.style, f.unicodeRange, f.src].join('|'); if (seen.has(k)) return false; seen.add(k); return true })
    fs.writeFileSync(path.join(dir, 'font-face.css'), uniq.map((f) => `/* from ${f.base} */\n${f.css}`).join('\n\n') + '\n')
    await page.screenshot({ path: path.join(dir, 'page.png'), fullPage: false })
    const varsByHex = {}
    for (const [k, v] of Object.entries(resolved)) (varsByHex[v.hex] ||= []).push(k)
    const convertedFrom = { ...o.converted }
    for (const v of Object.values(resolved)) if (v.converted_from) convertedFrom[v.hex] ||= v.converted_from
    const colors = o.colors.map((c) => {
      const vars = varsByHex[c.hex] ?? []
      const flags = []
      if (DEFAULT_LINK.includes(c.hex)) flags.push('browser-default-colour: never the accent')
      if (vars.some((v) => STATUS.test(v))) flags.push('status colour (named in a custom property): never the accent')
      if (convertedFrom[c.hex]) flags.push(`converted from ${convertedFrom[c.hex]} to sRGB: check it against the customer's value`)
      const ctx = Object.keys(c.contexts)
      if (ctx.length && ctx.every((x) => x.startsWith('link'))) flags.push('links only')
      return { hex: c.hex, count: c.count, contexts: c.contexts, roles_seen: ctx.length, vars, flags }
    }).sort((a, b) => b.roles_seen - a.roles_seen || b.count - a.count)
    for (const [h, names2] of Object.entries(varsByHex)) if (!colors.some((c) => c.hex === h)) colors.push({ hex: h, count: 0, contexts: {}, roles_seen: 0, vars: names2, flags: [...(names2.some((v) => STATUS.test(v)) ? ['status colour (named in a custom property): never the accent'] : []), ...(convertedFrom[h] ? [`converted from ${convertedFrom[h]} to sRGB: check it against the customer's value`] : []), 'declared, not seen on the page'] })
    const faces = uniq.map((f) => {
      const src = [...f.src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => { try { return new URL(m[1], f.base).href } catch { return m[1] } })
      const google = src.some((u) => /^https:\/\/fonts\.gstatic\.com\//i.test(u))
      return { family: f.family.replace(/["']/g, '').trim(), weight: f.weight || '400', style: f.style || 'normal', unicodeRange: f.unicodeRange || null, subset: !!f.unicodeRange, source_hint: google ? 'google (fonts.gstatic.com): source google, no files needed' : 'custom', src }
    })
    const googleFamilies = new Set(faces.filter((f) => f.source_hint.startsWith('google')).map((f) => f.family.toLowerCase()))
    const fonts = o.fonts.map((f) => {
      const first = f.family.split(',')[0].replace(/["']/g, '').trim()
      const flags = []
      if (ICON.test(f.family)) flags.push('icon font: never heading or body')
      if (MONO.test(f.family) || /code|pre|kbd/.test(f.selector)) flags.push('monospace: the mono role')
      if (googleFamilies.has(first.toLowerCase())) flags.push('served from fonts.gstatic.com: source google, do not copy the files')
      return { ...f, first_family: first, flags }
    })
    const logos = o.logos.map((l, i) => {
      if (l.type !== 'inline-svg') return l
      if (l.truncated || !l.svg) return { type: 'inline-svg', truncated: true, length: l.length, why: l.why, flags: ['svg longer than 2,000,000 characters, not saved: ask for the file'] }
      const file = `inline-logo-${i + 1}.svg`
      fs.writeFileSync(path.join(dir, file), l.svg.includes('xmlns=') ? l.svg : l.svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))
      return { type: 'inline-svg', file: path.join(dir, file), why: l.why, ...(l.current_color ? { flags: ['uses currentColor: it rasterises black unless raster is run with --color <the page colour>'] } : {}) }
    })
    const cand = { schema: 'sl8.brand-extract/1', url, final_url: o.url, title: o.title, at: new Date().toISOString(), network_idle_reached: idle, stylesheets_saved: sheets.length, stylesheets_unreadable_in_page: o.unreadable, note: 'Candidates only. Colours come from computed CSS (any colour space, converted to sRGB and flagged); page.png is a look, and a colour read off it is a guess. Roles are assigned by the agent and confirmed by the customer when ambiguous.', colors, fonts, custom_properties: resolved, font_faces: faces, logos, images: o.images }
    fs.writeFileSync(path.join(dir, 'candidates.json'), JSON.stringify(cand, null, 2) + '\n')
    console.log(JSON.stringify({ out: dir, network_idle_reached: idle, colors: colors.length, stylesheets: sheets.length, fonts: fonts.map((f) => `${f.selector}: ${f.first_family}`), font_faces: faces.length, logos: logos.length, images: o.images.length }, null, 2))
  } finally { await b.close() }
}

async function raster () {
  const file = args[1]; const w = Number(opt('width')); const outp = opt('out'); const color = opt('color')
  if (!file || !w || !outp) die('raster FILE.svg --width N --out FILE.png [--color CSS]', 2)
  const b = await browser()
  try {
    const page = await b.newPage({ viewport: { width: w, height: w } })
    const svg = fs.readFileSync(file, 'utf8').replace(/^\s*<\?xml[^>]*>/, '')
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent${color ? `;color:${color}` : ''}">${svg}</body></html>`, { waitUntil: 'load' })
    const box = await page.evaluate((W) => {
      const s = document.querySelector('svg')
      if (!s) return null
      // Keep the logo's own proportions: derive a viewBox from width/height when it has none.
      if (!s.getAttribute('viewBox') && parseFloat(s.getAttribute('width')) && parseFloat(s.getAttribute('height'))) s.setAttribute('viewBox', `0 0 ${parseFloat(s.getAttribute('width'))} ${parseFloat(s.getAttribute('height'))}`)
      s.removeAttribute('width'); s.removeAttribute('height'); s.style.width = W + 'px'; s.style.height = 'auto'; s.style.display = 'block'
      const r = s.getBoundingClientRect(); return { width: Math.ceil(r.width), height: Math.ceil(r.height) }
    }, w)
    if (!box || !box.height) die(`${file} has no measurable <svg> (no viewBox and no width/height)`)
    await page.setViewportSize({ width: box.width, height: Math.max(1, box.height) })
    await page.screenshot({ path: outp, omitBackground: true, clip: { x: 0, y: 0, width: box.width, height: Math.max(1, box.height) } })
    console.log(JSON.stringify({ out: outp, ...box }))
  } finally { await b.close() }
}

async function shot () {
  const file = args[1]; const w = Number(opt('width')); const h = Number(opt('height')); const outp = opt('out')
  if (!file || !w || !h || !outp) die('shot FILE.html --width W --height H --out FILE.png', 2)
  const b = await browser()
  try {
    const page = await b.newPage({ viewport: { width: w, height: h } })
    await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'load', timeout: 60000 }).catch((e) => die(`could not open ${file}: ${e.message.split('\n')[0]}`))
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {}) // bounded; a page that never idles is still rendered
    await page.evaluate(() => document.fonts.ready)
    // Two failures: a declared FontFace that errored, and a family used by the text that is neither declared nor installed (a typo, a Google family the page forgot to include).
    const missing = await page.evaluate(() => {
      const bad = Array.from(document.fonts).filter((f) => f.status === 'error').map((f) => `${f.family} ${f.weight} ${f.style}`)
      const declared = new Set(Array.from(document.fonts).map((f) => f.family.replace(/["']/g, '').toLowerCase()))
      const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+|emoji|math|fangsong|inherit|initial)$/i
      const cx = document.createElement('canvas').getContext('2d')
      const width = (fam, base) => { cx.font = `72px ${fam ? '"' + fam + '", ' : ''}${base}`; return cx.measureText('mmmmmmmmmmlli WQ').width }
      const installed = (fam) => ['monospace', 'serif', 'sans-serif'].some((base) => width(fam, base) !== width(null, base))
      const used = new Set()
      for (const el of document.querySelectorAll('body, body *')) {
        if (!el.textContent.trim() || el.children.length) continue
        for (const fam of getComputedStyle(el).fontFamily.split(',')) { const n = fam.replace(/["']/g, '').trim(); if (n && !GENERIC.test(n)) { used.add(n); break } } // the first family is the one the page asked for
      }
      for (const n of used) if (!declared.has(n.toLowerCase()) && !installed(n)) bad.push(`${n} (no @font-face and not installed)`)
      return bad
    })
    await page.screenshot({ path: outp, clip: { x: 0, y: 0, width: w, height: h } })
    console.log(JSON.stringify({ out: outp, width: w, height: h, fonts_not_loaded: missing }))
    if (missing.length) process.exitCode = 1
  } finally { await b.close() }
}

const run = { extract, raster, shot }[cmd]
if (!run) die('usage: browser.mjs extract|raster|shot … (see the header of this file)', 2)
await run()
