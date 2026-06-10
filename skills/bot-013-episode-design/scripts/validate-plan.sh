#!/usr/bin/env bash
# validate-plan.sh — deterministic structural linter for 01-episode-plan.md
#
# Checks (all structural, zero LLM judgment):
#   - '# Episode Plan:' title present
#   - header fields: logline (non-empty), aspect (16:9|9:16), target-length (int 15-60),
#     punchline (non-empty), room-tone (on|off); no duplicates, no unknown header keys
#   - '## Beats' section present; 3-8 beats; '### Beat N: <kebab-slug>' numbered
#     consecutively from 1; slugs kebab-case and unique
#   - per beat exactly one each of scene/motion/duration/camera, single-line, column 1
#   - duration is exactly 5 or 10; total of all durations within 15-60s
#   - scene >= 40 chars (<= 600), motion >= 20 chars (<= 300) — stub/runaway guards
#   - scene/motion do not restate the frozen style stack or re-describe the character
#     (those blocks are prepended verbatim downstream; duplication causes drift)
#   - at most ONE beat carries an in-frame label (quoted UPPERCASE word in scene)
#   - WARNING (non-fatal, exit code unchanged) when the beat-duration total is
#     more than 5s away from the target-length header
#
# Usage:  validate-plan.sh <path/to/01-episode-plan.md>
# Exit:   0 = valid, 1 = lint errors (line-itemized on stdout), 2 = usage/deps
set -euo pipefail

usage() {
  echo "usage: validate-plan.sh <path/to/01-episode-plan.md>" >&2
  exit 2
}

for dep in awk; do
  if ! command -v "$dep" >/dev/null 2>&1; then
    echo "ERROR: required dependency '$dep' not found on PATH" >&2
    exit 2
  fi
done

[ "$#" -eq 1 ] || usage
PLAN="$1"

if [ ! -f "$PLAN" ]; then
  echo "FAIL: plan file not found: $PLAN"
  exit 1
fi
if [ ! -r "$PLAN" ]; then
  echo "FAIL: plan file not readable: $PLAN"
  exit 1
fi

