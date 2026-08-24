---
name: keyframe-scene
description: >
  Builds a multi-scene video where every scene is pinned at BOTH ends — you supply the first
  and last frame and the model interpolates between them, so reveals, morphs, transformations
  and precise state changes land exactly where you drew them. Use when: "start here and end
  there", "the door opens / the logo assembles / the seasons change", "pin the first and last
  frame", "exact control over how a shot ends", "morph A into B", any brief where the END of a
  shot matters as much as the start. Chain: a creation workflow — it orchestrates the domain
  skills (style-system, frame-craft, video-prompting, assembly-qc) and owns the project's
  plan.json + per-scene endpoint pairs. NOT for: a recurring character series (use
  character-episode), a narrated explainer (use explainer-video), a story cinematic where the
  shot end is not the point (use cinematic-video), or a single still (frame-craft directly).
---

# keyframe-scene — the scene is its two endpoints

Every other workflow in this suite describes a shot and hopes. This one **pins both ends and
lets the model find the path between them.** That is the whole difference, and it changes what
the prompt is for: with the endpoints fixed, the prompt no longer describes the scene — it
describes the **transition**.

Proven on our stack by **R10** (2026-08-24): Seedance i2v honours `end_image_url`
(`ai-gen --last-frame`). A closed door in, an open door out, under a prompt that asked only for
a static locked-off camera — and the clip interpolated the wall colour as well as the door. It
did not animate an opening; it traversed from image A to image B.

## Inputs to collect

1. **The brief** — what changes, and what it changes *into*. Only ask when it cannot be
   inferred. A brief that names an end state ("…and then the room is empty") is already a
   keyframe brief.
2. **Scene count and runtime.** Each scene is one paid call, capped at the measured envelope
   (≤10s @720p / ≤12s @480p). Longer pieces are more scenes, not longer scenes.
3. **A reference image, if supplied** — it anchors the *look*, and feeds `style-system` as a
   style donor. It is not an endpoint unless the user says it is the opening frame.
4. **Aspect**, explicit, on every frame and every call.

## Step 0 — Bootstrap

`ai-gen --version` + balance. If `artifacts/<project>/` exists, RESUME: reconcile `plan.json`
against the filesystem (plan is intent, filesystem is truth) and continue at the first unmet
checkpoint. Never redo a step whose artifact exists and passes its gate.

**Modes.** Collaborative: gates wait for approval. Autonomous: gates become checkpoint
summaries — steps are NEVER skipped, artifacts NEVER omitted, and the run finishes rather than
parking at a question nobody is there to answer.

## Step 1 — Plan (`plan.json`) — GATE: approval before any spend

Carve the piece into scenes, and write each scene as **a pair of states plus the change between
them**. The plan laws are the studio's
([`../video-prompting/references/plan-contract.md`](../video-prompting/references/plan-contract.md)):

```json
{
  "project": "slug", "premise": "one line", "aspect": "16:9",
  "style": "style.md",
  "scenes": [{
    "id": 1, "dur_s": 6,
    "from": "a plain wooden door, fully closed, flush with the wall",
    "to":   "the same door wide open, bright glowing doorway visible",
    "change": "the door swings inward",
    "carry_end_forward": true,
    "frames": { "start": "frames/01a.png", "end": "frames/01b.png" },
    "clip": "clips/01.mp4", "request_id": null
  }]
}
```

`from` and `to` are **descriptions of stills**, not of motion. `change` is the only motion
language in the plan, and it is one clause.

**`carry_end_forward`** is the multi-scene mechanism: when true, scene N's end frame becomes
scene N+1's start frame — the same PNG, not a regenerated lookalike. That is what makes a
sequence continuous instead of a set of clips that nearly match.

**Artifact:** `plan.json` (draft → approved).

## Step 2 — Style lock

Per [`../style-system/SKILL.md`](../style-system/SKILL.md): one `style.md` with an aesthetic
block used **verbatim on every frame in the project**. With endpoint pairs this matters more
than anywhere else in the suite — the model is asked to interpolate between two images, and any
style difference between them becomes a visible drift *during* the clip rather than between
clips.

**Artifact:** `style.md`.

## Step 3 — The endpoint pairs — BARRIER: no paid clip until both frames of a scene are approved

Generate every frame through [`../frame-craft/SKILL.md`](../frame-craft/SKILL.md), aesthetic
block verbatim, explicit aspect. Then read
[`references/endpoint-pairs.md`](references/endpoint-pairs.md) — it is the craft this workflow
owns and the difference between a clean morph and a smear.

The one rule to carry in your head:

> **One variable per pair.** The two frames differ in the thing that is supposed to change and
> in nothing else — same framing, same distance, same lens feel, same light, same background.

Every extra difference is something the model must invent a path for, and invented paths are
where interpolation goes soft. A pair that changes subject *and* camera *and* time of day is
three morphs competing for six seconds.

Frames are ~25× cheaper than clips. Re-roll here, not after.

**Artifact:** `frames/NNa.png` + `frames/NNb.png` per scene, and for a carried scene the start
frame is a **copy of the previous end frame, byte-identical** — never a regeneration.

## Step 4 — Generate — money is spent here

Per [`../video-prompting/SKILL.md`](../video-prompting/SKILL.md) model routing:
`bytedance/seedance-2.0/fast/image-to-video`, with **both endpoints pinned**:

