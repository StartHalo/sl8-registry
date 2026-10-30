#!/usr/bin/env node
// capture.mjs: mobile capture of a customer's site for marketing-site-creator-video.
// SL8-authored from the behaviour the capability assessment records for WF20-a1 steps 4-5
// (no vendor file is copied). Real pixels only: it never resizes or crops.
//
//   node capture.mjs <url> --outdir DIR [--sections "Label A,Label B,..."] [--full-scale css|device]
//
// Prints one JSON line per result, each only after its file is on disk:
//   {"kind":"page","path":"DIR/page.html","bytes":N,"botwall":["captcha",...],"markers":[...],"thin":true}
//   (page.html is the RENDERED page; "botwall" lists marker words only when the rendered page is
//   also thin, "markers" lists every hit for the record)
//   {"kind":"headings","items":[{"tag":"h2","text":"Pricing","top":812,"height":40}, ...]}   (CSS px, document-absolute)
//   {"kind":"full","path":"DIR/site_full.png","exists":true,"bytes":N,"width":W,"height":H,"scale":3,"doc_css_height":N}
//   (width/height are the PNG's pixels, scale is device pixels per CSS px, doc_css_height the page height)
//   {"kind":"section","label":"Pricing","path":"DIR/section_pricing.png","exists":true,"rect":{"top":812,"height":40,"dpr":3}}
//   {"kind":"section","label":"Reviews","error":"not reachable"}
// A section whose element never painted has "rect": null: skip it, never crop blind.
// Labels must use the page's own wording (case-insensitive text containment in h1-h4, strong,
// [role=tab], summary and button). Viewport: Playwright's iPhone 13 profile on Chromium.
// Exit 0 something captured; 1 nothing captured; 2 usage; 3 no Playwright or no browser.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const VALUED = ['--outdir', '--sections', '--full-scale']
const url = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]))
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const outdir = opt('outdir')
const labels = (opt('sections', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
const fullScale = opt('full-scale', 'device') === 'css' ? 'css' : 'device'
const emit = (o) => process.stdout.write(JSON.stringify(o) + '\n')
const die = (m, code) => { console.error(`capture.mjs: ${m}`); process.exit(code) }
if (!url || !/^https?:\/\/|^file:\/\//.test(url) || !outdir) die('usage: capture.mjs <url> --outdir DIR [--sections "A,B"] [--full-scale css|device]', 2)
fs.mkdirSync(outdir, { recursive: true })

const BOTWALL = /captcha|verify you are human|cf-browser-verification|access denied|enable javascript/gi
const CONSENT = /^(accept( all)?( cookies)?|agree|i agree|allow( all)?( cookies)?|got it|consent|i understand)$/i
const CONSENT_BOX = /cookie|consent|gdpr|privacy|banner|cmp|onetrust|didomi|cookiebot/i
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/ms-playwright')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/ms-playwright'
async function loadPlaywright () {
  for (const name of ['playwright', 'playwright-core']) { try { return await import(name) } catch {} }
  const roots = [...(process.env.NODE_PATH || '').split(':').filter(Boolean), spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout?.trim()].filter(Boolean)
  for (const r of roots) {
    const req = createRequire(path.join(r, 'noop.js'))
    for (const name of ['playwright', 'playwright-core']) { try { return req(name) } catch {} }
  }
  die('Playwright is not on this machine (no runtime installs, HR21): take the capture-failure path', 3)
}
function executable () {
  if (process.env.SL8_CHROME_PATH) return process.env.SL8_CHROME_PATH
  try { const p = fs.readFileSync('/etc/sl8/chrome-path', 'utf8').trim(); if (p && fs.existsSync(p)) return p } catch {}
  return undefined
}
async function waitFile (p) {
  for (let i = 0; i < 20; i++) { if (fs.existsSync(p) && fs.statSync(p).size > 0) return true; await sleep(100) }
  return fs.existsSync(p)
}

// Fallback copy of the page for the record when the browser cannot render it (a second fetch with a
// bare user agent is NOT the bot-wall test: the wall test reads the rendered page, see wallCheck).
async function rawPage () {
  const p = path.join(outdir, 'page.html')
  let html = ''
  try {
    if (url.startsWith('file://')) html = fs.readFileSync(new URL(url), 'utf8')
    else { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, redirect: 'follow', signal: AbortSignal.timeout(30000) }); html = await r.text() }
  } catch (e) { console.error(`capture.mjs: page fetch failed (${e.message})`) }
  fs.writeFileSync(p, html)
  return html
}

// The wall test reads what the browser rendered. A marker word alone is not a wall (a reCAPTCHA script on a
// contact form, a noscript line in a React shell): it counts only when the rendered page is also thin.
async function wallCheck (page, headingCount) {
  let text = '', title = ''
  try { text = await page.evaluate(() => document.body?.innerText || ''); title = await page.title() } catch {}
  const hay = `${title}\n${text}`
  const markers = [...new Set((hay.match(BOTWALL) || []).map((h) => h.toLowerCase()))]
  const thin = text.trim().length < 1500 || headingCount < 2
  return { markers, thin, botwall: thin ? markers : [] }
}

async function dismissConsent (page) {
  for (let round = 0; round < 2; round++) {
    for (const frame of page.frames()) {
      try {
        const buttons = await frame.$$('button, [role=button], a[role=button], input[type=button]')
        for (const b of buttons) {
          const t = ((await b.innerText().catch(() => '')) || (await b.getAttribute('value')) || '').trim()
          if (!t || t.length >= 40 || !CONSENT.test(t) || !(await b.isVisible().catch(() => false))) continue
          // only inside a consent container or a fixed overlay: a plain "Agree" in a form is left alone
          const inBox = await b.evaluate((el, src) => {
            const re = new RegExp(src, 'i')
            for (let n = el; n && n !== document.body; n = n.parentElement) {
              if (re.test(`${n.id} ${typeof n.className === 'string' ? n.className : ''} ${n.getAttribute('aria-label') || ''}`)) return true
              if (getComputedStyle(n).position === 'fixed') return true
            }
            return false
          }, CONSENT_BOX.source).catch(() => false)
          if (inBox) await b.click({ timeout: 1500 }).catch(() => {})
        }
      } catch {}
    }
    await sleep(400)
  }
  // Google One Tap and similar sign-in overlays sit in a cross-origin iframe text clicks cannot reach.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('#credential_picker_container, #credential_picker_iframe, iframe[src*="accounts.google.com"]')) el.remove()
  }).catch(() => {})
}

