---
name: character-episode
description: >
  Produces ONE episode of a recurring character series — episode 2, 7, 30 of a channel whose
  character, look and format must be identical to episode 1 — off a reusable channel **seed
  kit** that is created once, frozen, snapshotted into every episode, and archived before it
  is ever changed. Use when: "next episode", "episode 3 of my series", "same character as
  last time", "start a channel/series with this character", "keep my channel consistent",
  any brief that names an episode number or an existing series. Chain: a creation workflow —
  it owns the kit, the episode's plan.json and per-step artifacts, and orchestrates the
  domain skills (character-bible, style-system, frame-craft, video-prompting, assembly-qc).
  NOT for: a one-off character short with no sequel (use cinematic-video), a narrated
  explainer (use explainer-video), a single still (frame-craft), or re-cutting an existing
  episode (assembly-qc).
---

# character-episode — the character outlives the episode

`cinematic-video` locks a character **inside** one film. That is enough when there is one
film. A channel is a different problem: episode 30 must look like episode 1, generated
months apart, by a different session, with no memory of what was decided the first time.

So the unit of identity here is not the project — it is the **seed kit**, a channel-level
bundle that is created once, reused verbatim, snapshotted into each episode it makes, and
**archived before it is ever changed**. The episode is disposable. The kit is the asset.

**The channel is the project.** `artifacts/<channel>/` holds the kit and every episode, per
the studio's one-folder-per-project artifact contract.

> **v1 scope: within one `artifacts/` tree.** A kit does not yet survive across sandboxes —
> cross-session persistence is the studio's S6 memory rung and is deliberately not built
> here. What this workflow does guarantee is that *within* a tree, a kit is never silently
> mutated and an episode is always reproducible from its own snapshot. Say this plainly when
> a user asks about continuing a channel from a fresh machine; do not imply persistence the
> workflow does not have.

## Step 0 — Bootstrap & kit routing

`ai-gen --version` + balance check. Then resolve the channel and **route on the kit** before
anything else — this routing decision is what makes the workflow episodic:

| situation | intent | what happens |
|---|---|---|
| no `kit/` for this channel | **create** | Step 1 builds the kit, then the episode continues |
| `kit/` exists, brief is a new episode | **reuse** | Step 1 is a read + snapshot. **No regeneration. No spend.** |
| user wants the character/look changed | **reset** | archive the current kit, build v(N+1), then continue |
| user wants only to set up the channel | **kit-only** | Step 1, then stop and deliver the kit |

Only ask when the answer cannot be inferred. "Episode 4 of the mushroom-forager series" with
a kit on disk is **reuse** — do not ask, and above all do not regenerate.

If `artifacts/<channel>/episodes/NN-*/` exists and is incomplete, RESUME it: reconcile
`plan.json` against the filesystem (plan is intent, filesystem is truth) and continue at the
first unmet checkpoint. Never redo a step whose artifact exists and passes its gate.

**Modes.** Collaborative (default): gates wait for approval. Autonomous (headless): gates
become checkpoint summaries — steps are NEVER skipped, artifacts are NEVER omitted.

## Step 1 — The seed kit — BARRIER: no episode work until the kit is resolved

Read [`references/seed-kit.md`](references/seed-kit.md) before any kit write. It carries the
`kit.json` schema, the archive rules, and the snapshot contract.

**On `create` or `reset`** — build the kit once:

1. **The character**, per [`../character-bible/SKILL.md`](../character-bible/SKILL.md):
   `kit/character/spec.md` (5–7 verbatim tokens, one fixed seed, the frozen
   `CHARACTER_BLOCK`), `kit/character/sheet.png`, `kit/character/hero.png`. Grade the sheet
   with that skill's
   [`consistency-check`](../character-bible/references/consistency-check.md) — a channel's
   face is the most expensive thing here to get wrong, because every future episode inherits
   it. **A kit does not ship below 7/10.**
2. **The look**, per [`../style-system/SKILL.md`](../style-system/SKILL.md): `kit/style.md`,
   one aesthetic-block paragraph, reused verbatim in every episode forever.
3. **The format** — the things that make episodes feel like one series rather than one
   character: runtime target, aspect, shot count per episode, the cold-open convention, the
   sign-off, the audio policy. Recorded in `kit.json`, not left in someone's head.
4. **`kit/kit.json`** — the manifest: version, created date, the three paths above, the
   format block, and an empty `consumed_by[]`.

**On `reset`, archive first — always, before writing anything.** Copy the whole current
`kit/` to `kit/archive/v<N>-<date>/`, then write v(N+1). A channel's old kit is the ground
truth for its entire back catalogue; overwriting it means the earlier episodes can never be
matched or explained again. The archive step is free. Losing it is not recoverable.

**On `reuse` — read, do not regenerate.** The stills are files on disk; open them. Do not
re-run frame-craft "to refresh the reference", do not re-roll the seed, do not rewrite the
tokens. **Regenerating a kit's stills is the single easiest way to lose a channel's face**,
and it costs money to do the damage. The one sanctioned change to a live kit is a `reset`,
which is archived and version-bumped.

