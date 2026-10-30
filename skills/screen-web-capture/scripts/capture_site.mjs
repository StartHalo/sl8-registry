#!/usr/bin/env node
// capture_site.mjs: real-pixel stills of a live web page with Playwright and headless Chromium.
// SL8-authored (screen-web-capture 1.0.0). Written from the behaviour the SL8 capability assessment
// records for a mobile website capture (WF20-a1 steps 4-5, WF19-a1 step 7; research ids
// higgsfield/ugc-website-lane#1-9); no vendor code is copied.
//
//   node capture_site.mjs <url> --out <file.png>                       a full-page capture
//   node capture_site.mjs <url> --sections "Label A,Label B" --outdir <dir>   one viewport still per label
//   node capture_site.mjs <url> --out <file.png> --sections "A,B" --outdir <dir>   both from ONE page load:
//       the full page is shot first and every rect is measured on that same load before any click,
//       so rect.top * dpr is valid on that full-page file (rect_valid_for_full true).
//   options: --device iphone13|desktop|desktop2x (default iphone13), --chrome <path>
//
// One JSON line per capture on stdout:
//   {"kind":"full","path":…,"exists":true,"status":200,"full_height":…,"truncated":false}
//   {"kind":"section","label":…,"path":…,"exists":true,"status":200,"rect":{"top":…,"height":…,"dpr":…}|null,"rect_valid_for_full":true}
//   {"kind":"section","label":…,"error":"not reachable"}
//   {"kind":"error","error":"not reachable","url":…}      (navigation failed)
// Exit 0 when at least one file was written, 1 when nothing was captured, 2 on bad usage,
// 3 when Playwright or a browser cannot be found (never installed at run time).
// The script never resizes or crops: geometry belongs to the caller.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const argv = process.argv.slice(2)
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined }
const url = argv[0] && !argv[0].startsWith('--') ? argv[0] : undefined
const out = flag('--out')
const sections = flag('--sections')
const outdir = flag('--outdir')
const device = flag('--device') ?? 'iphone13'
const MAX_FULL_CSS = 25000   // a taller page is cut at this many CSS px and the line says so
const LAZY_DEADLINE_MS = 60000
const say = (o) => process.stdout.write(JSON.stringify(o) + '\n')
const fail = (code, msg) => { process.stderr.write(`capture_site: ${msg}\n`); process.exit(code) }

