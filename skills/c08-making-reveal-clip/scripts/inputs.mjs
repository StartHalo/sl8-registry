#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Make a product reveal clip).
// Only the product is required: without it there is no job. Every other input is assumed when missing,
// and PROGRESS.md's Decisions section records each default taken (D40; the kit's step 1).
// No prompts; JSON on stdout; exit 1 only when the required input is missing; writes nothing.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
const line = (k) => new RegExp(`^(?:${k})\\s*[:—-]\\s*(.+)$`, 'im')
export const OPTIONAL = {
  hero_frame: [line('hero[ _]frame|approved[ _]frame|frame'), 'Hero frame'],
  packshot: [line('packshot|product[ _]photo|photo'), 'Packshot'],
  camera_movement: [line('camera[ _]move(?:ment)?|camera|move'), 'Camera move'],
  opening_frame: [line('opening[ _]frame|opening'), 'Opening frame'],
  duration: [line('duration|length'), 'Duration'],
  aspect: [line('aspect(?:[ _]ratio)?|platform|format'), 'Aspect'],
  resolution: [line('resolution|quality'), 'Resolution'],
  brand_tone: [line('tone|brand[ _]tone|brand'), 'Brand tone'],
  budget: [line('budget'), 'Budget'],
}
const JOB_LINE = /^\s*make (?:a |our )?(?:product )?reveal (?:clip|video)\s*$/i
const LABELLED = /^[A-Za-z][A-Za-z _]{0,30}\s*[:—-]\s*\S/

export function check (text) {
  const found = {}, missing = [], assume = []
  const p = text.match(line('product'))
  if (p && p[1].trim()) found.product = p[1].trim()
  else {
    // a free-text brief names the product in its own words: any line that is not the job name or a labelled input
    const prose = text.split('\n').map(l => l.trim()).filter(l => l && !JOB_LINE.test(l) && !LABELLED.test(l) && !/^#/.test(l))
    if (prose.length) found.product = { from: 'brief', text: prose.join(' ').slice(0, 200) }
    else missing.push('product')
  }
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && m[1].trim()) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? 'To make the reveal I need the product: its name, and what it looks like (material, colour, label).' : '' }
}

function selftest () {
  const full = check('Make a product reveal clip\nProduct: black pour-over kettle\nPackshot: kettle.png\nCamera move: push-in\nDuration: 5 s\nAspect: 16:9\nResolution: 480p\nTone: premium\nBudget: 250 credits')
  const prose = check('make a reveal video of our matte black kettle on a slate counter, slow push-in')
  const none = check('Make a product reveal clip')
  const ok = full.ok && full.found.resolution === '480p' && full.assume.length === 2 && prose.ok && prose.found.product.from === 'brief' && prose.assume.length === 9 && !none.ok && none.missing[0] === 'product'
  process.stdout.write(JSON.stringify({ ok, cases: 3 }) + '\n'); process.exit(ok ? 0 : 1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { process.stdout.write(HELP + '\n'); process.exit(0) }
  if (a.includes('--selftest')) selftest()
  if (!a[0] || !fs.existsSync(a[0])) { process.stdout.write(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] }) + '\n'); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8'))
  process.stdout.write(JSON.stringify(r, null, 2) + '\n'); process.exit(r.ok ? 0 : 1)
}
