# ffmpeg slideshow — recipes + discipline (BOT-021 · the deterministic spine)

The cinematic listing video is a **deterministic ffmpeg slideshow**: a branded intro card,
one slow single-axis camera move per real photo, a CTA outro, an optional music bed, and a
burned first-frame AB-723 disclosure. It is **KEYLESS** (ffmpeg only — no `ai-gen`, no fal
spend) and **MLS-safe** (no pixel synthesis — only the virtual camera moves; the photos
are shipped verbatim). This file is the *how*; `SKILL.md` is the *when/what*.

Runtime: **sl8-video** sandbox — `ffmpeg`, `ffprobe`, DejaVu fonts, and `ai-gen 2.1.0` are
all present. This skill uses only ffmpeg/ffprobe. Canvas is always 24fps H.264 yuv420p; the
three scripts share normalize settings so concat never special-cases a segment.

---

## Why deterministic — the load-bearing fact

Reachable image-to-video (i2v) models have **NO geometry lock**. Feed a real kitchen photo
to an i2v model asking for a "camera reveal" and it routinely melts a cabinet edge, slides a
window, re-proportions a counter, or invents a doorway — because it *generates* every output
pixel. On a real-estate listing that is not a stylistic flourish, it is an **AB-723
misrepresentation** (the video shows a home that doesn't exist).

The slideshow sidesteps this entirely: **nothing is generated.** `zoompan` pans/zooms across
the *existing* pixels of the real photo. The home in the last frame is the exact home the
agent photographed. So the deterministic slideshow is the **default and the spine** of every
export; generative i2v reveals belong only to the sibling cinematic-director track as
**optional, motion-only, regen-on-failure inserts** layered on top — never the default,
never inside this skill.

---

## still-segment.sh — one photo → one Ken-Burns segment

```
still-segment.sh <photo.(jpg|png)> <duration 1..15> <out.mp4>
  ASPECT=16:9|9:16|1:1   target canvas (default 16:9 → 1920x1080; 9:16 → 1080x1920; 1:1 → 1080x1080)
  DIR=in|out|left|right  push direction (default in = slow zoom-in)
  PAD=black|white        letterbox pad colour for off-aspect photos (default black — cinematic)
prints on success: still-segment\t<out-path>   |  exits 2 on bad arg / no ffmpeg, 1 on ffmpeg failure
```

What it does, and why it is safe:

- **fit + pad** the real photo onto the canvas (`force_original_aspect_ratio=decrease` +
  `pad`) — the photo is **never stretched or center-cropped to distort**; off-aspect photos
  get clean letterbox bars (`PAD`).
- **2× supersample before `zoompan`** — slow zooms jitter on integer pixel steps; the
  supersample smooths the move.
- **single-axis push only.** `DIR=in/out` zoom along z; `DIR=left/right` pan along x. The
  script never combines axes. **Multi-axis drifting moves are what read as "melting"** even
  on a static photo — single-axis reads as a deliberate, cinematic camera move. This is a
  discipline, not a limitation: vary `DIR` *between* photos for variety, never *within* one.
- lands on ~**1.05×** at the last frame (a gentle ~5% move) — enough to feel alive, little
  enough to never reveal pad edges or soften the image.

Usage discipline:

- **~4s per photo** is the default (integer 1..15). For a tighter reel, trim toward 3s
  rather than dropping photos.
- **Vary `DIR` across the photo sequence** (`in`, `out`, `left`, `right`, repeat) so a
  10-room tour doesn't feel like one mechanical zoom.
- Name outputs zero-padded `NN-` (`01-living.mp4`, `02-kitchen.mp4`, …) — the assembler
  concats `*.mp4` in lexicographic order, so `NN` *is* the running order.
- Render the same photo into each requested aspect dir (`clips/16x9/`, `clips/9x16/`) with
  the matching `ASPECT` — a 9:16 segment is a vertical crop-pad of the **same real photo**;
  still verbatim, still only the camera moving.

---

## title-card.sh — branded intro / outro card

```
title-card.sh <out.mp4> "<line1>" ["<line2>" ... up to 5]
  ASPECT=16:9|9:16|1:1   (default 16:9)
  DURATION=<secs>        card length (default 2)
  BG=<hex>               background (default 0x101418 — deep slate)
  FG=<hex>               text colour (default white)
  ACCENT=<hex>           line-1 (title) colour (default 0xC9A34E — warm gold)
prints on success: title-card\t<out-path>   |  exits 2 (bad args / >5 lines), 3 (no font)
```

Layout: lines are stacked and vertically centered; **line 1 is the largest (the title) and
rendered in `ACCENT`**, the rest step down in `FG`. Up to 5 lines. The card is a silent
segment with a real silent stereo track (so concat audio is uniform).

Card composition for a listing:

- **Intro (`00-intro.mp4`)** — line 1 = the **address** (the accent title); line 2 = the
  facts line (`<price> · <beds> bd · <baths> ba · <sqft> sqft`); line 3 = the **agent**.
  Omit any line whose `listing.json` field is missing — **never render the literal string
  "undefined"**. Keep DURATION 2–3s so the 9:16 hook lands in the first 0–2s.
- **Outro (`99-outro.mp4`)** — line 1 = the **CTA** (defaults to the agent name if `cta` is
  absent); line 2 = agent + phone/site if present. If neither `cta` nor `agent` exists, skip
  the outro entirely and record the omission.
- **Brand env** — pass `BG`/`FG`/`ACCENT` hex from `listing.json` brand colours if supplied;
  otherwise the deep-slate + warm-gold default reads as upscale real-estate.

---

## assemble-listing.sh — concat + music + disclosure burn + verify

```
assemble-listing.sh <clips-dir> <out.mp4> [--aspect 16:9|9:16|1:1] [--music <mp3>]
    [--music-db <linear>] [--disclosure "<text>"] [--min <s>] [--max <s>]
reads <clips-dir>/*.mp4 in lexicographic (= NN) order
prints ONE JSON verdict line on stdout; a FLAG still EXITS 0 (deliver + flag)
```

The pipeline (all deterministic ffmpeg):

1. **Normalize** every segment to a uniform 24fps / canvas / H.264 / yuv420p re-encode (and
   give silent segments a silent stereo track) so the concat is reliable.
2. **Concat** stream-copy (re-encode triage on failure).
3. **Final pass** — mix the optional music bed (looped, faded in 1s / out ~1.2s, gain
   `--music-db` default `0.18` linear ≈ **−15dB under** the bed) AND **burn the AB-723
   first-frame card** (`drawtext` … `enable='lt(t,3)'` — visible the first ~3s, top-left,
   on a translucent box). Default text = `"Video created from listing photos using AI motion
   technology"` (this MATCHES disclosure-stamp's `VIDEO_CARD` — leave it as default).
4. **Verify** with ffprobe and print the JSON verdict:
   `{"file":…,"duration_s":…,"width":…,"height":…,"aspect":…,"music":bool,"disclosure":bool,"verdict":"PASS"|"FLAG","reasons":[…]}`.

Verdict handling:

- **PASS** — duration in `[--min, --max]` (default 8..90s), dimensions == planned, audio
  stream present. Ship.
- **FLAG** (still **exits 0**) — one of those failed (e.g. `"duration 6.4s outside 8-90s"`,
  `"got 1920x1080, planned 1080x1920"`, `"no audio stream"`). **Deliver the video anyway**
  and paste the `reasons[]` into `state.md`. A FLAG is *deliver-plus-flag*, never a stop.
- Capture stdout — it is the JSON, one line. `--disclosure "none"` skips the burn (NOT
  recommended; only on explicit human opt-out).

Pacing:

- **16:9** — the web/MLS/YouTube master. 3s intro + ~4s × N photos + 3s outro; comfortable
  range 20–90s. This is the verbose, full-tour cut.
- **9:16** — the social reel (Reels/TikTok/Shorts). Lead with the **hook** (the intro card
  in the first 0–2s), aim **~15–40s total** — trim per-photo toward 3s and prefer the
  strongest 6–10 photos if a full tour overruns. Same first-frame disclosure burned in.

---

## Disclosure — two layers, both mandatory (AB-723, in force 2026-01-01)

AB-723 applies to **video**: a **first-frame disclosure** AND the **MLS remark**. Willful
violation = **misdemeanor + DRE discipline**. Two layers:

1. **Burned first-frame card** — done by `assemble-listing.sh` (the default `--disclosure`
   text). Every export carries it; never `--disclosure "none"` without explicit opt-out.
2. **MLS remark + AB-723 line** — route every export through the shared **disclosure-stamp**
   skill. For a video, `stamp.py --media <export.mp4> --type virtual-staging --out
   <disclosed.mp4>` prints `CARD_TEXT::…`, an `FFMPEG_SUGGESTION::…` (the same drawtext the
   assembler already burned — informational), and the MLS remark/AB-723 line live in
   disclosure-stamp's `references/disclosure-formats.md`. Write `disclosure.md` with the
   verbatim CARD_TEXT, the MLS remark, the AB-723 line, and the **reachable-original note**.

**The reachable-original note is favorable here.** AB-723 wants the unaltered original to be
reachable + adjacent. Because the slideshow ships the photos **verbatim** (no pixel
synthesis), the "unaltered original" is simply **the real listing photos already in the MLS
photo set** — there is no separately-altered original to host. State that in `disclosure.md`:
the video is camera-motion only over the listing's own photos.

---

## ai-gen i2v facts (for the SIBLING cinematic-director track — NOT this skill)

This skill is keyless and never calls `ai-gen`. These facts exist so the deterministic spine
hands off cleanly to the optional generative track and are *not* invoked here:

- **Parse outputs with `python3`, not `jq`** — `jq` is absent on sl8-video and `ai-gen`'s
  `files[]` are **objects**: read `files[0].local_path`
  (`python3 -c "import json,sys;print(json.load(sys.stdin)['files'][0]['local_path'])"`).
- **fal output URLs expire** — download `local_path` immediately; never re-fetch a
  `*.fal.media` URL later.
- **Cost = `ai-gen estimate` + `ai-gen balance` deltas, NEVER `credits_used`** — the
  `credits_used` JSON field over-reports (~8.4× high on seedance i2v). Snapshot `ai-gen
  balance` before/after for the true spend.
- i2v reveals are **motion-only, regen-on-failure** inserts (no geometry lock → vision-QC
  every output and regenerate on drift) — and they layer *on top of* this slideshow spine,
  which always ships regardless of model access.
