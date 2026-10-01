#!/usr/bin/env node
// Build every email of a campaign from 05-copy.md into pack/: one HTML and one plain-text file per
// email, preview.html, and build.json. The words come only from 05-copy.md; this script owns layout.
//
//   build.mjs <campaign> [--style branded|plain] [--lang en]
//
// Reads artifacts/context.md (company, website, sender, postal address, brand) without writing it.
// A missing sender or address is printed as a visible [TBD]; the build still succeeds.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { TEMPLATE, TBD_ADDRESS, TBD_SENDER, fail, args, campaignDir, profile, brand, senderName, siteHost, parseCopy, none, link, slugify, esc, utm, mdToHtml, mdToText } from './lib.mjs'

const a = args(process.argv.slice(2))
const [campaign] = a._
if (!campaign) fail('usage: build.mjs <campaign> [--style branded|plain] [--lang en]')
const style = a.style === 'plain' ? 'plain' : 'branded'
const lang = typeof a.lang === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(a.lang) ? a.lang : 'en'
const dir = campaignDir(campaign)
const copyFile = path.join(dir, '05-copy.md')
if (!fs.existsSync(copyFile)) fail('05-copy.md is missing: write the copy first')
const emails = parseCopy(fs.readFileSync(copyFile, 'utf8'))
if (!emails.length) fail('05-copy.md has no "## Email <n> · <title>" sections')

const p = profile()
const { logo, colour } = brand(p)
const host = siteHost(p)
const company = p.company || '[TBD] company'
const sender = senderName(p) || TBD_SENDER
const address = p.address || TBD_ADDRESS
const tpl = fs.readFileSync(TEMPLATE, 'utf8')
const S = {
  p: 'margin:0 0 16px; font-size:16px; line-height:1.6;',
  ul: 'margin:0 0 16px; padding-left:22px;',
  li: 'margin:0 0 6px;',
  a: `color:${colour}; text-decoration:underline;`,
}

const out = path.join(dir, 'pack')
const emDir = path.join(out, 'emails')
fs.mkdirSync(emDir, { recursive: true })
for (const f of fs.readdirSync(emDir)) if (/^\d{2}-.*\.(html|txt)$/.test(f)) fs.rmSync(path.join(emDir, f))

