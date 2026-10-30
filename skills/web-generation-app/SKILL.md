---
name: web-generation-app
description: >-
  Use when: build a generator, studio, preset or one-action app that makes images or videos for its
  users, add generation to a supplied app repo, or animate an app cover. Builds a TanStack Start app
  on this machine whose users run image or video generation jobs through one server-only ai-gen
  adapter, behind an app-local access guard, with a price estimate and confirmation before every paid
  submit, multipart uploads, a polled feed and history in SQLite, protected file delivery, a
  pre-delivery scan, and an optional cover reveal video made with Seedance first and last frames.
  NOT for: a marketing or landing site with no generation for its visitors (web-marketing-site); a 3D
  character showcase (web-3d-showcase); making images directly for a customer (media-image-generation,
  media-photo-editing, image-product-presets); running ai-gen in general (media-ai-gen); measuring
  media files (media-qc); a motion-graphics video (motion-graphics).
license: SL8 wording and SL8-authored code and scripts; method from Higgsfield's website-builder app lane (no licence stated), restated and cited, with points from fal (used with attribution) and Kling (MIT), restated
compatibility: "web-studio >=1.0.0 (sl8-motion, sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; node 22.23; npm cache with @tanstack/react-start, react, zod, tailwindcss, lucide-react, typescript, better-sqlite3; ripgrep; ffmpeg 5.1; imagemagick 6.9; playwright with chrome-headless-shell 152; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [higgsfield/wb-app-lane, higgsfield/wb-platform-infra, fal/falvideogeneration-fe0127, fal/falworkflow-5122d6, fal/fal-mcp-tools, kling/kling-cli-lifecycle, kling/klingaigeneratevideo-5f0e8c, everygen/everygen-model-registry]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Higgsfield website-builder 2.2.1 captured 2026-10-20)
  approach: WF51-a1
  attribution: Method from the SL8 capability assessment (WF51-a1), restated from Higgsfield's website-builder app lane and security guide, with points from fal, Kling (MIT) and Everygen; all code and scripts written by SL8
  deltas: WEB-D320..WEB-D339
---

# Generation web app

Builds a web app whose users generate images or videos. The rule set is small and checkable: one
server module (`gen.server.ts`) is the only code that starts, prices or reads a generation; every
server operation calls `requireAppUser()` first; a submit needs `confirmed: true` and runs with
`--max-cost` equal to the price the user confirmed; uploads are multipart and only an opaque id
crosses JSON; the feed polls every 5 s until a job is terminal; files are served from the app's own
route. Every generation a visitor runs is billed to the builder's SL8 credits.

The method was written for a vendor platform (its identity service, SDK, design system and hosting)
that has no SL8 equivalent. The guard, the SQLite store, the adapter and the start-frame cover are
SL8's design, and none of it has run on a Studio build: treat the first build as a test.

```bash
W=$HOME/.agents/skills/web-generation-app
S=$HOME/.agents/skills/media-ai-gen/scripts
bash $W/scripts/scan.sh artifacts/<p>/app            # step 16 mechanical scan (exit 1 on any hit); --selftest plants defects
bash $W/scripts/serve.sh start artifacts/<p>/app work/<p> 3000   # secrets, background start, wait for 401
bash $W/scripts/route-check.sh http://127.0.0.1:3000 # 401 on every operation, 405 on GET generate, 403 foreign Origin
AI_GEN_BIN=$W/scripts/stub-ai-gen.mjs npm test       # tests/exit-codes.mjs: every exit-code branch, no spend
bash $W/scripts/serve.sh stop work/<p>
bash $W/scripts/cover-frames.sh <anim.mp4> <cover.png> work/<p>/cover-review
```

Code for every file named below: [references/app-skeleton.md](references/app-skeleton.md). UI rules
and the two step-16 checklists: [references/ux-rules.md](references/ux-rules.md). Dated facts:
[references/facts.md](references/facts.md). Cover wording: `references/cover-prompts.json`.

## What a request needs

