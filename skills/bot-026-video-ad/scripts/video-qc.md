# video-qc — the BLOCKING vision gate on every generated clip

This is **not a script** — it needs a vision model, so the BOT runs it in-session
(`gen-video.sh` only emits `video-manifest.json` listing the clips that still need
QC). It is the honest answer to the load-bearing ceiling: **the reachable i2v models
have no geometry/fidelity lock**, so a wrong-forwarded start frame or an aggressive
prompt can make the model re-imagine the product (a mug became a luggage tag in the
sibling image PoC). Nothing ships, no variant fans out, and no paid spend happens
until a clip PASSES this gate.

## When this runs

After **every** `gen-video.sh` call, BEFORE: (a) showing the clip to the user as
ready, (b) fanning out additional variants, or (c) any disclosure/spend step. Read
`video-manifest.json` and run the check on every entry with `needs_qc: true`.

## How to view a clip for QC (no ffmpeg dependency required)

View the clip's frames against the **original hero still** (the start frame). If a
frame extractor is available, sample frames so you judge motion across the clip, not
one frame:

```bash
# Optional: extract ~1 frame/sec into work/video/qc-frames/<stem>/ for the vision pass.
# (ffmpeg ships in sl8-video; if absent, view the .mp4 directly.)
mkdir -p work/video/qc-frames/<stem>
ffmpeg -v error -i <clip.mp4> -vf fps=1 work/video/qc-frames/<stem>/f-%03d.png
```

Then look at the start frame (hero), the extracted frames (or the clip), and the
`*.note.json` (which records the requested vs resolved camera move).

## The four QC dimensions (grade EVERY clip)

| Dimension | Question |
|---|---|
| **Product identity** | Is it the SAME product as the input hero still — same color/finish, shape, proportions, material? No swap to a different object, no invented prop, no hallucinated variant. (This is the #1 dimension — it answers "the model invented a different product".) |
| **Logo / label stability** | Does the logo/label stay sharp, correctly placed, and unwarped across the whole clip? No garbled, melted, drifting, or invented text. Watch the frames in sequence — text often warps mid-move. |
| **Motion safety / no artifacts** | One slow camera move only? No melted geometry, no jitter, no warping, no morphing edges, no compression mush, no flicker, no extra limbs/objects spawning. (Aggressive moves are the cause; they should have been substituted by `motion-prompt.py`.) |
| **Audio** | If in-pass audio was requested, is there a clean audio track (room tone / soft ambience) with no jarring artifact? Advisory — a clip with good visuals but thin audio still passes visuals and is FLAGGED on audio, not dropped. |

## Verdict per clip (record in `video-qc.md` with the reason)

- **pass** — same product, stable logo, safe motion, no artifacts → ships (still
  never auto-published; a human runs it).
- **drift — DROP** — the product changed, the logo melted/garbled, or geometry warped
  → **blocking drop**, never shown as ready, never fanned out from, never spent on.
  Re-generate once with a calmer move (`push-in` or `static`) or a different engine
  (Kling = logo-stays-sharper); if it drifts again, omit it and FLAG.
- **low-confidence — human review** — reflective / metallic / glass / jewelry / fine
  printed-label products, or fast-motion subjects → ships **with a prominent flag**;
  the bot does not certify it.

## The gating rules (these are blocking, not advice)

- **Never fan out variants off a clip that failed QC.** Variants are generated only
  after the base clip PASSES — drift compounds across a set.
- **Never proceed to disclosure / spend-ready on a `drift` verdict.** A `drift` clip
  is dropped; the project records the drop and the reason. Shipping 1 clean clip
  beats shipping 3 with one that misrepresents the product (the failure that gets a
  Meta "Deceptive Practice" strike AND drives returns).
- **Kling clips get extra scrutiny on identity.** Kling's schema needs
  `start_image_url`, not `image_url`; if the start frame did not attach, the model
  invents a product from the prompt alone. On a Kling clip, confirm the product
  genuinely matches the hero — a mismatch usually means the frame did not forward.
- **The QC verdict precedes the disclosure step.** Only a PASS (or a flagged
  low-confidence) clip is routed to `bot-022-compliance-guard` for the
  Meta/TikTok AI disclosure pre-flight. A dropped clip never reaches disclosure.

Record every verdict — never silently ship a clip that failed QC. That is a graded
honesty failure.
