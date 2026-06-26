#!/usr/bin/env bash
# validate.sh — THE pre-render gate for a per-project Remotion app (BOT-032 Remotion Studio).
#
#   bash validate.sh <remotion-project-dir> <out-snapshots-dir> [at-seconds-csv]
#   e.g. bash validate.sh artifacts/launch-teaser/remotion-project artifacts/launch-teaser/snapshots "2,6,11"
#
# Runs FOUR checks IN ORDER, cheap -> expensive, and exits 0 only if ALL pass. The first failing
# gate writes a BLOCKED verdict and stops (no point typechecking a skewed install, no point
# rendering a still that won't compile):
#   1. version-skew  — every @remotion/* + remotion resolve to ONE version (skew is the #1 break). BLOCK
#   2. tsc --noEmit  — strict typecheck (the dominant LLM-authoring failure: bad imports/props).   BLOCK
#   3. contract lint — grep src/ for the forbidden patterns (contract C1-C9; see
#                      references/contract-lint-rules.md). Any BLOCK-tier hit fails the gate.       BLOCK
#   4. still render   — `remotion still <Comp> --frame=<t*FPS> --scale=0.25` per timestamp, with the
#                       pinned Chrome Headless Shell; proves mount + fonts loaded + non-blank.      BLOCK
#
# Writes the verdict to  <project>/05-validation.md  (project = parent of <remotion-project-dir>)
# and the still PNGs to  <out-snapshots-dir>/  for the SESSION to VISION-grade. This renders STILLS
# ONLY (one frame each at --scale=0.25) — it never runs a full render. That is rm-render's job, and
# only on a PASS.
#
# bash 3.2 safe: no `timeout`, no GNU-only flags, no rsync, no mapfile/readarray, no process subst.
set -uo pipefail

RMDIR="${1:?usage: validate.sh <remotion-project-dir> <out-snapshots-dir> [at-seconds-csv]}"
SNAPS="${2:?usage: validate.sh <remotion-project-dir> <out-snapshots-dir> [at-seconds-csv]}"
AT="${3:-}"

FPS="${RM_FPS:-30}"                 # the engine contract pins FPS=30 (src/engine/tokens.ts)
SCALE="${RM_STILL_SCALE:-0.25}"     # 1/4 size: fast, non-blank vision check (1920x1080 -> 480x270)
ENTRY="src/index.ts"                # registerRoot entry (the bundled starter ships this)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -d "$RMDIR" ] || { echo "!! no Remotion project at $RMDIR — run rm-build (init.sh) first." >&2; exit 1; }
PROJ_ROOT="$(cd "$(dirname "$RMDIR")" && pwd)"
RMDIR="$(cd "$RMDIR" && pwd)"
REPORT="$PROJ_ROOT/05-validation.md"
SRC="$RMDIR/src"
WORK="$(mktemp -d 2>/dev/null || echo /tmp/rm-validate.$$)"; mkdir -p "$WORK" "$SNAPS"
# Absolutize SNAPS — the still loop writes $OUT from inside a `cd "$RMDIR"` subshell, so a
# RELATIVE snapshots dir would resolve against $RMDIR (wrong) and every still would fail to write.
SNAPS="$(cd "$SNAPS" && pwd)"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---- Resolve the remotion binary: GLOBAL first (~25x faster than `npx --yes`, which downloads),
#      then the project-local .bin, then `npx --no-install` (uses the local install, never downloads).
RM="$(command -v remotion 2>/dev/null || true)"
if [ -z "$RM" ] && [ -x "$RMDIR/node_modules/.bin/remotion" ]; then RM="$RMDIR/node_modules/.bin/remotion"; fi
[ -z "$RM" ] && RM="npx --no-install remotion"

# ---- Chrome: sl8-animation ships a pre-downloaded Chrome Headless Shell. Remotion has NO env for the
#      browser path and E2B does not inherit image ENV, so pass it explicitly or Remotion re-downloads.
CHROME_SHELL="${CHROME_HEADLESS_SHELL:-/opt/remotion/chrome-headless-shell}"
BROWSER_FLAG=""
[ -x "$CHROME_SHELL" ] && BROWSER_FLAG="--browser-executable=$CHROME_SHELL"

