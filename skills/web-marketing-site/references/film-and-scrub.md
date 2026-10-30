# Film, scroll scrub and the non-animated hero

The animated site: the visitor's scroll plays a generated film forward and backward and can hold
any frame as a still. That fact sets every rule below. Restated in SL8 wording from Higgsfield's
website-builder skill; numbers are the method's defaults (a kit or brief may set others).

## Contents
- [Journey block](#journey-block)
- [Footage contract](#footage-contract)
- [Single-shot film](#single-shot-film)
- [Multi-leg Architecture A](#multi-leg-architecture-a)
- [Multi-leg Architecture B](#multi-leg-architecture-b)
- [Encoding](#encoding)
- [The engine and the scenes file](#the-engine-and-the-scenes-file)
- [Non-animated: cinema hero and depth parallax](#non-animated-cinema-hero-and-depth-parallax)

## Journey block

Written into the brief before any board or generation; until it is there the brief is not done.

- `Journey shape: single-shot` (default) or `multi-leg` with one line of justification. "More
  scenes would look cooler" is not one: a tight single take beats a loose chain and ships sooner.
  Multi-leg costs one strictly sequential generation per leg plus encoding and inspection: state
  that time and spend before choosing it.
- `Journey:` single-shot, 3 to 6 chapters mapped to moments of the one film; multi-leg, 4 to 7
  scenes forming a real narrative or value chain. Each chapter: focal point, one short headline,
  one sentence, 0 to 3 proof tags. The eyebrow budget still applies.
- `World grammar:` one style preamble, byte-identical in every film prompt: perspective, palette,
  light direction, surface finish, background behaviour. Multi-leg changes only the subject and
  focal action between legs.
- `Camera architecture:` A or B (multi-leg only).
- `Mobile framing:` included by default: focal points inside the centre-safe area, lighter mobile
  encodes.
- `Budget:` all desktop clips at most 32 MiB together, all mobile clips at most 16 MiB. Shorten or
  re-encode before relaxing a budget.

Subjects that scrub well: a product turning slowly on dark; an exploded view assembling; a macro
detail travelling along a surface; a transformation; an object emerging from darkness. Avoid fast
pans and handheld shake.

## Footage contract

Carried by every film prompt (rows `scrub-film`, `multi-leg-next`, `connector`):
- one continuous camera move or one continuous transformation, never a cut;
- one hero subject, centre-safe, with clean space around it where the copy sits (the video is
  cropped to cover the viewport, so the edges are expendable);
- a background copy can survive: dark, seamless, low detail; a bright busy full-frame world behind
  body copy is the most common reason a good film is unusable;
- slow constant speed, easing only at the very start and end (the scroll sets the pace);
- locked exposure and white balance, no flicker, minimal motion blur (every frame is seen as a
  still);
- the first frame establishes, the last frame is the closing beauty state, and they differ;
- no words, logos or watermarks: all type is HTML over the video.

Seedance has no negative-prompt field: phrase every avoidance as what to show.

## Single-shot film

1. **Storyboard** (row `storyboard`): one 16:9 image, six frames of one continuous move in a
   3 × 2 grid, no words. It pins look, lens and progression for the price of one image. It is not
   inspected by the agent: it goes to the customer with the delivery, and a re-roll happens only on
   their feedback (2 at most).
2. **Film** (row `scrub-film`): one call with the storyboard as a generic reference image (`--ref`),
   never as the start frame (as a start frame it would open the page on a static storyboard),
   `duration` `"15"`, `aspect_ratio` `16:9`, `1080p` (a base-model tier; 4k only when the brief asks, quoted first: it lists about 2.3 times the price and
   the desktop encode caps at 1080p; never a `/fast/` tier, which stops at 720p), `generate_audio` `false`. Start the launch cover in the same
   beat, once, and build the page while both render; choose clip and poster file names yourself so
   the page can reference them first. Fetch each job once, when its output is the next input.
3. **No vision pass** on the single-shot film, its frames or its posters: the footage contract was
   set in the prompt, and only the gate, the encode figures and file checks verify them, plus one
   free local check that the first frame is not the storyboard sheet (`film_check.py`). Measure the
   delivered duration, size and audio (HR1); a short return is a known Seedance result.

## Multi-leg Architecture A

Continuous forward flight through 4 to 7 worlds, no pull-back to a map.
1. Leg 1 starts from the approved scene-1 still in the model's start-frame role (`--image`).
2. When a leg lands, extract its actual last decoded frame (`scrub_encode.sh bounds`) and start the
   next leg from that exact file. Never hand off from a board or an imagined still, and never pin
   the next leg with a wide end frame.
3. Keep direction and speed matched across the seam: position continuity comes from the exact
   frame, velocity continuity from the prompt (row `multi-leg-next`). Both are needed.
4. Look at each leg's last frame before paying for the next; regenerate a leg that ends mid-orbit,
   with sideways blur or facing the wrong way (one retry, HR7). A wrong seam cannot be fixed by a
   crossfade. Reverse scroll must also read correctly.

## Multi-leg Architecture B

Diorama dives joined by aerial connectors, only when pulling back to a world map is the concept.
Generate every dive independently from its approved still; extract dive i's last frame and dive
i+1's first frame; then submit all connectors together, each from those two exact frames
(`--image` for the start, `--last-frame` for the end; row `connector`). The seams must hold
dive[i].last = connector[i].start and connector[i].end = dive[i+1].first, pixel for pixel; read
both sides of every seam. A short crossfade only hides encoder drift. A forward dive followed by a
backward pull-out is a rewind: switch the concept to A. Fallback connector model when both ends
must be enforced: `blackforestlabs/flux-3/first-last-frame-to-video` (both ends required).

## Encoding

Scrub the encoded MP4 directly; never export thousands of frame images. For each clip, in order:

```bash
E=$HOME/.agents/skills/web-marketing-site/scripts/scrub_encode.sh
bash $E desktop raw/film.mp4 app/public/assets/world/scene-01.mp4
bash $E mobile  raw/film.mp4 app/public/assets/world/scene-01-mobile.mp4
bash $E poster  app/public/assets/world/scene-01.mp4        app/public/assets/world/scene-01-poster.png
bash $E poster  app/public/assets/world/scene-01-mobile.mp4 app/public/assets/world/scene-01-mobile-poster.png
du -k app/public/assets/world/*.mp4
```

Desktop: height min(1080, source) with an even width, H.264 yuv420p, CRF 20, a keyframe every 8 frames with scene-cut keys off (seeks land near
a keyframe), luma sharpen 0.8, no audio, faststart. Mobile: height min(720, source) with an even
width, CRF 23, a keyframe every 4 frames, sharpen 0.6. Posters come after encoding, from the exact
clip the browser decodes. Over budget: shorten the clip or raise CRF (`SCRUB_CRF_DESKTOP`,
`SCRUB_CRF_MOBILE`) before touching the budget. Only the chosen encodes go into
`app/public/assets/world/`; raw clips, boundary frames and rejects stay in `raw/`.

## The engine and the scenes file

The engine is two files the skill ships, copied unchanged into
`app/src/components/scroll-scrub/`; the gate compares their hashes. Nothing about the controller
is written or re-derived in a project. What it does, so you can build around it:
- each clip is fetched whole and played from a Blob URL (the site's CSP must allow `blob:` for
  media, and clip fetches stay same-origin);
- the poster shows until the clip has painted a seeked frame;
- scroll only marks a frame dirty; one animation-frame tick eases each visible clip toward its
  target time (factor 0.2 per frame) and seeks when the gap passes 0.008 s (desktop) or 0.02 s
  (phones), skipping a clip that is still seeking; the target is clamped to 0.999 of the duration;
- clips load when their band is within 1.5 viewport heights; neighbouring layers crossfade over
  0.1 viewport height; phones are 860 px wide or less and get the mobile encodes, primed on the
  first touch;
- `linger` (0 to 0.6) slows the middle of a clip without moving its first or last frame;
- chapter copy is server-rendered `<article>` elements, the first heading h1 and the rest h2, in
  reading order, over a soft scrim of the page colour (a bottom-up scrim on phones); the media
  layer is hidden from assistive technology; connector bands are empty and hidden;
- reduced motion: no clip is fetched, each band shows its poster, every chapter is a full viewport.

The scenes file (starter: the skill's `scripts/scroll-scrub-scenes.ts`): theme hexes from the
brief; every `<...>` replaced; single-shot is ONE entry whose clip is the film and whose chapters
are the journey; multi-leg is one entry per leg in journey order (B adds `kind: 'connector'`
entries, weight 0.8); `weight` 1.4 viewport heights per chapter by default, `linger` 0 to 0.6;
`mobileClip` always with `mobilePoster`; a module constant. Compose `app/src/routes/index.tsx`
around `<ScrollScrub scenes={SCENES} theme={SCRUB_THEME} />` with the site's own nav, the chapter
CTAs from the brief's inventory, and the content sections after the journey. The engine draws no
header, button system, scroll hint or per-scene eyebrow. Never attach a second scroll timeline to
the same video. Route buttons are keyboard reachable; an active state is not hover-only.

## Non-animated: cinema hero and depth parallax

Only on the customer's own non-animated choice (recorded with its reason). No scroll-scrub files.
Pick one Tier-1 technique that acts out the concept spine, defended in one brief sentence, never the
previous build's technique, never an autoplay ambient loop alone or a generic fade-in. Cinema tier
adds motivated reveals; spectacle adds a second beat of a different family mid-page. Every
technique paints a complete first frame (screenshot-safe), has a static reduced-motion state, and
declares its phone degradation.

- **Cinema hero (frame sequence):** the approved hero still, then one ~5 s image-to-video clip from
  it as the start frame (row `cinema-hero`, `duration` `"5"`, `generate_audio` false), then
  `ffmpeg -i raw/hero.mp4 -vf fps=20,scale=1280:-2 -q:v 4 app/public/frames/hero/%04d.jpg` (about
  100 frames, about 4 MB, cap 15 MB). A canvas renderer bound to the pinned hero's ScrollTrigger
  progress paints frame 1 at once, streams the rest, draws cover-fit, falls back to the nearest
  loaded frame, and under reduced motion shows the final sharp frame with no pin. The renderer is
  written in the project to this contract.
- **Depth parallax (spectacle):** the 2D stand-in for 3D: chroma-keyed layers (subject,
  foreground, background) moving at different scroll rates with ScrollTrigger, transform only.
- Any other technique (a lazy WebGL beat with three.js behind `ClientOnly` and `React.lazy`, an
  editorial tier with micro-motion): if it cannot be finished properly, ship a clean static page
  rather than half-wired motion. There is no image-to-3D: a mesh becomes layered depth.
