---
name: rm-concept
description: "Write the mandatory BASE CONCEPT for a Remotion/React motion-graphics video — a 100-plus-word visual contract across 6 dimensions (subject, composition, style, color palette with hex, typography, mood). Reads the project context.md (brief + brand kit) and fixes the look every later phase themes to. Use at the CONCEPT phase (phase 1) of a Remotion Studio project, before any script, storyboard, or React composition is authored, or when restarting a project's creative direction. Produces 01-concept.md, the anchor the rubric grades brand application against. No rendering, no code."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: []
  inputs:
    - name: context
      type: markdown
      required: true
      description: "artifacts/[project]/context.md — the project brief plus brand kit (accent hex, font pack, label) and defaults (aspect ratio, voice) written by onboarding."
    - name: brief
      type: text
      required: false
      description: "An inline brief, topic, or one-line description in the request. Used to sharpen the Subject when context.md is thin. Default = whatever context.md already carries."
  outputs:
    - name: concept
      type: markdown
      path: artifacts/<project>/01-concept.md
      description: "The base concept — 100-plus words across the 6 dimensions (subject, composition, style, color palette with hex, typography, mood); the visual contract every later phase reads."
---

# rm-concept — write the base concept (the visual contract)

## Purpose
Before a single line of script, storyboard, or React is written, fix the **look and feel** of the whole
video in one document: `artifacts/<project>/01-concept.md`. This is the **base concept** — a
100-plus-word brief across **6 dimensions** (subject, composition, style, color palette + hex,
typography, mood) that every later phase (`rm-script`, `rm-storyboard`, `rm-build`) reads and themes to,
and that the rubric grades brand application against. A specific, coherent concept here is the single
biggest lever on a designed-looking result; a vague one produces the generic "text fades in on a
gradient" output the rubric penalizes. This skill writes **prose only** — no React, no render.

`$SKILL` below = this skill's directory.

## When to run
- **Concept** (phase 1): the first creative step, right after `onboarding` wrote `context.md`/`state.md`,
  before `rm-script`. The default entry point for JTBD-1 (brief → narrated video), JTBD-2 (data video),
  JTBD-5 (describe any video), and JTBD-4 when a restyle wants a fresh direction. A pure JTBD-3
  caption-cut (clip in, captions out, no new look) may skip this phase.
- Do NOT use to write the narration/on-screen copy (that is `rm-script`), to plan beats and Remotion
  blocks (that is `rm-storyboard`), or to author React (that is `rm-build`). This skill writes prose,
  not code.

## Inputs (read before write)
- `artifacts/<project>/context.md` (required) — the brief + brand kit (accent hex, font pack, label) +
  defaults (aspect ratio, voice) onboarding captured. Read it end to end first; it is project truth.
- An inline brief/topic in the request (optional) — sharpens the Subject when `context.md` is thin.
- **Missing required input** (no `context.md`): record the failure in `state.md` and stop — do not
  invent a brand kit or a project brief. **Missing brand details** (no accent / no font pack in
  `context.md`): proceed with the neutral default kit below and SAY SO in the concept.

## The 6 dimensions (every one is mandatory)
Read `references/concept-dimensions.md` for the full method, the wired font packs, and worked examples.
In short, the concept MUST cover all six — a missing dimension is a structural failure:

1. **Subject** — what this video is about, *specifically*. Not "a promo" but "a 15 s launch teaser for an
   API rate-limiting feature, aimed at backend developers." Name the audience and the one takeaway.
2. **Composition** — the layout system and why: edge-anchored metadata grid, centered hero, split-screen,
   left-rail + content, full-bleed data canvas. State the focal hierarchy (1st / 2nd / 3rd read) and the
   `<SafeZone>` discipline for the target aspect ratio(s). Each AR is a **separate `<Composition>`**
   (`Video-16x9` / `-9x16` / `-1x1`), not a crop — so if multiple ARs are requested, the composition must
   survive each one's safe margins.
3. **Style / aesthetic** — the design direction and motion reference: e.g. "Swiss-grid editorial, warm
   paper grain, restrained, slow eased drifts" or "dark technical HUD, hairline rules, sharp slams." This
   drives the motion energy `rm-storyboard`/`rm-build` pick (springs vs. slams).