awk '
function err(line, msg) { nerr++; printf("  line %-4d %s\n", line, msg) }
function ferr(msg)      { nerr++; printf("  file      %s\n", msg) }
function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t\r]+$/, "", s); return s }
function checkdup(lineno, b, key, val,   lv) {
  lv = tolower(val)
  if (lv ~ /pencil sketch|graphite|cross-hatch/)
    err(lineno, "Beat " b " " key ": restates the frozen style stack (pencil sketch / graphite / cross-hatching) — frozen blocks are composed downstream, never in the plan")
  if (lv ~ /dot eyes|circle head|single-stroke|baseball cap|curved smile/)
    err(lineno, "Beat " b " " key ": re-describes the locked character — refer to \"the stickman\" and let the frozen character block carry identity")
}
function check_beat_complete(b) {
  if (fcount[b, "scene"]    == 0) err(beat_line[b], "Beat " b " is missing a scene: line")
  if (fcount[b, "motion"]   == 0) err(beat_line[b], "Beat " b " is missing a motion: line")
  if (fcount[b, "duration"] == 0) err(beat_line[b], "Beat " b " is missing a duration: line")
  if (fcount[b, "camera"]   == 0) err(beat_line[b], "Beat " b " is missing a camera: line")
}
BEGIN {
  nerr = 0; nbeats = 0; total = 0; nlabels = 0
  section = "header"; has_title = 0; has_beats_heading = 0
}
{
  line = $0
  sub(/\r$/, "", line)

  if (line ~ /^# Episode Plan:/) { has_title = 1; next }

  if (line ~ /^## /) {
    if (line ~ /^## Beats[ \t]*$/) {
      if (has_beats_heading) err(NR, "duplicate \"## Beats\" heading")
      has_beats_heading = 1
      section = "beats"
    } else {
      section = "other"
    }
    next
  }

  if (line ~ /^### /) {
    if (line !~ /^### Beat /) { err(NR, "unexpected level-3 heading — only \"### Beat N: <kebab-slug>\" is allowed"); next }
    if (section != "beats") err(NR, "beat heading found outside the \"## Beats\" section")
    nbeats++
    beat_line[nbeats] = NR
    rest = substr(line, 10)               # text after "### Beat "
    cpos = index(rest, ":")
    if (cpos == 0) { err(NR, "beat heading must be \"### Beat N: <kebab-slug>\""); next }
    num  = trim(substr(rest, 1, cpos - 1))
    slug = trim(substr(rest, cpos + 1))
    if (num !~ /^[0-9]+$/)
      err(NR, "beat number is not an integer: \"" num "\"")
    else if (num + 0 != nbeats)
      err(NR, "beat numbering must be consecutive from 1 — expected \"Beat " nbeats "\", found \"Beat " num "\"")
    if (slug == "")
      err(NR, "beat slug is empty")
    else if (slug !~ /^[a-z0-9]+(-[a-z0-9]+)*$/)
      err(NR, "beat slug must be kebab-case [a-z0-9-]: \"" slug "\"")
    else if (slug in slug_seen)
      err(NR, "duplicate beat slug \"" slug "\" (first used on line " slug_seen[slug] ") — slugs become downstream filenames and must be unique")
    else
      slug_seen[slug] = NR
    next
  }

  if (trim(line) == "") next

  if (line ~ /^[a-z][a-z-]*:/) {
    cpos = index(line, ":")
    key = substr(line, 1, cpos - 1)
    val = trim(substr(line, cpos + 1))

    if (section == "header") {
      if (key == "logline" || key == "aspect" || key == "target-length" || key == "punchline" || key == "room-tone") {
        hdr_count[key]++
        if (hdr_count[key] > 1) { err(NR, "duplicate header field \"" key "\""); next }
        hdr_val[key] = val; hdr_line[key] = NR
      } else {
        err(NR, "unknown header field \"" key "\" (allowed: logline, aspect, target-length, punchline, room-tone)")
      }
      next
    }

    if (section == "beats") {
      if (nbeats == 0) { err(NR, "field line before the first \"### Beat\" heading"); next }
      if (key == "scene" || key == "motion" || key == "duration" || key == "camera") {
        fcount[nbeats, key]++
        if (fcount[nbeats, key] > 1) { err(NR, "Beat " nbeats ": duplicate \"" key "\" field"); next }
        if (key == "duration") {
          if (val != "5" && val != "10")
            err(NR, "Beat " nbeats ": duration must be exactly 5 or 10 (got \"" val "\") — that is the i2v clip-length granularity")
          else
            total += val + 0
        } else if (key == "scene") {
          if (length(val) < 40)
            err(NR, "Beat " nbeats ": scene block too short (<40 chars) — one concrete action, a grounded setting, and a framing phrase")
          else if (length(val) > 600)
            err(NR, "Beat " nbeats ": scene block too long (>600 chars) — the composed still prompt must stay within model limits")
          checkdup(NR, nbeats, "scene", val)
          # mawk-safe (no {n,m} intervals) letters-only label match: a quoted
          # UPPERCASE word of 2-8 letters; RLENGTH spans both quotes -> 4-10.
          if (match(val, /"[A-Z]+"/) && RLENGTH >= 4 && RLENGTH <= 10) nlabels++
        } else if (key == "motion") {
          if (length(val) < 20)
            err(NR, "Beat " nbeats ": motion prompt too short (<20 chars) — one action plus at most one camera move")
          else if (length(val) > 300)
            err(NR, "Beat " nbeats ": motion prompt too long (>300 chars) — one action, one camera move, nothing else")
          checkdup(NR, nbeats, "motion", val)
        } else if (key == "camera") {
          if (val == "") err(NR, "Beat " nbeats ": camera note is empty")
        }
      } else {
        err(NR, "Beat " nbeats ": unknown field \"" key "\" (allowed: scene, motion, duration, camera)")
      }
      next
    }
    next   # key: value lines in other sections (e.g. Notes) are free-form
  }

  if (section == "beats") {
    if (line ~ /^[ \t]*- (scene|motion|duration|camera):/)
      err(NR, "field lines must not start with \"- \" — write \"scene: ...\" at column 1")
    else
      err(NR, "unexpected line inside \"## Beats\" — every beat field is a single one-line \"key: value\"; no wrapping, no prose")
  }
  # free text in header/other sections is ignored
}
END {
  if (!has_title)         ferr("missing \"# Episode Plan: <project-name>\" title")
  if (!has_beats_heading) ferr("missing \"## Beats\" section heading")

  if (hdr_count["logline"] == 0)            ferr("missing header field \"logline:\"")
  else if (hdr_val["logline"] == "")        err(hdr_line["logline"], "logline is empty")
  if (hdr_count["aspect"] == 0)             ferr("missing header field \"aspect:\"")
  else if (hdr_val["aspect"] != "16:9" && hdr_val["aspect"] != "9:16")
    err(hdr_line["aspect"], "aspect must be 16:9 or 9:16 (got \"" hdr_val["aspect"] "\")")
  if (hdr_count["target-length"] == 0)      ferr("missing header field \"target-length:\"")
  else if (hdr_val["target-length"] !~ /^[0-9]+$/ || hdr_val["target-length"] + 0 < 15 || hdr_val["target-length"] + 0 > 60)
    err(hdr_line["target-length"], "target-length must be an integer 15-60 seconds (got \"" hdr_val["target-length"] "\")")
  if (hdr_count["punchline"] == 0)          ferr("missing header field \"punchline:\"")
  else if (hdr_val["punchline"] == "")      err(hdr_line["punchline"], "punchline is empty")
  if (hdr_count["room-tone"] == 0)          ferr("missing header field \"room-tone:\"")
  else if (hdr_val["room-tone"] != "on" && hdr_val["room-tone"] != "off")
    err(hdr_line["room-tone"], "room-tone must be \"on\" or \"off\" (got \"" hdr_val["room-tone"] "\")")

  if (nbeats < 3 || nbeats > 8)
    ferr(sprintf("beat count must be 3-8 (found %d)", nbeats))
  for (b = 1; b <= nbeats; b++) check_beat_complete(b)
  if (nbeats > 0 && (total < 15 || total > 60))
    ferr(sprintf("total planned duration must be 15-60s (found %ds)", total))
  if (nlabels > 1)
    ferr(sprintf("at most ONE beat may carry an in-frame label (quoted UPPERCASE word) — found %d", nlabels))

  # Reconciliation warning only — never affects the exit code.
  if (nbeats > 0 && hdr_count["target-length"] > 0 && hdr_val["target-length"] ~ /^[0-9]+$/) {
    tgt = hdr_val["target-length"] + 0
    diff = total - tgt
    if (diff < 0) diff = -diff
    if (diff > 5)
      printf("WARNING: beat durations total %ds but target-length is %ds (off by %ds, tolerance 5s) — reconcile if unintentional\n", total, tgt, diff)
  }

  if (nerr > 0) {
    printf("FAIL: %d error(s) in %s\n", nerr, FILENAME)
    exit 1
  }
  printf("OK: %s — %d beats, %ds total, aspect %s\n", FILENAME, nbeats, total, hdr_val["aspect"])
  exit 0
}
' "$PLAN"