```
ai-gen video "<the transition, one clause>" \
  --model bytedance/seedance-2.0/fast/image-to-video \
  --first-frame frames/NNa.png --last-frame frames/NNb.png \
  --duration <dur_s> --resolution <tier> --max-cost <cap> --output clips/
```

**The prompt describes the TRANSITION, not the scene.** The endpoints already say what things
look like; restating them wastes the prompt and invites the model to re-interpret frames it was
given. Write the motion and the camera, nothing else:

| write this | not this |
|---|---|
| `the door swings inward, static locked-off camera` | `a green wooden door in a plain room, it opens` |
| `slow push in as the frost melts from the glass` | `a frosted window in winter that becomes clear` |

Camera law is video-prompting's: one move per scene, closed vocabulary, no adjacent repeats.
The **paid-call contract** — estimate → one call under `--max-cost` → journal the id → account
by balance delta, and the 422 · 7 · 13 · 10 failure table — has one home in
[`../video-prompting/SKILL.md`](../video-prompting/SKILL.md). It applies unchanged; do not
restate it.

**Free pre-spend gate — run it before every submit:**

```bash
python3 - "$P" <<'PY'
import json, pathlib, sys, hashlib
P = pathlib.Path(sys.argv[1]); plan = json.loads((P/'plan.json').read_text())
bad = []
prev_end = None
for s in plan['scenes']:
    a, b = P/s['frames']['start'], P/s['frames']['end']
    for f in (a, b):
        if not f.exists(): bad.append(f"scene {s['id']}: missing {f.name}")
    if a.exists() and b.exists() and a.read_bytes() == b.read_bytes():
        bad.append(f"scene {s['id']}: start and end frame are IDENTICAL — nothing to interpolate")
    if s.get('carry_end_forward') and prev_end and a.exists():
        if hashlib.sha256(a.read_bytes()).hexdigest() != prev_end:
            bad.append(f"scene {s['id']}: carry_end_forward set but the start frame is not the previous end frame")
    prev_end = hashlib.sha256(b.read_bytes()).hexdigest() if b.exists() else None
print('ENDPOINT GATE:', 'FAIL -> ' + '; '.join(bad) if bad else f"PASS ({len(plan['scenes'])} pairs)")
sys.exit(1 if bad else 0)
PY
```

**Exit non-zero means STOP — do not submit.** It costs nothing and it catches the two failures
that are only expensive later: a pair that cannot interpolate because both ends are the same
image, and a broken carry chain that will read as a jump cut in the finished piece.

**Artifacts:** per scene `clips/NN.mp4` + the journaled request id + the gate result.

## Step 5 — Assemble & QC

Per [`../assembly-qc/SKILL.md`](../assembly-qc/SKILL.md): normalize (24fps H.264/yuv420p +
AAC), QC-01 input gate, concat, `loudnorm`. Output gates QC-10/11, frame extraction, contact
sheet.

**QC-15 — endpoint fidelity. The check only this workflow can fail.** For every scene, extract
the clip's **actual last frame** and compare it to the `to` frame you supplied. The parameter is
honoured (R10) but that is not the same as honoured *well*: a pair the model found hard will
land near the target rather than on it. Report per scene, and say which ones drifted.

A QC-15 miss is a **pair** problem, not a prompt problem — go back to Step 3 and reduce the
difference between the endpoints, then re-render that scene only.

**Artifacts:** `renders/final.mp4`, `qc/contact-sheet.jpg`, `qc/endpoints.md`.

## Step 6 — Deliver

Write `renders/scenes.md`: one row per scene (from → to, duration, request id, estimated cost,
QC-15 verdict) plus the cost accounting (estimates vs balance delta). Present the MP4, the
contact sheet and the record. Revisions re-enter at the owning step: a soft morph → Step 3
(tighten the pair); a wrong motion → Step 4 for that scene; a jump between scenes → Step 3's
carry chain.

## Artifact layout (the contract RESUME reconciles against)

```
artifacts/<project>/
├── plan.json            # Step 1 — scenes as from/to/change triples
├── style.md             # Step 2
├── frames/NNa.png       # Step 3 — the start of scene NN
├── frames/NNb.png       #          the end of scene NN (== NN+1a when carried)
├── clips/NN.mp4         # Step 4 — one paid call per scene
├── renders/
│   ├── final.mp4        # Step 5
│   └── scenes.md        # Step 6 — the scene record + cost accounting
└── qc/
    ├── contact-sheet.jpg
    └── endpoints.md     # QC-15 — delivered last frame vs the supplied end frame
```

## Checkpoints (the resume/grader inventory)

Before Step 4 (any paid call): approved `plan.json`, `style.md`, both frames present per scene,
the endpoint gate PASS, every `dur_s` inside the measured envelope, the rough cost stated.
Before Step 6: every `scenes[].clip` present with its request id, QC-01/10/11 green, QC-15
answered per scene, contact sheet and record on disk.

**A run missing any step artifact fails its grader regardless of the MP4.** Two identical
failures at any paid step ⇒ change the prompt or the pair, never retry verbatim.

## What is NOT characterised yet

R10 proved one clip, one subject, one 4s/480p call. It establishes that the parameter routes and
is obeyed. It does **not** establish behaviour under **large subject displacement**,
**incompatible framing between endpoints**, or **long durations** — those are this workflow's
open questions, and `references/endpoint-pairs.md` gives the conservative rules to stay inside
until they are measured. Say so when a brief pushes on them rather than promising precision the
evidence does not cover.
