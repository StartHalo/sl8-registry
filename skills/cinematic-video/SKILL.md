---
name: cinematic-video
description: >
  Turns a story, scene, or dialogue-free action brief into a multi-scene cinematic video
  with a LOCKED character and style, generated via Seedance reference-to-video with native
  engine audio (no narration), through the identity-first spine: plan → character+style
  lock → shot list → r2v pass(es) → assembly → verified delivery. Use when:
  "make a cinematic / short film / character short", "keep the same character across
  shots", "animate this character through a story/fight", any brief-to-finished multi-shot
  character piece without narration. Chain: a creation workflow — it orchestrates the
  domain skills (style-system, frame-craft, video-prompting, assembly-qc) and owns the
  project's plan.json + per-step artifacts; voice-timing is NOT in this chain. NOT for:
  narrated explainers (use explainer-video), a single still (frame-craft directly),
  animating one existing still (video-prompting), fixing/mixing an existing edit
  (assembly-qc), or kinetic typography / motion graphics (hyperframes' motion-graphics).
---

# cinematic-video — one character, held across every shot

One deliverable, one gated runbook, one `plan.json`. Every step leaves a durable artifact
under `artifacts/<project>/`; a step with no artifact did not happen. Money is spent only
downstream of an approved plan AND approved character reference stills. Cinematic means no
narration: audio is the engine's native score + SFX + ambience, steered from the shot
list — voice-timing never runs here.

Method lineage: the BOT-027 cinematic-director pipeline (character bible → shot list → one
Seedance reference-to-video pass; Step-0 PoC 8.8/10, 2026-06-20), promoted onto this
studio's domain skills. Depth lives in `references/` (attributed).

## Step 0 — Bootstrap

`ai-gen --version` + balance check; resolve mode (below); if `artifacts/<project>/`
exists, RESUME: reconcile `plan.json` against the filesystem (plan is intent, filesystem
is truth) and continue at the first unmet checkpoint. Never redo a step whose artifact
exists and passes its gate.

**Modes.** Collaborative (default when a human is present): gates wait for approval.
Autonomous (headless): gates become checkpoint summaries in the transcript — steps are
NEVER skipped, artifacts are NEVER omitted; QC failures follow the fix path or stop with
the QC code named.

## Step 1 — Plan (`plan.json`) — GATE: approval before any spend

Read the brief. Pick the profile: `story` (wide → tighter → climax → resolve) or `fight`
(standoff → first clash → escalation → counter → final strike). Carve the piece into
scenes — ONE scene when the whole film fits a single generation pass; one scene per pass
otherwise (each scene's `dur_s` must fit the r2v envelope, Step 4). 4–6 shots per scene
(more starves each beat). The plan laws come from
[`../video-prompting/references/plan-contract.md`](../video-prompting/references/plan-contract.md)
— approval before any paid call, request ids journaled at submit, resume by
reconciliation — with the cinematic shape (no narration fields):

```json
{
  "project": "slug", "premise": "one line", "profile": "story|fight",
  "aspect": "16:9", "duration_target_s": 10,
  "style": "style.md", "character": "character/spec.md",
  "scenes": [{
    "id": 1, "dur_s": 10, "world": "one-line scene establishment", "key_beat": 4,
    "shots": [{ "t": "0-3", "camera": "wide establishing", "action": "…", "light": "…", "vfx": null }],
    "clip": "shots/01/scene.mp4", "request_id": null
  }]
}
```

**Artifact:** `plan.json` (draft → approved).

## Step 2 — Character & style lock — BARRIER: no video call until the refs are approved

Per [`../style-system/SKILL.md`](../style-system/SKILL.md): create `style.md` (preset or
composed). For a cinematic, write the aesthetic block as ONE look paragraph — medium +
lighting + color grading, never `cinematic`/`epic` bare — so it doubles as the
frame-prompt block (the verbatim law) and the render prompt's global header (Step 4).

Then lock the character per
[`references/character-bible.md`](references/character-bible.md) (read before composing):
`character/spec.md` — 5–7 verbatim identity tokens ordered face → hair → eyes →
outfit/props, one fixed integer seed, the frozen CHARACTER_BLOCK. **The no-synonym law:**
once a token is locked it is reused byte-identical in every downstream prompt — a
paraphrase ("violet eyes" → "purple eyes") IS identity drift. Stylized
characters/creatures only — no real people, brands, or copyrighted characters (also the
engine's face policy); swap in an original stand-in and note it.

Then the reference stills per [`../frame-craft/SKILL.md`](../frame-craft/SKILL.md), both
with the aesthetic block + CHARACTER_BLOCK verbatim, the SAME seed, explicit
`aspect_ratio`: `character/sheet.png` (multi-view turnaround — ONE consistent character,
clean neutral background, no in-image text) and `character/hero.png` (clean front-facing
hero). A user-supplied reference image is THE identity anchor — pass it as the ONE ref
(frame-craft's 1-ref rule: refs dilute; max 2 total). READ the pixels before approving:
every view one character, on-spec, no stray text — a bad bible poisons every shot
downstream. Re-roll here (~25× cheaper than clips); a retry keeps the seed and tightens
the prompt toward the drifting token — never change the seed to "fix" drift.

On the r2v pass the sheet + hero ARE the style carriers (both were generated under the
verbatim block) — do not add a third style-key ref.
<!-- Tension, resolved openly: style-system's "on r2v the style key rides as a ref" would
make 3 refs; frame-craft's measured dilution rule caps identity refs at 2, and the proven
BOT-027 pass used exactly sheet+hero. The pair wins here. -->

**Artifacts:** `style.md`, `character/spec.md`, `character/sheet.png`,
`character/hero.png` + refs approval noted in the transcript.

## Step 3 — Shot list (`shot-plan.json`) — GATE: validated before generation

Pure-LLM. Per [`references/shot-grammar.md`](references/shot-grammar.md) (read before
writing), fill each scene's rows: the identity-lock line (`@Image1` = sheet, `@Image2` =
hero, the character's name + 2–3 verbatim tokens, "maintain the EXACT same character
identity in every shot"); one world line; time-coded `[Xs-Ys]:` shots tiling
`[0..dur_s]` exactly (no gaps, no overlaps); each shot exactly ONE camera move + ONE
concrete present-tense action + a lighting phrase; the escalation arc per profile;
exactly one slow-mo ramp on the scene's key beat; optional `[VFX: …]`; the closing
`Total: <N>s / <K> shots / <AR>. Audio: <score + SFX + ambience>.` footer + the
positive-constraint suffix.

Camera law per [`../video-prompting/SKILL.md`](../video-prompting/SKILL.md): one move per
shot, a CLOSED vocabulary, no adjacent repeats, free-form camera language banned. The
closed set here is the cinematic school (physical moves — tracking, orbit, low-angle,
crane…) listed in `references/shot-grammar.md`; video-prompting's flat-art set
(`static/push_in/pull_out/pan/tilt/parallax`) applies verbatim when the locked style is
flat/graphic. One school per project — never mix.

No dialogue lines and no on-screen text in any shot (the engine mangles text — titles are
post, per assembly-qc). No negative "no X" lists inside shots — constraints live once in
the footer suffix. Validate against the checklist in `references/shot-grammar.md`
(tiling, footer agreement, one-camera-one-action, single ramp, verbatim tokens) and fix
until clean. **Artifact:** `shot-plan.json`.

## Step 4 — Generate (reference-to-video) — money is spent here

Per [`../video-prompting/SKILL.md`](../video-prompting/SKILL.md) model routing
(multi-shot, character-consistent row): `bytedance/seedance-2.0/fast/reference-to-video`,
refs in order sheet → hero (`--ref` maps to `@Image1`/`@Image2`), native audio
default-on. **Cap every pass at the MEASURED envelope — ≤10s @720p / ≤12s @480p (as-of
2026-07-22); 15s returns 422 despite the schema's claim.**
<!-- BOT-027's 15s/720p PoC (2026-06-20) predates that measurement; the domain skill's
measured envelope wins. A longer film ships as per-scene passes + concat. -->

Before the first call, STATE the rough cost — draft 4s @480p ≈ 108 cr (~$0.43, verified
R02); a full 720p pass runs several hundred credits; `ai-gen estimate` for the real
figure. Collaborative mode confirms it; autonomous mode records it and proceeds under the
run's cap. One pass per scene, the SAME two refs and the SAME frozen blocks every pass.
The prompt is a CONCATENATION of the scene's shot-plan rows — global header (style.md's
aesthetic block) · identity line · world line · the `[Xs-Ys]:` shots · the Total/Audio
footer + suffix — concatenate, never paraphrase. Draft tier first when exploring (480p);
promote the winner to 720p. The **paid-call contract** — validate → estimate → one call at a
time under `--max-cost` → journal the id → balance-delta accounting, and the charged-vs-
uncharged failure table (422 · 7 · 13 · 10) — has one home:
[`../video-prompting/SKILL.md`](../video-prompting/SKILL.md) §Paid-call contract. It applies
here unchanged; do not restate it. Seedance-specific defect guards and triage:
[`references/seedance-gotchas.md`](references/seedance-gotchas.md).

**Artifacts:** per pass `shots/NN/prompt.txt` + `shots/NN/scene.mp4` + the journaled
request id.

## Step 5 — Assemble & QC

Per [`../assembly-qc/SKILL.md`](../assembly-qc/SKILL.md): single scene → normalize (24fps
H.264/yuv420p + AAC) and verify. Multi-scene → input gate QC-01 (stream agreement) →
normalize every scene to a uniform layout → concat → `loudnorm`. **Native-audio law:**
the passes already carry score + SFX + ambience — never add a music bed or any VO at
assembly (it doubles up). Output gates QC-10/11; frame extraction spanning every scene;
contact sheet; compare extracted frames against `character/sheet.png` — cross-shot
identity drift is QC-13 and its fix is a re-render (Step 4), never a patch.

**Artifacts:** `renders/final.mp4`, `qc/contact-sheet.jpg`, `qc/ffprobe.txt`.

## Step 6 — Deliver

Write `renders/shots.md` — the shots contact record: one row per pass (scene, time-codes,
request id, estimated cost, QC verdict) + the one-line cost accounting (estimates vs
balance delta). Present the MP4 + contact sheet + the record. In collaborative mode the
human's eyeball on the sheet is the final gate. Targeted revisions re-enter at the owning
step: identity drift → Step 2 (tighten the bible) then a Step 4 re-render; a weak scene →
Step 4 for that scene only; a grammar fix → Step 3, then re-render.

## Artifact layout (the contract RESUME reconciles against)

```
artifacts/<project>/
├── plan.json            # Step 1 — the spine (draft → approved; request ids land here)
├── style.md             # Step 2 — identity file (style-system's format)
├── character/
│   ├── spec.md          # Step 2 — tokens, seed, frozen CHARACTER_BLOCK
│   ├── sheet.png        # Step 2 — turnaround (@Image1)
│   ├── hero.png         # Step 2 — front hero (@Image2)
│   └── ref.png          # only when the user supplied an identity anchor
├── shot-plan.json       # Step 3 — the validated shot list
├── shots/NN/            # Step 4 — one dir per generation pass
│   ├── prompt.txt       #   the concatenated prompt as submitted
│   └── scene.mp4        #   the downloaded pass output
├── renders/
│   ├── final.mp4        # Step 5 — normalized, verified
│   └── shots.md         # Step 6 — the shots contact record + cost accounting
└── qc/
    ├── contact-sheet.jpg
    └── ffprobe.txt
```

## Checkpoints (the resume/grader inventory)

Before Step 3: approved `plan.json` + `style.md` + `character/spec.md` + approved
`character/sheet.png` + `character/hero.png`. Before Step 4 (any paid video call): every
scene's shot rows validated; every `dur_s` within the measured envelope; the rough cost
stated. Before Step 6: every `scenes[].clip` present with its request id; QC-01
(multi-scene) + QC-10/11 green; contact sheet + shots record exist. **A run missing any
step artifact fails its grader regardless of the MP4.** Two identical failures at any
paid step ⇒ change the prompt/params, never retry verbatim.
