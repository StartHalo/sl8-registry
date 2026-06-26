#!/usr/bin/env bash
# init.sh — scaffold a project's Remotion app from the bundled starter, install the official
# remotion-best-practices skill into it, version-pin every @remotion/* to ONE resolved version,
# and install deps. After this, AUTHOR fresh React above it per 03-storyboard.md (the rm-build BODY).
#
#   bash "$SKILL/scripts/init.sh" <remotion-project-dir> [--force]
#   e.g. bash "$SKILL/scripts/init.sh" artifacts/launch-teaser/remotion-project
#
# Copies scripts/remotion-template/ (harvested BOT-014 engine in src/engine/, the StudioVideo
# contract, the per-AR Root, pinned @remotion/* deps, and .agents/skills/remotion-best-practices/)
# into <remotion-project-dir>, stages any produced voiceover/cutout/capture assets into public/,
# re-pins ALL @remotion/* to the runtime's resolved remotion version (version skew is the #1 render
# break), then installs. You start from a tsc-clean, render-proven baseline.
#
# Restyle/refine RE-AUTHOR the existing project IN PLACE — do NOT re-init. --force discards + rescaffolds.
#
# bash 3.2 safe: no `timeout`, no GNU-only flags, no rsync. Uses cp -R / find-free copy with a glob.
set -uo pipefail

DEST="${1:?usage: init.sh <remotion-project-dir> [--force]}"
FORCE="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/remotion-template"

[ -d "$TEMPLATE" ] || { echo "!! bundled starter not found at $TEMPLATE" >&2; exit 1; }

# Refuse to clobber a non-empty project unless --force (a restyle/refine re-authors in place).
if [ -d "$DEST" ] && [ -n "$(ls -A "$DEST" 2>/dev/null)" ] && [ "$FORCE" != "--force" ]; then
  echo "!! $DEST already exists and is non-empty." >&2
  echo "   A restyle/refine re-authors the existing app IN PLACE — do NOT re-init." >&2
  echo "   Pass --force only to discard and re-scaffold from the starter." >&2
  exit 1
fi

