#!/usr/bin/env node
// page.mjs: reads one public page word for word and saves its words unchanged in
// artifacts/<product>/sources/, so every later step quotes and cites only what the page says. The page
// tool (WebFetch) answers with its own summary, whose words are not the page's (SHORTCOMINGS №170,
// №173); this script fetches the page itself and changes no word. Any site: it saves the page's title,
// its meta description and its visible text (scripts, styles and templates dropped).
//   node page.mjs <url> --out artifacts/<product>/sources [--dry-run] | --selftest | --help
// Saves <out>/<host>-<path>.md. Its first line holds a sha256 of the rest, so a validator counts only a
// saved page whose hash still matches. It prints the page's links on the same site (text and address,
// at most 40, likely pages first: pricing, customers, docs), so the next page is found without the page
// tool. No prompts; JSON on stdout; exit 1 when the page will not open or holds no readable text; safe to
// re-run (a new read replaces the file); --dry-run reads the page and writes nothing.
// The checks every c03 validator shares live here too (exact, checkQuotes, checkLinks, checkTags): every
// quotation is found word for word in the exact sources, every cited page was saved by this script, and a
// "(source: <where>, "<words>")" tag names the source its words are in. Copied into each c03 skill.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

const HELP = 'usage: node page.mjs <url> --out artifacts/<product>/sources [--dry-run] | --selftest\n  prints {"ok","url","opened","title","file","characters","links":[{"text","url"}],"next"}; read the saved file for the words'
const UA = 'Mozilla/5.0 (compatible; SL8PageReader/1.0)'
const MARK = 'page.mjs v1'
export const sha = s => crypto.createHash('sha256').update(s).digest('hex')

// ---- HTML to text (deterministic: the same page always gives the same text) ----
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„', hellip: '…', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', yen: '¥', cent: '¢', deg: '°', times: '×', divide: '÷', laquo: '«', raquo: '»', larr: '←', rarr: '→', uarr: '↑', darr: '↓', aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä', atilde: 'ã', aring: 'å', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', otilde: 'õ', oslash: 'ø', uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü', ccedil: 'ç', ntilde: 'ñ', szlig: 'ß', shy: '', zwj: '‍', zwnj: '‌', thinsp: ' ', ensp: ' ', emsp: ' ' }
const fromCode = (n, raw) => { try { return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : raw } catch { return raw } }
export const decode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (raw, e) => e[0] === '#' ? fromCode(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10), raw) : (NAMED[e] ?? NAMED[e.toLowerCase()] ?? raw))
// a tag, with quoted attribute values that may hold ">" (x-init="f().then(r => r.json())")
const TAG = /<(?:"[^"]*"|'[^']*'|[^'">])*>/g
const BLOCK = 'address|article|aside|blockquote|button|caption|dd|details|dialog|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|label|li|main|nav|ol|option|p|pre|section|summary|table|tbody|td|tfoot|th|thead|tr|ul'
export function textOf (html) {
  const s = String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|template|svg|iframe|object|head)\b(?:"[^"]*"|'[^']*'|[^'">])*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi, '\n')
    .replace(/<li\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi, '\n- ')
    .replace(new RegExp(`</?(?:${BLOCK})\\b(?:"[^"]*"|'[^']*'|[^'">])*>`, 'gi'), '\n')
    .replace(TAG, '')
  return decode(s).replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t\f\v ]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
