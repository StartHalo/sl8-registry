#!/usr/bin/env node
// shots.mjs: browser checks of a built site before delivery (web-marketing-site, method WF50-a1 steps 29-30).
//
//   node shots.mjs --url http://127.0.0.1:4173 --out artifacts/<p>/qc [--animated] [--audit]
//   --animated  the build is on the animated path: fail when scrolling requests no clip, or a clip answers other than 200
//   --audit     figures only, always exit 0 (step 3: a customer's live site may legitimately use video)
//
// Uses the machine's Playwright Chromium (never installs a browser). Writes full-page screenshots in
// light and dark at desktop (1440x900) and phone (390x844) sizes, then loads the page once with
// reduced motion and counts video requests. Prints one JSON line of figures. Exit 0 when reduced
// motion fetched no video, every poster image decoded and (with --animated) the scroll fetched every
// clip with HTTP 200; 1 otherwise; 2 usage; 3 Playwright missing. The page is scrolled in steps so
// bands load their clips. Playwright's bundled Chromium usually has no H.264 decoder: the figure
// h264_playable says so, and then the check stands on posters, clip requests and their status codes.
// The screenshots are for viewing (blank bands, black video boxes, contrast in both modes): this
// script reports figures, it does not judge them.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const url = opt('url'); const out = opt('out'); const animated = args.includes('--animated'); const audit = args.includes('--audit')
if (!url || !out) { console.error('usage: shots.mjs --url <preview url> --out <dir>'); process.exit(2) }

async function loadPlaywright () {
  try { return await import('playwright') } catch {}
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
    return createRequire(path.join(globalRoot, 'noop.js'))('playwright')
  } catch { return null }
}

// scroll the page top to bottom in viewport-sized steps so each band loads its clip; a fullPage shot of a sticky stage shows it once, so the figures above are the check
async function scrollThrough (page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  const vh = await page.evaluate(() => window.innerHeight)
  for (let y = 0; y < h; y += Math.round(vh * 0.8)) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(250) }
  await page.waitForTimeout(500)
}

const pw = await loadPlaywright()
if (!pw?.chromium) { console.log(JSON.stringify({ error: 'playwright is not on this machine; report it, never install it' })); process.exit(3) }
fs.mkdirSync(out, { recursive: true })
const browser = await pw.chromium.launch({ args: ['--no-sandbox'] })
const figures = { shots: [], reduced_motion_video_requests: null, posters_broken: [], clip_requests: null, clip_bad_status: [], h264_playable: null, video_elements: null }
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    for (const colorScheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport, colorScheme, reducedMotion: 'no-preference' })
      const page = await ctx.newPage()
      const clips = []
      page.on('response', (r) => { if (/\.(mp4|webm|mov)(\?|$)/i.test(r.url())) clips.push({ url: r.url(), status: r.status() }) })
      await page.goto(url, { waitUntil: 'networkidle' })
      await scrollThrough(page)
      if (name === 'desktop' && colorScheme === 'light') {
        figures.clip_requests = new Set(clips.map((c) => c.url)).size
        figures.clip_bad_status = clips.filter((c) => c.status !== 200 && c.status !== 206).map((c) => `${c.status} ${c.url}`)
        const v = await page.evaluate(() => { const vs = Array.from(document.querySelectorAll('video')); return { n: vs.length, canH264: vs[0] ? vs[0].canPlayType('video/mp4; codecs="avc1.42E01E"') : document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"'), sized: vs.filter((x) => x.videoWidth > 0).length } })
        figures.video_elements = v.n; figures.h264_playable = v.canH264 !== ''; figures.video_sized = v.sized
      }
      await page.evaluate(() => window.scrollTo(0, 0))
      const file = path.join(out, `shot-${name}-${colorScheme}.png`)
      await page.screenshot({ path: file, fullPage: true })
      const height = await page.evaluate(() => document.documentElement.scrollHeight)
      figures.shots.push({ file, viewport: `${viewport.width}x${viewport.height}`, colorScheme, page_height: height })
      if (name === 'desktop' && colorScheme === 'light') {
        figures.posters_broken = await page.evaluate(() => Array.from(document.querySelectorAll('.ss-poster img')).filter((i) => !(i.naturalWidth > 0)).map((i) => i.getAttribute('src')))
      }
      await ctx.close()
    }
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  let videos = 0
  page.on('request', (r) => { if (r.resourceType() === 'media' || /\.(mp4|webm|mov)(\?|$)/i.test(r.url())) videos++ })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.mouse.wheel(0, 4000)
  await page.waitForTimeout(800)
  const file = path.join(out, 'shot-desktop-reduced-motion.png')
  await page.screenshot({ path: file, fullPage: true })
  figures.shots.push({ file, viewport: '1440x900', reducedMotion: true })
  figures.reduced_motion_video_requests = videos
  await ctx.close()
} finally {
  await browser.close()
}
console.log(JSON.stringify(figures))
const animatedBad = animated && (!(figures.clip_requests > 0) || figures.clip_bad_status.length > 0)
process.exit(audit || (figures.reduced_motion_video_requests === 0 && figures.posters_broken.length === 0 && !animatedBad) ? 0 : 1)
