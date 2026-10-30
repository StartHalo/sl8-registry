---
name: media-photo-editing
description: >-
  Photo editing, color grading and background removal on a supplied photo, done
  deterministically in python3 (Pillow, numpy, OpenCV, scikit-image): brightness,
  exposure, contrast, saturation, white balance, black and white,
  vignette, crop, resize, rotate, straighten, format conversion, compression,
  metadata strip, watermarks, text overlays, borders, compositing, sharpen,
  background blur, HEIC, RAW and .cube LUT inputs, matching a reference look,
  and Bria cutouts and masks. Measures with scopes before and after every edit. Use when: a photo needs an adjustment a darkroom
  or Photoshop slider could make, a background removed, replaced or blurred, or
  its colors fixed, enhanced or graded. NOT for: inventing new content, object
  removal, face or expression changes, inpainting, outpainting, style transfer,
  upscaling or restoration (media-image-generation); character reference sheets
  (media-character-sheet); running ai-gen in general (media-ai-gen); scripted
  output checks (media-qc).
license: Adapted from fal agent skills; no licence stated; used with attribution
compatibility: "sl8-image >=1.5.0 (Base 2.1.0); ai-gen 2.2.0; python-imaging 1.0.0 (Pillow 11.2.1, numpy, opencv-python-headless, scikit-image, pillow-heif 1.8.0, rawpy 0.27.1); pillow-lut (new on Image 1.5.0); imagemagick 6.9"
metadata:
  version: 1.2.0
  revision: 2026-10-28b
  house-rules: HR-1.0
  upstream: fal-agent/photo-editing
  upstream-pin: export 2026-10-05
  attribution: Adapted from fal (fal.ai/agent/skills export 2026-10-05)
  deltas: IMG-D50..IMG-D59, IMG-D123..IMG-D128, IMG-D135..IMG-D147
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
| Upscaling, restoration, deblur/denoise beyond mild                         | Dedicated model (upscaler/restoration) via `media-image-generation` by default, not a PIL resize-up |

Mixed requests split: "make it black and white and add our logo" is all
sandbox; "remove the guy in the back and crop to square" is an edit model for
the removal, then sandbox for the crop.

## Masks come from Bria, everything after is sandbox

The sandbox has **no matting library** — known result for segmentation with
opencv (GrabCut etc.): quality is unacceptable. For anything that needs a
subject/background split, run `fal-ai/bria/background/remove` (single job per
image, no batch; completes in seconds). In order:

1. **Source file.** Write `work/<project>/<name>.src.png`: the customer file as
   an oriented, 8-bit sRGB PNG (HEIC through pillow-heif, RAW through rawpy as in
   "Key Pillow moves"; `exif_transpose` on every path except RAW; colour per
   "Quality rules"). Bria gets this file, and the edit script loads this same
   file as "the original", so mask and frame share size and orientation.
2. **Quote.** `ai-gen estimate fal-ai/bria/background/remove --format json`
   (HR5; one quote per image), then
   `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>`.
   Over the remaining budget, or no budget known: open a gate
   (`node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open …`) and end the job `partial`
   (HR5, HR12).
3. **Run.**
   `ai-gen run fal-ai/bria/background/remove --image work/<project>/<name>.src.png --queue --strict-params --max-cost <quote> -o artifacts/<project>/<node>/ --format json`
   then its manifest row (HR9). It returns a transparent-PNG cutout; the alpha
   channel **is** your mask.
4. **Check the cutout.** It is RGBA with real alpha (`cutout.mode == "RGBA"` and
   the alpha band has values below 255), and `cutout.size == original.size`. On a
   size mismatch resize the mask with LANCZOS to the original's size, or re-run
   once from the same source file; say which in the delivery.

The hybrid recipe for selective edits ("grade the background monochrome",
"blur everything behind her", "replace the background with white"):

1. Bria → cutout file (downloaded by `-o`), checked as above.
2. One `python3` script: load the `.src.png` original + cutout, extract
   `mask = cutout.split()[-1]`, apply the adjustment to the full frame, then
   `Image.composite(foreground, adjusted, mask)` (or paste the cutout over a
   new background).
3. Write the result to `artifacts/<project>/<node>/` and record its manifest
   row: `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add …`.

If the user only asked to remove the background, the Bria output alone is the
answer — no sandbox step needed.

## Working in the sandbox

- Pre-installed: Pillow, numpy, opencv-python-headless, scikit-image, pillow-lut,
  pillow-heif, rawpy, ImageMagick. Nothing else: never pip install (HR21); if
  a library is missing, report it. pillow-heif and rawpy are already on
  python-imaging 1.0.0; only pillow-lut is new on Image 1.5.0, baked but not yet
  run here (IMG-L135).
