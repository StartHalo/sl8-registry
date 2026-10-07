#!/usr/bin/env node
// page.mjs: reads one public page exactly and saves its words unchanged, so every later step quotes
// the page word for word. The page tool (WebFetch) answers with a summary, caps quotes at 125
// characters and can return a large page empty (SHORTCOMINGS №159); this script fetches the page
// itself and changes no word:
//   - an App Store or Google Play page: the listing's own fields from the page's structured data
//     (name or title, subtitle or short description, description, what's new, category, rating,
//     awards, developer, featured reviews, and the store's similar apps);
//   - any other page (a website, a help page, an email online): its visible text.
//   node page.mjs <url> --out artifacts/<app>/sources [--lang en-US] [--dry-run] | --selftest | --help
// Saves <out>/<name>.md (app-store-<id>.md, google-play-<package>.md, else <host>-<path>.md). Its first
// line holds a sha256 of the rest: validators quote only from saved pages whose hash still matches,
// from the saved request and from attached files (exactText below). --lang sets the page's language
// (Accept-Language, and Google Play's hl when the link has none). No prompts; JSON on stdout; exit 1
// when the page will not open or holds no readable text; safe to re-run (a new read replaces the
// file); --dry-run reads the page and writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

const HELP = 'usage: node page.mjs <url> --out artifacts/<app>/sources [--lang en-US] [--dry-run] | --selftest\n  prints {"ok","kind","title","file","from","fields":{"<field>":<characters>},"similar":[…],"warnings":[…]}; read the saved file for the words'
const UA = 'Mozilla/5.0 (compatible; SL8PageReader/1.0)'
const MARK = 'page.mjs v1'
export const sha = s => crypto.createHash('sha256').update(s).digest('hex')

// ---- HTML to text (deterministic: the same page always gives the same text) ----
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„', hellip: '…', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', yen: '¥', cent: '¢', deg: '°', times: '×', divide: '÷', laquo: '«', raquo: '»', larr: '←', rarr: '→', uarr: '↑', darr: '↓', aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä', atilde: 'ã', aring: 'å', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', otilde: 'õ', oslash: 'ø', uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü', ccedil: 'ç', ntilde: 'ñ', szlig: 'ß', shy: '', zwj: '‍', zwnj: '‌', thinsp: ' ', ensp: ' ', emsp: ' ' }
const fromCode = (n, raw) => { try { return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : raw } catch { return raw } }
export const decode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (raw, e) => e[0] === '#' ? fromCode(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10), raw) : (NAMED[e] ?? NAMED[e.toLowerCase()] ?? raw))
const BLOCK = 'address|article|aside|blockquote|button|caption|dd|details|dialog|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|label|li|main|nav|ol|option|p|pre|section|summary|table|tbody|td|tfoot|th|thead|tr|ul'
export function textOf (html) {
  const s = String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|template|svg|iframe|object|head)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(new RegExp(`</?(?:${BLOCK})\\b[^>]*>`, 'gi'), '\n')
    .replace(/<[^>]*>/g, '')
  return decode(s).replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t\f\v ]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
const clean = v => (v == null ? '' : String(v).replace(/\r\n?/g, '\n').replace(/ /g, ' ').trim())