- **The app brief**: what users make, for whom, with which models. Inputs and outputs are files and
  stated choices; a kit or brief may override any default below.
- **The models to expose.** Default when the brief names none: `openai/gpt-image-2` for images; a
  kit or brief may name another. Find ids with `ai-gen models --search <name> --format json` and read
  each schema with `ai-gen info <id> --format json`; never write a catalogue from memory (HR22).
- **Optional:** a supplied code repository (path P9), media inputs, the optional capabilities
  (steps 18-19) and a cover image for the reveal (steps 20-24).
- **Who will use it.** Default: the builder and invited testers holding a shared access code, inside
  the Studio sandbox. **Public exposure is not offered on this machine yet** (no hosting target, no
  per-visitor identity or billing): the app ends as a locally runnable build (step 17).

Project layout: the app is a git repository at `artifacts/<p>/app/` (or the supplied repo); scratch
files under `work/<p>/`; the agent's own paid calls get manifest rows (HR9); the app's runtime data
lives in `artifacts/<p>/app/data/` (git-ignored; created at start, see app-skeleton.md).

**Real people.** The app and the cover make nothing from a real person's face or voice, and a
supplied photo of one is refused, until SL8's consent text and privacy note are approved (HR17;
pending the owner, WEB-L332). Say so in one line in the delivery when a brief asks for it.

## A. Build the app (approach steps 1-17)

1. **Pick the shape before any code, once.** Map the brief to one shape in the table in
   ux-rules.md: **studio** (default), **preset** or **detail**. A step wizard is preset plus tabs;
   before/after enhance is detail plus a compare slider. Never plan a later swap. A brief that fits no
   shape takes studio, said in one line in the delivery (HR12: no question tool). The first screen is
   the product surface. Write the one layout by hand as `src/layouts/<shape>.tsx`.
