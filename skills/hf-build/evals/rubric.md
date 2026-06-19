---
skill: hf-build
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-build is a STRUCTURAL/authoring skill (it produces the composition project, not pixels).
# All dimensions read the composition source + lint output; weights sum to 1.00. The rendered-frame
# quality is graded downstream by hf-render's media-judge rubric.
dimensions:
  - id: lint-cleanliness
    weight: 0.30
    jtbd_source: JTBD-1
    judge_prompt: |
      Run/read `hyperframes lint` on artifacts/<project>/composition/. Score 0-10 on the
      composition being a clean, renderable HyperFrames project. 10 = 0 errors (a single
      benign gsap_studio_edit_blocked warning is fine); index.html present; project
      scaffolded from the bundled template (vendored assets/gsap.min.js + assets/fonts.css
      present). 5 = lints with a couple of easily-fixed errors. 0 = many errors, missing
      root, or the project does not lint at all.

  - id: contract-compliance
    weight: 0.35
    jtbd_source: JTBD-1
    judge_prompt: |
      Read index.html (and any compositions/*.html). Score 0-10 on the composition
      contract (references/composition-contract.md): explicitly-sized root with
      data-composition-id + data-width/height/duration; exactly ONE paused gsap.timeline
      registered on window.__timelines, built synchronously; every timed element has
      class="clip" + data-start/data-duration/data-track-index with no same-track overlap
      or shared boundary; GSAP is vendored locally (no CDN URL); font-family uses literal
      family names (not var()); animates opacity/transforms only; NO Math.random/Date.now/
      performance.now/repeat:-1; no tag tokens inside HTML comments.
      10 = every rule honored. 5 = mostly honored with one or two violations (e.g. a CDN
      GSAP, a var() font-family, a missing clip class). 0 = the contract is broadly ignored
      (non-deterministic, layout-prop animation, no registered timeline).

  - id: motion-design-intent
    weight: 0.20
    jtbd_source: JTBD-1
    judge_prompt: |
      Read the master timeline. Score 0-10 on motion craft as authored (not rendered):
      layout-before-animation (gsap.from entrances toward CSS end-state); the first tween
      offset 0.1-0.3s; at least 3 DISTINCT eases across the scenes; an entrance on every
      element; exits only on the final scene; at least one real scene transition on its own
      track index (wipe/flash/iris/push), not just cross-fades.
      10 = varied, designed motion with a transition. 5 = entrances present but uniform
      easing or only fades between scenes. 0 = everything fades in with one ease, no transition.

  - id: fidelity-and-theming
    weight: 0.15
    jtbd_source: JTBD-4
    judge_prompt: |
      Compare the composition's on-screen text + numbers against 03-storyboard.md/02-script.md,
      and its palette/typography against 01-concept.md. Score 0-10: on-screen text is taken
      verbatim from the storyboard (no invented facts/numbers; for data-viz the displayed
      figures equal the input data exactly); the palette hex and display/text fonts match the
      base concept. For a restyle, facts are byte-identical to the prior version while the look
      changed. 10 = faithful + on-brand. 5 = faithful but generic theming (concept palette/fonts
      not applied). 0 = invented text/numbers, or a restyle that changed the facts.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-build/evals/rubric.md
    - bot/skills/hf-build/scripts/hf-template/assets/gsap.min.js
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- The bundled template is already lint-clean (0 errors, 1 benign warning) and host-render + vision
  verified — improvements should preserve that baseline. If you touch hf-template/index.html, re-lint
  and re-render before committing.
- Three lint traps the authoring model hits most: (1) `var()` in `font-family` → use literal names;
  (2) shared clip boundaries flagged as overlap → gap durations (e.g. 5.97 for a 6 s slot);
  (3) a tag token inside an HTML comment breaks root detection → rephrase comments without `<...>`.
- Determinism + on-brand theming propagate from the template's `:root` tokens — fix theming there first.
