---
skill: cinematic-video
target_score: 0.85
publish_threshold: 0.80
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Anchors at 0 / 5 / 10.
# Reframed from BOT-027's three per-skill rubrics onto the workflow contract, 2026-08.
# Judges assert positive oracles and are re-derived per run (skill-authoring §10);
# media dimensions VIEW the actual pixels/keyframes, never filenames or prose.
dimensions:
  - id: artifact-chain-integrity
    weight: 0.30
    judge_prompt: |
      Walk artifacts/<project>/ against the workflow's own contract: plan.json (approved
      or checkpoint-recorded BEFORE any spend), style.md, character/spec.md + sheet.png +
      hero.png (approval recorded before any video call), shot-plan.json, one shots/NN/
      dir per pass with prompt.txt + scene.mp4 + a request id journaled in plan.json,
      renders/final.mp4 + shots.md, qc/contact-sheet.jpg + ffprobe.txt.
      10 = every step left its artifact and every gate precedes its spend.
      5 = the MP4 exists but one step's artifact or gate record is missing.
      0 = artifacts fabricated, steps skipped, or money spent before the plan/refs gates.

  - id: character-consistency
    weight: 0.30
    judge_prompt: |
      View character/sheet.png, character/hero.png, and keyframes sampled across
      renders/final.mp4 (one or more per shot). Score whether ONE character — the one the
      bible locked — appears in every shot with face, hair, outfit, and palette agreeing,
      and whether every token quoted downstream (shot-plan identity line, shots/NN/
      prompt.txt) is byte-identical to character/spec.md.
      10 = the same character in every sampled frame, on-spec, zero paraphrased tokens.
      5 = identity mostly holds but one shot drifts, or a token was paraphrased.
      0 = different characters across cuts, or the bible was skipped/re-described.

  - id: shot-grammar-and-arc
    weight: 0.25
    judge_prompt: |
      Read shot-plan.json and shots/NN/prompt.txt against
      ../video-prompting/references/shot-grammar.md.
      Score: shots tile [0..dur_s] exactly; each shot exactly ONE closed-vocabulary
      camera move + ONE concrete action, no adjacent camera repeats; a genuine escalation
      arc per the profile; exactly one slow-mo ramp on the key beat; the Total/Audio
      footer + positive-constraint suffix present and agreeing; no negative lists, no
      dialogue, no on-screen text, no unqualified "fast"; scene durations within the
      measured envelope.
      10 = a directed sequence — tiling, grammar, arc, ramp, and footer all clean.
      5 = concrete shots but a flat arc, a packed shot, or a small footer disagreement.
      0 = free-form camera language, stacked motion, broken tiling — it renders as mush.

  - id: delivery-verification-and-honesty
    weight: 0.15
    judge_prompt: |
      Read qc/ and renders/shots.md. Score: ffprobe evidence of h264/yuv420p + aac with
      duration within ±1s of the plan; native in-pass audio only (no added bed/VO); a
      contact sheet spanning every scene; the shots record naming per-pass request ids
      and cost from ai-gen estimate / balance deltas (never credits_used); every flag,
      fallback route, or deviation disclosed rather than hidden.
      10 = verified, accounted, and honest — flags named with their fix paths.
      5 = delivered and mostly verified but one QC artifact or cost line is missing.
      0 = unverified delivery, credits_used accounting, or a silent fallback/flag.
---

## Notes for the iterator (keep short)

- The structural floor is the shot-grammar checklist + the checkpoint inventory in
  SKILL.md; arc quality and cross-shot identity are the ceiling these dimensions grade.
- Fix drift at its owning step: paraphrase → Step 2/3 (the frozen blocks), jitter →
  Step 3 grammar, envelope 422s → Step 1 scene carving. Never patch at assembly.
- Constraints not graded here: stylized characters only (engine face policy); no
  narration in this workflow by design (narrated briefs belong to explainer-video).