// ---- what the page is, and where its copy is saved ----
export function kindOf (url) {
  let u; try { u = new URL(url) } catch { return null }
  if (/(^|\.)apps\.apple\.com$|(^|\.)itunes\.apple\.com$/i.test(u.hostname) && /\/id\d+/.test(u.pathname)) return 'app-store'
  if (/^play\.google\.com$/i.test(u.hostname) && /\/store\/apps\/details/.test(u.pathname) && u.searchParams.get('id')) return 'google-play'
  return 'page'
}
export function fileName (url, kind = kindOf(url)) {
  const u = new URL(url)
  if (kind === 'app-store') return `app-store-${/\/id(\d+)/.exec(u.pathname)[1]}.md`
  if (kind === 'google-play') return `google-play-${u.searchParams.get('id').replace(/[^\w.-]/g, '-')}.md`
  const slug = `${u.hostname.replace(/^www\./, '')}${u.pathname}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  return `${slug || 'page'}.md`
}
// --lang en-US: Google Play shows the listing in hl's language (not Accept-Language), so it is added
// when the link has none; App Store links carry their storefront in the path and are kept as given.
export function prepare (url, kind = kindOf(url), lang = null) {
  const u = new URL(url)
  if (kind === 'google-play' && lang && !u.searchParams.has('hl')) u.searchParams.set('hl', lang)
  return u.toString()
}

// ---- structured data ----
function jsonLd (html) {
  const out = []
  for (const m of html.matchAll(/<script\b[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const d = JSON.parse(m[1]); for (const x of [].concat(d)) out.push(...(x && x['@graph'] ? x['@graph'] : [x])) } catch { /* a broken block is skipped */ }
  }
  return out
}
const appLd = html => jsonLd(html).find(d => d && /(Software|Mobile|Web)Application/.test([].concat(d['@type'] || []).join(' '))) || {}
function appleData (html) {
  const m = /<script\b[^>]*id=["']?serialized-server-data["']?[^>]*>([\s\S]*?)<\/script>/i.exec(html)
  if (!m) return {}
  let d; try { d = JSON.parse(m[1]) } catch { return {} }
  const direct = d?.data?.[0]?.data
  if (direct?.lockup && direct?.shelfMapping) return direct
  const queue = [d]
  for (let i = 0; i < queue.length && i < 200000; i++) { const o = queue[i]; if (o.lockup && o.shelfMapping) return o; for (const v of Object.values(o)) if (v && typeof v === 'object') queue.push(v) }
  return {}
}
const round1 = v => (Number.isFinite(+v) ? (Math.round(+v * 10) / 10).toFixed(1) : null)

function appStore (html) {
  const ld = appLd(html), a = appleData(html), sm = a.shelfMapping || {}, f = []
  const put = (k, v) => { v = clean(v); if (v) f.push([k, v]) }
  put('Name', ld.name || a.lockup?.title)
  put('Subtitle', a.lockup?.subtitle)
  put('Description', ld.description || (sm.description?.items || []).map(i => i?.paragraph?.text).filter(Boolean).join('\n\n'))
  const ver = sm.mostRecentVersion?.items?.[0]
  put("What's new", ver?.text)
  if (ver?.primarySubtitle) { const d = new Date(ver.secondarySubtitle || ''); put('Version', `${ver.primarySubtitle}${isNaN(d) ? '' : `, ${d.toISOString().slice(0, 10)}`}`) }
  put('Category', [].concat(ld.genre || ld.applicationCategory || []).join(', '))
  const badges = sm.informationRibbon?.items || []
  const rating = badges.find(b => b?.type === 'rating')
  put('Rating', rating?.longCaption || (ld.aggregateRating ? `${round1(ld.aggregateRating.ratingValue)} (${ld.aggregateRating.reviewCount || ld.aggregateRating.ratingCount} ratings)` : ''))
  if (badges.some(b => b?.type === 'editorsChoice')) put('Awards', "Editors' Choice")
  const chart = badges.find(b => b?.type === 'chartPosition')
  if (chart?.content?.position) put('Chart position', `${chart.content.position}${chart.caption ? ` (${chart.caption})` : ''}`)
  put("Editors' notes", (sm.editorsChoiceProductReviews?.items || []).map(i => i?.review?.notes).filter(Boolean).join('\n\n'))
  put('Developer', ld.author?.name || a.lockup?.developerName)
  put('Featured reviews', (sm.allProductReviews?.items || []).map(i => i?.review).filter(r => r?.contents).slice(0, 6).map(r => `- ${r.rating ? `${r.rating} stars, ` : ''}"${clean(r.title)}" (${clean(r.reviewerName) || 'a reviewer'}): ${clean(r.contents)}`).join('\n'))
  const similar = (sm.similarItems?.items || []).map(i => `${clean(i?.title)}${i?.developerName ? ` (${clean(i.developerName)})` : ''}${i?.subtitle ? `: ${clean(i.subtitle)}` : ''}`).filter(s => s && !s.startsWith(' ('))
  put('Similar apps', similar.map(s => `- ${s}`).join('\n'))
  return { title: clean(ld.name || a.lockup?.title), fields: f, similar, listing: f.some(x => x[0] === 'Name') && f.some(x => x[0] === 'Description') }
}

function googlePlay (html, pkg) {
  const ld = appLd(html), f = []
  const put = (k, v) => { v = clean(v); if (v) f.push([k, v]) }
  const first = re => (re.exec(html) || [])[1] || ''
  put('Title', ld.name || textOf(first(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)))
  put('Short description', ld.description || decode(first(/<meta\b[^>]*itemprop=["']description["'][^>]*content=["']([^"']*)["']/i)))
  put('Full description', textOf(first(/<div\b[^>]*data-g-id=["']description["'][^>]*>([\s\S]*?)<\/div>/i)))
  put("What's new", textOf(first(/<div\b[^>]*itemprop=["']description["'][^>]*>([\s\S]*?)<\/div>/i)))
  const code = clean(ld.applicationCategory)
  const label = code ? decode(first(new RegExp(`href=["']/store/apps/category/${code.replace(/[^\w]/g, '')}["'][^>]*aria-label=["']([^"']*)["']`, 'i'))) : ''
  put('Category', label || code)
  const r = ld.aggregateRating
  put('Rating', r ? `${round1(r.ratingValue)} out of 5 (${r.ratingCount || r.reviewCount} ratings)` : '')
  put('Developer', ld.author?.name)
  // similar apps: the cards in the "Similar apps" section, else every other app's card by another developer
  const cards = seg => [...seg.matchAll(/<a\b[^>]*href=["']\/store\/apps\/details\?id=([\w.]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({ id: m[1], lines: textOf(m[2]).split('\n').filter(Boolean) })).filter(c => c.id !== pkg && c.lines.length)
  const h = /<h2\b[^>]*>(?:\s*<[^>]+>)*\s*Similar (?:apps|games)\s*(?:<[^>]+>\s*)*<\/h2>/i.exec(html)
  let found = h ? cards(html.slice(h.index, html.indexOf('</section>', h.index) + 1 || undefined)) : []
  if (!found.length) found = cards(html).filter(c => c.lines[1] && c.lines[1] !== clean(ld.author?.name))
  const seen = new Set(), similar = []
  for (const c of found) if (!seen.has(c.id)) { seen.add(c.id); similar.push(`${c.lines[0]}${c.lines[1] ? ` (${c.lines[1]})` : ''}`) }
  put('Similar apps', similar.slice(0, 12).map(s => `- ${s}`).join('\n'))
  return { title: clean(ld.name), fields: f, similar: similar.slice(0, 12), listing: f.some(x => x[0] === 'Title') && f.some(x => x[0] === 'Full description') }
}

export function visibleText (html) {
  const title = textOf(((/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || '').replace(/\n/g, ' '))
  const body = (/<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html) || [])[1] ?? html
  return { title, text: textOf(body) }
}

// parse(html, url): the page's words as fields, from its structured data when it is a store listing
export function parse (html, url, kind = kindOf(url)) {
  const warnings = []
  if (kind === 'app-store' || kind === 'google-play') {
    const r = kind === 'app-store' ? appStore(html) : googlePlay(html, new URL(url).searchParams.get('id'))
    if (r.listing) return { kind, from: "the page's structured data (its listing fields, word for word)", title: r.title, fields: r.fields, similar: r.similar, warnings }
    warnings.push('no listing data on the page (an app not sold in this country, or a changed page): saved its visible text instead')
  }
  const v = visibleText(html)
  return { kind, from: "the page's visible text", title: v.title, fields: v.text ? [['Text', v.text]] : [], similar: [], warnings }
}

export function render ({ url, opened, status, bytes, at, kind, from, title, fields }) {
  const label = { 'app-store': 'App Store page', 'google-play': 'Google Play page', page: 'web page' }[kind] || 'page'
  const head = [`# ${title || url} (${label})`, '', `- URL: ${url}`, ...(opened && opened !== url ? [`- Opened as: ${opened}`] : []), `- Read: ${at} by page.mjs (HTTP ${status}, ${bytes} bytes)`, `- From: ${from}`, '']
  const rest = `${head.join('\n')}\n${fields.map(([k, v]) => `## ${k}\n${v}\n`).join('\n')}`
  return `<!-- ${MARK} · sha256:${sha(rest)} · the page's own words, unchanged; editing this file breaks the hash -->\n${rest}`
}

// verifySource(text): 'page' for a file page.mjs saved and nobody changed, 'edited' when its hash no
// longer matches, null for any other file
export function verifySource (text) {
  const m = /^<!-- page\.mjs v1 · sha256:([0-9a-f]{64}) ·[^\n]*-->\n/.exec(String(text))
  if (!m) return null
  return sha(String(text).slice(m[0].length)) === m[1] ? 'page' : 'edited'
}

// norm: how quotes are compared. Case, spacing, curly or straight quotes, dash and ellipsis forms
// differ between a page and a quote of it without changing a word; nothing else is forgiven.
export const norm = t => String(t).replace(/<[^>]+>/g, ' ').replace(/[“”„‟″]/g, '"').replace(/[‘’‚‛′]/g, "'").replace(/[‐‑‒–—―−]/g, '-').replace(/…/g, '...').replace(/[​-‍﻿]/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

// exactText(paths, { trusted }): the words later steps may quote. A file counts when page.mjs saved it
// and its hash still matches, when the person attached it (artifacts/attachments/), or when it is named
// in trusted (the saved request; a deliverable of this bot). Every other file is refused, with why.
export function exactText (paths, { trusted = [] } = {}) {
  const trust = new Set(trusted.filter(Boolean).map(f => path.resolve(f)))
  const seen = new Set(), files = [], refused = []
  const add = f => {
    const abs = path.resolve(f)
    if (seen.has(abs)) return
    seen.add(abs)
    const t = fs.readFileSync(abs, 'utf8'), v = verifySource(t)
    if (v === 'page' || trust.has(abs) || /[\\/]attachments[\\/]/.test(abs)) files.push({ file: f, text: t })
    else refused.push(`${f}: ${v === 'edited' ? 'changed after page.mjs saved it; read the page again' : 'not an exact source (quote only from pages page.mjs saved, the request or attached files)'}`)
  }
  for (const p of [...paths, ...trusted]) {
    if (!p || !fs.existsSync(p)) continue
    if (fs.statSync(p).isDirectory()) { for (const e of fs.readdirSync(p).sort()) { const f = path.join(p, e); if (!e.startsWith('.') && fs.statSync(f).isFile() && /\.(md|txt|html?|eml|csv)$/i.test(e)) add(f) } } else add(p)
  }
  return { files: files.map(x => x.file), refused, text: norm(files.map(x => x.text).join('\n')) }
}

export async function read (url, { lang = null, timeoutMs = 30000 } = {}) {
  const kind = kindOf(url)
  if (!kind) return { ok: false, url, errors: [`not a web address: ${url}`] }
  const target = prepare(url, kind, lang)
  let res, html
  try {
    res = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': UA, 'accept-language': lang ? `${lang},en;q=0.8` : 'en' } })
    html = await res.text()
  } catch (e) { return { ok: false, url, errors: [`the page did not open: ${e.cause?.code || e.name || 'error'} ${e.message}`.trim()] } }
  if (!res.ok) return { ok: false, url, errors: [`the page did not open: HTTP ${res.status}`] }
  const opened = res.url || target, type = res.headers.get('content-type') || ''
  if (kind !== 'page' && new URL(opened).hostname !== new URL(target).hostname) return { ok: false, url, errors: [`the store sent ${new URL(opened).hostname} instead of the listing (a consent or sign-in page)`] }
  if (type && !/html|xml|text\/plain/i.test(type)) return { ok: false, url, errors: [`not a web page (${type.split(';')[0]}): send its text instead`] }
  const p = /text\/plain/i.test(type) ? { kind, from: 'the page as plain text', title: '', fields: clean(html) ? [['Text', clean(html)]] : [], similar: [], warnings: [] } : parse(html, url, kind)
  if (!p.fields.length) return { ok: false, url, errors: ['the page opened but holds no readable text (a sign-in, consent or script-only page)'], warnings: p.warnings }
  return { ok: true, url, opened, status: res.status, bytes: Buffer.byteLength(html), at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), ...p }
}

function selftest () {
  const t = []
  const ld = o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`
  const apple = `<html><head><title>Quillo on the App Store</title>${ld({ '@type': 'SoftwareApplication', name: 'Quillo: Shared Shopping List', description: 'Quillo is one list for the whole house.\n\nFeatures:\n- Lists sort themselves by aisle', genre: ['Shopping', 'Productivity'], aggregateRating: { ratingValue: 4.71, reviewCount: 1200 }, author: { name: 'Quillo Ltd' } })}</head><body><script type="application/json" id="serialized-server-data">${JSON.stringify({ data: [{ data: { lockup: { title: 'Quillo: Shared Shopping List', subtitle: 'One list for the whole house' }, shelfMapping: { mostRecentVersion: { items: [{ text: 'Shared budgets are here.', primarySubtitle: 'Version 3.2', secondarySubtitle: 'Thu Sep 24 2026 20:25:21 GMT+0000' }] }, informationRibbon: { items: [{ type: 'rating', longCaption: '4.7, 1.2K Ratings' }, { type: 'editorsChoice' }, { type: 'chartPosition', caption: 'Shopping', content: { position: '3' } }] }, allProductReviews: { items: [{ review: { title: 'Saves arguments', contents: 'We finally shop once a week.', rating: 5, reviewerName: 'Sam' } }] }, similarItems: { items: [{ title: 'ListMate', developerName: 'ListMate Inc', subtitle: 'Grocery lists' }, { title: 'Basket', developerName: 'Basket Co' }] } } } }] })}</script><p>Visible</p></body></html>`
  const a = parse(apple, 'https://apps.apple.com/us/app/quillo/id000123')
  const af = Object.fromEntries(a.fields)
  t.push(['App Store: name, subtitle and the full description come from the page data, unchanged', af.Name === 'Quillo: Shared Shopping List' && af.Subtitle === 'One list for the whole house' && af.Description === 'Quillo is one list for the whole house.\n\nFeatures:\n- Lists sort themselves by aisle'])
  t.push(["App Store: what's new, version, rating, awards, reviews and similar apps", af["What's new"] === 'Shared budgets are here.' && af.Version === 'Version 3.2, 2026-09-24' && af.Rating === '4.7, 1.2K Ratings' && af.Awards === "Editors' Choice" && af['Chart position'] === '3 (Shopping)' && /"Saves arguments" \(Sam\): We finally shop once a week\./.test(af['Featured reviews']) && a.similar.join('|') === 'ListMate (ListMate Inc): Grocery lists|Basket (Basket Co)'])
  const play = `<html><head>${ld({ '@type': 'SoftwareApplication', name: 'Quillo', description: 'One list for the whole house &amp; more', applicationCategory: 'SHOPPING', aggregateRating: { ratingValue: '4.66', ratingCount: '980' }, author: { name: 'Quillo Ltd' } })}</head><body><a href="/store/apps/category/SHOPPING" aria-label="Shopping &amp; Lists"></a><div class="x" data-g-id="description" inert>Quillo is one list.<br><br><b>Why it works</b><br>* &quot;Best list&quot; it&#39;s sorted 🛒</div><section><h2><span>What’s new</span></h2><div itemprop="description">Budgets are here</div></section><section><h2 class="h"><span>Similar apps</span></h2><a href="/store/apps/details?id=com.listmate"><div><span>ListMate</span></div><div><span>ListMate Inc</span></div><span>4.1</span></a><a href="/store/apps/details?id=com.quillo.app"><div>Quillo</div></a></section></body></html>`
  const g = parse(play, 'https://play.google.com/store/apps/details?id=com.quillo.app')
  const gf = Object.fromEntries(g.fields)
  t.push(['Google Play: title, short and full description, entities decoded and line breaks kept', gf.Title === 'Quillo' && gf['Short description'] === 'One list for the whole house &amp; more' && gf['Full description'] === 'Quillo is one list.\n\nWhy it works\n* "Best list" it\'s sorted 🛒'])
  t.push(["Google Play: what's new, category label, rating, similar apps without the app itself", gf["What's new"] === 'Budgets are here' && gf.Category === 'Shopping & Lists' && gf.Rating === '4.7 out of 5 (980 ratings)' && g.similar.join('|') === 'ListMate (ListMate Inc)'])
  const web = parse('<html><head><title>Quillo | Home</title><style>p{}</style></head><body><nav>Menu</nav><script>var x="<p>no</p>"</script><h1>One list</h1><p>For the whole&nbsp;house.<br>Free.</p><ul><li>Aisles</li><li>Offline</li></ul><!-- hidden --></body></html>', 'https://quillo.example/about')
  t.push(['any other page: visible text only, scripts, styles and comments dropped', web.kind === 'page' && web.title === 'Quillo | Home' && web.fields[0][1] === 'Menu\n\nOne list\n\nFor the whole house.\nFree.\n\n- Aisles\n\n- Offline'])
  t.push(['a store page with no listing data falls back to its visible text, with a warning', (() => { const x = parse('<html><body><p>This app is not available in your country.</p></body></html>', 'https://apps.apple.com/us/app/x/id9'); return x.fields[0][0] === 'Text' && x.warnings.length === 1 })()])
  t.push(['file names come from the link', fileName('https://apps.apple.com/us/app/quillo/id000123?l=en') === 'app-store-000123.md' && fileName('https://play.google.com/store/apps/details?id=com.quillo.app&hl=en') === 'google-play-com.quillo.app.md' && fileName('https://www.quillo.example/blog/Launch-Day/') === 'quillo-example-blog-launch-day.md'])
  t.push(['--lang sets Google Play\'s hl only when the link has none', prepare('https://play.google.com/store/apps/details?id=a.b', 'google-play', 'fr-CA').endsWith('hl=fr-CA') && prepare('https://play.google.com/store/apps/details?id=a.b&hl=de', 'google-play', 'fr-CA').endsWith('hl=de') && prepare('https://apps.apple.com/ca/app/x/id1', 'app-store', 'fr-CA') === 'https://apps.apple.com/ca/app/x/id1'])
  const saved = render({ url: 'https://apps.apple.com/us/app/quillo/id000123', status: 200, bytes: 10, at: '2026-01-01T00:00:00Z', ...a })
  t.push(['a saved page verifies, and any edit breaks its hash', verifySource(saved) === 'page' && verifySource(saved.replace('aisle', 'aisles')) === 'edited' && verifySource('# notes\n') === null])
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c02-page-')), src = path.join(tmp, 'app', 'sources'), att = path.join(tmp, 'attachments')
  fs.mkdirSync(src, { recursive: true }); fs.mkdirSync(att)
  fs.writeFileSync(path.join(src, 'app-store-000123.md'), saved)
  fs.writeFileSync(path.join(att, 'onboarding.txt'), 'Welcome aboard!')
  fs.writeFileSync(path.join(tmp, 'app', 'request.md'), 'Copy: Never forget the milk')
  fs.writeFileSync(path.join(tmp, 'app', 'copy.md'), 'paraphrased: one list for the house')
  const ok = exactText([src, att], { trusted: [path.join(tmp, 'app', 'request.md')] })
  const bad = exactText([src, path.join(tmp, 'app', 'copy.md')])
  fs.writeFileSync(path.join(src, 'app-store-000123.md'), saved.replace('aisle', 'aisles'))
  const edited = exactText([src])
  fs.rmSync(tmp, { recursive: true, force: true })
  t.push(['exactText: saved pages, attachments and the request count', ok.files.length === 3 && !ok.refused.length && ok.text.includes('welcome aboard!') && ok.text.includes('never forget the milk') && ok.text.includes(norm('Lists sort themselves by aisle'))])
  t.push(['exactText: a file the agent wrote, or an edited page, is refused', bad.refused.length === 1 && /not an exact source/.test(bad.refused[0]) && edited.refused.length === 1 && /changed after/.test(edited.refused[0])])
  t.push(['norm forgives quote, dash and space forms only', norm('“Best” — list…') === norm('"best" - list...') && norm('aisle / shelf') !== norm('aisle or shelf')])
  const failed = t.filter(x => !x[1]).map(x => x[0])
  return { ok: !failed.length, cases: t.length, failed }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  const out = (r, code) => { console.log(JSON.stringify(r, null, 2)); process.exit(code) }
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) { const r = selftest(); out(r, r.ok ? 0 : 1) }
  const opt = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null }
  const url = a.find((x, i) => !x.startsWith('--') && !['--out', '--lang'].includes(a[i - 1]))
  const dir = opt('--out'), dry = a.includes('--dry-run')
  if (!url || (!dir && !dry)) out({ ok: false, errors: ['give a page link and --out artifacts/<app>/sources; see --help'] }, 2)
  const r = await read(url, { lang: opt('--lang') })
  if (!r.ok) out(r, 1)
  const file = dir ? path.join(dir, fileName(url, r.kind)) : null
  if (!dry) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, render(r)) }
  out({ ok: true, url: r.url, opened: r.opened, kind: r.kind, title: r.title, file, wrote: !dry, from: r.from, fields: Object.fromEntries(r.fields.map(([k, v]) => [k, [...v].length])), similar: r.similar.slice(0, 10), warnings: r.warnings, next: dry ? 'dry run: nothing written' : `read ${file} and quote only from it` }, 0)
}