# ---- props.json is optional (the composition has defaultProps). Pass it when present.
PROPS_FLAG=""
[ -f "$RMDIR/props.json" ] && PROPS_FLAG="--props=./props.json"

# ---- Start the report.
{
  echo "# 05 — Validation (rm-validate gate)"
  echo
  echo "- project app: \`$RMDIR\`"
  echo "- validated (UTC): $TS"
  echo "- entry: \`$ENTRY\`  fps: \`$FPS\`  still-scale: \`$SCALE\`"
  echo "- remotion binary: \`$RM\`"
  [ -n "$BROWSER_FLAG" ] && echo "- chrome: \`$CHROME_SHELL\`" || echo "- chrome: system (no pinned shell; host/playground mode)"
  echo
  echo "Gate ladder (cheap -> expensive; the first failure BLOCKS and stops)."
  echo
} > "$REPORT"

# fail <gate> <one-line-reason>  — write the BLOCKED verdict and exit non-zero.
fail () {
  {
    echo
    echo "## Verdict"
    echo
    echo "**BLOCKED** at gate: **$1**."
    echo
    echo "> $2"
    echo
    echo "Route the fix back to **rm-build** (re-author \`src/\` in place — do NOT re-init), then re-run"
    echo "this gate. Do NOT run rm-render on a BLOCKED composition. See \`references/contract-lint-rules.md\`."
  } >> "$REPORT"
  echo "!! BLOCKED at $1: $2" >&2
  echo ">> wrote $REPORT"
  exit 2
}

# ============================================================================
# 1. VERSION SKEW (contract C11) — all @remotion/* + remotion resolve to ONE version.
# ============================================================================
echo ">> [1/4] version skew ..."
SKEW="$(cd "$RMDIR" && node -e '
  const fs=require("fs");
  const v=p=>{try{return JSON.parse(fs.readFileSync(p,"utf8")).version}catch(e){return null}};
  const root=v("node_modules/remotion/package.json");
  if(!root){process.stdout.write("MISSING");process.exit(0)}
  let bad=[];
  const dir="node_modules/@remotion";
  if(fs.existsSync(dir))for(const m of fs.readdirSync(dir)){const ver=v(dir+"/"+m+"/package.json"); if(ver&&ver!==root)bad.push("@remotion/"+m+"@"+ver);}
  process.stdout.write(bad.length?("SKEW root="+root+" :: "+bad.join(", ")):("OK "+root));
' 2>/dev/null || echo MISSING)"
{
  echo "## 1. Version skew (C11)"
  echo
  echo '```'
  echo "$SKEW"
  echo '```'
  echo
} >> "$REPORT"
case "$SKEW" in
  OK\ *)   echo "   OK ($SKEW)" ;;
  MISSING) fail "version-skew" "node_modules/remotion is missing — deps are not installed. Run rm-build (scripts/init.sh) before validating." ;;
  *)       fail "version-skew" "Not all @remotion/* resolve to one version: $SKEW. Re-pin every @remotion/* + remotion to ONE version and reinstall (rm-build/init.sh does this)." ;;
esac

# ============================================================================
# 2. TYPECHECK (contract C8 + general correctness) — strict tsc --noEmit.
# ============================================================================
echo ">> [2/4] tsc --noEmit ..."
if [ -x "$RMDIR/node_modules/.bin/tsc" ]; then TSC="$RMDIR/node_modules/.bin/tsc"; else TSC="npx --no-install tsc"; fi
TSC_OUT="$( cd "$RMDIR" && $TSC --noEmit 2>&1 )"; TSC_RC=$?
TSC_ERRS="$(printf '%s\n' "$TSC_OUT" | grep -c 'error TS' 2>/dev/null | tr -d ' ')"
{
  echo "## 2. Typecheck — tsc --noEmit (C8 + general)"
  echo
  echo "- exit: \`$TSC_RC\`  error lines: \`${TSC_ERRS:-0}\`"
  if [ "$TSC_RC" != "0" ]; then
    echo
    echo '```'
    printf '%s\n' "$TSC_OUT" | head -60
    echo '```'
  fi
  echo
} >> "$REPORT"
[ "$TSC_RC" = "0" ] || fail "tsc" "tsc --noEmit reported ${TSC_ERRS:-?} error(s) (see report). Fix the types/imports/props in rm-build."
echo "   OK (0 type errors)"

