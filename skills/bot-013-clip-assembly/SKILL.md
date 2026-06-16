---
name: bot-013-clip-assembly
description: Animate beat stills into image-to-video clips and assemble the finished stickman episode MP4 — Seedance 2.0 fast i2v as the default engine (native ambient audio), pinned fallback chain, still-as-segment fallback so no beat is ever dropped, ffmpeg normalize+concat with an optional punchline caption card (room tone only when a clip has no native audio), ffprobe verification, and an honest production summary. Use for phase 4 (clips-and-assembly) of a stickman episode project, or whenever asked to animate stills into clips, stitch clips into an episode, re-render or re-assemble episode.mp4, or report what was actually generated.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-013
  inputs:
    - name: episode-plan
      type: markdown
      required: true
      description: artifacts/<project-name>/01-episode-plan.md — per-beat motion prompt, duration (5|10s), camera note, plus episode aspect, target-length, punchline line, and room-tone setting
    - name: stills-log
      type: markdown
      required: true
      description: artifacts/<project-name>/03-stills/stills-log.md — per beat the local PNG path, hosted fal.media URL (the i2v input contract), and model used
    - name: room-tone
      type: text
      required: false
      description: Brown-noise room-tone bed, on|off; sourced from the plan's `room-tone:` header. Default OFF — Seedance clips carry native ambient audio, so a tone bed would double up. Only turn it on (header `on`, or all clips fell back to silent still-segments) when the episode would otherwise be silent.
  outputs:
    - name: beat-clips
      type: video
      path: artifacts/<project-name>/04-clips/NN-<beat-slug>.mp4
      description: One clip per kept beat, in plan order (still-as-segment fallbacks included and flagged)
    - name: episode
      type: video
      path: artifacts/<project-name>/episode.mp4
      description: Assembled episode at the project root — normalized, concatenated in beat order, room tone, optional caption card, ffprobe-verified
    - name: summary
      type: markdown
      path: artifacts/<project-name>/05-summary.md
      description: Honest production summary — per clip model/dialect/prompt/duration/fallbacks; episode duration, aspect, audio treatment, limitations
---

# Clip Generation & Episode Assembly (BOT-013 · phase 4)

Turn the approved beat stills into image-to-video clips and cut them into one
YouTube-ready `episode.mp4` — then tell the truth about how it went. This is the
final phase of the episode chain: it consumes the URL contract phase 3 recorded
in `stills-log.md`, and it ends the project.

This skill runs **headless**. Never ask the user anything: every optional input
has a default below; a missing required input is a clean recorded failure, not a
question.

## Trigger

The `clips-and-assembly` row in the project's `state.md` (phase 4, after stills
exist). Also invoked directly when asked to "animate the stills", "make the
clips", "assemble the episode", or "rebuild episode.mp4".

## Read first (READ-BEFORE-WRITE)

Read, in this order — the dependencies are explicit so a resumed session can
audit them:

1. `artifacts/<project-name>/context.md` — project truth (aspect/length overrides).
2. `artifacts/<project-name>/01-episode-plan.md` — per beat: motion prompt,
   duration (5|10), camera note; header: episode aspect, `target-length`,
   punchline line, `room-tone` (on|off).
3. `artifacts/<project-name>/03-stills/stills-log.md` — per beat: local PNG path,
   hosted `https://fal.media/...` URL, model used, skipped-beat markers.

