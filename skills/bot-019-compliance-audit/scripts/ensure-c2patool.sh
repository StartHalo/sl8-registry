#!/usr/bin/env bash
# Make c2patool (C2PA provenance reader) available for the AB-723 audit's alteration-detection check.
# Order: already-on-PATH -> cached -> download the prebuilt linux binary from the Content Authenticity
# Initiative releases. If the download fails (offline/blocked), exit 4 so the audit DEGRADES to the
# declared-altered list + heuristic (C2PA is positive-signal only, so this never blocks the audit).
# On success prints  C2PATOOL_PATH::<abs path>  (or notes it's already on PATH).
set -u
CACHE="${C2PATOOL_CACHE:-$HOME/.cache/c2patool}"

if command -v c2patool >/dev/null 2>&1; then
  echo "c2patool: on PATH ($(command -v c2patool))"; exit 0
fi
if [ -x "$CACHE/c2patool" ]; then
  echo "C2PATOOL_PATH::$CACHE/c2patool"; exit 0
fi

mkdir -p "$CACHE"
echo "c2patool: resolving latest linux release..."
API="https://api.github.com/repos/contentauth/c2patool/releases/latest"
URL=$(curl -fsSL "$API" 2>/dev/null | grep -oE 'https://[^"]*x86_64-unknown-linux-gnu[^"]*\.(tar\.gz|zip)' | head -1)
if [ -z "${URL:-}" ]; then
  echo "c2patool: could not resolve a linux release asset -> DEGRADE" >&2; exit 4
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
if curl -fsSL "$URL" -o "$TMP/c2.archive" 2>/dev/null; then
  ( cd "$TMP" && { tar -xzf c2.archive 2>/dev/null || unzip -q c2.archive 2>/dev/null; } )
  BIN=$(find "$TMP" -name c2patool -type f 2>/dev/null | head -1)
  if [ -n "${BIN:-}" ]; then
    install -m 0755 "$BIN" "$CACHE/c2patool" && echo "C2PATOOL_PATH::$CACHE/c2patool" && exit 0
  fi
fi
echo "c2patool: download/extract failed -> DEGRADE to declared/heuristic" >&2
exit 4
