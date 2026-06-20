#!/usr/bin/env bash
# validate-shotlist.sh — deterministic structural linter for shotlist.md
#
# Checks (all structural, zero LLM judgment):
#   - '# Shotlist:' title present
#   - a non-empty global style/look header line (first non-blank line after the title,
#     before the @Image identity line)
#   - the identity-lock line present: contains @Image1 AND @Image2 AND a phrase matching
#     'maintain ... same ... identity' (case-insensitive)
#   - 4-6 numbered time-coded shots written as '[Xs-Ys]:' (or '[X-Ys]:'), each a single
#     line; shots tile [0..duration]: shot 1 starts at 0, each start == previous end,
#     last end == footer duration +/-1s (no gaps, no overlaps)
#   - each shot names a CAMERA MOVE (from the camera vocabulary) AND has a concrete body
#     of >= 25 chars after the time-code (an action), and is <= 400 chars (runaway guard)
#   - no negative-prompt syntax inside a shot line ('no <word>' / 'avoid ' / 'without ')
#     — those belong only in the footer suffix, never in a shot
#   - the footer 'Total: Ns / K shots / AR.' present; N (duration), K (shot count) and AR
#     parsed; K must equal the number of shots; the time-codes must end at N +/-1s
#   - the footer carries an 'Audio:' clause and the positive-constraint suffix
#     ('avoid identity drift' AND 'stable picture')
#
# Usage:  validate-shotlist.sh <path/to/shotlist.md>
# Exit:   0 = valid, 1 = lint errors (line-itemized on stdout), 2 = usage/deps
set -euo pipefail

usage() {
  echo "usage: validate-shotlist.sh <path/to/shotlist.md>" >&2
  exit 2
}

for dep in awk; do
  if ! command -v "$dep" >/dev/null 2>&1; then
    echo "ERROR: required dependency '$dep' not found on PATH" >&2
    exit 2
  fi
done

[ "$#" -eq 1 ] || usage
SHOTLIST="$1"

if [ ! -f "$SHOTLIST" ]; then
  echo "FAIL: shotlist file not found: $SHOTLIST"
  exit 1
fi
if [ ! -r "$SHOTLIST" ]; then
  echo "FAIL: shotlist file not readable: $SHOTLIST"
  exit 1
fi

