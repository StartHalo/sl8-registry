# Asset kit, head kit and launch cover

Restated in SL8 wording from Higgsfield's website-builder skill, with fal's photo-editing points;
defaults throughout (a kit or brief may set others). Prompt rows are in `prompts.json`.

## Contents
- [Asset kit](#asset-kit)
- [Cutouts](#cutouts)
- [Personalization ladder](#personalization-ladder)
- [Collect and coherence](#collect-and-coherence)
- [Head kit and OG](#head-kit-and-og)
- [Launch cover and metadata](#launch-cover-and-metadata)

## Asset kit

A default step on every build, submitted all at once right after the boards are chosen:
- hero visual: 2 candidates, unless the film's posters already cover the hero (never a second hero
  film);
- 2 or 3 section plates or textures; all content imagery; fictional product interfaces and
  diagrams as generated images, never div-built fakes;
- one custom icon set (row `icon-sheet`: 6 to 12 glyphs, one 2 px stroke style, on a chroma
  ground), never an icon font by default; a library icon family only for dense functional chrome
  (20 or more small glyphs), and never mixed with generated icons in one zone;
- logo walls with real marks only from files the customer supplies; an invented brand gets an
  invented inline SVG mark; logos only, no captions; legible in light and dark;
- product universe views (angles, lifestyle) derived from one approved product image with the
  reference-driven route, so every view is the same product;
- people imagery suited to the locale, generic and never a real person (HR17);
- state artwork: 404, empty, success, loading poster.

Every prompt carries the locked hexes, the spine motif and the no-text clause (row `asset-suffix`);
a monochrome direction is grayscale in the prompt and again on export. The customer's own assets
always win; generation fills gaps only, and their clashing photos are re-graded rather than
replaced by strangers. Generate at the final size and aspect: never enlarge a small asset in CSS or
crop a 16:9 hero into a square. Even a minimal site gets 2 or 3 real images; stock or picsum is never
a final state. A generation that fails twice changes model or restructures the prompt (HR7);
otherwise the slot is reported as missing, never filled with stock or CSS only.

## Cutouts

Prompt the subject on a solid #00FF00 ground with no shadow or props (row `chroma-subject`), then
key it locally:

```bash
convert in.png -fuzz 12% -transparent '#00FF00' out.png
```

Check the edges at 100% zoom: a haloed cutout is worse than none. When the key leaves a halo, use
`fal-ai/bria/background/remove` (one job per image, no batch: loop over the files); its PNG alpha
is the mask (`mask = cutout.split()[-1]` in Pillow), which also gives soft shadows and the cover
break-out. Keep PNG whenever transparency is involved and the input resolution unless asked;
other outputs match the input format (JPEG quality 95). Cutouts about 800 px, icons about 256 px.

## Personalization ladder

Chosen by fit, not count: three coherent items beat eight scattered ones. Each one joins the
coherence check and the final report.
- **Brand identity:** with no customer mark, a typographic monogram set locally in the brief's font
  (`head_kit.py --monogram`); ink and inverse versions for light and dark grounds. A generated
  logo, or a wordmark or monogram derived from the customer's mark with an edit model
  (`openai/gpt-image-2/edit`), waits for the owner's decision (HR10: marks never pass through a
  generative model by default).
- **Seamless pattern** (row `brand-pattern`): check the tile edge by tiling it 2 × 2.
- **Micro-animation strips** and a **1-2 s logo sting** (row `logo-sting`): Seedance's shortest
  clip is 4 s, so generate 4 s and trim (`ffmpeg -i raw/sting.mp4 -t 2 -an ...`); deliver muted, with
  a static fallback under reduced motion.
- **People:** founder or team portraits from the customer's real photos, re-graded; never invented
  testimonial faces next to invented quotes (HR18).
- **Re-grade the customer's clashing photos** (row `photo-regrade`) with a board as the grade
  reference.
- **Diagrams and spot illustrations** as art-directed images in one named style spelled the same
  in every prompt.
- **Turntable:** 24 to 36 generated yaw frames scrubbed on drag (no 3D). Cursor X-ray reveals and
  magnetic gallery walls only where they pay off the spine.
- **Brand sound** only behind a visible toggle the visitor presses; never autoplay.

## Collect and coherence

Build while jobs render; fetch each job once. Check what actually came back before wiring slots (a
count request can return one grid sheet: N requests is not N files). Exactly one winner per slot in
`app/public/assets/`, referenced same-origin (`/assets/...`); unpicked candidates and
intermediates stay in `refs/`. Downscale with `convert -resize`: hero at most 2048 px, cutouts about
800 px, icons about 256 px. No empty `src`.

Then ONE batched look at the whole kit (storyboard and film exempt) on a contact sheet
(`node $Q sheet <files...> --out qc/kit-sheet.jpg`). Regenerate an asset whose grade or palette
fights the boards, naming the hexes harder. An off-grade video gets one regeneration; then keep the
better take, grade it toward the palette with ffmpeg (`eq`, `colorbalance` or `lut3d`) and remake
its poster from graded frame 1. A mixed-grade kit is a failure.

## Head kit and OG

On every build, as files in `app/public/`, from the customer's logo first (512 px or larger,
downscaled, never enlarged), else the monogram: `favicon.ico` (16/32/48), `favicon-32.png` and
`favicon-16.png` (or `favicon.svg` for a mark simple enough to draw as SVG), `apple-touch-icon.png`
(180, opaque, padded), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (mark inside the 80%
safe zone), `site.webmanifest`, `theme-color` for light and dark, and the social block (`og:title`,
`og:description`, `og:image`, `og:url`, `og:type`, `twitter:card` = `summary_large_image`, absolute
image URLs once a host exists). `head_kit.py` writes the files and prints the head lines. If the
mark turns to noise at 16 px, use a simpler glyph for the small sizes (`--small`).

The OG card (1200 × 630) is made wide in the brand language, never cropped from the hero: generated
OG art (row `og-art`) or the cover scene composed by `compose_cover.py` into `<slug>_og_wide.png`.
A multi-page site gets a distinct OG card per major route.

## Launch cover and metadata

A build step on every build, needing no permission (only the cover video is permission-gated).
Started once, in the same beat as the film (Phase 1 has locked the look by then).

- **Cover brief:** exact product name; `og_title` at most 3-4 words, ideally one (it is the tab
  title and the cover text); the pitch goes in `og_description`; no tagline unless the customer gave
  one. Scene concept: the product's core verb staged as a physical, photographable moment with wit
  or spectacle, never "a person looking at a hologram interface".
- **Route:** people, lifestyle or fashion: the photo route; product, 3D or illustrated worlds with
  no people: the graphic route. In doubt, photo. Two candidates at 3:2, art at least 1500 px wide.
- **Six-block prompt** (row `cover-scene`): subject and action; world and 2-4 props; scale and
  placement with reserved space on a real surface; 2-3 committed saturated colours, no acid lime;
  light and lens (or a style on the graphic route); the no-lettering clause. Mood references (a
  chosen board or a customer photo) carry grade and energy only; their content never enters.
- **Kill rules:** drop a candidate with any lettering, a subject under about half the frame, a
  washed or muddy palette, no reserved space for the lockup, anatomy or prop glitches, or obvious
  slop (waxy skin, melted hands, nonsense objects). Both dead: fix the prompt (more concrete action,
  harder scale words, brighter palette) and regenerate once; composition is free, generations are
  not. A winner under 1500 px is regenerated, never enlarged. The graphic route's 1536 × 1024 scene is composed at its own size (`compose_cover.py` sets the cover to the art's width up to 1800, never larger). Lettering in a candidate: retry with
  row `cover-retry-suffix`.
- **Compose** with `compose_cover.py` (Pillow, local font, local files only): `<slug>_cover.png`
  (3:2 full bleed with the lockup), `<slug>_og.png` (palette frame, stadium window, 4 corner dots),
  `<slug>_og_wide.png` (the same at 1.91:1). Lockup: the customer's wordmark (or the brand name
  set in the font), then a huge title of at most 2 lines and at least 3 times the wordmark height,
  then an optional CTA pill; flat white, text always the last layer and off the face. Break-out:
  pass the Bria cutout of the scene (`--cutout`) and the subject overlaps the frame.
- **Check** the seven items, each written as what you see: vivid dense scene, subject dominant;
  the lockup reads as one unit with the title at least 3x the wordmark (the script prints the
  ratio); text topmost, legible, off the face; zero model-drawn text; frame colour from the
  palette with visible dots; no lime, no 3D or chrome lettering, no watermarks; art at least
  1500 px (the script refuses less). Text changes are compose-flag changes, never regenerations.
- **The customer's explicit wishes beat these defaults** (another aspect, no capsule, another
  CTA, a partner lockup, a vertical format). Pillow or a font missing: report that composition is
  blocked and deliver the scene without calling it the cover; a refusal: rework the prompt's
  content, keep its structure.
- **Wire it:** copy the three files into `app/public/` and write `app/src/app-meta.json` with
  `og_title`, `og_description`, `favicon_url`, `og_image_url` (the `_og_wide.png`) and `cover_image`
  (the `_cover.png`); the same values go into the root route's `<head>`.
