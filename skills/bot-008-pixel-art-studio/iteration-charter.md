---
derive_from:
  source_file: 1-requirements.md
  jtbds:
    - JTBD-1
    - JTBD-2
  derivation_method: outputs+acceptance+failure
  derived_at: 2026-05-05T00:00:00.000Z
  derivation_note: hand-derived (fast path) — not via derive-charter.ts
skill: bot-008-pixel-art-studio
target_score: 0.8
publish_threshold: 0.75
stuck_window: 2
max_iterations: 5
diversity_interval: 3
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: text2pixel-png-shape
      weight: 0.10
      source: structural
      jtbd_source: JTBD-1
      assertion: Verify that ≥1 file matching `artifacts/<project>/text2pixel/*.png` exists with non-zero byte size and a valid PNG header (first 8 bytes `89 50 4E 47 0D 0A 1A 0A`). The check passes only when at least one valid PNG is present.
    - id: text2pixel-summary-shape
      weight: 0.08
      source: structural
      jtbd_source: JTBD-1
      assertion: Verify that `artifacts/<project>/text2pixel/summary.md` exists, is non-empty Markdown, and case-insensitively contains all four labels — "prompt", "tech", "artistic", "url" (or "pollinations url") — each followed by a non-empty value on the same line or the next line. The check passes only when all four labels are present with values.
    - id: text2pixel-aesthetic-match
      weight: 0.18
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: |
        Score 0-10 whether the generated PNG at artifacts/<project>/text2pixel/*.png visibly matches the requested artistic + technical style and depicts the subject from the user prompt. Score 10 if (a) the requested subject from the prompt is clearly recognizable in the image, (b) the requested artistic style is unambiguously present (e.g., cyberpunk = neon + rain + purple/cyan; cozy = warm interior lighting; medieval = stone/torchlight); (c) the requested technical style is visible (NES = obvious limited palette ≤8 distinct colors; SNES = richer 16-bit palette; Game Boy = green-only). Score 5 if the subject is recognizable AND ONE of artistic/technical matches but the other is generic ("pixel art style" without specific era cues). Score 0 if the subject is unrecognizable or replaced (e.g., user asked for a cat, got a dog), or neither artistic nor technical style is visible (looks like generic illustration, not pixel art).
    - id: text2pixel-pixel-aesthetic
      weight: 0.10
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: |
        Score 0-10 whether the image is recognizably pixel art (not a smooth illustration that someone called pixel art). Score 10 if visible pixelation is present — discrete pixels visible at viewing size, hard pixel-edge transitions between palette regions, no painterly anti-aliasing, palette feels finite. Score 5 if the image has a retro / 8-bit color feel but pixel edges are smooth and the result reads as "pixel art-style illustration" rather than authentic pixel art. Score 0 if no pixelation is present and the image is a smooth illustration with no visible pixel grid.
    - id: photo2pixel-png-shape
      weight: 0.10
      source: structural
      jtbd_source: JTBD-2
      assertion: Verify that ≥1 file matching `artifacts/<project>/photo2pixel/*.png` exists with non-zero byte size and a valid PNG header. The check passes only when at least one valid PNG is present.
    - id: photo2pixel-summary-shape
      weight: 0.08
      source: structural
      jtbd_source: JTBD-2
      assertion: Verify that `artifacts/<project>/photo2pixel/summary.md` exists, is non-empty Markdown, and case-insensitively contains all four labels — "source", "preset", "palette", "dither" — each followed by a non-empty value on the same line or the next line. The check passes only when all four labels are present with values.
    - id: photo2pixel-palette-adherence
      weight: 0.14
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: |
        Score 0-10 whether the converted PNG at artifacts/<project>/photo2pixel/*.png visibly adheres to the named preset's palette as recorded in summary.md. Score 10 if the image's distinct colors are clearly limited and visibly match the named preset (NES = ≤63 colors, characteristic NES palette feel; gameboy = exactly 4 green shades, no other hues; C64 = ≤16 colors with the C64 palette character). Score 5 if the image is clearly quantized to a small palette but bleeds outside the named preset's expected palette character (e.g., gameboy preset shows blue or red — a hard violation of "4 greens"). Score 0 if the image looks like the original photo with no visible palette quantization, OR the palette adherence is so loose that the named preset is unrecognizable.
    - id: photo2pixel-subject-preservation
      weight: 0.12
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: |
        Score 0-10 whether the original photo's subject (face, product silhouette, dominant shapes) remains recognizable after pixelation. Score 10 if a person who saw both the original and the converted PNG would unambiguously identify them as the same subject — face structure, product outline, scene composition all preserved. Score 5 if the subject is mostly recognizable but one important element is lost or distorted (e.g., a person's eyes have collapsed into a single dark blob; a product label is unreadable but the product silhouette is clear). Score 0 if the subject is not recognizable in the converted image — pixelation factor was too aggressive or palette quantization destroyed the dominant shapes.
    - id: failure-mode-clean-error
      weight: 0.06
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: |
        This dimension scores the bot's behavior on a clean failure (Pollinations rate-limit exhausted after one retry, OR missing required input). Score 10 if the bot writes `artifacts/<project>/error.md` with a human-readable explanation that names the failure cause (e.g., "Pollinations returned HTTP 429 twice — rate limit exhausted") AND exits non-zero AND no PNG file exists in `text2pixel/` or `photo2pixel/`. Score 5 if the bot exits non-zero and writes an error somewhere, but the file is at the wrong path (e.g., `summary.md` instead of `error.md`) or the message is generic ("error occurred") without naming the cause. Score 0 if the bot hangs in a retry loop, exits zero despite the failure, or produces a partial / corrupt PNG with no error file.
    - id: edge-risky-subject-substitution
      weight: 0.04
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-1
      judge_prompt: |
        This dimension scores the bot's anti-hallucination behavior when the user prompt names a high-risk subject (e.g., "knight holding sword raised high above head"). Score 10 if the bot rephrases the prompt toward a safer composition (mage, samurai, archer, or knight without raised sword) AND records the substitution in summary.md with one sentence naming the original risky pattern and the safer phrasing chosen. Score 5 if the bot rephrases but the substitution is not noted in summary.md, OR records the substitution but uses a generic alternative ("a fantasy character") rather than a documented safer subject. Score 0 if the bot uses the literal risky prompt verbatim with no rephrasing AND no substitution note in summary.md.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-008-pixel-art-studio/iteration-charter.md
---

## Notes for the proposer

This bot wraps an upstream toolkit (Synero/pixel-art-studio, MIT) and ships v1.0.0 as the fast-path adoption of the upstream SKILL.md. The rubric is therefore weighted toward outcome quality rather than process discipline:

- **Aesthetic match** (`text2pixel-aesthetic-match`, weight 0.18) is the single highest-leverage dimension. If the user asks for "cyberpunk" and gets generic pixel art, the bot has failed. Iterations that improve overall composite by relaxing this will be reverted.
- **Palette adherence** (`photo2pixel-palette-adherence`, weight 0.14) is the photo-side equivalent. Game Boy preset MUST produce 4 greens; relaxing this defeats the entire point of named hardware presets.
- **Subject preservation** (`photo2pixel-subject-preservation`, weight 0.12) — pixelation factor in the upstream presets is reasonable but watch for very small input photos (<512px) producing block sizes that erase faces.

Cost / rate-limit constraints:

- Pollinations free + anonymous + ~1 req/60s. The `max_iterations: 5` ceiling assumes ≤2 generations per iteration to stay under 10 minutes total per autoresearch loop. If autoresearch is enabled later, set a `--rate-limit-aware` mode.
- Photo conversion runs locally (no API), so iteration speed is bounded only by image size (~5-15s per call).

Known weaknesses to target first:

- Subject reliability under Pollinations: knights+swords are hallucination-prone (covered by `edge-risky-subject-substitution`, weight 0.04). If Stage 4 evidence shows other risky subject patterns (multi-action descriptions, clustered objects), bump the weight here.
- Pixel visibility at 640x480: Pollinations produces "pixel art style" rather than authentic pixel art at default resolution. Covered by `text2pixel-pixel-aesthetic` (weight 0.10). If users complain about smoothness, the fix is to lower default resolution to 256x240-class for character subjects.

## Mapping: JTBDs → rubric dimensions

| Dimension | JTBD source | Notes |
|---|---|---|
| `text2pixel-png-shape` | JTBD-1 | structural — file exists, valid PNG header |
| `text2pixel-summary-shape` | JTBD-1 | structural — summary.md has prompt/tech/artistic/url |
| `text2pixel-aesthetic-match` | JTBD-1 | quality — image visibly matches requested artistic + technical style + subject |
| `text2pixel-pixel-aesthetic` | JTBD-1 | quality — image is recognizably pixel art (visible pixelation) |
| `photo2pixel-png-shape` | JTBD-2 | structural — file exists, valid PNG header |
| `photo2pixel-summary-shape` | JTBD-2 | structural — summary.md has source/preset/palette/dither |
| `photo2pixel-palette-adherence` | JTBD-2 | quality — output palette adheres to named preset |
| `photo2pixel-subject-preservation` | JTBD-2 | quality — original subject remains recognizable after pixelation |
| `failure-mode-clean-error` | failure-mode:JTBD-1 | quality — clean error.md + non-zero exit on rate-limit / missing input |
| `edge-risky-subject-substitution` | acceptance-scenario:JTBD-1 | quality — rephrase risky subjects (knight+sword) toward safer composition |
