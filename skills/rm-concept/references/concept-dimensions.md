# Concept Dimensions — the 6-dimension visual contract

> The full method behind `rm-concept`. Cited by the SKILL.md body, **not** auto-loaded — read it when you
> need the depth (what each dimension is for, how to make it specific, the anti-patterns to avoid). The
> base concept is the **mandatory** first creative artifact: a 100-plus-word brief that fixes the look of
> the whole video before any script, storyboard, or React exists. Every later phase reads
> `01-concept.md` and themes to it; the project rubric grades brand application *against this document*.

## Why a base concept (and why before everything else)

A motion-graphics video reads as **designed** — deliberate typography, a coherent palette, motion with
rhythm, legible text in the safe zone, a clear focal hierarchy — or it reads as **auto-generated** —
centered single elements, one easing, no hierarchy, an invented gradient. The difference is decided
*before* the first scene is built, in the creative direction. Fixing that direction once, in writing,
gives the script, storyboard, and build a single source of visual truth so the whole video is coherent
rather than re-decided scene by scene. It is also the anchor the rubric grades against: "is the rendered
frame on-brand?" only has meaning relative to a written palette + typography.

This is a **prose** artifact. The concept fixes the *look*, never the *facts* (facts belong to
`rm-script`) and never the *code* (React belongs to `rm-build`).

## The 6 dimensions in depth

### 1. Subject — be specific, name the takeaway
State exactly what the video is about, **who it is for**, and the **one thing** the viewer should leave
with. Replace category words with specifics:

- Weak: "a product promo."
- Strong: "a 15-second launch teaser for an API rate-limiting feature, aimed at backend developers, whose
  one takeaway is 'rate limits you never have to think about.'"

A specific subject constrains every later choice (which beats, which composition, which energy). A vague
subject is the root cause of generic output.

### 2. Composition — the layout system + the focal hierarchy
Name the layout system and *why* it fits the subject. Common systems for a short motion-graphics video:

- **Centered hero** — one focal element, generous negative space. Good for a single statement / teaser.
- **Edge-anchored metadata grid** — title/figure centered, small labels pinned to safe-zone corners.
  Good for technical / editorial density without clutter.
- **Split-screen** — two zones (e.g. claim vs. proof). Good for compare/contrast.
- **Left-rail + content** — a persistent rail (captions, chapter, logo) beside the main canvas. Good for
  caption-led social cuts (JTBD-3).
- **Full-bleed data canvas** — the chart/figure owns the frame, labels orbit it. Good for data-viz (JTBD-2).

Then state the **read order**: which element is the 1st read (largest/boldest), 2nd, 3rd — size, weight,
and color carry the hierarchy. Note the **safe zone**: all content lives inside `<SafeZone>` (the engine
primitive applies AR-aware margins — more margin on 9:16). In Remotion Studio **each aspect ratio is a
separate `<Composition>`** — `Video-16x9`, `Video-9x16`, `Video-1x1` — not a crop of one master. So if
multiple ARs are requested, the composition must read well in **each** one's safe margins; a 16:9 layout
is re-laid-out for 9:16, never letterboxed. A different orientation routes back to `rm-build`.

### 3. Style / aesthetic — the design direction + motion reference
Two or three phrases that pin the visual world and the *energy* of the motion. Examples:

- "Swiss-grid editorial, warm paper grain, restrained, slow eased drifts."
- "Dark technical HUD, hairline rules, sharp slams, quick cuts."
- "Soft fintech, generous whitespace, confident counts, gentle springs."

The style implies the motion menu the build picks: a restrained editorial style uses long holds and eased
drifts (`interpolate` with a gentle curve); a kinetic style uses `spring()` slams, staggers, and faster
`<TransitionSeries>` cuts. All motion is **frame-driven** (`useCurrentFrame` / `interpolate` / `spring`) —
never CSS `transition`/`@keyframes`. State the reference so the build phase picks coherent motion.

### 4. Color palette — 2–4 colors + a neutral, every one a hex
Pick a small, **locked** palette and give each color a hex value and a one-line job:

```
Background  #0E1116  — deep near-black, lets the accent glow
Accent      #5B8CFF  — the brand blue, reserved for the focal element / key metric
Secondary   #9AE6B4  — supportive mint, for positive deltas / secondary labels
Text        #F5F6F8  — near-white body, AA-contrast on the background
```

Rules: never invent a color mid-video; reserve the accent for the focal element so it stays meaningful;
ensure text-on-background passes a legibility (WCAG-ish) contrast check at the rendered size. Colors flow
straight through the Zod props schema — it uses plain `z.string()` for colors (NOT a constrained color
type), so any valid hex string is legal; the *discipline* is yours to impose here, not the schema's.
Prefer **radial** gradients over linear on dark backgrounds — H.264 bands smooth linear gradients into
visible steps. If the brand kit in `context.md` supplies an accent, use it verbatim; otherwise default to
the neutral kit above and record that under "Defaults applied."

### 5. Typography — a wired font pack (or wired faces)
Fonts are loaded once at **module top level** in `engine/fonts.ts` via `@remotion/google-fonts` with
explicit `weights`/`subsets` (so render is deterministic and never triggers the 63–126-request network
storm a default `loadFont()` causes). Nine faces are wired and render-ready; they are grouped into four
**FONT PACKS**, each a `{body, display, condensed}` triple. The render lever is `props.fontPack`
(default `modern`); naming a pack is the cleanest contract for `rm-build`.

