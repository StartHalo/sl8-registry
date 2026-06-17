---
name: ai-gen
description: "How to drive the ai-gen CLI — the foundational substrate every SL8 media skill runs on. Covers finding fal.ai models (ai-gen models/info), the sync and queue run lifecycle, cost estimation and budgets, the versioned JSON result envelope, local-file and reference inputs, and the 14 exit codes. Load this whenever you call ai-gen directly, target a fal.ai endpoint id, need the CLI's output or error contract, debug an exit code, manage a queued request_id, or estimate generation cost — and it is the shared contract the image, video, and audio skills build on, so reach for it instead of guessing how the CLI behaves. Triggers: ai-gen, fal.ai model id, ai-gen models/info/estimate/status/result/doctor, hosted_urls, request id, exit code 6 7 10, queue a generation, how does ai-gen work."
license: MIT
metadata:
  author: sl8
  category: media
  tags: ai-gen, fal, cli, proxy, queue, media-generation, image, video, audio
---

# ai-gen — the media-generation CLI

## Purpose

`ai-gen` is the worker CLI that generates **any model on fal.ai** (image, video, audio — ~1,300
endpoints across every namespace) through the **SL8 service proxy**. The proxy holds the provider
keys and does billing; `ai-gen` never calls fal directly for generation. Model *discovery* uses
fal's live catalog, so `ai-gen models` is the live truth, not a curated list.

Every media skill in this catalog executes through `ai-gen`. This skill is the shared contract:
how to find a model, drive it correctly, read its output, and handle failure. The modality skills
(`ai-image-generation`, `ai-video-generation`, `ai-audio-generation`) and the production skills
delegate the CLI mechanics here instead of restating them.

## Golden rules

Internalize these five before any generation — they prevent the common, expensive mistakes.

1. **Verify the model id, then inspect its schema.** Get the id from `ai-gen models` (never invent
   one), and run `ai-gen info <id>` before passing any non-obvious parameter — it shows the exact
   param names, types, enums, defaults, reference caps, and status. Param names differ per family
   (Kling i2v wants `start_image_url`, not `image_url`).
2. **`hosted_urls[0]` is the stable output URL — and fal URLs EXPIRE.** Read `hosted_urls[]` (the
   normalized `*.fal.media` field) and `files[].local_path`. Download/persist promptly; never assume
   a hosted URL is durable. Never regex the `raw` payload — read `files[]` / `hosted_urls` / `text`.
3. **Estimate before anything expensive** (video, batches, hi-res). `ai-gen estimate <id> [params]`
   is param-aware (it scales with resolution/duration); `--max-cost <credits>` aborts pre-submit if
   the estimate is over budget. Video can cost 100–2000+ credits.
4. **Both `fal-ai/*` and bare namespaces route** (`bytedance/`, `wan/`, `xai/`, `alibaba/`, …). Use
   the id exactly as the catalog lists it. **Exit 6 means the proxy declined the model** — it was
   removed/blocked, or the proxy can't price it (fail-closed). On exit 6, pick an alternative with
   `ai-gen models --search <name>`.
5. **Run headless and report honestly.** `--format json` for anything an agent will parse. If a
   download fails (exit 14) the hosted URLs are still in the JSON — surface them, don't claim total
   failure. Don't blind-retry a parameter rejection (exit 7) — the proxy charges for it.

## The commands at a glance

| Job | Command | Default model |
|---|---|---|
| Any fal endpoint (universal runner) | `ai-gen run <id> [k=v ...]` | — (explicit `<id>`) |
| Image — text-to-image / edit / multi-ref | `ai-gen image "<prompt>"` | `fal-ai/flux/schnell` |
| Video — t2v / i2v / first-last / ref / extend | `ai-gen video "<prompt>" -m <id>` | — **`-m` required** |
| Audio — TTS / SFX / video→audio / transcribe | `ai-gen audio tts\|sfx\|v2a\|stt ...` | stt: `fal-ai/wizper` |
| Transcribe (alias of `audio stt`) | `ai-gen transcribe <audio>` | `fal-ai/wizper` |
| Find a model | `ai-gen models [--category\|--search\|--type\|--status]` | — |
| Inspect a model | `ai-gen info <id>` | — |
| Queue lifecycle | `ai-gen status <id>` · `result <id>` · `cancel <id>` | — |
| Cost & diagnostics | `ai-gen estimate <id>` · `balance` · `doctor` | — |

`image` runs **sync**; `video` and `audio v2a` default to the **queue** (long-running) and
auto-poll; `audio tts/sfx/stt` run sync. Override mode with `--sync` / `--queue` / `--async`.

## The core loop: discover → inspect → run

This is the discipline that keeps generations correct and cheap.

```bash
# 1. DISCOVER — find a live model id (don't invent one)
ai-gen models --category text-to-image --format json
ai-gen models --search seedance

# 2. INSPECT — read the schema before custom params
ai-gen info fal-ai/flux/schnell            # param names, enums, defaults, caps, status, example

# 3. RUN — typed flags + key=value / key:=<json> for raw params
ai-gen image "a watercolor fox" --aspect-ratio 16:9 --format json
ai-gen run fal-ai/flux/schnell prompt="a red dot" image_size=square --format json
```

