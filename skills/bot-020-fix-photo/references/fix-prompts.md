# Fix prompts — the verbatim per-operation prompt kit

The operation verb prompts below are **verbatim** from their sources (the
`listing-photo-fixer` deep-dive §4 / `prompts-and-playbooks.md` §C–D). Feed
`gen-edit.sh` the operation prompt **plus** the matching geometry-preserve clause from
`geometry-discipline.md` (§2) — SKILL.md Step 1 shows the combined strings. Each
operation routes to its locked model; one operation per turn; the unaltered original
is the `--image` source every turn.

## (a) declutter / object-removal → `fal-ai/qwen-image-edit`

Nano Banana Pro is **WEAK at removal** (smears/hallucinates where objects were) —
removals route to **Qwen-Image-Edit**. Pick the prompt that matches the photo:

**Interior (remove furniture / clutter):**

```
remove all the furniture while keeping the architectural integrity of the room
```

**Exterior (remove cars / bins, clean the frame):**

```
remove the cars on the driveway, and the rubbish bins next to the house, improve the overall photo quality
```

Append the **standard (declutter) preserve clause**. For a specific `removal-target`,
substitute it into the verb ("remove the [target] while keeping the architectural
integrity of the room") — but only ever name **movable clutter**. If the target is a
structural defect or a permanent fixture, the defect-honesty rule (SKILL.md Step 2)
STOPS the erase.

`--type` for disclosure: `declutter` → "Digitally Altered".
`--expected-change` for geometry-QC: `"removed clutter/objects"`.

## (b) twilight / day-to-dusk → `fal-ai/nano-banana-pro`

```
Convert this daytime photo to a beautiful dusk/twilight scene. dramatic sunset sky, turn on all interior and exterior lights
```

Append the **twilight/sky preserve clause**. Pass `resolution=2K` (positional,
nano-banana only).

`--type` for disclosure: `twilight` → "Digitally Altered".
`--expected-change` for geometry-QC: `"day-to-dusk lighting / time of day"`.

## (c) sky replacement → `fal-ai/nano-banana-pro`

```
replace the sky with a sunset
```

Append the **twilight/sky preserve clause** (it carries the "keep the building and
reflections" requirement). Pass `resolution=2K`.

`--type` for disclosure: `sky` → "Digitally Altered".
`--expected-change` for geometry-QC: `"sky replaced"`.

## (d) enhancement (exposure / white-balance / HDR-tone) → `fal-ai/nano-banana-pro`

```
improve the overall photo quality — lift exposure and apply an HDR-style enhancement (balanced highlights/shadows, accurate white balance, natural color), without changing any content of the scene
```

Append the **enhance preserve clause** (`pure color/exposure/tone edit only; content
must be identical.`). Pass `resolution=2K`. Enhance is the lowest-risk fix (no content
change) but is **still an altered image** — it is disclosed like the rest.

`--type` for disclosure: `restyle` → "Digitally Altered" (enhance has no dedicated
type; `restyle` yields the correct "Digitally Altered" caption — do NOT use a
conceptual label, this is a real-property edit).
`--expected-change` for geometry-QC: `"exposure/color/tone only, no content change"`.

## Negative guards (append-as-needed, all operations)

If the model is prone to a known artifact, reinforce with these — and the geometry-QC
will catch any that slip through:

- **No smear/halo/ghost** where objects were removed (declutter). No blurred patch,
  no half-erased object, no fill that does not match the surrounding surface.
- **No hallucinated replacement objects** — do not invent furniture, a new car, a
  plant, or any object to fill the space where something was removed.
- **No warped walls / melted mullions** — straight lines stay straight; window grids
  and door frames stay crisp and rectilinear.
- **No overcooked HDR halos** (enhance/twilight) — no glowing edges around rooflines or
  window frames, no crushed blacks, no blown highlights, no oversaturated sky bleed.

## Routing + disclosure quick table

| operation | model | preserve clause | `resolution=2K` | `--type` (disclosure) | `--expected-change` (QC) |
|---|---|---|---|---|---|
| declutter | `fal-ai/qwen-image-edit` | standard | no | `declutter` | `removed clutter/objects` |
| twilight | `fal-ai/nano-banana-pro` | twilight/sky | yes | `twilight` | `day-to-dusk lighting / time of day` |
| sky | `fal-ai/nano-banana-pro` | twilight/sky | yes | `sky` | `sky replaced` |
| enhance | `fal-ai/nano-banana-pro` | enhance | yes | `restyle` | `exposure/color/tone only, no content change` |
