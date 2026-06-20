---
name: bot-021-i2v-reveals
description: >-
  Generate OPTIONAL generative cinematic i2v reveal clips from real real-estate listing photos for a
  cinematic listing video — each clip animates ONE real photo as the start frame so only the virtual
  camera moves (slow push-in / pull-out / bounded ≤30° orbit), never the property's geometry. Seedance
  2.0 fast i2v is the default engine (native audio, cheaper) with a Kling v3 pro fallback (silent
  interior-reveal workhorse), and a deterministic Ken-Burns still-segment as the regen-on-failure
  degrade so a warped/melted clip is never silently shipped. Use for the "reveals" phase of a listing
  video, or whenever asked to add cinematic motion / a moving reveal / a hero shot / drone-style push
  to a listing photo, animate a room photo, make a generative B-roll clip, or upgrade the slideshow
  with AI motion. These clips are consumed by bot-021-listing-video assembly; the final export's
  disclosure routes through the shared disclosure-stamp skill (AB-723).
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-021
  references-skills: [disclosure-stamp]
  inputs:
    - { name: photo, type: path, required: true, description: "a real listing photo to animate (it becomes the i2v start frame; .jpg/.png or an https URL)" }
    - { name: motion, type: enum, required: false, description: "push-in | orbit | aerial — the motion-only recipe (Default push-in, the 5s slow push-in)" }
    - { name: model, type: string, required: false, description: "i2v model slug (Default bytedance/seedance-2.0/fast/image-to-video; fallback fal-ai/kling-video/v3/pro/image-to-video)" }
    - { name: duration, type: enum, required: false, description: "5 | 10 seconds — i2v models snap to these (Default 5)" }
    - { name: aspect, type: enum, required: false, description: "16:9 | 9:16 (Default 16:9)" }
  outputs:
    - { name: reveal_clip, type: video, path: artifacts/<listing>/clips/NN-reveal-<slug>.mp4, description: "the generated (or still-fallback) reveal clip, consumed by bot-021-listing-video assembly" }
    - { name: clip_log, type: markdown, path: artifacts/<listing>/clips/NN-reveal-<slug>.log.md, description: "per-clip log: model used, cost (balance delta), warp/melt vision verdict, fallback flag" }
    - { name: disclosure, type: markdown, path: artifacts/<listing>/disclosure.md, description: "AB-723 card text + MLS remark + reachable-original note from disclosure-stamp (written when this skill finalizes an export)" }
---

# Generative Cinematic Reveals (BOT-021 · reveals)

Animate ONE real listing photo into a short, optional cinematic reveal where **only the virtual camera
moves** — a slow push-in, a gentle pull-out, or a bounded (≤30°) orbit over the actual photo. The clip
is the **upsell layered on the deterministic spine**: the slideshow ships without it, so this skill is
never required. It **runs headless — never ask the user**; every optional input has a default, and a
missing required input is a clean recorded failure, not a question.

## The architecture (read this first — it is load-bearing)

The deterministic ffmpeg slideshow (the `bot-021-listing-video` skill) is the **MLS-safe DEFAULT**: only
the virtual camera moves over the **REAL photos** — no pixel synthesis, no melting geometry, KEYLESS, no
fal cost, and it **always ships**. Generative i2v reveals (this skill) are **OPTIONAL, motion-only,
regen-on-failure inserts**. The reachable i2v models (Seedance 2.0 fast, Kling v3 pro) have **no geometry
lock** — they will happily invent or bend architecture if you let them. So the whole discipline of this
skill is: **prompt MOTION ONLY** (never re-describe the room — that makes the model synthesize new
geometry), **vision-grade every clip for warp/melt**, and on any failure **degrade to the deterministic
still-segment and FLAG it** rather than ship a clip that altered the property. These clips are then
handed to `bot-021-listing-video` for assembly; this skill does not produce the final export by itself.

## When to use

- The `reveals` row in the project's `state.md` (the optional upsell phase, run between the photo-prep
  and the assembly phase) — produce 1–N reveal clips into `clips/`, then hand back to assembly.
- Direct triggers: "add cinematic motion / a moving reveal / a hero shot to this listing photo",
  "make the slideshow feel like a drone/dolly video", "animate this room photo", "generate a
  generative B-roll / push-in / orbit clip", "upgrade the listing video with AI motion".