4. **Color palette** — **2–4 colors + a neutral, each with a hex value** and a one-line rationale
   (background, accent, secondary, text). Palette-locked: these are the only colors the video may use.
   Colors are passed straight through Zod (`z.string`) into the composition, so any valid hex is legal —
   but reserve the accent for the focal element so it stays meaningful. Prefer **radial** over **linear**
   gradients on dark backgrounds (linear bands visibly under H.264).
5. **Typography** — name a **FONT PACK** from the wired set (`modern` / `editorial` / `bold` / `tech`) —
   the render lever is `props.fontPack`, default `modern` — **or** name faces drawn only from the nine
   wired faces (Inter, Fraunces, Oswald, Manrope, Playfair Display, Anton, Bebas Neue, Space Grotesk, DM
   Serif Display). Each pack is a `{body, display, condensed}` triple loaded at module top level in
   `engine/fonts.ts`. State the size hierarchy and put `tabular-nums` on any number that counts or sits in
   a column (the `Counter` primitive). **Never** name a CDN/Google font outside the wired nine — it is not
   loaded, so it falls back / triggers a render-time network storm.
6. **Mood / atmosphere** — the emotional tone and pacing energy (calm / dramatic / upbeat / technical),
   and how that maps to motion (gentle springs + long holds vs. snappy slams + quick `<TransitionSeries>`
   cuts). Frame-driven only — the mood must imply a *motion* consequence the build can act on.

## Instructions

### 1. Read the brief + brand kit
Read `artifacts/<project>/context.md` end to end: the brief/topic, the brand kit (accent hex, secondary,
label, font pack), and the defaults (aspect ratio, voice). Fold in any inline brief from the current
request. If `context.md` is missing, stop and record it in `state.md` (do not fabricate a brief).

### 2. Resolve the brand kit (defaults when thin)
- **Colors**: use the brand-kit hex from `context.md`. If absent, default to a neutral kit — background
  `#0E1116`, text `#F5F6F8`, single accent `#5B8CFF` — and note that it was defaulted.
- **Typography**: use the brand font pack from `context.md`. If absent, default to the **`modern`** pack
  (Inter body / Fraunces display / Oswald condensed) and note it. Only ever name a wired pack or a face
  from the wired nine; never a CDN font.
- **Aspect ratio / mood**: take the AR from `context.md` (else 16:9 → the `Video-16x9` composition) and
  let the brief imply the mood. Whatever you default, say so in the concept and in your reply.

