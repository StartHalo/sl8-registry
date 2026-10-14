#!/usr/bin/env node
// validate.mjs: checks a song job's pack under artifacts/<project>/ for completeness, wiring and arithmetic
// (D40): outcome.json, PROGRESS.md's six sections, and for a delivered song the track, prompt, lyrics for a
// vocal song, a manifest row naming the delivered file, and credits within the budget unless a gate approved
// more. Never judges the music or the words: that is the owner's listening review. Added by Factory to the
// kit-song skill (the kit's own checks are inline commands; Factory's setup check needs a script file).
// Written for an agent caller: no prompts, short --help, JSON on stdout, safe to re-run, writes nothing.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HELP = `usage: node validate.mjs <artifacts/<project> dir> [--budget <credits>] [--selftest]
  Checks outcome.json, PROGRESS.md sections and, when outcome is done, the track, prompt.txt, lyrics.txt
  (vocal), a manifest row naming the delivered file, and credits spent <= budget unless a gate was answered.
  prints JSON: {"ok":true|false, "status":"done|partial|failed|null", "errors":[…]}`
const SECTIONS = ['Summary', 'Decisions', 'Asset inventory', 'Pipeline', 'Known gaps', 'Next steps']
const MARKER = /^\[(intro|verse|chorus|bridge|outro)( \d+)?\]/i

const read = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
const json = (f) => { const t = read(f); if (t === null) return undefined; try { return JSON.parse(t) } catch { return null } }

export function check (dir, { budget = null } = {}) {
  const errors = []
  const outcome = json(path.join(dir, 'outcome.json'))
  if (outcome === undefined) errors.push('missing outcome.json')
  else if (outcome === null) errors.push('outcome.json does not parse')
  else if (!['done', 'partial', 'failed'].includes(outcome.status)) errors.push(`outcome.json status "${outcome.status}" is not done, partial or failed`)
  const progress = read(path.join(dir, 'PROGRESS.md'))
  if (progress === null) errors.push('missing PROGRESS.md')
  else for (const h of SECTIONS) if (!progress.includes(`## ${h}`)) errors.push(`PROGRESS.md has no "## ${h}" section`)
  const status = outcome?.status ?? null
  if (status === 'partial' && !outcome.reason && !(json(path.join(dir, 'manifest.json'))?.gates || []).some((g) => g.status === 'open')) errors.push('outcome is partial with no reason and no open gate')
  if (status !== 'done') return { status, errors }

  const delivered = outcome.delivered ? path.join(dir, outcome.delivered) : null
  if (!delivered) errors.push('outcome.json is done but names no delivered file')
  else if (!fs.existsSync(delivered) || fs.statSync(delivered).size === 0) errors.push(`delivered file ${outcome.delivered} is missing or empty`)
  if (read(path.join(dir, 'audio', 'prompt.txt')) === null) errors.push('missing audio/prompt.txt')
  const intent = json(path.join(dir, 'source', 'intent.json'))
  if (!intent) errors.push('missing or unreadable source/intent.json')
  else if (intent.category !== 'instrumental') {
    const lyrics = read(path.join(dir, 'audio', 'lyrics.txt'))
    if (lyrics === null) errors.push('vocal song with no audio/lyrics.txt')
    else if (!lyrics.split('\n').some((l) => MARKER.test(l.trim()))) errors.push('audio/lyrics.txt has no section marker')
  }
  const manifest = json(path.join(dir, 'manifest.json'))
  if (!manifest) errors.push('missing or unreadable manifest.json')
  else {
    const rel = delivered ? path.relative(path.dirname(dir), delivered) : null
    const rows = manifest.assets || []
    if (rel && !rows.some((r) => (r.files || []).some((f) => f.endsWith(rel)))) errors.push(`no manifest row names ${rel}`)
    const spent = rows.reduce((s, r) => s + (r.credits?.ledger ?? r.credits?.used ?? 0), 0)
    const approved = (manifest.gates || []).some((g) => g.status === 'answered' || g.answer)
    if (budget !== null && spent > budget && !approved) errors.push(`credits spent ${spent} exceed the budget ${budget} with no answered gate`)
  }
  return { status, errors }
}

