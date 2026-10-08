#!/usr/bin/env node
// fetch-pages.mjs: fetches the public pages of the trial path and saves what a visitor can read on each,
// so every quote in the review can be checked against what was read (job card: Review our trial path).
// For each URL it writes <out>/<slug>.md: a Source line, the technical facts, the links toward sign-up,
// trial, demo and pricing, then the page's visible text. The HTML is read by a tokenizer that keeps quoted
// attribute values whole, so a ">" inside one never ends a tag and page code never becomes page text
// (SHORTCOMINGS №181). It reads only what the HTML itself shows:
//   - text: the words a visitor can read when the page loads. Scripts, styles, templates, <noscript>,
//     <svg>, the <head> (the title is a fact, not text) and elements the HTML hides (the hidden attribute,
//     a display:none or visibility:hidden style, screen-reader-only classes) are left out. CSS files are
//     not read, so what a stylesheet hides cannot be known;
//   - links: an <a> with a plain href. An address page script sets (:href, x-bind:href, v-bind:href,
//     [href], ng-href) is counted, never read as a link;
//   - forms: method and action, whether page script handles the submit, the submit button's own words
//     and whether it is disabled (or disabled until page script enables it), a captcha, and each
//     visible field with its label, type, placeholder and required mark;
//   - text page script fills in (x-text, v-text, ng-bind …): counted, with the HTML's default words.
// Pages built only by script come back nearly empty; that is reported, never guessed.
//   node fetch-pages.mjs <url> [<url> …] --out artifacts/<product>/pages [--dry-run] | --selftest | --help
// No prompts; JSON on stdout (a summary per page, bounded); safe to re-run (same URL, same file).
import fs from 'node:fs'
import path from 'node:path'

const HELP = 'usage: node fetch-pages.mjs <url> [<url> …] --out artifacts/<product>/pages [--dry-run] | --selftest\n  prints {"ok","pages":[{"url","file","status","title","words","forms","captcha","pathLinks","scriptLinks","thin"}],"errors":[…]}; read each saved file for its facts and words'
const PATH_WORDS = /sign ?up|signup|register|trial|start|get started|demo|pricing|plans|book|try|create (an )?account|log ?in|sign in/i
const UA = 'Mozilla/5.0 (compatible; SL8-trial-path-review/1.1; reads public pages only)'

// ---- entities ----
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„', hellip: '…', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', yen: '¥', cent: '¢', deg: '°', times: '×', divide: '÷', laquo: '«', raquo: '»', larr: '←', rarr: '→', uarr: '↑', darr: '↓', check: '✓', aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä', atilde: 'ã', aring: 'å', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', otilde: 'õ', oslash: 'ø', uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü', ccedil: 'ç', ntilde: 'ñ', szlig: 'ß', shy: '', zwj: '', zwnj: '', thinsp: ' ', ensp: ' ', emsp: ' ' }
const fromCode = (n, raw) => { try { return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : raw } catch { return raw } }
export const decode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (raw, e) => e[0] === '#' ? fromCode(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10), raw) : (NAMED[e] ?? NAMED[e.toLowerCase()] ?? raw))
const clean = s => String(s ?? '').replace(/[\s ​]+/g, ' ').trim()
export const slug = u => { try { const x = new URL(u); const p = (x.hostname.replace(/^www\./, '') + x.pathname).replace(/\/+$/, ''); return p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'page' } catch { return 'page' } }

