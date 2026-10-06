---
name: media-video-generation
description: >-
  Chooses and runs the video model for one clip through ai-gen: text to video, image to video,
  first and last frame, reference to video, restyle footage, extend, upscale, reframe to a new
  aspect, add sound effects to a clip. Gives each intent a primary endpoint and a named fallback,
  quotes credits first, declares defaults, pins default-on flags, checks values against the
  schema, submits queued and measures that the clip moved. Use when: animate a still, generate a
  video clip, extend or continue a clip, upscale, reframe, vertical cut, restyle footage, sound
  for a clip, which video model, any video request no more specific skill claims. NOT
  for: a multi-shot video end to end (media-video-production); shot lists (media-shot-craft);
  narration scripts (media-script-writer); voice-over, music, transcripts
  (media-audio-generation); titles, captions, end cards (media-motion-graphics); H3 prompts
  (media-h3-prompter); stills (media-image-generation); ai-gen, manifests, gates
  (media-ai-gen); measuring files (media-qc).
license: Adapted from fal agent skills; no licence stated; used with attribution
compatibility: "sl8-video >=1.0.0 (sl8-image 1.0.0, Base 2.0.2); ai-gen 2.2.0; ffmpeg and ffprobe; media-qc 1.1.0 (motion, streams); fal endpoints and list prices as of 2026-10-05"
metadata:
  version: 1.0.0
  revision: 2026-10-06a
  house-rules: HR-1.0
  upstream: fal-agent/fal-video-generation  # the pristine source; not installed on this machine
  upstream-pin: export 2026-10-05
  attribution: Adapted from fal (fal.ai/agent/skills export 2026-10-05)
  deltas: VID-D01..VID-D29
---
# Video Generation

A routing skill, not a pipeline. Nine intents, each with a primary endpoint and
a named fallback: identify the intent, settle the settings that drive cost,
submit, poll, hand back the file. Anything needing a bespoke multi-stage
workflow belongs to a sibling skill.
Every model runs through `ai-gen` as media-ai-gen describes; dated data lives in
[picks.md](references/picks.md), [endpoints.md](references/endpoints.md) and
[facts.md](references/facts.md).

## Hand off instead of routing here

- **A new camera angle on an existing shot** — same subject, same moment, new
  viewpoint: fal's change-angle skill is not on this machine. Make the new-angle
  still with **media-image-generation**, then animate it here, labelled as not
  the specialist output.
- **Two or more characters staged across several clips** — who stands where and
  faces which way, held across shots that never see each other: fal's
  blocking-map skill is not on this machine. Stage them with **media-shot-craft**
  inside **media-video-production**; continuing from a previous clip's last
  frame is image to video from that frame, extracted with ffmpeg.
