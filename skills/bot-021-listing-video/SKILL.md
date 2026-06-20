---
name: bot-021-listing-video
description: Turn a real-estate listing's REAL photos into a publish-ready cinematic listing/walkthrough video with a deterministic Ken-Burns slideshow — a branded intro card (address / price / beds·baths / agent), one slow single-axis virtual-camera move per photo (the photo itself is shipped verbatim — no pixel synthesis, no melting geometry, MLS-safe), a CTA outro card, an optional licensed music bed, and the mandatory first-frame California AB-723 disclosure burned in. Pure ffmpeg, KEYLESS (zero fal cost), always ships. Outputs both a 16:9 (YouTube/MLS) and a 9:16 (Reels/TikTok/Shorts) export, and routes through the shared disclosure-stamp skill for the MLS remark + AB-723 line. Use for the 'slideshow' phase, or whenever asked to "make a listing video", "turn these listing photos into a video", "create a property walkthrough video", "build a real-estate reel from these photos", "make a 60-second listing tour", or "video from listing photos".
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-021
  references-skills: [disclosure-stamp]
  inputs:
    - { name: listing-photos, type: image, required: true, description: "artifacts/<listing>/inputs/*.jpg|*.png — the REAL listing photos. They are SACRED: shipped verbatim, only the virtual camera moves over them. Order is taken from listing.json (else lexicographic). At least one photo is required; a run with zero photos is a clean recorded failure, not a question." }
    - { name: listing-facts, type: markdown, required: true, description: "artifacts/<listing>/inputs/listing.json — {address, price, beds, baths, sqft, agent, cta, music?}. Drives the intro/outro cards and the photo order. A missing or unreadable listing.json is a clean recorded failure (the cards have no truth to render); fields inside it have per-field defaults." }
    - { name: music, type: markdown, required: false, description: "artifacts/<listing>/inputs/music.mp3 (or the path in listing.json.music) — an optional licensed background bed, mixed ~-15dB under and faded by assemble-listing.sh. Default — none (silent export; never auto-fetch a track, royalty risk)." }
    - { name: aspects, type: markdown, required: false, description: "Which exports to render. Default — BOTH 16:9 (YouTube/MLS/web) and 9:16 (Reels/TikTok/Shorts). 1:1 is also supported on request. Each requested aspect is a full independent assemble pass." }
  outputs:
    - { name: export-16x9, type: video, path: artifacts/<listing>/exports/listing-16x9.mp4, description: "The 16:9 cinematic slideshow (1920x1080, H.264, 24fps, music bed if supplied, first-frame AB-723 disclosure card burned in). The default web/MLS deliverable. Photos shipped verbatim — only the camera moved." }
    - { name: export-9x16, type: video, path: artifacts/<listing>/exports/listing-9x16.mp4, description: "The 9:16 vertical reel cut (1080x1920) of the same slideshow — intro hook in the first 0-2s, ~15-40s total, for Reels/TikTok/Shorts. Same first-frame AB-723 disclosure burned in." }
    - { name: disclosure, type: markdown, path: artifacts/<listing>/disclosure.md, description: "The AB-723 / MLS disclosure pack from disclosure-stamp: the verbatim first-frame CARD_TEXT, the ready-to-paste MLS remark, the AB-723 disclosure line, and the reachable-original note (the originals are the real listing photos — already publishable, no pixel synthesis to host separately). Every export ships paired with this." }
---

# Cinematic Listing Video — deterministic Ken-Burns slideshow (BOT-021 · slideshow)

Turn a listing's **real photos** into a publish-ready cinematic video: a branded intro
card, a slow single-axis virtual-camera move over each photo, a CTA outro, an optional
music bed, and the mandatory first-frame AB-723 disclosure — assembled into both a 16:9
and a 9:16 export. This is the **flagship and default** of the listing-video bot: it ships
a complete, MLS-safe video with **ZERO generative calls** (pure ffmpeg, keyless, no fal
cost). The photos are **sacred** — shipped verbatim; only the camera moves.

This skill runs **headless**. Never ask the user anything: every optional input has a
default below; a missing required input (no photos, or no `listing.json`) is a **clean
recorded failure, not a question**.

## The architecture (read this first — it is load-bearing)

The whole bot is built on one fact the Phase-0 reachability PoC made concrete:
**reachable i2v models have NO geometry lock** — feed a kitchen photo to an image-to-video
model and it will happily melt a cabinet, slide a window, or hallucinate a doorway,
turning a marketing video into an AB-723 *misrepresentation*. So the **deterministic
ffmpeg slideshow is the MLS-safe DEFAULT** and the spine of every export:

