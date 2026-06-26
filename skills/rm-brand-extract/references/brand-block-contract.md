# Brand-block contract — rm-brand-extract

The durable how-to/contract this skill writes against. It defines (a) the exact keys the `## Brand`
block in `context.md` carries, (b) the four runtime font packs and the only render-safe families,
(c) the normalized `brand-capture.json` shape, and (d) the reachability / fallback rules. The build +
concept phases read the brand block; the engine reads the same keys through `props`. Keep these stable
so a brand extracted today still maps cleanly when the project is restyled later (JTBD-4).

## 1. The `## Brand` block (in `artifacts/<project>/context.md`)

```markdown
## Brand
- accent: #2D7FF9
- accentAlt: #0B1F3A
- fontPack: modern
- label: Acme
- logo: assets/cutouts/logo.png        <!-- omit if no cutout was produced -->
- source: https://acme.com (captured YYYY-MM-DD) — see assets/captures/brand-capture.json
```

| key | type | rule |
|---|---|---|
| `accent` | 6-digit hex | the most saturated brand-defining color (logo/CTA), never body grey / pure black / pure white |
| `accentAlt` | 6-digit hex | a second supporting brand color; if only one exists, a darker/lighter shade of `accent` |
| `fontPack` | enum | exactly one of `modern` \| `editorial` \| `bold` \| `tech` — never a raw font family |
| `label` | text ≤ ~16 chars | the brand/company name (capture `label`, else `<title>` / bare domain) |
| `logo` | path | `assets/cutouts/logo.png` — **omit the whole line** if bria produced no cutout |
| `source` | text | the URL/image + a capture date + a pointer to `brand-capture.json` (provenance) |

These are the same keys BOT-014's engine exposes (`accent`, `accentAlt`, `fontPack`, `label`). Concept
(`01-concept.md`) inherits the palette + pack; build (`rm-build`) passes them through `props` so the
generated React draws on-brand. The neutral default (when there is no brand): `#0a0a0a` bg, Inter,
cyan accent.

## 2. Font packs — the ONLY render-safe families

The bundled engine (`rm-build/scripts/remotion-template/src/engine/fonts.ts`) loads exactly nine
Google fonts at module top level (so the renderer blocks on them — deterministic, no fallback-face
flicker). A pack is a `{ body, display, condensed }` triple. **Emit the pack name, not a family.**

| fontPack | body | display | condensed | when the captured fonts feel… |
|---|---|---|---|---|
| `modern` (default) | Inter | Fraunces | Oswald | clean geometric sans (Inter, Helvetica, system sans) |
| `editorial` | Manrope | Playfair Display | Oswald | serif / magazine (Georgia, Playfair, any serif headline) |
| `bold` | Inter | Anton | Bebas Neue | heavy display / condensed, all-caps headlines |
| `tech` | Space Grotesk | DM Serif Display | Oswald | technical / mono-ish geometric (Space Grotesk, IBM Plex) |

Render-safe family allowlist (anything else is NOT bundled and must be mapped to the nearest pack):
**Inter, Fraunces, Oswald, Manrope, Playfair Display, Anton, Bebas Neue, Space Grotesk,
DM Serif Display.** A CDN/system font (Helvetica, Arial, Roboto, a brand's bespoke face) is never
render-safe — pick the closest pack instead. `font-pack-hint` overrides the auto-map.

## 3. `brand-capture.json` (in `artifacts/<project>/assets/captures/`)

`capture.sh` writes this; the skill derives the brand fields from it. Stable shape:

```json
{
  "source": "https://acme.com",
  "colors": ["#2d7ff9", "#0b1f3a", "#f5f7fa"],
  "fonts": ["Inter", "Fraunces"],
  "screenshots": ["artifacts/acme/assets/captures/brand-shot.png"],
  "label": "Acme",
  "via": "dom"
}
```

- `colors` — saturated (brand-defining) first, neutrals after, capped at 6, lowercased hex.
- `fonts` — `font-family` declarations harvested from the DOM + same-origin CSS (raw families, not yet
  mapped to a pack).
- `screenshots` — paths to the captured PNG(s), relative to the bot's cwd.
- `via` — provenance of the colors: `dom` (from DOM/CSS), `ffmpeg` (pixel-reduced from the screenshot
  because the DOM gave none), `none` (capture failed — an `"error"` field is also present).
- On failure the file is still written with `"error": "<message>"` and empty arrays (so provenance and
  the clean-failure record both survive).

## 4. Capture mechanism (the rm-* re-target)

hf-brand-extract used `hyperframes capture`. Remotion Studio has no HyperFrames — `capture.sh` uses the
runtime's own tools, the same pair `rm-assets` ships:

1. **Chrome Headless Shell** (`$CHROME_HEADLESS_SHELL`, default `/opt/remotion/chrome-headless-shell`)
   — `--screenshot` (full window 1440×900) + `--dump-dom`. Local, headless-by-default (do NOT pass
   `--headless`), no auth, no extra download. Falls back to any `chromium`/`google-chrome` on PATH.
2. **Node global fetch** (Node 22) — re-fetches the URL + up to 6 **same-origin** stylesheets (capped
   at 400 KB each, 8 s `AbortSignal.timeout`) to widen color/font coverage beyond the rendered DOM.
3. **ffmpeg** — only if step 1–2 yield zero colors: `scale=6:6:flags=area -f rawvideo -pix_fmt rgb24`
   reduces the screenshot to a 6×6 RGB grid; the most saturated non-neutral pixel → `accent`, a dark
   contrast pixel → `accentAlt`. Marked `"via":"ffmpeg"` so the pick is sanity-checked in the report.

The logo cutout reuses `bg-remove.sh` (ai-gen `fal-ai/bria/background/remove`) — keyless, ~1 credit.

## 5. Reachability + fallback rules (headless, never prompt)

- **Chrome missing / URL unreachable** (no screenshot AND no DOM AND no fetched HTML) → `capture.sh`
  writes `brand-capture.json` with `"error"` and exits non-zero. The skill records the failure in
  `state.md` and lets onboarding proceed with the **neutral default kit**. Never fabricate colors/fonts.
- **DOM/CSS gave no colors** → ffmpeg pixel fallback fills accent/accentAlt (`"via":"ffmpeg"`); note it.
- **bria failed / no logo found** → omit the `logo:` line; the brand still has accent + fontPack +
  label. A missing logo never fails the whole extract.
- **Non-runtime font captured** → map to the nearest pack (§2); never write an unbundled family.
- **Existing `## Brand` section** → merge (replace in place), never append a duplicate.
- This is **not a render** — no Chrome render, no MP4. It only seeds `context.md`; `rm-render` renders.
