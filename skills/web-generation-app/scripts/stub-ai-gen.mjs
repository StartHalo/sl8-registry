#!/usr/bin/env node
// A stand-in for `ai-gen` so a web-generation-app build can test every exit-code branch without
// spending (WF51-a1 step 7 check; path P12 when a mock is explicitly asked for). SL8-written.
// It never calls a provider. Point the app at it with AI_GEN_BIN=<path to this file>.
//
//   STUB_EXIT=<0|1|2|3|4|5|6|7|9|10|11|13|14>  exit code for run/image/video (default 0)
//   STUB_CREDITS=<n>       estimate figure (default 12); STUB_UNPRICED=1 makes estimate exit 12
//   STUB_PENDING=<n>       `result` answers {ready:false} this many times first (state in -o dir)
//   STUB_KIND=image|video  the file a success writes (default image: a 1x1 PNG; video: a stub .mp4 header)
//
// Output follows the ai-gen 2.2.0 JSON envelope (media-ai-gen/references/commands.md).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const argv = process.argv.slice(2)
const cmd = argv[0]
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined }
const model = (cmd === 'video' || cmd === 'image') ? (flag('-m') ?? 'fal-ai/flux/schnell') : cmd === 'result' ? (flag('-m') ?? 'stub/model') : argv[1]
// pretty-printed like the real binary (JSON.stringify(x, null, 2)): a parser that reads one line fails here too
const out = (o) => { process.stdout.write(JSON.stringify(o, null, 2) + '\n') }
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex')
const MP4 = Buffer.from('000000186674797069736f6d0000020069736f6d69736f32', 'hex')
const CODES = { 1: 'EMPTY_RESULT', 2: 'VALIDATION_ERROR', 3: 'CONFIG_ERROR', 4: 'UNAUTHORIZED', 5: 'INSUFFICIENT_CREDITS', 6: 'PROXY_BLOCKED', 7: 'UPSTREAM_VALIDATION', 8: 'UPSTREAM_NOT_FOUND', 9: 'SERVICE_ERROR', 10: 'TIMEOUT', 11: 'NETWORK_ERROR', 12: 'NOT_SUPPORTED_BY_PROXY', 13: 'MAX_COST_EXCEEDED', 14: 'DOWNLOAD_FAILED' }
const fail = (code, details = {}) => { out({ schema_version: '2.0', success: false, error: { code: CODES[code], exit_code: code, message: `stub exit ${code}`, retryable: [9, 10, 11].includes(code), details } }); process.exit(code) }

function success (requestId, write = true) {
  const dir = flag('-o') ?? 'stub-out'
  fs.mkdirSync(dir, { recursive: true })
  const video = (process.env.STUB_KIND ?? (cmd === 'video' ? 'video' : 'image')) === 'video'
  const tail = String(model).split('/').pop()
  const file = path.join(dir, `${tail}-${new Date().toISOString().replace(/[:.]/g, '-')}.${video ? 'mp4' : 'png'}`)
  if (write) fs.writeFileSync(file, video ? MP4 : PNG)
  return { schema_version: '2.0', success: true, model, request_id: requestId, files: [{ url: `https://stub.invalid/${path.basename(file)}`, local_path: path.resolve(file), kind: video ? 'video' : 'image', content_type: video ? 'video/mp4' : 'image/png', size: write ? fs.statSync(file).size : (video ? MP4 : PNG).length, index: 0 }], hosted_urls: [`https://stub.invalid/${path.basename(file)}`], credits_used: Number(process.env.STUB_CREDITS ?? 12), credits_basis: 'result', timing: { elapsed_ms: 1 }, raw: { stub: true } }
}

if (cmd === 'estimate') {
  if (process.env.STUB_UNPRICED === '1') fail(12)
  out({ estimated_credits: Number(process.env.STUB_CREDITS ?? 12), basis: 'stub', unit: 'call', unit_price: Number(process.env.STUB_CREDITS ?? 12) })
} else if (cmd === 'info') {
  out({ id: model, status: 'active', input: { prompt: { type: 'string' } }, stub: true })
} else if (cmd === 'balance') {
  out({ credits: 1000, stub: true })
} else if (cmd === 'result') {
  const dir = flag('-o') ?? 'stub-out'; fs.mkdirSync(dir, { recursive: true })
  const counter = path.join(dir, '.stub-pending')
  const left = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : Number(process.env.STUB_PENDING ?? 0)
  if (left > 0) { fs.writeFileSync(counter, String(left - 1)); out({ status: 'IN_PROGRESS', ready: false }) } else { fs.rmSync(counter, { force: true }); out(success(argv[1])) }
} else if (['run', 'image', 'video'].includes(cmd)) {
  const code = Number(process.env.STUB_EXIT ?? 0)
  const requestId = crypto.randomUUID()
  if (argv.includes('--async')) out({ request_id: requestId, model })
  else if (code === 0) out(success(argv.includes('--sync') ? undefined : requestId))
  else if (code === 10) fail(10, { requestId })
  else if (code === 14) fail(14, { envelope: success(requestId, false) }) // generated, not downloaded
  else fail(code)
} else {
  process.stderr.write(`stub-ai-gen: unsupported command ${cmd}\n`); process.exit(2)
}
