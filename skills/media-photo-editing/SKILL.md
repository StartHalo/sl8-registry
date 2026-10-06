---
name: media-photo-editing
description: >-
  Photo editing, color grading and background removal on a supplied photo, done
  deterministically in python3 (Pillow, numpy, OpenCV, scikit-image): brightness,
  exposure, contrast, saturation, white balance, black and white, LUT looks,
  vignette, crop, resize, rotate, straighten, format conversion, compression,
  metadata strip, watermarks, text overlays, borders, compositing, sharpen,
  background blur, HEIC and RAW import, matching a reference look, and Bria
  cutouts and masks. Measures with scopes (percentiles, clipping) before and
  after every edit. Use when: a photo needs an adjustment a darkroom
  or Photoshop slider could make, a background removed, replaced or blurred, or
  its colors fixed, enhanced or graded. NOT for: inventing new content, object
  removal, face or expression changes, inpainting, outpainting, style transfer,
  upscaling or restoration (media-image-generation); character reference sheets
  (media-character-sheet); running ai-gen in general (media-ai-gen); scripted
  output checks (media-qc).
license: Adapted from fal agent skills; no licence stated; used with attribution
compatibility: "sl8-image >=1.0.0 (Base 2.0.2); ai-gen 2.2.0; python-imaging 1.0.0 (Pillow 11.2.1, numpy, opencv-python-headless, scikit-image, pillow-heif, rawpy); imagemagick"
metadata:
  version: 1.0.0
  revision: 2026-10-05a
  house-rules: HR-1.0
  upstream: fal-agent/photo-editing
  upstream-pin: export 2026-10-05
  attribution: Adapted from fal (fal.ai/agent/skills export 2026-10-05)
  deltas: IMG-D50..IMG-D59
---
# Photo editing

Deterministic photo edits run in the sandbox (`python3` scripts, run directly), not through a
generative model. They are pixel-exact, repeatable, and effectively free — a
model run would re-synthesize the whole image and drift everything the user
didn't ask to change.

## Routing

Classify the request first. The test: **could a darkroom or Photoshop slider do
it?** → sandbox. **Does it require inventing new image content?** → generative
edit model (`media-image-generation`).

| Request                                                                    | Route                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Brightness, exposure, contrast, saturation, white balance                  | Sandbox                                                     |
| Color grading, black & white / monochrome, LUT-style looks, vignette       | Sandbox                                                     |
| Crop, resize, rotate, straighten, flip                                     | Sandbox                                                     |
| Format conversion (png/jpg/webp), compression, metadata strip              | Sandbox                                                     |
| Watermarks, text overlays, borders, compositing images together            | Sandbox                                                     |
| Sharpen, mild blur (incl. background blur via mask)                        | Sandbox                                                     |
| Background removal / matting                                               | Bria model (see below)                                      |
| Change objects, faces, expressions ("make him smile", "remove the person") | Edit model (`media-image-generation`)                       |
| Inpainting, outpainting, style transfer ("make it a painting")             | Edit model (`media-image-generation`)                       |
| Upscaling, restoration, deblur/denoise beyond mild                         | Dedicated model (upscaler/restoration) via `media-image-generation`, never PIL resize-up |

Mixed requests split: "make it black and white and add our logo" is all
sandbox; "remove the guy in the back and crop to square" is an edit model for
the removal, then sandbox for the crop.

## Masks come from Bria, everything after is sandbox

The sandbox has **no matting library** — do not attempt segmentation with
opencv (GrabCut etc.); quality is unacceptable. For anything that needs a
subject/background split, run `fal-ai/bria/background/remove` (single job per
image, no batch; completes in seconds): first
`ai-gen estimate fal-ai/bria/background/remove --format json` (HR5), then
`ai-gen run fal-ai/bria/background/remove --image <path> --queue -o artifacts/<project>/<node>/ --format json`
then its manifest row (HR9). It returns a transparent-PNG cutout —
the alpha channel **is** your mask.

The hybrid recipe for selective edits ("grade the background monochrome",
"blur everything behind her", "replace the background with white"):

1. Bria → cutout file (downloaded by `-o`).
2. One `python3` script: load original + cutout, extract
   `mask = cutout.split()[-1]`, apply the adjustment to the full frame, then
   `Image.composite(foreground, adjusted, mask)` (or paste the cutout over a
   new background).
3. Write the result to `artifacts/<project>/<node>/` and record its manifest
   row: `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add …`.

If the user only asked to remove the background, the Bria output alone is the
answer — no sandbox step needed.

## Working in the sandbox

- Pre-installed: Pillow, numpy, opencv-python-headless, scikit-image,
  pillow-heif, rawpy, ImageMagick. Nothing else: never pip install (HR21); if
  a library is missing, report it.
- **One script per pipeline.** Download inputs, do every step, keep scratch in
  `work/<project>/`, write the final file to `artifacts/<project>/<node>/`, then
  one manifest row (`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add …`).
  Don't round-trip intermediate steps through separate tool calls.
- The file under `artifacts/<project>/` is what the person sees — don't
  paste a URL or re-submit it to a model.

