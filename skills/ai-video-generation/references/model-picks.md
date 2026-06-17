# Video models — pick by capability

The catalog is live and these families evolve fast. **Verify any id with `ai-gen models --search` /
`ai-gen info` before relying on it** — capability, duration caps, audio support, and cost all vary.
Don't hard-code an id from memory into production.

## Capability matrix (families, not fixed ids)

| Family | Strong at | t2v | i2v | ref | extend | native audio |
|---|---|---|---|---|---|---|
| **Veo (`fal-ai/veo3.1/*`)** | premium quality, prompt adherence, audio | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Seedance (`bytedance/seedance-2.0/*`)** | motion realism, reference-to-video, cost/quality | ✓ | ✓ | ✓ | — | ✓ |
| **Kling (`fal-ai/kling-video/*`)** | detailed motion, control; i2v wants `start_image_url` | ✓ | ✓ | ~ | ✓ | ~ |
| **Wan (`wan/*`)** | budget/light; some variants the proxy can't price (exit 6) | ✓ | ✓ | ✓ | — | — |
| **Hailuo / MiniMax** | fast, good general motion | ✓ | ✓ | — | — | — |
| **Luma** | dreamlike motion, keyframes | ✓ | ✓ | — | ✓ | — |

(✓ = supported by at least one endpoint in the family; ~ = some endpoints. Confirm the *specific*
endpoint with `ai-gen info`.)

## How to choose

```bash
ai-gen models --category image-to-video --format json | jq -r '.models[].endpoint_id'
ai-gen models --search seedance
ai-gen info fal-ai/veo3.1/fast/image-to-video    # does it take --image? duration enum? --audio? cost?
```

Decision guide:
- **Need native audio in the clip?** Veo and Seedance (with `--audio on`) are the reliable picks.
- **Animating a still (i2v)?** Seedance, Veo i2v, Kling i2v (note Kling's `start_image_url`).
- **Multiple reference subjects/poses?** A `reference-to-video` endpoint (Seedance) with `--ref`.
- **Tight budget / quick draft?** A lighter Hailuo/Wan variant at low resolution + short duration.
- **First→last frame control?** A model exposing `end_image_url` (use `--first-frame`/`--last-frame`).

## Cost reality

Video is the most expensive modality — **estimate first** (`ai-gen estimate <id> --resolution …
--duration …`, param-aware) and guard with `--max-cost`. Cost scales with resolution × duration;
draft at `480p`/short before the final at target settings. A `wan/*` or niche model that the proxy
can't price fails-closed with **exit 6** — pick a priced alternative.

When `cinematic-video` and `fal-model-catalog` are installed they carry maintained picks + shot
grammar; this file is the self-sufficient core.