- **Only the virtual camera moves** over the **REAL photos** — a slow, single-axis push
  (`zoompan`). There is **no pixel synthesis**: the home in frame 200 is the exact same
  pixels the agent photographed, just panned/zoomed. Nothing can melt, drift, or invent
  geometry because nothing is generated.
- It is **KEYLESS** (ffmpeg only, no `ai-gen`, no fal cost) and it **always ships** —
  even with no music and no model access, this skill produces a complete, publishable,
  disclosed video.
- Generative i2v reveals (the sibling cinematic-director track) are **OPTIONAL,
  motion-only, regen-on-failure inserts** layered on top of this spine — never the
  default and never inside this skill. This skill is the safe deterministic floor every
  listing video stands on.

State this discipline in the log: the photos were not altered, only moved.

## When to use

The `slideshow` row of the project's `state.md` (the default phase of the listing-video
chain, after onboarding). Also invoked directly when asked to "make a listing video",
"turn these listing photos into a video", "create a property walkthrough / tour video",
"build a real-estate reel from these photos", "make a 60-second listing video", or "video
from listing photos".

## Read first (READ-BEFORE-WRITE)

Read, in this order:

1. `artifacts/<listing>/context.md` — listing truth (which photos, target portal, tone,
   aspects, music). Optional; defaults below if absent.
2. `artifacts/<listing>/inputs/listing.json` — the **required** facts
   (`{address, price, beds, baths, sqft, agent, cta, music?}`) that fill the cards and set
   the photo order. Confirm it parses with `python3 -c "import json;json.load(open(...))"`.
3. `artifacts/<listing>/inputs/*.jpg|*.png` — the **required** real photos. Confirm at
   least one readable image exists.