**Required-input gate** (record, don't ask):

- `01-episode-plan.md` or `stills-log.md` missing/empty → write a failure note in
  `state.md` (`status: blocked`, `next_action: re-run phase 1/3 — <file> missing`)
  and stop. Do not invent beats or URLs.
- A beat with **neither** a fal.media URL **nor** a local still on disk → there is
  nothing to animate; skip the beat and FLAG it. (Under v2.1.0 a beat that has a local
  still but no URL is still animatable — pass the local path to `gen-clip.sh`; prefer
  the URL when both exist.)
- A beat phase 3 marked skipped → stays skipped here; say so in the summary.

**Defaults for optional inputs:** room tone **OFF** by default (Seedance clips
carry native ambient audio; pass `--roomtone` to assemble.sh only when the plan's
`room-tone:` header is `on`, or when every clip fell back to a silent
still-segment). Aspect from the plan, else 16:9; caption card rendered iff the plan
has a punchline line; clip duration per beat from the plan, else 5s.

## Step 1 — Confirm the engine (Seedance 2.0 is the default)

As of ai-gen v2.1.0 the proxy routes **`bytedance/seedance-2.0/fast/image-to-video`**
— the default i2v engine. It animates the still AND generates **native ambient
audio**, so it replaces the old silent single-shot chain. Always pass `-m`
explicitly (the scripts do); the CLI's bare default is not what we want.

```bash
ai-gen models --type video --format json > work/clips/discovery.json
ai-gen estimate bytedance/seedance-2.0/fast/image-to-video resolution=720p duration=5 aspect_ratio=16:9
```

- The discovery + estimate are a **reachability check**, not a gate that changes
  the engine: confirm `bytedance/seedance-2.0` appears (matching the bare
  `bytedance/seedance-2.0` namespace — NOT `fal-ai/bytedance/seedance`) and the
  estimate returns a figure (~303 cr ≈ $1.21 for 720p/5s). Read
  `references/seedance-dialect.md` — it is the **default** dialect now.
- `scripts/gen-clip.sh` already defaults to the chain
  `bytedance/seedance-2.0/fast/image-to-video → fal-ai/kling-video/v3/pro/image-to-video`
  and forwards `--resolution 720p --audio on --max-cost 360`. Leave `CLIP_CHAIN`
  unset to use it; override only to add/replace a model (e.g. a non-fast Seedance
  tier for 1080p).
- If discovery or estimate shows Seedance **unreachable** (exit 8 upstream-404, or
  not listed): do **not** silently substitute. Attempt the pinned chain once; if the
  primary 404s, the fallback (kling v3 pro) and then still-segment carry the beat —
  and you FLAG the degraded audio/motion in the summary. A wholesale engine swap is a
  STOP-and-ask, per the model-reachability gate.
- Discovery failing or returning empty does **not** halt the phase: attempt the
  pinned chain anyway (the proxy has served unlisted models before). Keep the
  discovery output in `work/` either way.

Record the engine + effective chain — the summary reports both. Walk fallback chains
**in order**; never improvise an out-of-chain model mid-run (that is how BOT-007's
"SD 3.5 Large incident" happened).

## Step 2 — One clip per beat

One beat = one still = one clip; the *edit* happens at assembly. For each kept
beat `NN` in plan order:

**2.1 Compose the clip prompt** — exactly four lines, in order. Save it to
`work/clips/NN-<beat-slug>.prompt.txt` (per-model depth:
`references/seedance-dialect.md`).

- Line 1 — style lock, **verbatim, always the first line**:

  > A stick figure hand-drawn pencil sketch animation.

- Line 2 — the beat's **motion prompt from the plan, verbatim**. The plan
  already wrote it as one action plus at most one camera move ("Static
  camera." / "Slow push-in.") — do not add a second camera direction, and do
  not paste the plan's `camera:` field into the prompt. That field is a
  compressed cinematography note (`framing, angle; behaviour`) used only as a
  **cross-check**: if the motion text contradicts it, trust the motion text and
  flag the mismatch in the summary.
- Line 3 — negatives, **verbatim**:

  > Single continuous shot, no cuts. No morphing, no extra limbs, no text. The character keeps exactly the same proportions and cap.

- Line 4 — audio directive, **verbatim, always the last line** (Seedance
  generates native audio; steer it to ambient SFX, not a music bed or VO):

  > NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.

Why verbatim: the still is the i2v anchor (the figure the model animates), and
these frozen lines are the motion/identity/audio discipline around it.
Paraphrasing them is how style drift starts — "different videos spliced
together" is the genre's most-cited failure. (`gen-clip.sh` also appends the
audio directive defensively if it is missing, but author it explicitly.)

**2.2 Generate** via the chain walker (queue-aware, 15-min timeout, retries
once on timeout, never leaves the chain). It defaults to Seedance 2.0 fast at
720p with native audio on and a `--max-cost 360` guard:

```bash
scripts/gen-clip.sh work/clips/NN-<beat-slug>.prompt.txt "<fal.media URL or local still path>" <5|10> \
  artifacts/<project-name>/04-clips/NN-<beat-slug>.mp4
```

The image input may be the hosted `fal.media` URL from stills-log.md **or** the
local PNG path (v2.1.0 uploads locals transparently) — prefer the URL when
present. On success it prints `model<TAB>path` — record which model actually
produced every clip and that it carries native audio (the summary depends on
it). Its stderr notes anything the summary must disclose (timeout retries, a
model that rejected the `duration` parameter and ran at its default length).
Tune with env knobs if needed: `CLIP_RESOLUTION` (480p to halve cost),
`CLIP_AUDIO` (off), `CLIP_MAX_COST`.

**2.3 All models fail for a beat → still-as-segment fallback.** The episode
never silently loses a beat; it degrades to a slow push-in on the still:

```bash
ASPECT=<16:9|9:16> scripts/still-segment.sh \
  artifacts/<project-name>/03-stills/NN-<beat-slug>.png <duration> \
  artifacts/<project-name>/04-clips/NN-<beat-slug>.mp4
```

FLAG every still-segment in the summary — hiding one is a graded failure.

## Step 3 — Assemble the episode

```bash
scripts/assemble.sh artifacts/<project-name> \
  [--aspect 16:9|9:16] [--caption "<punchline line from the plan>"] [--roomtone|--no-roomtone]
```

**Room tone is AUTO by default — usually pass neither flag.** Seedance clips carry
native ambient audio, so the script adds a brown-noise bed only when *no* clip has a
native audio stream (e.g. the whole episode fell back to silent still-segments).
Override only on an explicit signal: `--roomtone` if the plan's `room-tone:` header is
`on`, `--no-roomtone` if it is `off`.

The script (recipes and why in `references/assembly.md`): normalizes every clip
to a uniform format (24fps, planned canvas 1920x1080 / 1080x1920, H.264,
yuv420p, uniform audio track — Seedance audio preserved, silent fallbacks get a
silent track) — uniform re-encode *before* concat is what makes concat reliable;
concatenates in beat order; appends a 2s paper-white punchline caption card when
`--caption` is given; applies the AUTO/forced room-tone decision above; writes
`episode.mp4` at the **project root**; verifies with ffprobe and prints a JSON
verdict (duration 15–60s, planned aspect, resolved `roomtone`).

A `FLAG` verdict (e.g. under 15s after skipped beats) still delivers — flag it
prominently in the summary and `state.md`; never withhold the episode.

## Step 4 — Write the summary (honesty is graded)

Write `artifacts/<project-name>/05-summary.md`. Never hide a fallback, a
still-segment, a dropped parameter, or the silence — the user decides what to
re-render based on this file. Cite earlier artifacts; don't restate them.

```markdown
# Episode Summary — <project-name>

## Clips
| beat | file | model | audio | duration | prompt (file) | fallbacks taken |
| 01-... | 04-clips/01-....mp4 | bytedance/seedance-2.0/fast/image-to-video | native ambient | 5s | work/clips/01-....prompt.txt | none |
| 03-... | 04-clips/03-....mp4 | still-segment | silent | 10s | — | all i2v models failed → still-as-segment (FLAG) |

## Episode
- file: episode.mp4 · duration: NNs (ffprobe) vs plan target-length NNs · aspect: 16:9 (1920x1080)
- audio: Seedance native ambient audio per clip; room tone <on −38dB | off (native audio present) | on (all clips were silent)>
- caption card: "<punchline>" (2s, appended after the final beat) | none
- engine: bytedance/seedance-2.0/fast/image-to-video · effective chain: <...>

## Limitations & flags
- <every still-segment, skipped beat, duration deviation, lost-audio clip, FLAG verdict — plainly>
```

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` row for
`clips-and-assembly`: mark it `done` (or `blocked` with the reason), refresh
`updated` and `status` (this is the last phase — a clean run sets the project
`complete`), and rewrite `next_action` to the one imperative that's true now,
e.g. "Project complete — review episode.mp4 and upload" or "Re-run phase 3:
stills-log.md has no hosted URLs". Then do the Remember step per the bot's
execution loop. Never stop with a stale ledger.

## Outputs

This skill writes exactly these paths (`<project-name>` = the active project
slug) — declared here and in the frontmatter so paths are never guessed:

- `artifacts/<project-name>/04-clips/NN-<beat-slug>.mp4` — one clip per kept
  beat, zero-padded `NN` in plan order (still-segment fallbacks included).
- `artifacts/<project-name>/episode.mp4` — the assembled episode, at the
  project root (not inside `04-clips/`).
- `artifacts/<project-name>/05-summary.md` — the honest production summary.

Plus working files under `work/clips/` (prompts, discovery JSON) — never under
`artifacts/`.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| Plan or stills log missing/empty | Record failure in `state.md`, stop. No invented inputs. |
| Beat has no fal.media URL **and** no local still | Still-as-segment is impossible too → skip the beat + FLAG. (A local still alone is fine — v2 uploads it; prefer the URL when present.) |
| i2v model fails | Next model in chain, in order. Never out-of-chain. |
| Generation timeout | `gen-clip.sh` retries that model once (queue congestion is transient), then falls back. |
| Model rejects `duration` param | `gen-clip.sh` retries without it; clip runs at model default — disclose in summary. |
| All models fail for a beat | `still-segment.sh` + FLAG. The beat ships. |
| Concat mismatch | `assemble.sh` re-encodes on concat failure (see `references/assembly.md`). |
| Episode under 15s / off-aspect | Deliver anyway; FLAG verdict goes in summary + `state.md`. |
| No usable font for caption card | Card skipped with a warning — disclose in summary. |

## References

- `references/seedance-dialect.md` — **the default dialect** (Seedance 2.0 fast i2v):
  prompt anatomy, native-audio directives, duration/resolution envelope, ai-gen video
  mechanics. Read this first.
- `references/clip-dialects.md` — single-shot prompt anatomy for the older fallback
  model families and the still-segment fallback; consult only when the chain falls
  past Seedance.
- `references/assembly.md` — ffmpeg recipes explained, verification, failure
  triage.