if (!url) fail(2, 'usage: capture_site.mjs <url> (--out <file.png> | --sections "A,B" --outdir <dir>) [--device iphone13|desktop|desktop2x] [--chrome <path>]')
// file:// only for the skill's own fixtures (--allow-file); a customer page is always http(s).
if (!/^https?:\/\//i.test(url) && !(argv.includes('--allow-file') && /^file:\/\//i.test(url))) fail(2, `not an http(s) URL: ${url}`)
if (!out && !sections) fail(2, 'give --out (full page), --sections with --outdir, or both')
if (sections && !outdir) fail(2, '--sections needs --outdir')
if (!['iphone13', 'desktop', 'desktop2x'].includes(device)) fail(2, `unknown --device ${device}`)

// Playwright is part of the machine; find it, never install it (HR21).
function loadPlaywright () {
  const roots = []
  for (const p of (process.env.NODE_PATH ?? '').split(path.delimiter)) if (p) roots.push(p)
  try { roots.push(execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) } catch {}
  roots.push(process.cwd())
  for (const root of roots) {
    for (const name of ['playwright', 'playwright-core']) {
      try { return createRequire(path.join(root, 'noop.js'))(path.join(root, name)) } catch {}
      try { return createRequire(path.join(root, 'noop.js'))(name) } catch {}
    }
  }
  return null
}
if (fs.existsSync('/ms-playwright') && !process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = '/ms-playwright'
const pw = loadPlaywright()
if (!pw) fail(3, 'Playwright is not installed on this machine (looked in NODE_PATH and npm root -g); report it, do not install it')

// The browser: --chrome, then CHROME_PATH, then the Studio's pinned Chrome Headless Shell, then Playwright's own.
function chromeCandidates () {
  const c = [flag('--chrome'), process.env.CHROME_PATH]
  try { c.push(fs.readFileSync('/etc/sl8/chrome-path', 'utf8').trim()) } catch {}
  c.push('/opt/chrome/chrome')
  return [...new Set(c.filter((p) => p && fs.existsSync(p)))]
}

const PROFILES = {
  iphone13: () => {
    const d = pw.devices?.['iPhone 13']
    if (!d) return { viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    const { defaultBrowserType, ...rest } = d   // the profile names webkit; we always drive Chromium
    return rest
  },
  desktop: () => ({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }),
  desktop2x: () => ({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 }),
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function launch () {
  const tries = [...chromeCandidates().map((p) => ({ executablePath: p })), {}]
  let last
  for (const t of tries) {
    try { return await pw.chromium.launch({ headless: true, ...t }) } catch (e) { last = e }
  }
  fail(3, `no headless Chromium would start: ${String(last?.message ?? last).split('\n')[0]}`)
}

// Accept-style consent buttons; matched on the button's own text and only inside something that
// looks like a banner or dialog (a cookie/consent/gdpr container, a dialog, or a fixed/sticky box).
// Plain links and words like continue, close and OK are not clicked: they navigate or close things.
const CONSENT = /^(accept( all)?( cookies)?|allow( all)?( cookies)?|i agree|agree( and continue)?|got it|i understand|consent)$/i

async function dismissOverlays (page) {
  for (let round = 0; round < 2; round++) {
    await page.evaluate((src) => {
      const re = new RegExp(src, 'i')
      const BOX = '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=gdpr i],[class*=gdpr i],[role=dialog],[aria-modal=true]'
      const pinned = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true } return false }
      for (const el of document.querySelectorAll('button, [role=button], input[type=button], input[type=submit]')) {
        const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim()
        if (t && t.length < 40 && re.test(t) && (el.closest(BOX) || pinned(el))) { try { el.click() } catch {} ; break }
      }
      // Google One Tap draws inside an iframe from another origin, on top of the hero: remove it.
      for (const el of document.querySelectorAll('#credential_picker_container, #credential_picker_iframe, iframe[src*="accounts.google.com"]')) el.remove()
    }, CONSENT.source).catch(() => {})
    await sleep(400)
  }
}

// Slow pass to wake lazy content: down in 500 px steps with a 260 ms pause each (at most 40 steps and
// 60 s), hold at the bottom, back to the top. Smooth scrolling is switched off so each step lands.
async function lazyPass (page) {
  await page.evaluate(async (deadlineMs) => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    const t0 = Date.now()
    document.documentElement.style.scrollBehavior = 'auto'
    let y = 0
    for (let i = 0; i < 40; i++) {
      const h = document.documentElement.scrollHeight
      if (y >= h || Date.now() - t0 > deadlineMs) break
      window.scrollTo(0, y); y += 500
      await wait(260)
    }
    window.scrollTo(0, document.documentElement.scrollHeight)
    await wait(1200)
    window.scrollTo(0, 0)
    await wait(300)
  }, LAZY_DEADLINE_MS).catch(() => {})
}

async function waitForFile (p) {
  for (let i = 0; i < 20; i++) { try { if (fs.statSync(p).size > 0) return true } catch {} await sleep(100) }
  return false
}

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section'

// Find the label by case-insensitive containment. Headings (h1-h4) win; then tabs, summaries and
// aria-expanded buttons; then strong text. Plain buttons and links are never clicked (they can submit,
// add to a cart or navigate). With click true, a tab, summary or aria-expanded button that matches is
// clicked only when no heading matched (content behind tabs and accordions). The match is centred.
// Returns the document-absolute rect of the enclosing section/article (else the element), or null
// when it never painted.
async function locate (page, label, click) {
  return page.evaluate(({ label, click }) => {
    const want = label.toLowerCase()
    const text = (el) => (el.innerText || el.textContent || '').trim().toLowerCase()
    const pick = (sel) => [...document.querySelectorAll(sel)].filter((el) => text(el).includes(want))
    const best = (els) => els.sort((a, b) => Math.abs(text(a).length - want.length) - Math.abs(text(b).length - want.length))[0]
    const HEAD = 'h1, h2, h3, h4'
    const TOG = '[role=tab], summary, button[aria-expanded]'
    let el = best(pick(HEAD))
    let clicked = false
    if (!el && click) {
      const t = best(pick(TOG))
      if (t) { try { t.click(); clicked = true } catch {} }
      el = best(pick(HEAD)) || t
    }
    if (!el) el = best(pick('strong')) || best(pick(TOG))
    if (!el) return { found: false }
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
    const r = el.getBoundingClientRect()
    const host = el.closest('section, article') || el
    const hr = host.getBoundingClientRect()
    const top = Math.round(hr.top + window.scrollY)
    const height = Math.round(hr.height)
    return { found: true, clicked, rect: r.height > 0 && height > 0 ? { top, height, dpr: window.devicePixelRatio } : null }
  }, { label, click })
}

const browser = await launch()
let written = 0
let exitCode = null
try {
  const context = await browser.newContext({ ...PROFILES[device](), ignoreHTTPSErrors: false })
  // One Tap requests are refused at the network layer. Analytics is left alone on purpose: blocking
  // it can stop the page's own scripts from starting and leave the shot empty.
  await context.route(/accounts\.google\.com|\/gsi\/client/, (route) => route.abort())
  const page = await context.newPage()
  let status = null
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    status = resp ? resp.status() : null
  } catch (e) {
    process.stderr.write(`capture_site: navigation failed: ${String(e.message).split('\n')[0]}\n`)
    if (out) say({ kind: 'full', path: out, exists: false, error: 'not reachable' })
    if (sections) for (const label of sections.split(',').map((s) => s.trim()).filter(Boolean)) say({ kind: 'section', label, error: 'not reachable' })
    say({ kind: 'error', error: 'not reachable', url })
    exitCode = 1
  }
  if (exitCode === null) {
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await dismissOverlays(page)
    await lazyPass(page)
    await dismissOverlays(page)

    // Rects are measured on the load the full-page file comes from, before any click.
    const measured = new Map()
    const labels = sections ? sections.split(',').map((s) => s.trim()).filter(Boolean) : []
    if (out) {
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
      const vw = page.viewportSize()?.width ?? 0
      const fullHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0)).catch(() => 0)
      const truncated = fullHeight > MAX_FULL_CSS
      for (const label of labels) {
        const hit = await locate(page, label, false).catch(() => ({ found: false }))
        if (hit.found) measured.set(label, hit.rect)
      }
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
      await page.screenshot(truncated
        ? { path: out, fullPage: true, clip: { x: 0, y: 0, width: vw, height: MAX_FULL_CSS } }
        : { path: out, fullPage: true })
      const exists = await waitForFile(out)
      say({ kind: 'full', path: out, exists, status, full_height: fullHeight, truncated })
      if (exists) written++
    }
    if (sections) {
      fs.mkdirSync(outdir, { recursive: true })
      const pending = new Map(labels.map((l) => [l, null]))
      // First pass, then up to two re-probes (each after another lazy pass) while labels are missing.
      for (let pass = 0; pass < 3 && [...pending.values()].some((v) => v === null); pass++) {
        if (pass > 0) await lazyPass(page)
        for (const label of labels) {
          if (pending.get(label) !== null) continue
          const hit = await locate(page, label, true).catch(() => ({ found: false }))
          if (!hit.found) continue
          await sleep(350)
          await dismissOverlays(page)
          const file = path.join(outdir, `section_${slug(label)}.png`)
          await page.screenshot({ path: file, fullPage: false })
          const exists = await waitForFile(file)
          // A rect measured before any click belongs to the full-page file; one measured after a click
          // or without --out belongs only to this load.
          const pre = measured.get(label)
          const rect = pre ?? hit.rect
          pending.set(label, { kind: 'section', label, path: file, exists, status, rect, rect_valid_for_full: !!(out && pre) })
        }
      }
      for (const label of labels) {
        const line = pending.get(label)
        if (line) { say(line); if (line.exists) written++ } else say({ kind: 'section', label, error: 'not reachable' })
      }
    }
  }
} finally {
  await browser.close().catch(() => {})
}
process.exit(exitCode ?? (written ? 0 : 1))
