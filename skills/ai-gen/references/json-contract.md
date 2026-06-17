# ai-gen — JSON output contract

`--format json` (and any non-TTY run) emits a **versioned envelope**. `schema_version` is `"2.0"`.
Mirror schemas ship in the package at `schemas/result.schema.json` and `schemas/error.schema.json`.

## Success envelope

```jsonc
{
  "schema_version": "2.0",
  "success": true,
  "model": "fal-ai/flux/schnell",          // canonical id exactly as submitted
  "request_id": "019eb357-…",              // present for queue flows
  "files": [
    { "url": "https://v3b.fal.media/files/…",
      "local_path": "/home/user/artifacts/schnell-20260612-….jpeg",
      "kind": "image",                     // image | video | audio | file
      "content_type": "image/jpeg",
      "file_name": "out.jpeg",
      "size": 245678,
      "index": 0 }
  ],
  "hosted_urls": ["https://v3b.fal.media/files/…"],  // THE stable cross-model URL field
  "text": "…",                             // STT transcripts / text models (else absent)
  "credits_used": 4,                       // actual credits charged (sync AND queue)
  "credits_basis": "result",               // "result" = authoritative | "estimated" = display-only
  "timing": { "started_at": "…", "completed_at": "…", "elapsed_ms": 15234 },
  "raw":  { /* untouched provider payload */ },
  "data": { /* deprecated alias of raw (v1 compat) */ }
}
```

### Which field to read, per modality

| Modality | Read | Notes |
|---|---|---|
| Image | `files[].local_path` + `hosted_urls[]` | one entry per image (`-n` > 1 → multiple) |
| Video | `files[0].local_path` + `hosted_urls[0]` | single video; from a queue result |
| Audio (tts/sfx/v2a) | `files[0].local_path` + `hosted_urls[0]` | generated audio file |
| STT / transcription | `text` | the transcript string; `files` is usually empty |

**Rules:** consume `hosted_urls[0]` (normalized across every model family — the whole `*.fal.media`
subdomain set) and `files[].local_path`. fal hosted URLs **expire** — download/persist promptly.
**Never regex `raw`/`data`** to fish out a URL; the normalized fields exist for exactly this.

### credits_basis

- `"result"` — derived from the actual output payload (authoritative).
- `"estimated"` — a param-derived best-effort shown on some queue results; the billing webhook is
  the source of truth and may differ. Treat an `"estimated"` number as informational.

## Error envelope

On failure (`--format json` or non-TTY), stdout carries:

```json
{
  "schema_version": "2.0",
  "success": false,
  "error": {
    "code": "PROXY_BLOCKED",
    "exit_code": 6,
    "message": "Model denied by proxy policy …",
    "retryable": false,
    "details": { }
  }
}
```

`error.exit_code` mirrors the process exit code (see `exit-codes.md`). Branch on it — don't parse
`message`. `retryable` tells you whether a backoff-retry is sensible (true only for infra/network).

## Parsing tips

```bash
# capture URL + local path
OUT=$(ai-gen image "a fox" --format json)
URL=$(echo "$OUT" | jq -r '.hosted_urls[0]')
PATH=$(echo "$OUT" | jq -r '.files[0].local_path')

# transcript
ai-gen audio stt clip.wav --format json | jq -r '.text'

# exit-code-driven control flow
ai-gen video "..." -m "$M" --image a.png --format json || case $? in
  6) echo "model declined — try another";;
  10) echo "timeout — recover with: ai-gen result <id>";;
  13) echo "over budget";;
esac
```
