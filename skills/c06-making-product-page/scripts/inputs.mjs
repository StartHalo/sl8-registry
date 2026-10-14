#!/usr/bin/env node
// inputs.mjs: Factory's input check for this kit skill (job card: Make our product-page images). Only the product is
// required: without it there is no job. Every other input is assumed with the kit's default and named
// in PROGRESS.md under Decisions (D40). No prompts; JSON on stdout; exit 1 only when the product is
// missing; writes nothing.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
// "Product: …" (or Label: value lines a chat sends); a request whose first line names the product also counts
const REQUIRED = { product: /^(?:product|item)\s*[:—-]\s*(.+)$/im }
export const OPTIONAL = {
  packshot: [/^(?:packshot|product[ _]photo|photo)\s*[:—-]\s*(.+)$/im, 'Packshot'],
  set_mode: [/^(?:set|set[ _]mode|single or set|images)\s*[:—-]\s*(.+)$/im, 'Single image or set'],
  background: [/^(?:background|background[ _]colou?r)\s*[:—-]\s*(.+)$/im, 'Background'],
  brand_colour: [/^(?:brand[ _]colou?r)\s*[:—-]\s*(.+)$/im, 'Brand colour'],
  platform: [/^(?:platform|aspect|ratio|format)\s*[:—-]\s*(.+)$/im, 'Platform or aspect'],
  budget: [/^budget\s*[:—-]\s*(.+)$/im, 'Budget'],
}
const filled = v => v && !/^\s*(?:-|none|n\/a|tbd|\[.*\])\s*$/i.test(v)
export function check (text) {
  const found = {}, missing = [], assume = []
  for (const [k, re] of Object.entries(REQUIRED)) {
    const m = text.match(re)
    if (m && filled(m[1])) found[k] = m[1].trim()
    else { const first = text.split('\n').map(l => l.trim()).find(Boolean) || ''; const of = first.match(/(?:product[- ]page|pdp) (?:images?|set|photos?)? ?(?:of|for) (?:our |my |the )?(.+)$/i); if (of && filled(of[1])) found[k] = of[1].trim(); else missing.push(k) }
  }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && filled(m[1])) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? 'To do this I need: the product (what it is, its material and colour), as "Product: …".' : '' }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const full = check("Make our product-page images\nProduct: amber serum bottle\nPackshot: product.png\nSet: three matched\nBackground: white\nBrand colour: #F3EDE4\nPlatform: 1:1\nBudget: 200"), thin = check('Product: matte white ceramic mug'), worded = check("product-page images for our amber serum bottle"), none = check('Make one for us, please')
    const ok = full.ok && !full.assume.length && thin.ok && thin.assume.length === Object.keys(OPTIONAL).length && worded.ok && !none.ok && none.missing[0] === 'product'
    console.log(JSON.stringify({ ok, cases: 4 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1)
}
