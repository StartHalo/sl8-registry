#!/usr/bin/env bash
# check-concept.sh — structural self-check for an rm-concept base concept.
# Prose-only gate; no render, no network. Mirrors the rubric's structural dimension so
# rm-concept can verify 01-concept.md before reporting phase 1 done.
#
# Usage:  bash check-concept.sh artifacts/<project>/01-concept.md
# Exits 0 only when every gate passes; non-zero (and prints FAIL lines) otherwise.
#
# bash 3.2 compatible: no associative arrays, no `mapfile`, no `timeout`, no GNU-only flags.
# Uses only grep -E / wc / printf, which are present on the sl8-animation sandbox.

set -u

FILE="${1:-}"
if [ -z "$FILE" ]; then
  printf 'FAIL: no path given. Usage: bash check-concept.sh artifacts/<project>/01-concept.md\n' >&2
  exit 2
fi
if [ ! -f "$FILE" ]; then
  printf 'FAIL: file not found: %s\n' "$FILE" >&2
  exit 2
fi

fails=0
pass() { printf 'PASS: %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1" >&2; fails=$((fails + 1)); }

# --- 1. all six dimension headings present (case-insensitive ## heading) ---
has_heading() {
  # $1 = grep -E pattern matching the heading line after '## '
  grep -iE "^##[[:space:]]+$1" "$FILE" >/dev/null 2>&1
}
has_heading "subject"                 && pass "Subject heading"          || fail "missing '## Subject' heading"
has_heading "composition"             && pass "Composition heading"      || fail "missing '## Composition' heading"
has_heading "style"                   && pass "Style/Aesthetic heading"  || fail "missing '## Style / Aesthetic' heading"
has_heading "(colou?r )?palette|colou?r" && pass "Color Palette heading" || fail "missing '## Color Palette' heading"
has_heading "typography"              && pass "Typography heading"       || fail "missing '## Typography' heading"
has_heading "mood"                    && pass "Mood/Atmosphere heading"  || fail "missing '## Mood / Atmosphere' heading"

# --- 2. at least 100 words of body ---
words=$(wc -w < "$FILE" | tr -d '[:space:]')
if [ "${words:-0}" -ge 100 ]; then
  pass "word count >= 100 (got $words)"
else
  fail "body too short: $words words (need >= 100)"
fi

# --- 3. at least two valid 6-digit hex colors in the palette ---
hexcount=$(grep -oE '#[0-9A-Fa-f]{6}\b' "$FILE" | sort -u | wc -l | tr -d '[:space:]')
if [ "${hexcount:-0}" -ge 2 ]; then
  pass "palette has >= 2 hex colors (got $hexcount)"
else
  fail "palette needs >= 2 valid #RRGGBB hex colors (got ${hexcount:-0})"
fi

# --- 4. typography names a wired pack OR a wired face (no CDN font) ---
# Wired packs: modern | editorial | bold | tech.
# Wired faces: Inter Fraunces Oswald Manrope Playfair Anton "Bebas Neue" "Space Grotesk" "DM Serif".
WIRED='modern|editorial|bold|tech|Inter|Fraunces|Oswald|Manrope|Playfair|Anton|Bebas|Space[[:space:]]?Grotesk|DM[[:space:]]?Serif'
if grep -iE "$WIRED" "$FILE" >/dev/null 2>&1; then
  pass "typography names a wired pack/face"
else
  fail "typography must name a wired pack (modern/editorial/bold/tech) or a wired face"
fi

printf -- '----\n'
if [ "$fails" -eq 0 ]; then
  printf 'OK: %s passes all structural gates.\n' "$FILE"
  exit 0
else
  printf '%d gate(s) failed for %s.\n' "$fails" "$FILE" >&2
  exit 1
fi
