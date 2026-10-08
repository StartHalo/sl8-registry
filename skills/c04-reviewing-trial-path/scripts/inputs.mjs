#!/usr/bin/env node
// inputs.mjs: reads the request for this job's inputs (job card: Review our trial path), and with --save
// saves it word for word in the product's folder, so nothing is written before the product is known
// (SHORTCOMINGS №182). Only the product is required: a "Product:" (or "Website:") line, or any web
// address in the request. Every other input is assumed when missing, and the review's Assumptions
// section gives each one a line starting "**<label>:**" (D40). Attachments count as screenshots (images)
// or customer voice (text). A website line in artifacts/profile.md (what the founder said earlier)
// counts as the product when the request names none.
//   node inputs.mjs <request.md | -> [--save <artifacts dir>] [--attachments <dir>] [--profile artifacts/profile.md]
//   node inputs.mjs --selftest | --help
// "-" reads the request from stdin (a quoted heredoc). --save writes it to
// <artifacts>/<project>/inputs/request-review.md (request-review-2.md … when a different earlier request is
// there: it never overwrites) and prints the path as "saved"; with no product the project is new-project.
// No prompts; JSON on stdout; exit 1 only when the product is missing; writes nothing without --save.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HELP = 'usage: node inputs.mjs <request.md | -> [--save artifacts] [--attachments artifacts/attachments] [--profile artifacts/profile.md] | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label","value"}],"url","project","trafficGiven","saved","say"}'
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?|none|unknown|not known)\s*$/i.test(v)
export const OPTIONAL = {
  path: [/^(?:path|flow|steps)\s*[:—-]\s*(.+)$/im, 'Path', "from the home page's main sign-up or trial button to the first step the site describes"],
  traffic: [/^(?:traffic|visits|visitors|conversion|sign-?ups|trials)\s*[:—-]\s*(.+)$/im, 'Traffic', 'not known: treated as low traffic, so nothing goes in the Test bucket'],
  customer_voice: [/^(?:customer voice|customers said|feedback|reviews|support emails|notes)\s*[:—-]\s*(.+)$/im, 'Customer voice', 'none: the research kit collects it'],
  screenshots: [/^(?:screenshots?|images?)\s*[:—-]\s*(.+)$/im, 'Screenshots', 'none: the fold, looks and the screens after sign-up are listed as not checked'],
}
const IMG = /\.(png|jpe?g|gif|webp|heic)$/i, TXT = /\.(md|txt|eml|csv|pdf|docx?)$/i
export const slug = s => String(s).toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\..*$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-project'
export function check (text, attachmentFiles = [], profileText = '') {
  const found = {}, missing = [], assume = []
  let line = /^(?:product|website|site|url|app)\s*[:—-]\s*(.+)$/im.exec(text)
  if (!(line && !empty(line[1])) && !/\bhttps?:\/\//i.test(text) && profileText) { const pl = /^[-*\s]*(?:\*\*)?(?:product|website|site)(?:\*\*)?\s*[:—-]\s*(.*https?:\/\/.+)$/im.exec(profileText); if (pl) line = [pl[0], pl[1].replace(/\*\*/g, '').trim() + ' (from the profile)'] }
  const url = /\bhttps?:\/\/[^\s)>,"']+/i.exec(line && !empty(line[1]) ? line[1] : text)?.[0] || (/\b((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/[^\s,]*)?\b/i.exec(line && !empty(line[1]) ? line[1] : '')?.[0]) || null
  if (line && !empty(line[1])) found.product = line[1].trim()
  else if (url) found.product = url
  if (!url) missing.push('product')
  for (const [k, [re, label, value]] of Object.entries(OPTIONAL)) {
    const m = text.match(re)
    if (m && !empty(m[1])) found[k] = m[1].trim()
    else if (k === 'screenshots' && attachmentFiles.some(f => IMG.test(f))) found[k] = `${attachmentFiles.filter(f => IMG.test(f)).length} attached image(s)`
    else if (k === 'customer_voice' && attachmentFiles.some(f => TXT.test(f))) found[k] = `${attachmentFiles.filter(f => TXT.test(f)).length} attached file(s)`
    else assume.push({ field: k, label, value })
  }
  const name = line && !empty(line[1]) ? line[1].split(',')[0].trim() : null
  return {
    ok: !missing.length, found, missing, assume,
    url: url ? (/^https?:/i.test(url) ? url : `https://${url}`) : null,
    project: name && !/^https?:|\./i.test(name) ? slug(name) : url ? slug(url) : null,
    trafficGiven: !!found.traffic,
    say: missing.length ? "To do this I need: your product's website (for example \"Product: <name>, https://<your site>\")." : '',
  }
}
// save(text, artifactsDir, project): the request, word for word, never over a different earlier one
export function save (text, artifactsDir, project) {
  const dir = path.join(artifactsDir, project || 'new-project', 'inputs')
  fs.mkdirSync(dir, { recursive: true })
  for (let n = 1; n < 100; n++) {
    const f = path.join(dir, n === 1 ? 'request-review.md' : `request-review-${n}.md`)
    if (!fs.existsSync(f)) { fs.writeFileSync(f, text); return f }
    if (fs.readFileSync(f, 'utf8') === text) return f
  }
  throw new Error(`more than 99 saved requests in ${dir}`)
}
const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const full = check('Review our trial path\nProduct: Ledgerline, https://ledgerline.example\nPath: home, /signup, first invoice\nTraffic: 2,400 visits a month, 30 trials\nCustomer voice: two support emails below\nScreenshots: signup-phone.png')
    const bare = check('why don\'t visitors sign up?\nhttps://ledgerline.example')
    const att = check('Review our trial path\nProduct: Ledgerline, https://ledgerline.example', ['a/shot.png', 'a/notes.txt'])
    const none = check('Review our trial path please')
    const prof = check('Review our trial path', [], '# Profile\n- Website: Ledgerline, https://ledgerline.example\n')
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c04-inputs-')), req = 'Review our trial path\nProduct: Ledgerline, https://ledgerline.example\n'
    const s1 = save(req, tmp, full.project), s2 = save(req, tmp, full.project), s3 = save(req + 'Traffic: 900 visits a month\n', tmp, full.project), s4 = save('Review our trial path please\n', tmp, none.project)
    const cli = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '-', '--save', tmp], { input: 'why don\'t visitors sign up?\nhttps://ledgerline.example\n', encoding: 'utf8' })
    const viaStdin = JSON.parse(cli.stdout || '{}')
    const stdinSaved = viaStdin.saved && fs.readFileSync(viaStdin.saved, 'utf8') === 'why don\'t visitors sign up?\nhttps://ledgerline.example\n'
    fs.rmSync(tmp, { recursive: true, force: true })
    const t = [
      ['a full request assumes nothing; project from the name', full.ok && !full.assume.length && full.project === 'ledgerline' && full.trafficGiven],
      ['a bare URL is the product; four inputs assumed', bare.ok && bare.assume.length === 4 && bare.project === 'ledgerline' && !bare.trafficGiven],
      ['attachments count as screenshots and customer voice', att.ok && att.found.screenshots && att.found.customer_voice && att.assume.length === 2],
      ['no product ends partial', !none.ok && none.missing[0] === 'product'],
      ['a website in the profile counts as the product', prof.ok && prof.url === 'https://ledgerline.example' && prof.project === 'ledgerline'],
      ['--save writes into the product\'s folder, word for word; the same request again is the same file; a different one never overwrites; no product is new-project', s1.endsWith(path.join('ledgerline', 'inputs', 'request-review.md')) && s2 === s1 && s3.endsWith('request-review-2.md') && s4.endsWith(path.join('new-project', 'inputs', 'request-review.md'))],
      ['"-" reads the request from stdin and --save saves it in the product\'s folder only', cli.status === 0 && viaStdin.project === 'ledgerline' && stdinSaved && viaStdin.saved.includes(path.join('ledgerline', 'inputs'))],
    ]
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed })); process.exit(failed.length ? 1 : 0)
  }
  const takes = new Set(['--attachments', '--profile', '--save'])
  const src = a.find((x, k) => (x === '-' || !x.startsWith('--')) && !takes.has(a[k - 1]))
  if (!src || (src !== '-' && !fs.existsSync(src))) { console.log(JSON.stringify({ ok: false, errors: ['give the request: a saved file, or "-" with the request on stdin; see --help'] })); process.exit(2) }
  const text = src === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(src, 'utf8')
  const opt = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null }
  const dir = opt('--attachments'), pf = opt('--profile'), to = opt('--save')
  const files = dir && fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !f.startsWith('.')).map(f => path.join(dir, f)) : []
  const r = check(text, files, pf && fs.existsSync(pf) ? fs.readFileSync(pf, 'utf8') : '')
  if (to) { r.project = r.project || 'new-project'; r.saved = save(text, to, r.project) }
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
