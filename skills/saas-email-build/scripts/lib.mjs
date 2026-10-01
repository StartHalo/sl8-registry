// Shared by the build scripts. Plain Node 22, no dependencies, nothing installed during a job.
import fs from 'node:fs'
import path from 'node:path'

// artifacts/ sits in the home folder that holds .claude/skills/saas-email-build/scripts/. On the
// machine .claude/skills/<id> links to .agents/skills/<id>; both count. SL8_ARTIFACTS overrides it.
const HERE = path.dirname(new URL(import.meta.url).pathname)
const HOME = path.resolve(HERE, '..', '..', '..', '..')
export const ARTIFACTS = process.env.SL8_ARTIFACTS ||
  (['.claude', '.agents'].includes(path.basename(path.resolve(HERE, '..', '..', '..'))) ? path.join(HOME, 'artifacts') : path.resolve('artifacts'))
export const TEMPLATE = path.join(HERE, '..', 'assets', 'template.html')

// The only merge tokens the pack may carry. sequence-setup.md maps them to each tool's own tags.
export const TOKENS = ['first_name', 'unsubscribe_url']
export const TBD_ADDRESS = '[TBD] postal address'
export const TBD_SENDER = '[TBD] sender'
export const COPY_FIELDS = ['Send', 'Segment', 'Subject', 'Preheader', 'Primary CTA', 'Secondary CTA', 'Sign-off', 'P.S.']

export function fail (msg) { console.error(msg); process.exit(1) }
export function args (argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; out[k] = v } else out._.push(a)
  }
  return out
}

export function campaignDir (c) {
  if (!c || /[/\\]|^\.|\s/.test(c)) fail(`bad campaign name "${c}"`)
  const dir = path.join(ARTIFACTS, c)
  if (!fs.existsSync(dir)) fail(`no campaign folder ${dir}`)
  return dir
}

// The company profile (artifacts/context.md), read-only here: the router is its only writer.
export function profile () {
  const file = path.join(ARTIFACTS, 'context.md')
  const out = {}
  if (!fs.existsSync(file)) return out
  const labels = { company: 'Company and product name', website: 'Website', sender: 'Sender name, email and reply-to', address: 'Postal address', brand: 'Brand: logo URL and colour', region: 'Region and recipients' }
  const text = fs.readFileSync(file, 'utf8')
  for (const [k, label] of Object.entries(labels)) {
    const row = text.split('\n').find((l) => l.startsWith(`| ${label} |`))
    const cell = row?.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim().replace(/\\\|/g, '|'))[1]
    if (cell && cell !== '—') out[k] = cell
  }
  return out
}

export function brand (p) {
  const b = p.brand || ''
  const logo = /https:\/\/\S+?\.(png|jpe?g|gif|svg|webp)(\?\S*)?(?=[\s·,;]|$)/i.exec(b)?.[0] || null
  const colour = /#[0-9a-f]{6}\b/i.exec(b)?.[0] || '#1f4e79'
  return { logo, colour }
}

export function senderName (p) {
  const s = p.sender || ''
  return (/^([^<,;]+?)\s*(<|,|;|$)/.exec(s)?.[1] || '').trim() || null
}

export function siteHost (p) {
  try { return new URL(/^https?:/.test(p.website || '') ? p.website : `https://${p.website}`).hostname.replace(/^www\./, '') } catch { return null }
}

// "## Email 3 · Title" sections of 05-copy.md, with their fields and Markdown body.
export function parseCopy (text) {
  const out = []
  for (const part of text.split(/^(?=##\s)/m)) {
    const m = /^##\s+Email\s+(\d+)\s*[·:-]\s*(.+?)\s*$/.exec(part.split('\n')[0])
    if (!m) continue
    const rest = part.slice(part.indexOf('\n') + 1)
    const fields = {}
    for (const f of COPY_FIELDS) {
      const r = new RegExp(`^[-*]\\s+${f.replace(/[.]/g, '\\.')}:\\s*(.*)$`, 'mi').exec(rest)
      fields[f] = r ? r[1].trim() : ''
    }
    const b = /^###\s+Body\s*$([\s\S]*?)(?=^[-*]\s+(Primary CTA|Secondary CTA|Sign-off|P\.S\.):|^###\s|(?![\s\S]))/mi.exec(rest)
    out.push({ n: +m[1], title: m[2], fields, body: b ? b[1].trim() : '' })
  }
  return out
}

export const none = (v) => !v || /^(none|n\/a|-)$/i.test(v.trim())
export function link (v) {
  const m = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(v || '')
  return m ? { text: m[1], url: m[2] } : null
}

export function slugify (t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'email' }
export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Add UTM tags to links on the founder's own site; tokens and other sites are left alone.
export function utm (url, host, campaign, content) {
  if (!host || !/^https:\/\//.test(url)) return url
  let u
  try { u = new URL(url) } catch { return url }
  const h = u.hostname.replace(/^www\./, '')
  if (h !== host && !h.endsWith(`.${host}`)) return url
  if (u.searchParams.has('utm_campaign')) return url
  u.searchParams.set('utm_source', 'email')
  u.searchParams.set('utm_medium', 'email')
  u.searchParams.set('utm_campaign', campaign)
  u.searchParams.set('utm_content', content)
  return u.toString()
}

// The small Markdown subset the copy uses: paragraphs, "- " lists, **bold**, *italic*, [text](url).
export function mdToHtml (md, linkFn, style) {
  const inline = (t) => esc(t)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => `<a class="link" href="${esc(linkFn(url.replace(/&amp;/g, '&')))}" style="${style.a}">${txt}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s|][^*]*)\*/g, '$1<em>$2</em>')
  return md.split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return ''
    if (lines.every((l) => /^[-*]\s+/.test(l))) return `<ul style="${style.ul}">${lines.map((l) => `<li style="${style.li}">${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`
    return `<p style="${style.p}">${lines.map(inline).join('<br>')}</p>`
  }).join('\n')
}

export function mdToText (md, linkFn) {
  return md.split(/\n\s*\n/).map((block) => block.split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => l.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `${t} (${linkFn(u)})`).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[^*])\*([^*\s|][^*]*)\*/g, '$1$2'))
    .join('\n')).filter(Boolean).join('\n\n')
}
