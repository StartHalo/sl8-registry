#!/usr/bin/env node
// The conversion bot's arithmetic. Plain Node, no dependencies. Identical copies live in
// saas-cro-ranking-changes, saas-cro-reading-results and saas-cro-designing-test; the router's
// self-test keeps them identical. Every number the bot states about traffic, sample size or a
// before/after change comes from here, never from prose.
//
//   stats.mjs tier [--conversions <n> --weeks <w>]
//       Which validation route the traffic allows (Speero, 2026: conversions in a 4-week window).
//   stats.mjs size --baseline <rate> --lift <relative> [--alpha 0.05] [--power 0.8] [--visitors-per-week <v>]
//       Visitors per arm for a two-sided two-proportion test, and how many weeks that takes.
//   stats.mjs compare --before <conversions>[/<visitors>] --after <conversions>[/<visitors>] [--days-before <d>] [--days-after <d>]
//       Before vs after for one change. Always labelled indicative: a period comparison shows that
//       something changed, not that the change caused it.
//
// Rates and lifts accept 0.03 or 3%. Output is one JSON object.

import { realpathSync } from 'node:fs'

const MAX_TEST_WEEKS = 8 // beyond this a test is not worth running at normal sensitivity (Switas, 2026)
const TIERS = [
  { min: 3100, tier: 'high', route: 'A/B test', note: 'an A/B test can detect about a 10% relative lift in 4 weeks' },
  { min: 784, tier: 'medium', route: 'A/B test for bold changes', note: 'an A/B test can detect 10–20% relative lifts in 4 weeks' },
  { min: 0, tier: 'low', route: 'ship and instrument, or a preference test', note: 'too few conversions for an A/B test: make the change, measure the same-length periods before and after, and read the result as indicative' },
]

function args (argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]
    if (x.startsWith('--')) { const k = x.slice(2); const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true; out[k] = v } else out._.push(x)
  }
  return out
}
function fail (msg) { console.error(msg); process.exit(1) }
function rate (v, name) {
  if (v === undefined || v === true) fail(`--${name} is required`)
  const s = String(v).trim()
  const n = s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s)
  if (!Number.isFinite(n) || n <= 0 || n >= 1) fail(`--${name} must be a rate between 0 and 1 (or a percent), got "${v}"`)
  return n
}
function num (v, name) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) fail(`--${name} must be a number ≥ 0, got "${v}"`)
  return n
}
const r3 = (x) => Math.round(x * 1000) / 1000
const pct = (x) => `${(x * 100).toFixed(1)}%`

// Standard normal CDF (Abramowitz–Stegun 7.1.26 through erf) and its inverse (Acklam).
function phi (z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}
function invPhi (p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const lo = 0.02425; const hi = 1 - lo
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) }
  if (p > hi) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) }
  const q = p - 0.5; const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

export function tier (conversions, weeks = 4) {
  if (conversions === undefined || conversions === null) {
    return { known: false, tier: 'low', route: TIERS[2].route, note: `conversions not known, so treated as low traffic: ${TIERS[2].note}`, source: 'Speero, preference testing vs A/B testing for B2B SaaS, 2026-08-20' }
  }
  const per4 = conversions * 4 / weeks
  const t = TIERS.find((x) => per4 >= x.min)
  return { known: true, conversionsPer4Weeks: Math.round(per4), tier: t.tier, route: t.route, note: t.note, thresholds: '≥3,100 high · 784–3,099 medium · <784 low (conversions per 4 weeks)', source: 'Speero, preference testing vs A/B testing for B2B SaaS, 2026-08-20' }
}

