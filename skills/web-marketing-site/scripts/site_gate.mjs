#!/usr/bin/env node
// site_gate.mjs: the mechanical gate of web-marketing-site (SL8-authored; method WF50-a1 step 30).
//
//   node site_gate.mjs --root artifacts/<p> [--sections N] [--desktop-mib 32] [--mobile-mib 16] [--built]
//
// <root> holds app/ (app/src, app/public, app/design-brief.md). Prints one JSON line per check with
// the figures and hits it found, then a summary line. Exit 0 when no check has a hit that fails,
// 1 when any does, 2 on usage. It never prints a verdict word: read the hits, fix every one, rerun.
// Checks that need a browser (reduced motion fetches no video, no blank band) are in shots.mjs.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d }
const flag = (n) => args.includes(`--${n}`)
const root = opt('root')
if (!root || !fs.existsSync(path.join(root, 'app'))) { console.error('usage: site_gate.mjs --root <dir holding app/> [--sections N] [--desktop-mib 32] [--mobile-mib 16] [--built]'); process.exit(2) }
const SKILL_SCRIPTS = path.dirname(fileURLToPath(import.meta.url))
const app = path.join(root, 'app')
const src = path.join(app, 'src')
const pub = path.join(app, 'public')
const briefPath = path.join(app, 'design-brief.md')
const brief = fs.existsSync(briefPath) ? fs.readFileSync(briefPath, 'utf8') : ''
const SKIP = new Set(['node_modules', 'dist', '.output', '.vinxi', '.tanstack', '.git'])
const walk = (d) => !fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => SKIP.has(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
const walk2 = (d) => !fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk2(path.join(d, e.name)) : [path.join(d, e.name)])
const CODE = /\.(tsx?|jsx?|css|html|json|md|mdx|svg)$/
const srcFiles = walk(src).filter((f) => CODE.test(f) && !/routeTree\.gen\.ts$/.test(f))
const read = (f) => fs.readFileSync(f, 'utf8')
const rel = (f) => path.relative(root, f)
const results = []
const report = (check, hits, figures = {}, fail = hits.length > 0) => { results.push({ check, fail }); console.log(JSON.stringify({ check, fail, ...figures, hits: hits.slice(0, 40), more: Math.max(0, hits.length - 40) })) }
const grepLines = (files, re) => files.flatMap((f) => read(f).split('\n').map((l, i) => re.test(l) ? `${rel(f)}:${i + 1}: ${l.trim().slice(0, 160)}` : null).filter(Boolean))

// 9f step 1: the Animation mode line.
const modeLines = brief.split('\n').filter((l) => /^Animation mode:/.test(l))
const modeValue = modeLines.length === 1 ? (/^Animation mode:\s*(animated-website|non-animated)\b/.exec(modeLines[0])?.[1] ?? 'invalid') : 'missing'
const animated = modeValue === 'animated-website'

