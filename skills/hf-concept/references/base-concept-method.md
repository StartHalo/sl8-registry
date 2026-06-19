# Base Concept Method — the 6-dimension visual contract

> The full method behind `hf-concept`. Cited by the SKILL.md body, **not** auto-loaded — read it when you
> need the depth (what each dimension is for, how to make it specific, the anti-patterns to avoid). The
> base concept is the **mandatory** first creative artifact: a 100-plus-word brief that fixes the look of
> the whole video before any script, storyboard, or HTML exists. Every later phase reads
> `01-concept.md` and themes to it; the project rubric grades brand application *against this document*.

## Why a base concept (and why before everything else)

A motion-graphics video reads as **designed** — deliberate typography, a coherent palette, motion with
rhythm, legible text in the safe zone, a clear focal hierarchy — or it reads as **auto-generated** —
centered single elements, one easing, no hierarchy, an invented gradient. The difference is decided
*before* the first scene is built, in the creative direction. Fixing that direction once, in writing,
gives the script, storyboard, and build a single source of visual truth so the whole video is coherent
rather than re-decided scene by scene. It is also the anchor the rubric grades against: "is the rendered
frame on-brand?" only has meaning relative to a written palette + typography.

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
Name the layout system and *why* it fits the subject. Common systems for short motion-graphics video:

- **Centered hero** — one focal element, generous negative space. Good for a single statement / teaser.
- **Edge-anchored metadata grid** — title/figure centered, small labels pinned to safe-zone corners.
  Good for technical / editorial density without clutter.
- **Split-screen** — two zones (e.g. claim vs. proof). Good for compare/contrast.
- **Left-rail + content** — a persistent rail (captions, chapter, logo) beside the main canvas. Good for
  caption-led social cuts.
- **Full-bleed data canvas** — the chart/figure owns the frame, labels orbit it. Good for data-viz.

Then state the **read order**: which element is the 1st read (largest/boldest), 2nd, 3rd — size, weight,
and color carry the hierarchy. Note the **safe zone**: keep text and key figures inside ~90% of the frame
(more margin for 9:16) so nothing clips, and remember a 16:9 layout cropped to 9:16 must not lose the
headline. If multiple aspect ratios are requested, the composition must survive the crop.

### 3. Style / aesthetic — the design direction + movement reference
Two or three phrases that pin the visual world and the *energy* of the motion. Examples:

- "Swiss-grid editorial, warm paper grain, restrained, slow drifts."
- "Dark technical HUD, hairline rules, sharp slams, quick cuts."
- "Soft fintech, generous whitespace, confident counts, gentle springs."

