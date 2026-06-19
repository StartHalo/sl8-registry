#!/usr/bin/env bash
# package-bible.sh — assemble the portable character bible manifest.
#
# Usage: package-bible.sh <project-dir>     (e.g. package-bible.sh artifacts/vyre)
#
# Reads character-spec.md for the character name + the fixed seed, lists every bible
# artifact that ACTUALLY EXISTS on disk (spec, sheet, hero, generation log, consistency
# check) with its path, marks any optional artifact that is missing (non-fatal — noted,
# not an error), and writes <project-dir>/character-bible.md with the FIXED downstream-use
# paragraph baked in.
#
# Composes NOTHING about identity: the grade is the caller's job (the runtime model READS
# the sheet and writes consistency-check.md first). This script only indexes files.
#
# On success prints exactly one line to stdout and exits 0:
#
#   character-bible<TAB><path><TAB>seed=<N><TAB>artifacts=<count>
#
# All diagnostics go to stderr. Exits 1 only when a LOAD-BEARING input is missing
# (the project dir or character-spec.md) — the spec is the seed/name source and the
# sheet is the identity reference; without them there is no bible to index.

set -euo pipefail

die()  { echo "package-bible.sh: ERROR: $*" >&2; exit 1; }
note() { echo "package-bible.sh: $*" >&2; }

command -v python3 >/dev/null 2>&1 || die "python3 not found on PATH (needed to parse the spec)"

[ $# -eq 1 ] || die "usage: package-bible.sh <project-dir>"
PROJECT_DIR=$1
[ -d "$PROJECT_DIR" ] || die "project dir not found: $PROJECT_DIR"

SPEC="$PROJECT_DIR/character-spec.md"
[ -f "$SPEC" ] || die "character-spec.md not found in $PROJECT_DIR — run phase 1 (bot-016-character-design) first; the spec carries the seed and name"

# --- pull the character name + seed from the spec (python3, never regex the blob raw) ---
# name: from the "# Character Spec: <Name>" title. seed: the first integer under "## Seed".
read_spec_field() {
  # $1 = which field: "name" | "seed"
  python3 -c '
import re, sys
which = sys.argv[1]
spec = sys.argv[2]
text = open(spec, encoding="utf-8", errors="replace").read()
if which == "name":
    m = re.search(r"^#\s*Character Spec:\s*(.+?)\s*$", text, re.MULTILINE)
    print(m.group(1).strip() if m else "")
elif which == "seed":
    # the line(s) under a "## Seed" heading up to the next "## " heading
    m = re.search(r"^##\s*Seed\b[^\n]*\n(.*?)(?=^##\s|\Z)", text, re.MULTILINE | re.DOTALL)
    seed = ""
    if m:
        d = re.search(r"-?\d+", m.group(1))
        if d:
            seed = d.group(0)
    print(seed)
' "$1" "$SPEC"
}

NAME=$(read_spec_field name)
SEED=$(read_spec_field seed)
[ -n "$NAME" ] || { note "no '# Character Spec: <Name>' title in $SPEC — using the project folder name"; NAME=$(basename "$PROJECT_DIR"); }
[ -n "$SEED" ] || { note "no integer seed found under '## Seed' in $SPEC — recording it as 'unknown' (check the spec)"; SEED="unknown"; }

note "packaging bible for '$NAME' (seed=$SEED) from $PROJECT_DIR"

# --- index the bible artifacts: each row is "label|relative-path|required(yes/no)" ---
# Paths are relative to the project dir (the manifest lives there; downstream opens it there).
ARTIFACTS=(
  "Character spec|character-spec.md|yes"
  "Turnaround reference sheet|reference-sheet.png|yes"
  "Hero portrait|hero.png|no"
  "Generation log|generation-log.md|no"
  "Consistency check|consistency-check.md|no"
)

rows=""          # markdown table body, built up line by line
present_count=0
missing_notes="" # bullets for any missing optional artifact

for entry in "${ARTIFACTS[@]}"; do
  IFS='|' read -r label rel required <<<"$entry"
  if [ -f "$PROJECT_DIR/$rel" ]; then
    rows+="| $label | \`$rel\` | present |"$'\n'
    present_count=$((present_count + 1))
  else
    if [ "$required" = "yes" ]; then
      die "required artifact missing: $PROJECT_DIR/$rel — cannot package a bible without it"
    fi
    rows+="| $label | \`$rel\` | MISSING (optional) |"$'\n'
    missing_notes+="- \`$rel\` ($label) was not on disk when the bible was packaged — note for the creator."$'\n'
    note "optional artifact missing (non-fatal): $rel"
  fi
done

OUT="$PROJECT_DIR/character-bible.md"
TODAY=$(date +%F)

# --- write the manifest. The downstream-use paragraph is FIXED (the fleet contract). ---
{
  printf '# Character Bible: %s\n\n' "$NAME"
  printf 'The portable identity anchor for **%s**. Lock this character once here; the downstream\n' "$NAME"
  printf 'director bots reuse it across every shot and model. Built %s.\n\n' "$TODAY"

  printf '## Seed\n\n'
  printf '%s — the fixed generation seed for this character. Reuse it byte-identical on every\n' "$SEED"
  printf 'downstream generation; a new seed re-rolls the identity.\n\n'

  printf '## Artifacts\n\n'
  printf '| artifact | path | status |\n'
  printf '|---|---|---|\n'
  printf '%s\n' "$rows"

  if [ -n "$missing_notes" ]; then
    printf '### Missing artifacts\n\n'
    printf '%s\n' "$missing_notes"
  fi

  printf '## How downstream director bots consume this\n\n'
  printf 'The cinematic director bots (BOT-017 Seedance, BOT-018 Kling) consume this bible as a\n'
  printf 'controlled identity anchor, the same way for both so the fleet can compare video models on\n'
  printf 'one bible. **Front-frame:** `hero.png` is the clean front portrait fed as the image-to-video\n'
  printf 'start frame. **Identity reference:** `reference-sheet.png` is the multi-view turnaround passed\n'
  printf 'as the reference image so the model holds the same face/hair/outfit across angles and cuts.\n'
  printf '**Tokens:** the frozen `CHARACTER_BLOCK` from `character-spec.md` is pasted verbatim (never\n'
  printf 'paraphrased) into every prompt, with the seed above, so identity is carried by reference image\n'
  printf '+ verbatim tokens + fixed seed together — not by re-describing the character each time.\n'
} > "$OUT"

note "wrote $OUT ($present_count artifact(s) indexed)"
printf 'character-bible\t%s\tseed=%s\tartifacts=%s\n' "$OUT" "$SEED" "$present_count"
