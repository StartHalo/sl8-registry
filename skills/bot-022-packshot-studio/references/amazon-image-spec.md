# Amazon main-image spec — the exact rules this skill enforces

The hero/main image is the one Amazon's automated pipeline scans on ingest. The rules
below are what `enforce-packshot.py` checks and fixes. Verified 2026-06-19 from
multiple consistent secondary sources (Seller Labs, Squareshot, ListingForge,
ImageWork India) — see the **G1881 flag** at the bottom.

## The rules (hero / main image)

| Rule | Requirement | How the gate handles it |
|---|---|---|
| **Background** | **Pure white, EXACTLY `RGB 255,255,255`.** NOT off-white (`250,250,250`), NOT transparent. | `bg_pass` = all 8 corner/edge samples `== (255,255,255)`. The Pillow flatten composites onto a pure-255 canvas, so the *fix* guarantees it. `254` fails — sample exactly. |
| **Frame fill** | Product fills **≥85%** of the frame, without touching the edges (touching can trigger rejection). | `fill` = product bbox area / frame area; `fill_pass` = `≥0.85`. The recrop re-pads a too-small product up to the target with a small white margin (never touching edges). |
| **Dimensions** | Min **1000px** on the longest side (for zoom); **2000px+ recommended**. | `res_ok` = long side `≥1600` (we target 1600+ for zoom safety, above Amazon's 1000 floor). The gate NEVER upscales-invents pixels — if the snap lacks resolution, it FLAGS, it does not fabricate. |
| **Aspect ratio** | Amazon **strongly recommends 1:1 square.** | `--square` (default for hero + angles) makes the canvas square. |
| **Prohibited on the main image** | **No text, logos, watermarks, or inset images.** | The skill never adds text/props/watermark; the preserve-clause prompts explicitly forbid them; deterministic flatten adds nothing. |
| **Formats** | JPEG / PNG / TIFF / GIF (no animated GIF). | The gate exports **sRGB JPEG, quality 95, metadata stripped**. |

## Why EXACT 255 (not "looks white")

Off-white that "passes the human eye, fails the automated check." Even `250,250,250`
"can trigger automated suppression" — invisible to the eye, caught by the algorithm,
and the seller often gets **no clear notice**: no Buy Box, no organic ranking. This
is the single highest-ROI thing the bot does. The flatten makes the bot's own output
provably compliant; the corner/edge sample proves it before ship.

## The off-white-after-re-save warning (state it in the report)

The deterministic flatten handles the bot's *own* output. But any downstream re-save
— a CDN re-compression, a seller's Canva/Photoshop pass, a phone screenshot — can
re-introduce off-white or re-embed an ICC profile that re-tints the white. The bot
MUST warn the seller that **the final uploaded file must be the exact flattened JPEG
this skill produced** — do not round-trip it through another editor before upload.
(This is why the gate strips embedded ICC/EXIF: a tagged color profile is a common
silent off-white source.)

## Reflective / metallic / fine-text surfaces

Glass, jewelry, chrome, and small printed label copy are the known low-confidence
class: photoreal generators invent reflections or garble text, and even a clean RMBG
cutout can leave a halo on a reflective edge. The **deterministic hero still ships**
(RMBG is pixel-faithful), but any *generated* output (angles, optional cleanup) for
these products is flagged **low-confidence → human review** in `fidelity-qc.md`.
Route any text-bearing surface that must be re-rendered to a text-faithful model
(Ideogram v4) rather than nano-banana-pro/Seedream, which garble label text.

## FLAG — G1881 is login-gated (verify, don't inherit)

> The authoritative Amazon style-guide (**G1881**) is **behind Seller Central login**
> and could not be reached as a primary source. The spec above is reconstructed from
> multiple consistent 2026 secondary sources that all agree on the exact-255 rule and
> 85% fill. **Re-validate against the live G1881 at build** (verify, don't inherit) —
> and never claim "Amazon-confirmed" in a report where the rule came only from
> secondary sources. The exact-255 + ≥85% fill rules are corroborated enough to
> enforce; treat the finer points (edge-touch, exact recommended px) as advisory.

## Other marketplaces

The default target is `amazon` (the strictest). Other marketplaces relax the
background rule (Etsy/Shopify allow lifestyle/contextual mains) but the exact-255
white hero is always a *safe* compliant baseline. When a non-amazon target is given,
record it in `compliance.json` and keep the exact-255 hero as the guaranteed-safe
variant; looser channels can also use the phase-3 lifestyle scenes.
