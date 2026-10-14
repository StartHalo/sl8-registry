#!/usr/bin/env node
// inputs.mjs: Factory's input check for this kit skill (job card: Make our product hero image). Only the product is
// required: without it there is no job. Every other input is assumed with the kit's default and named
// in PROGRESS.md under Decisions (D40). No prompts; JSON on stdout; exit 1 only when the product is
// missing; writes nothing.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import osL from 'node:os'
import pathL from 'node:path'
const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
// "Product: …" (or Label: value lines a chat sends); a request whose first line names the product also counts
const REQUIRED = { product: /^(?:product|item)\s*[:—-]\s*(.+)$/im }
export const OPTIONAL = {
  product_photo: [/^(?:product[ _]photo|photo|packshot)\s*[:—-]\s*(.+)$/im, 'Product photo'],
  setting: [/^(?:setting|surface|background|scene)\s*[:—-]\s*(.+)$/im, 'Setting'],
  light: [/^(?:light|lighting)\s*[:—-]\s*(.+)$/im, 'Lighting'],
  camera: [/^(?:camera|angle|view)\s*[:—-]\s*(.+)$/im, 'Camera angle'],
  platform: [/^(?:platform|aspect|ratio|format)\s*[:—-]\s*(.+)$/im, 'Platform or aspect'],
  copy: [/^(?:copy|headline|logo)\s*[:—-]\s*(.+)$/im, 'Copy or logo'],
  budget: [/^budget\s*[:—-]\s*(.+)$/im, 'Budget'],
}
const filled = v => v && !/^\s*(?:-|none|n\/a|tbd|\[.*\])\s*$/i.test(v)
export function check (text) {
  const found = {}, missing = [], assume = []
  for (const [k, re] of Object.entries(REQUIRED)) {
    const m = text.match(re)
    if (m && filled(m[1])) found[k] = m[1].trim()
    else { const first = text.split('\n').map(l => l.trim()).find(Boolean) || ''; const of = first.match(/hero (?:image|shot|still)? ?(?:of|for) (?:our |my |the )?(.+)$/i); if (of && filled(of[1])) found[k] = of[1].trim(); else missing.push(k) }
  }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && filled(m[1])) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? 'To do this I need: the product (what it is, its material and colour), as "Product: …".' : '' }
}
// Compare real paths: on the machine skills are reached through a symlinked folder (audit product-hero-1, 0.1.1).
const realOf = p => { try { return fs.realpathSync(p) } catch { return p } }
if (process.argv[1] && realOf(fileURLToPath(import.meta.url)) === realOf(process.argv[1])) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const full = check("Make our product hero image\nProduct: white running sneaker, blue outsole\nProduct photo: sneaker.png\nSetting: concrete\nLighting: studio flash\nCamera: three-quarter\nPlatform: 1:1\nCopy: Run lighter.\nBudget: 100"), thin = check('Product: matte white ceramic mug'), worded = check("make a hero image of our white running sneaker"), none = check('Make one for us, please')
    const viaLink = (() => { const d = fs.mkdtempSync(osL.tmpdir() + '/link-'), l = d + '/scripts'; fs.symlinkSync(pathL.dirname(fileURLToPath(import.meta.url)), l)
      try { return execFileSync(process.execPath, [l + '/' + pathL.basename(fileURLToPath(import.meta.url)), '--help'], { encoding: 'utf8' }) } catch { return '' } finally { fs.rmSync(d, { recursive: true, force: true }) } })()
    const linkOk = /usage: node/.test(viaLink)
    const ok = (full.ok && !full.assume.length && thin.ok && thin.assume.length === Object.keys(OPTIONAL).length && worded.ok && !none.ok && none.missing[0] === 'product') && linkOk
    console.log(JSON.stringify({ ok, cases: 5 })); process.exit(ok ? 0 : 1)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1)
}