# ============================================================================
# 3. CONTRACT LINT (contract C1-C9) — static scan of src/ for forbidden patterns.
#    BLOCK-tier hits fail the gate; WARN-tier hits are advisory (recorded, do not block).
# ============================================================================
echo ">> [3/4] contract lint ..."
LINT="$WORK/lint.txt"; : > "$LINT"
BLOCK_HITS=0
WARN_HITS=0

# Lint the CODE, not the comments: blank out // and /* */ (the engine documents the forbidden
# patterns in its own comments). code.txt holds `src/<rel>:<lineno>:<code>` lines with strings kept.
CODE="$WORK/code.txt"
node "$SCRIPT_DIR/strip-comments.mjs" "$SRC" > "$CODE" 2>/dev/null || : > "$CODE"

# scan <code> <severity BLOCK|WARN> <ERE-regex> <description>
scan () {
  local code="$1" sev="$2" re="$3" desc="$4" hits
  hits="$(grep -En "$re" "$CODE" 2>/dev/null || true)"
  if [ -n "$hits" ]; then
    {
      echo "- [$sev] $code — $desc"
      printf '%s\n' "$hits" | head -20 | sed 's/^/      /'
    } >> "$LINT"
    if [ "$sev" = "BLOCK" ]; then BLOCK_HITS=$((BLOCK_HITS+1)); else WARN_HITS=$((WARN_HITS+1)); fi
  fi
}

# --- BLOCK tier (the contract's machine-checkable forbidden patterns) ---
scan "C1-wall-clock"  BLOCK '(setTimeout|setInterval|requestAnimationFrame|Date\.now|performance\.now|new[[:space:]]+Date\()' \
  "wall-clock / timer API — animation must be frame-driven (useCurrentFrame). The renderer steps frames headless; wall-clock motion freezes."
scan "C2-css-anim"    BLOCK '(@keyframes|animate-[a-z]|transitionDuration|transitionDelay|transitionProperty|transitionTimingFunction|animationName|animationDuration|animationDelay|animationIteration|(^|[^A-Za-z])(transition|animation)[[:space:]]*:)' \
  "CSS time-based animation / Tailwind animate-* — FORBIDDEN; it does not render. Drive motion with interpolate()/spring()."
scan "C3-random"      BLOCK 'Math\.random' \
  "Math.random — non-deterministic; renders differ run-to-run. Use random(seed) from remotion."
scan "C6-native-tag"  BLOCK '<(img|video|audio)([[:space:]]|/|>)' \
  "native <img>/<video>/<audio> — does not block the render on load -> blank/partial frames. Use <Img>/<OffthreadVideo>/<Audio>."
scan "C9-3d-gpu"      BLOCK '(@remotion/three|@react-three|ThreeCanvas)' \
  "3D / GPU package — deferred (REQ-005 RAM ceiling). v1 is 2D-only; >1.9GB -> Exit-137 OOM."
scan "C5-font-link"   BLOCK 'fonts\.googleapis' \
  "bare Google Fonts <link>/CSS — load fonts via @remotion/google-fonts loadFont({weights,subsets}) or local fonts."

# --- C7: asset paths must go through staticFile(). Two-stage: any string-literal src= that is NOT
#     http(s) and NOT staticFile(...) is a violation (a relative/fs path won't resolve in the bundle).
#     The `["'"'"']` token builds the quote char-class ["'] across bash single-quote boundaries.
C7_HITS="$(grep -En 'src[[:space:]]*=[[:space:]]*["'"'"']' "$CODE" 2>/dev/null | grep -vE 'staticFile|https?:' || true)"
if [ -n "$C7_HITS" ]; then
  { echo "- [BLOCK] C7-asset-path — string-literal asset src not wrapped in staticFile() (and not http). Stage into public/ and use staticFile().";
    printf '%s\n' "$C7_HITS" | head -20 | sed 's/^/      /'; } >> "$LINT"
  BLOCK_HITS=$((BLOCK_HITS+1))
