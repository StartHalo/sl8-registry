#!/usr/bin/env node
// fetch-pages.mjs: fetches the public pages of the trial path and saves each as text with its source,
// so every quote in the review can be checked against what was read (job card: Review our trial path).
// For each URL it writes <out>/<slug>.md: a Source line, the technical facts (title, description,
// viewport, h1s, forms and their fields, links toward sign-up, trial, demo and pricing), then the
// page text. Pages built only by script come back nearly empty; that is reported, never guessed.
//   node fetch-pages.mjs <url> [<url> …] --out artifacts/<product>/pages [--dry-run] | --selftest | --help
// No prompts; JSON on stdout (a summary per page, bounded); safe to re-run (same URL, same file).
import fs from 'node:fs'
import path from 'node:path'

const HELP = 'usage: node fetch-pages.mjs <url> [<url> …] --out artifacts/<product>/pages [--dry-run] | --selftest\n  prints {"ok","pages":[{"url","file","status","title","words","forms","pathLinks","thin"}],"errors":[…]}'
const PATH_WORDS = /sign ?up|signup|register|trial|start|get started|demo|pricing|plans|book|try|create (an )?account|log ?in|sign in/i
const UA = 'Mozilla/5.0 (compatible; SL8-trial-path-review/1.0; reads public pages only)'
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', copy: '©', reg: '®', trade: '™' }
const decode = s => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e.toLowerCase()] ?? m))
const strip = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const attr = (tag, name) => { const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag); return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null }
export const slug = u => { try { const x = new URL(u); const p = (x.hostname.replace(/^www\./, '') + x.pathname).replace(/\/+$/, ''); return p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'page' } catch { return 'page' } }

export function htmlToPage (html, url) {
  const head = (/<head[\s\S]*?<\/head>/i.exec(html) || [''])[0]
  const title = strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || ['', ''])[1])
  const desc = attr((/<meta[^>]+name=["']description["'][^>]*>/i.exec(head) || [''])[0], 'content')
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(head)
  const body = html.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  const h1 = [...body.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => strip(m[1])).filter(Boolean).slice(0, 5)
  const forms = [...body.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)].map(m => {
    const fields = [...m[2].matchAll(/<(input|select|textarea)\b([^>]*)>/gi)].map(f => ({ tag: f[1].toLowerCase(), type: (attr(f[2], 'type') || f[1]).toLowerCase(), name: attr(f[2], 'name') || attr(f[2], 'id') || attr(f[2], 'placeholder') || '', required: /\brequired\b/i.test(f[2]) })).filter(f => !['hidden', 'submit', 'button'].includes(f.type))
    const submit = strip((/<button\b[^>]*>([\s\S]*?)<\/button>/i.exec(m[2]) || ['', ''])[1]) || attr((/<input\b[^>]*type=["']submit["'][^>]*>/i.exec(m[2]) || [''])[0], 'value') || ''
    return { action: attr(m[1], 'action') || '', method: (attr(m[1], 'method') || 'get').toLowerCase(), fields, submit }
  })
  const links = []
  for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const text = strip(m[2]), href = attr(m[1], 'href') || ''
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue
    let abs = href; try { abs = new URL(href, url).href } catch {}
    if (PATH_WORDS.test(text) || PATH_WORDS.test(href)) links.push({ text: text || '(no text)', href: abs })
  }
  const seen = new Set(), pathLinks = links.filter(l => { const k = l.text + '|' + l.href; if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 40)
  const text = decode(body.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/header|\/footer|\/nav|\/button|\/a)\b[^>]*>/gi, '\n').replace(/<(h[1-6])\b[^>]*>/gi, '\n## ').replace(/<li\b[^>]*>/gi, '\n- ').replace(/<[^>]+>/g, ' ')).split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
  const words = text.split(/\s+/).filter(Boolean).length
  return { title, desc, viewport, h1, forms, pathLinks, text, words, thin: words < 80 && !forms.length }
}

export function render (url, status, p, at = new Date().toISOString()) {
  const f = p.forms.map((x, i) => `- Form ${i + 1}: ${x.method.toUpperCase()} ${x.action || '(this page)'}; submit "${x.submit}"; fields: ${x.fields.map(y => `${y.name || y.type} (${y.type}${y.required ? ', required' : ''})`).join(', ') || 'none in the HTML'}`).join('\n') || '- No form in the HTML (a form built by script does not show here)'
  return `Source: ${url} · fetched ${at} · HTTP ${status}\n\n## Facts\n- Title: ${p.title || '(none)'}\n- Description: ${p.desc || '(none)'}\n- Viewport tag: ${p.viewport ? 'yes' : 'no'}\n- H1: ${p.h1.map(h => `"${h}"`).join('; ') || '(none)'}\n- Words of text: ${p.words}${p.thin ? ' (thin: the page may be built by script; say so, never guess what it shows)' : ''}\n${f}\n\n## Links on the path\n${p.pathLinks.map(l => `- "${l.text}" → ${l.href}`).join('\n') || '- none found'}\n\n## Text\n${p.text}\n`
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
      pages.push({ url, finalUrl: res.url || url, file, status: res.status, title: p.title, words: p.words, forms: p.forms.length, pathLinks: p.pathLinks.length, thin: p.thin })
      if (res.status >= 400) errors.push(`${url}: HTTP ${res.status}`)
    } catch (e) { errors.push(`${url}: ${e.name === 'TimeoutError' ? 'timed out after 20 s' : e.message}`) }
  }
  if (urls.length > 15) errors.push(`only the first 15 of ${urls.length} URLs were fetched`)
  return [{ ok: pages.length > 0 && pages.every(p => p.status < 400), pages, errors, dryRun: dry }, pages.length ? 0 : 1]
}

function selftest () {
  const html = `<html><head><title>Ledgerline &amp; you</title><meta name="description" content="Invoices"><meta name="viewport" content="width=device-width"></head><body><nav><a href="/pricing">Pricing</a> <a href="/signup">Start free trial</a> <a href="/blog">Blog</a></nav><h1>Send your first invoice in two minutes</h1><p>Used by 300 teams.</p><script>var x = "Hidden script text";</script><form action="/signup" method="post"><input type="email" name="email" required><input type="tel" name="phone" required><input type="hidden" name="t"><button>Create account</button></form></body></html>`
  const p = htmlToPage(html, 'https://ledgerline.example/')
  const md = render('https://ledgerline.example/', 200, p, '2026-10-07T00:00:00Z')
  const t = [
    ['title and entities decoded', p.title === 'Ledgerline & you'],
    ['viewport and h1 found', p.viewport && p.h1[0] === 'Send your first invoice in two minutes'],
    ['one form, two visible required fields, hidden left out', p.forms.length === 1 && p.forms[0].fields.length === 2 && p.forms[0].fields.every(f => f.required) && p.forms[0].submit === 'Create account'],
    ['path links absolute; the blog left out', p.pathLinks.some(l => l.href === 'https://ledgerline.example/signup') && !p.pathLinks.some(l => /blog/.test(l.href))],
    ['script text is not page text', !/Hidden script text/.test(p.text) && /Used by 300 teams\./.test(p.text)],
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
