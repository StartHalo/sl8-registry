#!/usr/bin/env node
// bake_headline.mjs: bakes a 2-6 word headline into a finished render as a flat PNG at the render's own
// size, in headless Chromium (Playwright on chrome-headless-shell). SL8-authored from the behaviour the
// capability assessment records for WF13-a2 step 17; no vendor file is copied.
//   probe                                     is a browser usable here? prints {ok, chrome}; exit 3 if not
//   bake --image IN --text-file F | --text T --out OUT.png
//        [--style beast|fire|neon-lime|clean-glass|marker] [--position top|bottom|left|right|center]
//        [--case upper|preserve] [--font FAMILY] [--weight N] [--stroke-frac X] [--size-frac X]
//   Type size is --size-frac (default 0.16) of the SHORT side of the frame, shrunk to fit; a headline that cannot fit one line wraps to two before failing.
//   Word limit: 2-6 words; for spaceless scripts (CJK, Thai) 2-12 characters. Letter-spacing is 0 for Arabic and Indic text.
// Before drawing it checks with fontconfig that the family resolves to itself (fc-match) and covers every
// character of the headline (fc-list :charset=…); Chromium would otherwise fall back silently.
// Browser: $SL8_CHROME_PATH, else /etc/sl8/chrome-path, else Playwright's own.
// Prints one JSON line. Exit 0 baked · 1 failed (no fit, render error, size mismatch) · 2 usage (word count,
// bad option) · 3 no browser · 4 font does not resolve · 5 font lacks glyphs (lists families that cover them).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const cmd = args[0]
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const die = (m, code = 1) => { console.error(`bake_headline.mjs: ${m}`); process.exit(code) }

// Style table: sizes are fractions of the font size (the CSS presets were drawn at 120 px).
const STYLES = {
  beast: { family: 'Anton', weight: 400, fill: '#ffffff', stroke: '#000000', strokeFrac: 14 / 120, hard: [8 / 120, 'rgba(0,0,0,0.35)'], soft: [14 / 120, 24 / 120, 'rgba(0,0,0,0.55)'], tracking: -0.01 },
  fire: { family: 'Anton', weight: 400, gradient: [[0, '#ffe24b'], [0.45, '#ff9a1f'], [1, '#ff2e2e']], stroke: '#1a0a00', strokeFrac: 14 / 120, glow: [22 / 120, 'rgba(255,120,0,0.55)'], hard: [10 / 120, 'rgba(0,0,0,0.4)'], tracking: -0.01 },
  'neon-lime': { family: 'Anton', weight: 400, fill: '#d4ff3f', stroke: '#0a1400', strokeFrac: 12 / 120, glow: [26 / 120, 'rgba(180,255,40,0.7)'], hard: [10 / 120, 'rgba(0,0,0,0.4)'], tracking: -0.01 },
  'clean-glass': { family: 'Inter', weight: 800, fill: '#ffffff', pill: { color: 'rgba(20,20,25,0.45)', blur: 16 / 120, padY: 0.12, padX: 0.5, radius: 0.2, shadow: [20 / 120, 60 / 120, 'rgba(0,0,0,0.5)'] }, tracking: -0.02 },
  marker: { family: 'Anton', weight: 400, fill: '#0a0a0a', box: { color: '#d4ff3f', padX: 0.18, padY: 0.04, radius: 0.04, hard: [8 / 120, 'rgba(0,0,0,0.5)'] }, tracking: -0.01 }
}
const POSITIONS = ['top', 'bottom', 'left', 'right', 'center']

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
async function browser () {
  const chromium = await loadPlaywright()
  if (!chromium) die('Playwright is not on this machine (no runtime installs, HR21): deliver the clean render and name the headline as owed', 3)
  try { return await chromium.launch({ headless: true, executablePath: executable(), args: ['--no-sandbox', '--disable-dev-shm-usage'] }) } catch (e) { die(`no headless browser could start: ${String(e.message).split('\n')[0]}`, 3) }
}

