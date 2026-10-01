#!/usr/bin/env node
// Read pages without pulling them into the conversation: for each URL, print only what a prospect
// list needs. Plain Node 22 (global fetch), no dependencies.
//
//   scan.mjs [--match "<regex>"] [--lines 4] <url> [<url> …]
//
// For each page: the final URL, the HTTP status, the title, every email address on the page
// (plain text, mailto: links, and addresses hidden by Cloudflare email protection, decoded), and
// up to --lines short lines that match --match (default: car line, carpool, dismissal, pick-up).
// A page that fails says so in one line. Output stays small, so a long search stays cheap.
const DEFAULT_MATCH = 'car ?line|carpool|car pool|dismissal|pick-?up line|pickup'

export function decodeCf (hex) {
  const k = parseInt(hex.slice(0, 2), 16)
  let s = ''
  for (let i = 2; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k)
  return entities(s)
}

export function entities (s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

export function extract (html, { match = DEFAULT_MATCH, lines = 4 } = {}) {
  const title = entities((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '').replace(/\s+/g, ' ').trim()).slice(0, 120)
  const emails = new Set()
  // Decoded (Cloudflare-protected) addresses first: they are the real ones.
  for (const m of html.matchAll(/(?:data-cfemail="|email-protection#)([0-9a-f]{10,})/gi)) {
    for (const e of decodeCf(m[1]).matchAll(EMAIL)) emails.add(e[0].toLowerCase())
  }
  for (const m of entities(html).matchAll(EMAIL)) {
    const e = m[0].toLowerCase()
    if (/\.(png|jpe?g|gif|svg|webp|css|js)$/i.test(e)) continue
    if (emails.has(e.replace('@www.', '@'))) continue
    emails.add(e)
  }
  const text = entities(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, '\n'))
  const re = new RegExp(match, 'i')
  const hits = []
  for (const line of text.split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 3)) {
    if (re.test(line) && !hits.includes(line)) hits.push(line.length > 200 ? line.slice(0, 200) + '…' : line)
    if (hits.length >= lines) break
  }
  return { title, emails: [...emails].slice(0, 25), hits }
}

async function scan (url, opts) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' } })
    const html = await r.text()
    const x = extract(html, opts)
    const out = [`== ${url}${r.url !== url ? ` → ${r.url}` : ''} · ${r.status} · ${x.title || '(no title)'}`]
    out.push(`   emails: ${x.emails.length ? x.emails.join(', ') : 'none'}`)
    for (const h of x.hits) out.push(`   · ${h}`)
    return out.join('\n')
  } catch (e) {
    return `== ${url} · failed: ${e.name === 'TimeoutError' ? 'timed out' : e.message}`
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2)
  const opts = {}
  const urls = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--match') opts.match = argv[++i]
    else if (argv[i] === '--lines') opts.lines = +argv[++i]
    else urls.push(argv[i])
  }
  if (!urls.length) { console.error('usage: scan.mjs [--match "<regex>"] [--lines 4] <url> [<url> …]'); process.exit(2) }
  for (const u of urls) console.log(await scan(u, opts))
}