### 3. Write the concept (100+ words, all 6 dimensions)
Write `artifacts/<project>/01-concept.md` with the structure below — one short labelled section per
dimension. Be **concrete and decisive**: real hex values, a real pack/face name, a named composition
system, a specific audience. Resolve choices (don't offer menus). The body across the six sections must
total **at least 100 words**. The palette section MUST contain valid hex codes; the typography section
MUST name a wired pack or wired faces. Keep the language design-literate but jargon-light (beats,
palettes, easing — not buzzwords).

```markdown
# Base Concept — <project>

## Subject
<what the video is about, the audience, the single takeaway — specific>

## Composition
<layout system + focal hierarchy + <SafeZone> note for the target AR(s); each AR is its own composition>

## Style / Aesthetic
<design direction + motion reference>

## Color Palette
- Background `#0E1116` — <rationale>
- Accent `#5B8CFF` — <rationale>
- Secondary `#9AE6B4` — <rationale>
- Text `#F5F6F8` — <rationale>

## Typography
- Font pack: **modern** (Inter body / Fraunces display / Oswald condensed) — or name wired faces + roles
- Hierarchy: hero / headline / dek / beat / meta (sizes set later in the engine type scale)
- Numerics: tabular-nums on any counters/columns

## Mood / Atmosphere
<emotional tone + pacing energy + how it maps to frame-driven motion>

## Defaults applied
<list any value that was defaulted because context.md was thin (palette, font pack, AR, mood)>
```

### 4. Self-check, then state the concept back
Run `bash $SKILL/scripts/check-concept.sh artifacts/<project>/01-concept.md` to confirm the structural
gates (file exists, all 6 sections present, ≥100 words, a hex palette, a wired pack/face) before you
report. In your reply, summarise the resolved direction in one or two sentences (subject, palette accent,
font pack, mood) and flag any defaults you applied so the user can redirect before scripting. Mark
`state.md` phase 1 done, and remember.

## Outputs
- `artifacts/<project>/01-concept.md` — the base concept: 100-plus words across the 6 dimensions
  (subject, composition, style, color palette with hex, typography, mood) plus a "Defaults applied" note.
  This is the visual contract `rm-script`, `rm-storyboard`, and `rm-build` all read and theme to. No
  other file is written; nothing is rendered.

## Examples

### Example 1: API-feature launch teaser (JTBD-1)
Request: "15 s teaser for our API rate-limit feature, for backend devs." Read `context.md` (brand accent
`#5B8CFF`). Write `01-concept.md`: Subject = a 15 s developer-facing teaser whose takeaway is "rate
limits you don't have to think about"; Composition = centered hero with an edge-anchored metadata grid,
authored for `Video-16x9` with a `<SafeZone>`; Style = dark technical HUD, sharp; Palette = `#0E1116` /
`#5B8CFF` / `#9AE6B4` / `#F5F6F8`; Typography = `tech` pack (Space Grotesk / DM Serif Display / Oswald),
tabular-nums on the latency stat; Mood = confident, kinetic, snappy springs. ~140 words.

### Example 2: quarterly-revenue data video (JTBD-2)
Request: "turn this revenue CSV into a growth-story video." Subject = a founder's quarterly-growth story
for investors; Composition = full-bleed data canvas, one figure focal at a time; Style = clean editorial
fintech; Palette includes an accent reserved for the growth metric; Typography = `editorial` pack
(Manrope / Playfair Display / Oswald) with tabular-nums (numbers will count). Note that the actual figures
come later (script/storyboard) — the concept fixes the *look*, not the data.

### Example 3: restyle direction (JTBD-4)
Request: "darker, bolder version." Re-read the existing `01-concept.md`, write an updated concept that
shifts the palette darker and swaps to the `bold` pack (Anton display / Bebas Neue condensed), keeps the
Subject and audience unchanged, and records the change under "Defaults applied" / a dated note. Facts are
not set here — only the look — so a restyle concept never alters the message.

## Failure / fallback
- **`context.md` missing** → do not invent a brief or brand kit; record the blocker in `state.md` and ask
  onboarding to run. This skill cannot proceed without project truth.
- **No brand colors/font pack in `context.md`** → apply the neutral default kit (background `#0E1116`,
  text `#F5F6F8`, accent `#5B8CFF`; `modern` pack) and list it under "Defaults applied" — never leave the
  palette/typography unspecified.
- **Concept reads generic** → make the Subject more specific (audience + one takeaway), commit to a named
  composition system, and give every palette color a rationale. See `references/concept-dimensions.md`
  for the anti-patterns the rubric penalizes (centered single-element + one fade, menu of options,
  invented brand colors, off-set fonts).
- **`check-concept.sh` reports FAIL** → fix the flagged gate (add the missing section, reach 100 words,
  add a hex, name a wired pack) and re-run before reporting phase 1 done.

## Quality Criteria
- [ ] `01-concept.md` exists at `artifacts/<project>/01-concept.md` and the six dimension sections
      together total **≥100 words**.
- [ ] All **6 dimensions** are present and labelled (subject, composition, style, color, typography, mood).
- [ ] The **color palette lists valid hex codes** (2–4 + neutral) with a rationale each.
- [ ] **Typography names a wired pack** (`modern` / `editorial` / `bold` / `tech`) or faces from the wired
      nine — no CDN/Google font outside `engine/fonts.ts`.
- [ ] The Subject is **specific** (audience + one takeaway), and choices are resolved (not a menu).
- [ ] Any defaulted value (palette, font pack, AR, mood) is listed under "Defaults applied" and stated
      back to the user.