2. **Scaffold one home screen, then wire into it.** Create the TanStack Start + React + Tailwind +
   zod project in `artifacts/<p>/app/` from the baked npm cache, offline. `cd artifacts/<p>` first
   (the creator makes `app/` in the current folder), then
   `npm_config_offline=true npm create @tanstack/start@latest app` with the creator's non-interactive
   flags for React, Tailwind, npm and no add-ons. **Unverified:** the flags and the scaffold's
   scripts have not run on a Studio build (WEB-L321). Read `npm create @tanstack/start@latest -- --help`
   (free) first; if the creator still prompts or fails with no TTY, stop and report it. Then
   `npm install --offline zod lucide-react better-sqlite3` and
   `node -e "require('better-sqlite3')"`: the module is a native addon whose binary an npm cache does
   not hold, so a failure here is a machine gap: stop and report, or fall back to Node's built-in
   `node:sqlite` and say so (WEB-L322). Any package the cache lacks is also a machine gap: stop and
   report it, never fetch it (departs from HR21; owner decision pending on project
   installs, WEB-L322). `git init`, and commit after every step. Never paste a fresh page over the
   home screen or swap layouts. Trust the types and `npx tsc --noEmit` rather than reading library
   source; write `import type { ReactNode, CSSProperties } from "react"`. Define the `start` and
   `test` scripts as in app-skeleton.md (the scaffold has no `start` of its own).
   **TanStack Query is not offered on this machine yet** (not in the machine's npm cache): use the
   polling hook in app-skeleton.md; if `npm install --offline @tanstack/react-query` resolves from the
   cache, the approach's `useQuery` / `useInfiniteQuery` form may be used instead.
3. **Access guard.** `env.server.ts` refuses to start when `APP_ACCESS_CODE`, `APP_ADMIN_CODE`,
   `APP_SESSION_SECRET`, `SL8_SESSION_TOKEN`, `SL8_API_URL`, `SL8_SPEND_CEILING` or `SL8_SPEND_LEDGER`
   is missing or empty: no fallback values (`serve.sh` generates the codes and the secret into a
   git-ignored `.env.local`; never print them). `requireAppUser()` reads an HMAC-signed `app_session`
   cookie (`Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`, `Secure` set from the request scheme,
   a new session id on every login, and a stable `owner_id` per role that history hangs off); the
   access code is compared in constant time with the length checked first; login is rate-limited per
   client plus a global ceiling, every authenticated paid POST per session and per client (the guard
   runs first), and hand-written POST routes check `Origin` against `APP_ORIGIN` or the forwarded host. `GET /api/session` answers 200 or 401 with
   `cache-control: no-store` and no secrets; the signed-out screen hides or disables every usable
   control. The UI gate is for experience; the server check is the boundary. Default admin flag: a
   session minted from `APP_ADMIN_CODE`; a brief may choose another.
4. **The adapter.** `src/lib/gen.server.ts` is the only module that spawns `ai-gen` (an args array,
   no shell, `--format json`). Its registry holds only the models the brief names, with camelCase
   settings narrowed per model by zod schemas built from `ai-gen info` and the raw OpenAPI (HR2);
   it maps them to the schema's field names. Pin every default-on field (HR4) and give every video
   model fixed `duration` strings, never `"auto"` (HR5). No model logic, gateway URL or `fetch` to
   the gateway or fal anywhere else. Every submit uses `--strict-params` (a typo fails locally,
   uncharged).
5. **Price, then confirm.** One canonical input feeds the preview, the dialog and the submit. The
   adapter writes `data/params/<id>.json` once and prices it with
   `ai-gen estimate <model> --params-file data/params/<id>.json --format json` (estimate takes no
   media flags and does not coerce types, so it must read the same file the run reads). An estimate
   exit 12 or no numeric `estimated_credits` means the model is unpriced and is not offered:
   `--max-cost` cannot bound it. The browser dialog shows model, a settings summary and credits;
   the Generate button always reads `{label} {sparkles} {credits}`. The server takes the call only
   with `confirmed: true`, re-prices it, and submits with `--max-cost <confirmed credits>`: a price
   rise exits 13 with nothing submitted and the user re-confirms. A declined dialog is a quiet cancel.
   `SL8_SPEND_CEILING` caps the whole app; `SL8_SPEND_LEDGER` records it.
6. **Media inputs** (when a registered model takes media). Browser `File` → `POST /api/media/upload`
   as `FormData` (no hand-set `content-type`) → guard → size limit (default 25 MB; a 12 MB image
   must pass) → magic-byte type check → `ffprobe` dimensions or duration in `src/lib/media.server.ts` (a failed probe is a
   rejection) → `data/uploads/<uuid>` with a server-chosen name → `{ ok, ref }`. Missing file:
   `400 missing_file`. Log content type and size only. The submit resolves refs to local paths and
   passes them by media flag: `--image` for an `image_url` field, `--ref` for `image_urls` (edit
   models), `--first-frame` / `--last-frame` on `ai-gen video`. Never pass a user-typed URL to
   ai-gen; never put a local path inside the params file (it is sent as text, not uploaded). Show
   uploading, ready, blocked, failed, retry, remove and clear.
7. **Submit and branch on codes.** `POST /api/generate` (zod input) → guard → confirm check →
   insert a `progress` row → answer `{ ok: true, id }` at once → in the background
   `ai-gen run <model>` `--params-file … -o data/files/<id>/ --queue --strict-params --max-cost
   <credits> --timeout 900000 --format json` for a still, and `ai-gen video -m <model>
   --params-file … --async --strict-params --max-cost <credits> --format json` for video (step 8).
   `-o` is a directory; keep ai-gen's file name. Across the boundary return a result union, never a throw; a `GET` on a write
   route answers 405. Map every exit with the table in app-skeleton.md: 5 billing notice (shown
   once, the app waits, no `balance` loop), 13 re-confirm, 6 or 8 model unavailable, 7 rejected
   settings (re-read the schema with `ai-gen info <model> --refresh --format json`, fix the registry,
   never resend the same payload), 9 failed or refused (a refusal offers another registry model, not
   a retry; for photoreal likeness, a model with a tolerance control if the app exposes one), 10
   still running, 11 connection problem (no automatic resubmit), 14 file missing, 1 failed and
   charged. `tests/exit-codes.mjs` (the skill's `scripts/exit-codes.mjs`) runs every code against
   `scripts/stub-ai-gen.mjs` (`npm test`); exit 0 with `ready:false` or no `files` is still running.
8. **Poll to terminal; show it at once.** The submit answer is never the result. Prepend the new
   card to the feed after every accepted submit; validation errors and a cancelled dialog stay on
   the form; a failure after submit stays on Results as a failed card with retry. The card polls
   `GET /api/generations/:id` every 5 s while `progress`; the feed pages 20 at a time from
   `GET /api/generations?cursor=`, scoped to the owner and cleared on logout. On the server the
   only touch on an existing job is `ai-gen result <request-id> -o data/files/<id>/` (HR6): a
   timeout (exit 10, id in `error.details.requestId`) keeps polling the same id and never authorizes
   a resubmit, and a `result` that answers exit 0 with `ready:false` keeps the row in `progress`.
   Default for video and any job that may outlive the server process: submit with `--async` (it prints
   `{request_id, model}` at once; store the id, then poll `result`), so a restart resumes polling.
   `--async` writes no ledger line until `result`, so first add every in-flight estimate and refuse
   past the remaining ceiling. Still images may use `--queue`; recovery of a `--queue` job after a
   restart is unproven: such a row is marked failed, "may have been billed".
9. **Render results through one selector module** (`src/lib/generation-results.ts`): flat typed
   DTOs (no `unknown`), each carrying width and height or the submitted ratio, used by both the
   skeleton and the ready card; `object-contain` in an `aspect-ratio` box, `1 / 1` when it does not
   parse. Preview order: thumbnail, poster, the file route. Thumbnails (in `src/lib/media.server.ts`): `ffmpeg … -frames:v 1 -vf
   scale=480:-2` for video, `convert '<file>[0]' -background white -flatten -resize 480x` for stills (first frame, white under transparency). Cards show prompt, model, status,
   created time and failure reason; video cards play the full file with the thumbnail as poster; a
   completed card without a file shows "preview unavailable" with refresh (step 15).
10. **Persist for real.** `src/lib/db.server.ts` opens `data/app.db` (better-sqlite3) in one module,
    guarded; additive migrations `migrations/000N_*.sql` run at start; files under `data/files/`.
    Generations, favourites, collections, projects, presets and shares live there. In-memory arrays,
    `localStorage`, fixtures or memory adapters shipped as product are defects; a mock only when the
    user asks for one (path P12: the stub ai-gen, labelled as a demo, no paid call).
11. **Admin spend panel.** `ai-gen balance --format json` and the app's spend from the ledger file
    and the generations table, every figure labelled with its `credits_basis` (estimated or result;
    `credits_used` has over-reported on Seedance, so the estimate is shown beside it). Admin
    sessions only (403 otherwise); never shown to visitors.
12. **Safe logs.** Log method, operation, status, ai-gen exit and error code, model id, duration,
    media type and credit estimate: nothing else (no prompt, params, headers, tokens, cookies,
    paths, URLs, file names or bytes). ai-gen's stderr is never logged raw.
13. **Compose the UI to the rules in ux-rules.md**: one density per region, 44 px targets, feedback
    inside 100 ms and 300 ms, focus and Esc behaviour, portalled overlays on one z-scale, forms,
    mobile-first layout, an auto-fit gallery at real ratios, motion limits, designed states. Tailwind
    plus one token layer in `src/styles/theme.css`; lucide-react as the only icon family; the app
    draws its own small chrome (name, sign-out, admin link).
14. **History detail** (studio and preset shapes; the detail shape may skip it). Every ready card
    opens a detail view inside History (`?g=<id>` in the URL) with Previous/Next and the arrow keys
    over the current filtered, sorted results; closing restores tab, filters, sort and scroll; opening
    it never refetches or resets the feed.
15. **Protected file delivery.** `GET /api/files/:id` re-checks the session, authorizes that file,
    answers 401/403 JSON (never a login redirect) and streams the local copy (with `Range` support: `206`, so
    video plays on iOS) with a truthful `Content-Type` and `Content-Disposition`; hosted URLs expire and are never served. Offer only the
    output formats the model's schema allows; a WebP stays `.webp`; transcode only when the product
    promises a format. A missing file is refreshed from the original job (`ai-gen result
    <request-id>`; a `ready:false` answer keeps it pending), never regenerated. Inside another site's iframe: the fetch, Blob URL and
    revoke-after-a-task download in app-skeleton.md.
16. **Pre-delivery QC.** `bash $W/scripts/scan.sh artifacts/<p>/app` (zero hits), `npx tsc --noEmit`,
    `npm run build`, then `scan.sh` again for the bundle check (it reads the client output only);
    `npm test` (every exit code on the stub); start the app with `serve.sh` and run `route-check.sh`
    with `ROUTE_CHECK_CODE` read from `.env.local` into the variable, adding every route the build
    wrote; the screenshot pass in ux-rules.md (375 px, tablet, desktop, keyboard and touch); then tick
    the hand checklist and the "never just a form" checklist in ux-rules.md. Three more checks:
    (a) log safety: run a generation with a distinctive test prompt on the stub, then
    `rg -c '<test prompt>' work/<p>/server.log` must print nothing; (b) two quick submits show both
    cards with no refetch flash (screenshot after each); (c) a clean start: `git clone` the app to
    `work/<p>/clean`, `npm ci --offline`, build, and start it with only the variables the README
    lists. Report figures and what was seen, never a written PASS (HR14). Then one real call through
    the running app's own `POST /api/generate` on a registered cheap model (default
    `fal-ai/flux/schnell`, about 2 credits; a kit or brief may name another), quoted and checked
    against the budget first (HR5): there is no free tier. The call's envelope is saved and gets a
    manifest row (HR9):
    `node $S/manifest.mjs add --project <p> --result work/<p>/app-call.json --params artifacts/<p>/app/data/params/<id>.json --json '{"item":"app-smoke","node":"app-smoke","declared":{"format":"png","aspect":"1:1"},"credits":{"estimate":2}}'`.
    Styles look missing: check the Tailwind entry and the theme import before anything else.
17. **Deliver; no publish.** Hosting and public exposure are not offered on this machine yet. The
    app ends runnable inside the sandbox with `npm run build && npm start` (`serve.sh` loads the
    variables, since `npm start` does not read `.env`), from a clean checkout, with a README listing
    every env var (names only) and the spend warning: every visitor generation
    spends the builder's credits. The delivery says the access code is in `artifacts/<p>/app/.env.local`;
    it is never in the README, the repo or a log. Ask for a public deployment and the delivery names it as an open
    owner decision (WEB-L320).

## B. Optional capabilities (approach steps 18-19, after step 16)

18. **Reference-image library.** The app's own `references(id, kind, file, created_at)` table, listed
    50 at a time; not every reference is a character, and its id is not an identity id. Generation
    passes them as `--ref <path>` (repeatable, in `@Image1`, `@Image2` order; per-model caps from
    `ai-gen info`) to an edit or multi-reference model. Default: `fal-ai/nano-banana-pro/edit`; a kit
    or brief may name another. A chosen reference appears unchanged in estimate, dialog and submit.
    Trained identities (character training) are not offered on this machine yet.
19. **Chained image edit.** The app holds the chain in `chains` and `chain_steps`; each attempt is
    one edit call (default `openai/gpt-image-2/edit` through `ai-gen run` with `--ref`; a kit or brief
    may name another) with up to four images, priced and confirmed on its exact input, never retried
    automatically; earlier outputs are not appended unless the user picks them; a batch of
    independent edits builds every input first and matches confirmations by index; the chain closes
    with the session. One ledger line per billed call. Realtime chains and saved styles are not
    offered on this machine yet.

## C. Cover reveal video (approach steps 20-24, optional, paid)

20. **Offer it; spend only after a yes.** Input: a plain full-bleed `<name>_cover.png`. Steps 1-17
    make no cover, OG image or favicon, so a brief supplies the cover (path P7), or you make it first
    with `media-image-generation` as its own quoted paid call. The video costs credits: in the
    delivery, offer it in the words of row `offer`. With no yes in hand, quote it (the start frame
    plus the final clip, plus the drafts only when the brief asked for them) and open a spend gate,
    then end the job `partial` (HR12):
    `node $S/gate.mjs open --project <p> --slug cover-video --question "Make a 5 s cover reveal video?" --options '[{"id":"a","label":"Make it","credits":<q>},{"id":"b","label":"Ship without it","credits":0}]' --resume-at "step 21" --quote <q>`.
    A standalone "animate this cover" request (path P7) is the yes, still quoted against the budget.
    No face or voice of a real person goes in the cover or the clip (HR17, WEB-L332).
21. **Read the cover; plan the beats.** Use the plain full-bleed `<name>_cover.png`, not the OG
    version (its frame confuses the motion model); with only an OG cover, animate it and append row
    `og-static`. Look at the image and note hero, background, title, tagline, pill and logos; write
    the beat plan from row `beats` with a motion that fits this subject and an entrance that fits the
    lettering. The user's wishes win (another length from 4 to 15 s, sound, the OG, a vertical cover;
    a loop asks for subtle motion and no big entrance). **Declare before any call (HR1):**
    `{width, height, ratio, duration_s, audio}`. The ratio must be one the model's `aspect_ratio` lists
    (`21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`; `auto` snaps to one of them and cannot promise an
    exact landing). A 3:2 launch cover is in none of them: stop the video, ship the static cover and
    say why, or (a deliberate choice named in the delivery) pad the cover to a listed ratio first.
    Scale the beat times in row `beats` to the length asked (about 30 %, 70 % and 100 % of the clip).
