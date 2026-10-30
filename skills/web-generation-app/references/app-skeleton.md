# App skeleton: the server boundary in code

SL8-written starting code for the files SKILL.md names. It is our design (the assessment marks the
guard, the SQLite store and the adapter as INTERPRETATION), not vendor code, and none of it has run
on a Studio build yet. TanStack Start API names (`createFileRoute(...)({ server: { handlers } })`,
`createServerFn().inputValidator()`, `getCookie` / `setCookie`) move between releases: write to
the version in the baked npm cache and let `npx tsc --noEmit` catch drift. Paths are relative to the
app root (`artifacts/<p>/app/`).

## Contents
- [Files and who may import them](#files-and-who-may-import-them)
- [env.server.ts: fail closed](#envserverts-fail-closed)
- [session.server.ts and auth.server.ts: the guard](#sessionserverts-and-authserverts-the-guard)
- [Session routes](#session-routes)
- [gen-codes.ts and gen.server.ts: the only ai-gen caller](#gen-codests-and-genserverts-the-only-ai-gen-caller)
- [Exit code to result union](#exit-code-to-result-union)
- [POST /api/generate](#post-apigenerate)
- [Upload route](#upload-route)
- [File route](#file-route)
- [db.server.ts and migrations](#dbserverts-and-migrations)
- [generation-results.ts: selectors](#generation-resultsts-selectors)
- [Polling hook (no TanStack Query on this machine yet)](#polling-hook-no-tanstack-query-on-this-machine-yet)
- [package.json scripts and the run recipe](#packagejson-scripts-and-the-run-recipe)

## Files and who may import them

| File | Role | Imported by |
|---|---|---|
| `src/lib/env.server.ts` | reads and checks every secret once at start | server files only |
| `src/lib/session.server.ts`, `src/lib/auth.server.ts` | signed cookie, `requireAppUser()`, rate limits, origin check | every route and server function |
| `src/lib/gen-codes.ts` | pure: `parse`, `mapExit`, `outcome` (no server imports, so the test can load it) | `gen.server.ts`, `tests/exit-codes.mjs` |
| `src/lib/gen.server.ts` | the registry, `estimate()`, `submit()`, `fetchResult()`, safe logger | `/api/estimate`, `/api/generate`, `/api/generations/*` |
| `src/lib/db.server.ts` | the one SQLite handle; migrations at start | server files only |
| `src/lib/generation-results.ts` | pure selectors over the DTO | browser and server |
| `src/routes/api/*.ts` | session, login, logout, estimate, generate, generations, media/upload, files, admin/spend | — |
| `src/layouts/<shape>.tsx`, `src/styles/theme.css` | the one chosen shape and the token layer | — |

A `*.server.ts` file never reaches the browser bundle. `scripts/scan.sh` fails the build if any
other file names `ai-gen`, fetches the gateway or a fal host, or imports `child_process` (the only
exception is `src/lib/media.server.ts`, which may run `ffprobe`, `ffmpeg` and `convert` and nothing
else).

## env.server.ts: fail closed

```ts
import fs from 'node:fs'
import path from 'node:path'
const need = ['APP_ACCESS_CODE', 'APP_ADMIN_CODE', 'APP_SESSION_SECRET', 'SL8_SESSION_TOKEN', 'SL8_API_URL', 'SL8_SPEND_CEILING', 'SL8_SPEND_LEDGER'] as const
type Env = Record<(typeof need)[number], string>
function load(): Env {
  const missing = need.filter((k) => !process.env[k] || process.env[k]!.trim() === '')
  if (missing.length) throw new Error(`refusing to start: missing ${missing.join(', ')}`) // names only, never values
  if (process.env.APP_SESSION_SECRET!.length < 32) throw new Error('refusing to start: APP_SESSION_SECRET under 32 chars')
  const e = Object.fromEntries(need.map((k) => [k, process.env[k]!])) as Env
  // The data tree is git-ignored, so a clean checkout has none of it: create it before anything opens a file.
  for (const d of ['data/params', 'data/uploads', 'data/files', path.dirname(e.SL8_SPEND_LEDGER)]) fs.mkdirSync(d, { recursive: true })
  return e
}
export const env = load() // no `|| 'changeme'` anywhere: scan.sh greps for it
// Optional (not in `need`): APP_ORIGIN, the public origin as the browser sees it (sameOrigin and the og:video tag use it).
// Set SL8_SPEND_LEDGER=data/spend.jsonl; the other six come from the run recipe at the end of this file.
```

## session.server.ts and auth.server.ts: the guard

```ts
// session.server.ts
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { env } from './env.server'
const MAX_AGE = 86400
const sign = (v: string) => createHmac('sha256', env.APP_SESSION_SECRET).update(v).digest('base64url')
export function safeEqual(a: string, b: string) {
  const A = Buffer.from(a); const B = Buffer.from(b)
  if (A.byteLength !== B.byteLength) return false // check length first; never pad
  return timingSafeEqual(A, B)
}
// Two ids, on purpose. `sid` rotates on every login (session hygiene, revocation). `ownerId` is the
// stable owner of product state: one owner per role, because the access code is shared and there is no
// per-person identity on this machine. History, favourites and collections hang off ownerId, so a
// new login or a new day still sees them. Per-person histories need per-person codes (not offered).
export const ownerOf = (role: 'user' | 'admin') => role
export function mint(role: 'user' | 'admin') {
  const body = `${randomUUID()}.${role}.${Math.floor(Date.now() / 1000) + MAX_AGE}`
  return `${body}.${sign(body)}`
}
export function verify(cookie?: string) {
  if (!cookie) return null
  const i = cookie.lastIndexOf('.'); const body = cookie.slice(0, i)
  if (!safeEqual(cookie.slice(i + 1), sign(body))) return null
  const [id, role, exp] = body.split('.')
  if (Number(exp) < Date.now() / 1000) return null
  return { id, role: role as 'user' | 'admin', ownerId: ownerOf(role as 'user' | 'admin') }
}
export function cookieHeader(value: string, request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '' // plain-http preview drops Secure
  return `app_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure}`
}
```

```ts
// auth.server.ts
import { getCookie } from '@tanstack/react-start/server'
import { verify } from './session.server'
import { env } from './env.server'
import { db } from './db.server'
const deny = (status: 401 | 403, code: string) => ({ ok: false as const, status, body: { ok: false, error: { code } } })
export async function requireAppUser(opts: { admin?: boolean } = {}) {
  const user = verify(getCookie('app_session'))
  if (!user || db.prepare('SELECT 1 FROM revoked_sessions WHERE sid = ?').get(user.id)) return deny(401, 'unauthorized')
  if (opts.admin && user.role !== 'admin') return deny(403, 'forbidden')
  return { ok: true as const, user }
}
// POST routes written by hand: the Origin must be this app. Server functions keep Start's own check on.
// Behind the Studio's public port proxy `request.url` can carry the internal host, so compare with what
// the browser sees: APP_ORIGIN when set, else X-Forwarded-Host, else Host. Test once through the public URL.
export function sameOrigin(request: Request) {
  const o = request.headers.get('origin'); if (!o) return false
  const want = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).host
    : request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host
  return new URL(o).host === want
}
// The client key is the first X-Forwarded-For hop (trust it only behind the Studio proxy; a direct
// socket otherwise). Behind the proxy every visitor can share one address, so a limit per client is a
// shared limit: the login limit keeps a global ceiling too.
export const clientKey = (request: Request) => request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'socket'
// Rate limits: counters may live in memory (they are not product state). Login: 5 tries per client
// per 15 min and 50 per 15 min for the whole app. Order matters: requireAppUser() runs first, and only
// an authenticated paid POST counts against its bucket (10 per session per minute, 30 per client per
// minute), so an unauthenticated flood cannot drain what real users share. The hard cap is still
// SL8_SPEND_CEILING, which ai-gen enforces.
```

## Session routes

- `GET /api/session`: `200 {user:{role}}` or the guard's `401`; header `cache-control: no-store`; no
  secret, no token, no code in the body.
- `POST /api/session/login`: same-origin check, rate limit, then `safeEqual(code, env.APP_ACCESS_CODE)`
  (role `user`) or `safeEqual(code, env.APP_ADMIN_CODE)` (role `admin`); an empty code is a `400`;
  success sets `cookieHeader(mint(role), request)`. The return path is app-local and URL-encoded
  (`?return=%2Fhistory`); reject any value with a scheme or `//`.
- `POST /api/session/logout`: clears the cookie (`Max-Age=0`), inserts the `sid` into
  `revoked_sessions(sid, exp)` (a copied cookie stops working at once; prune rows past `exp`); the
  browser then drops every user-scoped cache (the polling hook's feed state, below). To rotate the
  access code, change `APP_ACCESS_CODE` and `APP_SESSION_SECRET` together and restart.

## gen-codes.ts and gen.server.ts: the only ai-gen caller

`ai-gen --format json` prints **pretty-printed** JSON over many lines (`JSON.stringify(x, null, 2)`),
so a parser must read all of stdout, never the last line. The pure part lives in its own file so the
exit-code test can load it:

```ts
// src/lib/gen-codes.ts  (no imports)
export type Outcome =
  | { state: 'completed'; requestId?: string; files: { local_path: string; kind?: string }[]; creditsUsed?: number; creditsBasis?: string }
  | { state: 'pending'; requestId?: string }
  | { state: 'failed'; code: string; requestId?: string }
export function parse(s: string): any {
  const t = s.trim(); if (!t) return {}
  try { return JSON.parse(t) } catch { /* fall through */ }
  const i = t.search(/^\{/m) // a banner before the JSON: start at the first line that opens an object
  if (i >= 0) { try { return JSON.parse(t.slice(i)) } catch { /* fall through */ } }
  return {}
}
const MAP: Record<number, string> = { 1: 'job_failed', 2: 'validation', 3: 'misconfigured', 4: 'misconfigured', 5: 'out_of_credits', 6: 'model_denied', 7: 'validation', 8: 'model_denied', 9: 'job_failed', 10: 'timeout', 11: 'unavailable', 12: 'unpriced', 13: 'cost_limit', 14: 'download_failed' }
export const mapExit = (c: number) => (c === 0 ? 'completed' : MAP[c] ?? 'job_failed')
export function outcome(r: { code: number; stdout: string }): Outcome {
  const e = parse(r.stdout)
  const requestId: string | undefined = e.request_id ?? e.error?.details?.requestId
  if (r.code !== 0) return { state: 'failed', code: mapExit(r.code), requestId }
  // `ai-gen result` on an unfinished job prints {status, ready:false} and exits 0: that is not a completion.
  if (e.ready === false || e.success !== true || !e.files?.length) return { state: 'pending', requestId }
  return { state: 'completed', requestId, files: e.files, creditsUsed: e.credits_used, creditsBasis: e.credits_basis }
}
```

```ts
// src/lib/gen.server.ts
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { z } from 'zod'
import { parse, mapExit, outcome } from './gen-codes'
const BIN = process.env.AI_GEN_BIN ?? 'ai-gen' // tests and an explicit mock point this at scripts/stub-ai-gen.mjs
type Media = { flag: '--image' | '--ref' | '--first-frame' | '--last-frame' | '--video'; path: string }
type Entry = { cmd: 'run' | 'video'; settings: z.ZodTypeAny; toParams: (s: any) => object; media?: (refs: string[]) => Media[]; mayOutliveServer?: boolean }

// One entry per model the brief names. Enums, defaults and caps come from
// `ai-gen info <model> --format json` and the raw OpenAPI (HR2), never from memory.
export const registry: Record<string, Entry> = {
  'bytedance/seedance-2.0/image-to-video': {
    cmd: 'video', mayOutliveServer: true,
    settings: z.object({ aspectRatio: z.enum(['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']), duration: z.enum(['5', '8', '10']), resolution: z.enum(['480p', '720p', '1080p']) }),
    toParams: (s) => ({ aspect_ratio: s.aspectRatio, duration: s.duration, resolution: s.resolution, generate_audio: false }), // never "auto" duration; audio pinned (HR4)
    media: ([start]) => [{ flag: '--first-frame', path: start }],
  },
}

export function aiGen(args: string[], timeoutMs = 20 * 60_000) {
  return new Promise<{ code: number; stdout: string }>((resolve) => {
    const p = spawn(BIN, [...args, '--format', 'json'], { stdio: ['ignore', 'pipe', 'pipe'] }) // args array, no shell
    let out = ''; p.stdout.on('data', (b) => (out += b)); p.stderr.resume() // stderr is never logged raw
    const t = setTimeout(() => p.kill('SIGTERM'), timeoutMs + 60_000)
    p.on('close', (code) => { clearTimeout(t); resolve({ code: code ?? 1, stdout: out }) })
  })
}

// The params file is written once and used by estimate AND run: estimate does not coerce types.
// A preview (no generation yet) takes a temporary id and deletes the file after pricing it.
export async function writeParams(id: string, params: object) {
  const f = `data/params/${id}.json`; await fs.writeFile(f, JSON.stringify(params)); return f
}
export async function estimate(model: string, paramsFile: string) {
  const r = await aiGen(['estimate', model, '--params-file', paramsFile])
  const credits = parse(r.stdout).estimated_credits
  // null, 0, a negative or a non-number is "unpriced" (Number(null) is 0: never let it become --max-cost 0)
  if (r.code === 12 || typeof credits !== 'number' || !Number.isFinite(credits) || credits <= 0) return { ok: false as const, code: 'unpriced' as const }
  return r.code === 0 ? { ok: true as const, credits } : { ok: false as const, code: mapExit(r.code) }
}
// Default for video and anything that can outlive this process: --async (prints {request_id, model} at
// once, so the id is stored before the job runs and a restart can resume polling). Still images may use
// --queue. Both modes run against the stub (tests/exit-codes.mjs) before the build ships.
export async function submit(id: string, model: string, paramsFile: string, media: Media[], maxCost: number) {
  const e = registry[model]
  const mode = e.cmd === 'video' || e.mayOutliveServer ? '--async' : '--queue'
  const args = [e.cmd, ...(e.cmd === 'video' ? ['-m', model] : [model]), '--params-file', paramsFile,
    ...media.flatMap((m) => [m.flag, m.path]), ...(mode === '--queue' ? ['-o', `data/files/${id}/`] : []), mode, '--strict-params',
    '--max-cost', String(maxCost), '--timeout', String(15 * 60_000)]
  return aiGen(args)
}
export const fetchResult = (requestId: string, id: string) => aiGen(['result', requestId, '-o', `data/files/${id}/`]) // never --wait on status
// Poll every 5 s while outcome(...).state === 'pending'; 'completed' needs files; any other state ends the row.
export async function pollUntilDone(requestId: string, id: string, sleepMs = 5000) {
  for (;;) { const o = outcome(await fetchResult(requestId, id)); if (o.state !== 'pending') return o; await new Promise((r) => setTimeout(r, sleepMs)) }
}
export function logSafe(f: { op: string; status: number; exit?: number; code?: string; model?: string; ms?: number; mediaType?: string; credits?: number }) {
  console.info(JSON.stringify(f)) // whitelist only: no prompt, params, headers, cookies, paths, URLs, names, bytes
}
```

`video` takes the model by `-m`; `run` takes it as the first argument. `--first-frame` and
`--last-frame` exist on `video` only. Edit models that take `image_urls` get `--ref`, never `--image`
and never a path inside the params file (a local path there is sent as text, not uploaded).
The test: `tests/exit-codes.mjs` is the skill's `scripts/exit-codes.mjs`; the table below is its single
list of codes, and it also covers `estimate`, `--async`, a pending `result` and a finished one.

## Exit code to result union

| ai-gen exit | `code` | UI state | Server action |
|---|---|---|---|
| 0 with `files` | — | completed | store `request_id`, `files[].local_path`, `credits_used`, `credits_basis` |
| 0, `ready:false` or no `files` | — | still running (`result` on an unfinished job) | keep `progress` and poll again in 5 s; never store a completed card without a file |
| 2 | `validation` | error under the field | nothing was charged; fix the input |
| 3, 4 | `misconfigured` | "generation is unavailable"; admin sees why | stop; the machine or env is broken (HR21) |
| 5 | `out_of_credits` | billing notice, shown once; the app waits | never poll `balance` in a loop; never auto-retry |
| 6, 8 | `model_denied` | "this model is not available"; offer another registry model | drop it from the registry until checked |
| 7 | `validation` | "settings were rejected"; no retry button for the same input | re-read the schema (`ai-gen info <model> --refresh` and the raw OpenAPI), fix the registry; never resend the same payload |
| 9 | `job_failed` / `refused` | failed card with the reason; a refusal offers another model, not a retry | may be billed; the row keeps its `request_id` |
| 10 | `timeout` | still running | take `error.details.requestId`, keep polling with `pollUntilDone`; never resubmit |
| 11 | `unavailable` | "connection problem; the job may still exist" | no automatic resubmit |
| 12 (estimate) | `unpriced` | model not offered | no price means `--max-cost` is not enforced: never submit an unpriced model |
| 13 | `cost_limit` | re-confirm at the new price | nothing was submitted |
| 14 | `download_failed` | "file missing" with refresh | `fetchResult(request_id)`; never regenerate |
| 1, other | `job_failed` | failed card | exit 1 (`EMPTY_RESULT`) is charged |
| (browser) | `confirmation_rejected` | quiet cancel on the form | nothing sent |

## POST /api/generate

```ts
// zod input: { model: enum(registry keys), prompt: z.string().min(1), settings: z.record(z.string(), z.unknown()),
//              mediaRefs: z.array(z.string().uuid()).optional() /* cap per model from ai-gen info */, confirmed: z.literal(true), confirmedCredits: z.number().positive() }
// 1 sameOrigin, rate limit, requireAppUser()            -> 401/403 union
// 2 entry.settings.parse(settings) -> params            -> 'validation'
// 3 refs -> local paths under data/uploads/ (server-resolved; a URL is never accepted)
// 4 writeParams(id, { prompt, ...params }); estimate() again; credits > confirmedCredits -> 'cost_limit' (re-confirm)
//   the preview route (/api/estimate) does the same with id 'preview-<uuid>' and deletes the file after pricing
// 5 insert generations row (owner_id, status 'progress', ratio from settings) ; respond { ok: true, id } at once
// 6 background: submit(..., maxCost = confirmedCredits) -> outcome(): --async stores request_id then pollUntilDone;
//   --queue reads the final envelope -> update row (completed | failed + code); 'pending' never completes a row
```

A write is always `POST`; a `GET /api/generate` answers `405`. Video and any job that may outlive the
server process submit with `--async` (it prints `{request_id, model}` at once): store the id on the
row, then `pollUntilDone`. `--async` writes no ledger line until `result` runs, so before an
`--async` submit add the estimates of every in-flight job (`SUM(credits_estimate)` over `progress`
rows) and refuse if the sum plus this price passes the remaining ceiling. Still images may use
`--queue` (one call, files in the final envelope).

## Upload route

`POST /api/media/upload`, multipart field `file`: guard first; `400 {ok:false,error:{code:'missing_file'}}`
when absent; refuse over the route's size limit (default 25 MB; a brief may set another) before reading
the body into memory; check the magic bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF....WEBP`,
MP4/MOV `....ftyp`), then `ffprobe -v error -show_entries stream=width,height,duration -of json <file>`
(a probe failure is a rejection); store as `data/uploads/<uuid>` (a server-chosen name, never the
user's); log `{op:'upload', contentType, size}` only; the probe runs in `src/lib/media.server.ts` (the one other module that may use `child_process`); return `{ ok: true, ref }`. The browser sends
`FormData` without setting `content-type`.

## File route

`GET /api/files/:id`: guard (401 JSON, never a redirect), check the row belongs to this app and is
`completed`, stream `data/files/<id>/<file>` with its real `Content-Type` and
`Content-Disposition: attachment; filename="<id>.<real ext>"`. A WebP stays `.webp`. Honour `Range`:
answer `206` with `Accept-Ranges: bytes` and `Content-Range: bytes a-b/total` (and `416` past the end),
or Safari and iOS will not play the video and scrubbing fails elsewhere (`route-check.sh` sends
`curl -r 0-99` and expects 206 with a session). A missing file
returns `410 {code:'file_missing'}` and the card offers refresh (`fetchResult`). For an app embedded in
another site's iframe, download with `fetch(url, {credentials:'include'})`, check `ok`, make a Blob URL,
click a temporary anchor from a real button, then `setTimeout(() => URL.revokeObjectURL(u), 0)`.

## db.server.ts and migrations

```ts
import Database from 'better-sqlite3'
import fs from 'node:fs'
import './env.server' // creates data/params, data/uploads, data/files and the ledger's folder on a clean checkout
export const db = new Database('data/app.db'); db.pragma('journal_mode = WAL')
for (const f of fs.readdirSync('migrations').filter((n) => /^\d{4}_.*\.sql$/.test(n)).sort()) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)`)
  if (!db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(f)) { db.exec(fs.readFileSync(`migrations/${f}`, 'utf8')); db.prepare('INSERT INTO _migrations VALUES (?)').run(f) }
}
```

`migrations/0001_init.sql` (additive only; a later change is a new file):

```sql
CREATE TABLE generations (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, session_id TEXT NOT NULL, model TEXT NOT NULL, prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('progress','completed','failed')), error_code TEXT, request_id TEXT,
  credits_estimate REAL, credits_used REAL, credits_basis TEXT, media_type TEXT, file TEXT, thumb TEXT,
  width INTEGER, height INTEGER, ratio TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE revoked_sessions (sid TEXT PRIMARY KEY, exp INTEGER NOT NULL);
CREATE TABLE favorites (generation_id TEXT PRIMARY KEY REFERENCES generations(id), created_at TEXT NOT NULL DEFAULT (datetime('now')));
```

The feed, favourites and collections are scoped by `owner_id`, never by `session_id` (the cookie id
rotates). If `require('better-sqlite3')` fails after install (it is a native addon: its prebuilt binary
or a compiler is not in an npm cache), stop and report the machine gap; the documented fallback is
Node's built-in `node:sqlite` (`DatabaseSync`, same SQL), named in the delivery.

At start, every `progress` row with a `request_id` (every `--async` job) is polled again with
`pollUntilDone`; a `progress` row without one (a `--queue` image job caught by a restart) is marked
`failed` with `error_code 'interrupted'` and shown as "may have been billed" (`--queue` recovery stays
unproven: see the learnings).

## generation-results.ts: selectors

`getPreviewUrl(g)` thumbnail, then poster, then the file route; `getRawUrl(g)` the file route;
`getJobPhase(g)` `progress | completed | failed`; `getMediaType(g)`; `hasResult(g)` (completed and a
file); `isTerminalStatus(s)`; `getRatio(g)` `width / height`, else the submitted aspect ratio, else
`"1 / 1"`. The DTO is flat and fully typed (no `unknown`, no raw envelope). Thumbnails are made on the
server after download: video `ffmpeg -v error -i <file> -frames:v 1 -vf scale=480:-2 <thumb>.jpg`,
still `convert '<file>[0]' -background white -flatten -resize 480x <thumb>.jpg` (ImageMagick; `[0]` takes the first frame of an animated WebP or GIF, `-flatten` replaces transparency with white). These two commands live in `src/lib/media.server.ts`.

## Polling hook (no TanStack Query on this machine yet)

```ts
import { useEffect, useState } from 'react'
import type { Generation } from './generation-results'
export function useGeneration(id: string, initial?: Generation) {
  const [g, setG] = useState<Generation | undefined>(initial)
  useEffect(() => {
    if (g && g.status !== 'progress') return
    const ac = new AbortController()
    const t = setTimeout(async () => {
      const r = await fetch(`/api/generations/${id}`, { signal: ac.signal, credentials: 'include' }).catch(() => null)
      if (r?.ok) setG(await r.json())
    }, g ? 5000 : 0)
    return () => { clearTimeout(t); ac.abort() }
  }, [id, g])
  return g
}
// Feed: GET /api/generations?cursor=<created_at>&limit=20, kept in one user-scoped store with
// prepend(newGeneration) after every accepted submit, merge(page) for older pages, clear() on logout.
```

## package.json scripts and the run recipe

Unverified on a Studio build (learnings WEB-L321): the Start scaffold's own scripts and output folder.
Read the scaffold's `package.json` and the last lines of `npm run build`, then define:

```json
"scripts": { "start": "<run the server entry the build wrote, e.g. node .output/server/index.mjs>",
             "test": "node tests/exit-codes.mjs" }
```

`npm start` does not read `.env`. `scripts/serve.sh` (the skill's) does the whole recipe headless:

```bash
bash $W/scripts/serve.sh start artifacts/<p>/app work/<p> 3000   # secrets, background start, wait for 401
bash $W/scripts/route-check.sh http://127.0.0.1:3000
bash $W/scripts/serve.sh stop work/<p>
```

`start` writes `.env.local` (git-ignored, mode 600) on the first run with a random `APP_ACCESS_CODE`,
`APP_ADMIN_CODE` and a 64-hex `APP_SESSION_SECRET`, `SL8_SPEND_LEDGER=data/spend.jsonl` and
`SL8_SPEND_CEILING` from `$SL8_SPEND_CEILING` (the job's budget in credits; it stops if unset). It
never prints a value. `SL8_SESSION_TOKEN` and `SL8_API_URL` must already be in the sandbox
environment (a machine gap if not; the skill never reads `.env` files). The delivery tells the
builder the access code is in `artifacts/<p>/app/.env.local`; it is never written to the README,
the repo or a log.
