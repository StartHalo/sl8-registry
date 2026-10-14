#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Make UGC b-roll for our product).
// Only the product is required: without it there is no job. Every other input is assumed when missing,
// and edit-order.md's Assumptions section gives each one a line starting "**<label>:**" (D40).
// No prompts; JSON on stdout; exit 1 only when the required input is missing; writes nothing.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
const empty = v => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)
const REQUIRED = { product: /^(?:product|offer|item)\s*[:—-]\s*(.+)$/im }
export const OPTIONAL = {
  packshot: [/^(?:packshot|product[ _]photo|photo|image)\s*[:—-]\s*(.+)$/im, 'Packshot'],
  beats: [/^(?:beats|moments|shots)\s*[:—-]\s*(.+)$/im, 'Beats'],
  clips: [/^(?:clips(?:[ _]and[ _]length)?|length|runtime)\s*[:—-]\s*(.+)$/im, 'Clips and length'],
  format: [/^(?:format|aspect|resolution)\s*[:—-]\s*(.+)$/im, 'Format and resolution'],
  tone: [/^tone\s*[:—-]\s*(.+)$/im, 'Tone'],
  on_screen_text: [/^(?:on[- _]screen[ _]text|captions?|cta)\s*[:—-]\s*(.+)$/im, 'On-screen text'],
  budget: [/^budget(?:[ _]credits)?\s*[:—-]\s*(.+)$/im, 'Budget'],
}
const ASK = { product: 'the product: what it is and what it looks like (a packshot helps)' }
export function check (text) {
  const found = {}, missing = [], assume = []
  for (const [k, re] of Object.entries(REQUIRED)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else missing.push(k) }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? `To do this I need: ${missing.map(k => ASK[k]).join('; ')}.` : '' }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const full = check('Make UGC b-roll for our product\nProduct: a water bottle\nPackshot: bottle.png\nBeats: cap, sip\nClips: 2 x 5 s\nFormat: 9:16 480p\nTone: calm\nOn-screen text: Shop now\nBudget: 400')
    const thin = check('Make UGC b-roll\nProduct: a water bottle')
    const none = check('Make UGC b-roll for us')
    const ok = full.ok && !full.assume.length && thin.ok && thin.assume.length === 7 && !none.ok && none.missing[0] === 'product' && /product/.test(none.say)
    console.log(JSON.stringify({ ok, cases: 3 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