Key Pillow moves (write real code around these; don't guess at APIs):

- Load with `ImageOps.exif_transpose(Image.open(...))` — always, or phone
  photos come out rotated.
- Tonal: `ImageEnhance.Brightness/Contrast/Color/Sharpness`,
  `ImageOps.autocontrast`, `Image.point` for curves/levels.
- B&W with control: mix channels via numpy (e.g. luminosity weights) rather
  than `convert("L")` when the user cares about the look.
- Geometry: `crop`, `resize(..., Image.LANCZOS)`, `rotate(angle, expand=True)`.
- Compositing: convert to RGBA, `Image.alpha_composite` / `Image.composite`
  with a mask; `ImageDraw` + `ImageFont` for text.
- HEIC/HEIF input (iPhone photos): `pillow_heif.register_heif_opener()`
  before `Image.open`.
- RAW input (CR2/NEF/ARW/DNG): decode with `rawpy`
  — never grade the embedded JPEG thumbnail Pillow shows you.
  `raw.postprocess(use_camera_wb=True, no_auto_bright=True, output_bps=16)`
  is the neutral import; keep the result 16-bit/float through the whole
  pipeline and convert once at export.

## Measure like a colorist — scopes, not eyes

You can see the user's attached images, but only coarsely — vision gives you
semantic reads (subject, composition, "looks backlit"), not fine tonal or
color measurement. Never estimate numbers by eye. Files you create in the
sandbox you can open with the Read tool, but that is the same coarse vision,
not a measurement. So
every quantitative decision comes from measured numbers, which is also how
professionals grade: by histogram and scopes, not by squinting. Print your
scopes.

- **Before editing**, run a quick measurement pass and print: per-channel
  p1/p50/p99, mean luminance, % of pixels clipped at 0 and 255, per-channel
  means (a gray-world imbalance = the cast direction), mean saturation.
- **Decide from the numbers**, not vibes: R mean 6% above G → cool it by that
  factor; p99 at 0.82 → there's highlight headroom to stretch; 3% clipped
  blacks → lift before you S-curve.
- **After editing, re-measure** and print before/after side by side. Confirm
  the targets moved as intended and nothing new clipped (>0.5% is a smell)
  BEFORE writing to `artifacts/`.

The measurement pass may be its own small `python3` script when the numbers
decide which aesthetic moves to make; the edit itself stays one script.

## Grading like Lightroom: normalize, then grade

For "fix the colors and make it moody / cinematic / film-look" asks, work in
two passes inside one script — a neutral baseline first, the look second.
Do the math in float32 numpy arrays in [0, 1]; convert to uint8 once at the
end (repeated 8-bit round-trips cause banding).

1. **Normalize** to a clean baseline:
   - White balance: gray-world (scale each channel to the common mean) or
     white-patch (scale so the ~99th percentile is neutral).
   - Exposure/contrast: percentile stretch (clip at ~p1/p99, rescale), or
     `skimage.exposure.equalize_adapthist` (CLAHE, `clip_limit≈0.01`) for
     flat or backlit shots.
2. **Grade** on top of the normalized base:
   - Tone curves: `np.interp` over a few control points per channel — S-curve
     for punch, lifted blacks for matte film looks.
   - Split-toning: shift shadow and highlight hues separately, weighted by a
     smooth luminance mask.
   - HSL-panel moves (targeted hue/sat shifts): `cv2.cvtColor` to HSV, adjust
     the hue range, convert back.
   - `.cube` LUTs: `pillow_lut` is not on this machine, so read the `.cube`
     rows in file order into Pillow's built-in
     `ImageFilter.Color3DLUT(size, rows)` → pass to `Image.filter` for
     any named film/teal-orange style look.
3. **Match a reference look**: when the user attaches a photo with the look
   they want, `skimage.exposure.match_histograms(img, ref, channel_axis=-1)`
   is the 80% answer in one line — follow with a gentle tone curve to taste.

Show the result and iterate — grading is subjective, so expect a round or two
of "warmer", "less contrast" refinements on the same normalized base.

## Quality rules

- Preserve the input resolution unless the user asked to resize.
- Output PNG whenever transparency is involved; otherwise match the input
  format, JPEG at `quality=95` to avoid visible recompression.
- Change only what was asked — no bonus auto-enhance, no re-encoding pipelines
  that touch untargeted pixels.

## Defaults for ambiguous asks

- **"Remove the background"** → Bria. Deliver the transparent PNG; offer a
  composite (solid color / new scene) as the follow-up.
- **"Enhance / fix this photo"** → deterministic first (auto-contrast, white
  balance, gentle sharpen in one script). If the real problem is detail,
  damage, or faces, say so and offer an upscaler/restoration model
  (`media-image-generation`) instead.
- **"Retouch"** → tonal cleanup is sandbox; blemish/skin/object retouching is
  an edit model (`media-image-generation`).
- Genuinely unclear whether they want a look change or a content change → ask,
  one short question, before running anything.

## House rules (HR-1.0)

Relies on: HR1, HR5, HR6, HR7, HR8, HR9, HR10, HR11, HR12 (a job has no one to
answer: where this skill says ask, proceed on the deterministic reading (HR10)
and flag it in the delivery), HR13, HR14, HR15, HR18, HR20, HR21, HR22 — see
`media-ai-gen/references/house-rules.md`.

Not applicable: HR2, HR3, HR4, HR16 (the one model call here, Bria, takes only
`image_url`: no values to check, no default-on flags, no prompt or rewriter);
HR17 (nothing here generates a likeness; face and expression changes go to
`media-image-generation`); HR19 (an authoring rule; no ignored warning is on
record for this skill yet).
