#!/usr/bin/env node
// validate.mjs: completeness, wiring and arithmetic of a delivered reveal (job card: Make a product reveal
// clip; D40). Given artifacts/<project>/PROGRESS.md it checks the project folder the kit wrote: the six
// filled PROGRESS sections, a Decisions line for every input the request left out (with --request),
// outcome.json done with its final clip present, a done manifest row for that clip, the hero frame,
// the contact sheet, and the manifest's estimates within plan.json's budget. Never quality: fidelity,
// motion and taste are the person's check. No prompts; JSON on stdout; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { check as inputs } from './inputs.mjs'

const HELP = 'usage: node validate.mjs <artifacts/<project>/PROGRESS.md> [--request <request.md>] | --selftest\n  prints {"ok","errors":[…]}'
const SECTIONS = ['Summary', 'Decisions', 'Asset inventory', 'Pipeline', 'Known gaps', 'Next steps']
const json = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
// manifest.mjs writes files[] as objects ({path, sha256, bytes}); older rows may hold plain path strings
const filePath = (f) => (typeof f === 'string' ? f : f?.path)

export function validate (progressFile, requestText = null) {
  const errors = [], dir = path.dirname(progressFile)
  const text = fs.existsSync(progressFile) ? fs.readFileSync(progressFile, 'utf8') : ''
  if (!text) return ['missing PROGRESS.md']
  const parts = Object.fromEntries(text.split(/^## /m).slice(1).map(s => [s.split('\n', 1)[0].trim(), s.split('\n').slice(1).join('\n').trim()]))
  for (const s of SECTIONS) if (!(s in parts)) errors.push(`PROGRESS.md has no "## ${s}" section`); else if (!parts[s] || /<filled/.test(parts[s])) errors.push(`PROGRESS.md "## ${s}" is empty (write "None" when there is nothing)`)
  if (requestText != null) {
    const dec = (parts.Decisions || '').toLowerCase()
    for (const a of inputs(requestText).assume) {
      const words = a.label.toLowerCase().split(' ')
      if (!words.some(w => w.length > 3 && dec.includes(w))) errors.push(`Decisions has no line for the default taken for "${a.label}"`)
    }
  }
  const out = json(path.join(dir, 'outcome.json'))
  if (!out) errors.push('outcome.json missing or not JSON')
  else if (out.status !== 'done') errors.push(`outcome.json status is "${out.status}", not done${out.reason ? ` (${out.reason})` : ''}`)
  else if (!out.final || !fs.existsSync(path.join(dir, out.final))) errors.push(`outcome.json final "${out?.final}" does not exist`)
  const man = json(path.join(dir, 'manifest.json'))
  if (!man || !Array.isArray(man.assets)) errors.push('manifest.json missing or has no assets')
  else {
    if (out?.final && !man.assets.some(r => r.status === 'done' && (r.files || []).some(f => filePath(f) === out.final))) errors.push(`manifest.json has no done row for ${out.final}`)
    if (man.assets.some(r => r.status === 'pending')) errors.push('manifest.json has a pending row: fetch it with ai-gen result')
    const plan = json(path.join(dir, 'plan.json'))
    const total = plan?.budget?.total
    const est = man.assets.reduce((s, r) => s + (Number(r.credits?.estimate) || 0), 0)
    if (typeof total !== 'number') errors.push('plan.json budget.total is not a number')
    else if (est > total + 1e-9) errors.push(`manifest estimates sum to ${est}, over plan.json budget.total ${total}`)
  }
  const hero = fs.existsSync(path.join(dir, 'keyframes', 'hero.png')) || (fs.existsSync(path.join(dir, 'source')) && fs.readdirSync(path.join(dir, 'source')).some(f => /\.(png|jpe?g|webp)$/i.test(f)))
  if (!hero) errors.push('no hero frame (keyframes/hero.png or an approved frame in source/)')
  if (out?.final) { const n = (out.final.match(/reveal-(\d+)/) || [])[1]; if (n && !fs.existsSync(path.join(dir, 'qc', `reveal-${n}-sheet.jpg`))) errors.push(`no contact sheet qc/reveal-${n}-sheet.jpg`) }
  return errors
}

function selftest () {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c08-validate-')), d = path.join(tmp, 'kettle-reveal')
  for (const s of ['clips', 'keyframes', 'qc']) fs.mkdirSync(path.join(d, s), { recursive: true })
  for (const f of ['clips/reveal-01.mp4', 'keyframes/hero.png', 'qc/reveal-01-sheet.jpg']) fs.writeFileSync(path.join(d, f), 'x')
  const prog = SECTIONS.map(s => `## ${s}\n${s === 'Decisions' ? 'Defaults: hero frame generated; packshot none; camera move slow push-in; opening frame as composed; duration 4 s; aspect 16:9; resolution 720p; brand tone premium; budget from the ceiling.' : 'None'}`).join('\n')
  fs.writeFileSync(path.join(d, 'PROGRESS.md'), `# Kettle: Progress\n${prog}\n`)
  fs.writeFileSync(path.join(d, 'outcome.json'), JSON.stringify({ status: 'done', final: 'clips/reveal-01.mp4' }))
  fs.writeFileSync(path.join(d, 'plan.json'), JSON.stringify({ budget: { total: 220 } }))
  fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify({ assets: [{ item: 'hero', status: 'done', files: [{ path: 'keyframes/hero.png', sha256: 'a', bytes: 1 }], credits: { estimate: 40 } }, { item: 'reveal', status: 'done', files: [{ path: 'clips/reveal-01.mp4', sha256: 'b', bytes: 1 }], credits: { estimate: 178 } }] }))
  const P = path.join(d, 'PROGRESS.md'), R = 'Make a product reveal clip\nProduct: black pour-over kettle'
  const results = [['a complete delivery passes (manifest files[] as objects)', validate(P, R).length === 0]]
  const man = fs.readFileSync(path.join(d, 'manifest.json'), 'utf8')
  fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify({ assets: [{ item: 'hero', status: 'done', files: ['keyframes/hero.png'], credits: { estimate: 40 } }, { item: 'reveal', status: 'done', files: ['clips/reveal-01.mp4'], credits: { estimate: 178 } }] }))
  results.push(['a manifest with plain path strings still passes', validate(P, R).length === 0])
  fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify({ assets: [{ item: 'hero', status: 'done', files: [{ path: 'keyframes/hero.png' }], credits: { estimate: 40 } }] }))
  results.push(['no done row for the final clip fails', validate(P, R).some(e => /no done row for clips\/reveal-01.mp4/.test(e))])
  fs.writeFileSync(path.join(d, 'manifest.json'), man)
  const link = path.join(tmp, 'linked'); fs.symlinkSync(path.dirname(fileURLToPath(import.meta.url)), link)
  const viaLink = spawnSync(process.execPath, [path.join(link, 'validate.mjs'), P, '--request', '/nonexistent'], { encoding: 'utf8' })
  results.push(['run through a symlinked skills folder, it still validates and prints JSON', /"ok": true/.test(viaLink.stdout || '')])
  fs.writeFileSync(path.join(d, 'plan.json'), JSON.stringify({ budget: { total: 200 } }))
  results.push(['estimates over the budget fail', validate(P, R).some(e => /over plan/.test(e))])
  fs.writeFileSync(path.join(d, 'plan.json'), JSON.stringify({ budget: { total: 220 } }))
  fs.writeFileSync(path.join(d, 'PROGRESS.md'), `# Kettle\n${prog.replace('## Known gaps\nNone', '## Known gaps\n')}`)
  results.push(['an empty section fails', validate(P, R).some(e => /Known gaps/.test(e))])
  fs.writeFileSync(path.join(d, 'PROGRESS.md'), `# Kettle\n${prog.replace(/Defaults:.*/, 'Defaults taken.')}`)
  results.push(['a missing assumption line fails', validate(P, R).some(e => /Decisions has no line/.test(e))])
  fs.rmSync(path.join(d, 'qc', 'reveal-01-sheet.jpg'))
  results.push(['a missing contact sheet fails', validate(P).some(e => /contact sheet/.test(e))])
  fs.rmSync(tmp, { recursive: true, force: true })
  const failed = results.filter(([, ok]) => !ok).map(([n]) => n)
  process.stdout.write(JSON.stringify({ ok: !failed.length, cases: results.length, failed }) + '\n'); process.exit(failed.length ? 1 : 0)
}

// Compare real paths: skills call this script through a symlinked skills folder.
const real = p => { try { return fs.realpathSync(p) } catch { return path.resolve(p) } }
if (process.argv[1] && real(fileURLToPath(import.meta.url)) === real(process.argv[1])) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { process.stdout.write(HELP + '\n'); process.exit(0) }
  if (a.includes('--selftest')) selftest()
  const f = a.find(x => !x.startsWith('--') && a[a.indexOf(x) - 1] !== '--request')
  if (!f) { process.stdout.write(JSON.stringify({ ok: false, errors: ['give artifacts/<project>/PROGRESS.md; see --help'] }) + '\n'); process.exit(2) }
  const rq = a.includes('--request') ? a[a.indexOf('--request') + 1] : null
  const errors = validate(f, rq && fs.existsSync(rq) ? fs.readFileSync(rq, 'utf8') : null)
  process.stdout.write(JSON.stringify({ ok: !errors.length, errors }, null, 2) + '\n'); process.exit(errors.length ? 1 : 0)
}