fi

# --- WARN tier (advisory; recorded for the author + the vision grade, never blocks) ---
scan "C5-loadfont"    WARN  'loadFont\([[:space:]]*\)' \
  "loadFont() called with no options — the default makes 63-126 network requests at render (flaky). Pass {weights,subsets}."
# C4 (unclamped interpolate) is hard to lint per-call; flag any file that uses interpolate( but never
# names extrapolate/clamp anywhere — a strong signal of an unclamped ramp for the author to check.
for f in $(grep -rlE 'interpolate\(' "$SRC" 2>/dev/null || true); do
  if ! grep -qE 'extrapolate|clamp' "$f" 2>/dev/null; then
    echo "- [WARN] C4-interpolate — \`$f\` uses interpolate() but never sets extrapolateLeft/Right:\"clamp\" (overshoot risk)." >> "$LINT"
    WARN_HITS=$((WARN_HITS+1))
  fi
done

{
  echo "## 3. Contract lint (C1-C9)"
  echo
  echo "- BLOCK-tier findings: \`$BLOCK_HITS\`  WARN-tier (advisory): \`$WARN_HITS\`"
  echo
  if [ -s "$LINT" ]; then
    echo '```'
    cat "$LINT"
    echo '```'
  else
    echo "_clean — no forbidden patterns found._"
  fi
  echo
} >> "$REPORT"
[ "$BLOCK_HITS" -eq 0 ] || fail "contract-lint" "$BLOCK_HITS forbidden-pattern class(es) hit (see report + references/contract-lint-rules.md). Fix each in rm-build."
echo "   OK ($BLOCK_HITS block-tier, $WARN_HITS advisory)"

# ============================================================================
# 4. STILL RENDER — one frame per timestamp at --scale=0.25 (mount + fonts + non-blank proof).
# ============================================================================
echo ">> [4/4] still render ..."
[ -f "$RMDIR/$ENTRY" ] || fail "still" "no entry at $ENTRY (registerRoot). rm-build must keep src/index.ts."

