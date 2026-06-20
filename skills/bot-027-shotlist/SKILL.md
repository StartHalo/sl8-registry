---
name: bot-027-shotlist
description: Turn a story or fight brief plus a locked character spec into a validated cinematic shot-list — a global style/look header (genre + cinematic lighting + color grading), the @Image1/@Image2 identity-lock line, and 4-6 numbered time-coded [Xs-Ys] shots each carrying ONE camera move + ONE action with an escalation arc and a slow-mo ramp on the key beat, closed by a Total / Audio footer and the standard positive-constraint suffix — written so the render phase composes it into ONE Seedance reference-to-video call unattended. This is THE shot-grammar step; a flat single-clip render or identity drift across cuts is caused by skipping it. Run as phase 2 of every BOT-027 cinematic project, right after the character bible, whenever shotlist.md is missing or fails validate-shotlist.sh, or when asked to plan, re-plan, or rework a cinematic's shots.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-027
  inputs:
    - name: project-context
      type: markdown
      required: true
      description: artifacts/<project-name>/context.md — the story/fight brief (the scene, the beats, the world). Absence is a recorded failure, never an invented story.
    - name: character-spec
      type: markdown
      required: true
      description: artifacts/<project-name>/character-spec.md — the locked bible (Identity Tokens, CHARACTER_BLOCK, palette). Read for the @Image1/@Image2 identity-lock line and the verbatim trait tokens that anchor each shot. If missing, route back to phase 1 (bot-027-character-bible); do not write a shot-list without it.
    - name: shot-count
      type: text
      required: false
      description: Target number of shots as an integer in text form. Default 5; valid 4-6. The render model carries the whole list in one pass, so more than 6 shots in 15s starves each beat.
    - name: duration
      type: text
      required: false
      description: Total cinematic length in seconds, as an integer in text form. Default 15; valid 4-15 (Seedance reference-to-video envelope). The shot time-codes must tile [0..duration] with no gaps or overlaps.
    - name: aspect-ratio
      type: text
      required: false
      description: Frame aspect for the footer and render. Default 16:9; common alternatives 9:16, 1:1, 21:9. Written into the Total footer so the render phase reads it verbatim.
    - name: profile
      type: text
      required: false
      description: Genre arc, story or fight. Default story (wide establishing -> tighter -> climax -> resolve). fight selects the E2 dark-fantasy header and a standoff -> first clash -> escalation -> counter -> final strike arc with impact slow-mo. Recorded in the Notes section.
  outputs:
    - name: shotlist
      type: markdown
      path: artifacts/<project-name>/shotlist.md
      description: The cinematic shot-list — a global style/look header, the @Image1/@Image2 identity-lock line, 4-6 numbered time-coded [Xs-Ys] shots (one camera + one action each, escalation arc, a slow-mo ramp on the key beat) tiling the target duration, and a Total / Audio footer with the positive-constraint suffix. The render phase (bot-027-seedance-cinematic) composes it into ONE Seedance reference-to-video prompt.
---

# Shotlist — design the cinematic shot-list

Convert the project's brief + the locked bible into `artifacts/<project-name>/shotlist.md`:
a numbered, time-coded multi-shot plan with real cinematic shot grammar — an escalation arc,
one camera move and one action per shot, a slow-mo ramp on the key beat, and an explicit
identity lock to the bible images. This is a **pure-LLM phase** — no `ai-gen` calls, no
network, no images. The shot-list is the render contract: phase 3 pastes the whole file —
header, identity line, every shot, the footer, the suffix — into ONE
`bytedance/seedance-2.0/fast/reference-to-video` prompt with the bible passed as `@Image1`
(turnaround sheet) and `@Image2` (hero). The model carries the character across the cuts and
generates native audio in the same pass — there is no separate edit, so a weak or malformed
shot-list cannot be rescued downstream.

This skill runs **headless**. Never ask the user anything: missing optional inputs take the
documented defaults; a missing brief or a missing `character-spec.md` is a clean, recorded
failure (route the missing-spec case back to phase 1).

## The render mechanic (read before writing anything)

Seedance 2.0 renders the **entire numbered shot-list in ONE `reference-to-video` pass** and
carries the character, lighting, and palette across the cuts itself — native multi-shot beats
frame-chaining for multi-scene consistency. Two things make that pass hold together, and both
are your job here:

1. **State the shot count + total duration + aspect at the TOP, then write each shot
   individually.** The model reads the time-codes as cut instructions. Stack two actions or
   two camera moves into one shot and you get the #1 jitter cause (the Seedance 5-layer
   stack). One action + one camera move per `[Xs-Ys]:` line — always.
2. **Lock identity to the bible explicitly.** The render passes the turnaround sheet as
   `@Image1` and the hero as `@Image2`; your identity line tells the model those two images
   are the same character and to "maintain the EXACT same identity in every shot". Reference
   the bible's verbatim trait tokens — never paraphrase a locked token ("emerald eyes" stays
   "emerald eyes").

Read `references/shot-grammar.md` before composing shots — it carries the C1/C2 multi-shot and
E1/E2 fight recipes baked inline, the 5-layer-stack rules, and a fully worked story example
and fight example.

## Workflow

### 1. Read before writing

Read `artifacts/<project-name>/context.md`, `artifacts/<project-name>/character-spec.md`, and
`state.md`. The story/fight brief lives in context.md (usually under "Strategic question /
objective" or "What this project is"): the scene, the beats, the world, the genre. Honor any
standing constraints in context.md (tone, a stated genre, a do-not-touch subject).

From `character-spec.md` pull: the character **Name**, the **Identity Tokens** (the 5-7
verbatim trait tokens), and the **CHARACTER_BLOCK** — you will quote a tight subset of the
tokens in the identity line and weave the character reference into each shot as "the
<character>". Use the spec's section names as-is; they are the fleet contract.

**If context.md has no brief at all**: do NOT invent one — record the failure in state.md (see
"Failure handling") and stop. **If `character-spec.md` is missing**: do NOT write a shot-list —
route back to phase 1 (see "Failure handling").

### 2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| brief | yes | — (clean recorded failure) |
| character-spec.md | yes | — (route back to phase 1) |
| shot-count | no | `5` (valid 4-6) |
| duration | no | `15` seconds (valid 4-15) |
| aspect-ratio | no | `16:9` (`9:16` for Shorts-first briefs that say so) |
| profile | no | `story` (`fight` when the brief is a duel / battle / action beat) |

Every default you apply and every assumption you make gets a bullet in the plan's `## Notes`
section — the render phase and the run summary rely on that honesty.

### 3. Choose the profile and the global header

- **`story` (default).** A beat journey with the universal escalation: **wide establishing ->
  tighter -> climax -> resolve.** Header = `Multi-shot cinematic <genre> short, <medium e.g.
  Pixar-style 3D animation / 35mm live-action>, cinematic lighting, professional color
  grading, <one lighting/look phrase>.` Pick the genre/medium from context.md; never write
  `cinematic` or `epic` bare (they mean nothing to the model) — always pair `cinematic` with a
  lighting word, a texture, or a film reference.
- **`fight`.** A combat arc: **standoff -> first clash -> escalation -> counter -> final
  strike.** Header = the E2 dark-fantasy block, verbatim where it fits the brief:
  `[Style] Oriental Fantasy Live-Action Blockbuster, IMAX movie quality, 8K ultra-clear,
  Photorealistic, Unreal Engine 5 realistic rendering, DaVinci advanced color grading, dark
  battlefield atmosphere, no anime feel, no plastic feel.` plus the E2 atmosphere/audio cues
  (volumetric god rays, dynamic magic effects, sword impacts). Adjust the medium words to the
  brief's world if it is not dark-fantasy, but keep the "lighting-first + color-grading"
  shape.

### 4. The identity-lock line

Immediately under the header, one line that pins the bible to the prompt — write it EXACTLY in
this shape (substitute the spec's Name and a tight 2-3 token subset):

```
@Image1 is the character turnaround reference and @Image2 is the hero reference for <Name> (<2-3 verbatim Identity Tokens>) — maintain the EXACT same character identity in every shot.
```

`@Image1` = the turnaround sheet, `@Image2` = the hero — that order matches how the render
phase passes `--ref`. Then one short line of world/scene establishment ("A sunlit green meadow
under a bright blue sky." / "A rain-slicked obsidian courtyard at dusk.").

### 5. Design the arc and write the shots

Load `references/shot-grammar.md` first. Write **`shot-count`** numbered, time-coded shots that
**tile `[0..duration]` with no gaps and no overlaps** — shot 1 starts at `0s`, the last shot
ends at exactly `duration`, and each shot's start equals the previous shot's end. With 5 shots
over 15s, ~3s each; give the climax/punchline beat the longer dwell if any beat gets it.

Each shot is ONE line in this layout:

```
[0-3s]: <camera move> + <ONE action> + <lighting/look>. <optional [VFX: ...]>
```

Craft rules (the linter enforces the structural ones; `shot-grammar.md` carries the rest):

- **One action + one camera move per shot.** Separate subject motion from camera motion ("the
  robot chases the butterfly, camera tracks alongside") — the single biggest debug lever.
  Name a camera move from the vocabulary: push-in / dolly in, pull-out, pan, tracking shot /
  follow, orbit / arc, low-angle, crane, gimbal, static / locked-off, close-up, wide
  establishing. Name a concrete present-tense action.
- **Lighting first among style words** (golden hour / rim light / volumetric fog) — highest
  quality-per-word. State a lighting/look phrase in most shots.
- **One slow-mo ramp on the key beat** (story climax, or fight final strike): "ramps into slow
  motion ... snaps back". `fast` is the most dangerous keyword — make only ONE element fast and
  hold the rest.
- **Escalation arc** matching the profile (story: wide -> tighter -> climax -> resolve; fight:
  standoff -> clash -> escalate -> counter -> final strike).
- **Optional inline VFX** as `[VFX: petals scattering]` / `[VFX: magic crackling, sparks]` —
  one short bracketed cue, not a paragraph.
- **No negative prompts.** Identity and stability come from positive constraints in the footer
  suffix, never from a "no X" list inside a shot.
- Refer to the character as "the <Name>" / "the <short noun>"; do not re-describe the full
  bible per shot (the identity line + `@Image` refs carry it). Quoting one anchor token for a
  beat is fine ("its big cyan eye").

### 6. The footer and the constraint suffix

Close the file with the footer and the standard positive-constraint suffix, EXACTLY this
shape:

```
Total: <duration>s / <shot-count> shots / <aspect-ratio>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.
```

- `Total:` must restate the duration, shot count, and aspect — the render phase greps this line
  for the `--duration` / `--aspect-ratio` it passes; it must match the time-codes and the
  header.
- `Audio:` describes the native in-pass score + SFX + ambience Seedance generates (no separate
  TTS/mix). Write a score mood + 2-3 concrete SFX + an ambience bed fitting the profile
  (story: "whimsical orchestral score, gentle nature ambience, soft chirps"; fight: "epic
  orchestral score, sword impacts, thunder and wind, a battle cry").
- The suffix is the community positive-constraint tail — append it once, verbatim.

### 7. Write the shot-list file

Write `artifacts/<project-name>/shotlist.md` in EXACTLY this layout (header line, identity
line, optional scene line, the time-coded shots, the footer, then `## Notes`):

```markdown
# Shotlist: <project-name>

<global style/look header — one line>
@Image1 is the character turnaround reference and @Image2 is the hero reference for <Name> (<2-3 tokens>) — maintain the EXACT same character identity in every shot.
<one-line world/scene establishment>

[0-Xs]: <camera> + <action> + <lighting>. <optional [VFX: ...]>
[X-Ys]: <camera> + <action> + <lighting>.
... (4-6 shots, tiling [0..duration])

Total: <duration>s / <shot-count> shots / <aspect-ratio>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.

## Notes

- <profile chosen, defaults applied, assumptions, slow-mo beat, any VFX>
```

Keep the whole file ≤1,200 words — the composed render prompt must stay within model limits.

### 8. Validate

Run the structural linter and fix every reported line until it passes:

```bash
bash <skill-dir>/scripts/validate-shotlist.sh artifacts/<project-name>/shotlist.md
```

Exit 0 = the shot-list is structurally sound; exit 1 = line-itemized errors. Fix and re-run, up
to 3 fix cycles. If it still fails after 3 cycles, keep the best version on disk, mark the phase
`blocked` in state.md with the linter output quoted under "Open questions / blockers", and stop
— never advance the chain on an invalid shot-list. The linter is the deterministic gate the eval
loop uses; do not hand-wave past it.

### 9. Update the ledger

state.md is how phases chain — never leave it stale (see "Ledger updates").

## What the linter checks (and why)

`scripts/validate-shotlist.sh` is the structural floor. It verifies:

- the `# Shotlist:` title and a non-empty global header line;
- the `@Image1 ... @Image2 ... maintain the EXACT same ... identity` line is present;
- 4-6 numbered time-coded `[Xs-Ys]:` shots, each a single line, that **tile `[0..duration]`**
  — shot 1 starts at 0, each start equals the previous end, no gaps/overlaps, and the last end
  equals the target duration ±1s;
- each shot names a **camera move** (from the camera vocabulary) AND a **concrete action**;
- the `Total: Ns / K shots / AR.` footer is present and its N / K / AR agree with the
  time-codes and the shot count;
- the `Audio:` clause and the positive-constraint suffix are present;
- no negative-prompt syntax ("no X" lists) leaks into a shot line.

It cannot judge whether the arc escalates or the slow-mo lands on the right beat — that is the
rubric's job (`evals/rubric.md`). The linter is the floor; arc quality is the ceiling.

## Failure handling (headless)

| situation | action |
|---|---|
| context.md missing entirely | Phase cannot run — mark the phase row `blocked`, project `status: blocked`, blocker: "shotlist blocked: no context.md — run onboarding first". Stop. |
| no brief in context.md | Do NOT write a shot-list. Mark the phase row `blocked`, project `status: blocked`, blocker: "shotlist blocked: brief required — add a story/fight brief to context.md, then re-run phase 2". `next_action: Add a brief to context.md, then re-run phase 2 (bot-027-shotlist).` Stop. |
| character-spec.md missing | Do NOT write a shot-list. Mark the phase row `blocked`, blocker: "shotlist blocked: character-spec.md missing — run phase 1 (bot-027-character-bible) first". `next_action: Run phase 1 (bot-027-character-bible) to lock the bible, then re-run phase 2.` Stop. |
| over-long / two-action shot | Trim per the one-action-per-shot rule; split a packed beat into two shots if the shot budget allows. Record the trim in `## Notes`. Proceed. |
| branded / real-person brief | Keep the premise, swap in stylized stand-ins (stylized characters/creatures only — Seedance restricts realistic human faces); note the substitution in `## Notes`. Proceed. |
| linter still failing after 3 fix cycles | Keep best version, mark phase `blocked` with the linter output quoted in state.md. Stop. |

## Outputs

This phase writes exactly one artifact:

- `artifacts/<project-name>/shotlist.md` — the cinematic shot-list: a global style/look header,
  the `@Image1`/`@Image2` identity-lock line, an optional scene line, 4-6 numbered time-coded
  `[Xs-Ys]:` shots (one camera + one action each, escalation arc, a slow-mo ramp on the key
  beat, optional inline `[VFX: ...]`) tiling the target duration, the `Total: ... Audio: ...`
  footer with the positive-constraint suffix, and a `## Notes` section for the profile, defaults,
  and assumptions.

No other files. The character bible belongs to phase 1; the rendered MP4 + summary belong to
phase 3.

## Ledger updates

After the shot-list validates, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`shotlist`) `done`; set the next row (`render`) to `next` (or
  `in-progress` if you continue this session).
- Refresh `updated:` to today; keep project `status: in-progress`.
- Rewrite `next_action:` to the one imperative for phase 3, e.g.:
  `next_action: Render the cinematic — run bot-027-seedance-cinematic phase 3 (reads shotlist.md + hero.png + reference-sheet.png, writes episode.mp4 + summary.md).`
- Append a Decisions-log line for the profile and any default or assumption that shaped the
  shot-list.

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded failure
is a correct outcome; a silent or invented one is not.

## References

- `references/shot-grammar.md` — the multi-shot recipes C1/C2 and the fight recipes E1/E2 baked
  inline, the 5-layer-stack rules (one action + one camera per shot, lighting-first,
  fast-is-dangerous, slow-mo ramp, positive constraints), the camera/lighting vocabularies, and
  a fully worked story example (`meadow-robot`) AND fight example (`obsidian-duel`). Load before
  writing shots.
- `scripts/validate-shotlist.sh` — deterministic structural linter; the phase gate.
