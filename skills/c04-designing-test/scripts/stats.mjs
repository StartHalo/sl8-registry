#!/usr/bin/env node
// stats.mjs: the test design's arithmetic (job card: Design a test for one change). Every number the
// test design states about traffic, sample size or weeks comes from here, never from prose. Ported
// from the v12 rescue branch (backup/c04-micro-saas-cro-2026-10-06, saas-cro-designing-test).
//   node stats.mjs plan --baseline <rate> --visitors-per-week <n> [--lift 20%] [--alpha 0.05] [--power 0.8]
//   node stats.mjs tier --conversions <n> [--weeks 4]
//   node stats.mjs size --baseline <rate> --lift <relative> [--visitors-per-week <n>]
//   --selftest | --help
// Rates and lifts accept 0.03 or 3%. No prompts; JSON on stdout (errors too, exit 2); writes nothing.
import fs from 'node:fs'

const HELP = `usage: node stats.mjs plan --baseline <rate> --visitors-per-week <n> [--lift <relative, default 20%>]
       node stats.mjs tier --conversions <n> [--weeks 4] | size --baseline <rate> --lift <rel> [--visitors-per-week <n>]
  plan prints {"ok","inputs","tier","conversionsPer4Weeks","visitorsPerArm","weeks","abAllowed","routes"}.
  Tiers: Speero (Kellner, 2026-08-20), conversions per 4 weeks: high 3,100+ · medium 784–3,099 · low under 784.
  Sample size: exact two-proportion formula, two-sided. A/B test only at ${8} weeks or fewer (our rule).`
export const MAX_TEST_WEEKS = 8
export const TIERS = [
  { min: 3100, tier: 'high', note: 'an A/B test can detect about a 10% relative lift in 4 weeks' },
  { min: 784, tier: 'medium', note: 'an A/B test can detect 10–20% relative lifts in 4 weeks: bold changes only' },
  { min: 0, tier: 'low', note: 'too few conversions for most A/B tests: a preference test for direction, then ship and measure before and after' },
]
const SOURCE = 'Speero (Jeff Kellner), Preference testing vs A/B testing for B2B SaaS, 2026-08-20'
class Bad extends Error {}
const r1 = x => Math.round(x * 10) / 10

export function rate (v, name) {
  if (v === undefined || v === true || v === null) throw new Bad(`--${name} is required`)
  const s = String(v).trim()
  const n = s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s)
  if (!Number.isFinite(n) || n <= 0 || n >= 1) throw new Bad(`--${name} must be a rate between 0 and 1 (or a percent), got "${v}"`)
  return n
}
function num (v, name) {
  const n = Number(String(v).replace(/,/g, ''))
  if (v === undefined || v === true || !Number.isFinite(n) || n <= 0) throw new Bad(`--${name} must be a number above 0, got "${v}"`)
  return n
}

// Standard normal inverse CDF (Acklam).
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

export function tier (conversionsPer4Weeks) {
  const t = TIERS.find(x => conversionsPer4Weeks >= x.min)
  return { tier: t.tier, conversionsPer4Weeks: Math.round(conversionsPer4Weeks), note: t.note, source: SOURCE }
}

