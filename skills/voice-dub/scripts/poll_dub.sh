#!/usr/bin/env bash
# poll_dub.sh: wait for one queued ai-gen job (one language) and fetch its files. SL8-authored for
# voice-dub from the behaviour WF23-a1 step 12 records (cadence, cap, loop rules). Run it in ONE
# backgrounded Bash call per language; never inside a subagent (it does not inherit Bash approvals).
#
#   poll_dub.sh <request-id> <target-lang> <out-dir> [<model-id>]
#
# It polls with `ai-gen result <id> -o <out-dir> --format json`, which prints {"ready": false, ...}
# and exits 0 while the job runs, and downloads the files once it is done. It never resubmits and
# never calls `status --wait`. Cadence: 30 s while elapsed < 180 s, then 60 s; stuck at 3600 s.
# Writes <out-dir>/poll.log and <out-dir>/result.json (the last envelope). Prints one line:
#   DONE <lang> <file> [<file> ...] | FAILED <lang> <message> | STUCK <lang> <id> | ERROR <lang> <why>
# Exit: 0 done; 1 failed; 2 stuck at the cap (the job may still finish and is billed: fetch it later
# with `ai-gen result <id>`, never resubmit); 3 three failed or empty polls in a row; 4 unknown status;
# 5 usage.
# Tests may set DUB_POLL_FIRST, DUB_POLL_LATER, DUB_POLL_SWITCH and DUB_POLL_CAP (seconds).
set -u
if [ $# -lt 3 ]; then echo "usage: poll_dub.sh <request-id> <target-lang> <out-dir> [<model-id>]" >&2; exit 5; fi
ID="$1"; TARGET_LANG="$2"; OUT="$3"; MODEL="${4:-}"
FIRST="${DUB_POLL_FIRST:-30}"; LATER="${DUB_POLL_LATER:-60}"; SWITCH="${DUB_POLL_SWITCH:-180}"; CAP="${DUB_POLL_CAP:-3600}"
mkdir -p "$OUT"
LOG="$OUT/poll.log"; ENV="$OUT/result.json"; ERRF="$OUT/poll.stderr"
start=$(date +%s); fails=0; stalled_note=0

classify () {
  # stdin: one ai-gen envelope. Prints: DONE <files...> | WAIT <status> | FAILED <msg> | RETRY <code> | EMPTY | UNKNOWN <status>
  python3 -c '
import json, sys
raw = sys.stdin.read().strip()
if not raw:
    print("EMPTY"); sys.exit()
d = None
for text in (raw, raw.splitlines()[-1]):
    try:
        d = json.loads(text); break
    except Exception:
        pass
if not isinstance(d, dict):
    print("EMPTY"); sys.exit()
running = {"in_queue", "in_progress", "queued", "pending", "processing", "running", "submitted"}
failed = {"failed", "error", "cancelled", "canceled"}
if d.get("ready") is False:
    s = str(d.get("status", "")).lower()
    print(("WAIT " if s in running else "FAILED " if s in failed else "UNKNOWN ") + (s or "none")); sys.exit()
if d.get("success") is True:
    files = [f.get("local_path") or f.get("url") for f in d.get("files", [])]
    print("DONE " + " ".join(x for x in files if x) if files else "EMPTY"); sys.exit()
if d.get("success") is False:
    e = d.get("error") or {}
    code = str(e.get("code", "")); det = e.get("details") or {}
    st = str(det.get("status", "")).lower() if isinstance(det, dict) else ""
    if code == "TIMEOUT" or st in running:
        print("WAIT " + (st or code.lower())); sys.exit()
    if st in failed or code in ("UPSTREAM_VALIDATION", "EMPTY_RESULT"):
        print("FAILED " + code + ": " + str(e.get("message", "")).replace("\n", " ")); sys.exit()
    print("RETRY " + (code or "unknown")); sys.exit()
print("UNKNOWN " + str(d.get("status", "no-status-field")))
'
}

while :; do
  now=$(date +%s); elapsed=$((now - start))
  if [ "$elapsed" -ge "$CAP" ]; then
    echo "$(date -u +%FT%TZ) stuck at ${elapsed}s" >> "$LOG"
    echo "STUCK $TARGET_LANG $ID"; exit 2
  fi
  if [ -n "$MODEL" ]; then
    out=$(ai-gen result "$ID" -m "$MODEL" -o "$OUT" --format json 2>"$ERRF"); rc=$?
  else
    out=$(ai-gen result "$ID" -o "$OUT" --format json 2>"$ERRF"); rc=$?
  fi
  printf '%s\n' "$out" > "$ENV"
  verdict=$(printf '%s\n' "$out" | classify)
  echo "$(date -u +%FT%TZ) rc=$rc elapsed=${elapsed}s $verdict" >> "$LOG"
  case "$verdict" in
    DONE*)   echo "DONE $TARGET_LANG ${verdict#DONE }"; exit 0 ;;
    FAILED*) echo "FAILED $TARGET_LANG ${verdict#FAILED }"; exit 1 ;;
    UNKNOWN*) echo "ERROR $TARGET_LANG unexpected status '${verdict#UNKNOWN }' (see $ENV)"; exit 4 ;;
    WAIT*)   fails=0 ;;
    *)       fails=$((fails + 1))
             echo "poll $fails/3 failed (exit $rc, $verdict): $(head -c 400 "$ERRF")" >&2
             if [ "$fails" -ge 3 ]; then
               echo "ERROR $TARGET_LANG three failed or empty polls in a row (exit $rc; see $ERRF and $ENV)"; exit 3
             fi ;;
  esac
  if [ "$elapsed" -gt 300 ] && [ "$stalled_note" -eq 0 ]; then
    echo "STALL $TARGET_LANG still running after ${elapsed}s"; stalled_note=1
  fi
  if [ "$elapsed" -lt "$SWITCH" ]; then sleep "$FIRST"; else sleep "$LATER"; fi
done