**Artifacts:** `kit/kit.json`, `kit/style.md`, `kit/character/{spec.md,sheet.png,hero.png}`
(+ `kit/archive/…` on a reset).

## Step 2 — Episode plan + kit snapshot — GATE: approval before any spend

**Snapshot the kit into the episode, first.** Copy — not link, not reference —
`kit/style.md` and `kit/character/` into `episodes/NN-<slug>/kit-snapshot/`, and record the
kit version in the episode's `plan.json`.

This is what keeps an episode reproducible. The kit is mutable across a channel's life; an
episode is finished the day it ships. Without a snapshot, a later `reset` silently rewrites
what episode 3 *claims* it was made from, and nobody can tell which episodes share a face.
Every prompt in this episode reads from the **snapshot**, never from `kit/`.

Then write the episode plan. Same `plan.json` laws as the rest of the studio
([`../video-prompting/references/plan-contract.md`](../video-prompting/references/plan-contract.md)):

```json
{
  "channel": "slug", "episode": 4, "title": "one line", "premise": "one line",
  "kit_version": 2, "kit_snapshot": "kit-snapshot/",
  "aspect": "16:9", "duration_target_s": 10,
  "continuity": ["what carries in from earlier episodes"],
  "scenes": [{
    "id": 1, "dur_s": 10, "world": "one-line establishment", "key_beat": 4,
    "shots": [{ "t": "0-3", "camera": "wide establishing", "action": "…", "light": "…" }],
    "clip": "shots/01/scene.mp4", "request_id": null
  }]
}
```

Read `kit/continuity.md` (if present) before writing `continuity[]` — recurring props,
locations, and running state are what separate a series from a set of unrelated clips.

**Artifacts:** `episodes/NN-<slug>/kit-snapshot/`, `episodes/NN-<slug>/plan.json`
(draft → approved).

## Step 3 — Shot list (`shot-plan.json`) — GATE: validated before generation

Pure-LLM, and identical in craft to a one-off cinematic: per
[`../video-prompting/references/shot-grammar.md`](../video-prompting/references/shot-grammar.md)
(read before writing), fill each scene's rows — the identity-lock line (`@Image1` = the
snapshot's sheet, `@Image2` = its hero, the character's name, **then the frozen
`CHARACTER_BLOCK` COPIED WHOLE from `kit-snapshot/character/spec.md`**), one world line,
time-coded `[Xs-Ys]:` shots tiling `[0..dur_s]` exactly, one camera move + one concrete
action + a lighting phrase per shot, one slow-mo ramp on the key beat, the Total/Audio
footer and the positive-constraint suffix.

Camera law per [`../video-prompting/SKILL.md`](../video-prompting/SKILL.md): one move per
shot, a CLOSED vocabulary, no adjacent repeats. **One school per channel, not per episode** —
whichever school the kit's first episode used is the channel's grammar; switching schools
mid-series reads as a different show even when the character is identical.

**The identity line is a COPY operation, not a writing task.** Take the whole quoted
`CHARACTER_BLOCK` and paste it. A subset is a paraphrase and a paraphrase IS identity drift —
this cost R05 four of its five tokens on the sibling workflow because the instruction there
said "2–3 tokens". Across a series the damage compounds: drift within one film is a bad
film, drift across a channel is a different character.

**Artifact:** `episodes/NN-<slug>/shot-plan.json`.

## Step 4 — Generate (reference-to-video) — money is spent here

Per [`../video-prompting/SKILL.md`](../video-prompting/SKILL.md) model routing (multi-shot,
character-consistent): `bytedance/seedance-2.0/fast/reference-to-video`, refs in order
sheet → hero **from the snapshot**, native audio default-on. Cap every pass at the MEASURED
envelope — **≤10s @720p / ≤12s @480p** (as-of 2026-07-22); 15s returns 422 despite the
schema. A longer episode ships as per-scene passes + concat.

The prompt is a CONCATENATION of the shot-plan rows — the snapshot's aesthetic block ·
identity line · world line · the `[Xs-Ys]:` shots · the footer + suffix. Concatenate, never
paraphrase. The **paid-call contract** (validate → estimate → one call under `--max-cost` →
journal the id → balance-delta accounting, and the 422 · 7 · 13 · 10 failure table) has one
home: [`../video-prompting/SKILL.md`](../video-prompting/SKILL.md) §Paid-call contract. It
applies here unchanged; do not restate it. Seedance defect triage:
[`../cinematic-video/references/seedance-gotchas.md`](../cinematic-video/references/seedance-gotchas.md).

**THE IDENTITY GATE — free, and it runs BEFORE the submit.** After writing
`shots/NN/prompt.txt` and before spending anything, assert the frozen block appears
character-for-character in every prompt — reading the **snapshot's** spec, which is what this
episode is contractually made from:

```bash
python3 - "$EP" <<'PY'
import re, sys, pathlib
P = pathlib.Path(sys.argv[1])
spec = P / 'kit-snapshot' / 'character' / 'spec.md'
blk = re.search(r'##\s*CHARACTER_BLOCK[^\n]*\n+"([^"]+)"', spec.read_text()).group(1)
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
bad = [str(f) for f in sorted(P.glob('shots/*/prompt.txt')) if norm(blk) not in norm(f.read_text())]
print('IDENTITY GATE:', 'FAIL -> ' + ', '.join(bad) if bad else 'PASS (block verbatim in every prompt)')
sys.exit(1 if bad else 0)
PY
```

