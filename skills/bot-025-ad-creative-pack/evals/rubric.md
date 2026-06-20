---
skill: bot-025-ad-creative-pack
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Text IS the deliverable, so the heaviest
# dimension is on-image text legibility (graded by VIEWING the pixels and reading the
# words). Brand consistency, on-channel sizing, and no-AI-slop are the other three the
# build brief names; routing-discipline/honesty rounds it out. The judge must be
# vision-capable for the media dimensions.
dimensions:
  - id: text-legibility
    weight: 0.35
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "0*/*.png"
    judge_prompt: |
      View each generated text surface (benefit graphic, comparison chart, A+ module).
      READ the on-image text. Score 0-10 on legibility: every headline / feature label /
      chart cell word is correctly spelled, complete, and readable at thumbnail size,
      with no garbled, duplicated, or invented letterforms and no nonsense sub-text.
      10 = every word crisp and correct, readable small. 5 = mostly legible but one
      label garbled or a minor misspelling. 0 = a garbled headline or pervasive
      gibberish text (the FLUX/Seedream failure the routing rule exists to prevent).
  - id: brand-consistency
    weight: 0.25
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "0*/*.png"
    judge_prompt: |
      View the surfaces against the brand kit (palette hex, font, logo). Score 0-10 on
      brand consistency: the brand palette is actually applied (the Recraft colors= lock
      / brand clause took effect), the type reads as the requested font family (or a
      close clean sans-serif — this is the PARTIAL lock, prompt-level), and the logo
      space/stamp is respected where a logo was supplied. 10 = unmistakably on-brand,
      palette + font + logo all honored. 5 = palette right but font/logo off, or one
      surface drifts. 0 = off-palette, wrong look, no brand application.
  - id: on-channel-sizing
    weight: 0.20
    source: media-judge
    jtbd_source: JTBD-2
    media_glob: "04-variants/*.jpg"
    judge_prompt: |
      View the social variants and cross-check 04-variants/variants-manifest.json.
      Score 0-10 on correct per-channel sizing: meta-1-1 is exactly 1080x1080, meta-4-5
      is 1080x1350, tiktok-9-16 is 1080x1920; each is RGB sRGB under 2MB; the headline /
      key text is NOT clipped by the crop (contain/pad was used where a cover crop would
      cut it); the deterministic resize preserved the master's text verbatim. 10 = every
      requested channel exact, under size, text intact. 5 = sizes right but one crop
      clips the headline, or a file is over 2MB unflagged. 0 = wrong dimensions, or text
      was re-generated/changed per channel instead of resized.
  - id: no-ai-slop-and-fidelity
    weight: 0.10
    source: media-judge
    jtbd_source: failure-mode:JTBD-1
    media_glob: "0*/*.png"
    judge_prompt: |
      View the surfaces. Score 0-10 on conversion-grade quality, not AI-slop: the layout
      is varied and intentional (not the generic centered-icon-row template), the real
      product hero is used where the surface is product-bearing and it is the SAME
      product (no drift — the BOT-022 luggage-tag failure), no invented props/text, no
      template sameness across the pack. 10 = polished, varied, product-faithful. 5 =
      competent but template-y or one product-bearing surface drifted. 0 = generic AI-slop
      or a product-bearing surface shows a different/altered product.
  - id: routing-discipline-and-honesty
    weight: 0.10
    source: llm-judge
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Cross-check the gen provenance (.gen.json / .prompt.txt) + qc.md + the run trace.
      Score 0-10 on discipline + honesty: every text surface was routed to a text-capable
      model (ideogram/v4 / recraft v3-v4 / nano-banana-pro) and NO text surface went to
      FLUX/Seedream (gen-graphic.sh refuses them); qc.md records a per-surface verdict
      (legibility / brand / sizing / fidelity) with drops/flags stated, not buried; the
      partial-brand-lock + predicted-performance-is-not-promised caveats are present; the
      final creatives are handed to compliance-guard and the bot NEVER auto-publishes.
      10 = correct routing, honest QC, handed to the guard, no auto-upload. 5 = routing
      correct but a caveat dropped or QC thin. 0 = text routed to FLUX/Seedream, or an
      auto-publish, or QC contradicts the pixels.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-025-ad-creative-pack/iteration-charter.md
    - bot/skills/bot-025-ad-creative-pack/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- The load-bearing rule (do NOT propose around it): text-bearing surfaces route ONLY to
  text-capable models (ideogram/v4 / recraft v3-v4 / nano-banana-pro). FLUX/Seedream
  garble embedded text — `gen-graphic.sh` refuses them. If legibility scores low, FIRST
  confirm the surface routed to a text model and the prompt asked for "no spelling
  errors / no garbled text", BEFORE touching the script.
- Techniques to prioritize:
  - low text-legibility → try `rendering_speed=QUALITY` (Ideogram) for the final, shorten
    the headline/labels (fewer words render cleaner), and confirm the fallback chain did
    not silently drop to a weaker engine.
  - sizing fails → it is deterministic, so a wrong dimension means the wrong channel key
    or a clipped crop; switch `--mode cover` ↔ `--mode contain`, do NOT regenerate.
  - brand off → the brand clause must be PREPENDED (from `brand-kit.py resolve`) and the
    Recraft `colors_param` passed as a POSITIONAL arg; font is prompt-level only (partial
    lock — never claim a saved font kit).
- Constraints not in the rubric: generation costs fal credits + fal URLs expire (use
  files[0].local_path, ignore credits_used, read balance deltas); per-channel sizing is
  DETERMINISTIC (never regenerate per channel); product-bearing surfaces take a blocking
  fidelity compare; NEVER auto-publish — hand to compliance-guard.