**Required-input gate (record, don't ask):**

- **No photos** on disk (`inputs/` has zero readable `*.jpg|*.png`) → write a failure note
  in `state.md` (`status: blocked`, `next_action: re-run onboarding — inputs/ has no
  listing photos`) and stop. **Never generate a room from text** — the whole premise is
  real photos.
- **No / unreadable `listing.json`** → same clean failure (`next_action: re-run onboarding
  — inputs/listing.json missing or unparseable`). The cards need real facts; do not invent
  an address or price.

**Defaults for optional inputs:**

- **music** → none (silent export). Never auto-fetch a track — undisclosed/unlicensed
  audio is a copyright strike. Use `inputs/music.mp3` or `listing.json.music` only.
- **aspects** → BOTH `16:9` and `9:16` (one full assemble pass each); add `1:1` only if
  requested.
- **photo order** → the `photos`/order array in `listing.json` if present, else
  **lexicographic** filename order. Save segments as zero-padded `NN-` so the assembler's
  `*.mp4` glob concats them in that order.
- **per-photo duration** → ~4s each (1..15 allowed). Vary the push **DIR** across photos
  (`in`, `out`, `left`, `right`) so the tour does not feel mechanical.
- **per-field card defaults** — any missing `listing.json` field: omit that line (do not
  print "undefined"); if `cta` is missing, default the outro CTA to the `agent` name; if
  `agent` is missing too, omit the outro card. Record every omission as an assumption.
- **pacing** — target ~15–40s total (reel form): the 9:16 cut leads with the hook card in
  the first 0–2s. If many photos push past ~40s, trim per-photo duration toward 3s rather
  than dropping photos.

## Step 0 — Sanity-check the environment (attempt, don't gate the engine)

The slideshow is keyless, so the only dependency is ffmpeg/ffprobe (present on sl8-video):

```bash
command -v ffmpeg ffprobe && ffmpeg -hide_banner -version | head -1 > work/slideshow/ff.txt
mkdir -p work/slideshow artifacts/<listing>/clips/16x9 artifacts/<listing>/clips/9x16 artifacts/<listing>/exports
```

If ffmpeg is somehow absent, the scripts exit 2 with a clear message — record `blocked`
and stop (this should never happen on sl8-video). No `ai-gen`, no `ai-gen balance`, no fal
spend is involved in this skill.

## Step 1 — Build the intro title card (`00-`)

Render the branded intro as the first segment (`00-` sorts before any photo). Line 1 is
the big accent title — the address; the rest step down:

```bash
ASPECT=16:9 DURATION=3 \
scripts/title-card.sh artifacts/<listing>/clips/16x9/00-intro.mp4 \
  "<ADDRESS from listing.json>" \
  "<PRICE> · <BEDS> bd · <BATHS> ba · <SQFT> sqft" \
  "<AGENT>"
```

- Omit any line whose `listing.json` field is missing (don't print "undefined").
- Repeat per requested aspect into the matching `clips/<aspect>/` dir
  (`ASPECT=9:16 … clips/9x16/00-intro.mp4`). For 9:16, keep the intro short (2–3s) so the
  hook lands in the first 0–2s.

## Step 2 — One Ken-Burns segment per photo (`NN-`, vary DIR)

For each photo in order, turn it into a ~4s single-axis camera move. The photo is
unchanged — only the camera moves. Save as zero-padded `NN-` (01, 02, …) so the assembler
concats in order:

```bash
ASPECT=16:9 DIR=in PAD=black \
scripts/still-segment.sh artifacts/<listing>/inputs/01-living.jpg 4 \
  artifacts/<listing>/clips/16x9/01-living.mp4
```

- **Vary `DIR`** across photos for variety (`in`, `out`, `left`, `right`) — a slow,
  single-axis move per the recipe in `references/ffmpeg-slideshow.md`. Multi-axis moves are
  what read as "melting"; the script enforces single-axis on purpose.
- `DURATION` is an integer 1..15 (default ~4). `PAD=black` (cinematic) letterboxes a photo
  whose aspect doesn't fill the canvas; `PAD=white` for a clean/bright brand.
- Re-run the same photos into `clips/9x16/NN-…mp4` with `ASPECT=9:16` (a vertical crop-pad
  of the SAME real photo — still verbatim, still only the camera moving).

## Step 3 — Build the CTA outro card

Render the closing call-to-action as the last segment (a high `NN`, e.g. `99-`):

```bash
ASPECT=16:9 DURATION=3 \
scripts/title-card.sh artifacts/<listing>/clips/16x9/99-outro.mp4 \
  "<CTA from listing.json, else AGENT name>" \
  "<AGENT> · <phone/site if present>"
```

If neither `cta` nor `agent` exists, skip the outro card (record the omission).

## Step 4 — Assemble each aspect (16:9 AND 9:16)

Concat the segments, mix the optional music bed, **burn the AB-723 first-frame disclosure
card**, and ffprobe-verify — once per requested aspect:

```bash
# 16:9 (default web/MLS export)
scripts/assemble-listing.sh artifacts/<listing>/clips/16x9 \
  artifacts/<listing>/exports/listing-16x9.mp4 \
  --aspect 16:9 \
  --music artifacts/<listing>/inputs/music.mp3 \
  --min 8 --max 90

# 9:16 (vertical reel)
scripts/assemble-listing.sh artifacts/<listing>/clips/9x16 \
  artifacts/<listing>/exports/listing-9x16.mp4 \
  --aspect 9:16 \
  --music artifacts/<listing>/inputs/music.mp3
```

- `assemble-listing.sh` reads `<clips-dir>/*.mp4` in **lexicographic (= NN) order** — this
  is why `00-`/`NN-`/`99-` naming is the running order.
- **Drop `--music` entirely** when no track was supplied (silent export — never auto-fetch).
- It prints **ONE JSON verdict line** (`"verdict":"PASS"` or `"FLAG"`). A **FLAG still
  exits 0** — deliver the video AND record the `reasons` in `state.md` (e.g. duration
  outside 8–90s, dimensions off, no audio). Capture the JSON; do not discard it.
- The default `--disclosure` text (`"Video created from listing photos using AI motion
  technology"`) matches disclosure-stamp's `VIDEO_CARD` — leave it as the default so the
  burned card and the disclosure pack agree. Pass `--disclosure "none"` ONLY if a human
  explicitly opts out (not recommended — AB-723 needs it).

## Disclosure (mandatory)

AB-723 (in force 2026-01-01) applies to **video**: a first-frame disclosure card **and**
the MLS remark. This is **two layers**, both required:

1. **The burned first-frame card** — `assemble-listing.sh` BURNS it into the first ~3s of
   every export (default text above). Do not skip it.
2. **The MLS remark + AB-723 line** — route every export through the shared
   **disclosure-stamp** skill (read its `SKILL.md`; it is deterministic and never
   publishes). For video it prints `CARD_TEXT`, an `FFMPEG_SUGGESTION`, and points to the
   MLS remark/AB-723 line:

```bash
python3 stamp.py \
  --media artifacts/<listing>/exports/listing-16x9.mp4 \
  --type virtual-staging \
  --out artifacts/<listing>/exports/listing-16x9-disclosed.mp4
```

Then **write `artifacts/<listing>/disclosure.md`** from its output: the verbatim
`CARD_TEXT` (which must match the burned card), the ready-to-paste **MLS remark**, the
**AB-723 disclosure line**, and the **reachable-original note**. The note here is simple
and favorable: because the photos were shipped **verbatim** (no pixel synthesis), the
"unaltered original" the rule wants is just the **real listing photos already in the MLS
photo set** — no separate altered original to host. State that explicitly. (Use
`--type virtual-staging` as the routing type even though this is motion-only; the burned
card is the listing-video text, and `disclosure.md` records both.)

## Outputs

This skill writes exactly these paths (`<listing>` = the active listing slug) — declared
here and in the frontmatter so paths are never guessed:

- `artifacts/<listing>/exports/listing-16x9.mp4` — the 16:9 (1920x1080) cinematic
  slideshow with the music bed (if any) and the first-frame AB-723 card burned in.
- `artifacts/<listing>/exports/listing-9x16.mp4` — the 9:16 (1080x1920) vertical reel cut,
  same disclosure burned in.
- `artifacts/<listing>/disclosure.md` — the AB-723 / MLS disclosure pack (first-frame
  CARD_TEXT + MLS remark + AB-723 line + reachable-original note), from disclosure-stamp.

Plus the per-aspect `clips/<aspect>/*.mp4` segments and working files under
`work/slideshow/` (the assembler JSON verdicts, ffmpeg version) — never bare under
`artifacts/`. Each requested non-default aspect (e.g. `1:1`) writes
`exports/listing-1x1.mp4` by the same pattern.

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` row for `slideshow`:
mark `done` (or `blocked` with the reason), refresh `updated` and `status`, paste the
assembler's JSON `verdict`/`reasons` for each export, and rewrite `next_action` to the one
imperative that is true now (e.g. "Slideshow shipped — 16:9 + 9:16 PASS, disclosed; deliver
to user" or "Re-run onboarding: inputs/ has no listing photos"). Then do the Remember step
per the bot's execution loop. Never stop with a stale ledger, and never leave an export
without its `disclosure.md`.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| No readable photos in `inputs/` | Record failure in `state.md` (`blocked`), stop. NEVER generate a room from text — the premise is real photos. |
| `listing.json` missing / unparseable | Clean recorded failure (`blocked`, `next_action: re-run onboarding`). Don't invent an address/price for the cards. |
| A `listing.json` field is missing (sqft, cta…) | Omit that card line (never print "undefined"); CTA defaults to agent name, then omit outro if agent also missing. Record the assumption. |
| No music supplied | Drop `--music` — silent export. NEVER auto-fetch a track (copyright). |
| `still-segment.sh` / `title-card.sh` exits 2/3 (bad arg, no font, ffmpeg absent) | Fix the arg (duration 1..15, ≤5 lines); a missing font (exit 3) on sl8-video should not happen — record `blocked` if it does. |
| assemble verdict = FLAG (exits 0) | DELIVER the video AND record the JSON `reasons` in `state.md` (e.g. duration outside 8–90s, dims off). A FLAG is a deliver-plus-flag, not a stop. |
| Total runs long (>~40s for the reel) | Trim per-photo duration toward 3s; keep all photos rather than dropping rooms. Re-assemble. |
| A photo's aspect doesn't fill the canvas | `still-segment.sh` letterboxes with `PAD` (black default / white for bright brand) — the photo is never stretched or cropped to distort. |
| Disclosure step skipped/failed | An export must NEVER ship without `disclosure.md` AND the burned first-frame card — re-run disclosure-stamp; if it fails, record `blocked` + FLAG (an undisclosed listing video is an AB-723 misdemeanor). |
| User asks for generative i2v "reveal" shots | Out of scope for THIS skill (the MLS-safe deterministic spine). Note that the sibling cinematic-director track handles optional motion-only inserts; this skill ships the safe slideshow. |

## References

- `references/ffmpeg-slideshow.md` — the verbatim ffmpeg recipes and discipline: the
  `still-segment.sh` Ken-Burns push (single-axis only — why multi-axis melts), the
  `title-card.sh` card layout + brand env (BG/FG/ACCENT), the `assemble-listing.sh` concat
  + music-bed + first-frame-disclosure-burn contract and its JSON verdict, pacing for the
  16:9 vs 9:16 cut, the keyless + MLS-safe + photos-are-sacred discipline, and the ai-gen
  i2v facts for the sibling track (parse `files[0].local_path` with `python3` — jq absent,
  files[] are objects; cost via `ai-gen estimate`/`ai-gen balance` deltas, NEVER
  `credits_used` which over-reports ~8.4×; fal URLs expire, download immediately). Read
  this for the *how* of the deterministic spine.
