---
skill: bot-024-tryon-studio
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The media dims grade the ACTUAL try-on PNGs
# viewed against the seller's real garment flat-lay (judge_model must be vision-capable;
# keyless host-session vision per stage-4-test.md). The honesty/discipline dim reads
# qc-report.md + the .meta.json against the artifacts.
dimensions:
  - id: garment-fidelity-vs-flatlay
    weight: 0.40
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "01-tryon/*.png"
    judge_prompt: |
      View each on-model try-on PNG next to the seller's real garment at
      inputs/garment.jpg. Score 0-10 on whether the WORN garment is the SAME item as the
      flat-lay — same fabric texture/weight, same print/pattern (not warped or
      re-drawn), same color, same buttons/seams/trim/collar. The model, pose, and
      background are allowed to differ; the GARMENT is not. This is the #1 dimension —
      it is the answer to "didn't correspond to the photo" returns.
      10 = indistinguishably the same garment; a buyer would not be surprised on
      arrival. 5 = clearly the same garment but one attribute drifted (a softened print,
      a slightly shifted color) without a flag. 0 = a different/invented garment, wrong
      print/color, or fabricated detail.

  - id: no-flattery-misrepresentation
    weight: 0.25
    source: media-judge
    jtbd_source: failure-mode:JTBD-1
    media_glob: "01-tryon/*.png"
    judge_prompt: |
      View each shipped try-on against the real flat-lay and judge ONLY whether the
      garment was made to look BETTER than the real item. Score 0-10 on honesty of
      representation: the cut, length, and fit match the real garment (a loose fit not
      slimmed, a short hem not lengthened); the fabric is not upgraded to look more
      premium; real wrinkles/defects are not pressed smooth; the drape is not idealized.
      This is the misrepresentation/returns gate — a flattered-but-pretty image is the
      dangerous one.
      10 = the on-model garment is as honest as the flat-lay, nothing idealized. 5 = a
      mild unflagged flattery (slightly smoothed fabric or drape). 0 = visibly slimmed
      fit / lengthened hem / fabric upgraded to luxe / wrinkles removed and shipped as a
      catalog truth-claim.

  - id: on-model-realism-and-catalog-quality
    weight: 0.20
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "01-tryon/*.png"
    judge_prompt: |
      View each shipped try-on. Score 0-10 on commercial catalog quality: the model and
      garment composite cleanly (no mangled hands, no broken/warped fabric drape, no
      seam artifacts), the pose reads as a believable catalog shot, the lighting is
      consistent, and the resolution is marketplace-ready (long side approaching/at
      2000px after upscale, or an honest resolution flag). Across multiple variants the
      same model identity holds (face-consistency).
      10 = an upload-ready catalog set. 5 = usable but a minor hand/drape artifact, a
      slightly off pose, or a soft/low-res result without a flag. 0 = mangled hands,
      warped garment, broken composite, or unusably low resolution shipped as final.

  - id: qc-honesty-and-discipline
    weight: 0.15
    source: llm-judge
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Cross-check qc-report.md + the .meta.json against the artifacts. Score 0-10 on
      honesty: the try-on came from the dedicated VTON endpoint (meta model ==
      fal-ai/fashn/tryon/v1.6 or the leffa fallback, via named args — NOT a general
      --image re-render passed off as a transfer); EVERY shipped variant has a tryon-qc
      verdict (pass / drift-dropped / flatter-escalated / low-confidence-review) with a
      reason; drift is DROPPED and flatter is ESCALATED, not shipped; any IMAGE_SAFETY
      reframe, missing-fabric ask, resolution shortfall, and parked face-consistency
      ceiling are flagged; nothing is claimed that the artifacts contradict; no
      auto-upload occurred.
      10 = a faithful, disciplined production log. 5 = mostly honest but a flatter/drift
      went unflagged, or a variant shipped without a verdict. 0 = the report contradicts
      the pixels (claims fidelity the pixels deny, or ships a drifted/flattered garment
      as passing).

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-024-tryon-studio/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- The load-bearing rule: the transfer is the DEDICATED VTON path (FASHN v1.6 / Leffa)
  called with NAMED args `garment_image` + `model_image` via `ai-gen run` — NOT `--image`
  (which only sends the singular image_url). If a try-on scores low on fidelity, first
  confirm the call went through `ai-gen run <slug> KEY=VALUE`, not a general re-render.
- Techniques to prioritize: low garment-fidelity -> confirm the VTON path (not the
  general fallback) ran, and that the garment flat-lay was clean (optionally Bria RMBG it
  first); flattery slipping through -> tighten the tryon-qc judge prompt's cut_fit/fabric
  axis and the preserve clause in fabric-inject.py; the general fallback is the LAST
  resort, fabric-locked, never the default.
- Constraints not in the rubric: generation costs fal credits and fal URLs expire (use
  files[0].local_path, ignore credits_used, read balance deltas); tryon-qc is BLOCKING —
  never ship a drifted or flattered try-on; upscale ONLY a QC-passed image; native
  catalog face-consistency is parked (first-party api.fashn.ai only) and approximated by
  re-attaching one model image as --ref.
