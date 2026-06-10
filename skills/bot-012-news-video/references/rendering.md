# Rendering — the bundled project, the command, troubleshooting

## The bundled Remotion project (`scripts/remotion-template/`)
```
remotion-template/
├─ package.json            # react + roughjs; remotion family is installed by render.sh (version-aligned)
├─ tsconfig.json
├─ src/
│  ├─ index.ts             # registerRoot(Root)
│  ├─ Root.tsx             # registers News-16x9 / News-9x16 / News-1x1 (duration from props.durationSeconds)
│  ├─ NewsVideo.tsx        # dispatcher: normalizes the NewsDoc, renders props.style's root
│  ├─ engine/              # SHARED contract — fonts, tokens, rng, pacing, StyleConfig, SafeZone, primitives
│  └─ styles/<4 folders>/  # the four style implementations (index.tsx exports Root)
└─ (node_modules/, public/ created at render time)
```
You copy this whole folder to `artifacts/<project>/video/`, drop a `props.json` beside `package.json`, and render. You do **not** edit `src/` at runtime.

## props.json shape
```json
{ "style": "<one of the 4 ids>", "durationSeconds": 12, "seed": 1,
  "brand": { "accent": "#C8102E", "accentAlt": "#0B1F3A", "label": "ACME" },
  "doc": { ...the exact newsdoc.json contents... } }
```
`doc` accepts the rich NewsDoc (with `source_span`) or the flat shape — `normalizeDoc` handles both.

## Render command (what render.sh runs)
```bash
npx remotion render src/index.ts News-9x16 ../exports/<style>-9x16.mp4 \
  --props=./props.json --codec=h264 --image-format=jpeg --gl=angle --log=info
```
- `News-16x9`=1920×1080, `News-9x16`=1080×1920, `News-1x1`=1080×1080. 30 fps, H.264.
- `render.sh "16x9 9x16 1x1" ../exports` loops the ARs and writes `<style>-<ar>.mp4`.

## Troubleshooting (in order of likelihood)
1. **Chrome Headless Shell** → On **`sl8-animation`** the shell is **pre-installed** at `/opt/remotion/chrome-headless-shell` (`$CHROME_HEADLESS_SHELL`); `render.sh` detects it and renders with `--browser-executable=<path>` — **no download**. (Remotion has no env var for the browser path and E2B `commands.run` ignores image ENV, so the explicit flag is required — render.sh handles it.) On `sl8-base`/local dev there is no pre-installed shell, so `render.sh` installs the apt libs + runs `npx remotion browser ensure` (one-time ~300–400 MB). If a render fails on `sl8-animation`, `render.sh` auto-falls-back to `browser ensure`. This is the #1 first-render issue on a fresh sandbox.
2. **Version skew** ("two different versions of remotion") → all `remotion`/`@remotion/*` must be the SAME version. `render.sh` installs them aligned to `npm view remotion version`; if you hand-install, match versions exactly.
3. **Font load error** → fonts load via `@remotion/google-fonts` at bundle time (engine/fonts.ts). A transient network failure during install can break it; re-run the install step.
4. **Blank / fallback text in the frame** → usually a font not ready; the engine blocks on fonts, so this points at a load failure (see 3). Confirm via the vision grade, not the filename.
5. **Render OK but looks wrong** → that's a props/data issue (wrong style for the story, missing key_phrases), not a code bug — fix `props.json` and re-render. Only touch `src/` if the data is right and a component is genuinely broken (then it's a skill iteration, not a runtime edit).