Use `--strict-params` as a typo guard — it fails fast on a param the schema doesn't know, raising
exit 7 **client-side before submission** (so it's not charged) instead of letting the proxy charge for
an upstream rejection. See `references/model-discovery.md`.

## Reading the result

`--format json` emits the **versioned envelope** (`schema_version` `"2.0"`). The fields you read:

| Field | What it is |
|---|---|
| `success` | `true` on a real result; `false` → see the error envelope + `error.exit_code` |
| `hosted_urls[]` | **The stable output URLs** (`*.fal.media`). URLs EXPIRE — persist promptly |
| `files[].local_path` | Downloaded artifact path (absent with `--url-only` / `--no-download`) |
| `text` | Text output — **transcripts (STT) and text models** |
| `credits_used` | Actual credits charged (present on sync AND queue results) |
| `credits_basis` | `"result"` = authoritative · `"estimated"` = display-only (webhook reconciles) |
| `request_id` | Present for queue flows — keep it to re-fetch via `ai-gen result` |
| `raw` / `data` | Untouched provider payload — **do not regex; read the fields above** |

Full envelope + the error shape: `references/json-contract.md`.

## Queue lifecycle (video and slow models)

Video and `audio v2a` go through the queue. Either let `ai-gen` poll inline, or fire-and-forget:

```bash
ai-gen video "the fox runs" -m bytedance/seedance-2.0/image-to-video --image ./fox.png --async
# → prints a request_id; later, from ANY process:
ai-gen status <request-id> --wait     # poll to completion, then download
ai-gen result <request-id> -o ./out   # fetch a finished job; not-ready exits 0 (pollable)
```

A timeout is **exit 10** — the job may still finish; recover with `ai-gen result <request-id>`.
Details: `references/queue-lifecycle.md`.

## Cost discipline

```bash
ai-gen estimate bytedance/seedance-2.0/image-to-video --resolution 1080p --duration 10   # param-aware
ai-gen video "..." -m <id> --image a.png --max-cost 500    # abort (exit 13) if estimate > 500
ai-gen balance                                              # remaining account credits
```

`estimate` is param-aware via the proxy pricing endpoint and matches the actual charge. For a model
the proxy can't price it exits 12 (no estimate) — run it with `--max-cost` as the guard instead.

## Exit-code branching

Branch on the exit code, not on parsing prose. The high-value ones:

| Exit | Meaning | What to do |
|---|---|---|
| 0 | success | read `hosted_urls` / `files[].local_path` / `text` |
| 2 | usage / local validation (incl. >3 MB local input) | fix flags/params; host large files at a URL |
| 5 | insufficient credits | `ai-gen balance`; pick a cheaper model/settings |
| 6 | proxy declined the model (removed / blocked / unpriced) | `ai-gen models --search <name>` for an alternative |
| 7 | model rejected parameters | `ai-gen info <id>`; fix params — **do not blind-retry (charged)** |
| 8 | model not found upstream | id removed/renamed — `ai-gen models --search` |
| 9 | upstream/proxy infra (5xx) | retryable — `ai-gen` auto-retries; back off and retry |
| 10 | timeout (job may still finish) | `ai-gen result <request-id>` |
| 12 | feature not supported by the proxy (e.g. `cancel`) | don't depend on it; route around |
| 13 | `--max-cost` exceeded (nothing submitted) | raise the budget or choose cheaper settings |
| 14 | generated OK, download failed | **`hosted_urls` are in the JSON** — fetch them directly |

Full table with causes + remediation: `references/exit-codes.md`.

## Inputs and references

`--image`, `--video`, `--audio-file`, `--first-frame`, `--last-frame`, and repeatable `--ref` accept
a **local path, an http(s) URL, or a data URI**. Local files ≤ 3 MB are inlined automatically; larger
files need a public URL. Multi-reference models address inputs in the prompt as `@Image1`, `@Image2`,
`@Video1`, … (per-model caps come from the schema — check `ai-gen info`). Reuse one hosted URL across
steps instead of re-uploading. Details: `references/inputs-and-refs.md`.

## Output handling

Downloads go to `-o <dir>` or `$AI_GEN_OUTPUT_DIR` (default `/home/user/artifacts`). Use `--url-only`
to skip downloads (remember URLs expire) or `--no-download` to keep the full envelope without files.

## When to read a reference

Read the specific file — don't guess:

| Need | Reference |
|---|---|
| Every command, all flags, typed-flag coercion, `--params-file` | `references/command-reference.md` |
| The full success + error envelope; which field per modality | `references/json-contract.md` |
| All 14 exit codes with cause + exact remediation | `references/exit-codes.md` |
| `models` / `info` usage, catalog freshness, namespace routing | `references/model-discovery.md` |
| Async submit, cross-process fetch, timeout recovery | `references/queue-lifecycle.md` |
| Media inputs, the 3 MB inline limit, upload-once, `@ImageN` | `references/inputs-and-refs.md` |

## Quality criteria

- [ ] The model id came from `ai-gen models` and (for custom params) was inspected with `ai-gen info`.
- [ ] Expensive jobs (video/batches) were estimated or guarded with `--max-cost`.
- [ ] Output was read from `hosted_urls` / `files[].local_path` / `text` — never from `raw`.
- [ ] Hosted artifacts were downloaded/persisted (URLs expire).
- [ ] Failures were handled by exit code (no blind retry on 7; recover queue jobs via `result` on 10).