const built = []
for (const e of emails) {
  const nn = String(e.n).padStart(2, '0')
  const slug = `${nn}-${slugify(e.title)}`
  const content = `email-${nn}`
  const L = (u) => utm(u, host, campaign, content)
  const subject = e.fields.Subject
  const preheader = e.fields.Preheader
  const primary = link(e.fields['Primary CTA'])
  const secondary = none(e.fields['Secondary CTA']) ? null : link(e.fields['Secondary CTA'])
  const ps = none(e.fields['P.S.']) ? null : e.fields['P.S.']
  const signoff = none(e.fields['Sign-off']) ? null : e.fields['Sign-off']

  const header = style === 'branded'
    ? `        <tr><td class="pad" style="padding:0 32px 16px; text-align:left;">${logo
        ? `<img src="${esc(logo)}" alt="${esc(company)}" height="32" style="display:block; height:32px; width:auto; max-width:200px;">`
        : `<span style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:18px; font-weight:700; color:${colour};">${esc(company)}</span>`}</td></tr>`
    : ''
  const body = mdToHtml(e.body, L, S)
  let cta = ''
  if (primary) {
    const href = esc(L(primary.url))
    cta = style === 'branded'
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr><td align="center" bgcolor="${colour}" style="border-radius:6px; background-color:${colour};">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:44px; v-text-anchor:middle; width:260px;" arcsize="14%" stroke="f" fillcolor="${colour}"><w:anchorlock/><center style="color:#ffffff; font-family:Arial, sans-serif; font-size:16px; font-weight:bold;">${esc(primary.text)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${href}" style="display:inline-block; padding:12px 22px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; font-weight:600; line-height:20px; color:#ffffff; text-decoration:none; border-radius:6px;">${esc(primary.text)}</a><!--<![endif]-->
</td></tr></table>`
      : `<p style="${S.p}"><a class="link" href="${href}" style="${S.a} font-weight:600;">${esc(primary.text)}</a></p>`
    if (secondary) cta += `\n<p style="${S.p}"><a class="link" href="${esc(L(secondary.url))}" style="${S.a}">${esc(secondary.text)}</a></p>`
  }
  const psHtml = ps ? `<p style="${S.p}">P.S. ${mdToHtml(ps.replace(/^P\.S\.\s*/i, ''), L, { ...S, p: '' }).replace(/^<p style="">|<\/p>$/g, '')}</p>` : ''
  const footer = `${esc(company)} · ${esc(address)}<br>
<a href="{{unsubscribe_url}}" style="color:#5f6b76; text-decoration:underline;">Unsubscribe</a>`

  const html = tpl
    .replace('%%LANG%%', lang)
    .replace('%%SUBJECT%%', esc(subject))
    .replace('%%PREHEADER%%', esc(preheader))
    .replace('%%PREHEADER_FILL%%', '&#8199;&#65279;&#847; '.repeat(20))
    .replaceAll('%%PAGE_BG%%', style === 'branded' ? '#f3f4f6' : '#fdfdfd')
    .replace('%%CARD_BG%%', '#fdfdfd')
    .replace('%%CARD_PAD%%', style === 'branded' ? '32px' : '8px 32px')
    .replace('%%HEADER%%', header)
    .replace('%%BODY%%', body)
    .replace('%%CTA%%', cta)
    .replace('%%SIGNOFF%%', signoff ? `<p style="${S.p}">${signoff.split(/\s*\/\s*|<br>/).map(esc).join('<br>')}</p>` : '')
    .replace('%%PS%%', psHtml)
    .replace('%%FOOTER%%', footer)

  const text = [
    mdToText(e.body, L),
    primary ? `${primary.text}: ${L(primary.url)}` : '',
    secondary ? `${secondary.text}: ${L(secondary.url)}` : '',
    signoff ? signoff.split(/\s*\/\s*|<br>/).join('\n') : '',
    ps ? `P.S. ${mdToText(ps.replace(/^P\.S\.\s*/i, ''), L)}` : '',
    '--',
    `${company} · ${address}`,
    'Unsubscribe: {{unsubscribe_url}}',
  ].filter(Boolean).join('\n\n') + '\n'

  fs.writeFileSync(path.join(emDir, `${slug}.html`), html)
  fs.writeFileSync(path.join(emDir, `${slug}.txt`), text)
  built.push({ n: e.n, title: e.title, send: e.fields.Send, segment: e.fields.Segment, subject, preheader, html: `emails/${slug}.html`, text: `emails/${slug}.txt`, bytes: Buffer.byteLength(html) })
}

const preview = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(campaign)}: preview</title>
<style>
body { margin:0; font:15px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background:#eef0f3; color:#1f2933; }
main { max-width:720px; margin:0 auto; padding:24px 16px 64px; display:grid; gap:28px; }
h1 { font-size:22px; margin:0; } .meta { color:#5f6b76; font-size:13px; }
section { background:#fff; border:1px solid #d6dbe1; border-radius:8px; overflow:hidden; }
section header { padding:12px 16px; border-bottom:1px solid #d6dbe1; display:grid; gap:2px; }
section header b { font-size:15px; } iframe { width:100%; height:820px; border:0; display:block; background:#fff; }
</style></head><body><main>
<div><h1>${esc(campaign)}</h1><div class="meta">${built.length} emails · built ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · style ${style}. Merge tokens such as {{first_name}} are filled by your email tool.</div></div>
${built.map((b) => `<section><header><b>${b.n}. ${esc(b.subject)}</b><span class="meta">Preview text: ${esc(b.preheader)}</span><span class="meta">Send: ${esc(b.send)} · Segment: ${esc(b.segment)} · Files: ${esc(b.html)}, ${esc(b.text)}</span></header>
<iframe title="Email ${b.n}" srcdoc="${esc(fs.readFileSync(path.join(out, b.html), 'utf8'))}"></iframe></section>`).join('\n')}
</main></body></html>
`
fs.writeFileSync(path.join(out, 'preview.html'), preview)
const copySha = crypto.createHash('sha1').update(fs.readFileSync(copyFile)).digest('hex')
const build = { campaign, builtAt: new Date().toISOString(), copySha, style, lang, company, sender, address, emails: built }
fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify(build, null, 2) + '\n')
const blocks = [sender === TBD_SENDER && 'sender', address === TBD_ADDRESS && 'postal address'].filter(Boolean)
console.log(JSON.stringify({ built: built.length, style, files: built.map((b) => b.html), blocksSending: blocks }))
