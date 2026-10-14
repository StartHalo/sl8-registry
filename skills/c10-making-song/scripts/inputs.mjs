#!/usr/bin/env node
// inputs.mjs: reads the saved request for this job's inputs (job card: Make an original song or jingle).
// One input is required, the brief: any description of the track, and one line is enough. Only a request that
// says nothing about the track (no mood, genre, use or lyrics) is missing it. A request that answers an open
// gate (an `Answer:` line) is a resume and needs no new brief. Every other input is assumed (D40).
// Added by Factory to the kit-song copy (0.1.1). No prompts; JSON on stdout; exit 1 only when the brief is
// missing; writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HELP = 'usage: node inputs.mjs <request.md> | --selftest\n  prints {"ok","found":{…},"missing":[…],"assume":[{"field","label"}],"say":"…"}'
const empty = (v) => !v || /^\s*(<[^>]*>|tbd|\[tbd\]|n\/?a|-|—|\?)\s*$/i.test(v)
// lines that are about the job, not the track
const JOB_LINE = /^(?:job\s*[:—-]\s*)?make an original (?:song|track)(?: or jingle)?\.?\s*$/i
const ADMIN = /^(?:job|project|budget(?:[ _]credits)?|answer|format|delivery|language)\s*[:—-]/i
export const OPTIONAL = {
  lyrics: [/^lyrics\s*[:—-]\s*(.+)$/im, 'Lyrics'],
  category: [/^(?:category|type|vocal)\s*[:—-]\s*(.+)$/im, 'Category'],
  language: [/^language\s*[:—-]\s*(.+)$/im, 'Language'],
  format: [/^(?:format|delivery)\s*[:—-]\s*(.+)$/im, 'Format'],
  budget: [/^budget(?:[ _]credits)?\s*[:—-]\s*(.+)$/im, 'Budget'],
}
const ASK = { brief: 'one line on the track: its mood and genre, what it is for, or your lyrics (for example "an upbeat podcast intro theme")' }

export function check (text) {
  const found = {}, missing = [], assume = []
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean)
  const labelled = text.match(/^brief\s*[:—-]\s*(.+)$/im)
  const free = lines.filter((l) => !JOB_LINE.test(l) && !ADMIN.test(l) && !/^brief\s*[:—-]/i.test(l))
  const answer = text.match(/^answer\s*[:—-]\s*(.+)$/im)
  if (labelled && !empty(labelled[1])) found.brief = labelled[1].trim()
  else if (free.length) found.brief = free.join(' ')
  else if (answer && !empty(answer[1])) found.answer = answer[1].trim()
  else missing.push('brief')
  for (const [k, [re, label]] of Object.entries(OPTIONAL)) { const m = text.match(re); if (m && !empty(m[1])) found[k] = m[1].trim(); else assume.push({ field: k, label }) }
  return { ok: !missing.length, found, missing, assume, say: missing.length ? `To make the track I need ${missing.map((k) => ASK[k]).join('; ')}.` : '' }
}

// Compare real paths: on the machine skills are reached through a symlinked skills folder.
const real = (p) => { try { return fs.realpathSync(p) } catch { return path.resolve(p) } }
if (process.argv[1] && real(fileURLToPath(import.meta.url)) === real(process.argv[1])) {
  const a = process.argv.slice(2)
  if (a.includes('--help')) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) {
    const cases = [
      ['a labelled brief', check('Make an original song or jingle\nProject: x\nBrief: a calm piano piece for a cooking video\nBudget: 150'), true],
      ['a one-line free brief', check('a jingle for our coffee brand'), true],
      ['the job line only', check('Make an original song or jingle'), false],
      ['the job line plus admin labels only', check('Job: Make an original song or jingle\nProject: x\nBudget: 100'), false],
      ['a gate answer resumes', check('Make an original song or jingle\nProject: x\nAnswer: a\nBudget: 150'), true],
      ['lyrics alone are a brief', check('Make an original song or jingle\nLyrics: [Verse] we ride at dawn'), true],
    ]
    const results = cases.map(([name, r, ok]) => ({ name, pass: r.ok === ok }))
    // Called through a symlinked folder, as on the machine (a plain path compare skipped silently).
    const lt = fs.mkdtempSync(path.join(os.tmpdir(), 'c10-link-')), link = path.join(lt, 'linked')
    fs.symlinkSync(path.dirname(fileURLToPath(import.meta.url)), link)
    let viaLink = ''; try { viaLink = execFileSync(process.execPath, [path.join(link, 'inputs.mjs'), '--help'], { encoding: 'utf8' }) } catch {}
    fs.rmSync(lt, { recursive: true, force: true })
    results.push({ name: 'runs when called through a symlinked folder', pass: /usage: node inputs\.mjs/.test(viaLink) })
    const failed = results.filter((r) => !r.pass)
    console.log(JSON.stringify({ ok: !failed.length, cases: results.length, failed })); process.exit(failed.length ? 1 : 0)
  }
  if (!a[0] || !fs.existsSync(a[0])) { console.log(JSON.stringify({ ok: false, errors: ['give the saved request file; see --help'] })); process.exit(2) }
  const r = check(fs.readFileSync(a[0], 'utf8')); console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1)
}
