# Render runtime — the keyless local Remotion render path

> Reference for `scripts/render.sh`. Confirmed against the `sl8-animation` runtime facts (Remotion
> **4.0.473** + Chrome Headless Shell at `/opt/remotion/chrome-headless-shell` + ffmpeg/ffprobe + Node 22)
> and the BOT-032 PoC (host, 2026-06-25). The render is **100% local and keyless** — headless Chrome +
> FFmpeg, **no AI model in the render path**. ai-gen supplies only the upstream VO/ASR/matte assets.

## The 7 pieces render.sh keeps from BOT-014's battle-tested script

BOT-014's `render.sh` is the proven base. `rm-render` keeps its load-bearing parts and **generalizes off
the fixed `News-*` id** (BOT-014 hard-coded `News-$AR`) by reading the composition prefix + output
basename from `props.json`.

### 1. Pin EVERY `@remotion/*` to ONE version (skew is the #1 render break)
Every `remotion` + `@remotion/*` package must resolve to the **same** version, and that version must match
the **render engine** that actually runs. render.sh resolves the target `RV` in priority order:

1. the **GLOBAL `remotion` binary** version (`remotion --version`) — the true engine on `sl8-animation`;
2. the installed `remotion/package.json` version;
3. `npm view remotion version` (host fallback);
4. the starter pin `4.0.473`.

It then re-pins `package.json` (`remotion` + every `@remotion/*` dep) to `RV` and runs `npm install`
**only on a mismatch** (or when `node_modules/remotion` is absent). Leading with the global binary's
version (not blindly `npm view`) is deliberate: pinning project deps to a version newer than the global
binary *re-introduces* the skew this step exists to kill. The starter ships pinned to `4.0.473`;
re-verify the runtime version at **Test 4b** and re-pin if `sl8-animation` moved.

> Symptom of skew: `Cannot use @remotion/x@A with remotion@B — they must have the same version.`

### 2. `--browser-executable=$CHROME_HEADLESS_SHELL` (E2B doesn't inherit image ENV)
`sl8-animation` ships a pre-downloaded **Chrome Headless Shell** at `/opt/remotion/chrome-headless-shell`
(also `$CHROME_HEADLESS_SHELL`). Remotion has **no env var** for the browser path **and** E2B
`commands.run` does **not** inherit the image's ENV — so the path must be passed **explicitly** with
`--browser-executable`, or Remotion re-downloads Chrome into `node_modules/.remotion` (slow, sometimes
fails offline). render.sh:
- pinned shell present (`-x`) → pass `--browser-executable=$CHROME_SHELL`;
- expected but missing in a sandbox (`$CHROME_HEADLESS_SHELL` set or `/opt/remotion` exists) →
  **self-heal** with `remotion browser ensure` (one-time), then pass it;
- **host/dev** (var empty, no `/opt/remotion`) → **omit** the flag and let Remotion auto-resolve the
  system/ensured Chrome. The host playground runs the same script unchanged.

There is no HeyGen-style auth and no cloud — Chrome + FFmpeg do everything.

### 3. The mandated render flags
Per AR (cwd = the `remotion-project` dir):
```bash
remotion render src/index.ts Studio-<ar> <out> \
  --props=./props.json \
  --codec=h264 --image-format=jpeg --gl=angle --concurrency=1 \
  --crf=<28|18|14> [--scale=2]  [--browser-executable=<shell>]  --log=info
```
- `--concurrency=1` — **mandatory in-sandbox.** The ~1.9 GB template **OOMs (Exit-137)** above the
  ~1.9 GB ceiling at higher worker counts (REQ-005). One worker trades wall-time for staying under the cap.
