#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Review our email sequence).
// Only the emails are required: an "Emails:" line, emails pasted into the request (a "Subject:" line),
// or files in the attachments folder. Every other input is assumed when missing, and the review's
// Assumptions section gives each one a line starting "**<label>:**" (D40).
//   node inputs.mjs <request.md> [--attachments <dir>]  |  --selftest  |  --help
// No prompts; JSON on stdout; exit 1 only when the emails are missing; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
const HELP = 'usage: node inputs.mjs <request.md> [--attachments artifacts/attachments] | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)
export const OPTIONAL = {
  goal: [/^(?:goal|objective|conversion)\s*[:—-]\s*(.+)$/im, 'Goal'],
  product: [/^(?:product|website|app)\s*[:—-]\s*(.+)$/im, 'Product'],
  audience: [/^(?:who[ _]receives[ _]it|audience|recipients|segment)\s*[:—-]\s*(.+)$/im, 'Who receives it'],
}
// A goal the request states in its own words counts as given ("a trial-to-paid sequence", "our trial emails").
export const kind = t => /trial[- ]to[- ]paid|trial (?:emails|sequence|users)/i.test(t) ? 'trial users start a paid plan (from the request)' : /\blaunch/i.test(t) ? 'people try what launched (from the request)' : /onboarding/i.test(t) ? 'new users reach their first result (from the request)' : null
export function check (text, attachmentFiles = []) {
  const found = {}, missing = [], assume = []
  const line = /^(?:emails?|sequence)\s*[:—-]\s*(.+)$/im.exec(text)
  if (line && !empty(line[1])) found.emails = line[1].trim()
  else if (/^\s*subject\s*:/im.test(text)) found.emails = 'pasted in the request'
  else if (attachmentFiles.length) found.emails = `${attachmentFiles.length} attached file(s)`
  else missing.push('emails')
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else if (k === 'goal' && kind(text)) found.goal = kind(text); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? 'To do this I need: the emails to review (attach them, paste them, or say "the sequence you wrote").' : '' }
}
const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const named = check('Review our email sequence\nEmails: the sequence you wrote\nGoal: trial to paid')
    const pasted = check('Review our email sequence\n\nSubject: Welcome!\nHi there, thanks for signing up.')
    const attached = check('Review our email sequence', ['a.html'])
    const none = check('Review our email sequence please')
    const worded = check('what is wrong with our trial emails\nEmails: the sequence you wrote')
    const ok = worded.found.goal && named.ok && named.assume.length === 2 && pasted.ok && attached.ok && !none.ok && none.missing[0] === 'emails'
    console.log(JSON.stringify({ ok, cases: 4 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const i = a.indexOf('--attachments'), dir = i > -1 ? a[i + 1] : null
  const files = dir && fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !f.startsWith('.')).map(f => path.join(dir, f)) : []
  const r = check(fs.readFileSync(a[0], 'utf8'), files); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