export function size (p1, lift, alpha = 0.05, power = 0.8, perWeek = null) {
  const p2 = p1 * (1 + lift)
  if (p2 >= 1) fail('baseline × (1 + lift) must stay below 100%')
  const za = invPhi(1 - alpha / 2); const zb = invPhi(power); const pbar = (p1 + p2) / 2
  const n = Math.ceil(((za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / ((p2 - p1) ** 2))
  const out = { baseline: pct(p1), target: pct(p2), relativeLift: pct(lift), alpha, power, visitorsPerArm: n, visitorsTotal: 2 * n }
  if (perWeek) {
    const weeks = (2 * n) / perWeek
    out.visitorsPerWeek = perWeek
    out.weeks = Math.round(weeks * 10) / 10
    out.testable = weeks <= MAX_TEST_WEEKS
    out.verdict = out.testable ? `testable: about ${Math.ceil(weeks)} weeks at your traffic` : `not testable at your traffic: it would take about ${Math.ceil(weeks)} weeks (more than ${MAX_TEST_WEEKS}); ship and instrument instead`
  }
  return out
}

function parsePair (v, name) {
  if (v === undefined || v === true) fail(`--${name} is required: <conversions> or <conversions>/<visitors>`)
  const [c, vis] = String(v).split('/')
  const conv = num(c, name)
  return { conversions: conv, visitors: vis === undefined ? null : num(vis, name) }
}

export function compare (before, after, daysBefore = null, daysAfter = null) {
  const out = { label: 'indicative, not proof', before, after }
  const caveats = ['A before/after comparison shows that something changed, not that this change caused it. Check for seasonality, a change in traffic sources, and other changes made in the same period.']
  if (daysBefore && daysAfter && daysBefore !== daysAfter) caveats.push(`The periods differ in length (${daysBefore} vs ${daysAfter} days); compare like with like.`)
  out.conversionChange = before.conversions ? pct((after.conversions - before.conversions) / before.conversions) : null
  if (before.visitors && after.visitors) {
    const p1 = before.conversions / before.visitors; const p2 = after.conversions / after.visitors
    const pool = (before.conversions + after.conversions) / (before.visitors + after.visitors)
    const se = Math.sqrt(pool * (1 - pool) * (1 / before.visitors + 1 / after.visitors))
    const z = se ? (p2 - p1) / se : 0
    out.rateBefore = pct(p1); out.rateAfter = pct(p2)
    out.relativeChange = p1 ? pct((p2 - p1) / p1) : null
    out.visitorChange = pct((after.visitors - before.visitors) / before.visitors)
    out.z = r3(z); out.pTwoSided = r3(2 * (1 - phi(Math.abs(z))))
    if (before.conversions + after.conversions < 100) caveats.push('Fewer than 100 conversions in total: treat any difference as a direction, not a size.')
  } else {
    caveats.push('No visitor counts: this compares raw conversions only, so a change in traffic could explain it.')
  }
  out.caveats = caveats
  return out
}

// Run as a script, also through the .claude/skills/<id> → .agents/skills/<id> link (compare real paths).
const isMain = (() => { try { return realpathSync(process.argv[1]) === realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (isMain) {
  const a = args(process.argv.slice(2))
  const [cmd] = a._
  if (cmd === 'tier') {
    const c = a.conversions === undefined || a.conversions === true || /^(unknown|not known)$/i.test(String(a.conversions)) ? null : num(a.conversions, 'conversions')
    console.log(JSON.stringify(tier(c, a.weeks ? num(a.weeks, 'weeks') || 4 : 4), null, 2))
  } else if (cmd === 'size') {
    console.log(JSON.stringify(size(rate(a.baseline, 'baseline'), rate(a.lift, 'lift'), a.alpha ? Number(a.alpha) : 0.05, a.power ? Number(a.power) : 0.8, a['visitors-per-week'] ? num(a['visitors-per-week'], 'visitors-per-week') : null), null, 2))
  } else if (cmd === 'compare') {
    console.log(JSON.stringify(compare(parsePair(a.before, 'before'), parsePair(a.after, 'after'), a['days-before'] ? num(a['days-before'], 'days-before') : null, a['days-after'] ? num(a['days-after'], 'days-after') : null), null, 2))
  } else {
    fail('usage: stats.mjs tier [--conversions <n> --weeks <w>] | size --baseline <rate> --lift <rel> [--visitors-per-week <v>] | compare --before <c>[/<v>] --after <c>[/<v>]')
  }
}