If the request is for a plain, no-cost listing video with no generative motion, do **not** invoke this
skill — `bot-021-listing-video` already ships the Ken-Burns slideshow on its own.

## Read first (READ-BEFORE-WRITE)

Read these, in order, before generating anything:

1. `artifacts/<listing>/context.md` — project truth (listing slug, aspect override, how many reveals,
   music, target length). This defines `<listing>` (the artifacts subfolder) and the output `<slug>`s.
2. `inputs/` — the real listing photos. Each reveal animates exactly one of these as its start frame.
3. The project's `state.md` `reveals` row — pick up `next_action`; do not redo finished clips.

**Required-input gate (record, don't ask).** The one required input is `photo` (a real listing photo).
If no usable photo exists in `inputs/` (or the named photo is missing/empty), this is a **clean recorded
failure**, not a question: write the reason into the clip log and set the `reveals` row in `state.md` to
`status: blocked`, `next_action: re-run photo-prep — no listing photo to animate`, and stop. Never
invent or synthesize a source image.

**Defaults for optional inputs** (apply silently, headless):

| Input | Default |
|-------|---------|
| `motion` | `push-in` — the 5s slow push-in recipe |
| `model` | `bytedance/seedance-2.0/fast/image-to-video` (fallback `fal-ai/kling-video/v3/pro/image-to-video`) |
| `duration` | `5` (i2v snaps to 5 or 10 only) |
| `aspect` | `16:9` (use `context.md`'s override if present, e.g. `9:16` for vertical/social) |
| how many reveals | the count in `context.md`; if unset, 1 hero reveal of the best photo |

## Step 1 — pick the motion recipe (MOTION ONLY)

Choose the recipe per the `motion` input and copy the **verbatim motion-only prompt** from
`references/reveal-prompts.md`. The load-bearing rule: the prompt describes **camera movement only** and
**never re-describes the room** — re-describing the scene is what makes the model invent geometry. Only
`push-in`, `orbit` (≤30°), and `aerial`/exterior B-roll read clean.

- `push-in` → slow push-in (5s)
- `orbit` → bounded orbit, under 30° (10s)
- `aerial` → aerial / exterior B-roll dolly (8s, exterior photos only)

`gen-clip.sh` **auto-appends the hard anti-warp guard** to whatever prompt you pass — you do not add it
yourself (it is documented in `references/reveal-prompts.md` so you know what the model sees).

## Step 2 — generate the clip

Run the generator (already in `scripts/`). It uploads the real photo as the start frame
(`--image` → `image_url`), routes Seedance→Kling, enforces `--max-cost`, and on any model failure
degrades to the deterministic still-segment when `--still-fallback` is set:

```bash
scripts/gen-clip.sh "<verbatim motion-only prompt>" inputs/<photo> \
  artifacts/<listing>/clips/NN-reveal-<slug>.mp4 \
  --model bytedance/seedance-2.0/fast/image-to-video \
  --fallback fal-ai/kling-video/v3/pro/image-to-video \
  --duration 5 --aspect 16:9 --resolution 720p --max-cost 400 --still-fallback
```

It prints `<model-id>\t<out>` on a real generated clip, or `still-segment\t<out>` when it degraded
(that is a **FLAG** — record it). Parsing inside the script reads `files[0].local_path` with `python3`
(jq is absent; `files[]` are objects). **fal URLs expire — the script downloads immediately;** never
keep a remote URL around as the deliverable.

Cost: read it from `ai-gen balance` deltas (the script snapshots `balance-before.txt`) or `ai-gen
estimate`. **Never trust `credits_used`** from the JSON — it over-reports ~8.4× on i2v. Typical i2v
clip is ~38–400 credits.

Model-slug discipline: the v2 Seedance namespace is the **bare** `bytedance/seedance-2.0/...` —
`fal-ai/bytedance/...` 404s. Seedance carries native audio (`--audio on`, handled by the script);
Kling is silent.

## Step 3 — vision-grade for warp/melt (mandatory, never skip)

**Look at every generated clip** (open frames / your vision). Check for: warping or bending walls,
windows, doorframes, floors; floating or morphing furniture; melting lines; rippling architecture;
jittery or background warp. If the clip **altered the property in any way**, DROP it and FLAG: re-run
once with the bounded recipe, or fall back to the deterministic still-segment
(`scripts/still-segment.sh inputs/<photo> <duration> <out.mp4>`, or just re-run `gen-clip.sh` with
`--still-fallback`). **Never silently ship a generated clip that altered the property** — the whole
value of this skill is honest motion over real geometry. Record the verdict (clean / dropped-warp /
still-fallback) in the clip log.

## Step 4 — write the per-clip log

For each clip write `artifacts/<listing>/clips/NN-reveal-<slug>.log.md` with: source photo, motion
recipe, model actually used (or `still-segment`), duration/aspect/resolution, cost (balance delta or
estimate), the warp/melt vision verdict, and whether a fallback fired. This log is what assembly and
the human reviewer trust over the unreliable `credits_used`.

Then hand the `clips/` folder back to `bot-021-listing-video` for normalize + concat + assembly.

## Disclosure (mandatory)

Every export carries the **first-frame AB-723 card**, burned by `assemble-listing.sh` during assembly
(default text "Video created from listing photos using AI motion technology"). This skill produces
clips, not the final export — but when this skill is the one finalizing an export, it **also routes
through the shared registry skill `disclosure-stamp`** (read its `SKILL.md`) for the MLS remark and the
reachable-original note:

```bash
python3 ../disclosure-stamp/stamp.py --media artifacts/<listing>/<export>.mp4 \
  --type virtual-staging --out artifacts/<listing>/<export>-disclosed.mp4
```

It prints `CARD_TEXT::…`, a `FFMPEG_SUGGESTION::…`, and the MLS remark. Write
`artifacts/<listing>/disclosure.md` from that output — the card text actually burned, the MLS remark to
paste, and the **ACTION REQUIRED** note that AB-723 needs the unaltered original photos hosted at a
public, login-free URL/QR. Generative i2v clips are AI-altered listing media: AB-723 (in force
2026-01-01) applies to VIDEO, and willful violation is a misdemeanor + DRE discipline. Declare
`references-skills: [disclosure-stamp]`.

## Outputs

Write everything under `artifacts/<listing>/` (`<listing>` is the project slug from `context.md`):

- `clips/NN-reveal-<slug>.mp4` — the generated (or still-fallback) reveal clip; consumed by
  `bot-021-listing-video` assembly.
- `clips/NN-reveal-<slug>.log.md` — per-clip log: model used, cost (balance delta), warp/melt vision
  verdict, fallback flag.
- `disclosure.md` — AB-723 card text + MLS remark + reachable-original note from `disclosure-stamp`
  (written when this skill finalizes an export).

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` `reveals` row: set `updated`,
`status` (`done`, `done-with-flags`, or `blocked`), the clip count produced, how many degraded to
still-fallback, and a precise `next_action` (e.g. "Reveals ready — run bot-021-listing-video assembly"
or "Re-run photo-prep — no listing photo to animate"). The ledger is how the next phase knows what to
pick up; a silent run breaks the chain.

## Failure modes (headless rules)

| Situation | Headless rule |
|-----------|---------------|
| No usable `photo` in `inputs/` | Required-input gate: record in `state.md` (`status: blocked`), stop. Never synthesize a source image. |
| Both i2v models fail / unreachable / over `--max-cost` | Degrade to the deterministic still-segment, FLAG it in the log + `state.md`. Never block the export over an optional upsell. |
| Generated clip warps/melts the property | DROP + FLAG. Re-run once with the bounded recipe, else still-fallback. Never silently ship an altered clip. |
| `credits_used` looks plausible | Ignore it (~8.4× high). Use `ai-gen balance` deltas / `ai-gen estimate`. |
| fal URL handed back as the deliverable | Wrong — URLs expire; the script already downloaded `files[0].local_path`. Ship the local file. |
| `fal-ai/bytedance/...` 404s | Use the bare `bytedance/seedance-2.0/...` slug. |
| No original photos hosted for AB-723 | Surface the ACTION REQUIRED note in `disclosure.md`; do not claim compliance. |

## References

- `references/reveal-prompts.md` — the verbatim motion-only prompts (push-in, orbit, aerial) + the
  documented anti-warp negative the script appends, and the prompt-motion-only rule.
- `references/i2v-discipline.md` — model routing & slug discipline, cost discipline (balance-delta not
  `credits_used`), vision-grade-for-warp, and the degrade-to-still rule.
