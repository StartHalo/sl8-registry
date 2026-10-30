# Reading a project capture (route A)

Adapted from HyperFrames `website-to-hyperframes` step 1 (heygen-com/hyperframes, Apache-2.0;
research ids `hyperframes/websitetohyperframes-c794ad@read-and-summarize instructions (must read,
read if exist, on demand)`, `@sub-agent asset catalog prompt (rich captures)` and `@Step 1 gate:
site summary template`). SL8 changes: paths are relative to the capture folder the caller named;
asset captioning by an outside vision model is off on this machine, so the catalog comes from the
agent's own viewing; the summary is written to `capture-summary.md` as well as printed.

Read each file below. After reading each one, **write a 1-2 sentence summary** of what you learned.
These summaries are your working memory — the raw file content may be cleared from context later.

## Must read (do not skip)

1. **View the scroll screenshots** — viewport-sized captures covering the full page height (the
   number depends on the page length). Start with:
   - `capture/screenshots/scroll-000.png` — the hero section at full 1920x1080 resolution. This is
     the most important image. Describe: is the background light or dark? What's the dominant
     visual element? What colors jump out?
   - Then scan through the rest to see the full page. Each screenshot overlaps the previous by ~30%.

   After viewing them, write 3-4 sentences describing the site's visual mood, layout patterns,
   color strategy, and overall feel.
2. **`capture/extracted/tokens.json`** — Note the top 5-7 colors (HEX), all font families with
   their weights (e.g. `Inter (400,700)` or `Sohne (100-900 variable)`), number of sections, and
   number of headings/CTAs.
3. **`capture/extracted/visible-text.txt`** — Each line is prefixed with the HTML tag:
   `[h1] Heading`, `[p] Body text`, `[a] Link text`. Use these tags to understand hierarchy —
   headings are key messages, paragraphs are supporting copy. Strip the `[tag]` prefix when quoting
   text in the script.
4. **`capture/extracted/asset-descriptions.md`** — One-line-per-file summary of all downloaded
   assets. Note which assets are most visually striking or useful for video (hero images, logos,
   product screenshots).

## Read if they exist

5. **`capture/extracted/animations.json`** — Note if the site uses scroll-triggered animations,
   marquees, canvas/WebGL, or named CSS animations.
6. **`capture/extracted/lottie-manifest.json`** — View each preview image at
   `capture/assets/lottie/previews/` to see what the animations look like.
7. **`capture/extracted/video-manifest.json`** — View each preview at
   `capture/assets/videos/previews/` to see what each video shows.
8. **`capture/extracted/shaders.json`** — If present, this contains the actual GLSL shader code that
   powers the site's WebGL visual effects. Read the fragment shaders to extract: color values used
   in gradients, noise algorithms, blend functions, so the caller can recreate the effect with
   Canvas 2D or an embedded WebGL canvas.

## On demand (read when building scenes)

9. **Individual images in `capture/assets/`** — Use `capture/extracted/asset-descriptions.md` as
   your index. View specific images when you need them for a beat.
10. **`capture/extracted/assets-catalog.json`** — Use to find remote URLs when you need an asset
    that wasn't downloaded.

## Rich captures (30 or more images)

Launch a sub-agent to view all images and SVGs:

> "Read every image in capture/assets/ and every SVG in capture/assets/svgs/. For each, write one
> line: filename — what it shows, dominant colors, approximate size. Return the complete catalog."

Use the sub-agent's catalog as your asset reference for the rest of the workflow, and write it to
`capture/extracted/asset-descriptions.md`. Without sub-agents, do the same in the main context in
batches of about ten images, appending to the file after each batch.

## Site summary (the gate before any design or script work)

Write `capture-summary.md` beside `capture/`, then print it:

- **Site:** [name]
- **Colors:** [top 3-5 HEX values with roles]
- **Fonts:** [font families]
- **Sections:** [count] sections, [count] headings, [count] CTAs
- **Key assets:** [3-5 most useful assets for video]
- **Vibe:** [one sentence describing the visual identity]

Every HEX value must appear in `tokens.json`; fonts are written with their weights as in item 2.
