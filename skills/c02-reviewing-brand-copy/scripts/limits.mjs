#!/usr/bin/env node
// limits.mjs: the stores' field limits, counted the same way wherever a C02 job writes a store field:
// the store listing, a voice-rules rewrite of a store field, a review's fix to one (SHORTCOMINGS №163).
// The limits are platform rules, counted (locked by khalid 2026-10-07 as an exception to D40); nothing
// here judges wording. Apple: App Store Connect Help (app information; platform version information).
// Google: Play Console Help answer/9859152. Apple keywords count in UTF-8 bytes, everything else in
// characters.
//   node limits.mjs "<store field, as a table names it>" "<text>"   e.g. "App Store subtitle" "One list"
//   node limits.mjs --selftest | --help
// No prompts; JSON on stdout; exit 1 when the text is over its field's limit; writes nothing.
import fs from 'node:fs'

const HELP = 'usage: node limits.mjs "<store field>" "<text>" | --selftest\n  prints {"ok","field","length","limit","unit"}; a field no store limits prints {"ok":true,"field":null}'
export const FIELDS = {
  'Apple App Store': { Name: 30, Subtitle: 30, 'Promotional text': 170, Keywords: 100, Description: 4000 },
  'Google Play': { Title: 30, 'Short description': 80, 'Full description': 4000 },
}
export const chars = s => [...String(s)].length
export const bytes = s => Buffer.byteLength(String(s), 'utf8')

// fieldOf(where): the store field a table cell names ("App Store subtitle", "Play short description",
// "Promotional text"), as [store, field], or null. Name, title, subtitle and description count only
// with a store word beside them, so an in-app title or an email subtitle is never taken for one.
export function fieldOf (where) {
  const w = String(where || '').toLowerCase()
  const play = /google play|play store|\bplay\b|android/.test(w)
  const store = play || /app store|apple|\bios\b|\bstore\b|listing/.test(w)
  if (/keyword/.test(w) && !play) return ['Apple App Store', 'Keywords']
  if (/promo(tional)? text/.test(w)) return ['Apple App Store', 'Promotional text']
  if (/short description/.test(w)) return ['Google Play', 'Short description']
  if (/full description/.test(w)) return ['Google Play', 'Full description']
  if (!store) return null
  if (/subtitle/.test(w)) return ['Apple App Store', 'Subtitle']
  if (/\btitle\b|\bname\b/.test(w)) return play ? ['Google Play', 'Title'] : ['Apple App Store', 'Name']
  if (/description/.test(w)) return play ? ['Google Play', 'Full description'] : ['Apple App Store', 'Description']
  return null
}

// count([store, field], text): its length in the field's unit, against the field's limit
export function count ([store, field], text) {
  const kw = store === 'Apple App Store' && field === 'Keywords'
  const length = kw ? bytes(text) : chars(text), limit = FIELDS[store][field]
  return { field: `${store}: ${field}`, length, limit, unit: kw ? 'bytes' : 'characters', over: length > limit }
}

function selftest () {
  const t = []
  const is = (w, f) => JSON.stringify(fieldOf(w)) === JSON.stringify(f)
  t.push(['store cells map to their field', is('App Store subtitle', ['Apple App Store', 'Subtitle']) && is('App Store name', ['Apple App Store', 'Name']) && is('Google Play title', ['Google Play', 'Title']) && is('Play short description', ['Google Play', 'Short description']) && is('Promotional text', ['Apple App Store', 'Promotional text']) && is('Keywords', ['Apple App Store', 'Keywords']) && is('Store description, first line', ['Apple App Store', 'Description'])])
  t.push(['in-app cells map to no store field', fieldOf('Push notification title') === null && fieldOf('Onboarding subtitle') === null && fieldOf('Error message') === null && fieldOf('Description line') === null])
  t.push(['a 31-character name is over Apple\'s 30', count(['Apple App Store', 'Name'], 'Quillo: One Shared Shopping App').over === true && count(['Apple App Store', 'Name'], 'Quillo: Shared Shopping List').over === false])
  t.push(['keywords count in bytes, everything else in characters', count(['Apple App Store', 'Keywords'], 'é'.repeat(60)).length === 120 && count(['Apple App Store', 'Subtitle'], 'é'.repeat(30)).over === false])
  const failed = t.filter(x => !x[1]).map(x => x[0])
  return { ok: !failed.length, cases: t.length, failed }
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = process.argv.slice(2)
  if (a.includes('--help') || !a.length) { console.log(HELP); process.exit(0) }
  if (a.includes('--selftest')) { const r = selftest(); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1) }
  if (a.length < 2) { console.log(JSON.stringify({ ok: false, errors: ['give the store field and the text; see --help'] })); process.exit(2) }
  const f = fieldOf(a[0])
  if (!f) { console.log(JSON.stringify({ ok: true, field: null, note: `"${a[0]}" names no store field with a limit` })); process.exit(0) }
  const r = count(f, a[1])
  console.log(JSON.stringify({ ok: !r.over, ...r })); process.exit(r.over ? 1 : 0)
}
