#!/usr/bin/env node
// Static pre-send checks on every built email (Litmus checklist, the parts a script can settle).
// Writes pack/qa.json and prints a Markdown table for 07-qa.md. Exit 1 when any email fails.
//
//   check.mjs <campaign>
//
// Failures: over Gmail's 102 KB clip · no lang · an image without alt · a link that isn't https or
// a known token · a link to the founder's site without UTM tags · no unsubscribe token · no postal
// address (or its visible [TBD]) · any placeholder other than the known tokens · subject over 60
// characters or empty · preheader empty · no plain-text version.
// Warnings (never fail): preheader outside 40–100 characters · [TBD] sender or address (blocks sending).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { TOKENS, TBD_ADDRESS, TBD_SENDER, fail, args, campaignDir, profile, siteHost } from './lib.mjs'

const a = args(process.argv.slice(2))
const [campaign] = a._
if (!campaign) fail('usage: check.mjs <campaign>')
const dir = campaignDir(campaign)
const bfile = path.join(dir, 'pack', 'build.json')
if (!fs.existsSync(bfile)) fail('pack/build.json is missing: run build.mjs first')
const build = JSON.parse(fs.readFileSync(bfile, 'utf8'))
const p = profile()
const host = siteHost(p)
const address = p.address || TBD_ADDRESS

const PLACEHOLDER = [
  [/\*\|[A-Z_:]+\|\*/, 'a Mailchimp tag (use the neutral tokens; sequence-setup.md maps them)'],
  [/%[A-Z_]{3,}%/, 'an ActiveCampaign-style tag'],
  [/(^|[^{]){\s*[a-zA-Z_]+\s*}(?!})/, 'a single-brace tag such as {firstName}'],
  [/\[(first ?name|name|company|your [a-z ]+|insert [a-z ]+|link|url|date)\]/i, 'a bracket placeholder such as [First name]'],
  [/lorem ipsum|\bXXX\b|\bTODO\b/i, 'filler text'],
  [/\[TBD\](?! (postal address|sender))/, 'a [TBD] other than the sender or postal address'],
]

const copySrc = fs.existsSync(path.join(dir, '05-copy.md')) ? fs.readFileSync(path.join(dir, '05-copy.md'), 'utf8') : ''
const copyByEmail = Object.fromEntries(copySrc.split(/^(?=##\s+Email\s+\d+)/m).map((part) => [/^##\s+Email\s+(\d+)/.exec(part)?.[1], part]).filter(([n]) => n))
const results = []
for (const e of build.emails) {
  const failures = []
  const warnings = []
  const htmlPath = path.join(dir, 'pack', e.html)
  const textPath = path.join(dir, 'pack', e.text)
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : null
  const text = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8') : ''
  if (html === null) { results.push({ n: e.n, file: e.html, failures: ['HTML file is missing'], warnings }); continue }

  const kb = Buffer.byteLength(html) / 1024
  if (kb >= 102) failures.push(`${kb.toFixed(1)} KB: Gmail clips emails over 102 KB`)
  if (!/<html[^>]*\slang="[a-z]{2}/i.test(html)) failures.push('no lang attribute on <html>')
  for (const img of html.match(/<img\b[^>]*>/gi) || []) if (!/\salt="/i.test(img)) failures.push(`an image has no alt text: ${img.slice(0, 80)}`)
  const hrefs = [...html.matchAll(/href="([^"]*)"/gi)].map((m) => m[1].replace(/&amp;/g, '&'))
  for (const h of hrefs) {
    if (/^\{\{\s*[a-z_]+\s*\}\}$/.test(h)) continue
    if (!/^https:\/\//.test(h)) { failures.push(`link is not https: ${h || '(empty)'}`); continue }
    try {
      const u = new URL(h)
      const hh = u.hostname.replace(/^www\./, '')
      if (host && (hh === host || hh.endsWith(`.${host}`)) && !u.searchParams.has('utm_campaign')) failures.push(`link to your site without UTM tags: ${h}`)
    } catch { failures.push(`link does not parse: ${h}`) }
  }
  if (!html.includes('{{unsubscribe_url}}')) failures.push('no {{unsubscribe_url}} link in the HTML')
  if (!text.trim()) failures.push('plain-text version is missing or empty')
  else if (!text.includes('{{unsubscribe_url}}')) failures.push('no {{unsubscribe_url}} in the plain-text version')
  if (!html.includes(address.replace(/&/g, '&amp;')) && !html.includes(address)) failures.push('the postal address (or its visible [TBD]) is not in the footer')

  const source = copyByEmail[String(e.n)] || ''
  const visible = source + '\n' + html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ') + '\n' + text
  for (const m of visible.matchAll(/\{\{\s*([a-zA-Z_.]+)[^}]*\}\}/g)) if (!TOKENS.includes(m[1])) failures.push(`unknown merge token {{${m[1]}}}: use only ${TOKENS.map((t) => `{{${t}}}`).join(', ')}`)
  for (const [re, what] of PLACEHOLDER) if (re.test(visible)) failures.push(`contains ${what}: "${re.exec(visible)[0].trim()}"`)

  const subj = e.subject || ''
  if (!subj.trim()) failures.push('subject is empty')
  else if (subj.length > 60) failures.push(`subject is ${subj.length} characters (limit 60)`)
  const pre = e.preheader || ''
  if (!pre.trim()) failures.push('preheader is empty')
  else if (pre.length < 40 || pre.length > 100) warnings.push(`preheader is ${pre.length} characters (aim for 40–100)`)
  if (address === TBD_ADDRESS) warnings.push('postal address is [TBD]: blocks sending')
  if (build.sender === TBD_SENDER) warnings.push('sender is [TBD]: blocks sending')

  results.push({ n: e.n, file: e.html, kb: +kb.toFixed(1), failures: [...new Set(failures)], warnings })
}

const failures = results.reduce((t, r) => t + r.failures.length, 0)
const qa = { campaign, checkedAt: new Date().toISOString(), buildSha: crypto.createHash('sha1').update(fs.readFileSync(bfile)).digest('hex'), failures, emails: results }
fs.writeFileSync(path.join(dir, 'pack', 'qa.json'), JSON.stringify(qa, null, 2) + '\n')

console.log(`| Email | Size | Result | Notes |\n|---|---|---|---|`)
for (const r of results) console.log(`| ${r.n} · ${r.file} | ${r.kb ?? '—'} KB | ${r.failures.length ? `✗ ${r.failures.length} failure(s)` : '✓ pass'} | ${[...r.failures, ...r.warnings].join('; ') || '—'} |`)
console.log(`\n${failures ? `✗ ${failures} failure(s): fix the copy (05-copy.md) or the profile, rebuild, and check again.` : '✓ every email passes the script checks.'}`)
process.exit(failures ? 1 : 0)
