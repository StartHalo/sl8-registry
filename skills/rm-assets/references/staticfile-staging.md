# staticFile() staging contract — where rm-assets lands files and how the composition reads them

`rm-assets` is the **only** skill that brings external pixels into a project: a background-removed
**cutout** and a captured **site/screen** frame. Both must end up where Remotion's `staticFile()` can
resolve them, or `rm-build`'s composition will reference a path that does not exist at render time. This
doc is the contract every later skill (`rm-build`, `rm-validate`, `rm-render`, `rm-brand-extract`) relies
on. **rm-assets does not author or render anything** — it only stages source assets.

## 1. How `staticFile()` resolves

In Remotion, `staticFile("foo/bar.png")` resolves to `<remotion-project>/public/foo/bar.png`. The
argument is **always relative to `public/`** — never an absolute path, never a path outside `public/`.
Therefore any image a composition layers must physically live under
`artifacts/<project>/remotion-project/public/`. Native `<img>`/`<video>` tags and `import`ed image URLs
are forbidden by the composition contract; assets come in via `<Img src={staticFile(...)}/>` /
`<OffthreadVideo src={staticFile(...)}/>` only.

## 2. The two-location split (what rm-assets writes)

| asset | canonical / durable copy | staged copy (render-reachable) | referenced as |
|---|---|---|---|
| cutout (RGBA matte) | `assets/cutouts/<name>.png` | `remotion-project/public/cutouts/<name>.png` | `staticFile("cutouts/<name>.png")` |
| capture frames | — (frames live only in public) | `remotion-project/public/captures/<slug>/scroll-NNN.png`, `…/contact-sheet.jpg` | `staticFile("captures/<slug>/<file>.png")` |
| capture downloaded assets | — | `remotion-project/public/captures/<slug>/assets/…` | `staticFile("captures/<slug>/assets/…")` |
| capture design tokens | `assets/captures/<slug>/extracted/tokens.json` (+ design-styles/fonts-manifest/visible-text/page.html) | — (NOT a render asset) | read by `rm-build` / `rm-brand-extract`, never `staticFile`d |

Rationale:
- **Cutouts** keep a durable canonical copy under `assets/cutouts/` (the artifact-path map the design
  doc declares) **and** a staged copy under `public/cutouts/` so the render finds it. The canonical copy
  survives even if `public/` is rebuilt.
- **Capture frames** are RE-TARGETED straight into `public/captures/<slug>/` — they are large and only
  ever used as backdrops, so a second durable copy is wasteful; if the project is rebuilt, re-run the
  capture.
- **Design tokens** (palette/fonts/headings) are metadata for `rm-build`'s `:root`/theme decisions and
  for `rm-brand-extract`; they are not pixels the renderer reads, so they stay in `assets/` out of the
  render bundle.

## 3. Path conventions (stable — do not rename)

```
artifacts/<project>/
  assets/
    cutouts/<name>.png                       # canonical matte
    captures/<slug>/extracted/tokens.json    # design tokens (+ design-styles.json, fonts-manifest.json,
                                             #   visible-text.txt, page.html)
  remotion-project/
    public/
      cutouts/<name>.png                     # staged matte  -> staticFile("cutouts/<name>.png")
      captures/<slug>/scroll-000.png …       # staged frames -> staticFile("captures/<slug>/scroll-000.png")
      captures/<slug>/contact-sheet.jpg
      captures/<slug>/assets/…               # downloaded site assets
```

`<project>`, `<name>`, `<slug>` are runtime substitution tokens — never hardcode a real value.

## 4. Ordering / merge contract with `rm-build` (load-bearing)

`rm-assets` runs at **phase 4** (alongside `rm-voiceover`), *before* `rm-build`'s `init.sh` copies the
bundled starter into `remotion-project/` at **phase 5**. So when a cutout/capture is staged, the project
app may not exist yet. rm-assets handles this by `mkdir -p`-ing `remotion-project/public/...` and writing
there directly, **pre-seeding** `public/`.

Therefore `rm-build`/`init.sh` MUST treat the starter copy as a **merge that preserves a pre-seeded
`public/`** — copy-if-absent at file granularity; never `rm -rf remotion-project/public` or overwrite a
staged `cutouts/`/`captures/` subtree. The starter ships an empty `public/`, so a clean merge is safe.
(If `init.sh` ran first and the app already exists, rm-assets simply stages into the existing `public/`.)

If a staged asset is ever lost (project rebuilt), recover by: cutouts → re-`cp` from `assets/cutouts/`
into `public/cutouts/`; captures → re-run `capture.sh`.

## 5. Referencing examples (for rm-build)

```tsx
import { Img, OffthreadVideo, staticFile } from "remotion";

// founder cutout layered over a gradient
<Img src={staticFile("cutouts/founder.png")} />

// a captured brand frame as a backdrop
<Img src={staticFile("captures/acme/contact-sheet.jpg")} />
```

Forbidden (the `rm-validate` contract lint rejects these): native `<img>`/`<video>`; absolute paths
(`/home/user/...`); `import logo from "..."`; any path that escapes `public/`.

## 6. Keyless / local guarantees

- Background removal: `ai-gen run fal-ai/bria/background/remove --image <src>` — keyless SL8 proxy
  (~1 credit). Present only in the `sl8-animation` runtime; absent on host/dev.
- Capture: `hyperframes capture` (present on `sl8-animation`) or the runtime's Chrome Headless Shell
  (`$CHROME_HEADLESS_SHELL`, default `/opt/remotion/chrome-headless-shell`) as a fallback. No auth, no
  HeyGen cloud, no cloud render.
- On an unreachable proxy / missing source / unloadable URL: record the block in `state.md` and stop —
  never fabricate or substitute an asset, never prompt (headless).
