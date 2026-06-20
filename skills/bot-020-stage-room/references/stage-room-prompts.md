# Stage-room prompts — the verbatim staging prompt kit

The per-operation prompts for `bot-020-stage-room`. Each is reproduced **verbatim** —
parameterize only the bracketed slots (`<STYLE>`, `<room-type>`). The geometry-preserve
clause (bottom) is **prepended/appended to every prompt**; it is also the verbatim clause
in `geometry-discipline.md` §2.

## A · Default staging prompt (style `modern` — the default body)

Use this as the default. Parameterize the **style words** (the two `Style:` / furniture
descriptors) for other styles (mid-century, Scandinavian, farmhouse, contemporary-neutral);
keep the structure, the lighting line, and the geometry-preserve clause intact. The default
style is `contemporary neutral broad-appeal` (the safest broad-buyer-appeal); the body
below is written for `modern transitional` and is the canonical example to adapt:

```
Stage this empty living room photo. Preserve the room geometry, walls, windows, floors, and
ceiling exactly as in the source image. Add a modern beige sectional sofa, two ivory
armchairs, a wood and glass coffee table, a soft cream area rug, a brass arc floor lamp,
framed minimalist wall art, a large potted fiddle leaf fig in the corner, and a styled
bookshelf. Style: modern transitional, neutral palette with warm wood accents. Lighting:
warm natural daylight from the existing window, soft shadows, no harsh contrast.
Photorealistic real estate listing photography.
```

**How to parameterize the style** (keep the furniture *plausible and restrained* — over-
furnishing reads fake):

- swap the named furniture pieces and the `Style:` descriptor for the requested style
  (e.g. for Scandinavian: light oak, white/grey palette, simple low-profile pieces; for
  farmhouse: shaker furniture, warm woods, woven textures);
- keep the **camera + lighting line verbatim** ("warm natural daylight from the existing
  window, soft shadows, no harsh contrast") — it preserves the source look;
- keep the **geometry-preserve clause** (section C) bracketing the body.

## B · Style-anchored variant (ONLY when a style-reference image is supplied)

Use this when the caller supplies a `style-reference` furniture/style image. **Caveat:**
Nano Banana Pro accepts multiple reference images, but the multi-ref *forwarding* syntax
(how `ai-gen`/`gen-edit.sh` passes a second reference) is **UNVERIFIED**. **Smoke-test it
first**; if it errors, **fall back to the text-only style prompt (section A)** and record
the fallback in `geometry-qc.md`. Verbatim:

```
Stage this empty room in the style of the attached furniture reference image. Preserve the
room geometry, walls, windows, floors, and ceiling exactly as in the source photo; use the
same camera view. Furnish the space with pieces matching the reference's style, palette, and
materials. Lighting: warm natural daylight from the existing window, soft shadows, no harsh
contrast. Photorealistic real estate listing photography.
```

## C · The geometry-preserve clause (verbatim — bracket every prompt above with it)

This clause is the soul of the prompt. It is re-stated at the **start AND end** of the
staging body (the model attends most to the prompt edges). It is the same verbatim clause
in `geometry-discipline.md` §2:

```
Keep the room structure (walls/windows), only redecorate it with color, material, style and
furniture, and use the same camera view. Keep the same windows, same floor, same wall color,
same camera angle — add furniture only. Do not change cabinets, countertops, or appliances.
Preserve room geometry, walls, windows, floors, and ceiling exactly as in the source; do not
invent or move structure (no added windows/doors).
```

On a `drift` regenerate (geometry-QC exit 4), **reinforce** it — append the clause a second
time plus: "do not move or re-proportion any wall, window or door; identical camera;
identical framing and crop."

## D · Assembly (what `gen-edit.sh` is handed)

The final prompt string passed to `gen-edit.sh` is, in order:

1. the staging body (section A, style-parameterized — or section B if a style-reference
   smoke-tests clean),
2. immediately followed by the geometry-preserve clause (section C).

Example for `room-type = living room`, `style = modern transitional`:

> Stage this empty living room photo. Preserve the room geometry, walls, windows, floors, and
> ceiling exactly as in the source image. Add a modern beige sectional sofa, two ivory
> armchairs, a wood and glass coffee table, a soft cream area rug, a brass arc floor lamp,
> framed minimalist wall art, a large potted fiddle leaf fig in the corner, and a styled
> bookshelf. Style: modern transitional, neutral palette with warm wood accents. Lighting:
> warm natural daylight from the existing window, soft shadows, no harsh contrast.
> Photorealistic real estate listing photography. Keep the room structure (walls/windows),
> only redecorate it with color, material, style and furniture, and use the same camera view.
> Keep the same windows, same floor, same wall color, same camera angle — add furniture only.
> Do not change cabinets, countertops, or appliances. Preserve room geometry, walls, windows,
> floors, and ceiling exactly as in the source; do not invent or move structure (no added
> windows/doors).

This is exactly the prompt shown in SKILL.md Step 1.
