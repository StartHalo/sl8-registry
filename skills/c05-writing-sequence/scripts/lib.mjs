// lib.mjs: shared by inputs, build and validate (c05-writing-sequence). Plain Node 22, no
// dependencies. Ported from the v12 branch's saas-email-build (claude/c05-micro-saas-email-campaign).
import fs from 'node:fs'
import path from 'node:path'

export const TEMPLATE = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'template.html')
// The neutral merge tags the pack carries; reference/tool-tokens.md maps them to each tool.
export const TOKENS = { first: '{{first_name}}', unsub: '{{unsubscribe_url}}', address: '{{postal_address}}' }
export const EMAIL_FIELDS = ['Send', 'Purpose', 'Subject', 'Preview text', 'Call to action', 'Sign-off']
export const PURPOSES = ['Crucial problem', 'Perceived value', 'Inspiration', 'Action']
export const GMAIL_CLIP = 102 * 1024

export const read = f => fs.readFileSync(f, 'utf8')
export const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'email'
export const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)

// "## <Heading>" sections of a Markdown file: { heading: body }
export function sections (text) {
  const out = {}
  for (const part of text.split(/^(?=##\s)/m)) {
    const m = /^##\s+(.+?)\s*$/m.exec(part.split('\n')[0]); if (!m) continue
    out[m[1]] = part.slice(part.indexOf('\n') + 1).trim()
  }
  return out
}

// "## Email <n> · <title>" sections, with their "- Field: value" lines and the "### Body".
export function parseEmails (text) {
  const out = []
  for (const part of text.split(/^(?=##\s)/m)) {
    const m = /^##\s+Email\s+(\d+)\s*[·:-]\s*(.+?)\s*$/.exec(part.split('\n')[0])
    if (!m) continue
    const rest = part.slice(part.indexOf('\n') + 1)
    const fields = {}
    for (const f of EMAIL_FIELDS) { const r = new RegExp(`^[-*]\\s+${f}:\\s*(.*)$`, 'mi').exec(rest); fields[f] = r ? r[1].trim() : '' }
    const b = /^###\s+Body\s*$([\s\S]*?)(?=^###\s|(?![\s\S]))/mi.exec(rest)
    out.push({ n: +m[1], title: m[2], fields, body: b ? b[1].trim() : '' })
  }
  return out
}

// The storyboard table's rows (after the header and separator).
export function storyboard (text) {
  const s = sections(text).Storyboard || ''
  return s.split('\n').filter(l => /^\|/.test(l)).slice(2).map(l => l.split('|').slice(1, -1).map(c => c.trim()))
}

export function link (v) { const m = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(v || ''); return m ? { text: m[1], url: m[2] } : null }
export const links = t => [...String(t).matchAll(/https?:\/\/[^\s"'<>)\]]+/g)].map(m => m[0].replace(/&amp;/g, '&').replace(/[.,;]+$/, ''))
export function host (url) { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null } }

// Tag links on the product's own site; other sites and merge tags are left alone.
export function utm (url, site, campaign, content) {
  if (!site || !/^https:\/\//.test(url)) return url
  let u; try { u = new URL(url) } catch { return url }
  const h = u.hostname.replace(/^www\./, '')
  if (h !== site && !h.endsWith(`.${site}`)) return url
  if (!u.searchParams.has('utm_campaign')) { u.searchParams.set('utm_source', 'email'); u.searchParams.set('utm_medium', 'email'); u.searchParams.set('utm_campaign', campaign); u.searchParams.set('utm_content', content) }
  return u.toString()
}

// artifacts/profile.md as "- Key: value" lines (product, website, sender, postal address, email tool, brand colour)
export function profile (file) {
  const out = {}
  if (!file || !fs.existsSync(file)) return out
  for (const m of read(file).matchAll(/^[-*]\s+([A-Za-z ]+):\s*(.+)$/gm)) out[m[1].trim().toLowerCase()] = m[2].trim()
  return out
}

export function mdToHtml (md, linkFn, colour) {
  const inline = t => esc(t)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => `<a class="link" href="${esc(linkFn(url.replace(/&amp;/g, '&')))}" style="color:${colour}; text-decoration:underline;">${txt}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return md.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return ''
    if (lines.every(l => /^[-*]\s+/.test(l))) return `<ul style="margin:0 0 16px; padding-left:22px;">${lines.map(l => `<li style="margin:0 0 6px;">${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`
    return `<p style="margin:0 0 16px; font-size:16px; line-height:1.6;">${lines.map(inline).join('<br>')}</p>`
  }).join('\n')
}

export function mdToText (md, linkFn) {
  return md.split(/\n\s*\n/).map(block => block.split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => l.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `${t}: ${linkFn(u)}`).replace(/\*\*([^*]+)\*\*/g, '$1')).join('\n')).filter(Boolean).join('\n\n')
}

export const isDirect = (url) => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(url).pathname) } catch { return false } }