22. **Text-free start frame** (fal's image-to-video needs a start image). Prompt: row `start-frame`
    in `work/<p>/start.params.json`. Read the schema first, free (`ai-gen info
    fal-ai/nano-banana-pro/edit --format json` and the raw OpenAPI, HR2), and pin every default-on
    field it lists (HR4), for example `{"prompt": "…", "num_images": 1, "aspect_ratio": "<the cover's
    listed ratio>", "resolution": "1K", "output_format": "png"}` (the values are the ones the schema read
    confirms). Quote `ai-gen estimate fal-ai/nano-banana-pro/edit --params-file work/<p>/start.params.json
    --format json`; run `ai-gen run fal-ai/nano-banana-pro/edit --params-file work/<p>/start.params.json
    --ref <name>_cover.png -o work/<p>/start/ --queue --strict-params --max-cost <q> --format json >
    work/<p>/start.json`. The frame's name is ai-gen's own: read `files[0].local_path` from
    `work/<p>/start.json` and use that path. It stays under `work/<p>/`, not in the deliverable
    folder. Add the manifest row with the declared fields and the envelope:
    `node $S/manifest.mjs add --project <p> --result work/<p>/start.json --params work/<p>/start.params.json --json '{"item":"cover-start","node":"start","declared":{"format":"png","aspect":"<ratio>"},"credits":{"estimate":<q>}}'`.
    Default `fal-ai/nano-banana-pro/edit`; default fallback `openai/gpt-image-2/edit` (path P11); a kit
    or brief may name another. Same scene, layout and palette, no text; both failing stops the cover.
23. **One reveal call.** The finished cover is the **end** frame, so the clip lands on it exactly
    when the ratio is listed (step 21). Fill row `reveal` with the beat plan and, by default,
    row `tail-positive` (Seedance has no negative field, so the avoidance is a request, not a
    guarantee). `work/<p>/cover.params.json`:
    `{"prompt": "…", "duration": "5", "resolution": "1080p", "aspect_ratio": "<the cover's listed ratio>",
    "generate_audio": false}` (sound off: cards autoplay muted; `duration` is the declared length as a
    string). Read the schema first (free):
    `end_image_url` and `1080p` must be listed, else stop before spending. Quote with
    `ai-gen estimate bytedance/seedance-2.0/image-to-video --params-file work/<p>/cover.params.json
    --format json` (about 853 credits at 1080p), then
    `ai-gen video -m bytedance/seedance-2.0/image-to-video --params-file work/<p>/cover.params.json
    --first-frame <start frame path from start.json> --last-frame <name>_cover.png -o artifacts/<p>/cover/ --queue
    --strict-params --max-cost <q> --format json > work/<p>/cover.json`; manifest row
    (`manifest.mjs add --project <p> --result work/<p>/cover.json --params work/<p>/cover.params.json
    --json '{"item":"cover-video","node":"reveal","declared":{"duration_s":5,"audio":"none","aspect":"<ratio>"},"credits":{"estimate":<q>}}'`).
    Default: `bytedance/seedance-2.0/image-to-video`; a kit or brief may name another (an endpoint that
    requires both frames when the end must be enforced). **Drafts are off unless the brief asks for
    them** (path P8): each is its own quote and is added to the step 20 gate quote. On
    `bytedance/seedance-2.0/mini/image-to-video` at 480p or 720p only, one with `tail-positive` and
    one with `tail-negative`; keep the better, then the final at 1080p. The wording was tuned for
    the vendor's own Seedance wrapper and has not been run on ours.
24. **Review and wire.** `bash $W/scripts/cover-frames.sh artifacts/<p>/cover/<file>.mp4
    <name>_cover.png work/<p>/cover-review`: it prints the clip's size beside the cover's and exits 1
    on a ratio mismatch; compare `side.png`, look at the three mid frames and judge the weakest second
    of `sheet.png`, not the average; measure the duration (a 5 s request has come back 4.06 s). A
    drift at the end or stray text mid-clip earns one regeneration naming the flaw (row
    `regenerate`), **with a fresh quote and a new gate answer or budget check** (another full
    price, about 853 credits at 1080p; it was not in the first quote); a second miss ships the static
    cover and says why (HR7). Wire it as `public/cover-video.mp4`. Write
    `<meta property="og:video" content="…/cover-video.mp4">` only with an absolute URL built from
    `APP_ORIGIN`; with no public origin ship the file and say the tag waits for hosting (not offered
    on this machine yet, WEB-L320). A standalone request saves `<name>_cover_anim.mp4` next to the
    cover and shows it.

## Deliver

Hand back the app folder, its README, `PROGRESS.md` and the manifest, with one status line: the
shape, the registered models, which checks ran with their figures (scan, tsc, routes, stub codes,
screenshots, the one real call), what stays unverified (the scaffold commands, `--queue` restart recovery, public exposure), any
stated default the brief did not settle, and the cover's state (made, gated, or not offered).

## House rules (HR-1.0)

Relies on: HR1 (the cover's declared duration, size and audio are measured), HR2, HR3, HR4 (audio,
duration and resolution pinned in every registry entry and params file), HR5 (every paid call the
agent makes is quoted against the budget; in the app the confirmed estimate is the `--max-cost`),
HR6, HR7, HR8, HR9 (the agent's own paid calls, each with a `manifest.mjs add` line; the app's own generations are recorded in its
generations table and `SL8_SPEND_LEDGER`), HR11, HR12 (stated defaults, the cover behind a spend
gate, no question tool), HR13, HR14, HR15, HR16 (where a registered route returns a rewritten
prompt, the generations row stores it), HR19, HR20, HR22 — see media-ai-gen/references/house-rules.md.
Departs by method from HR10 (owner decision pending, WEB-L323): the cover reveal draws the title and
tagline with a video model mid-clip; the last frame is the approved cover, and step 24 is the check.
Also departs from HR21 (owner decision pending, WEB-L322): step 2 and the clean-clone check run
`npm install --offline` from the baked cache and stop on any package it lacks.
HR17: no real person's face or voice until SL8's consent text is approved (WEB-L332); what the app
lets its own users make is part of the open decision on who uses it (WEB-L320). Not applicable: HR18 (the method writes no claims; a cover's
text is the customer's own).