- `--codec=h264` in an MP4 container, **30 fps** (the engine's `FPS=30`).
- `--gl=angle` — the headless GL backend the shell expects; avoids blank/CPU-software frames.
- `--image-format=jpeg` — faster frame capture than png for h264.
- `--crf` — quality knob: `draft=28` (fast, default), `standard=18`, `high=14` (lower = better).
- `--scale=2` — **only** for a `-4k` token; upsamples the SAME orientation at 2× device-scale.

### 4. GLOBAL `remotion` binary, not `npx --yes`
`remotion` is on `PATH` in `sl8-animation`. Calling it directly is **~25× faster** than `npx --yes
remotion …`, which re-resolves and can re-download the package every invocation. render.sh uses
`command -v remotion` and falls back to the **local** `npx remotion` (no `--yes`) on host.

### 5. Composition id + output basename from `props.json` (the generalization)
BOT-014 hard-coded `News-$AR`. render.sh instead reads:
- `props.json` `.compositionPrefix` (default **`Studio`**, the starter's `Root.tsx` contract) → the
  composition id is `<prefix>-<ar>` (`Studio-16x9` / `Studio-9x16` / `Studio-1x1`);
- `props.json` `.name` (default the `<project>` slug = the parent dir) → the output basename.

These two keys are render metadata; the schema is a plain `z.object`, so Remotion strips unknown keys
before the component sees them — they never reach `StudioVideo`. The rest of `props.json` is the real,
schema-valid props `rm-build` writes (brand/title/stat/durationSeconds/seed/…).

`staticFile()` assets must already be staged into `public/` by `rm-build`/`rm-assets`; render.sh only
ensures `public/` exists — it does not stage or call any model.

### 6. ffprobe-verify codec / dims / fps / duration (+ audio)
After each render, render.sh fails the AR unless:
- `codec_name == h264`;
- `width × height` == the expected dims for the AR/scale (table below);
- a frame rate is reported and `duration > 0`.

When `assets/vo/*.wav` exists, it also confirms an **audio stream** (`-select_streams a:0`). A silent MP4
when VO was expected means the `<Audio>` isn't a direct child of the composition — fix in `rm-build`,
never here.

### 7. Extract frames for the vision grade
`ffmpeg -ss <t> -i <out> -frames:v 1 <exports>/frames/<name>-<ar>-at-<t>s.png` per `verify-at` second
(default `1 / mid / end-1` from `durationSeconds`). These PNGs are what the session **reads with its own
vision** to grade legibility, composition, motion, brand, and (JTBD-2) figure fidelity — the media-judge
gate. **Never** declare done from the filename or file size.

## Aspect ratio = a separate `<Composition>`, never a flag

In Remotion the root dims live in `<Composition width height>`. The starter registers one per AR:
`Studio-16x9` (1920×1080), `Studio-9x16` (1080×1920), `Studio-1x1` (1080×1080). `--scale` only
**upsamples within the same orientation** (4k); it **cannot rotate** 16:9 into 9:16.

Therefore:
- **A different orientation is a RE-AUTHORED composition** — `rm-build` adds the target `<Composition>`
  (e.g. `Studio-9x16` at 1080×1920) and lays the content out for it; you then render it natively.
- render.sh enumerates registered ids (`remotion compositions`); a requested AR whose `<Composition>`
  isn't registered **fails cleanly** with a route to `rm-build` (it does **not** produce a stretched or
  letterboxed file).

| AR token | composition id | scale | expected dims |
|---|---|---|---|
| `16:9` | `Studio-16x9` | 1 | 1920×1080 |
| `9:16` | `Studio-9x16` | 1 | 1080×1920 |
| `1:1`  | `Studio-1x1`  | 1 | 1080×1080 |
| `16:9-4k` | `Studio-16x9` | `--scale=2` | 3840×2160 |
| `9:16-4k` | `Studio-9x16` | `--scale=2` | 2160×3840 |
| `1:1-4k`  | `Studio-1x1`  | `--scale=2` | 2160×2160 |

## Audio (when VO/music is present)
If `04-timing.json` / `assets/vo/*.wav` exist and the composition mounts the audio as a **child of the
root** (the contract), the rendered MP4 carries an audio stream. Confirm with
`ffprobe -select_streams a:0 -show_entries stream=codec_name`. Audio assets come from `ai-gen` Kokoro TTS
(`rm-voiceover`); the render never calls a model.

## Cost & latency
The render path is **free** (local Chrome + FFmpeg, no credits). Budget roughly **1 s wall per 1 s of
1080p draft** at `--concurrency=1` (a 15 s video ≈ 15–30 s render at draft; longer at `standard`/`high`
or 4k `--scale=2`). Render `draft` while iterating; switch to `standard` only for the final pass.

## Gotchas quick-reference
- **`@remotion/* must have the same version`** → version skew (piece 1). Re-pin all deps to the GLOBAL
  binary's version.
- **Exit-137** → OOM. Confirm `--concurrency=1`; the ~1.9 GB ceiling is REQ-005. Don't raise concurrency.
- **Chrome re-downloads / blank frames** → `--browser-executable` wasn't passed (E2B ENV not inherited);
  render.sh passes it. On host the var is empty → omit, Remotion auto-resolves.
- **`outputResolution …` / wrong dims** → a different orientation; re-author the `<Composition>` in
  `rm-build`. `--scale` can't rotate.
- **`unbound variable` on old bash** → guarded by `${VAR:-}` / `${1:-}`; this script is bash 3.2 clean
  (no `timeout`, no `mapfile`, no GNU-only flags).
- **Silent render** → `<Audio>` not a child of the composition root; fix in `rm-build`.
- **`remotion compositions` errors** → the bundle is broken; `rm-validate`/`rm-build` should have caught
  it. Fix there, then re-render.