export function size (p1, lift, alpha = 0.05, power = 0.8) {
  const p2 = p1 * (1 + lift)
  if (p2 >= 1) throw new Bad('baseline × (1 + lift) must stay below 100%')
  const za = invPhi(1 - alpha / 2); const zb = invPhi(power); const pbar = (p1 + p2) / 2
  return Math.ceil(((za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / ((p2 - p1) ** 2))
}

export function plan ({ baseline, visitorsPerWeek, lift = 0.2, alpha = 0.05, power = 0.8 }) {
  const n = size(baseline, lift, alpha, power)
  const weeks = r1((2 * n) / visitorsPerWeek)
  const t = tier(baseline * visitorsPerWeek * 4)
  const abAllowed = weeks <= MAX_TEST_WEEKS
  return {
    ok: true,
    inputs: { baseline: `${r1(baseline * 100)}%`, lift: `${r1(lift * 100)}%`, visitorsPerWeek, alpha, power },
    tier: t.tier, conversionsPer4Weeks: t.conversionsPer4Weeks, tierNote: t.note,
    visitorsPerArm: n, visitorsTotal: 2 * n, weeks, abAllowed,
    routes: abAllowed ? ['A/B test', 'preference test', 'ship and measure'] : ['preference test', 'ship and measure'],
    verdict: abAllowed ? `an A/B test takes about ${Math.ceil(weeks)} weeks at this traffic` : `an A/B test would take about ${Math.ceil(weeks)} weeks (more than ${MAX_TEST_WEEKS}): ship and measure before and after, or a preference test for direction`,
    source: `${SOURCE}; exact two-proportion sample size, alpha ${alpha} two-sided, power ${power}`,
  }
}

function args (argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) { const x = argv[i]; if (x.startsWith('--')) { const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true; out[x.slice(2)] = v } else out._.push(x) }
  return out
}
const say = (o, code = 0) => { process.stdout.write(JSON.stringify(o, null, 2) + '\n'); process.exit(code) }

function selftest () {
  const t = []
  t.push(['3% → +10% is 53,211 per arm (exact formula)', size(0.03, 0.10) === 53211])
  t.push(['5% → +20% is 8,158 per arm', size(0.05, 0.20) === 8158])
  const p = plan({ baseline: 0.03, visitorsPerWeek: 800, lift: 0.2 })
  t.push(['3%, 800 a week, +20%: 13,914 per arm, 34.8 weeks, low tier, no A/B', p.visitorsPerArm === 13914 && p.weeks === 34.8 && p.tier === 'low' && p.conversionsPer4Weeks === 96 && !p.abAllowed])
  t.push(['3,100 conversions per 4 weeks is high, 784 medium, 783 low', tier(3100).tier === 'high' && tier(784).tier === 'medium' && tier(783).tier === 'low'])
  const big = plan({ baseline: 0.05, visitorsPerWeek: 5000, lift: 0.2 })
  t.push(['high traffic allows an A/B test', big.abAllowed && big.weeks <= 8])
  let refused = false; try { rate('150%', 'baseline') } catch (e) { refused = e instanceof Bad }
  t.push(['a rate above 100% is refused', refused])
  const failed = t.filter(x => !x[1]).map(x => x[0])
  say({ ok: !failed.length, cases: t.length, failed }, failed.length ? 1 : 0)
}

const direct = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname) } catch { return false } })()
if (direct) {
  const a = args(process.argv.slice(2))
  if (a.help || a.h || !a._.length && !a.selftest) { process.stdout.write(HELP + '\n'); process.exit(0) }
  if (a.selftest) selftest()
  try {
    const [cmd] = a._
    if (cmd === 'plan') say(plan({ baseline: rate(a.baseline, 'baseline'), visitorsPerWeek: num(a['visitors-per-week'], 'visitors-per-week'), lift: a.lift ? rate(a.lift, 'lift') : 0.2, alpha: a.alpha ? Number(a.alpha) : 0.05, power: a.power ? Number(a.power) : 0.8 }))
    else if (cmd === 'tier') { const w = a.weeks ? num(a.weeks, 'weeks') : 4; say({ ok: true, ...tier(num(a.conversions, 'conversions') * 4 / w) }) }
    else if (cmd === 'size') { const n = size(rate(a.baseline, 'baseline'), rate(a.lift, 'lift')); const o = { ok: true, visitorsPerArm: n, visitorsTotal: 2 * n }; if (a['visitors-per-week']) o.weeks = r1(2 * n / num(a['visitors-per-week'], 'visitors-per-week')); say(o) }
    else say({ ok: false, errors: [`unknown command "${cmd}"; see --help`] }, 2)
  } catch (e) { if (e instanceof Bad) say({ ok: false, errors: [e.message] }, 2); throw e }
}
