---
derive_from:
  source_file: pipeline/personas/ecommerce-seller/deep-dives/on-model-apparel-tryon.md
  jtbds: [JTBD-1]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md + the deep-dive §5/§6 (2026-06-20)
  derived_at: 2026-06-20T00:00:00.000Z
skill: bot-024-tryon-studio
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: garment-fidelity-vs-flatlay
      weight: 0.40
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "01-tryon/*.png"
      judge_prompt: |
        View each on-model try-on PNG next to the real garment at inputs/garment.jpg.
        Score 0-10 on whether the WORN garment is the SAME item — same fabric
        texture/weight, print/pattern (not warped), color, buttons/seams/trim/collar.
        The model/pose/background may differ; the garment may not. 10 = indistinguishably
        the same garment. 5 = same garment but one attribute drifted unflagged. 0 = a
        different/invented garment, wrong print/color, or fabricated detail.
    - id: no-flattery-misrepresentation
      weight: 0.25
      source: media-judge
      jtbd_source: failure-mode:JTBD-1
      media_glob: "01-tryon/*.png"
      judge_prompt: |
        View each shipped try-on against the flat-lay; judge ONLY whether the garment was
        made to look BETTER than the real item. Score 0-10: cut/length/fit match (fit not
        slimmed, hem not lengthened), fabric not upgraded to premium, real wrinkles not
        pressed smooth, drape not idealized. 10 = as honest as the flat-lay. 5 = mild
        unflagged flattery. 0 = slimmed fit / lengthened hem / upgraded fabric shipped as
        a catalog truth-claim.
    - id: on-model-realism-and-catalog-quality
      weight: 0.20
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "01-tryon/*.png"
      judge_prompt: |
        View each shipped try-on. Score 0-10 on catalog quality: clean composite (no
        mangled hands / broken drape / seam artifacts), believable catalog pose,
        consistent lighting, marketplace-ready resolution (long side ~2000px after
        upscale OR an honest flag), and the same model identity across variants. 10 =
        upload-ready set. 5 = a minor hand/drape artifact or soft/low-res without a flag.
        0 = mangled hands / warped garment / unusably low-res shipped as final.
    - id: qc-honesty-and-discipline
      weight: 0.15
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-1
      judge_prompt: |
        Cross-check qc-report.md + .meta.json vs the artifacts. Score 0-10 on honesty:
        the try-on came from the dedicated VTON endpoint (meta model == FASHN v1.6 or the
        leffa fallback via named args, NOT a general --image re-render); every shipped
        variant has a tryon-qc verdict (pass/drift-dropped/flatter-escalated/review) with
        a reason; drift DROPPED, flatter ESCALATED; IMAGE_SAFETY reframe / missing-fabric
        ask / resolution shortfall / parked face-consistency flagged; no auto-upload. 10 =
        a faithful production log. 5 = a flatter/drift went unflagged or a variant shipped
        without a verdict. 0 = the report contradicts the pixels.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-024-tryon-studio/iteration-charter.md
    - bot/skills/bot-024-tryon-studio/evals/rubric.md
---

## Notes for the proposer

- Dead-ends already tried: (none yet)
- The load-bearing rule (do NOT propose around it): the transfer is the DEDICATED VTON
  path (FASHN v1.6 / Leffa) called with NAMED args `garment_image` + `model_image` via
  `ai-gen run <slug> KEY=VALUE` — NEVER `--image` (the singular image_url), and never a
  general re-render passed off as a transfer. If fidelity scores low, first confirm the
  call shape before touching prompts.
- Techniques to prioritize: low garment-fidelity -> confirm the VTON path ran (not the
  general fallback) and the garment flat-lay was clean (optionally Bria RMBG first);
  flattery slipping through -> tighten tryon-qc.py's cut_fit/fabric judge axis + the
  preserve clause in fabric-inject.py BEFORE touching tryon.sh; the general nano-banana-pro
  path is the LAST resort, fabric-locked, never the default.
- Constraints: generation costs fal credits and fal URLs expire (use files[0].local_path,
  ignore credits_used, read balance deltas); tryon-qc is BLOCKING (never ship drift OR
  flatter); upscale ONLY a QC-passed image; native catalog face-consistency is parked
  (first-party api.fashn.ai only) and approximated via one --ref model image.