// ---- what the HTML says about each element ----
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const RAW = new Set(['script', 'style', 'title', 'textarea', 'xmp', 'noembed', 'noframes']) // their content is not markup
const SKIP = new Set(['head', 'template', 'noscript', 'svg', 'math', 'iframe', 'object', 'canvas', 'video', 'audio']) // no visible text
const BLOCK = new Set('address article aside blockquote button caption dd details dialog div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr label legend li main nav ol option p pre section summary table tbody td tfoot th thead tr ul'.split(' '))
const bound = (attrs, t) => [`:${t}`, `x-bind:${t}`, `v-bind:${t}`, `[${t}]`, `[attr.${t}]`, `ng-${t}`, `bind:${t}`].find(n => attrs.has(n)) || null
const FILL = ['x-text', 'x-html', 'v-text', 'v-html', ':textcontent', ':innerhtml', 'x-bind:textcontent', 'x-bind:innerhtml', '[textcontent]', '[innerhtml]', 'ng-bind', 'ng-bind-html']
const fills = attrs => FILL.some(n => attrs.has(n)) || /\b(text|html)\s*:/.test(attrs.get('data-bind') || '')
const submitByScript = n => n === 'onsubmit' || /^(@|x-on:|v-on:)submit\b/.test(n) || /^(phx-submit|hx-post|hx-get|hx-put|hx-patch|wire:submit|\(ngsubmit\)|\(submit\))/.test(n)
const hiddenBy = attrs => attrs.has('hidden') || /(^|;)\s*(display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attrs.get('style') || '') || /(^|\s)(sr-only|visually-hidden)(\s|$)/.test(attrs.get('class') || '')
const CAPTCHA = /captcha|turnstile/i
function captchaMark (name, attrs) {
  if (CAPTCHA.test(name)) return `a <${name}> element`
  for (const k of ['id', 'class', 'name', 'src']) { const v = attrs.get(k); if (v && CAPTCHA.test(v)) return `${k} "${clean(v).slice(0, 60)}"` }
  return attrs.has('data-sitekey') ? 'an element with a data-sitekey' : null
}

