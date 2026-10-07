#!/usr/bin/env node
// build.mjs: builds every email of sequence.md into emails/: one HTML and one plain-text file per
// email, plus build.json. The words come only from sequence.md; this script owns the layout
// (assets/template.html), the UTM tags on the product's own links, and the footer's merge tags.
// Ported from the v12 branch's saas-email-build/scripts/build.mjs.
//   node build.mjs <artifacts/<product>/sequence.md> [--dry-run]     |  --selftest  |  --help
// No prompts; JSON on stdout; safe to re-run (it rewrites emails/); writes only <dir>/emails/.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { TEMPLATE, TOKENS, read, esc, slug, empty, parseEmails, link, host, utm, mdToHtml, mdToText, isDirect } from './lib.mjs'

const HELP = 'usage: node build.mjs <sequence.md> [--dry-run] | --selftest\n  writes <dir>/emails/<nn>-<slug>.html and .txt and build.json; prints {"ok","emails":[…],"errors":[…]}'
const header = (text, k) => { const m = new RegExp(`^[-*]\\s+${k}:\\s*(.+)$`, 'mi').exec(text.split(/^##\s/m)[0]); return m && !empty(m[1]) ? m[1].trim() : '' }

export function build (seqFile, { dryRun = false } = {}) {
  const text = read(seqFile), dir = path.dirname(seqFile), errors = []
  const emails = parseEmails(text)
  if (!emails.length) return { ok: false, errors: ['sequence.md has no "## Email <n> · <title>" sections'] }
  const product = header(text, 'Product'), site = host((/https?:\/\/\S+/.exec(product) || [''])[0])
  const name = product.split(',')[0].trim() || 'our product'
  const address = header(text, 'Postal address')
  const addressOut = address && !/placeholder|replace/i.test(address) ? esc(address) : TOKENS.address
  const campaign = slug(path.basename(dir) + '-' + (header(text, 'Goal') || 'sequence'))
  const tpl = read(TEMPLATE), out = path.join(dir, 'emails'), built = []
  if (!dryRun) { fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true }) }
  for (const e of emails) {
    const f = e.fields, cta = link(f['Call to action'])
    if (!cta) errors.push(`email ${e.n}: "Call to action" is not a [text](url) link`)
    const content = `email-${e.n}`, L = u => /^\{\{/.test(u) ? u : utm(u, site, campaign, content)
    const ctaHtml = cta ? `<p style="margin:24px 0;"><a class="link" href="${esc(L(cta.url))}" style="display:inline-block; padding:12px 20px; background-color:#1f4e79; color:#ffffff; border-radius:6px; text-decoration:none; font-weight:600;">${esc(cta.text)}</a></p>` : ''
    const footer = `You're getting this because you signed up for ${esc(name)}.<br><a href="${TOKENS.unsub}" style="color:#5f6b76;">Unsubscribe</a> · ${addressOut}`
    const html = tpl.replace('%%LANG%%', 'en').replace('%%SUBJECT%%', esc(f.Subject)).replaceAll('%%PAGE_BG%%', '#f4f5f7')
      .replace('%%PREHEADER%%', esc(f['Preview text'])).replace('%%PREHEADER_FILL%%', '&#8199;&#65279;&#847;'.repeat(20))
      .replace('%%HEADER%%', '').replace('%%CARD_BG%%', '#ffffff').replace('%%CARD_PAD%%', '32px')
      .replace('%%BODY%%', mdToHtml(e.body, L, '#1f4e79')).replace('%%CTA%%', ctaHtml)
      .replace('%%SIGNOFF%%', f['Sign-off'] ? `<p style="margin:0 0 16px;">${esc(f['Sign-off']).replace(/\n/g, '<br>')}</p>` : '')
      .replace('%%PS%%', '').replace('%%FOOTER%%', footer)
    const txt = [`Subject: ${f.Subject}`, `Preview: ${f['Preview text']}`, '', mdToText(e.body, L), '', cta ? `${cta.text}: ${L(cta.url)}` : '', '', f['Sign-off'] || '', '', '--', `You're getting this because you signed up for ${name}.`, `Unsubscribe: ${TOKENS.unsub}`, address && !/placeholder|replace/i.test(address) ? address : TOKENS.address].join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
    const base = `${String(e.n).padStart(2, '0')}-${slug(e.title)}`
    if (!dryRun) { fs.writeFileSync(path.join(out, base + '.html'), html); fs.writeFileSync(path.join(out, base + '.txt'), txt) }
    built.push({ n: e.n, title: e.title, html: `emails/${base}.html`, text: `emails/${base}.txt`, htmlBytes: Buffer.byteLength(html) })
  }
  if (!dryRun) fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify({ campaign, site, emails: built }, null, 2) + '\n')
  return { ok: !errors.length, dryRun, emails: built, errors }
}

if (isDirect(import.meta.url)) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const ex = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reference', 'examples', 'good-1.md')
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c05-build-')), f = path.join(tmp, 'fernway', 'sequence.md')
    fs.mkdirSync(path.dirname(f)); fs.copyFileSync(ex, f)
    const r = build(f), one = r.emails[0] && read(path.join(tmp, 'fernway', r.emails[0].html))
    const txt = r.emails[0] && read(path.join(tmp, 'fernway', r.emails[0].text))
    const ok = r.ok && r.emails.length >= 4 && one.includes(TOKENS.unsub) && /utm_campaign=/.test(one) && /utm_campaign=/.test(txt) && !/%%/.test(one)
    fs.rmSync(tmp, { recursive: true, force: true })
    console.log(JSON.stringify({ ok, cases: 1, emails: r.emails.length, errors: r.errors })); process.exit(ok ? 0 : 1)
  }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: [`no file ${a[0]}`] })); process.exit(2) }
  const r = build(a[0], { dryRun: a.includes('--dry-run') }); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
