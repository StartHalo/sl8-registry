#!/usr/bin/env node
// Exit-code and envelope tests for a web-generation-app build, against the stub (no spend).
// SL8-written (review R1, R8, R13, R14). Run from the app folder:
//   AI_GEN_BIN=<skill>/scripts/stub-ai-gen.mjs node tests/exit-codes.mjs [src/lib/gen-codes.ts]
// Copy this file to the app as tests/exit-codes.mjs; `npm test` runs it. It imports `parse`,
// `mapExit` and `outcome` from the app's gen-codes.ts (Node 22.18+ strips the types itself).
// EXPECT is the single list of exit codes: the same table sits in references/app-skeleton.md.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const STUB = process.env.AI_GEN_BIN
if (!STUB) { console.error('exit-codes: set AI_GEN_BIN to scripts/stub-ai-gen.mjs'); process.exit(2) }
const mod = await import(pathToFileURL(path.resolve(process.argv[2] ?? 'src/lib/gen-codes.ts')).href)
const { parse, mapExit, outcome } = mod
const EXPECT = { 1: 'job_failed', 2: 'validation', 3: 'misconfigured', 4: 'misconfigured', 5: 'out_of_credits', 6: 'model_denied', 7: 'validation', 9: 'job_failed', 10: 'timeout', 11: 'unavailable', 13: 'cost_limit', 14: 'download_failed' }
const run = (args, env = {}) => {
  const r = spawnSync(process.execPath, [STUB, ...args, '--format', 'json'], { encoding: 'utf8', env: { ...process.env, ...env } })
  return { code: r.status ?? 1, stdout: r.stdout }
}
let bad = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' ' + detail}`); if (!ok) bad = 1 }

for (const [c, want] of Object.entries(EXPECT)) {
  const r = run(['run', 'fal-ai/flux/schnell', '-o', 'tmp-out/'], { STUB_EXIT: c })
  const o = outcome(r)
  check(`exit ${c} -> ${want}`, r.code === Number(c) && o.state === 'failed' && o.code === want, JSON.stringify(o))
  check(`exit ${c} mapExit`, mapExit(Number(c)) === want)
}
const tmp = path.join(process.env.TMPDIR ?? '/tmp', `gen-codes-${process.pid}`)
let r = run(['run', 'fal-ai/flux/schnell', '-o', tmp], {})
let o = outcome(r)
check('exit 0 completed with request_id, file and credits', o.state === 'completed' && !!o.requestId && !!o.files?.[0] && Number.isFinite(o.creditsUsed), JSON.stringify(o))
r = run(['run', 'fal-ai/flux/schnell', '-o', tmp], { STUB_EXIT: '10' })
o = outcome(r)
check('exit 10 keeps error.details.requestId and never resubmits', o.code === 'timeout' && !!o.requestId, JSON.stringify(o))
r = run(['estimate', 'fal-ai/flux/schnell', '--params-file', 'x.json'], { STUB_CREDITS: '7' })
check('estimate parses the pretty-printed envelope', Number(parse(r.stdout).estimated_credits) === 7, r.stdout)
r = run(['estimate', 'fal-ai/flux/schnell', '--params-file', 'x.json'], { STUB_UNPRICED: '1' })
check('estimate exit 12 -> unpriced', r.code === 12 && mapExit(12) === 'unpriced')
r = run(['video', '-m', 'bytedance/seedance-2.0/image-to-video', '--async', '-o', tmp])
check('--async prints only request_id and model', !!parse(r.stdout).request_id && parse(r.stdout).files === undefined, r.stdout)
r = run(['result', 'req-1', '-o', tmp], { STUB_PENDING: '1' })
o = outcome(r)
check('result on an unfinished job is pending, exit 0, not completed', r.code === 0 && o.state === 'pending', JSON.stringify(o))
r = run(['result', 'req-1', '-o', tmp], { STUB_PENDING: '0' })
check('result on a finished job completes', outcome(r).state === 'completed')
process.exit(bad)
