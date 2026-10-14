#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic of the UGC b-roll set (D40; never quality).
// Checks artifacts/<project>/edit-order.md and its siblings: every clips/clip-NN.mp4 it names exists and
// has a voiceover note in its block; a Method line; an Assumptions section, with a "**<label>:**" line
// for each input the request left out (--request); PROGRESS.md's six sections; outcome.json's status;
// and outcome.json credits equal to the manifest's charged credits. No prompts; JSON on stdout; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { check as inputs } from './inputs.mjs'
const HELP = 'usage: node validate.mjs artifacts/<project>/edit-order.md [--request <request.md>] | --selftest\n  prints {"ok","errors":[…],"clips":n}'
const PROGRESS = ['Summary', 'Decisions', 'Asset inventory', 'Pipeline', 'Known gaps', 'Next steps']
export function validate (file, requestText) {
  const errors = [], dir = path.dirname(file)
  if (!fs.existsSync(file)) return { ok: false, errors: [`no ${file}`], clips: 0 }
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n'), starts = []
  lines.forEach((l, i) => { const m = l.match(/clips\/(clip-\d+(?:-r\d+)?\.mp4)/); if (m && !starts.some(s => s.name === m[1])) starts.push({ i, name: m[1] }) })
  if (!starts.length) errors.push('edit-order.md names no clips/clip-NN.mp4')
  starts.forEach((s, n) => {
    if (!fs.existsSync(path.join(dir, 'clips', s.name))) errors.push(`clips/${s.name} is named but missing`)
    const block = lines.slice(s.i, n + 1 < starts.length ? starts[n + 1].i : lines.length).join('\n').split(/^##\s+(?:Assumptions|Debts|Method)/m)[0]
    if (!/voice-?over|\bVO\b/i.test(block)) errors.push(`clips/${s.name} has no voiceover note`)
  })
  if (!/^\s*(?:[-*]\s*)?\**Method:?\**:?\s*\S/im.test(text)) errors.push('no Method line')
  const am = text.match(/^##\s+Assumptions\s*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/m)
  if (!am || !am[1].trim()) errors.push('no Assumptions section')
  else if (requestText) for (const a of inputs(requestText).assume) if (!new RegExp(`\\*\\*${a.label}:?\\*\\*`, 'i').test(am[1])) errors.push(`Assumptions has no "**${a.label}:**" line`)
  const pf = path.join(dir, 'PROGRESS.md')
  if (!fs.existsSync(pf)) errors.push('no PROGRESS.md')
  else { const p = fs.readFileSync(pf, 'utf8'); for (const s of PROGRESS) if (!new RegExp(`^##\\s+${s}\\b`, 'mi').test(p)) errors.push(`PROGRESS.md has no "## ${s}"`) }
  let outcome = null
  try { outcome = JSON.parse(fs.readFileSync(path.join(dir, 'outcome.json'), 'utf8')) } catch { errors.push('no readable outcome.json') }
  if (outcome && !['complete', 'partial', 'failed'].includes(outcome.status)) errors.push(`outcome.json status "${outcome?.status}" is not complete, partial or failed`)
  if (outcome && typeof outcome.credits === 'number') {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
      const sum = (m.assets || []).reduce((t, a) => t + (a.credits?.ledger ?? a.credits?.used ?? 0), 0)
      if (Math.abs(sum - outcome.credits) > 0.5) errors.push(`outcome.json credits ${outcome.credits} differ from the manifest's charged credits ${sum}`)
    } catch { errors.push('no readable manifest.json') }
  }
  return { ok: !errors.length, errors, clips: starts.length }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const mk = (edit, { credits = 356, charged = [178, 178], clips = ['clip-01.mp4', 'clip-02.mp4'] } = {}) => {
      const d = fs.mkdtempSync(path.join(os.tmpdir(), 'c09-v-')); fs.mkdirSync(path.join(d, 'clips'))
      for (const c of clips) fs.writeFileSync(path.join(d, 'clips', c), 'x')
      fs.writeFileSync(path.join(d, 'edit-order.md'), edit)
      fs.writeFileSync(path.join(d, 'PROGRESS.md'), PROGRESS.map(s => `## ${s}\nx\n`).join('\n'))
      fs.writeFileSync(path.join(d, 'outcome.json'), JSON.stringify({ status: 'complete', final: 'clips/', credits }))
      fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify({ assets: charged.map(c => ({ credits: { estimate: c, ledger: c } })), waivers: [] }))
      return path.join(d, 'edit-order.md')
    }
    const good = '# Edit order\n\n1. clips/clip-01.mp4 · hand unscrews the cap\n   - Voiceover: "Okay, this cap."\n2. clips/clip-02.mp4 · a sip\n   - Voiceover: "And it seals tight."\n\n## Debts\n- not stitched\n\nMethod: kit-ugc-creator-ad, six-beat script\n\n## Assumptions\n- **Tone:** casual; send a tone to change it\n'
    const req = 'Make UGC b-roll\nProduct: bottle\nPackshot: bottle.png\nBeats: cap, sip\nClips: 2 x 5 s\nFormat: 9:16 480p\nOn-screen text: none\nBudget: 400'
    const r1 = validate(mk(good), req)
    const r2 = validate(mk(good.replace('   - Voiceover: "And it seals tight."\n', '')), req)
    const r3 = validate(mk(good, { clips: ['clip-01.mp4'] }), req)
    const r4 = validate(mk(good, { credits: 300 }), req)
    const r5 = validate(mk(good.replace(/\n## Assumptions[\s\S]*$/, '\n')), req)
    const r6 = validate(mk(good), 'Make UGC b-roll\nProduct: bottle')
    const ok = r1.ok && r1.clips === 2 && !r2.ok && !r3.ok && !r4.ok && !r5.ok && !r6.ok
    console.log(JSON.stringify({ ok, cases: 6, failed: [r1, r2, r3, r4, r5, r6].map((r, i) => [i + 1, r.errors]).filter((x, i) => (i === 0) === !!x[1].length) })); process.exit(ok ? 0 : 1)
  }
  if (!a[0]) { console.log(JSON.stringify({ ok: false, errors: ['give artifacts/<project>/edit-order.md; see --help'] })); process.exit(2) }
  const ri = a.indexOf('--request'), req = ri > -1 && a[ri + 1] && fs.existsSync(a[ri + 1]) ? fs.readFileSync(a[ri + 1], 'utf8') : null
  const r = validate(a[0], req); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
