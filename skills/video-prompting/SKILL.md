---
name: video-prompting
description: >
  Turns an APPROVED still frame into a motion clip on video models via ai-gen — the motion
  prompt grammar (one camera move, element motion as the energy axis, defect guards), the
  duration/resolution envelope, and the multi-shot beat-table form. Use when: "animate this
  frame/still", "generate the clip/shot/motion", "write the video prompt", "the clip warped
  the text / morphed / flashed", any video-model call in a project. Chain: consumes frames
  approved by frame-craft + the style key and motion_style from style.md; clips feed
  assembly-qc. NOT for: generating the still itself (use frame-craft), narration
  (voice-timing — spoken words are NEVER baked into clips), or final assembly (assembly-qc).
---

# video-prompting — motion is added to a look, never the reverse

A clip call is the expensive, slow, hard-to-judge step — so it runs only from an approved
frame, under a tight grammar that a video model cannot misread.

## Inputs to collect

1. **The approved frame** (hosted URL — upload or reuse the generation URL promptly;
   hosted URLs expire, keep `local_path`).
2. **From the plan** ([`references/plan-contract.md`](references/plan-contract.md) — the
   schema's single home; per shot): camera move (closed vocab below) · element motion ·
   `dur_s` (audio-anchored, never guessed) · has-headline?
3. **From `style.md`:** `motion_style` → amplitude (calm/punchy/max) · palette words ·
   the style key. **Style-key mechanics:** on single-shot i2v the APPROVED FRAME *is* the
   style carrier (it was generated under the verbatim block — attaching a second image is
   neither possible nor needed on an `image_url`-only schema); on r2v/multi-ref calls the
   style key rides as an `@Image` ref in every call.
4. **Constraints mode:** `strict` (default for text-bearing/flat styles — full defect
   guards) or `loose` (exploration; pair with a re-roll budget).

## Prompt build order

1. **Frame line** — "Animate this still into a {style family} motion graphic; {anti-realism
   guard from the preset}."
2. **CAMERA (one move only):** one entry from the closed vocab:
   `static` (locked-off) · `push_in` (one very slow smooth push-in) · `pull_out` · `pan`
   (flat translate) · `tilt` · `parallax` (layers drift at different speeds, camera steady).
   Free-form camera language is BANNED — models over-react ("orbit"/"dolly-zoom" warp flat
   art; "snap/punch-in/slam/quick zoom" produce a one-frame jump that reads as a flash —
   ask for ONE smooth continuous move). Bold moves (orbit, dolly_zoom) only with `loose` +
   re-roll budget.
3. **ELEMENT MOTION (the energy):** rich and specific — what lifts, settles, pulses,
   glints, draws itself — at the preset's amplitude. This axis is safe to be inventive;
   the camera axis is not.
4. **AESTHETIC:** "keep {the finish/texture words from the preset} and the flat background."
5. **AUDIO:** ambient/SFX only — "No voice, no dialogue, no narration" (narration is a
   separate track; assembly marries them).
6. **CONSTRAINTS (strict):** "Keep any HEADLINE TEXT sharp, legible and stable — do not
   warp or wobble the lettering. Keep the layout stable. Stay flat 2D — no 3D rotation, no
   perspective change. ONE continuous move that does not loop, retract or reset. No
   morphing or melting. Animate the motion only; don't re-render the picture." Identity
   anchors get a FREEZE sentence (faces/labels re-letter or re-time without it).

## Model routing

| Job | Model (verify live: `ai-gen info <id>`) | Operative envelope (as-of 2026-07-22) |
|---|---|---|
| Single shot from a frame | `bytedance/seedance-2.0/fast/image-to-video` | `image_url` + `prompt`; `duration` **string enum** "4"–"15"/auto; `resolution` 480p/720p (**default 720p — set it**); `aspect_ratio` default auto (infers from frame); `generate_audio` default true, no surcharge; `end_image_url` listed in the live schema (first/last candidate — ◐ UNVERIFIED on our proxy, probe before relying) |
| Multi-shot, character-consistent | `bytedance/seedance-2.0/fast/reference-to-video` | anchor refs as `@Image1…` (≤9; the 1-ref rule for identity); time-coded shot list; **measured ceiling ≤12s @480p / ≤10s @720p** — 15s returns 422 (uncharged, slow to fail) though schema and estimate claim 15s |
| Draft/test batch | same, 4s @480p | 108 cr (~$0.43) — verified R02; cheap-tier first, promote winners |

**The beat-table form** (multi-shot prompts): time-coded stages `[0-4s]: …` with varied
stage lengths, no verb repeated on adjacent stages, one stillness beat before the payoff.
Cap the final timestamp at the measured envelope, not the schema's claim.

**Paid-call contract — THE single home.** Every other skill in this suite links here; none
restates it. If you are about to write these rules somewhere else, link instead.

`validate` (free, client-side) → `estimate` (free) → submit **one call at a time** with
`--max-cost` set → journal the request id **before** the call can return → async for long
jobs → download immediately (hosted URLs expire) → cost from estimate + balance deltas
(NEVER `credits_used` — over-reports ~8.4× on Seedance). Billing detail lives in the ledger:
[`../assembly-qc/references/models-and-gotchas.md`](../assembly-qc/references/models-and-gotchas.md) §Billing.

**Failure classes — the distinction that decides whether a retry costs money:**

| Exit | Class | Charged? | What you do |
|---|---|---|---|
| 422 | schema mismatch (bad field, over-envelope duration) | **no** | re-inspect the live schema, fix the exact field, retry; two identical failures ⇒ change the prompt, not the field |
| 7 | **validation failure at the provider** | **YES — you paid for the rejection** | **never auto-retry.** Fix the packet first, and run the free client-side `validate` before resubmitting. A blind retry loop here bills once per lap with nothing to show |
| 13 | over `--max-cost` | **no — nothing was submitted** | surface the estimate to the human and re-plan the shot; do not raise the cap to make the error go away |
| 10 | timeout | already charged | recover with `ai-gen result <request-id>` from the journal. **Never resubmit** — the job is running and a resubmit buys the same clip twice |

The asymmetry is the whole point: 422 and 13 are free to hit and safe to retry; **7 and 10
have already cost money**, so the reflex that works for the first pair is exactly wrong for
the second. That is why the request id is journaled before the call can return.

## References (load when needed)

- [`references/plan-contract.md`](references/plan-contract.md) — the plan.json laws every
  workflow's spine obeys (approval before spend, ids journaled at submit, resume by
  reconciliation).
- [`references/shot-grammar.md`](references/shot-grammar.md) — the time-coded multi-shot
  prompt: the render-input concatenation, the 5-layer per-shot stack, the **cinematic
  school's closed camera set**, escalation arcs, time-code arithmetic, anti-patterns, and the
  pre-generation validation checklist. Lived inside `cinematic-video` until 2026-08-23; it is
  camera and motion craft, which is this skill's slice, and a second workflow needed it.

## Quality bar

- [ ] Source frame was approved; the style carrier present (i2v: the frame itself; r2v:
      the style key as a ref); clip look matches the frame (no re-render drift, no realism
      drift).
- [ ] Exactly one continuous camera move; no loop/retract/reset; no mid-shot jump.
- [ ] Headline text stable and legible throughout (frame-by-frame check at assembly).
- [ ] No speech in the clip's audio track.
- [ ] Duration within the measured envelope; request id journaled; spend matches estimate.
