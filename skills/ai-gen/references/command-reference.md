# ai-gen — command reference

Every command and flag, with examples. The model id is always opaque
(`{namespace}/{path...}`) — get it from `ai-gen models`, inspect with `ai-gen info`.

## Common flags (all generation commands: `run`, `image`, `video`, `audio`, `transcribe`)

| Flag | Meaning |
|---|---|
| `-m, --model <id>` | Model endpoint id (any fal namespace). Required for `video` and `audio tts/sfx/v2a`. |
| `-o, --output <dir>` | Download directory (default `$AI_GEN_OUTPUT_DIR` or `/home/user/artifacts`). |
| `--format text\|json` | `json` emits the versioned result envelope on stdout. Use for anything parsed. |
| `--url-only` | Print hosted URLs only; skip downloads (URLs EXPIRE). |
| `--no-download` | Keep the full envelope but skip downloads. |
| `--async` | Submit to the queue, print `request_id`, exit (fire-and-forget). |
| `--queue` / `--sync` | Force queue or sync mode (override the command default). |
| `--timeout <ms>` | Sync request timeout / queue max-wait (video default 15 min). |
| `--max-cost <credits>` | Abort pre-submit (exit 13) if the estimate exceeds this. |
| `--params-file <path\|->` | JSON params file, or `-` for stdin (lowest precedence; flags/k=v win). |
| `--strict-params` | Fail on a param the model schema doesn't know — typo guard. Caught client-side → exit 7, but **before** submission, so it's not charged. |
| `--refresh` | Bypass catalog/schema caches. |
| `key=value` | Raw model param (coerced: numbers/bools/`@file`). |
| `key:=<json>` | Raw model param as exact JSON (arrays/objects/exact types). |

**Typed convenience flags** (mapped + coerced per the model schema — e.g. `duration` is a *string*
on Kling/Veo/Seedance): `--aspect-ratio 16:9` · `--resolution 720p` · `--duration 5` ·
`-n/--num-images 2` · `--audio on|off` · `--seed 42`. Image-only: `-s/--size <preset>`.

Precedence: typed/`key=value` flags > `--params-file` > model defaults.

## `run <id> [k=v ...]` — universal runner

Any fal endpoint by id. No default model. Typed flags map to the schema's param names.

```bash
ai-gen run fal-ai/flux/schnell prompt="a red dot" image_size=square --format json
ai-gen run bytedance/seedance-2.0/image-to-video prompt="fox runs" image_url=./fox.png duration=5 --async
ai-gen run fal-ai/mmaudio-v2 --video clip.mp4 --async
```

## `image "<prompt>" [k=v ...]` — text-to-image / edit / multi-ref

Default `fal-ai/flux/schnell` (live-verified). Sync.

```bash
ai-gen image "a watercolor fox"                                  # default model
ai-gen image "a portrait photo" -m fal-ai/flux/dev               # specific model
ai-gen image "add a hat" --image original.png                    # edit (model-dependent)
ai-gen image "@Image1 and @Image2 together" -m <edit-model> --ref a.png --ref b.png   # multi-ref
ai-gen image "abstract art" -n 4 --aspect-ratio 1:1 --format json
```

## `video "<prompt>" -m <id> [k=v ...]` — t2v / i2v / first-last / ref / extend

**`-m` is required.** Queue by default (auto-polls). No silent default model.

```bash
ai-gen video "drone over a coastline" -m fal-ai/veo3.1/fast/image-to-video --image shore.png --duration 5
ai-gen video "person smiles" -m bytedance/seedance-2.0/image-to-video --image still.png --audio on
ai-gen video "smooth morph" -m <model> --first-frame start.png --last-frame end.png
ai-gen video "@Image1 walks in" -m <ref-model> --ref a.png --ref b.png
ai-gen video "continue the action" -m <extend-model> --video clip.mp4 --duration 10
ai-gen video "..." -m <model> --async         # fire-and-forget → request_id
```

## `audio tts|sfx|v2a|stt` — speech, sound, foley, transcription

```bash
# tts (text-to-speech) — sync, -m required
ai-gen audio tts "Welcome to SL8" -m fal-ai/kokoro/american-english --format json

# sfx (sound effects / short music) — sync, -m required
ai-gen audio sfx "car engine revving" -m fal-ai/elevenlabs/sound-effects/v2 --duration 8

# v2a (video → audio / foley) — queue, -m + --video required
ai-gen audio v2a "ambient room tone" --video scene.mp4 -m fal-ai/mmaudio-v2 --async

# stt (speech-to-text) — sync, default fal-ai/wizper; reads `text` from the envelope
ai-gen audio stt recording.wav --format json
ai-gen audio stt podcast.mp4 --task translate --language es
```

## `transcribe <audio>` — v1 alias of `audio stt`

```bash
ai-gen transcribe podcast.mp3                 # prints transcript to stdout
ai-gen transcribe audio.wav -o transcript.txt # -o writes the transcript to a FILE here
```

## `models` — find a model (live catalog)

```bash
ai-gen models --category image-to-video --format json   # dated, reproducible snapshot
ai-gen models --search seedance
ai-gen models --type video                              # v1 shorthand: image|video|audio
ai-gen models --status active|deprecated
ai-gen models --limit 100                               # text mode truncates to 50 by default
```

Catalog = fal's discovery API, cached 24 h (`--refresh` bypasses; offline falls back to a bundled
snapshot). JSON output carries `fetched_at` + `source`.

## `info <id>` — inspect a model

```bash
ai-gen info fal-ai/flux/schnell                # status, category, params (types/enums/defaults), caps, example
ai-gen info bytedance/seedance-2.0/reference-to-video --format json
```

Always run before passing non-obvious params. `describe` is a deprecated alias — use `info`.

## `status` / `result` / `cancel` — queue lifecycle

```bash
ai-gen status <request-id>            # -m optional for jobs submitted from this machine
ai-gen status <request-id> --wait     # poll to completion + download
ai-gen result <request-id> -o ./out   # fetch a finished job from ANY process; not-ready exits 0
ai-gen cancel <request-id>            # exit 12 — not supported by the proxy yet
```

## `estimate` / `balance` / `doctor` — cost & diagnostics

```bash
ai-gen estimate bytedance/seedance-2.0/image-to-video --resolution 1080p --duration 10   # param-aware
ai-gen balance                        # remaining account credits
ai-gen doctor                         # config, proxy reachability, capability table, catalog freshness
```