**Exit non-zero means STOP — do not submit.** Return to Step 3 and copy the block whole. This
is the last point where the identity law is enforceable for free.

**Artifacts:** per pass `shots/NN/prompt.txt` + `shots/NN/scene.mp4`, the journaled request
id, and the identity-gate result in the transcript.

## Step 5 — Assemble & QC — including the check only a series can fail

Per [`../assembly-qc/SKILL.md`](../assembly-qc/SKILL.md): normalize (24fps H.264/yuv420p +
AAC), multi-scene → QC-01 input gate → uniform layout → concat → `loudnorm`. **Native-audio
law:** the passes already carry score + SFX + ambience; never add a bed or VO at assembly.
Output gates QC-10/11, frame extraction, contact sheet.

**QC-13 (identity) has two halves, and you must not call the first by eye:**

1. **Propagation (mechanical).** Re-run the Step 4 identity gate and quote its exit code.
2. **Appearance (visual).** Does the same character appear across the extracted frames?

**QC-14 — cross-episode continuity. This is the check `cinematic-video` cannot have.** Put
this episode's contact sheet beside the **previous episode's**, and beside
`kit/character/sheet.png`, and answer honestly: is this the same character and the same show?
An episode can be internally perfect — every frame agreeing with every other frame — and
still be a different series from episode 3. That failure is invisible from inside the episode,
which is exactly why the check has to reach outside it.

A QC-14 miss is **not** fixed by patching this episode. Diagnose which it is: the prompt drifted
from the snapshot (→ Step 3, re-render), or the *kit itself* was changed underneath the channel
(→ the archive tells you what it used to be, and the fix is a decision about the series, not a
re-render). Record which, in `renders/episode.md`.

**Artifacts:** `renders/final.mp4`, `qc/contact-sheet.jpg`, `qc/ffprobe.txt`.

## Step 6 — Deliver & update the channel's ledgers

1. **`renders/episode.md`** — one row per pass (scene, time-codes, request id, estimated
   cost, QC verdict), the QC-13/QC-14 verdicts, and the cost accounting (estimates vs balance
   delta).
2. **`kit/kit.json` → `consumed_by[]`** — append `{episode, title, date, kit_version}`. This
   is how a channel answers "which episodes share a face?" without opening every folder.
3. **`kit/continuity.md`** — append what this episode established that later ones must honor
   (a new location, a prop the character now carries, a change in the running state). Keep it
   to facts a future episode must not contradict; it is a continuity ledger, not a recap.

Present the MP4 + contact sheet + the record. Targeted revisions re-enter at the owning step:
identity drift → Step 3 then a Step 4 re-render; a weak scene → Step 4 for that scene only.
**A revision never edits the kit** — if the kit is wrong, that is a `reset` (Step 1, archived
and version-bumped), and it is a decision about the whole channel.

## Artifact layout (the contract RESUME reconciles against)

```
artifacts/<channel>/
├── kit/                          # the channel asset — created once, reused, archived on change
│   ├── kit.json                  #   manifest: version, paths, format, consumed_by[]
│   ├── style.md                  #   the aesthetic block, verbatim in every episode
│   ├── continuity.md             #   the running state later episodes must not contradict
│   ├── character/
│   │   ├── spec.md               #   tokens, seed, frozen CHARACTER_BLOCK
│   │   ├── sheet.png             #   turnaround (@Image1) — NEVER regenerated on reuse
│   │   └── hero.png              #   front hero (@Image2) — NEVER regenerated on reuse
│   └── archive/v<N>-<date>/      #   every superseded kit, whole
└── episodes/NN-<slug>/
    ├── plan.json                 # the episode spine (kit_version recorded)
    ├── kit-snapshot/             # the COPY this episode was made from
    ├── shot-plan.json
    ├── shots/NN/{prompt.txt,scene.mp4}
    ├── renders/{final.mp4,episode.md}
    └── qc/{contact-sheet.jpg,ffprobe.txt}
```

## Checkpoints (the resume/grader inventory)

Before Step 2: `kit/kit.json` + `kit/style.md` + `kit/character/{spec.md,sheet.png,hero.png}`
exist, and on create/reset the consistency check scored ≥7. Before Step 3: `kit-snapshot/`
populated and `plan.json` approved with `kit_version` recorded. Before Step 4 (any paid call):
shot rows validated, every `dur_s` within the measured envelope, the rough cost stated, the
identity gate PASS against the **snapshot**. Before Step 6: every `scenes[].clip` present with
its request id; QC-10/11 green; QC-13 both halves reported; **QC-14 answered against the
previous episode** (or explicitly "n/a — episode 1"). After Step 6: `consumed_by[]` appended.

**A run missing any step artifact fails its grader regardless of the MP4.** Two identical
failures at any paid step ⇒ change the prompt or parameters, never retry verbatim.
