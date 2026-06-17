# ai-gen — exit codes

`ai-gen` maps every failure to exactly one exit code (and mirrors it in `error.exit_code`). Bot
scripts should branch on the code, not parse text. The full 14-code taxonomy:

| Exit | Code | Cause | What to do |
|---|---|---|---|
| 0 | OK | success | read `hosted_urls` / `files[].local_path` / `text` |
| 1 | UNKNOWN | unmapped/unexpected exception | inspect the message; usually a transient bug — retry once |
| 2 | CLI_USAGE | bad flags, missing args, local validation (incl. local input > 3 MB) | fix the invocation; host large files at a public URL |
| 3 | CONFIG | `SL8_SESSION_TOKEN` / `SL8_API_URL` not set | these are auto-set in E2B sandboxes; set them for local runs |
| 4 | AUTH | proxy 401 — invalid/expired session token | refresh credentials |
| 5 | CREDITS | proxy 402 — insufficient account credits | `ai-gen balance`; pick a cheaper model/settings, or top up |
| 6 | PROXY_BLOCKED | the proxy declined the model — removed/blocked, or it can't price it (fail-closed) | `ai-gen models --search <name>` for an alternative |
| 7 | UPSTREAM_VALIDATION | the model rejected the parameters | `ai-gen info <id>`; fix params. **Never blind-retry — the proxy charges for validation failures** |
| 8 | UPSTREAM_NOT_FOUND | model not found upstream (id removed/renamed) | `ai-gen models --search <name>` |
| 9 | UPSTREAM_INFRA | fal/proxy 5xx | retryable — `ai-gen` auto-retries transient cases; back off and retry |
| 10 | TIMEOUT | sync timeout or queue max-wait exceeded — **the job may still finish** | recover with `ai-gen result <request-id>` (or `status --wait`) |
| 11 | NETWORK | proxy / api.fal.ai unreachable | retryable — check connectivity, retry |
| 12 | NOT_SUPPORTED_BY_PROXY | a feature the proxy doesn't expose (e.g. `cancel`; `estimate` for an unpriced model) | route around it; don't depend on the feature |
| 13 | MAX_COST_EXCEEDED | `--max-cost` guard tripped **before submission** (nothing was charged) | raise the budget, or choose cheaper settings/model |
| 14 | DOWNLOAD_FAILED | generation succeeded but a download failed | **`hosted_urls` are in the JSON** — fetch them directly (they expire) |

## The three that trip people up

- **Exit 6 (proxy declined).** Service Proxy v2 routes *any* fal namespace, so exit 6 no longer means
  "bare namespace blocked" — it means this specific model was removed, policy-blocked, or the proxy
  can't price it. Always treat it as "pick another model," not "switch namespaces."
- **Exit 7 (validation).** The model said the params are wrong. `ai-gen` pre-validates client-side to
  protect you, but if one slips through, the proxy still charges for the upstream rejection — so
  **fix with `ai-gen info`, never blind-retry.** `--strict-params` catches an unknown param *client-side*
  (still exit 7, but raised **before** submission, so it's not charged).
- **Exit 10 (timeout) and 14 (download).** Neither means the work was lost. A timeout → the queue job
  is still running; fetch later with `ai-gen result <request-id>`. A download failure → the generated
  artifact's `hosted_urls` are in the JSON; download them directly before they expire.

## Script-safe branching

```bash
ai-gen image "$PROMPT" --format json
case $? in
  0)  ;;                                   # success
  5)  echo "out of credits";       exit 1;;
  6)  echo "model declined — searching for an alternative"; ai-gen models --search flux;;
  7)  echo "bad params — see: ai-gen info $MODEL"; exit 1;;   # do NOT retry blindly
  9|11) echo "transient — retrying"; sleep 5; ai-gen image "$PROMPT" --format json;;
  10) echo "timeout — recover: ai-gen result <id>";;
  13) echo "over --max-cost budget"; exit 1;;
  14) echo "download failed; URLs are in the JSON";;
esac
```
