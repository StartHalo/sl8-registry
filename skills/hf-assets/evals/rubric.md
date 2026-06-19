---
skill: hf-assets
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-assets is mostly a STRUCTURAL prep skill (the right matte/capture files land at the right paths),
# with one media-judge dimension that READS the produced cutout/capture pixels (keyless in-session vision
# path over the produced PNGs). Weights sum to 1.00. Dimensions trace to 1-requirements.md JTBD rows.
dimensions:
  - id: assets-produced
    weight: 0.35
    jtbd_source: JTBD-1
    judge_prompt: |
      Read the run report + the produced files. Score 0-10 on the requested assets actually
      existing at the contract paths: a background-removal request writes
      artifacts/<project>/assets/cutouts/<name>.png (a real, non-empty PNG); a capture request
      writes artifacts/<project>/assets/captures/<slug>/ with at least one screenshot PNG plus
      the extracted tokens.json. The correct command was used (ai-gen run
      fal-ai/bria/background/remove --image …; hyperframes capture "<url>" --json) and the v2
      JSON / capture JSON was parsed (files[0].local_path / projectDir) rather than guessed.
      10 = every requested asset present at the exact contract path from a parsed result.
      5 = produced but to a slightly wrong path, or one piece (tokens / contact-sheet) missing.
      0 = no asset produced, or a fabricated/placeholder file, or a hardcoded path.

  - id: cutout-capture-quality
    weight: 0.30
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "assets/"
    judge_prompt: |
      Look at the produced PNGs under assets/cutouts/ and assets/captures/. Score 0-10 on
      asset quality: a CUTOUT shows the subject cleanly isolated on a transparent background
      (no leftover background fill, no obvious matte halo, the subject not hard-cropped); a
      CAPTURE contact-sheet / screenshots are real, non-blank frames of the requested page (not
      an error/blank page). 10 = clean, usable assets ready to layer in a composition. 5 =
      usable but flawed (slight halo, a screenshot is partially loaded). 0 = opaque/uncut image,
      blank/black frames, or the wrong page.

  - id: contract-path-fidelity
    weight: 0.20
    jtbd_source: JTBD-3
    judge_prompt: |
      Read where the outputs landed. Score 0-10 on honoring the artifact-path map so hf-build
      finds the assets by stable path: cutouts at artifacts/<project>/assets/cutouts/<name>.png,
      captures at artifacts/<project>/assets/captures/<slug>/ (with screenshots/ + extracted/),
      using the runtime <project>/<name>/<slug> tokens — never a hardcoded real project name and
      never outside assets/. 10 = every output exactly on the map. 5 = right area, wrong
      sub-path or naming. 0 = written elsewhere or with a hardcoded name.

  - id: failure-honesty
    weight: 0.15
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read how missing/unreachable inputs were handled. Score 0-10 on honest, headless failure:
      a missing/unreadable source image or an unreachable ai-gen proxy / capture URL is recorded
      in state.md and stops cleanly WITHOUT prompting the user and WITHOUT fabricating or
      substituting an asset; the message names the missing/blocking input. Keyless-only is
      respected (ai-gen proxy + local Chrome; no HeyGen cloud/lambda/auth). 10 = clean recorded
      failure, no fabrication, no prompt. 5 = stops but the message is vague or state.md not
      updated. 0 = invents an asset, silently substitutes, or asks the user a question.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-assets/evals/rubric.md
    - bot/skills/hf-assets/scripts/bg-remove.sh
    - bot/skills/hf-assets/scripts/capture.sh
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- ai-gen is ABSENT on host/dev and present only in the sl8-animation sandbox — the bg-remove path can only
  be graded in-sandbox. On host, grade the capture path; treat the cutout media-judge leniently when ai-gen
  is unreachable (the script correctly errors out — that is the right behavior, not a quality miss).
- capture.sh is PROVEN on host: `hyperframes capture "<url>" -o <tmp> --json` → it copies
  screenshots/{scroll-*.png,contact-sheet.jpg} + extracted/{tokens,design-styles,fonts-manifest,visible-text,page} +
  any assets/ into assets/captures/<slug>/. Keep the temp-dir-then-copy shape (don't capture straight into
  artifacts/ — the capture project dir carries extra scaffold we don't want).
- bg-remove.sh / capture.sh parse JSON with node (files[0].local_path / projectDir) and fail on
  success:false / ok:false — never loosen that into a glob-the-newest-file guess.
