#!/usr/bin/env node
// inputs.mjs: Factory's input check for this kit skill (job cards: Make our social ad frame / ad set). Only the
// product is required: without it there is no job. Every other input is assumed with the kit's default and named
// in DELIVERY.md and PROGRESS.md under Decisions (D40). No prompts; JSON on stdout; exit 1 only when the product
// is missing; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
// "Product: …" (or Label: value lines a chat sends); a request whose first line names the product also counts
const REQUIRED = { product: /^(?:product|item)\s*[:—-]\s*(.+)$/im }
export const OPTIONAL = {
  placement: [/^(?:placement|platform|aspect|ratio|format)\s*[:—-]\s*(.+)$/im, 'Placement'],
  packshot: [/^(?:packshot|product[ _]photo|photo)\s*[:—-]\s*(.+)$/im, 'Product photo'],
  scene: [/^(?:scene|setting|tone|background)\s*[:—-]\s*(.+)$/im, 'Scene and tone'],
  copy: [/^(?:copy|headline|logo)\s*[:—-]\s*(.+)$/im, 'Exact headline or logo'],
  budget: [/^budget\s*[:—-]\s*(.+)$/im, 'Budget'],
}
const filled = (v) => v && !/^\s*(?:-|none|n\/a|tbd|\[.*\])\s*$/i.test(v)
export function check (text) {
  const found = {}, missing = [], assume = []
  for (const [k, re] of Object.entries(REQUIRED)) {
    const m = text.match(re)
    if (m && filled(m[1])) found[k] = m[1].trim()
    else {
      const first = text.split('\n').map((l) => l.trim()).find(Boolean) || ''
      const of = first.match(/ad (?:frame|set|image)? ?(?:of|for) (?:our |my |the )?(.+)$/i)
      if (of && filled(of[1])) found[k] = of[1].trim(); else missing.push(k)
    }
  }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && filled(m[1])) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? 'To do this I need: the product (what it is, its material and colour), as "Product: …".' : '' }
}
const real = (p) => { try { return fs.realpathSync(p) } catch { return path.resolve(p) } }
if (process.argv[1] && real(fileURLToPath(import.meta.url)) === real(process.argv[1])) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const full = check('Make our social ad frame\nProduct: linen apron, oat colour\nPlacement: 9:16\nPackshot: apron.png\nScene: bakery counter\nCopy: Made to work\nBudget: 120 credits')
    const thin = check('Product: ceramic planter, terracotta')
    const worded = check('make a social ad for our ceramic planter')
    const none = check('Make our social ad set\nPlacement: feed')
    // the main block runs when the script is reached through a symlinked skill folder, as on the machine
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c07-inputs-')), link = path.join(tmp, 'linked'), req = path.join(tmp, 'r.md')
    fs.symlinkSync(path.dirname(fileURLToPath(import.meta.url)), link); fs.writeFileSync(req, 'Product: ceramic planter, terracotta')
    let viaLink = false
    try { viaLink = JSON.parse(execFileSync('node', [path.join(link, path.basename(fileURLToPath(import.meta.url))), req], { encoding: 'utf8' })).ok === true } catch {}
    fs.rmSync(tmp, { recursive: true, force: true })
    const ok = full.ok && !full.assume.length && thin.ok && thin.assume.length === Object.keys(OPTIONAL).length && worded.ok && !none.ok && none.missing[0] === 'product' && viaLink
    console.log(JSON.stringify({ ok, cases: 5 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1)
}