awk '
function err(line, msg) { nerr++; printf("  line %-4d %s\n", line, msg) }
function ferr(msg)      { nerr++; printf("  file      %s\n", msg) }
function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t\r]+$/, "", s); return s }
BEGIN {
  nerr = 0; nshots = 0
  has_title = 0; has_header = 0; has_identity = 0
  has_total = 0; has_audio = 0; has_suffix = 0
  in_notes = 0
  prev_end = 0; last_end = -1; first_start_ok = 0
  total_dur = -1; total_shots = -1; total_ar = ""
  # camera-move vocabulary (lowercased substrings); a shot must contain at least one
  cams = "static|locked-off|locked off|fixed|push-in|push in|dolly in|dolly-in|pull-out|pull out|dolly out|dolly-out|pan left|pan right|pan up|pan down|tracking shot|tracking|follow|follows|orbit|orbits|arc|arcs|arcing|360|low-angle|low angle|high-angle|high angle|crane|gimbal|steadicam|aerial|drone|close-up|close up|closeup|extreme close|wide establishing|wide shot|establishing|handheld|whip pan|dolly zoom|rack focus|zoom"
}
{
  line = $0
  sub(/\r$/, "", line)
  t = trim(line)

  # title
  if (line ~ /^# Shotlist:/) { has_title = 1; next }

  # enter Notes section — everything after is free-form, stop shot parsing
  if (line ~ /^## /) {
    if (line ~ /^## Notes[ \t]*$/) in_notes = 1
    next
  }
  if (in_notes) next

  # blank line
  if (t == "") next

  # identity-lock line (may appear before or after; detect anywhere in the body)
  low = tolower(line)
  if (low ~ /@image1/ && low ~ /@image2/) {
    has_identity = 1
    if (low !~ /maintain/ || low !~ /identity/ || (low !~ /same/ && low !~ /exact/))
      err(NR, "identity line must read like \"@Image1 ... @Image2 ... maintain the EXACT same character identity in every shot\"")
    next
  }

  # a time-coded shot:  [Xs-Ys]: ...  or  [X-Ys]: ...
  if (line ~ /^\[[0-9]+s?-[0-9]+s?\][ \t]*:/) {
    nshots++
    # parse start/end seconds
    hd = line
    sub(/\].*$/, "", hd)        # strip from "]" onward -> "[X-Y" or "[Xs-Ys"
    sub(/^\[/, "", hd)          # strip leading "["
    gsub(/s/, "", hd)           # drop the "s" units -> "X-Y"
    p = index(hd, "-")
    s_start = trim(substr(hd, 1, p - 1)) + 0
    s_end   = trim(substr(hd, p + 1)) + 0
    shot_line[nshots] = NR

    if (nshots == 1) {
      if (s_start == 0) first_start_ok = 1
      else err(NR, "first shot must start at 0s (found " s_start "s)")
    } else {
      if (s_start != prev_end)
        err(NR, "shot time-codes must tile with no gaps/overlaps — shot " nshots " starts at " s_start "s but the previous shot ended at " prev_end "s")
    }
    if (s_end <= s_start)
      err(NR, "shot " nshots " end (" s_end "s) must be greater than its start (" s_start "s)")
    prev_end = s_end
    last_end = s_end

    # body after the colon = action + camera + lighting
    cpos = index(line, ":")
    body = trim(substr(line, cpos + 1))
    bl = tolower(body)
    if (length(body) < 25)
      err(NR, "shot " nshots " is too thin (<25 chars after the time-code) — name a camera move AND a concrete action")
    else if (length(body) > 400)
      err(NR, "shot " nshots " is too long (>400 chars) — one camera move + one action; trim")
    # camera check is WORD-DELIMITED (pad + collapse non-alnum to single spaces) so action
    # words like arches/follows no longer satisfy it via the bare substrings arc/follow.
    nb = " " bl " "; gsub(/[^a-z0-9]+/, " ", nb)
    if (nb !~ (" (" cams ") "))
      err(NR, "shot " nshots " names no camera move — include one (push-in, tracking shot, orbit, low-angle, static, close-up, ...)")
    # negative-prompt syntax must not OPEN a shot (positive constraints belong in the footer suffix).
    # Only flag a body that STARTS with no/avoid/without — so mid-action "to avoid"/"no longer" pass.
    if (bl ~ /^(no|avoid|without) [a-z]/)
      err(NR, "shot " nshots " opens with negative-prompt syntax (\"no X\" / \"avoid\" / \"without\") — Seedance uses positive constraints; keep negatives in the footer suffix only")
    next
  }

  # the Total / Audio / suffix footer
  if (line ~ /^Total:/) {
    has_total = 1
    if (low ~ /audio:/) has_audio = 1
    if (low ~ /avoid identity drift/ && low ~ /stable picture/) has_suffix = 1
    # parse "Total: Ns / K shots / AR."
    tmp = line
    # duration: first number before "s"
    if (match(tmp, /Total:[ \t]*[0-9]+s/)) {
      d = substr(tmp, RSTART, RLENGTH)
      gsub(/[^0-9]/, "", d); total_dur = d + 0
    } else err(NR, "Total footer must state the duration as \"Total: Ns / ...\"")
    # shot count: number directly before "shots"
    if (match(tmp, /[0-9]+[ \t]*shots/)) {
      k = substr(tmp, RSTART, RLENGTH)
      gsub(/[^0-9]/, "", k); total_shots = k + 0
    } else err(NR, "Total footer must state the shot count as \"... / K shots / ...\"")
    # aspect ratio: like 16:9 / 9:16 / 21:9 / 1:1
    if (match(tmp, /[0-9]+:[0-9]+/)) {
      total_ar = substr(tmp, RSTART, RLENGTH)
    } else err(NR, "Total footer must state the aspect ratio as \"... / AR.\" (e.g. 16:9)")
    next
  }

  # the global header is the first non-blank, non-title, non-shot, non-footer,
  # non-identity line we reach before any shot — mark it present
  if (!has_header && nshots == 0) { has_header = 1; next }

  # any other prose before Notes is tolerated (e.g. the one-line scene establishment)
  next
}
END {
  if (!has_title)    ferr("missing \"# Shotlist: <project-name>\" title")
  if (!has_header)   ferr("missing the global style/look header line under the title")
  if (!has_identity) ferr("missing the @Image1/@Image2 identity-lock line")

  if (nshots < 4 || nshots > 6)
    ferr(sprintf("shot count must be 4-6 (found %d)", nshots))

  if (!has_total)  ferr("missing the \"Total: Ns / K shots / AR.\" footer")
  if (!has_audio)  ferr("footer is missing the \"Audio:\" clause (native score + SFX + ambience)")
  if (!has_suffix) ferr("footer is missing the positive-constraint suffix (\"avoid identity drift ... stable picture, no flicker\")")

  # K must match the number of shots
  if (total_shots >= 0 && nshots > 0 && total_shots != nshots)
    ferr(sprintf("Total footer says %d shots but %d time-coded shots are written", total_shots, nshots))

  # time-codes must end at the footer duration +/-1s
  if (total_dur >= 0 && last_end >= 0) {
    diff = last_end - total_dur
    if (diff < 0) diff = -diff
    if (diff > 1)
      ferr(sprintf("shot time-codes end at %ds but the Total footer duration is %ds (must match within 1s)", last_end, total_dur))
  }

  if (nerr > 0) {
    printf("FAIL: %d error(s) in %s\n", nerr, FILENAME)
    exit 1
  }
  printf("OK: %s — %d shots, %ds total, %d-shot footer, aspect %s\n", FILENAME, nshots, total_dur, total_shots, total_ar)
  exit 0
}
' "$SHOTLIST"