- HEIC, camera RAW and `.cube` inputs read through pillow-heif, rawpy and
  pillow-lut. Import only what the job's input needs, before the job:
  `python3 -c "import PIL, numpy, cv2, skimage"` plus `pillow_heif` (HEIC),
  `rawpy` (RAW) or `pillow_lut` (`.cube`). On an ImportError name the
  unavailable input path, file a studio-request, ask nothing (HR12) and finish
  what does not need it.
- **One script per pipeline.** Download inputs, do every step, keep scratch in
  `work/<project>/`, write the final file to `artifacts/<project>/<node>/`, then
  one manifest row (`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add …`).
  Default: intermediate steps stay in that one script rather than round-trip through separate
  tool calls; a kit or brief may name another split.
- The file under `artifacts/<project>/` is what the person sees — don't
  paste a URL or re-submit it to a model.

Key Pillow moves (write real code around these):

- Load with `ImageOps.exif_transpose(Image.open(...))` by default. Known result:
  without it, phone photos come out rotated.
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
  by default. Known result: the embedded JPEG thumbnail Pillow shows you is not the sensor data.
  `raw.postprocess(use_camera_wb=True, no_auto_bright=True, output_bps=16)`
  is the neutral import (sRGB output). Open with
  `with rawpy.imread(path) as raw:`; the result is uint16, so divide by 65535.0
  to the float32 [0, 1] the pipeline uses, and do not `exif_transpose` it
  (rawpy already applies the camera flip). Keep it float through the whole
  pipeline and convert once at export. Above about 50 MP, downscale to the
  delivery size first or work in tiles; if memory runs out, report it (IMG-L135).
- Colour profile: a phone HEIC is usually Display P3 with an ICC profile. Default:
  when the source carries `icc_profile`, convert to sRGB with `PIL.ImageCms`
  (`profileToProfile`) at load, before any edit; with no profile assume sRGB.
  A copy left untagged reads dull. `cv2.imwrite` writes no profile at all.

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
   - `.cube` LUTs: `pillow_lut.load_cube_file` → pass to `Image.filter` for
     any named film/teal-orange style look. `Image.filter` takes an 8-bit RGB
     image, so the LUT is the last grade step, applied at the one uint8
     conversion (a RAW grade stays 16-bit/float until then). Only 3D LUTs
      with the default 0..1 domain load: on a load error (a 1D `LUT_1D_SIZE`
      file, another `DOMAIN_MIN/MAX`, an oversized table) say which header the
      file uses and fall back to curves and split-toning. A LUT job delivers
      8-bit: the 16-bit override below does not apply. Strength control:
      `Image.blend(base, graded, strength)`; default 1.0 for a LUT the customer
      named, 0.6 for "subtle". The `.cube` file
     comes with the request: a library of named `.cube` looks is not offered on
     this machine yet, so a named look without a file is built from the tone
     curves and split-toning above.
3. **Match a reference look**: when the user attaches a photo with the look
   they want, `skimage.exposure.match_histograms(img, ref, channel_axis=-1)`
   is the 80% answer in one line — follow with a gentle tone curve to taste.

Show the result and iterate — grading is subjective, so expect a round or two
of "warmer", "less contrast" refinements on the same normalized base. Round
one saves the normalized float32 array to `work/<project>/base.npy`; a later
round loads it and grades that, never the last output (re-normalizing a graded
frame compounds). If `base.npy` is missing, re-run normalization from the
`.src.png` original; it is deterministic.

## Quality rules

- Preserve the input resolution unless the user asked to resize.
- Output PNG whenever transparency is involved; otherwise match the input
  format, JPEG at `quality=95` to avoid visible recompression.
- A HEIC or camera RAW source has no format to match on delivery: a RAW file
  cannot be written back, and few browsers display HEIC. Default: JPEG at `quality=95`
  (PNG with transparency), converted to 8-bit once at export; a kit or brief may
  name another (`.heic` through pillow-heif, or a 16-bit PNG or TIFF written by
  `cv2.imwrite` from a uint16 array in BGR order, since Pillow has no 16-bit RGB
  mode). Say in the delivery note which override was not used.
- Tag the output sRGB (`icc_profile` from the sRGB conversion, or none after
  converting) and carry the source EXIF into JPEG (`exif=img.getexif()`), unless
  "metadata strip" was asked; the 16-bit `cv2.imwrite` override drops both, so
  flag that in the delivery note.
- Change only what was asked — no bonus auto-enhance. A JPEG export re-encodes
  the whole frame, so do not claim untargeted pixels are byte-identical; export
  PNG when exact preservation matters.

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
