---
skill: hf-concept
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-concept is a STRUCTURAL/authoring skill (it produces 01-concept.md prose, not pixels).
# All dimensions read the concept document; weights sum to 1.00. There is NO media-judge dimension
# here — the rendered-frame look is graded downstream by hf-render's media-judge rubric. The concept
# is the anchor that downstream rubric grades brand application against.
dimensions:
  - id: dimensional-completeness
    weight: 0.35
    jtbd_source: JTBD-1
    judge_prompt: |
      Read artifacts/<project>/01-concept.md. Score 0-10 on the base-concept being structurally
      complete: ALL 6 dimensions are present and labelled (Subject, Composition, Style/Aesthetic,
      Color Palette, Typography, Mood/Atmosphere); the six sections together total at least 100
      words; the Color Palette lists 2-4 colors plus a neutral, each with a VALID hex code and a
      one-line rationale; the Typography names a display face AND a text face drawn ONLY from the
      wired set (Inter, Outfit, Anton, Fraunces, Space Grotesk) with no CDN/Google font.
      10 = all six present, 100+ words, hex palette, wired-set fonts. 5 = one dimension thin/missing,
      or a palette color without a hex, or fewer than 100 words. 0 = several dimensions absent or
      no palette/typography specified.

  - id: subject-specificity
    weight: 0.25
    jtbd_source: JTBD-1
    judge_prompt: |
      Read the Subject (and the concept as a whole). Score 0-10 on how SPECIFIC and decisive it is:
      the Subject names the audience and a single takeaway (not "a promo"); choices everywhere are
      RESOLVED, not offered as a menu ("blue or green"); the composition is a NAMED system with a
      stated focal hierarchy. 10 = a concrete subject (audience + takeaway) and resolved, named
      choices throughout. 5 = a subject that gestures at specifics but leaves the audience or takeaway
      vague, or offers some choices as menus. 0 = a generic subject and undecided/menu choices.

  - id: coherence
    weight: 0.25
    jtbd_source: JTBD-1
    judge_prompt: |
      Read the whole concept. Score 0-10 on COHERENCE: do the six dimensions reinforce ONE direction
      — does the style imply the palette, do the typography and mood match the style, does the mood map
      to a motion implication (eases/holds/transitions) rather than being a bare adjective, does the
      composition suit the subject? 10 = a single, self-consistent creative direction where every
      dimension supports the others and the mood states a motion consequence. 5 = mostly consistent but
      one dimension pulls against the rest (e.g. a calm mood with a frantic style) or the mood has no
      motion implication. 0 = an incoherent grab-bag of unrelated choices.

  - id: fidelity-and-defaults
    weight: 0.15
    jtbd_source: JTBD-4
    judge_prompt: |
      Score 0-10 on discipline. The concept fixes the LOOK only — it must NOT invent specific facts,
      numbers, or quotes (those belong to hf-script); it must NOT name a color or font outside the
      resolved brand kit / wired set. Any value defaulted because context.md was thin (palette, fonts,
      aspect ratio, mood) is listed under "Defaults applied" and stated back. For a restyle request,
      the Subject/message is unchanged while the look shifts. 10 = no invented facts, defaults declared,
      look-only. 5 = a stray invented number, or a default applied but not declared. 0 = invented
      facts/quotes, an off-set font/color, or a restyle that changed the message.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-concept/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- hf-concept writes prose only — there is no render here, so no media-judge dimension. Grade the
  document, not pixels. The downstream rubric (hf-render) grades whether the rendered frames honor THIS
  concept, so the most valuable improvement is making the concept concrete (hex palette, wired-set fonts,
  named composition) and coherent.
- The most common failures the authoring model hits: (1) a generic Subject with no audience/takeaway;
  (2) a palette with color names but no hex; (3) naming a font outside the wired set (Inter, Outfit,
  Anton, Fraunces, Space Grotesk); (4) inventing specific numbers/facts that belong to hf-script;
  (5) forgetting to declare defaults when context.md was thin.
- The 6 dimensions and the anti-patterns live in references/base-concept-method.md — fix specificity and
  coherence guidance there first if the concept reads generic.