# Composition id: props.json `compositionId`, else first <Composition id="..."> in src/ (prefer 16x9).
COMP_ID="$(cd "$RMDIR" && node -e '
  const fs=require("fs");
  let id="";
  try{const p=JSON.parse(fs.readFileSync("props.json","utf8")); if(p.compositionId) id=String(p.compositionId);}catch(e){}
  if(!id){
    const out=[];
    const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const fp=d+"/"+e.name; if(e.isDirectory()){if(e.name!=="node_modules")walk(fp);} else if(/\.(t|j)sx?$/.test(e.name)){try{const s=fs.readFileSync(fp,"utf8"); for(const m of s.matchAll(/id=["\x27]([^"\x27]+)["\x27]/g)) out.push(m[1]);}catch(e){}}}};
    try{walk("src");}catch(e){}
    id = out.find(x=>/16x9/i.test(x)) || out[0] || "";
  }
  process.stdout.write(id);
' 2>/dev/null || true)"
[ -n "$COMP_ID" ] || fail "still" "could not determine a <Composition> id (no props.compositionId and no id= in src/). rm-build must register at least one <Composition>."

# Timestamps: use the given CSV, else 3 points (~15%/50%/85%) derived from props.durationSeconds.
if [ -z "$AT" ]; then
  AT="$(cd "$RMDIR" && node -e '
    let d=12; try{const p=require("./props.json"); if(p.durationSeconds) d=Number(p.durationSeconds);}catch(e){}
    const pts=[Math.max(0,Math.round(d*0.15)),Math.round(d*0.5),Math.max(1,Math.round(d*0.85))];
    process.stdout.write([...new Set(pts)].join(","));
  ' 2>/dev/null || echo "1,6,11")"
fi
echo "   composition: $COMP_ID   timestamps(s): $AT"

# Build "t<TAB>frame" lines (frame = round(t*FPS)); iterate without process substitution (bash 3.2).
FRAMES="$(node -e '
  const a=(process.argv[1]||"").split(",").map(s=>s.trim()).filter(Boolean);
  const fps=Number(process.argv[2])||30;
  for(const t of a){const f=Math.round(parseFloat(t)*fps); if(!isNaN(f)) console.log(t+" "+f);}
' "$AT" "$FPS")"

STILL_OK=0; STILL_FAIL=0; THIN=0
SNAP_LINES="$WORK/snaps.txt"; : > "$SNAP_LINES"
while read -r T F; do
  [ -n "${F:-}" ] || continue
  OUT="$SNAPS/still-${T}s-f${F}.png"
  echo "   still @ ${T}s (frame $F) -> $OUT"
  ( cd "$RMDIR" && $RM still "$ENTRY" "$COMP_ID" "$OUT" \
      --frame="$F" --scale="$SCALE" $PROPS_FLAG $BROWSER_FLAG --gl=angle --log=error ) >/dev/null 2>"$WORK/still.err" || true
  if [ -s "$OUT" ]; then
    BYTES="$(wc -c < "$OUT" | tr -d ' ')"
    STILL_OK=$((STILL_OK+1))
    NOTE=""
    if [ "${BYTES:-0}" -lt 3000 ]; then NOTE="  (thin file ${BYTES}B — vision-check for a near-blank/solid frame)"; THIN=$((THIN+1)); fi
    echo "  - \`$OUT\` (${BYTES}B)$NOTE" >> "$SNAP_LINES"
  else
    STILL_FAIL=$((STILL_FAIL+1))
    echo "  - FAILED @ ${T}s (frame $F): $(head -3 "$WORK/still.err" 2>/dev/null | tr '\n' ' ')" >> "$SNAP_LINES"
  fi
done <<EOF
$FRAMES
EOF

{
  echo "## 4. Still render (mount + fonts + non-blank)"
  echo
  echo "- captured: \`$STILL_OK\`  failed: \`$STILL_FAIL\`  thin(<3KB): \`$THIN\`"
  echo
  cat "$SNAP_LINES"
  echo
} >> "$REPORT"

if [ "$STILL_OK" -lt 1 ] || [ "$STILL_FAIL" -gt 0 ]; then
  fail "still" "$STILL_FAIL still(s) failed to render (and/or 0 captured). Check the composition mounts and the Chrome shell; fix in rm-build."
fi

# ============================================================================
# PASS — record the verdict + the vision-grade instructions for the session.
# ============================================================================
{
  echo "## Verdict"
  echo
  echo "**PASS** — skew OK, tsc 0 errors, contract lint clean ($WARN_HITS advisory), $STILL_OK still(s) captured."
  echo "Ready for the SESSION vision grade, then rm-render."
  echo
  echo "## Vision grade (do this now, on the PNGs in \`$SNAPS\`)"
  echo
  echo "**Read** each still and judge the pixels (not the filename):"
  echo "- **Legible** — headline + key facts present and readable; strong contrast."
  echo "- **Safe-zone** — text not clipped at the edges; correct for the aspect ratio."
  echo "- **On-brand** — the 01-concept palette (hex) + fonts are applied (not generic defaults)."
  echo "- **Composed** — hierarchy + density per 03-storyboard; not a centered single element."
  echo "- **Facts (JTBD-2)** — every figure on screen == the input data, exactly (no rounding/invention)."
  echo "- **Ends clean (C10)** — the last timestamp is real content, not a dead/black tail or a clipped scene."
  echo
  echo "If any frame looks wrong (blank, clipped, wrong font, off-brand, wrong number), note it here and"
  echo "route the fix back to **rm-build** — never run a full render on a bad still."
} >> "$REPORT"

echo ">> PASS — wrote $REPORT ($STILL_OK still(s) in $SNAPS)"
exit 0
