# Video parameters

Typed flags map to the schema; raw `key=value` passes the rest. **`ai-gen info <id>` is the truth** —
video families differ more than image families. `--strict-params` catches typos before the proxy
charges for an upstream rejection.

## Typed flags

| Flag | Maps to (typical) | Notes |
|---|---|---|
| `--duration <value>` | `duration` | **Usually a STRING** on Veo/Seedance/Kling (e.g. `"5"`), numeric on some others. `ai-gen info` shows the allowed set — many models only accept specific values (5, 10). |
| `--resolution <res>` | `resolution` | `480p` / `720p` / `1080p` (and sometimes `2k`/`4k`). Cost scales steeply with this. |
| `--aspect-ratio <r>` | `aspect_ratio` | `16:9`, `9:16`, `1:1`. Set it up front — re-rendering to change it is expensive. |
| `--audio on\|off` | `generate_audio` | native audio where supported (Veo, Seedance). Off by default on most. |
| `--seed <n>` | `seed` | reproducibility across iterations. |

### The duration gotcha
`--duration 5` may need to reach the model as the **string** `"5"`. The typed flag coerces per
schema, but if you pass it as a raw `key=value` use the exact type — `duration:="5"` (JSON string)
when the schema wants a string. When in doubt, `ai-gen info <id>` shows the type and allowed values.

## Media inputs (per branch)

| Branch | Flag(s) | Schema param (typical) |
|---|---|---|
| image-to-video | `--image` | `image_url` (Kling: `start_image_url`) |
| first→last | `--first-frame` + `--last-frame` | `image_url` + `end_image_url` |
| reference-to-video | `--ref` (repeatable) | `reference_image_urls` (cap per schema) |
| extend | `--video` | `video_url` |

Local inputs ≤ 3 MB inline; larger need a public URL. Reuse one hosted URL across attempts.

## Cost control

```bash
ai-gen estimate <id> --resolution 1080p --duration 10   # param-aware; matches the actual charge
ai-gen video "..." -m <id> --image a.png --max-cost 500 # abort (exit 13) if over budget
```
Read the real `credits_used` from the result envelope. Draft at `480p`/short, finalize at target.