function fontCheck (family, text) {
  const m = spawnSync('fc-match', ['-f', '%{family}', family], { encoding: 'utf8' })
  if (m.error) die('fc-match is not on this machine: the font cannot be confirmed, so the bake does not run', 4)
  const got = String(m.stdout || '')
  if (!got.toLowerCase().split(',').map((s) => s.trim()).includes(family.toLowerCase())) die(`fc-match "${family}" resolves to "${got}", not ${family}: pick an installed family with --font`, 4)
  const cps = [...new Set([...text].filter((ch) => !/\s/.test(ch)).map((ch) => ch.codePointAt(0).toString(16)))]
  const l = spawnSync('fc-list', [`:charset=${cps.join(' ')}`, 'family'], { encoding: 'utf8' })
  const covering = String(l.stdout || '').split('\n').flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean)
  if (!covering.map((s) => s.toLowerCase()).includes(family.toLowerCase())) {
    console.log(JSON.stringify({ ok: false, reason: 'glyphs', family, covering: [...new Set(covering)].slice(0, 12) }))
    die(`${family} does not cover every character of the headline: rerun with --font set to a family listed in "covering"`, 5)
  }
  return got
}

function pngSize (buf) { return buf.readUInt32BE(0) === 0x89504e47 ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null }

// Runs in the page: lays out and draws, returns {png (base64), W, H, lines, fontPx} or {error}.
async function draw (o) {
  const resp = await fetch('/img')
  if (!resp.ok) return { error: 'the render could not be read' }
  const img = await createImageBitmap(await resp.blob())
  const W = img.width; const H = img.height
  const ctx = Object.assign(document.createElement('canvas'), { width: W, height: H }).getContext('2d')
  ctx.drawImage(img, 0, 0, W, H)
  const st = o.style
  const fam = `"${o.family}"`
  await document.fonts.load(`${o.weight} 100px ${fam}`, o.text).catch(() => {})
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))])
  const words = o.text.split(' ')
  const split2 = () => { // two lines, balanced by character count
    let best = null
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '); const b = words.slice(i).join(' ')
      const d = Math.abs(a.length - b.length)
      if (!best || d < best.d) best = { d, l: [a, b] }
    }
    return best ? best.l : [o.text]
  }
  const side = o.position === 'left' || o.position === 'right'
  const maxW = (side ? 0.46 : 0.88) * W
  const padX = st.pill ? st.pill.padX : st.box ? st.box.padX : 0
  // Type size is a fraction of the SHORT side, so a tall frame (9:16, 3:4) starts at a size that can fit its width.
  const base = Math.min(W, H)
  let fontPx = Math.round(base * o.sizeFrac)
  const floor = Math.round(base * 0.09); const step = Math.max(1, Math.round(base * 0.005))
  const widest = (lines) => {
    ctx.font = `${o.weight} ${fontPx}px ${fam}`; ctx.letterSpacing = `${(o.tracking * fontPx).toFixed(2)}px`
    return Math.max(...lines.map((l) => ctx.measureText(l).width)) + 2 * padX * fontPx + (o.strokeFrac ?? st.strokeFrac ?? 0) * fontPx
  }
  // One line up to three words; a longer headline starts on two. When even the floor size does not fit, wrap to two lines before failing.
  let lines = words.length > 3 ? split2() : [o.text]
  const start = fontPx
  const shrink = () => { fontPx = start; while (widest(lines) > maxW && fontPx > floor) fontPx = Math.max(floor, fontPx - step); return widest(lines) <= maxW }
  if (!shrink() && lines.length === 1 && words.length > 1) { lines = split2(); shrink() }
  if (widest(lines) > maxW) return { error: `the headline does not fit ${Math.round(maxW)} px even at ${floor} px type on ${lines.length} line(s): shorten it, use position top/bottom/center, or give --size-frac 0.09` }
  const lineH = 0.9 * fontPx; const mx = 0.06 * W; const my = 0.06 * H
  const blockH = lines.length * lineH
  let top = o.position === 'top' ? my : o.position === 'bottom' ? H - my - blockH : (H - blockH) / 2
  ctx.textBaseline = 'middle'
  ctx.textAlign = o.position === 'left' ? 'left' : o.position === 'right' ? 'right' : 'center'
  const x = o.position === 'left' ? mx + padX * fontPx : o.position === 'right' ? W - mx - padX * fontPx : W / 2
  const strokeW = (o.strokeFrac ?? st.strokeFrac ?? 0) * fontPx
  const shadow = (blur, dy, color) => { ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = dy }
  const noShadow = () => shadow(0, 0, 'rgba(0,0,0,0)')
  const rrect = (x0, y0, w, h, r) => { ctx.beginPath(); ctx.roundRect(x0, y0, w, h, r) }
  for (const ln of lines) {
    const y = top + lineH / 2
    const tw = ctx.measureText(ln).width
    const left = ctx.textAlign === 'left' ? x : ctx.textAlign === 'right' ? x - tw : x - tw / 2
    if (st.pill) { // frosted pill: blurred copy of what is behind it, a dark tint, a soft drop shadow
      const p = st.pill; const bx = left - p.padX * fontPx; const by = y - lineH / 2 - p.padY * fontPx
      const bw = tw + 2 * p.padX * fontPx; const bh = lineH + 2 * p.padY * fontPx; const r = p.radius * fontPx
      ctx.save(); shadow(p.shadow[1] * fontPx, p.shadow[0] * fontPx, p.shadow[2]); rrect(bx, by, bw, bh, r); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore() // opaque so the shadow keeps its colour; the blurred copy below covers the fill
      ctx.save(); rrect(bx, by, bw, bh, r); ctx.clip(); ctx.filter = `blur(${p.blur * fontPx}px)`; ctx.drawImage(img, 0, 0, W, H); ctx.filter = 'none'; ctx.fillStyle = p.color; ctx.fillRect(bx, by, bw, bh); ctx.restore()
    }
    if (st.box) { // marker line-box with a hard offset shadow
      const b = st.box; const bx = left - b.padX * fontPx; const by = y - lineH / 2 - b.padY * fontPx
      const bw = tw + 2 * b.padX * fontPx; const bh = lineH + 2 * b.padY * fontPx
      ctx.save(); shadow(0, b.hard[0] * fontPx, b.hard[1]); rrect(bx, by, bw, bh, b.radius * fontPx); ctx.fillStyle = b.color; ctx.fill(); ctx.restore()
    }
    ctx.lineJoin = 'round'; ctx.miterLimit = 2
    if (strokeW > 0) { // stroke first, under the fill; the shadows hang off the stroke
      ctx.lineWidth = strokeW; ctx.strokeStyle = st.stroke ?? '#000'
      if (st.soft) { ctx.save(); shadow(st.soft[1] * fontPx, st.soft[0] * fontPx, st.soft[2]); ctx.strokeText(ln, x, y); ctx.restore() }
      if (st.hard) { ctx.save(); shadow(0, st.hard[0] * fontPx, st.hard[1]); ctx.strokeText(ln, x, y); ctx.restore() }
      noShadow(); ctx.strokeText(ln, x, y)
    }
    let paint = st.fill
    if (st.gradient) { paint = ctx.createLinearGradient(0, y - fontPx / 2, 0, y + fontPx / 2); for (const [at, col] of st.gradient) paint.addColorStop(at, col) }
    ctx.fillStyle = paint
    ctx.save(); if (st.glow) shadow(st.glow[0] * fontPx, 0, st.glow[1]); ctx.fillText(ln, x, y); ctx.restore()
    top += lineH
  }
  const url = ctx.canvas.toDataURL('image/png')
  return { png: url.slice(url.indexOf(',') + 1), W, H, lines, fontPx, fontsCheck: document.fonts.check(`${o.weight} ${fontPx}px ${fam}`, o.text) }
}