async function lazyPass (page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0)
  for (let y = 0; y < h; y += 500) { await page.evaluate((yy) => window.scrollTo(0, yy), y).catch(() => {}); await sleep(260) }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)).catch(() => {})
  await sleep(1200)
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
  await sleep(300)
}

// Finds the label in the page's own wording; opens a tab, accordion or disclosure button that carries it;
// returns the document-absolute rect of the best VISIBLE match (null when none has a painted box).
async function locate (page, label) {
  return page.evaluate(async (lab) => {
    const want = lab.toLowerCase()
    const pool = Array.from(document.querySelectorAll('h1, h2, h3, h4, strong, [role=tab], summary, button'))
    const txt = (el) => (el.innerText || el.textContent || '')
    const named = pool.filter((el) => txt(el).toLowerCase().includes(want))
    if (!named.length) return { found: false }
    const shown = named.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    if (!shown.length) return { found: true, rect: null }   // present but never painted: skip, never crop blind
    shown.sort((a, b) => txt(a).length - txt(b).length)
    const el = shown[0]
    // open only tabs, disclosures and expandable buttons; never a form, cart or subscribe button
    const opener = el.closest('[role=tab], summary, button[aria-expanded]')
    if (opener) { try { opener.click() } catch {} ; await new Promise((r) => setTimeout(r, 400)) }
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return { found: true, rect: null }
    const top = r.top + window.scrollY
    window.scrollTo({ top: Math.max(0, top - (window.innerHeight - r.height) / 2), behavior: 'instant' })
    // wait until the scroll position stops changing (a smooth-scrolling page may still be moving)
    let last = -1
    for (let i = 0; i < 20 && Math.abs(window.scrollY - last) > 0.5; i++) { last = window.scrollY; await new Promise((r2) => setTimeout(r2, 100)) }
    const r2 = el.getBoundingClientRect()
    return { found: true, rect: { top: Math.round(r2.top + window.scrollY), height: Math.round(r2.height), dpr: window.devicePixelRatio } }
  }, label)
}

