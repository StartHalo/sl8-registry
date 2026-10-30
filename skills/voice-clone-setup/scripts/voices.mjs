#!/usr/bin/env node
// voices.mjs: a cloned voice's record in the project's voice registry, artifacts/<p>/audio/voices.json
// (the file media-audio-generation reads and writes; keys are project roles, not voice names).
// The role's private files live in artifacts/<p>/audio/voices/<role>/ (made by sample.mjs).
//   show    --project P [--role R]
//   preflight --project P --role R --route minimax|qwen|oneshot [--consent C]   the record's refusals, before any paid call; writes nothing
//   record  --project P --role R --route minimax|qwen|oneshot --consent C --consent-words W --terms-url U --privacy-url U
//           [--language L] [--result clone.result.json] [--reference-text-file F] [--replace | --reclone | --switch-route]
//           C is "owner" or "written permission from <name>": the only two forms (empty blocks the run).
//           W is the person's reply, verbatim; it is stored with the two URLs the statement quoted and a timestamp.
//           --switch-route: same role, same original recording, another route; keeps consent and proof, keeps the
//           old route's id (previous_route) until the new audition is approved; the old voice is not deleted.
//           minimax needs --result (the `ai-gen result` envelope; the id is raw.custom_voice_id) and
//           writes <role dir>/clone.json for the manifest row; qwen needs --reference-text-file.
//           --reclone: same role, same route and sample, new id after a lapse, stored consent kept.
//   check   --project P --role R [--endpoint ID] [--for audition|production]   consent, route and model, files, days unused;
//           --for production (the default) exits 1 unless the audition verdict is approved; the audition call itself uses --for audition
//   touch   --project P --role R                   last_used_at = now (every use, and before finishing)
//   withdraw --project P --role R                  the person withdrew consent: consent null, check blocks
//   rate    --project P --role R --text-file F --duration-ms N [--file AUDIO]   measured rate_wps (words per second);
//           a language written without word spaces (Chinese, Japanese, Thai ...) gets rate_cps and rate_wps stays null
//   verdict --project P --role R --verdict approved|adjust|re-record|pending [--file AUDIO] [--by "<their words>"]
//           approved needs --by, the person's reply verbatim
//   lang    --project P --role R --language-boost NAME   the speech model's language value, once read
//   delete  --project P --role R --confirm         the role's record, its folder, the job's working copies of the personal data
//           and the manifest rows (marked rejected); the consent gate files stay as the consent record
// Options: --artifacts DIR (default ./artifacts), --work DIR (default ./work). Prints ONE JSON line.
// Stored paths are relative to artifacts/<p>/ (audio/voices/<role>/...), so any working directory finds them.
// Exit: 0 ok · 1 refused or blocked · 2 usage · 3 no record for the role.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const ROUTES = {
  minimax: { endpoint: 'fal-ai/minimax/speech-2.8-hd', clone_endpoint: 'fal-ai/minimax/voice-clone', lapse_days: 7 },
  qwen: { endpoint: 'fal-ai/qwen-3-tts/clone-voice/1.7b', clone_endpoint: null, lapse_days: null },
  oneshot: { endpoint: 'resemble-ai/chatterboxhd/text-to-speech', clone_endpoint: null, lapse_days: null }
}
const CONSENT = /^(owner|written permission from [^<>\s][^<>]*)$/
const DAY = 86400000