async function bake () {
  const image = opt('image'); const out = opt('out')
  if (!image || !out) die('bake needs --image and --out', 2)
  if (!fs.existsSync(image)) die(`no image at ${image}`, 2)
  const tf = opt('text-file'); const tt = opt('text')
  if ((tf && tt) || (!tf && !tt)) die('give exactly one of --text-file or --text', 2)
  const raw = (tf ? fs.readFileSync(tf, 'utf8') : tt).replace(/\s+/g, ' ').trim()
  // Scripts written without spaces (Chinese, Japanese, Thai) are counted in characters: 2-12. Everything else in words: 2-6.
  const spaceless = !raw.includes(' ') && /[\u0E00-\u0E7F\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(raw)
  const n = raw ? (spaceless ? [...raw].length : raw.split(' ').length) : 0
  if (spaceless ? (n < 2 || n > 12) : (n < 2 || n > 6)) die(`the headline has ${n} ${spaceless ? 'character(s)' : 'word(s)'}: ${spaceless ? '2-12' : '2-6'} is the limit, ${spaceless ? 'about 4-8' : '2-4'} reads best`, 2)
  const styleName = opt('style', 'beast'); const style = STYLES[styleName]
  if (!style) die(`--style must be one of ${Object.keys(STYLES).join(', ')}`, 2)
  const position = opt('position', 'bottom'); if (!POSITIONS.includes(position)) die(`--position must be one of ${POSITIONS.join(', ')}`, 2)
  const kase = opt('case', 'upper'); if (!['upper', 'preserve'].includes(kase)) die('--case must be upper or preserve', 2)
  const text = kase === 'upper' ? raw.toUpperCase() : raw // not toLocaleUpperCase: the process locale must not change letters (Turkish i); German ß and Turkish i take --case preserve
  const family = opt('font', style.family); const weight = Number(opt('weight', style.weight))
  const strokeFrac = opt('stroke-frac') == null ? undefined : Number(opt('stroke-frac'))
  const sizeFrac = Number(opt('size-frac', 0.16))
  if (!(sizeFrac >= 0.09 && sizeFrac <= 0.2)) die('--size-frac must be between 0.09 and 0.20', 2)
  const resolved = fontCheck(family, text)
  // Letter-spacing breaks joined scripts (Arabic) and conjuncts (Indic): none for them.
  const tracking = /[\u0600-\u06ff\u0750-\u077f\u0900-\u0dff]/.test(text) ? 0 : style.tracking
  const imgBuf = fs.readFileSync(image)
  const b = await browser()
  try {
    const page = await b.newPage()
    await page.route('http://bake.local/**', (route) => {
      const u = new URL(route.request().url())
      if (u.pathname === '/img') return route.fulfill({ status: 200, body: imgBuf, contentType: /\.jpe?g$/i.test(image) ? 'image/jpeg' : /\.webp$/i.test(image) ? 'image/webp' : 'image/png' })
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><body></body>' })
    })
    await page.goto('http://bake.local/')
    const r = await page.evaluate(draw, { text, style, position, family, weight, strokeFrac, sizeFrac, tracking })
    if (r.error) die(r.error, 1)
    const png = Buffer.from(r.png, 'base64')
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
    fs.writeFileSync(out, png)
    const size = pngSize(png)
    if (!size || size[0] !== r.W || size[1] !== r.H) die(`output is ${size} but the render is ${r.W}x${r.H}`, 1)
    console.log(JSON.stringify({ ok: true, output: out, style: styleName, position, text_case: kase, width: r.W, height: r.H, lines: r.lines, font: family, weight, font_px: r.fontPx, fc_match: resolved, glyphs: 'covered', chrome_font_check: r.fontsCheck }))
  } finally { await b.close() }
}

if (cmd === 'probe') {
  const chromium = await loadPlaywright()
  if (!chromium) { console.log(JSON.stringify({ ok: false, playwright: false })); process.exit(3) }
  try { const b = await chromium.launch({ headless: true, executablePath: executable(), args: ['--no-sandbox'] }); const v = b.version(); await b.close(); console.log(JSON.stringify({ ok: true, chrome: v })) } catch (e) { console.log(JSON.stringify({ ok: false, error: String(e.message).split('\n')[0] })); process.exit(3) }
} else if (cmd === 'bake') await bake()
else die('usage: bake_headline.mjs probe | bake --image IN (--text-file F | --text T) --out OUT.png [options] (see the header)', 2)