// htmlToPage(html, url): the page's facts, links and visible text, read the same way every time
export function htmlToPage (html, url) {
  const src = String(html), low = src.toLowerCase(), n = src.length
  const NAME = /[a-zA-Z][^\s/>]*/y, WS = /\s*/y, ATTR = /[^\s"'>/=]+/y, UNQ = /[^\s>]*/y
  const out = [], stack = [], h1 = [], links = [], forms = [], labelsFor = new Map(), fillsSeen = []
  const scriptLinks = new Map()
  let pending = '', hideDepth = 0, title = null, desc = '', viewport = false, pageCaptcha = null
  let h1Buf = null, a = null, form = null, label = null, button = null
  const push = s => out.push(s)
  const collectors = () => [a?.text, label?.text, button?.text, h1Buf, ...stack.filter(e => e.fill).map(e => e.fill)].filter(Boolean)
  const onText = raw => {
    if (hideDepth > 0) return
    const t = decode(raw).replace(/[\s ​]+/g, ' ')
    if (!t.trim()) { if (out.length && !/\s$/.test(out[out.length - 1])) push(' '); return }
    if (pending) { push(pending); pending = '' }
    push(t)
    for (const c of collectors()) c.push(t)
  }
  const closeA = () => {
    if (!a) return
    const t = clean(a.text.join(' ')) || clean(a.aria)
    if (!a.hidden) {
      if (a.href) links.push({ text: t || '(no text)', href: a.href.trim(), script: !!a.script })
      else if (a.script) scriptLinks.set(t || '(no text)', (scriptLinks.get(t || '(no text)') || 0) + 1)
    }
    a = null
  }
  const addField = (type, attrs) => {
    const f = { type, id: attrs.get('id') || null, wrap: label && !label.field ? label : null, aria: attrs.get('aria-label') || '', placeholder: clean(attrs.get('placeholder')), name: attrs.get('name') || '', required: attrs.has('required') || attrs.get('aria-required') === 'true' }
    if (f.wrap) label.field = f
    form.fields.push(f)
  }
  const onVoid = (name, attrs) => {
    if (name === 'br' || name === 'hr') { push('\n'); return }
    if (name === 'meta') { const m = (attrs.get('name') || '').toLowerCase(); if (m === 'description' && !desc) desc = clean(attrs.get('content')); if (m === 'viewport') viewport = true; return }
    if (name !== 'input') return
    const type = (attrs.get('type') || 'text').toLowerCase(), hidden = hideDepth > 0 || hiddenBy(attrs)
    if (type === 'submit' || type === 'image') {
      if (form && !hidden) form.submits.push({ label: clean(attrs.get('value') || attrs.get('alt') || attrs.get('aria-label') || 'Submit'), disabled: attrs.has('disabled') ? 'html' : bound(attrs, 'disabled') ? 'script' : null })
      if (!hidden && attrs.get('value')) { push('\n'); onText(attrs.get('value')); push('\n') }
    } else if (type === 'button' || type === 'reset') { if (!hidden && attrs.get('value')) { push('\n'); onText(attrs.get('value')); push('\n') } }
    else if (type !== 'hidden' && form && !hidden) addField(type, attrs)
  }
  const onOpen = (name, attrs, selfClose) => {
    const mark = captchaMark(name, attrs)
    if (mark) { if (form && !form.captcha) form.captcha = mark; else if (!form && !pageCaptcha) pageCaptcha = mark }
    if (RAW.has(name)) return
    if (VOID.has(name)) { onVoid(name, attrs); return }
    if (selfClose) return
    const hide = SKIP.has(name) || hiddenBy(attrs)
    const e = { name, hide, fill: fills(attrs) ? [] : null }
    if (e.fill) fillsSeen.push(e.fill)
    stack.push(e)
    if (hide) hideDepth++
    if (BLOCK.has(name)) push('\n')
    if (/^h[1-6]$/.test(name)) { pending = '## '; if (name === 'h1') h1Buf = [] }
    if (name === 'li') pending = '- '
    if (name === 'a') { closeA(); a = { href: attrs.has('href') ? attrs.get('href') : null, script: bound(attrs, 'href'), text: [], aria: attrs.get('aria-label') || attrs.get('title') || '', hidden: hideDepth > 0 } }
    if (name === 'form') { form = hideDepth > 0 ? null : { method: (attrs.get('method') || 'get').toLowerCase(), action: attrs.get('action') ?? null, actionScript: bound(attrs, 'action'), submitScript: [...attrs.keys()].filter(submitByScript), submits: [], fields: [], captcha: null }; if (form) forms.push(form) }
    if (name === 'label') label = { for: attrs.get('for') || null, text: [], field: null }
    if (name === 'button' && form && hideDepth === 0) { const type = (attrs.get('type') || 'submit').toLowerCase(); button = { type, text: [], aria: attrs.get('aria-label') || attrs.get('value') || '', disabled: attrs.has('disabled') ? 'html' : bound(attrs, 'disabled') ? 'script' : null } }
    if ((name === 'select') && form && hideDepth === 0) addField('select', attrs)
  }
  const afterClose = e => {
    if (e.hide) hideDepth--
    if (BLOCK.has(e.name)) { push('\n'); pending = '' }
    if (e.name === 'h1' && h1Buf) { const t = clean(h1Buf.join(' ')); if (t && h1.length < 5) h1.push(t); h1Buf = null }
    if (e.name === 'a') closeA()
    if (e.name === 'label' && label) { label.done = clean(label.text.join(' ')); if (label.for) labelsFor.set(label.for, label.done); label = null }
    if (e.name === 'button' && button) { if (button.type === 'submit' && form) form.submits.push({ label: clean(button.text.join(' ')) || clean(button.aria), disabled: button.disabled }); button = null }
    if (e.name === 'form') form = null
  }
  const onClose = name => {
    if (VOID.has(name)) { if (name === 'br') push('\n'); return }
    let k = stack.length - 1
    while (k >= 0 && stack[k].name !== name) k--
    if (k < 0) return // a stray end tag
    while (stack.length > k) afterClose(stack.pop())
  }
  const onRaw = (name, content) => {
    if (name === 'title' && title === null && !stack.some(e => e.name === 'svg')) title = clean(decode(content))
    if (name === 'textarea' && form && hideDepth === 0) addField('textarea', new Map())
  }

  let i = 0
  while (i < n) {
    const lt = src.indexOf('<', i)
    if (lt === -1) { onText(src.slice(i)); break }
    if (lt > i) onText(src.slice(i, lt))
    if (src.startsWith('<!--', lt)) { const e = src.indexOf('-->', lt + 4); i = e === -1 ? n : e + 3; continue }
    if (src[lt + 1] === '!' || src[lt + 1] === '?') { const e = src.indexOf('>', lt + 2); i = e === -1 ? n : e + 1; continue }
    const close = src[lt + 1] === '/'
    NAME.lastIndex = lt + (close ? 2 : 1)
    const nm = NAME.exec(src)
    if (!nm) { onText('<'); i = lt + 1; continue }
    const name = nm[0].toLowerCase(), attrs = new Map()
    let j = NAME.lastIndex, selfClose = false
    while (j < n) { // attributes: a quoted value is read whole, whatever it holds
      WS.lastIndex = j; WS.exec(src); j = WS.lastIndex
      if (j >= n) break
      if (src[j] === '>') { j++; break }
      if (src[j] === '/') { if (src[j + 1] === '>') { selfClose = true; j += 2; break } j++; continue }
      ATTR.lastIndex = j
      const an = ATTR.exec(src)
      if (!an) { j++; continue }
      j = ATTR.lastIndex
      WS.lastIndex = j; WS.exec(src)
      let k = WS.lastIndex, value = ''
      if (src[k] === '=') {
        k++; WS.lastIndex = k; WS.exec(src); k = WS.lastIndex
        const q = src[k]
        if (q === '"' || q === "'") { const e = src.indexOf(q, k + 1); value = src.slice(k + 1, e === -1 ? n : e); j = e === -1 ? n : e + 1 } else { UNQ.lastIndex = k; value = UNQ.exec(src)?.[0] || ''; j = k + value.length }
      }
      const key = an[0].toLowerCase()
      if (!attrs.has(key)) attrs.set(key, decode(value))
    }
    i = j
    if (close) { onClose(name); continue }
    onOpen(name, attrs, selfClose)
    if (RAW.has(name) && !selfClose) {
      const e = low.indexOf(`</${name}`, i)
      onRaw(name, src.slice(i, e === -1 ? n : e))
      const gt = e === -1 ? -1 : src.indexOf('>', e)
      i = gt === -1 ? n : gt + 1
    }
  }
  while (stack.length) afterClose(stack.pop())
  closeA()

  const text = out.join('').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l && l !== '-' && l !== '##').join('\n')
  const words = text.split('\n').map(l => l.replace(/^(## |- )/, '')).join(' ').split(/\s+/).filter(Boolean).length
  const seen = new Map()
  for (const l of links) {
    if (!l.href || l.href.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(l.href)) continue
    let abs = l.href; try { abs = new URL(l.href, url).href } catch {}
    if (!(PATH_WORDS.test(l.text) || PATH_WORDS.test(l.href))) continue
    const k = `${l.text}|${abs}`
    if (seen.has(k)) seen.get(k).times++; else seen.set(k, { text: l.text, href: abs, times: 1, script: l.script })
  }
  const formsOut = forms.map(f => ({
    method: f.method, action: f.action, actionScript: f.actionScript, submitScript: f.submitScript, submit: f.submits[0] || null, captcha: f.captcha,
    fields: f.fields.map(x => ({ label: clean(x.wrap?.done ?? '') || (x.id && labelsFor.get(x.id)) || clean(x.aria) || x.placeholder || x.name || x.type, type: x.type, placeholder: x.placeholder, required: x.required })),
  }))
  return {
    title: title || '', desc, viewport, h1, forms: formsOut, pageCaptcha,
    pathLinks: [...seen.values()].slice(0, 40),
    scriptLinks: [...scriptLinks.entries()].map(([t, times]) => ({ text: t, times })),
    fills: { count: fillsSeen.length, defaults: fillsSeen.map(x => clean(x.join(' '))).filter(Boolean).slice(0, 6) },
    text, words, thin: words < 80 && !formsOut.length,
  }
}

const q = s => `"${s}"`
export function formLine (x, i, pageCaptcha = null) {
  const parts = [`- Form ${i + 1}: ${x.method.toUpperCase()} ${x.action || '(this page)'}${x.actionScript ? ` (page script sets its action: ${x.actionScript})` : ''}`]
  if (x.submitScript.length) parts.push(`page script handles the submit (${x.submitScript.join(', ')}); what it does is not in the HTML`)
  parts.push(x.submit ? `submit button ${q(x.submit.label)}${x.submit.disabled === 'html' ? ', disabled in the HTML' : x.submit.disabled === 'script' ? ', disabled until page script enables it' : ''}` : 'no submit button in the HTML')
  parts.push(x.captcha ? `captcha: yes, in the form (${x.captcha})` : pageCaptcha ? `captcha: a captcha script is on the page (${pageCaptcha})` : 'captcha: none in the HTML')
  parts.push(`fields: ${x.fields.map(y => `${y.label} (${y.type}${y.required ? ', required' : ''}${y.placeholder ? `; placeholder ${q(y.placeholder)}` : ''})`).join(', ') || 'none in the HTML'}`)
  return parts.join('; ')
}

export function render (url, status, p, at = new Date().toISOString()) {
  const f = p.forms.map((x, i) => formLine(x, i, p.pageCaptcha)).join('\n') || '- No form in the HTML (a form built by script does not show here)'
  const sl = p.scriptLinks.length ? `\n- Links whose address page script sets (no address in the HTML, so where they lead is not known): ${p.scriptLinks.map(l => `${q(l.text)}${l.times > 1 ? ` (${l.times} times)` : ''}`).join(', ')}` : ''
  const fl = p.fills.count ? `\n- Text page script fills in: ${p.fills.count} place(s); the words below are the HTML's defaults, a browser may show others${p.fills.defaults.length ? ` (${p.fills.defaults.map(q).join(', ')})` : ''}` : ''
  const links = p.pathLinks.map(l => `- ${q(l.text)} → ${l.href}${l.times > 1 ? ` (${l.times} times)` : ''}${l.script ? ' (page script may change this address)' : ''}`).join('\n') || '- none found'
  return `Source: ${url} · fetched ${at} · HTTP ${status}\n\n## Facts\n- Title: ${p.title || '(none)'}\n- Description: ${p.desc || '(none)'}\n- Viewport tag: ${p.viewport ? 'yes' : 'no'}\n- H1: ${p.h1.map(q).join('; ') || '(none)'}\n- Words of text: ${p.words} (visible text only; the title is not counted)${p.thin ? ' (thin: the page may be built by script; say so, never guess what it shows)' : ''}\n${f}${sl}${fl}\n\n## Links on the path (in page order; repeats counted)\n${links}\n\n## Text\n${p.text}\n`
}

async function main (argv) {
  const i = argv.indexOf('--out'), out = i > -1 ? argv[i + 1] : null, dry = argv.includes('--dry-run')
  const urls = argv.filter((a, j) => !a.startsWith('--') && argv[j - 1] !== '--out')
  if (!out || !urls.length) return [{ ok: false, errors: ['give one or more URLs and --out <dir>; see --help'] }, 2]
  const pages = [], errors = []
  for (const u of urls.slice(0, 15)) {
    let url; try { url = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).href } catch { errors.push(`not a URL: ${u}`); continue }
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) })
      const html = await res.text(), p = htmlToPage(html, res.url || url), file = path.join(out, `${slug(res.url || url)}.md`)
      if (!dry) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(file, render(url, res.status, p)) }
      pages.push({ url, finalUrl: res.url || url, file, status: res.status, title: p.title, words: p.words, forms: p.forms.length, captcha: p.forms.some(x => x.captcha) || !!p.pageCaptcha, pathLinks: p.pathLinks.length, scriptLinks: p.scriptLinks.reduce((s, l) => s + l.times, 0), thin: p.thin })
      if (res.status >= 400) errors.push(`${url}: HTTP ${res.status}`)
    } catch (e) { errors.push(`${url}: ${e.name === 'TimeoutError' ? 'timed out after 20 s' : e.message}`) }
  }
  if (urls.length > 15) errors.push(`only the first 15 of ${urls.length} URLs were fetched`)
  return [{ ok: pages.length > 0 && pages.every(p => p.status < 400), pages, errors, dryRun: dry, next: dry ? 'dry run: nothing written' : "read each saved file's Facts and Text before you quote it" }, pages.length ? 0 : 1]
}