function out (exit, body) { process.stdout.write(JSON.stringify({ check: 'voices', exit, ...body }) + '\n'); process.exit(exit) }
const usage = (msg) => out(2, { error: msg })
const argv = process.argv.slice(2)
const cmd = argv[0]
if (!['show', 'record', 'check', 'touch', 'withdraw', 'rate', 'verdict', 'lang', 'delete', 'preflight'].includes(cmd)) usage(`unknown command ${cmd ?? '(none)'}: show, record, check, touch, withdraw, rate, verdict, lang, delete or preflight`)
const o = {}
for (let i = 1; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('--')) usage(`unexpected argument ${a}`)
  const v = argv[i + 1]
  if (v === undefined || v.startsWith('--')) o[a.slice(2)] = true
  else { o[a.slice(2)] = v; i++ }
}
if (typeof o.project !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(o.project)) usage('--project must be a kebab-case name')
const root = path.resolve(typeof o.artifacts === 'string' ? o.artifacts : 'artifacts', o.project)
const regFile = path.join(root, 'audio', 'voices.json')
const rel = (p) => path.relative(process.cwd(), p).split(path.sep).join('/')
const inRoot = (p) => path.relative(root, p).split(path.sep).join('/') // what the registry stores
const abs = (p) => path.resolve(root, p) // and how it reads it back, from any working directory
const workDir = path.resolve(typeof o.work === 'string' ? o.work : 'work', o.project)
const now = () => new Date().toISOString()
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex')
function load () {
  if (!fs.existsSync(regFile)) return {}
  try { return JSON.parse(fs.readFileSync(regFile, 'utf8')) } catch (e) { out(1, { error: `${rel(regFile)} is not JSON (${e.message}): fix it before writing` }) }
}
function save (reg) {
  fs.mkdirSync(path.dirname(regFile), { recursive: true })
  const tmp = `${regFile}.tmp-${process.pid}`
  fs.writeFileSync(tmp, JSON.stringify(reg, null, 2) + '\n'); fs.renameSync(tmp, regFile)
}
function roleArg () {
  if (typeof o.role !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(o.role)) usage('--role is a project role key such as narrator or host')
  return o.role
}
const roleDir = (r) => path.join(root, 'audio', 'voices', r)
function need (reg, r) { if (!reg[r]) out(3, { role: r, registry: rel(regFile), error: `no voice is saved for role ${r}` }); return reg[r] }

const reg = load()

if (cmd === 'show') {
  if (o.role) { const r = roleArg(); out(0, { registry: rel(regFile), role: r, entry: need(reg, r) }) }
  out(0, { registry: rel(regFile), roles: Object.keys(reg), entries: reg })
}

const r = roleArg()

