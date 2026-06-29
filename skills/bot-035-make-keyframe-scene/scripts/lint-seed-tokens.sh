#!/usr/bin/env bash
# lint-seed-tokens.sh — the FREE token-lock check for the token seed kit.
#
# BOT-035 is a TOKEN kit (no PNG anchors): identity is pinned by 5-7 FROZEN CHARACTER tokens
# in artifacts/seed/identity.md, mirrored byte-identical into seed.manifest.json
# identity.tokens. Because there are no anchors, an `update-character` RESET is FREE and
# INSTANT: re-read the edited docs, re-freeze the tokens, and re-run THIS structural linter
# (no image generation). This is the "token-lock check" the reset route runs.
#
# Checks (all structural, zero LLM judgment, no network):
#   - identity.md has a '## Character tokens' (or '## Character') section with 5-7
#     '- <key>: <token>' bullets, each with a non-empty token value
#   - style.md has a non-empty '## Style' (look header) section
#   - seed.manifest.json is valid JSON with kitType==token, consumption==text-weave,
#     anchors==[] (token kits ship NO anchors), and recipe.acceptsKitTypes contains "token"
#   - the manifest identity.tokens array is byte-identical (same set, same order) to the
#     identity.md token values — the freeze actually took
#   - the manifest seed is an integer and matches the '## Seed' value in identity.md
#
# Usage:  lint-seed-tokens.sh <seed-dir>   (e.g. lint-seed-tokens.sh artifacts/seed)
# Exit:   0 = locked & consistent, 1 = problems (line-itemized on stdout), 2 = usage/deps
set -euo pipefail

usage() { echo "usage: lint-seed-tokens.sh <seed-dir>" >&2; exit 2; }

for dep in python3; do
  command -v "$dep" >/dev/null 2>&1 || { echo "ERROR: required dependency '$dep' not found" >&2; exit 2; }
done

[ "$#" -eq 1 ] || usage
SEED_DIR=${1%/}
MANIFEST="$SEED_DIR/seed.manifest.json"
IDENTITY="$SEED_DIR/identity.md"
STYLE="$SEED_DIR/style.md"

for f in "$MANIFEST" "$IDENTITY" "$STYLE"; do
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 1; }
done

python3 - "$MANIFEST" "$IDENTITY" "$STYLE" <<'PY'
import json, re, sys

manifest_path, identity_path, style_path = sys.argv[1], sys.argv[2], sys.argv[3]
errors = []

def norm(s):
    return re.sub(r'\s+', ' ', s).strip()

# --- identity.md: the frozen Character token bullets ---------------------------------------
itext = open(identity_path, encoding="utf-8").read()
def section_body(text, *names):
    for name in names:
        pat = re.compile(r'^##[ \t]+' + re.escape(name) + r'\b[^\n]*\n(.*?)(?=^##[ \t]|\Z)',
                         re.MULTILINE | re.DOTALL)
        m = pat.search(text)
        if m:
            return m.group(1)
    return ""

char_body = section_body(itext, "Character tokens", "Character")
id_tokens = []
for line in char_body.splitlines():
    line = line.strip()
    if not line.startswith("-"):
        continue
    body = line[1:].strip()          # the whole "key: value" bullet (doc-07 token shape)
    if ":" not in body:
        errors.append('identity.md Character bullet must be "- <key>: <token>": "%s"' % body[:60])
        continue
    rhs = body.split(":", 1)[1].strip()
    if not rhs:
        errors.append('identity.md Character token has an empty value: "%s"' % body[:60])
        continue
    id_tokens.append(norm(body))

if len(id_tokens) < 5 or len(id_tokens) > 7:
    errors.append('identity.md must freeze 5-7 Character tokens (found %d) — face/body/color/eyes/signature' % len(id_tokens))

# seed in identity.md
sm = re.search(r'^##[ \t]+Seed\b[^\n]*\n+\s*([0-9]+)', itext, re.MULTILINE)
id_seed = int(sm.group(1)) if sm else None
if id_seed is None:
    errors.append('identity.md is missing a "## Seed" section with an integer seed')

# --- style.md: a non-empty look header -----------------------------------------------------
stext = open(style_path, encoding="utf-8").read()
style_body = norm(section_body(stext, "Style", "Style header"))
if not style_body:
    errors.append('style.md is missing a non-empty "## Style" look header section')

# --- manifest: shape + the byte-identical token freeze -------------------------------------
try:
    man = json.load(open(manifest_path, encoding="utf-8"))
except Exception as e:
    print("FAIL: seed.manifest.json is not valid JSON: %s" % e)
    sys.exit(1)

if man.get("kitType") != "token":
    errors.append('manifest kitType must be "token" (got %r)' % man.get("kitType"))
if man.get("consumption") != "text-weave":
    errors.append('manifest consumption must be "text-weave" (got %r)' % man.get("consumption"))
if man.get("anchors") != []:
    errors.append('manifest anchors must be [] for a token kit (no PNG anchors by design)')
accepts = (man.get("recipe") or {}).get("acceptsKitTypes")
if not (isinstance(accepts, list) and "token" in accepts):
    errors.append('manifest recipe.acceptsKitTypes must include "token" (got %r)' % accepts)

man_tokens = ((man.get("identity") or {}).get("tokens")) or []
man_tokens_n = [norm(t) for t in man_tokens if isinstance(t, str)]
id_tokens_n = [norm(t) for t in id_tokens]
if man_tokens_n != id_tokens_n:
    errors.append("manifest identity.tokens are NOT byte-identical to identity.md tokens — the freeze did not take")
    errors.append("  identity.md : %s" % id_tokens_n)
    errors.append("  manifest    : %s" % man_tokens_n)

man_seed = man.get("seed")
if not isinstance(man_seed, int):
    errors.append('manifest seed must be an integer (got %r)' % man_seed)
elif id_seed is not None and man_seed != id_seed:
    errors.append('manifest seed (%r) does not match identity.md "## Seed" (%r)' % (man_seed, id_seed))

if errors:
    print("FAIL: %d token-lock error(s) in %s" % (len(errors), manifest_path))
    for e in errors:
        print("  " + e)
    sys.exit(1)

print("OK: token-lock — %d frozen tokens, seed %s, kitType token / consumption text-weave, anchors []; manifest matches identity.md verbatim"
      % (len(id_tokens), man_seed))
PY
