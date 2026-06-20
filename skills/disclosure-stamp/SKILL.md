---
name: disclosure-stamp
description: >-
  Stamp the legally-required California AB-723 / MLS "digitally altered" disclosure onto a real-estate
  listing photo or video — a conspicuous on-media caption/watermark plus the ready-to-paste MLS remark,
  the AB-723 disclosure line, and an original+altered side-by-side pairing. Use this whenever a real
  estate agent has an AI-altered or digitally-edited listing image/video (virtual staging, twilight/dusk,
  sky replacement, decluttering, restyle, or a renovation-concept render) that will be published to the
  MLS, Zillow, a portal, or social — even if they don't say the word "disclosure" — because undisclosed
  altered listing media is a California AB-723 misdemeanor. Also use it as the shared disclosure step for
  any bot that produces altered listing visuals (it is the one stamping skill the photo-studio and video
  bots reuse).
metadata:
  author: slate-bot (BOT-019 re-compliance-guard)
  inputs:
    - name: media
      type: path
      required: true
      description: the altered listing image (.png/.jpg/.webp) or video (.mp4/.mov) to disclose
    - name: alteration_type
      type: enum
      required: false
      description: "one of: virtual-staging | twilight | sky | declutter | restyle | renovation-concept (default virtual-staging)"
    - name: original
      type: path
      required: false
      description: the unaltered original (enables the AB-723 adjacent pairing)
    - name: jurisdiction
      type: enum
      required: false
      description: "CA-AB723 (default) | CA-CRMLS | other"
  outputs:
    - name: stamped_media
      type: file
      path: artifacts/<project-name>/disclosed/<name>-disclosed.jpg
      description: the media re-saved with the conspicuous disclosure caption
    - name: disclosure_assets
      type: file
      path: artifacts/<project-name>/disclosed/disclosure-assets.md
      description: caption text + MLS remark + AB-723 line + pairing order
    - name: pair
      type: file
      path: artifacts/<project-name>/disclosed/<name>-pair.jpg
      description: ORIGINAL+ALTERED side-by-side (when an original is supplied)
---

# disclosure-stamp

Make an AI-altered or digitally-edited real-estate listing image/video **AB-723 compliant to publish**:
stamp the conspicuous "digitally altered" statement on the media, and emit the exact MLS remark, the
AB-723 disclosure line, and the unaltered-original pairing the rule requires. This skill is the single
disclosure step every SL8 real-estate visual bot routes through, so the wording stays consistent and is
updated in one place.

It is **deterministic** (Pillow / ImageMagick + text) — no AI generation. It does **not** publish
anything and it is **not legal advice**; it produces compliant, copy-paste-ready assets for a human to ship.

## When to use
Any time altered listing media is about to go to the MLS / Zillow / a portal / social: virtual staging,
day-to-dusk twilight, sky replacement, decluttering/removal, restyle, or a renovation-concept render.
Undisclosed altered listing media is a California **misdemeanor** + DRE-discipline risk under AB-723, so
err toward stamping.

## Workflow
1. **Ensure Pillow** is available: `bash scripts/ensure-pillow.sh` (installs on sl8-video; if it exits 4,
   fall back to ImageMagick `convert` for the caption bar).
2. **Stamp the media**: `python3 scripts/stamp.py --media <path> --type <alteration_type> --out artifacts/<project-name>/disclosed/<name>-disclosed.jpg`.
   - For video it prints the first-frame card text + a ready `ffmpeg drawtext` command (run it if the
     caller wants the card burned in; keep `-c:a copy` to avoid audio re-encode).
3. **Pair the original** (if supplied): `python3 scripts/pair.py --altered <stamped> --original <orig> --out artifacts/<project-name>/disclosed/<name>-pair.jpg`.
4. **Write `disclosure-assets.md`** in the same `disclosed/` folder using the templates in
   `references/disclosure-formats.md` — fill the caption, the MLS remark (right parenthetical for the
   alteration type), the AB-723 line (leave the `<ORIGINAL_URL_OR_QR>` slot for the agent to host), and
   the pairing order. If **no original** was supplied, add the explicit **ACTION REQUIRED** note that
   AB-723 requires hosting the unaltered original at a public, login-free URL/QR.

The exact caption/remark/line wording per alteration type and jurisdiction lives in
`references/disclosure-formats.md` — read it before writing `disclosure-assets.md`.

## Outputs
Write everything under `artifacts/<project-name>/disclosed/` (the `<project-name>` runtime token is the
current project's folder):
- `<name>-disclosed.jpg` — the media with the conspicuous caption.
- `disclosure-assets.md` — caption + MLS remark + AB-723 line + pairing order (+ ACTION REQUIRED if no original).
- `<name>-pair.jpg` — ORIGINAL+ALTERED side-by-side, when an original is supplied.

## Constraints
- **Never publish or auto-submit.** Produce assets; a human ships.
- The caption is necessary but **not sufficient** — AB-723 also needs the reachable, adjacent original;
  always surface that in `disclosure-assets.md`.
- This is a compliance **assistant**, not legal advice — say so. The rule-pack is **CA-default**; for
  non-CA boards, flag that the local rule must be confirmed.