function selftest () {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c10-validate-'))
  const mk = (name, files) => {
    const d = path.join(tmp, 'artifacts', name)
    for (const [f, c] of Object.entries(files)) { if (c === null) continue; fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), typeof c === 'string' ? c : JSON.stringify(c)) }
    return d
  }
  const progress = SECTIONS.map((h) => `## ${h}\n\nx\n`).join('\n')
  const good = (p, extra = {}) => ({
    'outcome.json': { status: 'done', delivered: `audio/${p}.mp3`, credits: 40 },
    'PROGRESS.md': progress,
    [`audio/${p}.mp3`]: 'ID3fake',
    'audio/prompt.txt': 'A bright acoustic jingle.',
    'audio/lyrics.txt': '[Verse]\nline\n[Chorus]\nline\n',
    'source/intent.json': { category: 'vocal-auto-lyrics' },
    'manifest.json': { assets: [{ id: 'song#1', status: 'done', files: [`artifacts/${p}/audio/${p}.mp3`], credits: { estimate: 40, used: 40 } }], gates: [] },
    ...extra,
  })
  const cases = [
    ['a delivered vocal song passes', mk('a', good('a')), {}, true],
    ['an instrumental needs no lyrics', mk('b', good('b', { 'audio/lyrics.txt': null, 'source/intent.json': { category: 'instrumental' } })), {}, true],
    ['a gated partial job passes', mk('c', { 'outcome.json': { status: 'partial' }, 'PROGRESS.md': progress, 'manifest.json': { assets: [], gates: [{ id: '01', status: 'open' }] } }), {}, true],
    ['a part missing: no lyrics on a vocal song', mk('d', good('d', { 'audio/lyrics.txt': null })), {}, false],
    ['a PROGRESS.md section missing', mk('e', good('e', { 'PROGRESS.md': '## Summary\n' })), {}, false],
    ['credits over budget with no gate', mk('f', good('f')), { budget: 30 }, false],
    ['credits over budget after an answered gate', mk('g', good('g', { 'manifest.json': { assets: [{ id: 'song#1', status: 'done', files: ['artifacts/g/audio/g.mp3'], credits: { estimate: null, used: 60 } }], gates: [{ id: '01', status: 'answered', answer: 'a' }] } })), { budget: 30 }, true],
    ['the delivered file is not in the manifest', mk('h', good('h', { 'manifest.json': { assets: [], gates: [] } })), {}, false],
  ]
  const results = cases.map(([name, d, o, ok]) => { const r = check(d, o); return { name, pass: (r.errors.length === 0) === ok, errors: r.errors } })
  fs.rmSync(tmp, { recursive: true, force: true })
  const failed = results.filter((r) => !r.pass)
  process.stdout.write(JSON.stringify({ ok: !failed.length, cases: results.length, failed }, null, 2) + '\n')
  process.exit(failed.length ? 1 : 0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const argv = process.argv.slice(2)
  const out = (o, c) => { process.stdout.write(JSON.stringify(o, null, 2) + '\n'); process.exit(c) }
  if (argv.includes('--help') || argv.includes('-h')) { process.stdout.write(HELP + '\n'); process.exit(0) }
  if (argv.includes('--selftest')) selftest()
  const dir = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--budget')
  if (!dir || !fs.existsSync(dir)) out({ ok: false, errors: ['give an existing artifacts/<project> folder; see --help'] }, 2)
  const b = argv.includes('--budget') ? Number(argv[argv.indexOf('--budget') + 1]) : null
  const r = check(dir, { budget: Number.isFinite(b) ? b : null })
  out({ ok: r.errors.length === 0, status: r.status, errors: r.errors.slice(0, 20) }, r.errors.length ? 1 : 0)
}