The style implies the motion menu (see `hf-build`'s `motion-rules.md`): a restrained editorial style uses
long holds and eased drifts; a kinetic style uses slams, staggers, and faster transitions. State the
reference so the build phase picks coherent motion.

### 4. Color palette — 2–4 colors + a neutral, every one a hex
Pick a small, **locked** palette and give each color a hex value and a one-line job:

```
Background  #0E1116  — deep near-black, lets the accent glow
Accent      #5B8CFF  — the brand blue, reserved for the focal element / key metric
Secondary   #9AE6B4  — supportive mint, for positive deltas / secondary labels
Text        #F5F6F8  — near-white body, AA-contrast on the background
```

Rules: never invent a color mid-video; reserve the accent for the focal element so it stays meaningful;
ensure text-on-background passes a legibility (WCAG-ish) contrast check at the rendered size. Prefer
**radial** gradients over linear on dark backgrounds — H.264 bands smooth linear gradients into visible
steps. If the brand kit in `context.md` supplies an accent, use it verbatim; otherwise default to the
neutral kit above and record that under "Defaults applied."

### 5. Typography — display + text face from the wired set
Only five faces are present at render time (fontconfig + the template's `@font-face`):

| face | character | typical role |
|---|---|---|
| **Inter** | neutral, highly legible UI/text | body / captions / labels (the default text face) |
| **Outfit** | geometric, friendly display | headlines, premium-but-approachable display (default display) |
| **Anton** | ultra-bold condensed | high-impact slams, big single words, bold/news energy |
| **Fraunces** | warm display serif | editorial / magazine headlines, refined |
| **Space Grotesk** | technical grotesque | tech/HUD headlines + labels, modern |

Pair **one display + one text** face, name the weights, and state the size hierarchy (e.g. headline 96px,
sub 40px, label 24px — actual px set later, but the hierarchy is fixed here). Put
`font-variant-numeric: tabular-nums` on any number that counts or sits in a column so digits don't jitter.
**Never** name a Google-CDN font or a face outside the five — it will not render.

### 6. Mood / atmosphere — tone + pacing energy → motion
State the emotional tone and the pacing energy, and connect it to motion:

- **calm** → gentle eases (`power2.out`), long holds, slow drifts, soft cross-fades.
- **dramatic** → big scale-ins, held beats, a hard transition (flash/iris), low cuts.
- **upbeat** → springy eases, quick staggers, frequent transitions, bright accent use.
- **technical** → snappy `expo.out` slams, hairline UI, precise counts, clipped wipes.

This tells `hf-build` how to set entrance offsets, ease variety, and transition choice.

## Worked example (full concept, ~150 words)

```markdown
# Base Concept — api-rate-limit-teaser

## Subject
A 15-second launch teaser for our API rate-limiting feature, aimed at backend developers evaluating our
platform. One takeaway: "rate limits you never have to think about." No pricing, no roadmap.

## Composition
Centered hero with an edge-anchored metadata grid — the claim sits center-frame, small endpoint labels
pin to the safe-zone corners. Read order: headline (1st), the latency stat (2nd), the CTA chip (3rd).
Authored 16:9; safe zone 90%, headline survives a 9:16 crop.

## Style / Aesthetic
Dark technical HUD: hairline rules, a faint grid, sharp slams and quick cuts. Reference: a developer
dashboard at night.

## Color Palette
- Background `#0E1116` — deep near-black, lets the accent glow.
- Accent `#5B8CFF` — brand blue, reserved for the headline keyword + the stat.
- Secondary `#9AE6B4` — mint, for the "−93% errors" positive delta.
- Text `#F5F6F8` — near-white body, AA contrast.

## Typography
- Display: **Space Grotesk** 700 — headline + the big stat.
- Text: **Inter** 400/600 — labels, CTA, endpoint chips.
- Numerics: tabular-nums on the latency counter.

## Mood / Atmosphere
Confident and kinetic. Snappy `expo.out` slams on entrance, a single hard wipe between the claim and the
stat, no idle holds. Energy reads "fast, in control."

## Defaults applied
Aspect ratio 16:9 from context.md; palette/fonts from the brand kit (none defaulted).
```

## Anti-patterns (the rubric penalizes these)

- **Generic subject** — "a promo video" with no audience or takeaway.
- **A menu instead of a decision** — "blue or green; serif or sans" rather than a resolved choice.
- **Palette without hex** — color names ("dark blue") with no hex; or inventing colors not in the kit.
- **Off-set fonts** — naming a Google font / a face outside the wired five (won't render), or no face named.
- **No focal hierarchy** — every element the same size/weight (the "centered single element, one fade" trap).
- **Mood with no motion implication** — an adjective that doesn't tell the build how to animate.
- **Inventing facts** — putting specific numbers/quotes in the concept; facts belong to `hf-script`, the
  concept fixes only the *look*. On a restyle, never change the message — only the look.

## Handoff

`01-concept.md` is read by:
- `hf-script` — keeps the message on-tone with the subject + mood.
- `hf-storyboard` — picks blocks/transitions matching the style + composition.
- `hf-build` — themes the composition's `:root` palette + fonts to this concept, exactly.

If any of those phases would have to invent a color or font, the concept was underspecified — go back and
make it concrete.