const attr = (tag, name) => { const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag); return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null }
export function visibleText (html) {
  const h = String(html)
  const title = textOf(((/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(h) || [])[1] || '').replace(/\n/g, ' '))
  const meta = (h.match(/<meta\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi) || []).find(t => /\sname\s*=\s*["']?description["']?/i.test(t))
  const description = meta ? (attr(meta, 'content') || '').replace(/\s+/g, ' ').trim() : ''
  const body = (/<body\b[^>]*>([\s\S]*)<\/body>/i.exec(h) || [])[1] ?? h
  return { title, description, text: textOf(body) }
}
const LIKELY = /pric|plan|customer|case|stor(y|ies)|testimonial|about|compar|\bvs\b|alternative|feature|integrat|partner|marketplace|app|docs|help|review/i
// the page's own links on the same site: likely next pages first, then page order; at most `max`
export function linksOf (html, base, max = 40) {
  let host; try { host = new URL(base).hostname.replace(/^www\./, '') } catch { return [] }
  const seen = new Set(), all = []
  for (const m of String(html).matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(m[1], 'href'); if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue
    let u; try { u = new URL(href, base) } catch { continue }
    if (!/^https?:$/.test(u.protocol) || u.hostname.replace(/^www\./, '') !== host) continue
    u.hash = ''; const k = u.toString(); if (seen.has(k)) continue; seen.add(k)
    all.push({ text: textOf(m[2]).replace(/\s+/g, ' ').slice(0, 80) || '(no text)', url: k })
  }
  return [...all.filter(l => LIKELY.test(l.text + ' ' + l.url)), ...all.filter(l => !LIKELY.test(l.text + ' ' + l.url))].slice(0, max)
}
export function fileName (url) {
  const u = new URL(url)
  const slug = `${u.hostname.replace(/^www\./, '')}${u.pathname}${u.search}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  return `${slug || 'page'}.md`
}
export function render ({ url, opened, status, bytes, at, title, description, text }) {
  const head = [`# ${title || url} (web page)`, '', `- URL: ${url}`, ...(opened && opened !== url ? [`- Opened as: ${opened}`] : []), `- Read: ${at} by page.mjs (HTTP ${status}, ${bytes} bytes)`, "- From: the page's visible text", '']
  const rest = `${head.join('\n')}\n${description ? `## Description\n${description}\n\n` : ''}## Text\n${text}\n`
  return `<!-- ${MARK} · sha256:${sha(rest)} · the page's own words, unchanged; editing this file breaks the hash -->\n${rest}`
}
// verifySource(text): 'page' for a file page.mjs saved that nobody changed, 'edited' when its hash no
// longer matches, null for any other file
export function verifySource (text) {
  const m = /^<!-- page\.mjs v1 · sha256:([0-9a-f]{64}) ·[^\n]*-->\n/.exec(String(text))
  if (!m) return null
  return sha(String(text).slice(m[0].length)) === m[1] ? 'page' : 'edited'
}

// ---- comparing words and addresses ----
// norm: how quotes are compared. Case, spacing, curly or straight quotes, dash and ellipsis forms and
// markdown (emphasis, code marks, a link's address) differ between a page and a quote of it without
// changing a word; nothing else is forgiven.
export const norm = t => String(t).replace(/<[^>]+>/g, ' ').replace(/!?\[([^\]]*)\]\([^)\s]*\)/g, '$1').replace(/`/g, '').replace(/[“”„‟″]/g, '"').replace(/[‘’‚‛′]/g, "'").replace(/[‐‑‒–—―−]/g, '-').replace(/…/g, '...').replace(/[​-‍﻿]/g, '').replace(/\*+/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
// one page, one key: no scheme, no www., no #fragment, no trailing slash
export const canonUrl = u => { try { const x = new URL(String(u).trim()); return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/+$/, '')}${x.search}`.toLowerCase() } catch { return String(u).trim().toLowerCase() } }
export const urlsIn = t => [...String(t || '').matchAll(/https?:\/\/[^\s)<>\]`"'*|]+/g)].map(m => m[0].replace(/[.,;:!?]+$/, ''))

// exact({ project, request, also }): the words a deliverable may quote, and the pages it may cite.
//   pages      every file in <project>/sources/ that page.mjs saved and nobody changed (its URL and words)
//   trusted    the saved requests (<project>/inputs/request-*.md and --request) and the person's attached
//              files (artifacts/attachments/): quotable, and their links citable
//   also       earlier deliverables of this bot in the project: quotable only
// Any other file in sources/ is refused: a file the agent wrote is not a page's words.
export function exact ({ project, request = null, also = [] } = {}) {
  const refused = [], pages = [], trusted = [], files = []
  const srcDir = project ? path.join(project, 'sources') : null
  if (srcDir && fs.existsSync(srcDir)) {
    for (const e of fs.readdirSync(srcDir).sort()) {
      const f = path.join(srcDir, e)
      if (e.startsWith('.') || !fs.statSync(f).isFile()) continue
      const t = fs.readFileSync(f, 'utf8'), v = verifySource(t)
      if (v !== 'page') { refused.push(`sources/${e}: ${v === 'edited' ? 'changed after page.mjs saved it; read the page again' : 'not saved by page.mjs (only pages it read go in sources/)'}`); continue }
      const top = t.split(/^## /m)[0]
      const urls = [...top.matchAll(/^- (?:URL|Opened as): (\S+)/gm)].map(m => canonUrl(m[1]))
      pages.push({ file: f, urls, text: norm(t) }); files.push(f)
    }
  }
  const add = f => { if (f && fs.existsSync(f) && fs.statSync(f).isFile() && !files.includes(f)) { trusted.push({ file: f, raw: fs.readFileSync(f, 'utf8') }); files.push(f) } }
  if (project && fs.existsSync(path.join(project, 'inputs'))) for (const e of fs.readdirSync(path.join(project, 'inputs')).sort()) if (/^request-.*\.(md|txt)$/.test(e)) add(path.join(project, 'inputs', e))
  if (request) add(path.resolve(request))
  const att = project ? path.join(project, '..', 'attachments') : null
  if (att && fs.existsSync(att)) for (const e of fs.readdirSync(att).sort()) if (!e.startsWith('.') && /\.(md|txt|html?|eml|csv)$/i.test(e)) add(path.join(att, e))
  const others = also.filter(f => f && fs.existsSync(f)).map(f => ({ file: f, text: norm(fs.readFileSync(f, 'utf8')) }))
  const trustedText = norm(trusted.map(x => x.raw).join('\n'))
  const requestText = norm(trusted.filter(x => !/[\\/]attachments[\\/]/.test(x.file)).map(x => x.raw).join('\n'))
  const all = [...pages.map(p => p.text), trustedText, ...others.map(o => o.text)].join('\n')
  const citable = new Set([...pages.flatMap(p => p.urls), ...trusted.flatMap(x => urlsIn(x.raw).map(canonUrl))])
  return { pages, refused, files: [...files, ...others.map(o => o.file)], all, requestText, citable, saved: new Set(pages.flatMap(p => p.urls)) }
}

// quotesIn(md): every text in double quotation marks ("…" or “…”), outside code and links. A table row is
// read on its own; other text by paragraph or bullet, so a quote may wrap a line.
export function quotesIn (md) {
  const blocks = []; let cur = []
  const flush = () => { if (cur.length) blocks.push(cur.join(' ')); cur = [] }
  for (const line of String(md).split('\n')) {
    if (/^\s*\|/.test(line)) { flush(); blocks.push(line); continue }
    if (!line.trim()) { flush(); continue }
    if (/^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>)/.test(line)) flush()
    cur.push(line.trim())
  }
  flush()
  const out = [], unclosed = []
  for (const b of blocks) {
    const s = b.replace(/`[^`]*`/g, ' ').replace(/\]\([^)]*\)/g, '] ').replace(/https?:\/\/\S+/g, ' ')
    for (const m of s.matchAll(/“([^“”]*)”/g)) out.push(m[1])
    const straight = s.replace(/“[^“”]*”/g, ' ')
    const n = (straight.match(/"/g) || []).length
    if (n % 2) unclosed.push(straight.replace(/\s+/g, ' ').trim().slice(0, 70))
    for (const m of straight.matchAll(/"([^"]*)"/g)) out.push(m[1])
  }
  return { quotes: out.map(q => q.trim()).filter(q => /[\p{L}\p{N}]/u.test(q)), unclosed }
}
const bare = q => norm(q).replace(/^[\s.,;:!?'"-]+|[\s.,;:!?'"-]+$/g, '')
// checkQuotes(md, ex): every quotation is word for word in the exact sources
export function checkQuotes (md, ex) {
  const { quotes, unclosed } = quotesIn(md), errors = []
  for (const u of unclosed.slice(0, 5)) errors.push(`a quotation mark is not closed: "${u}…"`)
  const missing = [...new Set(quotes.filter(q => !ex.all.includes(bare(q))))]
  for (const q of missing.slice(0, 12)) errors.push(`"${q.slice(0, 80)}" is not word for word in a page page.mjs saved, the request or an attached file: quote only words copied exactly from them; write search phrases, titles and names you propose in italics, not in quotation marks`)
  if (missing.length > 12) errors.push(`${missing.length - 12} more quotations are not word for word in the sources`)
  return errors
}
// checkLinks(text, ex, { saved }): every page cited was read with page.mjs; with saved false, a link the
// request or an attached file gives may also be cited (it is the person's own)
export function checkLinks (text, ex, { saved = false } = {}) {
  const ok = saved ? ex.saved : ex.citable
  return [...new Set(urlsIn(text))].filter(u => !ok.has(canonUrl(u))).slice(0, 10)
    .map(u => `${u} is cited, but page.mjs never saved it (it is not in sources/): read it with page.mjs, or leave the link out${saved ? '' : ' (a search result or the page tool is not a read)'}`)
}
// a "(source: <where>, "<the words>")" tag
export const TAG_RE = /\(source:\s*([^"“”()]+?)\s*,\s*["“]([^"“”]+)["”]\s*\)/gi
export const tagsIn = t => [...String(t).matchAll(TAG_RE)].map(m => ({ where: m[1].trim(), words: m[2].trim() }))
// checkTags(text, ex): a tag that names a page holds words from that page, and one that names the request
// holds the request's words (words found nowhere are already reported by checkQuotes)
export function checkTags (text, ex) {
  const errors = []
  for (const { where, words } of tagsIn(text)) {
    const w = bare(words); if (!ex.all.includes(w)) continue
    const u = urlsIn(where)[0]
    if (u) { const p = ex.pages.find(x => x.urls.includes(canonUrl(u))); if (p && !p.text.includes(w)) errors.push(`"${words.slice(0, 60)}" is not on ${u}: name the page the words are on`) }
    else if (/\brequest\b/i.test(where) && !ex.requestText.includes(w)) errors.push(`"${words.slice(0, 60)}" is not in the request: name the page the words are on`)
  }
  return errors
}

export async function read (url, { timeoutMs = 30000 } = {}) {
  let target; try { target = new URL(url) } catch { return { ok: false, url, errors: [`not a web address: ${url}`] } }
  if (!/^https?:$/.test(target.protocol)) return { ok: false, url, errors: [`not a web address: ${url}`] }
  let res, html
  try {
    res = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,text/plain;q=0.8', 'accept-language': 'en' } })
    html = await res.text()
  } catch (e) { return { ok: false, url, errors: [`the page did not open: ${e.cause?.code || e.name || 'error'} ${e.message}`.trim()] } }
  if (!res.ok) return { ok: false, url, errors: [`the page did not open: HTTP ${res.status}`] }
  const opened = res.url || target.toString(), type = res.headers.get('content-type') || ''
  if (type && !/html|xml|text\/plain/i.test(type)) return { ok: false, url, errors: [`not a web page (${type.split(';')[0]}): ask the person for its text`] }
  const v = /text\/plain/i.test(type) ? { title: '', description: '', text: html.replace(/\r\n?/g, '\n').trim() } : visibleText(html)
  if (!v.text) return { ok: false, url, errors: ['the page opened but holds no readable text (a sign-in, consent or script-only page)'] }
  // a site may answer an agent with its page as markdown (text/plain): its words are kept as sent, and its links read from them
  const links = /text\/plain/i.test(type) ? linksOf(v.text.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>'), opened) : linksOf(html, opened)
  return { ok: true, url, opened, status: res.status, bytes: Buffer.byteLength(html), at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), ...v, links }
}

function selftest () {
  const t = []
  const html = `<html><head><title>Ledgerline | Receipts for bookkeepers</title><meta name="description" content="Chase receipts &amp; match them."><style>p{}</style><script>var x="<p>no</p>"</script></head><body><nav><a href="/pricing">Pricing</a> <a href="https://www.ledgerline.example/blog/">Blog</a> <a href="https://other.example/x">Elsewhere</a> <a href="mailto:a@b.c">Mail</a></nav><div x-init="fetch('/c').then(r => r.json())">Plans from $49</div><h1>Month-end in 3 days</h1><p>Used by&nbsp;400 firms.<br>“We closed in 3 days,” says Ana.</p><ul><li>Weekly chase</li><li>One queue</li></ul><template><p>hidden</p></template><!-- c --></body></html>`
  const v = visibleText(html)
  t.push(['visible text only: scripts, styles, templates and comments dropped; a ">" inside an attribute is no tag end', v.text === 'Pricing Blog Elsewhere Mail\n\nPlans from $49\n\nMonth-end in 3 days\n\nUsed by 400 firms.\n“We closed in 3 days,” says Ana.\n\n- Weekly chase\n\n- One queue' && v.title === 'Ledgerline | Receipts for bookkeepers' && v.description === 'Chase receipts & match them.'])
  const l = linksOf(html, 'https://ledgerline.example/')
  t.push(['links: the same site only, likely pages first, no mail links', l.length === 2 && l[0].url === 'https://ledgerline.example/pricing' && l[1].url === 'https://www.ledgerline.example/blog/'])
  t.push(['file names come from the link', fileName('https://www.Ledgerline.example/Pricing/?plan=pro') === 'ledgerline-example-pricing-plan-pro.md' && fileName('https://ledgerline.example') === 'ledgerline-example.md'])
  const saved = render({ url: 'https://ledgerline.example', opened: 'https://www.ledgerline.example/', status: 200, bytes: 10, at: '2026-01-01T00:00:00Z', ...v })
  t.push(['a saved page verifies, and any edit breaks its hash', verifySource(saved) === 'page' && verifySource(saved.replace('400 firms', '500 firms')) === 'edited' && verifySource('# notes\n') === null])
  t.push(['norm forgives quote, dash, space and markdown forms only', norm('“Best” — list…') === norm('"best" - **list**...') && norm('meets our [app rules](https://x.example/r)') === norm('meets our app rules') && norm('aisle / shelf') !== norm('aisle or shelf')])
  t.push(['one page, one key', canonUrl('https://www.Ledgerline.example/pricing/#plans') === canonUrl('http://ledgerline.example/pricing') && canonUrl('https://ledgerline.example/a') !== canonUrl('https://ledgerline.example/b')])
  const q = quotesIn('Intro "one two" and “three\nfour”.\n\n| a | "cell" |\n|---|---|\n\n- `"code"` and [x](https://y.example/"z") and *phrase*\n- an "open quote here')
  t.push(['quotes: straight and curly, across a wrapped line, in table rows; not in code or links; an unclosed one reported', [...q.quotes].sort().join('|') === 'cell|one two|three four' && q.unclosed.length === 1])
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c03-page-')), proj = path.join(tmp, 'artifacts', 'ledgerline')
  fs.mkdirSync(path.join(proj, 'sources'), { recursive: true }); fs.mkdirSync(path.join(proj, 'inputs')); fs.mkdirSync(path.join(tmp, 'artifacts', 'attachments'))
  fs.writeFileSync(path.join(proj, 'sources', fileName('https://ledgerline.example')), saved)
  fs.writeFileSync(path.join(proj, 'inputs', 'request-icp.md'), 'Define our ICP\nProduct: Ledgerline, https://ledgerline.example\nBest customers: firms of 3-10 staff (see https://ledgerline.example/customers)')
  fs.writeFileSync(path.join(tmp, 'artifacts', 'attachments', 'reviews.txt'), 'Saves us a day a month.')
  fs.writeFileSync(path.join(proj, 'icp.md'), '# ICP\nPrimary segment: "small bookkeeping firms"')
  const ex = exact({ project: proj, also: [path.join(proj, 'icp.md')] })
  t.push(['exact: saved pages, requests, attachments and earlier deliverables are quotable', !ex.refused.length && ex.pages.length === 1 && ['we closed in 3 days', 'firms of 3-10 staff', 'saves us a day a month', 'small bookkeeping firms'].every(w => ex.all.includes(w))])
  const doc = 'Proof: "We closed in 3 days," says Ana. Firms say "Saves us a day a month." Plans "from $49". Category: "receipt chasing software".'
  t.push(['checkQuotes: a quote not word for word anywhere is an error; trailing punctuation is forgiven', (() => { const e = checkQuotes(doc, ex); return e.length === 1 && /receipt chasing software/.test(e[0]) })()])
  t.push(['checkLinks: a saved page or the request\'s own link is citable; a page never saved is not', checkLinks('see https://www.ledgerline.example/ and https://ledgerline.example/customers', ex).length === 0 && checkLinks('see https://ledgerline.example/customers', ex, { saved: true }).length === 1 && /never saved/.test(checkLinks('https://tallybook.example/track', ex)[0])])
  t.push(['checkTags: words must be on the page the tag names', checkTags('(source: https://ledgerline.example, "Used by 400 firms") (source: the request, "firms of 3-10 staff")', ex).length === 0 && checkTags('(source: the request, "Used by 400 firms")', ex).length === 1])
  fs.writeFileSync(path.join(proj, 'sources', 'notes.md'), 'paraphrased: used by many firms')
  fs.writeFileSync(path.join(proj, 'sources', fileName('https://ledgerline.example')), saved.replace('400 firms', '500 firms'))
  const bad = exact({ project: proj })
  t.push(['exact: a file the agent wrote, or an edited page, is refused', bad.refused.length === 2 && bad.refused.some(r => /not saved by page\.mjs/.test(r)) && bad.refused.some(r => /changed after/.test(r)) && !bad.all.includes('500 firms')])
  fs.rmSync(tmp, { recursive: true, force: true })
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
  const url = a.find((x, i) => !x.startsWith('--') && a[i - 1] !== '--out')
  const dir = opt('--out'), dry = a.includes('--dry-run')
  if (!url || (!dir && !dry)) out({ ok: false, errors: ['give a page link and --out artifacts/<product>/sources; see --help'] }, 2)
  const r = await read(url)
  if (!r.ok) out(r, 1)
  const file = dir ? path.join(dir, fileName(url)) : null
  if (!dry) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, render(r)) }
  out({ ok: true, url: r.url, opened: r.opened, title: r.title, file, wrote: !dry, characters: [...r.text].length, links: r.links, next: dry ? 'dry run: nothing written' : `read ${file}; state facts and quote only from it` }, 0)
}
