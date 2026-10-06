# Recovery: timeouts, failures, retries and missing models

What to do when a paid call does not come back clean. The two rules underneath everything:
**never re-fire a job that may exist** (HR6), and **one retry per item, moving one named lever, never
a third attempt on the same route** (HR7). `$S` is `$HOME/.agents/skills/media-ai-gen/scripts`.

## Contents
- [Never re-fire](#never-re-fire)
- [Timeout: fetch by id](#timeout-fetch-by-id)
- [The retry ledger](#the-retry-ledger)
- [Exit-code playbook](#exit-code-playbook)
- [A model is missing or renamed](#a-model-is-missing-or-renamed)
- [When the run is out of budget](#when-the-run-is-out-of-budget)

## Never re-fire

Once a request id exists, only `ai-gen result <id>` (or one `ai-gen status <id>` poll, never with
`--wait`) touches that job again. A resubmit pays twice for one output, and there is no cancel: a
job you abandon still runs and still bills.

- **Get an id before you need one.** Run every paid call with `--queue` or `--async`; a sync call has
  no request id and cannot be recovered. Journal the id at once: an `--async` submit gets a
  `pending` manifest row before anything else happens.
- **Do not resubmit on slowness.** Video jobs run minutes, not seconds, and 1080p or 4k can take
  several. Keep fetching.
- **If your command died before printing the id** (a tool time limit cut a `--queue` wait short),
  the id is in ai-gen's local job store, newest first:
  `python3 -c "import json,os;[print(j['submitted_at'],j['model'],j['request_id']) for j in json.load(open(os.path.expanduser('~/.cache/ai-gen/jobs.json')))['jobs'][:5]]"`
  (`AI_GEN_CACHE_DIR` moves it). Match it by model and time, then fetch it.
- **A download failed (exit 14) is not a failed generation.** Re-download with `ai-gen result <id> -o …`;
  for a sync call, fetch the URLs in `error.details.envelope.hosted_urls` now, before they expire.
  Never regenerate to recover a file.

## Timeout: fetch by id

Exit 10 means the wait ended, not the job. **It is already charged; fetch, do not resubmit.**

```bash
ID=<request id from the error envelope's details.requestId, the submit JSON, or the job store>
ai-gen result "$ID" -o "artifacts/$P/clips/" --format json > "work/$P/$I.result.json"
# exit 0 + "ready": false → not finished: wait, then run the same command again
# exit 0 + "success": true → manifest.mjs add --result work/$P/$I.result.json …
```

Space the fetches (15–30 s for images, a minute or more for video). If a job is still not ready
after the route's usual time several times over, stop fetching, leave the row `pending`, say so in
PROGRESS.md, and let the next job fetch it: the id does not expire with your job.

## The retry ledger

The attempt count lives in the manifest, not in your head: on a multi-shot job a real production run
took three attempts on a single shot because the count was kept in memory.

1. **Before a retry, read the error or the measured figures.** A rejected enum or unknown field is a
   payload bug, not a transient failure: resubmitting unchanged fails again, while a queued-then-failed
   render may already have been billed.
2. **The retry moves one named lever**, in the direction of the fault: a prompt clause, a reference,
   the duration, the route's own control (for example a wandering extension: `context` down and the
   camera pinned in the prompt). Write it in the row's `lever`.
3. **A second failure the same way goes to the named fallback route** (the owning skill names it) or
   to a gate. Never a third attempt on the same route: `manifest.mjs add` refuses it unless the user
   ordered it (`waiver`). Two attempts on eight shots is sixteen renders: the ceiling exists because
   that is a bill.
4. **Never substitute a route silently.** Name the fallback and its different cost in the delivery.

Record failed attempts too (`"status": "failed"`, with the error code in `notes`), so the count holds.

## Exit-code playbook

| Exit | First move | Then | Never |
|---|---|---|---|
| 1 `EMPTY_RESULT` | The route returned JSON only (metadata, image size, vision JSON). It was charged | Do the work locally: ffprobe, ImageMagick, python3 | Call it again |
| 2 | Read the message: a bad flag, a local validation, or 413 (file too large) | Fix the command; host a large input as a URL from an earlier result | — |
| 3 · 4 | `ai-gen doctor` | The machine's credentials are missing or expired: report it and end `failed` | Hunt for or print tokens |
| 5 | `ai-gen balance` | Stop: end `partial` with the shortfall stated | Retry |
| 6 | The proxy refused the model (denied or unpriced) | The owning skill's fallback route; `estimate` it first | Retry the same id |
| 7 | Read `error.details`: `checked: "client-side"` was refused before submit (free); otherwise it may be charged | Fix exactly the named field against `info` and the raw OpenAPI; the fix is the retry's lever | Blind-retry; drop the field and hope |
| 8 | The endpoint is gone or misspelt | [A model is missing or renamed](#a-model-is-missing-or-renamed) | Guess a sibling id |
| 9 | Sync calls were already retried twice. A queued job that FAILED may be billed | One retry (it counts as the attempt); then the fallback | Loop on it |
| 10 | Already charged | `ai-gen result <id>` ([above](#timeout-fetch-by-id)) | Resubmit |
| 11 | Unknown whether the job was submitted | If you have an id, `ai-gen result <id>`; else check the job store; a submit with no id anywhere may be resent once, as the item's retry | Resend in a loop |
| 12 | `cancel` cannot work; `estimate` found no price | Unpriced: pick a priced route or open a gate | Run an unpriced model inside a budget |
| 13 | Nothing was submitted: the estimate was over the cap | Re-plan cheaper (tier, duration, resolution, count) or open a gate | Raise or remove the cap |
| 14 | Charged; the files are hosted | Re-download now (above) | Regenerate |

## A model is missing or renamed

Endpoints get renamed, versioned and retired, and fields get pinned. When the owning skill's pick
fails (exit 8, `UNRESOLVED` from the raw OpenAPI, or exit 6):

1. **Search the catalog rather than guessing a name:** `ai-gen models --search <family name> --format json`
   (add `--refresh` if the cache predates the change). Prefer an id in the same family and namespace.
2. **Read the new endpoint's schema** (`ai-gen info <id> --format json`, then the raw OpenAPI) for its
   real field names. Never assemble a payload from a sibling endpoint's parameters.
3. **Price it:** `ai-gen estimate <id> --params-file …`. The catalog prints no prices.
4. **Run it as the fallback**, and record in the row and in PROGRESS.md that the pick was stale:
   "pick X failed (exit 8, 2026-10-05); ran Y instead at N cr". That line is how the owning skill's
   `facts.md` gets corrected; do not edit another skill's files from a job.

## When the run is out of budget

`manifest.mjs budget` prints the ceiling, what the ledger records and what remains. When the next
paid step does not fit, or a fan-out's summed estimates exceed what remains: open a spend gate with
the quote and end `partial` ([gates-and-manifest.md](gates-and-manifest.md#gate-files-and-the-partial-stop)).
Fetch every `pending` job first: an async job is invisible to the ledger until fetched, so the
remaining figure overstates what you have until then.
