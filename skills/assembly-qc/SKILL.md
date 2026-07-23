---
name: assembly-qc
description: >
  The deterministic finish: ffmpeg assembly (concat, audio-anchored windows, ducked mix,
  loudnorm), post-composited logos/captions, and the verification discipline — frame
  extraction, contact sheets, codec checks — plus the studio's models-and-gotchas ledger
  (read it before debugging ANY failure). Use when: "assemble/mix/export the video", "add
  captions/logo", "verify the render", "why did this step fail", "make the contact sheet",
  any ffmpeg/ImageMagick work in a project. Chain: consumes clips (video-prompting) + VO
  takes and measured timings (voice-timing) + tokens from style.md; the delivered MP4 +
  contact sheet are the project's final artifacts. NOT for: generating any media (frame-
  craft/video-prompting/voice-timing) or choosing the look (style-system).
---

# assembly-qc — deterministic where it matters, verified by frames

Generation is probabilistic; the finish is not. Anything that must be EXACT — timing,
captions, charts, logos, loudness — happens here, in the assembly layer, deterministically.

## Inputs to collect

1. Clips in beat order + VO takes + measured durations — from the anchored plan
   ([`../video-prompting/references/plan-contract.md`](../video-prompting/references/plan-contract.md)).
2. `style.md` tokens (palette/type for caption skins; `logo:` path if any).
3. Music/ambient bed choice (instrumental; described in the plan).
4. Output targets: aspect, resolution, platform (defaults: 24fps H.264/yuv420p + AAC 48k).

**Runtime:** assembly runs on the studio machine — the `sl8-video` template (ffmpeg with
x264/aac/drawtext/concat/amix/loudnorm, ImageMagick `montage`, fontconfig with the packed
caption fonts: DejaVu, Inter, Outfit, Fraunces, Anton, Space Grotesk, Comic-Neue). In a
provisioned sandbox everything below is already installed; host-driven probes reproduce
the same chain.

## The assembly chain (audio-anchored)

1. **Windows from measured audio** — each beat's window = its measured VO + breathing
   room. Visuals stretch to audio: hold the clip's last frame (`tpad=stop_mode=clone`);
   NEVER stretch or retime video, never trim narration to fit.
2. **Concat** normalized segments (same fps/pix_fmt/audio rate first — mismatched inputs
   are the top silent concat killer).
3. **Mix**: clip-native ambient ducked under VO (~0.25 gain or `sidechaincompress`),
   music bed if any, then `loudnorm=I=-16:TP=-1.5`.
4. **Post-composite the exact elements**: logo overlay (from `style.md`, never generated),
   captions cut from the AUTHORED script (never ASR — transcription of clean TTS returns
   unreliable word timings), drawn via drawtext/subtitles with the packed fonts.
5. **Export** 24fps H.264/yuv420p + AAC 48k unless the platform demands otherwise.

## Verification (agents cannot watch MP4s)

- **ffprobe gate**: codecs h264+aac, duration within ±0.5s of the anchored plan, stream
  count right.
- **Frame extraction**: pull 4–6 stills spanning the piece (`-ss <t> -vframes 1`); check
  headline legibility/stability and look continuity at the extracted frames.
- **Contact sheet**: `montage` the stills (the eyeball artifact — attach it to the run
  record; the human review happens on the sheet + the MP4).
- Every delivered piece leaves: `renders/final.mp4` + `snapshots/contact-sheet.jpg` +
  the per-step artifacts under `artifacts/<project>/` (the workflow's contract).

## The gotchas ledger

[`references/models-and-gotchas.md`](references/models-and-gotchas.md) — every hard-won
failure across the pipeline (generation ops, billing, proxy quirks, assembly traps), one
dated row each. **Read it before debugging any failure — most failures are already
documented.** A new failure becomes a row within 48h (P4).

## Quality bar

- [ ] Every timing traces to a measured number; no video was stretched/retimed.
- [ ] Loudness normalized (−16 LUFS / −1.5 dBTP); VO clearly above the bed.
- [ ] Captions/logo pixel-exact from authored sources; zero generated text in overlays.
- [ ] ffprobe gate green; frames extracted; contact sheet produced and attached.
- [ ] All artifacts under `artifacts/<project>/` per the layout contract.