function selftest () {
  const html = `<!doctype html><html><head><title>Ledgerline &amp; you</title><meta name="description" content="Invoices"><meta name="viewport" content="width=device-width"><script src="https://captcha.example/api.js"></script></head><body>
<nav><ul><li><a href="/pricing">Pricing</a></li><li><a href="/signup">Start free trial</a></li><li><a href="/blog">Blog</a></li></ul><span class="sr-only">Open menu</span></nav>
<h1>Send your first invoice in <em>two minutes</em></h1><p>Used by 300 teams.</p><script>var x = "Hidden script text"; if (a < b) {}</script>
<div x-data="{ n: 0 }" x-init="fetch('/api/plans').then(r => r.json()).then(d => n = d.n)"><p>Plans from <span x-text="price(n)">$12</span> a month</p></div>
<a :href="ok && '/signup' || '/contact'" x-text="ok && 'Start free trial' || 'Contact us'" @click="track('cta', n > 1)">Start free trial</a>
<div hidden><p>Hidden promo text</p><a href="/signup-secret">Secret trial</a></div><p style="display: none">Invisible line</p>
<form action="/signup" method="post" @submit.prevent="send()">
<label for="em">Work email</label><input id="em" type="email" name="email" required placeholder="you@company.com">
<label>Phone <input type="tel" name="phone" required></label><input type="hidden" name="t"><input type="text" name="hp" style="display:none">
<button type="button" aria-label="Show password">*</button><div class="g-recaptcha" data-sitekey="k"></div>
<button type="submit" x-bind:disabled="!ready">Create account</button></form>
<a href="/signup">Start free trial</a></body></html>`
  const p = htmlToPage(html, 'https://ledgerline.example/')
  const md = render('https://ledgerline.example/', 200, p, '2026-10-07T00:00:00Z')
  const f = p.forms[0] || {}
  const t = [
    ['title and entities decoded; the title is a fact, not page text', p.title === 'Ledgerline & you' && !/Ledgerline & you/.test(p.text)],
    ['viewport, description and h1 found (inline tags inside the h1 kept on one line)', p.viewport && p.desc === 'Invoices' && p.h1[0] === 'Send your first invoice in two minutes' && /^## Send your first invoice in two minutes$/m.test(p.text)],
    ['a ">" inside a quoted attribute does not leak page code into the text', !/r\.json|=>|d\.n|track\(/.test(p.text) && /^Plans from \$12 a month$/m.test(p.text)],
    ['script, hidden, display:none and screen-reader-only text is left out', !/Hidden script text|Hidden promo text|Invisible line|Open menu/.test(p.text) && /Used by 300 teams\./.test(p.text)],
    ['path links: plain hrefs only, absolute, in page order, repeats counted; the blog and a hidden link left out', p.pathLinks.length === 2 && p.pathLinks[0].href === 'https://ledgerline.example/pricing' && p.pathLinks[1].href === 'https://ledgerline.example/signup' && p.pathLinks[1].times === 2 && !p.pathLinks.some(l => /blog|secret|&&/.test(l.href))],
    ['an address page script sets (:href) is counted, never read as a link', p.scriptLinks.length === 1 && p.scriptLinks[0].text === 'Start free trial' && /Links whose address page script sets.*"Start free trial"/.test(md)],
    ['text page script fills in is counted with its default words', p.fills.count === 2 && p.fills.defaults.join('|') === '$12|Start free trial' && /Text page script fills in: 2 place/.test(md)],
    ['a form: labelled visible fields with required marks; hidden and display:none fields left out', f.fields?.length === 2 && f.fields[0].label === 'Work email' && f.fields[0].required && f.fields[0].placeholder === 'you@company.com' && f.fields[1].label === 'Phone' && f.fields[1].type === 'tel'],
    ['the submit is the submit button (not a button before it), disabled until page script enables it', f.submit?.label === 'Create account' && f.submit.disabled === 'script' && /submit button "Create account", disabled until page script enables it/.test(md)],
    ['a captcha in the form and page script handling the submit are reported', /captcha: yes, in the form \(class "g-recaptcha"\)/.test(md) && /page script handles the submit \(@submit\.prevent\)/.test(md)],
    ['words count visible text only, not the title or heading marks', p.words === p.text.replace(/^(## |- )/gm, '').split(/\s+/).filter(Boolean).length && p.words === 33],
    ['the file starts with its source', md.startsWith('Source: https://ledgerline.example/ · fetched')],
    ['slug from the URL', slug('https://www.ledgerline.example/signup/') === 'ledgerline-example-signup'],
  ]
  const failed = t.filter(x => !x[1]).map(x => x[0])
  process.stdout.write(JSON.stringify({ ok: !failed.length, cases: t.length, failed }) + '\n'); process.exit(failed.length ? 1 : 0)
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) selftest()
  else { const [r, code] = await main(a); process.stdout.write(JSON.stringify(r, null, 2) + '\n'); process.exit(code) }
}