if (cmd === 'record' || cmd === 'preflight') {
  const dry = cmd === 'preflight'
  const route = ROUTES[o.route]
  if (!route) usage('--route is minimax, qwen or oneshot')
  const consent = typeof o.consent === 'string' ? o.consent.trim() : ''
  const prev = reg[r]
  const sw = o['switch-route'] === true
  if (sw && (o.replace || o.reclone)) usage('--switch-route stands alone')
  if (sw) {
    if (!prev) out(1, { role: r, error: 'no voice is saved for this role: --switch-route needs one' })
    if (prev.route === o.route) out(1, { role: r, error: `the role is already on ${o.route}` })
    if (!CONSENT.test(prev.consent ?? '')) out(1, { role: r, error: 'the stored consent is empty or withdrawn: a route switch needs it' })
  } else if (o.reclone) {
    if (o.route !== 'minimax' || !prev || prev.route !== 'minimax') out(1, { role: r, error: '--reclone is --route minimax on an existing minimax record for this role' })
    if (!CONSENT.test(prev.consent ?? '')) out(1, { role: r, error: 'the stored consent is empty or not one of the two forms: a re-clone needs it' })
  } else if ((consent || !dry) && !CONSENT.test(consent)) {
    out(1, { role: r, error: 'consent must be "owner" or "written permission from <the speaker\'s name>": possessing or uploading a file is not consent, and an empty value blocks the run' })
  }
  const base = r.replace(/\d+$/, '')
  if (base !== r && reg[base]) out(1, { role: r, error: `a second voice gets its own role key, never ${r} beside ${base}` })
  if (prev && !o.replace && !o.reclone && !sw) out(1, { role: r, existing: { route: prev.route, voice: prev.voice ?? null, created_at: prev.created_at }, error: `role ${r} already has a voice: reuse it, switch its route on the same recording (--switch-route), or replace it only after naming it to the person and getting their confirmation (--replace)` })
  const proof = []
  if (!o.reclone && !sw && !dry) {
    for (const k of ['consent-words', 'terms-url', 'privacy-url']) if (typeof o[k] !== 'string' || !o[k].trim()) proof.push(`--${k}`)
    if (proof.length) out(1, { role: r, error: `the consent proof is missing ${proof.join(', ')}: store the person's reply verbatim and the two links the statement quoted` })
  }
  const dir = roleDir(r)
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : []
  const original = files.find((f) => /^original\./.test(f))
  const sampleName = `sample-${o.route}.mp3`
  const notes = []
  if (!original || !files.includes(sampleName)) {
    if (!dry) out(1, { role: r, error: `${rel(dir)} needs original.* and ${sampleName}: run sample.mjs prep first` })
    notes.push('the sample is not prepared yet: the duplicate-recording check runs again at record time')
  }
  const sampleSha = original && files.includes(sampleName) ? sha(path.join(dir, sampleName)) : null
  const originalSha = original ? sha(path.join(dir, original)) : null
  if (o.reclone && prev.clone_sample_sha256 && sampleSha && prev.clone_sample_sha256 !== sampleSha) out(1, { role: r, error: 'the sample differs from the one the stored consent covers: a different recording needs new consent (a replacement, not a re-clone)' })
  if (sw && originalSha && prev.original_sha256 && prev.original_sha256 !== originalSha) out(1, { role: r, error: 'the original recording differs from the one the stored consent covers: a different recording needs new consent (a replacement, not a route switch)' })
  if (sampleSha) {
    for (const [k, e] of Object.entries(reg)) {
      if (k !== r && e.clone_sample_sha256 && (e.clone_sample_sha256 === sampleSha || (originalSha && e.original_sha256 === originalSha))) out(1, { role: r, error: `this recording is already saved as role ${k}: reuse that record rather than making a duplicate` })
    }
  }
  if (dry) out(0, { role: r, route: o.route, preflight: 'ok', consent: o.reclone || sw ? prev.consent : consent, notes })
  let voice = null
  const extra = {}
  if (o.route === 'minimax') {
    if (typeof o.result !== 'string' || !fs.existsSync(o.result)) usage('minimax needs --result <the ai-gen result envelope of the clone call>')
    const env = JSON.parse(fs.readFileSync(o.result, 'utf8'))
    if (env.success === false || env.ready === false) out(1, { role: r, error: env.ready === false ? 'the clone job is not finished: run ai-gen result again' : `the clone call failed (${env.error?.code}): report its message as it is, never swap in a stock voice` })
    voice = env.raw?.custom_voice_id ?? env.data?.custom_voice_id ?? env.custom_voice_id ?? null // the last: a role's own clone.json
    if (typeof voice !== 'string' || !voice) out(1, { role: r, error: 'no custom_voice_id in the answer (raw.custom_voice_id): report the answer, do not retry blind' })
    const clone = { request_id: env.request_id ?? null, model: env.model ?? route.clone_endpoint, custom_voice_id: voice, files: (env.files ?? []).map((f) => f.local_path).filter(Boolean), at: now() }
    fs.writeFileSync(path.join(dir, 'clone.json'), JSON.stringify(clone, null, 2) + '\n')
    extra.clone_record = inRoot(path.join(dir, 'clone.json'))
  }
  if (o.route === 'qwen') {
    if (typeof o['reference-text-file'] !== 'string' || !fs.existsSync(o['reference-text-file'])) usage('qwen needs --reference-text-file <the transcript of the sample, checked by the person>')
    const t = fs.readFileSync(o['reference-text-file'], 'utf8').trim()
    if (!t) out(1, { role: r, error: 'the transcript is empty' })
    extra.reference_text = t
  }
  const at = now()
  const fresh = {
    endpoint: route.endpoint,
    voice,
    route: o.route,
    clone_endpoint: route.clone_endpoint,
    clone_sample: inRoot(path.join(dir, sampleName)),
    clone_sample_sha256: sampleSha,
    ...(o.route === 'oneshot' ? { one_off: true } : {}),
    ...extra,
    created_at: at,
    last_used_at: at,
    rate_wps: null,
    rate_measured_at: null,
    rate_source: null,
    audition: { file: null, verdict: 'pending', at: null }
  }
  let entry
  if (o.reclone) entry = { ...prev, voice, ...extra, recloned_at: at, last_used_at: at }
  else if (sw) {
    // Consent, proof, language and the original stay; the old route's fields are kept whole until the new audition is approved.
    const { endpoint, voice: pv, route: pr, clone_endpoint, clone_sample, clone_sample_sha256, reference_text, clone_record, audition } = prev
    entry = { ...prev, ...fresh, reference_text: extra.reference_text, clone_record: extra.clone_record, previous_route: { endpoint, voice: pv ?? null, route: pr, clone_endpoint, clone_sample, clone_sample_sha256, reference_text, clone_record, audition, kept_until: 'the new audition is approved' }, switched_at: at }
    for (const k of ['reference_text', 'clone_record']) if (entry[k] === undefined) delete entry[k]
  } else {
    entry = {
      ...fresh,
      consent,
      consent_proof: { words: o['consent-words'].trim(), terms_url: o['terms-url'].trim(), privacy_url: o['privacy-url'].trim(), at },
      language: typeof o.language === 'string' ? o.language : 'en',
      language_boost: null,
      sample_path: inRoot(path.join(dir, original)),
      original_sha256: originalSha
    }
  }
  reg[r] = entry
  save(reg)
  out(0, { registry: rel(regFile), role: r, entry, replaced: prev && o.replace ? { route: prev.route, voice: prev.voice ?? null, created_at: prev.created_at } : null })
}

