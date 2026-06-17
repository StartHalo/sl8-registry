# ai-gen — model discovery & namespace routing

The catalog is fal's **live discovery API** (~1,300 endpoints), cached 24 h. What `ai-gen models`
lists is the truth — never invent or guess an endpoint id.

## Find a model

```bash
ai-gen models --category text-to-image          # by capability category
ai-gen models --category image-to-video --format json
ai-gen models --search seedance                 # free-text over id/name/description/tags
ai-gen models --type video                       # shorthand groups: image | video | audio
ai-gen models --status active                    # or --status deprecated
ai-gen models --refresh                          # bypass the 24 h cache
```

Common categories: `text-to-image`, `image-to-image`, `text-to-video`, `image-to-video`,
`reference-to-video`, `text-to-audio`/`text-to-speech`, `speech-to-text`, `video-to-audio`. JSON
output carries `fetched_at` + `source` and is reproducible. Text mode truncates to 50 rows
(`--limit` to widen). Offline, `ai-gen` falls back to the bundled release snapshot.

## Inspect before you parametrize

```bash
ai-gen info fal-ai/flux/schnell
ai-gen info bytedance/seedance-2.0/reference-to-video --format json
```

`info` shows: status (active/deprecated), category, the **parameter schema** (each param's name,
type, required flag, enum values, default), **reference caps** (how many `--ref` inputs, addressed
as `@Image1`…), an `estimated_credits` hint, and a ready-to-edit example invocation. Param names
vary by family — e.g. Kling v3 i2v wants `start_image_url`, most others `image_url`; the typed
`--image` flag maps to the right one *per schema*, but raw `key=value` params must match exactly.

## Namespace routing (the current reality)

The SL8 proxy (Service Proxy v2) routes **any fal namespace** — `fal-ai/*`, `bytedance/`, `wan/`,
`xai/`, `alibaba/`, `openai/`, `luma/`, … Use the id exactly as the catalog gives it.

- Most models live under `fal-ai/*`. Modern video lives under bare namespaces
  (`bytedance/seedance-2.0/...`, `xai/grok-imagine-video/...`) — these route fine.
- **Exit 6 = the proxy declined this model**: it was removed, policy-blocked, or the proxy can't
  price it (it fail-closes rather than risk an unmetered charge — some `wan/*` and niche models do
  this today). The fix is always "pick another model," via `ai-gen models --search <name>`.
- Ids are opaque slugs. Two-segment v1 aliases (`fal-ai/flux-schnell`) still resolve to the real
  path (`fal-ai/flux/schnell`) with a hint, but prefer the canonical full path from the catalog.

## Stale or surprising results

| Symptom | Fix |
|---|---|
| A known model isn't listed | `ai-gen models --refresh` (cache is 24 h) |
| `exit 8 Application "x" not found` | id removed/renamed upstream — `ai-gen models --search <name>` |
| `exit 6` on a specific id | model declined — choose an alternative from the catalog |
| Catalog command works but generation fails with `exit 3/4` | discovery needs no auth; generation needs `SL8_SESSION_TOKEN`/`SL8_API_URL` |
