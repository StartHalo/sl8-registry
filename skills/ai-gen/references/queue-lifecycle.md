# ai-gen — queue lifecycle

Video and `audio v2a` are long-running and go through the proxy **queue**. Fast models (image, TTS,
SFX, STT) run **sync** and return inline. You can run a queue job two ways.

## Inline (submit + auto-poll)

The default for `video` / `audio v2a`: `ai-gen` submits, polls status, downloads when done, and
prints the result envelope — one command, blocks until finished (or times out at the max-wait).

```bash
ai-gen video "the fox runs" -m bytedance/seedance-2.0/image-to-video --image ./fox.png --format json
```

## Fire-and-forget (`--async`) + later fetch

Submit, get a `request_id`, exit immediately — then check or fetch from **any process/session**.

```bash
# submit
REQ=$(ai-gen video "..." -m fal-ai/veo3.1/fast/image-to-video --image a.png --async --format json | jq -r .request_id)

# poll just status
ai-gen status "$REQ"                 # IN_QUEUE | IN_PROGRESS | COMPLETED | FAILED (+ queue position, logs)

# poll to completion AND download
ai-gen status "$REQ" --wait -o ./out

# OR fetch a finished job directly (not-ready exits 0, so it's safe to loop)
ai-gen result "$REQ" -o ./out --format json
```

`-m` is optional for jobs submitted from this machine (a local job store remembers the model); pass
`-m <id>` if you're fetching a job submitted elsewhere.

## Recovering from a timeout (exit 10)

A timeout does **not** mean the job failed — the queue keeps running server-side. Recover it:

```bash
ai-gen video "long render" -m "$M" --image a.png   # … exits 10 (max-wait hit)
# the request_id was printed/logged; fetch when it finishes:
ai-gen result <request-id> -o ./out
```

Raise the wait with `--timeout <ms>` (video default is 15 min = `900000`).

## When to prefer which mode

| Situation | Mode |
|---|---|
| One short video, want the file now | inline (default) |
| Batch / many jobs in flight | `--async` submit-all, then `result` each |
| Long render you don't want to block on | `--async`, fetch later with `result` |
| A job from another session/process | `result <id> -m <model>` |

## Status values

`IN_QUEUE` → `IN_PROGRESS` → `COMPLETED` (fetchable) or `FAILED`. `result` on a non-completed job
exits 0 with a status note (so a polling loop is harmless). A `FAILED` job surfaces as an error with
its exit code — don't blind-retry a validation failure (exit 7).