const e = need(reg, r)

if (cmd === 'check') {
  const fails = []; const notes = []
  if (!CONSENT.test(e.consent ?? '')) fails.push('consent is empty or not one of the two forms: the run is blocked')
  const route = ROUTES[e.route]
  if (!route) fails.push(`route ${e.route} is unknown`)
  if (typeof o.endpoint === 'string' && route && o.endpoint !== route.endpoint) fails.push(`${o.endpoint} cannot speak a ${e.route} clone: use ${route.endpoint} (a clone is not portable across models; never re-clone just to change models)`)
  if (e.route === 'minimax' && !e.voice) fails.push('no voice id on a minimax record')
  if (e.route === 'oneshot') notes.push('a one-off match: no reusable voice exists for this role; a new clip needs the sample again')
  const forWhat = o.for === undefined ? 'production' : o.for
  if (!['audition', 'production'].includes(forWhat)) usage('--for is audition or production')
  const sample = e.clone_sample && fs.existsSync(abs(e.clone_sample))
  if (!sample) {
    if (e.route === 'qwen' || e.route === 'oneshot') fails.push(`the sample ${e.clone_sample} is gone: this route cannot speak without it`)
    else notes.push(`the sample ${e.clone_sample} is gone: a lapsed id cannot be re-made without a new recording and new consent`)
  }
  const days = e.last_used_at ? Math.floor((Date.now() - Date.parse(e.last_used_at)) / DAY) : null
  const lapse = route?.lapse_days != null && days != null && days >= route.lapse_days
  if (lapse) notes.push(`unused for ${days} days: the provider deletes a MiniMax id after ${route.lapse_days} unused days, so a voice error on the next call means re-clone (step 13)`)
  const approved = e.audition?.verdict === 'approved'
  if (!approved) {
    const m = `audition verdict is ${e.audition?.verdict ?? 'none'}: not for production until the person approves`
    if (forWhat === 'production') fails.push(m); else notes.push(m)
  }
  if (e.previous_route) notes.push(`the role was switched from ${e.previous_route.route}; that route's voice is kept, not deleted, until this audition is approved`)
  if (approved && e.recloned_at && (!e.audition.at || e.recloned_at > e.audition.at)) notes.push(`the voice was re-made on ${e.recloned_at} from the same recording; the approved audition was of the earlier id: say so in the delivery and ask the person to listen for a difference`)
  out(fails.length ? 1 : 0, { role: r, for: forWhat, route: e.route, endpoint: e.endpoint, voice: e.voice ?? null, consent: e.consent ?? null, language: e.language ?? null, language_boost: e.language_boost ?? null, days_unused: days, lapse_likely: lapse, approved, fails, notes })
}

if (cmd === 'touch') { e.last_used_at = now(); save(reg); out(0, { role: r, last_used_at: e.last_used_at }) }

if (cmd === 'withdraw') {
  // Withdrawn consent is no consent: check exits 1 until the person agrees again (a new record).
  e.consent = null; e.consent_withdrawn_at = now(); save(reg)
  out(0, { role: r, consent: null, consent_withdrawn_at: e.consent_withdrawn_at, notes: ['the voice is not used until the person agrees again; delete it only if they ask (step 14)'] })
}

if (cmd === 'lang') {
  if (typeof o['language-boost'] !== 'string' || !o['language-boost'].trim()) usage('--language-boost takes the value as the schema enum spells it')
  e.language_boost = o['language-boost'].trim(); save(reg); out(0, { role: r, language_boost: e.language_boost })
}