async function main () {
  const rawHtml = await rawPage()
  let pageEmitted = false
  const pw = await loadPlaywright()
  const chromium = pw.chromium ?? pw.default?.chromium
  const devices = pw.devices ?? pw.default?.devices
  let browser
  try { browser = await chromium.launch({ headless: true, executablePath: executable() }) } catch (e) { die(`no headless browser could start (${e.message.split('\n')[0]})`, 3) }
  const profile = { ...(devices?.['iPhone 13'] ?? {}) }
  delete profile.defaultBrowserType
  const ctx = await browser.newContext(profile)
  await ctx.route(/accounts\.google\.com|gsi\/client/, (r) => r.abort()) // One Tap; analytics stays unblocked
  const page = await ctx.newPage()
  let captured = 0
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await dismissConsent(page)
    await lazyPass(page)
    const heads = await page.evaluate(() => Array.from(document.querySelectorAll('h1, h2, h3, h4')).map((el) => {
      const r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), text: (el.innerText || '').trim().slice(0, 120), top: Math.round(r.top + window.scrollY), height: Math.round(r.height) }
    }).filter((h) => h.text)).catch(() => [])
    emit({ kind: 'headings', items: heads })
    const rendered = await page.content().catch(() => '')
    if (rendered) fs.writeFileSync(path.join(outdir, 'page.html'), rendered)   // rendered DOM: product images, og:image
    const wall = await wallCheck(page, heads.length)
    emit({ kind: 'page', path: path.join(outdir, 'page.html'), bytes: Buffer.byteLength(rendered || rawHtml), botwall: wall.botwall, markers: wall.markers, thin: wall.thin })
    pageEmitted = true
    {
      const p = path.join(outdir, 'site_full.png')
      const docH = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0)
      await page.screenshot({ path: p, fullPage: true, scale: fullScale, timeout: 60000 })
      const ok = await waitFile(p)
      let w = 0, h = 0
      if (ok) { const hd = fs.readFileSync(p).subarray(0, 24); if (hd.length >= 24) { w = hd.readUInt32BE(16); h = hd.readUInt32BE(20) } }
      emit({ kind: 'full', path: p, exists: ok, bytes: ok ? fs.statSync(p).size : 0, width: w, height: h, scale: fullScale === 'css' ? 1 : (profile.deviceScaleFactor ?? 1), doc_css_height: docH })
      if (ok) captured++
    }
    let pending = [...labels]
    for (let pass = 0; pass < 3 && pending.length; pass++) { // first pass plus up to two re-probes
      if (pass > 0) await lazyPass(page)
      const missing = []
      for (const label of pending) {
        const r = await locate(page, label).catch(() => ({ found: false }))
        if (!r.found) { missing.push(label); continue }
        await sleep(350)
        const p = path.join(outdir, `section_${slug(label)}.png`)
        await page.screenshot({ path: p, timeout: 30000 })
        const ok = await waitFile(p)
        emit({ kind: 'section', label, path: p, exists: ok, rect: r.rect })
        if (ok) captured++
      }
      pending = missing
    }
    for (const label of pending) emit({ kind: 'section', label, error: 'not reachable' })
  } catch (e) {
    console.error(`capture.mjs: ${e.message.split('\n')[0]}`)
  } finally {
    if (!pageEmitted) emit({ kind: 'page', path: path.join(outdir, 'page.html'), bytes: Buffer.byteLength(rawHtml), botwall: [], markers: [], thin: true })
    await browser.close().catch(() => {})
  }
  process.exit(captured ? 0 : 1)
}
main()