| pack | body | display | condensed | personality |
|---|---|---|---|---|
| **modern** (default) | Inter | Fraunces | Oswald | clean grotesque + premium serif + broadcast condensed |
| **editorial** | Manrope | Playfair Display | Oswald | refined magazine, high-contrast serif |
| **bold** | Inter | Anton | Bebas Neue | high-impact, heavy display + tall caps |
| **tech** | Space Grotesk | DM Serif Display | Oswald | modern/techy with a dramatic serif accent |

The three **roles** (read via `useStyleConfig().font`, never a hardcoded family):

| role | character | typical use |
|---|---|---|
| **body** | a readable sans | UI / labels / credits / captions |
| **display** | a characterful headline face | headlines, hero lines |
| **condensed** | a tall/condensed caps face | big-impact single words, slams, breaking-news energy |

Name a pack (e.g. "Font pack: `tech`") **or** name specific wired faces with their role (e.g. "display:
Anton, body: Inter"). State the size hierarchy using the engine's type-scale keys (`hero`, `headline`,
`dek`, `beat`, `meta`, `kicker`, `stat`) — actual px are derived later by `sizeFor(shortEdge, key)` so
they stay legible across 16:9 / 9:16 / 1:1. Put `tabular-nums` on any number that counts or sits in a
column (the `Counter` primitive) so digits don't jitter. **Never** name a face outside the wired nine or
an arbitrary CDN font — it is not loaded and will fall back / storm the network at render.

### 6. Mood / atmosphere — tone + pacing energy → motion
State the emotional tone and the pacing energy, and connect it to **frame-driven** motion:

- **calm** → gentle `interpolate` eases, long holds, slow drifts, soft cross-fades (`<TransitionSeries>` fade).
- **dramatic** → big `spring()` scale-ins, held beats, a hard transition (flash/wipe), low cuts.
- **upbeat** → springy entrances, quick staggers (`STAGGER` frames), frequent transitions, bright accent.
- **technical** → snappy entrances, hairline UI, precise counts, clipped wipes.

This tells `rm-storyboard`/`rm-build` how to set entrance offsets, spring damping, ease variety, and
transition choice. A mood with no motion implication (a bare adjective) is a coherence failure.

## Worked example (full concept, ~150 words)

```markdown
# Base Concept — api-rate-limit-teaser

## Subject
A 15-second launch teaser for our API rate-limiting feature, aimed at backend developers evaluating our
platform. One takeaway: "rate limits you never have to think about." No pricing, no roadmap.

## Composition
Centered hero with an edge-anchored metadata grid — the claim sits center-frame inside `<SafeZone>`, small
endpoint labels pin to the safe-zone corners. Read order: headline (1st), the latency stat (2nd), the CTA
chip (3rd). Authored for `Video-16x9`; if a 9:16 cut is needed it is re-laid-out as its own composition,
headline kept above the fold.

## Style / Aesthetic
Dark technical HUD: hairline rules, a faint grid, sharp spring slams and quick cuts. Reference: a
developer dashboard at night.

## Color Palette
- Background `#0E1116` — deep near-black, lets the accent glow.
- Accent `#5B8CFF` — brand blue, reserved for the headline keyword + the stat.
- Secondary `#9AE6B4` — mint, for the "−93% errors" positive delta.
- Text `#F5F6F8` — near-white body, AA contrast.

## Typography
- Font pack: **tech** (Space Grotesk body / DM Serif Display display / Oswald condensed).
- Hierarchy: `hero` headline + a `stat` counter; `kicker` for the endpoint labels.
- Numerics: tabular-nums on the latency counter.

## Mood / Atmosphere
Confident and kinetic. Snappy `spring()` slams on entrance, a single hard wipe between the claim and the
stat, no idle holds. Energy reads "fast, in control."

## Defaults applied
Aspect ratio 16:9 (Video-16x9) from context.md; palette/font pack from the brand kit (none defaulted).
```

## Anti-patterns (the rubric penalizes these)

- **Generic subject** — "a promo video" with no audience or takeaway.
- **A menu instead of a decision** — "blue or green; serif or sans" rather than a resolved choice.
- **Palette without hex** — color names ("dark blue") with no hex; or inventing colors not in the kit.
- **Off-set fonts** — naming a CDN/Google font or a face outside the wired nine (won't load), or naming no
  pack/face at all.
- **No focal hierarchy** — every element the same size/weight (the "centered single element, one fade" trap).
- **Mood with no motion implication** — an adjective that doesn't tell the build how to animate.
- **One-master-cropped-to-all-ARs** — treating 9:16 as a crop of 16:9 instead of its own `<Composition>`.
- **Inventing facts** — putting specific numbers/quotes in the concept; facts belong to `rm-script`, the
  concept fixes only the *look*. On a restyle, never change the message — only the look.

## Handoff

`01-concept.md` is read by:
- `rm-script` — keeps the message on-tone with the subject + mood.
- `rm-storyboard` — picks Remotion blocks/transitions matching the style + composition.
- `rm-build` — themes the composition's palette + `props.fontPack` to this concept, exactly.

If any of those phases would have to invent a color or font, the concept was underspecified — go back and
make it concrete.