- **Captions burned onto a finished cut**: **media-motion-graphics**, from the
  script (fal's subtitles skill is not on this machine). It needs the
  caption text or a transcript to burn (media-audio-generation transcribes);
  this skill has no speech-to-text route,
  so if neither was supplied, that gap travels with the hand-off — never invent
  caption copy for a commercial asset to fill it.
- **Resizing a finished still creative to platform specs**:
  **media-photo-editing**. Reframing a *video* stays here.

Route here whenever none of those claims the request.

**What handing off means, mechanically.** Read the sibling's
`$HOME/.agents/skills/<skill>/SKILL.md` and follow that document for the item it owns, and
say in one line of the delivery note which item went to which skill. If the sibling is not
installed or will not load, do not quietly build the thing yourself: name the
skill the job needs, and offer a substitute only if you label it explicitly as
not the specialist output.

**A request can split.** One message can hold items this skill owns and items a
sibling owns — that is the normal case, not an edge. Do the owned items in
full, hand the rest off, and close out by naming the file being passed onward
and anything the sibling still needs (for captions: the text or a transcript).
If every item hands off, stop there — the submit and delivery steps below are
n/a, and forcing an output into existence to satisfy them is the bug.

**A delegated step still imposes an order.** Extend, reframe, restyle and
upscale re-render every pixel, so anything burned into the frame — captions,
timestamps, watermarks, lower-thirds — does not survive passing through them.
On-screen text is burned **last**, after every re-rendering step, whatever order
the user listed the asks in. If the user wants captions first and a reframe
second, reorder the plan and say so in one line; following the stated order
silently ruins the text and neither skill will own the failure.

**This paragraph was already here when a production run dropped its on-screen
text entirely** — the script specified lower-thirds, every clip rendered, and the
words never appeared, because "burn last" told nobody to burn *at all*. An
ordering rule is not an owner. So the obligation is now explicit and it is
yours: when a request carries on-screen text and you are handing the burn-in to a
sibling, **your closing line must name the text still owed, and the file it is
owed on**, in the same sentence that names the file you are passing over. "Handing
`cut-final.mp4` to `media-motion-graphics`; still owed: lower-thirds NINE FATHOMS,
FREE SHIPPING, ninefathoms.co.uk, burned after this reframe, not before." A
hand-off that names the file but not the debt is how the debt disappears — and
if no sibling is available to burn it, the text is an undelivered part of the
request and you say so, rather than delivering silent footage as complete.

## Cost comes first

Video bills **per second of generated output**, not per call. One
default-length clip costs more than a whole image pack, and the same prompt at
8s/audio-on can cost several times what it costs at 4s/audio-off.
**Four** multipliers run at once here. **Duration** is linear — 8s is exactly
twice 4s, and the Seedance primaries reach 15s, so a careless `duration` is a
nearly 4× overspend. **Resolution** is roughly linear and then a cliff: Veo 3.1
Fast goes from 25 cr/s to 75 cr/s the moment you ask for 4k, and Seedance base
carries a 4k step the `/fast/` tier does not have at all. **Audio** is a
separate, higher rate on Veo and Kling — Veo 3.1 Fast is 25 cr/s silent and 37.5 cr/s with sound,
full Veo 3.1 50 cr/s and 100 cr/s — and it is **on by default on every primary in
the table**. On Veo and Kling it is the multiplier most likely to be paid by accident;
on Seedance it costs **nothing extra** (the schema says the cost is the same either
way, and the price formula has no audio term: facts.md). **Tier**
is the fourth and the one under your control before a single frame renders: the
`/fast/` and `/mini/` Seedance routes take the identical payload, so dropping a
tier costs a code change of one path segment. The schema hides one limit: `/fast/`
fails above 12 s at 480p and above 10 s at 720p (measured on SL8, facts.md).

**The primaries' own rate is not in their schema.** Seedance publishes no
per-second figure through the OpenAPI endpoint for any tier, so price the exact
payload with `ai-gen estimate` before quoting (facts.md holds the dated list rates)
and never inherit a number from the route it replaced. A
quote carrying a stale rate is worse than no quote: it reads as verified.

Two routes bill on something other than output seconds. **Reframe bills the
input** — `fal-ai/ltx-2.3/reframe` charges on the source's duration, so a 30s
clip is a 30s bill however trivial the reframe. **SeedVR bills megapixels** —
0.25 cr per megapixel of `width × height × frames`, so length and frame rate multiply.

**Quote before you spend.** Run `ai-gen estimate` on the chosen route's params
file (`rate × seconds` is the sanity check) and put the figure in `plan.json`, in
credits (about 250 cr per US dollar; never quote ai-gen's own USD figure, 2.5× off).
When it clears what the brief approved or what remains of the run's budget, open a
gate (Step 0); when the user named no duration, the declared 4 s default holds;
when the request is exploratory, price a draft against the finish (below).
For a re-run of an approved shape — same route, same length, new prompt — no new
gate: go.

**A chained job is quoted per step, and ordered by what each step bills on.**
Chained video work is the normal case, not the exception. Quote one line per
paid route plus a running total, and gate on the total, not on any
single line — two steps that each fit what remains but sum past it still open the gate. When a
later step's bill depends on an earlier step's *output* (reframe bills its
input's duration, so reframing an extended clip costs more than reframing the
original), compute it from the planned output length and mark it an estimate.
Then sequence for cost: extend pays only for new seconds while reframe pays for
the whole source, so reframe-then-extend is cheaper than extend-then-reframe —
unless the un-reframed extended cut is itself a deliverable, in which case the
user's order stands. Say which order you chose and why in the quote.

**Draft when the concept is unproven.** `fal-ai/veo3.1/lite` renders at 7.5 cr/s
(720p, silent): a 4s test costs 30 cr before you commit to a long finish. Two
caveats now that the primaries are Seedance. It is **Veo's** prompt grammar, so a
draft that works there is evidence about the shot, not about the wording you will
send to Seedance. And drafting is only worth it when the finish is dear — a short
Seedance clip may cost less than the round trip, so price both before drafting.

## Step 0 — Declared defaults, not questions

No person is present to answer, so ask nothing (HR12). Write every value below into
`plan.json` as a `declared` object before any paid call (HR1), and state each default
you chose in the delivery note. Every field has a default; if the request already
answers one, use the answer.

   These are the **user-facing** options. Every one of them is spelled differently
   per route, so read the route's block before building the payload: what the plan
   declares and what the endpoint accepts are two different vocabularies, and the
   plan must never declare a value the chosen route cannot take.

1. **Duration** (`Length`) — default **4s**, deliberately short. A brief may name
   `4s`, `6s`, `8s`, or any integer the route takes; quote the declared length
   in credits. **On the wire the
   spelling differs**: Seedance wants a bare `"4"`, Veo wants `"4s"`, MiniMax H3
   wants an integer, and nothing under `5`. The declared `4s` is a label, not a payload value. The
   Seedance primaries stop at 15s; a longer ask is a routing change, not a bigger
   number.
2. **Resolution** (`Resolution`) — default **720p**; `1080p` and
   `4k` only where the chosen route's enum actually has them. On Seedance that
   means the **base** tier only — asking above 720p rules out the `/fast/`
   fallback, so decide resolution before you decide the fallback, not after.
   A length above 10 s at 720p (12 s at 480p) rules it out too.
3. **Aspect** (`Shape`) — default **16:9**, with `9:16` for vertical and
   `1:1` only where supported. All three Seedance primaries take the full enum —
   `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` — so declare what the brief needs. On
   an image route, `auto` inherits the source frame; naming an aspect that differs
   from the source re-composes rather than reframes, so if the user wants the
   *same* footage in a new shape that is a reframe job (see the guardrail).
4. **Audio** (`Sound`) — default **off**. On means a native soundtrack
   generated with the video: at the higher per-second rate on Veo and Kling, at no
   extra cost on Seedance.
5. **Motion brief** (`What happens`) — free text; default is to derive it
   from the supplied image or the user's sentence, write that derived brief into
   `plan.json`, and repeat it in the delivery note.
6. **Framing** (`Framing`, conditional) — only when the request could
   mean either a generative reframe or a free crop (see the guardrail): the
   guardrail's default applies, and the delivery note states both with the credit
   figure on the paid one. It never blocks the run.

The five standing fields fit a single-route job. A real request can raise
questions none of them ask — reframe-versus-crop, what to do about an item that
hands off to a sibling — and those get a stated default too, in the same
`plan.json` and the same delivery note. Adding a needed field is correct; asking a
question is not.

**Before the first paid call, in order** (HR19: a step, not a warning):
1. Read `$HOME/.agents/skills/media-ai-gen/SKILL.md`. It runs every model on this machine,
   writes the manifest row (HR9) and opens gates (HR12).
2. Start the project record once (`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init
   --project <project>`), quote the call (`ai-gen estimate <id> --params-file <p.json> --format json`;
   a chained job's quote is its total) and read what remains (`… manifest.mjs budget --project <project>`).
3. If the quote is more than what remains, and that includes a run with **no spend authority**
   (ceiling 0), open the gate and end the job there:
   `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-<item> --question "<what, route, seconds, credits>" --options '[{"id":"a","label":"<route, length>","credits":<quote>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "<this step>" --quote <quote>`.
   The gate file, not a question in your reply, is how a job asks; it writes
   `artifacts/<project>/outcome.json` as `partial`. Never confirm a spend in plain
   prose — a message cannot return an answer.

When the brief gives a preference rather than a value ("keep it roughly as it
is, no upscaling"), map it to the
nearest option that honours the preference, state the mapping and its price in
the delivery note, and proceed — do not open a gate to re-ask.

## Routing table

Every row was checked against a live schema, as of 2026-10-05; the dated evidence per row
is in [picks.md](references/picks.md). Fallbacks are named, not implied.

| Intent | Primary | Fallback | Why the primary wins |
|---|---|---|---|
| Text to video | `bytedance/seedance-2.0/text-to-video` | `bytedance/seedance-2.0/fast/text-to-video` | Widest aspect enum in the table and the only primary reaching 4k; `/fast/` is the same grammar at 720p for a fraction of the spend |
| Image to video | `bytedance/seedance-2.0/image-to-video` | `bytedance/seedance-2.0/fast/image-to-video` | Holds the source frame's look, and unlike 2.5 the aspect is settable rather than locked to the source |
| First and last frame | `bytedance/seedance-2.0/image-to-video` | `blackforestlabs/flux-3/first-last-frame-to-video` | Same endpoint as image-to-video — add the optional `end_image_url`; Flux 3 when both ends must be *required*, or past 15s |
| Reference to video | `bytedance/seedance-2.0/reference-to-video` | `bytedance/seedance-2.0/fast/reference-to-video` | Takes `image_urls`, `video_urls` **and** `audio_urls` as separate arrays |
| Restyle footage | `decart/lucy-edit/pro` | `fal-ai/luma-dream-machine/ray-2/modify` | Purpose-built video edit; Ray adds adherence control |
| Extend a clip | `fal-ai/ltx-2.3/extend-video` | `fal-ai/veo3.1/fast/extend-video` | Only route that honours an arbitrary length (2–20s, either end); Veo extend is locked to exactly +7s at 720p |
| Upscale | `fal-ai/topaz/upscale/video` | `fal-ai/seedvr/upscale/video` | Per-second billing is predictable; 19 restoration models |
| Reframe to new aspect | `fal-ai/ltx-2.3/reframe` | `luma/agent/ray/v3.2/reframe` | Needs no prompt; Ray adds `3:4`, `4:3` and `21:9` and takes a prompt, but drops LTX's `4:5`/`5:4` — the enums overlap, neither contains the other |
| Add sound to a clip | `sonilo/v1.1/video-to-video-sound-effects` | `fal-ai/kling-video/video-to-audio` | Returns a muxed video at 2.25 cr/s; Kling is flat 8.75 cr |

**Route on content as well as on intent, and do it on the first attempt.** The
table above picks a route by *what kind of job* it is. One thing overrides it:
**moderation exposure.** A frame carrying a photorealistic human likeness — a
supplied face, a realistic person as the subject — or heavy gore-adjacent imagery
can be refused, and the two families differ in what you can do about it. Veo 3.1
exposes **`safety_tolerance`**, a string `"1"`–`"6"`, so a refusal there has a lever.
**No Seedance route exposes any moderation field at all**: its filtering is
server-side and undocumented, so a refusal has no remedy except changing route.

So send moderation-sensitive frames to **Veo 3.1 Fast from the start**, and accept
its narrower `4s`/`6s`/`8s` duration enum as the price. One run spent **three
separate rounds of 422s** discovering this by collision — refused on a photoreal
human reference, re-prompted, refused again on a skull-heavy frame — because
route-by-content was treated as a repair rather than a first-pass decision. A 422 on
a route with no tolerance control is not a transient failure to retry; it is the
wrong route, and the retry ceiling below applies to it.

*Observed on the Seedance 2.5 family. The 2.0 primaries have the same absent
field, so the same reasoning holds, but the specific refusals were measured on 2.5
— treat the boundary as unmapped rather than known, and record what you hit.*

**Three of the four generation fallbacks are same-family on purpose — and that
is a known limit, not an oversight.** `/fast/` is the right fallback for the
common failure, which is cost or a refusal on one tier, and it needs no prompt
rewriting because the grammar is identical. It is the *wrong* fallback for a
family-wide outage or a capability the family lacks. When Seedance as a whole is
unavailable or cannot do the job, the cross-family escapes are
`fal-ai/kling-video/v3/pro/text-to-video` for text, `minimax/h3/image-to-video`
and `/reference-to-video` for the supplied-input routes (5–15 s only; write the
prompt with **media-h3-prompter**), and
`blackforestlabs/flux-3/first-last-frame-to-video` past 15s. Say which you took
and why. Never retry the same family a third time — see the retry ceiling below.

**Lipsync is deliberately absent.** A talking head driven by supplied speech is
a different job — search the catalog (`ai-gen models --search lipsync --format json`)
and read the schema first,
because those endpoints bill on *input* seconds.

## Per-endpoint parameters

These endpoints disagree constantly. Read the block for the route you take in
[endpoints.md](references/endpoints.md); every figure there has a dated row in
[facts.md](references/facts.md).

**Negative prompts do not travel.** This census is exhaustive for the table
above, so a route in neither list is a route this table does not carry.
Accepts `negative_prompt`: Veo 3.1's text, image, first-last, **extend** and
**lite** routes, and both Kling v3 pro routes. Does not: **every Seedance route,
2.0 and 2.5**, both Veo reference routes, every MiniMax H3 route, and all the restyle,
reframe, upscale and sound routes.
Where the field is absent, carry the avoidance as a positive clause in the
prompt itself — "empty concrete floor" rather than "no furniture" — and tell the
user the exclusion is unenforced on that route. Never append a negative list to
a positive prompt; that asks for exactly what you were avoiding.

**Local files reach a route only through `ai-gen video`'s media flags:** `--image`
or `--first-frame` (the start frame), `--last-frame` (`end_image_url`), `--video`
(`video_url`), `--audio-file`, and one `--ref` per image of a reference array, in
`@Image1` order. A local path inside a JSON array or the params file is sent as text
and fails. No flag reaches Seedance's `video_urls` and `audio_urls`, H3's
reference video and audio arrays, or Veo first-last's `first_frame_url` and
`last_frame_url`: give those a hosted URL from an earlier result (`hosted_urls[0]`,
used promptly) or a data URI of 3 MB or less, in the params file.

## Default-on flags to pin explicitly

Set each of these on the payload even when you want the default value, so the
intent is visible in the request.

- **`generate_audio: true`** on **every Seedance route: 2.0 at all three tiers,
  and 2.5, which has no `/fast/` or `/mini/` tier**, on every Veo 3.1 route (fast, lite, image, first-last, reference,
  extend), on both Kling v3 pro routes and on Flux 3 first-last-frame — that is
  every primary in the table above. On Veo it raises the rate 50–100% and on Kling
  50%; on Seedance it costs nothing extra, so there the pin is about content, not
  the bill. Step 0 declares `Sound` **off**, so on
  the default path you are always sending `false` explicitly, never by omission.
- **Prompt rewriters:** `prompt_expansion_mode` (default `"balanced"`; send
  `"disabled"` when your prompt is complete) on every MiniMax H3 route, where an
  `enable_prompt_expansion` field does not exist and is dropped silently (HR3);
  `enhance_prompt: true` on `decart/lucy-edit/pro`.
- **Expensive resolution defaults:** `2K` on MiniMax H3 (a silent 117% increase
  over `768P`) and `1080p` on `fal-ai/ltx-2.3/reframe` (double price).
- **`sync_mode: true`** on `decart/lucy-edit/pro` — blocks instead of queuing.
- **Non-empty text defaults:** `negative_prompt` on Kling v3 pro, and both
  prompt fields on `fal-ai/kling-video/video-to-audio`.
- **`duration: "auto"`** on every Seedance route, whose enum runs to `"15"`.
  Never send `auto` to a per-second-billed endpoint: you are letting the model
  choose the bill, and the ceiling is nearly 4× the 4s default. The 2.5 family,
  whose enum runs to `"30"` at roughly 118 cr/s for 720p, can reach about 3,550 cr on
  a single `auto` — that is the size of mistake this pins down. Always send an
  explicit integer, and price it first.

## Model IDs drift — query, never remember

The table above is a snapshot. Endpoints get renamed, versioned and retired —
and fields get pinned. **Before the first submit of a session, print the
route's fields with their constraints, not just its name:** `ai-gen info <id>
--format json` for names, types, enums and defaults, then the raw OpenAPI printer in
`$HOME/.agents/skills/media-ai-gen/SKILL.md` ("Check every value against `const` and
`enum`"), because `ai-gen info` shows a `const` as a plain default (HR2).

`UNRESOLVED` means the slug is gone. Then **check every value the payload will
carry against the printed `const` or `enum`** — a check that only confirms a
field's name exists will pass a route that rejects your value. A `const` is not
a default you can override: `duration` on `fal-ai/veo3.1/fast/extend-video` is
a `const` `"7s"`, so a `"4s"` payload is a guaranteed 422 that field-name
pre-flight pronounces healthy. If a `const` or `enum` excludes the value the
job needs, the route cannot serve the request — move to the row that can before
building a payload. **If the slug fails, or the intent matches no row above,
search the catalog rather than guessing a name:**

```
ai-gen models --search "<intent words>" --format json
```

The catalog prints no prices, so run `ai-gen estimate` on each candidate and use the
figures to choose, not only to find. Then
read the new endpoint's schema for its real field names before building a
payload. Never assemble one from a sibling endpoint's parameters.

## Submit, poll, deliver

Execution belongs to media-ai-gen ("Long jobs: submit, then fetch by id"). In short:

1. Fetch the schema for the settled route and build the payload from that
   schema's field names and enums only, in `work/<project>/<item>.params.json`
   (the prompt too, so the manifest row carries it).
2. Submit one run: `ai-gen video -m <id> --params-file <p.json>
   [--image|--first-frame|--last-frame|--video|--ref <file>] --queue
   -o artifacts/<project>/clips/ --format json`. Do not fan out into variants unless the user asked for them
   and approved the multiplied cost — two 8s clips is two full bills.
3. Poll to completion. Video jobs run minutes, not seconds, and 1080p or 4k can
   take several — do not resubmit on slowness. Record the request id in a pending
   manifest row the moment you have it; if the call returns before the file, or
   exits 10 (a charged timeout), fetch it with `ai-gen result <request-id>
   -o artifacts/<project>/clips/ --format json`. Never `status --wait` and never a
   resubmit (HR6).
4. On a 4xx, read the error before retrying. A rejected enum or unknown field is
   a payload bug, not a transient failure — resubmitting unchanged fails again,
   while a queued-then-failed render may already have been billed.
5. **Check the clip moved, before you deliver it.** A generation route can return
   a technically valid video in which nothing happens — a frozen macro shot, a
   still in a video container — and every other check in this skill passes it,
   because they all ask whether the *source* survived. Liveness fails in the
   opposite direction from preservation and neither implies the other.
   `mediaqc.mjs motion` measures it (below).
6. Deliver the file under `artifacts/<project>/clips/` (hosted URLs expire) with its
   manifest row (`manifest.mjs add`, HR9), and state the route, final duration, resolution, whether
   audio was generated, the measured motion figure from step 5, and the actual
   cost in credits. The final duration is measured, not requested: Seedance returned
   4.06 s for a 5 s ask, so `render_dur` in `plan.json` comes from ffprobe
   (`mediaqc.mjs streams`), never from the request.

### The motion check, and why the obvious version does not work

`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs motion <clip> --control <frozen.mp4>`
(media-qc 1.1.0; flags in its `references/checks.md`) takes the **minimum** one-second
window of summed luminance differences, never the average. Calibrate per route before
trusting the number: a known-bad control (one frame repeated for the clip's duration,
through the same encode), a known-good control, and a floor between them nearer the bad
end. Before the first motion verdict of a session, read
[motion-check.md](references/motion-check.md): the measure, why a fixed floor fails, and
the known gap in a locally frozen control.

Report the figure, not a pass/fail: "min 1-second window 7.9, frozen control
0.001, floor 2.0" is auditable. "Motion check: PASS" is not, and is what let a
frozen shot reach a human reviewer.

## Guardrails

- **One retry, then change route — and the retry changes a named lever.**
  Resubmitting the same payload pays twice for the same failure. Move the lever
  in the direction of the fault (a wandering LTX extension: `context` down and
  the camera pinned in the prompt; a frozen or too-timid result wants the
  opposite correction); if the second attempt fails the same way, move to the
  named fallback rather than paying a third time.
  **This ceiling is per shot, and it is the one that gets broken.** A real
  production run took three attempts on a single shot, because on a multi-shot
  job the count lives in your head instead of on the page. So keep it on the
  page: track attempts per shot in the manifest (`attempt`, `lever`), and on the second failure stop retrying that
  shot and either change route or open a gate (`gate.mjs open`) with the failure
  named. Two attempts on eight shots is sixteen renders — the ceiling exists
  because that is a bill, not a nuisance.
- **A shot prompt carries exactly one physical action.** The same run lost three
  renders to a shot brief that asked for two things at once — tie the bag *and*
  set it by the window. Models do not refuse the second action, they blend it,
  and the result reads as a mistake rather than a miss. One clear beat per clip;
  if the idea needs two, that is two clips, which by the rule above is also the
  cheaper way to get it.
- **Never raise duration to fit more of the idea in.** Two 4s clips cost what
  one 8s clip costs and give two attempts. Length is the user's creative
  decision, not a quality lever.
- **A generative route redraws every frame — and that includes extend and
  reframe, not just animating a still.** If a logo, product, face or specific
  room must survive *as itself*, nothing that passes through a generative model
  preserves it. Extend can walk the subject out of frame: a product ad whose
  hero drifts off-screen in the added seconds is a failed deliverable, so check
  the extension holds the subject before delivering. Reframe fills the new
  regions with invented picture — around people that means faces, torsos and
  limbs that were never shot, a rights and approvals problem on advertising
  footage, not a cosmetic one — and it re-renders the pixels that were already
  correct, so logos and any burned-in text degrade. Keep motion small, keep
  duration short, and check every generative output against the source before
  delivering.
- **Reframe invents, crop discards — and the agent decides which by looking at
  the frame, not by asking.** A "vertical cut" can mean either. A crop is a
  free ffmpeg operation that loses the edges; reframe is a paid render that
  fabricates them. When the frame contains people, faces, logos or a product
  that must survive as shot, default to the free crop whenever the subject fits
  the target frame; reach for reframe when the scene must genuinely extend and
  the frame tolerates invention. This is read off the footage itself — a user's
  intake answer is evidence, not the verdict. State the choice, the rejected
  alternative and both prices in the delivery note; the conditional `Framing`
  field (Step 0) records it and never blocks the run. And
  upscaling does not restore missing content: from a 480p source, 4k output is
  a clean 4k render of 480p detail.
- **Probe the source before spending, and not only for limits.** `ffprobe` the
  dimensions, duration, fps and audio track — several routes constrain input
  video (Kling's element inputs cap at 200MB, 3–10s, 24–60fps), and an
  out-of-bounds source fails after the upload, not before. Then check whether
  the clip is a single take: an extend route continues only the **last shot**,
  so on a multi-shot montage "extend this clip" silently means "extend the
  final shot". Proceed on that reading, say which shot is being continued in
  the delivery note, and size LTX's `context` to that shot alone.
- **Never substitute a route silently.** Name the fallback and its different
  rate in the reply.

Revision 2026-10-06a · picks and prices as of 2026-10-05 · re-verify per [facts.md](references/facts.md).

## House rules (HR-1.0)

Relies on: HR1, HR2, HR3, HR4, HR5, HR6, HR7, HR8, HR9, HR10, HR11, HR12, HR13, HR14, HR15,
HR16, HR17, HR18, HR19, HR20, HR21, HR22 — see media-ai-gen/references/house-rules.md.
Not applicable: none. HR11 here means restyle, upscale and reframe start from the source
footage unless the plan orders a chain (the chain order above); HR17 covers a supplied face
or voice before any route; HR21: a missing ffmpeg or ffprobe is a broken machine, reported.
