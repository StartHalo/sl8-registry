#!/usr/bin/env bash
# Pre-delivery mechanical scan for a web-generation-app build (WF51-a1 step 16). SL8-written.
# Usage: bash scan.sh <app dir> [--theme src/styles/theme.css]
#        bash scan.sh --selftest        (plants one defect per check in a temp app and expects a hit)
# Prints one line per check with its hit count and the hits; exits 1 if any check has a hit,
# 2 if ripgrep or the app's src/ is missing. Patterns are ours; the vendor's scan targeted its own
# design-system class names, which do not exist here.
set -u
command -v rg >/dev/null || { echo "scan: ripgrep (rg) is missing: the machine is broken (HR21)"; exit 2; }
if [ "${1:-}" = "--selftest" ]; then
  T="$(mktemp -d)"; HERE="$(cd "$(dirname "$0")" && pwd)"; bad=0
  mkdir -p "$T/src/lib" "$T/src/styles" "$T/dist/client" "$T/dist/server"; printf 'dist\n.output\n' > "$T/.gitignore"; (cd "$T" && git init -q 2>/dev/null)
  # a clean app: db.exec, ffprobe in media.server.ts, a #feed anchor and a server bundle that names the variables
  printf 'db.exec("x")\nconst a = "<a href=\\"#feed\\">"\n' > "$T/src/lib/db.server.ts"
  printf 'import { execFile } from "node:child_process"\nexecFile("ffprobe", [])\n' > "$T/src/lib/media.server.ts"
  printf 'const need = ["SL8_SESSION_TOKEN","APP_ACCESS_CODE"]\n' > "$T/dist/server/index.js"; echo ok > "$T/dist/client/app.js"
  bash "$0" "$T" >/dev/null || { echo "selftest FAIL: the clean app was flagged"; bad=1; }
  # defects, one per check
  printf 'const x = "#ff00aa"\n' > "$T/src/lib/a.ts"; printf 'import { spawn } from "node:child_process"\nspawn("ai-gen", [])\n' > "$T/src/lib/b.ts"
  printf 'const k = process.env.APP_ACCESS_CODE ?? "changeme"\nlocalStorage.setItem("a","b")\n' > "$T/src/lib/c.ts"
  printf 'console.log(prompt)\n' > "$T/src/lib/d.ts"; printf 'x(btoa(f))\n' > "$T/src/lib/e.ts"
  printf 'leak SL8_SESSION_TOKEN\n' > "$T/dist/client/leak.js"
  out="$(bash "$0" "$T" 2>&1)"; rc=$?
  [ "$rc" = 1 ] || { echo "selftest FAIL: defects not flagged (exit $rc)"; bad=1; }
  for c in raw-style-values binary-in-json ai-gen-outside-adapter child-process-outside-adapter browser-or-memory-db secret-fallback secret-in-bundle unsafe-logging; do
    printf '%s\n' "$out" | grep -E "^$c +[1-9]" >/dev/null || { echo "selftest FAIL: $c did not fire"; bad=1; }
  done
  rm -rf "$T"; [ "$bad" = 0 ] && echo "scan selftest: ok"; exit $bad
fi
APP="${1:?usage: scan.sh <app dir> [--theme <file under app>] | --selftest}"
THEME="src/styles/theme.css"
[ "${2:-}" = "--theme" ] && THEME="${3:?--theme needs a path}"
[ -d "$APP/src" ] || { echo "scan: no $APP/src"; exit 2; }
cd "$APP" || exit 2
fail=0
check () { # name, then rg arguments; SCAN_DROP is an optional extended regex of hit lines to ignore
  local name="$1"; shift
  local out; out="$(rg -n --no-heading "$@" 2>/dev/null)"
  [ -n "${SCAN_DROP:-}" ] && out="$(printf '%s\n' "$out" | grep -Ev "$SCAN_DROP")"
  local n=0; [ -n "$out" ] && n="$(printf '%s\n' "$out" | wc -l | tr -d ' ')"
  printf '%-28s %s\n' "$name" "$n"
  if [ "$n" != "0" ]; then printf '%s\n' "$out" | sed 's/^/    /' | head -20; fail=1; fi
}
# 1 raw palette classes, arbitrary px text and hex colours outside the token file (a hex needs a quote,
#   colon or paren before it, so anchors such as href="#feed" and ids are not colours)
SCAN_DROP='href=.#|id=.#|to=.#|\.getElementById' check raw-style-values -e 'bg-(red|blue|zinc|gray|slate|neutral)-[0-9]|text-(zinc|gray|slate|neutral)-[0-9]|text-\[[0-9]+px\]|[:(]\s*#[0-9a-fA-F]{3,8}\b|["'"'"'`]#[0-9a-fA-F]{6,8}\b' src --glob "!$THEME" --glob '!**/*.test.*'
# 2 binary or base64 across JSON (step 6)
check binary-in-json -e 'fromCharCode|btoa\(|toString\(.base64.\)|JSON\.stringify\(\s*file' src
# 3 only gen.server.ts names ai-gen or talks to the gateway or a fal host (step 4); db.exec( and the like are not ai-gen
check ai-gen-outside-adapter -e "['\"\`]ai-gen['\"\`]|AI_GEN_BIN|fetch\([^)]*(SL8_API_URL|fal\.(run|ai|media))" src --glob '!src/lib/gen.server.ts' --glob '!**/*.test.*'
# 3b child_process only in gen.server.ts (ai-gen) and media.server.ts (ffprobe, ffmpeg, convert)
check child-process-outside-adapter -e "child_process" src --glob '!src/lib/gen.server.ts' --glob '!src/lib/media.server.ts' --glob '!**/*.test.*'
# 4 product state in memory or the browser (step 10)
check browser-or-memory-db -e 'localStorage\.(setItem|getItem)|sessionStorage\.setItem|^(export )?(const|let) [a-zA-Z_]+(: [A-Za-z<>\[\]]+)? = \[\]' src --glob '!**/*.test.*'
# 5 secrets with a fallback value, or an empty access code accepted (step 3 / 16)
check secret-fallback -e '(APP_ACCESS_CODE|APP_ADMIN_CODE|APP_SESSION_SECRET|SL8_SESSION_TOKEN|SL8_API_URL)[^\n]*(\|\||\?\?)\s*["'"'"'`]' src
# 6 secrets or the gateway token reaching the browser bundle (step 3): the CLIENT output only. The server
#   bundle legitimately names the variables; the build folders are git-ignored, hence --no-ignore.
CLIENT=""; for d in dist/client .output/public; do [ -d "$d" ] && CLIENT="$CLIENT $d"; done
if [ -n "$CLIENT" ]; then
  check secret-in-bundle --no-ignore -e 'SL8_SESSION_TOKEN|APP_SESSION_SECRET|APP_ACCESS_CODE|APP_ADMIN_CODE' $CLIENT
else
  printf '%-28s %s\n' secret-in-bundle 'skipped (no dist/client or .output/public: run the build first)'
fi
# 7 logs that carry prompts, params or paths (step 12)
check unsafe-logging -e 'console\.(log|info|warn|error)\([^)]*(prompt|params|cookie|headers|filename|local_path|hosted_urls)' src
# 8 polling ai-gen with a wait flag on status, or an open-ended duration (HR6, HR5)
check status-wait-or-auto -e "'status'[^\n]*'--wait'|duration[\"']?\s*[:=]\s*[\"']auto" src
exit $fail