if (cmd === 'rate') {
  const ms = Number(o['duration-ms'])
  if (typeof o['text-file'] !== 'string' || !fs.existsSync(o['text-file']) || !(ms > 0)) usage('rate needs --text-file F and --duration-ms N > 0')
  const text = fs.readFileSync(o['text-file'], 'utf8')
  const letters = [...text].filter((c) => /\p{L}/u.test(c))
  const spaceless = letters.filter((c) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u.test(c)).length > letters.length / 2
  const file = typeof o.file === 'string' ? o.file : 'audition'
  e.rate_measured_at = now()
  if (spaceless) {
    // Words are not whitespace-separated here: a words-per-second figure would be near 0.3 and would mis-size every script.
    const chars = letters.length + [...text].filter((c) => /\p{N}/u.test(c)).length
    if (!chars) out(1, { role: r, error: 'the text has no characters to count' })
    e.rate_wps = null; e.rate_unit = 'cps'; e.rate_cps = Math.round((chars / (ms / 1000)) * 100) / 100
    e.rate_source = `${file}: ${chars} characters in ${ms / 1000} s`
    save(reg); out(0, { role: r, rate_wps: null, rate_cps: e.rate_cps, rate_unit: 'cps', rate_source: e.rate_source, notes: ['this language is written without word spaces: rate_wps stays null so no script is sized by a wrong words-per-second figure; media-audio-generation measures a take instead'] })
  }
  const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  if (!words) out(1, { role: r, error: 'the text has no words' })
  e.rate_wps = Math.round((words / (ms / 1000)) * 100) / 100; e.rate_unit = 'wps'; delete e.rate_cps
  e.rate_source = `${file}: ${words} words in ${ms / 1000} s`
  save(reg); out(0, { role: r, rate_wps: e.rate_wps, rate_unit: 'wps', rate_source: e.rate_source })
}

if (cmd === 'verdict') {
  if (!['approved', 'adjust', 're-record', 'pending'].includes(o.verdict)) usage('--verdict is approved, adjust, re-record or pending')
  if (o.verdict === 'approved' && (typeof o.by !== 'string' || !o.by.trim())) out(1, { role: r, error: 'approved is the person\'s word: pass --by "<their reply, verbatim>"' })
  e.audition = { file: typeof o.file === 'string' ? o.file : e.audition?.file ?? null, verdict: o.verdict, at: now(), ...(typeof o.by === 'string' ? { by: o.by.trim() } : {}) }
  if (o.verdict === 'approved' && e.previous_route) e.previous_route.kept_until = 'approved: the old route\'s id may now be dropped on the person\'s say-so'
  save(reg); out(0, { role: r, audition: e.audition })
}

if (cmd === 'delete') {
  if (o.confirm !== true) out(1, { role: r, error: 'deletion needs --confirm, given only after the person asked for it in plain words' })
  const dir = roleDir(r)
  const removed = []
  if (fs.existsSync(dir)) { for (const f of fs.readdirSync(dir)) removed.push(rel(path.join(dir, f))); fs.rmSync(dir, { recursive: true, force: true }) }
  // The job's working copies hold the voice id, the person's name and their transcript: they go too.
  if (fs.existsSync(workDir)) {
    for (const f of fs.readdirSync(workDir)) {
      if (/^(clone|audition|transcript|consent-message)/.test(f)) { removed.push(rel(path.join(workDir, f))); fs.rmSync(path.join(workDir, f), { recursive: true, force: true }) }
    }
  }
  // The manifest rows stay as history but no longer point at files that are gone.
  const mf = path.join(root, 'manifest.json')
  const rows = []
  if (fs.existsSync(mf)) {
    try {
      const m = JSON.parse(fs.readFileSync(mf, 'utf8'))
      for (const a of m.assets ?? []) {
        if (a.item === `clone-${r}` || a.item === `audition-${r}`) { a.status = 'rejected'; a.reject_reason = 'voice deleted at the person\'s request'; a.files = []; rows.push(a.id) }
      }
      if (rows.length) { m.updated_at = now(); fs.writeFileSync(mf, JSON.stringify(m, null, 2) + '\n') }
    } catch (err) { removed.push(`(manifest not updated: ${err.message})`) }
  }
  delete reg[r]
  save(reg)
  out(0, {
    role: r,
    removed: [`${rel(regFile)} entry ${r}`, ...removed],
    manifest_rows_rejected: rows,
    not_removed: [
      'the person\'s own upload (for example under artifacts/attachments/) is theirs and stays: name it',
      'the consent gate files under artifacts/<p>/gates/ stay as the record of the consent given: say so',
      'copies uploaded to fal storage for the calls, and a MiniMax voice id, are not deleted by this; the id lapses after 7 unused days'
    ]
  })
}
