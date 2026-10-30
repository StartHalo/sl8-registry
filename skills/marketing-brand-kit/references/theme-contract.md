# The kit file: contract, roles and merge rules

## Contents
- [The contract as published](#the-contract-as-published)
- [What changes on this machine](#what-changes-on-this-machine)
- [Closed vocabularies](#closed-vocabularies)
- [Merge rules](#merge-rules)
- [Mapping extracted values to roles](#mapping-extracted-values-to-roles)
- [Folder layout](#folder-layout)

## The contract as published

The theme data contract from Creative Claw 5.4.2 (`references/workflows/brand-theme.md` lines 10-41,
Apache-2.0), copied unchanged; research id `creative-claw/cc-brand-theme@theme data contract (structured format)`.
Copyright Creative Claw and its contributors. Licensed under the Apache License, Version 2.0; the
licence text is the `LICENSE` file at the root of the Creative Claw 5.4.2 package it was taken from
(<https://www.apache.org/licenses/LICENSE-2.0>). Everything outside the JSON block below is SL8's.

```json
{
  "notes": "Audience, tone, visual direction, do/don't guidance in Markdown.",
  "referenceImageUrl": "https://...",
  "fonts": [
    { "name": "Inter", "source": "google", "role": "heading" },
    {
      "name": "Acme Sans",
      "source": "custom",
      "role": "body",
      "files": [
        {
          "url": "https://.../acme-regular.woff2",
          "weight": 400,
          "style": "normal",
          "format": "woff2"
        }
      ]
    }
  ],
  "colors": [
    { "name": "Brand blue", "hex": "#2563EB", "role": "primary" },
    { "name": "Ink", "hex": "#111827", "role": "fg" }
  ],
  "logos": [
    {
      "name": "Primary mark",
      "url": "https://.../logo.svg",
      "variant": "color",
      "hasBackground": false
    }
  ]
}
```

The kit also holds `images[]` (the full reference-image array; its first item is the thumbnail).

## What changes on this machine

The kit is a local file, not a hosted theme, so:

- **Every `url` field** (`fonts[].files[].url`, `logos[].url`, `referenceImageUrl`, each `images[]`
  item) holds a path relative to the kit folder (`source/acme-logo-color.png`), or the original
  URL only while no stable copy exists. `kit.mjs verify` fails a URL that looks signed or temporary.
- **Added keys** (top-level, so they shallow-merge like `notes`):
  - `name`: the kit's name, unique and case-insensitive across this machine's kits;
  - `assets[]`: one row per stable copy, `{name, kind, path, source, tags[], sha256}`, written by
    `kit.mjs import` (names unique within the kit; the source URL is kept beside the copy);
  - `missing[]`: `{item, reason}` for a checklist item that is absent or could not be fetched;
  - `unconfirmed[]`: `{item, candidates[], evidence, recommended}` for an ambiguous value waiting for
    the customer. Nothing in it is saved as a colour, font or logo until it is confirmed.
- `hasBackground`, the role vocabularies and the replace-whole-collection rule are unchanged.

## Closed vocabularies

| Field | Values |
|---|---|
| `colors[].role` | `primary`, `secondary`, `accent`, `bg`, `fg`, `muted` |
| `fonts[].role` | `heading`, `body`, `mono`, `accent` |
| `fonts[].source` | `google`, `custom` (a custom font lists `files[]` with weight, style and format read from each file) |
| `logos[].variant` | `light`, `dark`, `mono`, `color` |
| `assets[].kind` | `logo`, `font`, `image`, `reference` |

Downstream skills read these roles, so a value outside them is refused (`kit.mjs validate`).

## Merge rules

- Top-level keys shallow-merge: a patch replaces only the keys it names.
- Naming `colors`, `fonts` or `logos` replaces the **whole** collection; naming `images` replaces the
  whole array, and its first item becomes the thumbnail. So a patch always carries the complete
  collection, ordered on purpose. `kit.mjs merge` refuses a patch that would drop entries unless
  `--allow-remove` is passed because the customer asked to remove them.
- `--override` replaces the whole kit, and only when the customer asks for that.
- `--set-default` makes the kit the default, and only when asked. The first kit on a machine becomes
  the default by itself; a kit is never deleted, and the default never changed, without the
  customer's explicit words.
- Current arrays and roles only: legacy free-form keys (`palette`, `typography`, `brandColors`,
  `logo`) are refused.
- Read before writing: `merge` needs the sha256 that `kit.mjs show` printed, and refuses when the
  kit changed since (the refusal prints the current sha). The token covers every key except `assets[]`,
  so `kit.mjs import` after a read does not invalidate it. The previous file is kept as `theme.json.bak`.
- `--override` keeps `name`, `assets[]`, `missing[]` and `unconfirmed[]` unless the patch names them;
  a patch that names `assets` and drops rows needs `--allow-remove`, like any other collection.
- Confirming an `unconfirmed[]` value is one patch: the full `colors` (or `fonts`, `logos`) collection
  with the value added, and `unconfirmed` without its entry.
- Request only the weights a family ships; a weight it does not ship renders a synthesised (fake) bold.
  A custom font's weights are the ones in its `files[]`.

## Mapping extracted values to roles

`browser.mjs extract` proposes candidates with flags; the agent assigns roles with these rules
(restated from HyperFrames' film reference, research id `hyperframes/hyperframes-2afd9d#91`):

- The browser's default link blue (`#0000EE`) and status reds, greens and ambers are never the
  accent. The accent is a colour that recurs across most of the page's roles (headings, buttons,
  borders), not one confined to links or alerts.
- An icon font is never the heading or body font.
- A monospace family captured from code or pre text goes to the `mono` role.
- A family whose files are on `fonts.gstatic.com` is `source: google` (name only, no files). For a
  custom family with one file per `unicode-range` subset, keep the subset that covers the customer's
  language and list the others under `missing[]`.
- Colours in oklch, lab, hsl or `rgb`/`hsl` triples are converted to sRGB hex by the browser and
  flagged `converted from <space>`; confirm a converted brand colour with the customer.
- Brand values come from the customer's files or the brand's official site; a palette recalled from
  the company's name, or read off a generated image, is never a brand value
  (`fal/brandedgraphics-96ba6e#2`). A colour read off `page.png` or any screenshot is a guess.

## Folder layout

```
artifacts/brand-kits.json            # every kit on the machine, and the default
artifacts/brand-<kit>/
  theme.json  theme.json.bak         # the kit, and the file before the last write
  source/                            # stable copies of logos, fonts, product images, style references
  source/extracted/                  # page.html, font-face.css (each @font-face with its unicode-range), page.png, candidates.json
  prepared/                          # transparent logos, enlarged references, rasterised SVGs (originals untouched)
  manifest.json  gates/  qc/         # paid calls (media-ai-gen manifest), gates, check sheets
  capture.md  confirm.md             # the capture form and the confirmation page, when a job needs them
```

Copied font files are named by family, weight and style (`acme-sans-400-italic.woff2`), so an
upright and an italic "Regular" never overwrite each other (`hyperframes/hyperframes-2afd9d#92`).
