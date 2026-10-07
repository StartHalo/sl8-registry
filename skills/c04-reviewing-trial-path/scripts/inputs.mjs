#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Review our trial path).
// Only the product is required: a "Product:" (or "Website:") line, or any web address in the request.
// Every other input is assumed when missing, and the review's Assumptions section gives each one a
// line starting "**<label>:**" (D40). Attachments count as screenshots (images) or customer voice (text).
// A website line in artifacts/profile.md (what the founder said earlier) counts as the product when the
// request names none.
//   node inputs.mjs <request.md> [--attachments <dir>] [--profile artifacts/profile.md]  |  --selftest  |  --help
// No prompts; JSON on stdout; exit 1 only when the product is missing; writes nothing.
import fs from 'node:fs'
import path from 'node:path'

const HELP = 'usage: node inputs.mjs <request.md> [--attachments artifacts/attachments] [--profile artifacts/profile.md] | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label","value"}],"url","project","trafficGiven","say"}'
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
    const t = [
      ['a full request assumes nothing; project from the name', full.ok && !full.assume.length && full.project === 'ledgerline' && full.trafficGiven],
      ['a bare URL is the product; four inputs assumed', bare.ok && bare.assume.length === 4 && bare.project === 'ledgerline' && !bare.trafficGiven],
      ['attachments count as screenshots and customer voice', att.ok && att.found.screenshots && att.found.customer_voice && att.assume.length === 2],
      ['no product ends partial', !none.ok && none.missing[0] === 'product'],
      ['a website in the profile counts as the product', prof.ok && prof.url === 'https://ledgerline.example' && prof.project === 'ledgerline'],
    ]
    const failed = t.filter(x => !x[1]).map(x => x[0])
    console.log(JSON.stringify({ ok: !failed.length, cases: t.length, failed })); process.exit(failed.length ? 1 : 0)
  }
  if (!fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const i = a.indexOf('--attachments'), dir = i > -1 ? a[i + 1] : null
  const files = dir && fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !f.startsWith('.')).map(f => path.join(dir, f)) : []
  const j = a.indexOf('--profile'), pf = j > -1 ? a[j + 1] : null
  const r = check(fs.readFileSync(a[0], 'utf8'), files, pf && fs.existsSync(pf) ? fs.readFileSync(pf, 'utf8') : ''); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
