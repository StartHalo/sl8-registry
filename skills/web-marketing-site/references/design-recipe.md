# Design recipe and craft bar

Read the recipe sections at the step that names them; read the craft-bar sections only where a
step defers to them. Where two lines disagree, the recipe wins. Every rule exists because a default
model output breaks it. All values are the method's defaults: a kit or brief may set others, and
the brief records the change. Restated in SL8 wording from Higgsfield's website-builder skill
(research ids in `adaptations/web-marketing-site.json`).

## Contents
- [Scope](#scope)
- [Design read and dials](#design-read-and-dials)
- [Foundation and dependencies](#foundation-and-dependencies)
- [The design brief](#the-design-brief)
- [Palette, type and shape](#palette-type-and-shape)
- [Boards](#boards)
- [Building against the boards](#building-against-the-boards)
- [Copy](#copy)
- [Bespoke CTAs](#bespoke-ctas)
- [Motion](#motion)
- [Dark mode, performance, accessibility](#dark-mode-performance-accessibility)
- [Redesign](#redesign)
- [Pre-flight: the craft-bar review](#pre-flight-the-craft-bar-review)

## Scope

In scope: a standalone branded marketing site (landing page, portfolio, product or company site,
or a redesign of one). Out of scope, said plainly with the right tool named: a product that
generates media for its own users (an app: web-generation-app), dashboards and dense product UI
(an enterprise design system), data tables (a table library), multi-step forms and wizards, code
editors, native mobile, realtime collaborative UIs. For a mixed request, apply this method only to
the marketing, about and landing surfaces. Mentioning React, a website or a UI element is not by
itself a request for a site. The finished site carries no runtime generation and no platform
branding; generating the site's own assets during the build is fine.

## Design read and dials

- **Design read**, one sentence, stated before any code: `Reading this as: <page kind> for
  <audience>, with a <vibe> language, leaning toward <aesthetic family>.` Signals: page kind, vibe
  words, references, audience, brand assets, quiet constraints (accessibility-first, public sector,
  regulated, trust-first commerce, children), which outrank taste. The audience picks the
  aesthetic.
- **Reach past the model's defaults:** purple AI gradients, a centred hero over a dark mesh, three
  equal feature cards, glass everywhere, endless micro-animation, Inter on slate-900.
- **Dials**, exact names: `DESIGN_VARIANCE` (1 symmetric to 10 artful chaos), `MOTION_INTENSITY`
  (1 static to 10 cinematic), `VISUAL_DENSITY` (1 airy gallery to 10 packed cockpit). Baseline
  8 / 6 / 4 only when nothing in the read overrides it.

  | Read signal | VARIANCE | MOTION | DENSITY |
  |---|---|---|---|
  | minimal, calm, editorial | 5-6 | 3-4 | 2-3 |
  | premium consumer, luxury | 7-8 | 5-7 | 3-4 |
  | playful, experimental, agency | 9-10 | 8-10 | 3-4 |
  | landing, portfolio, marketing (default) | 7-9 | 6-8 | 3-5 |
  | trust-first, public sector, regulated | 3-4 | 2-3 | 4-5 |
  | redesign, preserve | as found | +1 | as found |
  | redesign, overhaul | +2 | +2 | as found |

  Presets: SaaS landing 7/6/4, agency 9/8/3, premium consumer 7/6/3, designer portfolio 8/7/3,
  developer portfolio 6/5/4, editorial 6/4/3, public service 3/2/5.
- **What the dials gate.** VARIANCE above 4: asymmetric, anti-centre layouts (a centred hero only
  for editorial, manifesto or launch briefs), collapsing to one strict column under 768 px. MOTION
  1-3: hover and active states only; 4-7: CSS transitions with staggered delays; 8-10: scroll
  choreography. DENSITY 8-10: tight padding, hairline separators instead of cards, monospaced
  numbers.

## Foundation and dependencies

- An official design-system package only when it is already on the machine; never import a
  system's tokens and override most of them. Otherwise an honestly named aesthetic built with
  native CSS, Tailwind and one maintained component set. One system per project. Never call a
  trend an official system; a glass look is a labelled approximation.
- Read `package.json` and the machine's package list before importing anything. Only permissive
  licences (MIT, Apache-2.0, BSD, Zlib, Unlicense); never a paid or proprietary component kit.
  No generators, registry fetches or CDN scripts (HR21).
- Pattern names (bento, sticky stack, marquee...) name intent; they authorise no code fetch.

## The design brief

`app/design-brief.md`, about 40 lines, every section filled with a specific line ("modern and
clean", "Inter" or "blue accent" means it is not done). It is a contract: a later step that needs a
change edits the brief first and says why.

- `Design read:` the sentence above. `Concept spine:` one nameable idea that runs through the page
  (an instrument, an archive, a stage...). `Delivery tier:` cinema (default), spectacle or
  editorial; editorial counts as the customer asking for something other than the animated site.
- `Dials:` the three values with one reason each.
- **The committed pick**, one option per category, held across every board: theme paradigm
  (pristine light; deep dark, overused, needs a twist; bold studio solid; quiet premium neutral),
  background character (technical grid, solid with soft depth, full-bleed imagery, tactile
  material), typography character (clean grotesk, refined grotesk, expressive display, compressed
  statement, editorial serif with sans, Swiss rational sans), hero architecture (cinematic centred,
  asymmetric split, scattered prints, giant type, editorial offset, image-first), section system
  (bento rhythm, alternating editorial, stacked posters, gallery cadence, Swiss grid, asymmetric
  flow), 4 signature components, 1 narrative spine, exactly 1 second-read moment (an asymmetric
  bleed, one oversized numeral as structure, one material switch, a side-rail note, a macro crop).
- `Palette:` exact hexes with a one-line defence, then `Accent: #rrggbb` on its own line (the gate
  reads it), and `Brand colours:` with any hexes the customer gave (only these may override a ban).
- `Type:` the display and body pairing, with a written brand reason for any serif.
- `Radius:` one scale. `Theme:` one page theme.
- `Section plan:` an ordered numbered list, one layout family per section, no two neighbours the
  same, at least 4 families for 6 or more sections, eyebrow budget ceil(sections / 3).
- `Asset plan:` the kit (`kit-and-cover.md`). `CTA inventory:` every CTA with its own interaction.
- `Ledger:` the six identity axes of the previous build (palette family, type pairing, hero
  architecture, Tier-1 technique, CTA garment set, corner language) and this build's, differing on
  at least 4. The animated site repeats by design: when both builds are animated, differ on the
  world and subject, journey shape and the other axes. First build: derive all six from the
  materials the business touches and say so.
- `Mobile:` how the chosen technique degrades on phones.
- `Animation mode: animated-website` or `Animation mode: non-animated; reason: <the customer's own
  words>`: exactly one such line. Calm, minimal or B2B is not a reason.
- For animated-website, the journey block (`film-and-scrub.md`): `Journey shape:`, `Journey:` with
  the chapters, the world grammar, mobile framing, the byte budgets, one sentence on how the journey
  acts out the concept spine.

## Palette, type and shape

- **Five banned default families**, unless the customer's own brand colours name them:
  (1) graphite or near-black with an orange, amber or ember accent; (2) near-black with a neon cyan,
  blue or green accent; (3) beige or cream with brass, clay or oxblood (the gate knows these hexes:
  backgrounds f5f1ea, f7f5f1, fbf8f1, efeae0, ece6db, faf7f1, e8dfcb; accents b08947, b6553a,
  9a2436, 9c6e2a, bc7c3a, 7d5621; text 1a1714, 1a1814, 1b1814); (4) purple or violet glow;
  (5) the previous build's family.
- Reach instead for: bold solid fields (bottle green, oxblood, royal blue, vermilion), chromatic
  lights (limestone, celadon, warm grey with one unexpected accent), cold luxury, forest with bone,
  black and tan, cobalt and cream, terracotta and slate, olive with brick, monochrome with one pop.
  These are examples, not a menu; forest with amber is already over-picked.
- Exactly one accent, under 80% saturation, used identically page-wide; warm or cool neutrals,
  never both; no pure #000000 or #ffffff (off-black and off-white).
- **Type.** No Inter as display unless the brief is neutral, Linear-like or public sector. No serif
  by default: "creative brief means serif" is the most tested tell. A serif needs the brand to name
  one or a genuinely editorial, luxury, publication or heritage family with a written reason
  ("heritage" never fits a young business). Fraunces and Instrument Serif are banned as defaults;
  a justified serif is not reused on consecutive builds. Emphasis inside a headline is italic or
  bold of the same family. Italic display words with descenders need `leading-[1.1]` and `pb-1`.
  Self-host fonts with `@font-face` and `font-display: swap`, never a hosted font link.
- **Shape.** One radius scale page-wide (all sharp, all 12-16 px, or all pill); a mixed system only
  with a written rule. Cards only where elevation means hierarchy; shadows tinted to the
  background, never pure black.

## Boards

One horizontal board per section (six sections, six boards; never one tall page image), 16:9 or
3:2, high quality asked for explicitly, the real planned headline in the prompt (prompt row
`section-board`). Hold the committed pick across all boards; each board takes its own composition
anchor (centred statement, top-left lead, bottom-left over image, off-grid offset, stacked centre,
image as canvas...) and background mode, with at least 3 distinct anchors; the hero never opens on
text left and image right. Each board shows a different CTA garment; a classic pill at most once.
Hero board: at most 4 text elements, one focal visual, no fake dashboards. Boards live in `refs/`,
never in `app/public/`.

Review: look at every board and ask whether it would hold up in a design studio's portfolio or reads
as a template. Generic signs: centred dark hero, glowing gradient blob, default card trio,
dashboard spam, beige serif luxury. A failing board is regenerated once with a sharper direction;
a board that fails twice means changing the category pick, not the wording.

## Building against the boards

- Open the board image again before coding its section; never from memory. Take the wording, line
  count and alignment; the size ratios between display, heading and body; the spacing logic; colour
  logic; component details (generate a closer detail image when too small); rhythm motifs.
- When habit and board disagree, the board wins. Do not simplify a distinctive section, compress
  spacing, flatten type, merge section systems or swap the palette. After each section, name one
  thing kept faithful.
- Ambiguity ladder: read the board again; check the brief; check the pick; compare the neighbours;
  generate a detail image; regenerate the board; only then take the simpler reading.
- Nav, footer, slivers of other sections and over-budget eyebrows drawn on a board are not binding.
- Page-wide: the hero fits the first viewport (headline at most 2 lines, a 4-line headline is a
  font-size error; subtext at most 20 words and 4 lines; CTAs visible; top padding at most `pt-24`;
  at most 4 text elements; a real visual; logo wall below the hero, never in it). Banned in the
  hero: tagline under the CTAs, trust strip, pricing teaser, feature bullets, avatar row, version
  labels. One layout family per section; no 3 equal columns of cards; bento has exactly as many
  cells as items with 2-3 visually different cells; no split header (big left headline, small right
  paragraph) by default; every multi-column section declares its under-768 px layout;
  `min-h-[100dvh]`, never `h-screen`; CSS Grid, not percentage flex maths; `max-w-[1400px]`;
  breakpoints 640/768/1024/1280/1536. Display scale `text-4xl md:text-6xl tracking-tighter
  leading-none` (larger only for 3-5 word headlines); body `text-base leading-relaxed max-w-[65ch]`.
- Images: generated images first, then the customer's own files, then (only after generation
  genuinely failed) a labelled empty slot listed in the report. Never stock or picsum as a final
  state; even a minimal site has 2-3 real images. Fake product UIs and diagrams are generated
  images, never div-built fakes.
- Interface states: skeletons shaped like the layout, composed empty states, inline errors, a
  tactile active state; labels above inputs, errors below, never a placeholder as label; ghost
  buttons over photos get a scrim or stroke; contrast AA everywhere, AAA as the hero target.
- SSR: no `window`, `document` or storage at module top level or during render; client-only
  leaves sit behind `ClientOnly` (copied from the skill's `scripts/client-only.tsx`) and WebGL
  leaves are also `React.lazy`. No `'use client'` directives (this is not Next.js). Preload the
  hero image in the route's `head()`. Grain only on a fixed pointer-events-none pseudo-element. A
  documented z-index scale. A marketing waitlist uses the site's own sign-up chrome.
- Glass only where the aesthetic calls for it (never public sector, dashboards or plain B2B),
  labelled in a comment as a web approximation: a 1 px inner border at about 10% white, a faint
  inset highlight, blur with saturation, and a solid fallback under
  `prefers-reduced-transparency` (support is uneven: keep contrast without the blur).

## Copy

Section headline at most 8 words with a sub at most 25 words and one visual or one CTA. No data
dumps: top 3-5 then a link; a list over 5 items needs another component (grouped tiles, pills, a
disclosure), never a ruled spec table. One copy register per page. Quotes at most 3 lines with name
and role. Zero em dashes and no en dash as a separator anywhere in the site. No section numbering
(001 · Services), no scroll cues, no version labels or footers, no pills over photos, no decorative
photo credits, no weather or city strips, no decorative status dots, no generic step labels, no
"quietly trusted by" style lines, no filler verbs (elevate, seamless, unleash, revolutionise), no
placeholder names (Jane Doe, Acme-style brands). Facts come from the brief (HR18): prices, specs,
statistics, reviews and testimonials are never invented; a fictional brand counts only when the
brief says so (HR20, recorded as a waiver). Re-read every visible string, alt text and error message
before the gate; plain beats clever.

## Bespoke CTAs

Every CTA is its own component with its own interaction, re-expressed through the brief's material
world; one label per intent page-wide; primary labels about 3 words on one line; no site-wide button
classes. Garment ideas: an arrow that travels a drawn path; a label that splits to reveal the
destination; a CTA that is a photographed object; a stamp that imprints on press; a ticket that
tears; a readout that decodes the label; a spinning badge; a waveform underline; a flipping
swatch; an oversized numeral as the hit area; a whole band that shifts grade; a viewfinder bracket
closing on the label; a switch for binary intents. For example: a hero CTA as a large underlined
text link whose line draws in; a work row whose whole band reveals a preview crop on hover; a
contact block that fills on hover with a clipped label swap; nav links with a moving hairline
instead of pills. The trio (drawing underline, hover flood fill,
framed block) is rationed to one per page and none shared with the previous build; a magnetic pill
only if nothing else on the page is a pill. Test: cover the label; could you still tell which site
the button belongs to?

## Motion

Every animation has a one-sentence reason (hierarchy, story, feedback, state). Transform and
opacity only; continuous values never in React state; no window scroll listeners in components; no
animation loops touching state; GSAP and three.js never share a component tree with another
animation library. One marquee and one signature effect per page; no endless loops on informational
sections; no custom cursors except at spectacle tier. Above MOTION 4 the page must visibly move, or
drop the dial to 3. Above MOTION 3, every effect has a reduced-motion static fallback. Nothing waits
at opacity 0 for a viewport trigger; headline builds fire on mount; a pinned hero uses
`pinSpacing: false` (or proves no blank band). Reverse scroll is a first-class path. Defaults:
ScrollTrigger `start: 'top top'`, `scrub: 1` (0.5-1); reveal 0.6 s, delay i × 0.06 s, ease
`cubic-bezier(0.16, 1, 0.3, 1)`, rise 24 px, trigger at 30% visible, once; springs stiffness 100,
damping 20. Sticky stack: pin every card but the last at top, the previous one scales to 0.92 and
fades to 0.55 as the next arrives, cleaned up on unmount, skipped under reduced motion. Horizontal
pan: distance = track width minus viewport width, pinned wrapper, scrub 1, refresh-safe.

## Dark mode, performance, accessibility

One token strategy (Tailwind `dark:` or CSS variables), `prefers-color-scheme` respected, the same
hierarchy and brand recognisability in dark, no pure black or white. Targets: LCP under 2.5 s, INP
under 200 ms (lab TBT stands in), CLS under 0.1; reserve space for images, fonts and embeds.

## Redesign

Mode first: greenfield, redesign-preserve or redesign-overhaul. Misreading the mode is the biggest
source of bad redesigns. Audit before touching: brand tokens, information architecture, content
blocks doing work, patterns to keep and to retire, the existing site's dial reading (the starting
point), the SEO baseline (meta titles, structured data, OG cards). Keep IA, slugs, anchors, nav
labels, brand colours, copy voice, analytics names; never regress accessibility. Pull levers in
order and stop at the first that satisfies the brief: typography, spacing, colour, motion, hero
recomposition, full block replacement. Never change silently: URL structure, primary nav labels,
form fields and their order, the logo, legal and consent copy.

## Pre-flight: the craft-bar review

Before the gate script, walk this list and write what you see for each line (never a bare tick):
design read stated; dials reasoned; one honest system; redesign mode and audit; one theme, one
accent, one radius scale; CTA and form contrast AA; no CTA label wraps; serif discipline; palette
not a banned family; italic descender room; hero fits and holds at most 4 text elements; eyebrow
count; no split header; at most two zigzag splits in a row; one label per CTA intent; logo wall
logos only, under the hero; bento cells varied and exact; copy re-read; every animation motivated;
one marquee; nav on one line, at most 80 px; no repeated layout family; long lists in the right
component; real images, no fake UI, no hand-drawn decorative SVG; no pills over photos, photo
credits, version footers, micro-meta lines, decorative text strips, floating sub-text, filled score
bars, locale strips, scroll cues, version labels, section numbers, decorative dots, double-ruled
rows; sane density; quotes short; motion shown when claimed; skeletons per the canonical patterns;
no scroll listeners in components; reduced motion; dark mode tested; mobile collapse explicit;
`100dvh`; effect cleanup; empty, loading and error states; cards only where needed; one icon family;
no AI tells; Core Web Vitals plausible.