// 1 placeholders
report('1-placeholders', [
  ...grepLines(srcFiles, /lorem ipsum|REMOVE_THIS|blank-app-v1/i),
  ...grepLines(srcFiles, /\bsrc=(""|''|\{""\}|\{''\})/),
  ...grepLines(srcFiles, /(["'`])<[^<>"'`\n]{2,80}>\1/)
])

// 2 em dash and en dash: none anywhere in app/src (comments included, so nothing visible can slip through)
report('2-dashes', grepLines(srcFiles, /[–—]/))

// 3 palette: the banned default hex families, pure black and white, one accent under 80% saturation
const BANNED = ['#f5f1ea', '#f7f5f1', '#fbf8f1', '#efeae0', '#ece6db', '#faf7f1', '#e8dfcb', '#b08947', '#b6553a', '#9a2436', '#9c6e2a', '#bc7c3a', '#7d5621', '#1a1714', '#1a1814', '#1b1814']
const userBrand = (/^Brand colours?:\s*(.+)$/mi.exec(brief)?.[1] ?? '').toLowerCase()
const cssFiles = srcFiles.filter((f) => /\.(css|tsx?|jsx?)$/.test(f))
const hexHits = []; const palette = new Set()
for (const f of cssFiles) read(f).split('\n').forEach((l, i) => {
  for (const m of l.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let h = m[0].toLowerCase(); if (h.length === 4) h = '#' + [...h.slice(1)].map((c) => c + c).join('')
    palette.add(h)
    if (BANNED.includes(h) && !userBrand.includes(h)) hexHits.push(`${rel(f)}:${i + 1}: banned default family ${h}`)
    if ((h === '#000000' || h === '#ffffff') && !userBrand.includes(h)) hexHits.push(`${rel(f)}:${i + 1}: pure ${h}`)
  }
})
const sat = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const l = (mx + mn) / 2; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)) }
const accent = /^Accent:\s*(#[0-9a-f]{6})/mi.exec(brief)?.[1]?.toLowerCase()
if (!accent) hexHits.push('design-brief.md: no "Accent: #rrggbb" line')
else if (sat(accent) >= 0.8 && !userBrand.includes(accent)) hexHits.push(`accent ${accent} saturation ${(sat(accent) * 100).toFixed(0)}% (limit < 80%)`)
report('3-palette', hexHits, { accent: accent ?? null, palette: [...palette].sort() })

// 4 eyebrows: uppercase + tracking labels, at most ceil(sections / 3); mark exempt labels data-label="exempt"
const planCount = (() => { const m = /^Section plan:?\s*$([\s\S]*?)(?=^\S[^\n]*:\s*$|^#|$(?![\s\S]))/mi.exec(brief); return m ? m[1].split('\n').filter((l) => /^\s*(\d+[.)]|[-*])\s+\S/.test(l)).length : 0 })()
const sections = Number(opt('sections', planCount))
const eyebrows = srcFiles.filter((f) => /\.(tsx|jsx)$/.test(f)).flatMap((f) => read(f).split('\n').map((l, i) => (/className=[^>]*\buppercase\b/.test(l) && /tracking-/.test(l) && !/data-label=["']exempt["']/.test(l)) ? `${rel(f)}:${i + 1}` : null).filter(Boolean))
// CSS rules count too (text-transform: uppercase with letter-spacing in one rule), for a site that has no Tailwind plugin
const cssEyebrows = srcFiles.filter((f) => /\.css$/.test(f)).flatMap((f) => [...read(f).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /text-transform:\s*uppercase/.test(m[2]) && /letter-spacing:\s*(0?\.\d+|[1-9]\d*(\.\d+)?)(em|px|rem)/.test(m[2]) && !/data-label=["']?exempt/.test(m[1])).map((m) => `${rel(f)}: ${m[1].trim().replace(/\s+/g, ' ').slice(0, 60)}`))
eyebrows.push(...cssEyebrows)
const budget = Math.ceil(sections / 3)
report('4-eyebrows', eyebrows.length > budget ? eyebrows : [], { sections, budget, counted: eyebrows.length, ...(sections ? {} : { note: 'no Section plan list in the brief and no --sections' }) }, eyebrows.length > budget || !sections)

// 5 every generated asset in public/assets is referenced; no blank src
const refText = [...srcFiles, ...walk(pub).filter((f) => /\.(webmanifest|html|json)$/.test(f)), path.join(app, 'index.html')].filter((f) => fs.existsSync(f)).map(read).join('\n')
const assets = walk(path.join(pub, 'assets'))
report('5-assets-referenced', assets.filter((f) => !refText.includes('/' + path.relative(pub, f).split(path.sep).join('/'))).map(rel), { assets: assets.length })

// 5b head kit files exist and are linked
const kitMissing = []
const has = (n) => fs.existsSync(path.join(pub, n))
for (const n of ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'site.webmanifest']) if (!has(n)) kitMissing.push(`missing app/public/${n}`)
if (!has('favicon.svg') && !(has('favicon-32.png') && has('favicon-16.png'))) kitMissing.push('missing favicon.svg or favicon-32.png + favicon-16.png')
for (const n of ['favicon.ico', 'apple-touch-icon.png', 'site.webmanifest']) if (has(n) && !refText.includes(n)) kitMissing.push(`${n} not linked in the head`)
for (const k of ['theme-color', 'og:image', 'og:title', 'og:description', 'twitter:card']) if (!refText.includes(k)) kitMissing.push(`no ${k} meta`)
report('5b-head-kit', kitMissing)

// 6 viewport units
report('6-h-screen', grepLines(srcFiles, /\bh-screen\b|\b100vh\b/))

// 7 SSR safety: no browser globals at module top level
report('7-ssr-top-level', grepLines(srcFiles.filter((f) => /\.(tsx?|jsx?)$/.test(f)), /^(?!\s)(?!\/\/)(?!\*)(?!import\b)(?!export\s+(type|interface)\b).*\b(window|document|localStorage|sessionStorage|navigator)\./))

// 8 reduced motion: any motion library or scroll effect needs a reduced-motion path
const motionFiles = srcFiles.filter((f) => /from ['"](gsap|motion|three)/.test(read(f)) || /@keyframes|ScrollTrigger/.test(read(f)))
const reducedAnywhere = srcFiles.some((f) => /prefers-reduced-motion|useReducedMotion|REDUCED_QUERY/.test(read(f)))
report('8-reduced-motion', motionFiles.length && !reducedAnywhere ? motionFiles.map(rel) : [], { motion_files: motionFiles.length })

// 9 bespoke chrome: no shared CTA class string on two CTAs, no global button utility classes
const ctaClasses = new Map()
for (const f of srcFiles.filter((x) => /\.(tsx|jsx)$/.test(x))) {
  for (const m of read(f).matchAll(/<(a|button|Link)\b[^>]*?className=(["'])([^"']+)\2/g)) {
    const k = m[3].trim().split(/\s+/).sort().join(' ')
    ctaClasses.set(k, [...(ctaClasses.get(k) ?? []), rel(f)])
  }
}
const ctaHits = [...ctaClasses].filter(([, v]) => v.length > 1).map(([k, v]) => `"${k}" on ${v.length} CTAs (${[...new Set(v)].join(', ')})`)
ctaHits.push(...grepLines(srcFiles.filter((f) => f.endsWith('.css')), /^\s*\.(btn|button|cta|btn-primary|button-primary)\b[^-]/))
report('9-cta-classes', ctaHits)

// 9b screenshot-safe reveals: nothing waits invisible for a viewport trigger
report('9b-opacity-whileinview', srcFiles.filter((f) => /whileInView/.test(read(f)) && /opacity-0|opacity:\s*0\b/.test(read(f))).map(rel))

// 9c platform branding
report('9c-branding', grepLines(srcFiles, /\bsl8\b|starthalo|higgsfield|powered by/i))

// 9e and 9f
const engineDir = path.join(src, 'components', 'scroll-scrub')
const sha = (f) => fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') : null
const modeHits = []
if (modeValue === 'missing') modeHits.push(`design-brief.md has ${modeLines.length} "Animation mode:" lines (exactly 1 required)`)
if (modeValue === 'invalid') modeHits.push(`Animation mode value is not animated-website or non-animated: ${modeLines[0]}`)
if (modeValue === 'non-animated' && !/^Animation mode:\s*non-animated;\s*reason:\s*\S.{2,}/m.test(brief)) modeHits.push('non-animated without "; reason: <the customer\'s own words>": treat as animated-website')
const world = path.join(pub, 'assets', 'world')
const clips = walk(world).filter((f) => f.endsWith('.mp4'))
const desktopClips = clips.filter((f) => !f.endsWith('-mobile.mp4'))
const mobileClips = clips.filter((f) => f.endsWith('-mobile.mp4'))
let figures9f = { mode: modeValue }
if (animated) {
  for (const n of ['scroll-scrub.tsx', 'scroll-scrub.css']) {
    const got = sha(path.join(engineDir, n)); const want = sha(path.join(SKILL_SCRIPTS, n))
    if (!got) modeHits.push(`missing app/src/components/scroll-scrub/${n}`)
    else if (want && got !== want) modeHits.push(`${n} differs from the skill's copy (the engine is never edited in a project)`)
  }
  const routeFiles = walk(path.join(src, 'routes'))
  if (!routeFiles.some((f) => /components\/scroll-scrub\/scroll-scrub/.test(read(f)))) modeHits.push('no route imports the scroll-scrub engine')
  if (!desktopClips.length) modeHits.push('no clip in app/public/assets/world/')
  for (const c of desktopClips) {
    const stem = c.slice(0, -4)
    for (const need of [`${stem}-poster.png`, `${stem}-mobile.mp4`, `${stem}-mobile-poster.png`]) if (!fs.existsSync(need)) modeHits.push(`missing ${rel(need)}`)
  }
  const scenesFile = path.join(src, 'scroll-scrub-scenes.ts')
  if (!fs.existsSync(scenesFile)) modeHits.push('missing app/src/scroll-scrub-scenes.ts')
  else {
    const s = read(scenesFile)
    if (/(["'`])<[^<>"'`\n]{1,80}>\1/.test(s)) modeHits.push('a <...> placeholder is left in scroll-scrub-scenes.ts')
    for (const m of s.matchAll(/["'](\/assets\/[^"']+)["']/g)) if (!fs.existsSync(path.join(pub, m[1]))) modeHits.push(`scenes file names ${m[1]}, which does not exist`)
  }
  if (!/^Journey shape:\s*(single-shot|multi-leg)/m.test(brief)) modeHits.push('brief has no "Journey shape:" line')
  if (!/^(Journey|Chapters):/m.test(brief)) modeHits.push('brief has no "Journey:" chapters block')
  figures9f = { ...figures9f, clips: desktopClips.length }
}
report('9f-animation-mode', modeHits, figures9f)

// A4: blob media in the CSP, byte budgets, posters are frame 1 of their encoded clip
const a4 = []; const MiB = 1024 * 1024
const sum = (fs_) => fs_.reduce((a, f) => a + fs.statSync(f).size, 0)
const dMiB = sum(desktopClips) / MiB; const mMiB = sum(mobileClips) / MiB
if (animated) {
  const cspRe = new RegExp('media' + '-src[^;"\'`]*blob:')
  const noComments = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*|<!--)/.test(l)).join('\n').replace(/['"`]\s*\+\s*['"`]/g, '')
  const cspSet = srcFiles.filter((f) => /\.(tsx?|jsx?|html)$/.test(f)).map((f) => noComments(read(f))).concat(fs.existsSync(path.join(app, 'index.html')) ? [noComments(read(path.join(app, 'index.html')))] : []).some((t) => /Content-Security-Policy/i.test(t) && cspRe.test(t))
  if (!cspSet) a4.push('no Content-Security-Policy that allows blob: for media, set in code or a meta tag on a non-comment line')
  if (dMiB > Number(opt('desktop-mib', 32))) a4.push(`desktop clips ${dMiB.toFixed(1)} MiB over ${opt('desktop-mib', 32)}`)
  if (mMiB > Number(opt('mobile-mib', 16))) a4.push(`mobile clips ${mMiB.toFixed(1)} MiB over ${opt('mobile-mib', 16)}`)
  const md5 = (input, extra = []) => { try { return execFileSync('ffmpeg', ['-v', 'error', '-i', input, ...extra, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'md5', '-'], { encoding: 'utf8' }).trim() } catch { return null } }
  for (const c of clips) {
    const poster = c.replace(/\.mp4$/, '-poster.png')
    if (!fs.existsSync(poster)) continue
    const a = md5(poster); const b = md5(c)
    if (!a || !b) a4.push(`could not decode ${rel(poster)} or its clip (ffmpeg)`)
    else if (a !== b) a4.push(`${rel(poster)} is not frame 1 of ${rel(c)}: rerun scrub_encode.sh poster on the encoded clip`)
  }
}
report('a4-scrub-delivery', a4, { desktop_mib: +dMiB.toFixed(2), mobile_mib: +mMiB.toFixed(2) })

// Metadata and cover files (steps 23, 32)
const metaHits = []
const metaPath = path.join(src, 'app-meta.json')
if (!fs.existsSync(metaPath)) metaHits.push('missing app/src/app-meta.json')
else {
  let meta = {}; try { meta = JSON.parse(read(metaPath)) } catch { metaHits.push('app-meta.json is not JSON') }
  for (const k of ['og_title', 'og_description', 'favicon_url', 'og_image_url', 'cover_image']) if (!String(meta[k] ?? '').trim()) metaHits.push(`app-meta.json ${k} is empty`)
  for (const k of ['og_image_url', 'cover_image', 'favicon_url']) { const v = String(meta[k] ?? ''); if (v.startsWith('/') && !fs.existsSync(path.join(pub, v))) metaHits.push(`${k} ${v} does not exist under app/public`) }
  if (String(meta.og_title ?? '').trim().split(/\s+/).length > 4) metaHits.push('og_title longer than 4 words')
}
report('meta-cover', metaHits)

if (flag('built')) {
  const dist = path.join(app, 'dist'); const outHits = []
  const distFiles = walk2(dist)
  if (!distFiles.length) outHits.push('no app/dist (or it is empty): run the production build first')
  else {
    const indexes = distFiles.filter((f) => /(^|[\\/])index\.html$/.test(f))
    if (!indexes.length) outHits.push('app/dist holds no index.html: pin the static prerender of / (SKILL.md step 9) and rebuild')
    if (animated && !distFiles.some((f) => /assets[\\/]world[\\/].*\.mp4$/.test(f))) outHits.push('app/dist holds no assets/world/*.mp4: the clips are not in the build')
    const newest = Math.max(0, ...[...srcFiles, ...walk(pub)].map((f) => fs.statSync(f).mtimeMs))
    const built = Math.max(0, ...distFiles.map((f) => fs.statSync(f).mtimeMs))
    if (built < newest) outHits.push('app/dist is older than the newest file in app/src or app/public: rebuild, then rerun the gate')
    var staticRoot = indexes.length ? path.dirname(indexes.sort((a, b) => a.length - b.length)[0]) : null
  }
  report('build-output', outHits, { static_root: typeof staticRoot === 'undefined' ? null : rel(staticRoot), files: distFiles.length })
}

const failed = results.filter((r) => r.fail).map((r) => r.check)
console.log(JSON.stringify({ summary: true, checks: results.length, failing: failed }))
process.exit(failed.length ? 1 : 0)
