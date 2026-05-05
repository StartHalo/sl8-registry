---
name: bot-008-pixel-art-studio
description: Generate pixel art from a text prompt via Pollinations, or convert an uploaded photo into pixel art with hardware presets (NES, SNES, Game Boy, C64, etc). Use for retro/8-bit/16-bit visuals for marketing, social posts, and brand content. Two independent flows — never feed the photo converter on top of Pollinations output.
---

# Pixel Art Studio (BOT-008)

Two flows in one skill, vendored from [Synero/pixel-art-studio](https://github.com/Synero/pixel-art-studio) (MIT). Animated video is intentionally out of scope for this version.

| Flow | Trigger | Script | Output |
|---|---|---|---|
| Text → pixel art | User describes a scene, asks for pixel art / 8-bit / retro | `pixelart_image.py` | PNG saved under `artifacts/<project>/text2pixel/` |
| Photo → pixel art | User attaches a photo path, asks for pixel art / Game Boy / 8-bit version | `pixelart.py` | PNG saved under `artifacts/<project>/photo2pixel/` |

**Hard rule**: Pollinations output is already pixel art. Never run `pixelart.py` on top of it.

## Outputs

All outputs MUST land under `/home/user/artifacts/<project-name>/`:

- `artifacts/<project>/text2pixel/{slug}_{tech}_{artistic}_{w}.png` — generated PNG
- `artifacts/<project>/text2pixel/summary.md` — prompt, chosen styles, Pollinations URL
- `artifacts/<project>/photo2pixel/{source-stem}_{preset}.png` — converted PNG
- `artifacts/<project>/photo2pixel/summary.md` — source path, preset, palette, dither
- `artifacts/<project>/error.md` — only on clean failure (rate-limit exhausted, missing input)

## Setup (run once per session)

```bash
cd /home/user/skills/bot-008-pixel-art-studio
pip install -q -r requirements.txt   # Pillow, numpy, scipy, requests
```

If `scipy` install fails, the photo converter degrades gracefully (no Sobel edge-aware downsampling, otherwise identical). Note the degradation in `summary.md`.

## Extracting Intent

The user describes what they want in their own words. Extract:

1. **Subject** — what's in the scene (wizard, cat, city, product shot)
2. **Artistic style** — how it should feel (cyberpunk, medieval, anime, cozy)
3. **Technical style** — how pixels should look (NES, SNES, arcade, Game Boy)
4. **Has photo?** — if yes, take the photo→pixel branch

Don't force the user to pick. If they say "cyberpunk neon city pixel art" — that's the artistic style. If they say "retro 8-bit dragon" — that's the technical style. Only fill what's missing using defaults.

---

## Flow 1 — Text → Pixel Art (Pollinations)

### Artistic Styles

| Style | Vibe | Prompt Modifier |
|---|---|---|
| auto | Let prompt speak | (none) |
| cyberpunk | Neon, futuristic, rain | cyberpunk neon lights, futuristic, rain-slicked, purple and cyan |
| medieval | Castles, knights, dragons | medieval fantasy, stone castles, torchlight, banners |
| anime | Japanese, expressive, vibrant | anime style, vibrant colors, expressive eyes, dynamic pose |
| noir | Dark, moody, detective | film noir, dramatic shadows, dark alley, mystery |
| western | Desert, cowboy, saloon | wild west, dusty desert, wooden buildings, sunset |
| scifi | Space, robots, holograms | sci-fi, space station, holographic displays, metallic |
| kawaii | Cute, pastel, adorable | kawaii, pastel colors, cute, soft lighting, sparkly |
| steampunk | Gears, brass, Victorian | steampunk, brass gears, Victorian, steam pipes, warm |
| horror | Dark, spooky, Gothic | horror, dark Gothic, eerie fog, moonlit |
| underwater | Ocean, coral, bioluminescent | underwater, deep blue ocean, coral reef, light rays |
| postapoc | Ruins, wasteland, overgrown | post-apocalyptic, overgrown ruins, wasteland, desolate |
| retro | 80s/90s nostalgia, synthwave | retro 80s aesthetic, synthwave, neon grid |
| cozy | Warm, comfortable, relaxing | cozy atmosphere, warm lighting, comfortable, soft |

### Technical Styles

| Style | Look | Best for |
|---|---|---|
| nes | 8-bit, limited palette, clean | Characters (fewest hallucinations) |
| snes | 16-bit, colorful, detailed | Rich scenes |
| indie | Modern, polished pixel art | Contemporary feel |
| arcade | Bold, chunky, high contrast | Posters, action |
| gameboy | 4 green shades | Extreme retro |
| clean | Modern, high fidelity | Maximum detail |
| gb | GBA 32-bit, smooth | Handheld aesthetic |

**Default recommendation:** `nes` for characters, `snes` for scenes, `arcade` for bold posters.

### Aspect Ratios

| Ratio | Use |
|---|---|
| 640x480 | Default, most scenes |
| 512x768 | Portraits, vertical |
| 512x512 | Sprites, balanced |
| 768x768 | Square, detailed |

When in doubt: 640x480.

### Invocation

```bash
python scripts/pixelart_image.py "a wizard in a dark forest" \
  --tech nes --artistic medieval --ratio 640x480 \
  --output-dir artifacts/<project>/text2pixel
```

The script handles prompt building, Pollinations call, and PNG save. Output path: `artifacts/<project>/text2pixel/{slug}_{tech}_{artistic}_{w}.png`.

After the call, write `artifacts/<project>/text2pixel/summary.md` with: prompt, tech_style, artistic_style, resolution, Pollinations URL used, and any seed-swap or rephrase notes.

### Pollinations URL Contract

```
https://image.pollinations.ai/prompt/{url_encoded}?width=W&height=H&nologo=true
```

**Quirks:**
- Aggressive caching — same prompt = identical output (seed mostly ignored)
- Rate limit: ~1 request per 60 seconds. On 429 / network error: wait ≥60s, retry **once**, then fail clean. Do not loop.
- Max effective resolution: ~768×768.
- Anonymous, no API key.

### Anti-Hallucination Patterns

**Reliable subjects** (render cleanly):
- Cyberpunk/neon scenes, rain reflections, urban nights
- Mages/spellcasters with fire or magic particles
- Cats, animals, food, cozy interiors
- Samurai (better than knights for warrior subjects)
- Landscapes

**Risky subjects** (likely artifacts):
- Knights with raised swords (sword often duplicated, misplaced, or rendered as a building)
- Multi-action descriptions ("running while throwing a shield as the building explodes")
- Many objects clustered near a body

**Strategy when a risky subject is requested:**
1. Rephrase once toward a safer composition (mage instead of sword-knight; samurai instead of armored warrior).
2. Note the substitution in `summary.md` so the user understands what changed.
3. If the user explicitly insists, attempt the literal prompt and accept the risk.

**Prompt structure that works:**
```
[concrete subject + scene], pixel art, [tech] style, [artistic mods], [mood]
```

### Examples

| User says | Built prompt |
|---|---|
| "un gato mirando las estrellas" | a cat looking at the stars, pixel art, NES 8-bit style, limited color palette, warm colors, dithered shading |
| "ciudad cyberpunk pixel art" | a cyberpunk city street at night, pixel art, SNES sprite style, cyberpunk neon lights, futuristic, rain-slicked, purple and cyan |
| "un mago en un bosque oscuro" | a wizard casting a glowing spell in a dark forest, pixel art, NES 8-bit style, limited color palette, magical particles, mystical atmosphere |

---

## Flow 2 — Photo → Pixel Art

### Presets (14)

| Preset | Factor | Palette | Dither | Best for |
|---|---|---|---|---|
| gameboy | 10 | GAMEBOY_ORIGINAL (4) | bayer | Extreme retro green |
| nes | 10 | NES (63) | floyd | 8-bit characters |
| snes | 7 | 64 auto | floyd | 16-bit rich scenes |
| gba | 6 | 64 auto | none | Smooth handheld |
| pico8 | 8 | PICO_8 (16) | bayer | Fantasy console |
| c64 | 9 | C64 (16) | floyd | Commodore 64 look |
| vga | 7 | 256 auto | none | DOS era |
| arcade | 12 | 16 auto | none | Chunky 80s |
| clean | 4 | 64 auto | none | Maximum detail |
| detailed | 3 | 128 auto | none | High fidelity |
| minimal | 8 | 8 auto | floyd | Minimalist |
| mspaint | 8 | MS_PAINT (24) | none | Classic MS Paint |
| apple2 | 10 | APPLE_II_HI (6) | naive | Apple II |
| teletext | 12 | TELETEXT (8) | bayer | BBC Teletext |

### Named Palettes

**Hardware:** `NES`, `C64`, `ZX_SPECTRUM`, `PICO_8`, `GAMEBOY_ORIGINAL`, `GAMEBOY_POCKET`, `GAMEBOY_VIRTUALBOY`, `APPLE_II_LO`, `APPLE_II_HI`, `TELETEXT`, `CGA_MODE4_PAL1`, `CGA_MODE5_PAL1`, `MSX`, `MICROSOFT_WINDOWS_16`, `MICROSOFT_WINDOWS_PAINT`, `MONO_BW`, `MONO_AMBER`, `MONO_GREEN`

**Artistic:** `PASTEL_DREAM`, `NEON_CYBER`, `RETRO_WARM`, `OCEAN_DEEP`, `FOREST_MOSS`, `SUNSET_FIRE`, `ARCTIC_ICE`, `VINTAGE_ROSE`, `EARTH_CLAY`, `ELECTRIC_VIOLET`

### Dithering Methods

| Method | Speed | Look | Best for |
|---|---|---|---|
| none | Fastest | Crispest, visible banding | Clean modern look |
| bayer | Fast | Consistent ordered pattern | Retro hardware feel |
| floyd | Medium | Smoothest gradients | Portraits, landscapes |
| atkinson | Medium | Cleaner, less noise | Classic Mac aesthetic |

### Invocation

```bash
python scripts/pixelart.py "$PHOTO_PATH" --preset nes \
  -o artifacts/<project>/photo2pixel/{source-stem}_nes.png

# Or override palette/dither:
python scripts/pixelart.py "$PHOTO_PATH" --palette NEON_CYBER --dither atkinson \
  -o artifacts/<project>/photo2pixel/{source-stem}_neon_atkinson.png

# List options:
python scripts/pixelart.py --list-presets
python scripts/pixelart.py --list-palettes
```

After the call, write `artifacts/<project>/photo2pixel/summary.md` with: source photo path, preset chosen, palette, dither method.

### When to Override Preset Defaults

- **Brand palette match**: user mentions a specific palette feel ("neon", "pastel", "vintage rose") → override with the matching named palette.
- **Portrait of a person**: prefer `floyd` dither for smoother skin tones; `nes` or `snes` preset.
- **Logo or graphic with hard edges**: prefer `none` dither; `arcade` or `clean` preset.
- **Maximum nostalgia**: `gameboy` preset, no overrides.

---

## Default Choices (Headless)

When the user is vague, fall back to these defaults and document the choice in `summary.md`:

| Missing | Default |
|---|---|
| Tech style for text2pixel | `nes` if subject reads as a character (1–2 figures); `snes` if it reads as a scene (multi-element environment) |
| Artistic style for text2pixel | `auto` |
| Aspect ratio for text2pixel | `640x480` (landscape) or `512x768` (single portrait subject) |
| Preset for photo2pixel | `nes` |
| Palette for photo2pixel | preset's default |
| Dither for photo2pixel | preset's default |

## Rules

1. NEVER apply `pixelart.py` to Pollinations output — they are independent flows.
2. ALWAYS write a `summary.md` next to the PNG documenting the choices.
3. ALWAYS exit non-zero with `error.md` on a clean failure rather than hanging.
4. Default to one generation per request — the user can ask for a variation explicitly.
5. Never ask the user a question at runtime; document defaults in `summary.md`.

## Attribution

Vendored from https://github.com/Synero/pixel-art-studio (MIT). See `NOTICE` in this folder.