# 1. Copy the starter WITHOUT node_modules/.remotion (a host npm install may have created them).
#    Top-level glob + dotfile glob; case-skip the heavy dirs. Bash 3.2: guard each entry with -e.
mkdir -p "$DEST"
for entry in "$TEMPLATE"/* "$TEMPLATE"/.[!.]*; do
  [ -e "$entry" ] || continue
  base="$(basename "$entry")"
  case "$base" in
    node_modules|.remotion|.git) continue ;;
  esac
  cp -R "$entry" "$DEST"/
done
mkdir -p "$DEST/public"
echo ">> scaffolded Remotion app from remotion-template -> $DEST"

# 2. Confirm the official skill came along (authoring opens with `use remotion best practices`).
if [ -f "$DEST/.agents/skills/remotion-best-practices/SKILL.md" ]; then
  echo "   official remotion-best-practices skill installed at .agents/skills/ (37 rules + SKILL.md)"
else
  echo "   !! WARNING: .agents/skills/remotion-best-practices/SKILL.md missing — authoring will lack the rules." >&2
fi

# 3. Stage any produced assets into public/ so the author can reference them via staticFile().
#    Project model: artifacts/<project>/assets/{vo/*.wav,cutouts/*,captures/*}.  vo -> public/voiceover.
PROJ_DIR="$(cd "$(dirname "$DEST")" && pwd)"
ASSETS="$PROJ_DIR/assets"
if [ -d "$ASSETS" ]; then
  for sub in vo cutouts captures; do
    if [ -d "$ASSETS/$sub" ] && [ -n "$(ls -A "$ASSETS/$sub" 2>/dev/null)" ]; then
      dest_sub="$sub"; [ "$sub" = "vo" ] && dest_sub="voiceover"
      mkdir -p "$DEST/public/$dest_sub"
      cp -R "$ASSETS/$sub/." "$DEST/public/$dest_sub/" 2>/dev/null || true
      echo "   staged assets/$sub -> public/$dest_sub"
    fi
  done
fi

# 4. Version-pin: resolve ONE remotion version and rewrite every @remotion/* + remotion to it.
#    Priority: globally-installed remotion (the runtime's own version) > registry latest > the
#    version the starter ships pinned to. render.sh re-applies the same pin at render time.
CURRENT_PIN="$(cd "$DEST" && node -e 'try{process.stdout.write(require("./package.json").dependencies.remotion)}catch(e){process.stdout.write("4.0.473")}' 2>/dev/null || echo 4.0.473)"
detect_rv() {
  local v=""
  if command -v remotion >/dev/null 2>&1; then
    v="$(remotion versions 2>/dev/null | grep -oE '4\.[0-9]+\.[0-9]+' | head -1)"
    [ -n "$v" ] && { echo "$v"; return; }
  fi
  v="$(npm view remotion version 2>/dev/null)"
  [ -n "$v" ] && { echo "$v"; return; }
  echo "$CURRENT_PIN"
}
RV="$(detect_rv)"
echo ">> pinning all @remotion/* + remotion to $RV (was $CURRENT_PIN)"
( cd "$DEST" && node -e '
  const fs=require("fs"), path="./package.json", RV=process.argv[1];
  const p=JSON.parse(fs.readFileSync(path,"utf8"));
  for (const sec of ["dependencies","devDependencies"]) {
    const d=p[sec]||{};
    for (const k of Object.keys(d)) if (k==="remotion"||k.indexOf("@remotion/")===0) d[k]=RV;
  }
  fs.writeFileSync(path, JSON.stringify(p,null,2)+"\n");
' "$RV" ) || { echo "!! failed to re-pin package.json" >&2; exit 1; }

# 5. Install. Use the GLOBAL npm; prefer `npm ci` when the lockfile still matches the pin (fast,
#    reproducible), else `npm install` (the re-pin invalidated the lockfile and must regenerate it).
echo ">> installing deps (this is the slow step) ..."
if [ "$RV" = "$CURRENT_PIN" ] && [ -f "$DEST/package-lock.json" ]; then
  ( cd "$DEST" && npm ci --no-audit --no-fund ) || ( cd "$DEST" && npm install --no-audit --no-fund ) \
    || { echo "!! npm install failed" >&2; exit 1; }
else
  ( cd "$DEST" && npm install --no-audit --no-fund ) || { echo "!! npm install failed" >&2; exit 1; }
fi

# 6. Cross-check the pin actually resolved to one version (the same check rm-validate gates on).
SKEW="$(cd "$DEST" && node -e '
  const fs=require("fs");
  let bad=[];
  const root=fs.existsSync("node_modules/remotion/package.json")?JSON.parse(fs.readFileSync("node_modules/remotion/package.json","utf8")).version:null;
  const dir="node_modules/@remotion";
  if(fs.existsSync(dir)) for(const m of fs.readdirSync(dir)){
    const pj="node_modules/@remotion/"+m+"/package.json";
    if(fs.existsSync(pj)){const v=JSON.parse(fs.readFileSync(pj,"utf8")).version; if(root&&v!==root) bad.push("@remotion/"+m+"@"+v);}
  }
  process.stdout.write((root||"?")+(bad.length?(" SKEW:"+bad.join(",")):" (all aligned)"));
' 2>/dev/null || echo "?")"
echo ">> installed remotion: $SKEW"

cat <<'NEXT'

>> NEXT: AUTHOR the composition (the rm-build BODY).
   - Open the authoring turn with `use remotion best practices` and name the rule files the
     storyboard implies (references/authoring-method.md has the task->rule index).
   - Templated (JTBD-1/2/3/4): edit src/schema.ts + src/StudioVideo.tsx (or add src/components/*).
     Open-ended (JTBD-5): add new components + register a <Composition> per AR in src/Root.tsx.
   - Compose the engine (StyleProvider/FontProvider/SafeZone + primitives) + any capability
     components (captions / dataviz / audioviz). Honor references/composition-contract.md (C1-C12).
   - Write props.json with the FROZEN facts. Do NOT run a full render — hand off to rm-validate.
NEXT
