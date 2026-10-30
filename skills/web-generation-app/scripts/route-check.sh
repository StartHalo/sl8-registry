#!/usr/bin/env bash
# Route checks for a running web-generation-app (WF51-a1 steps 3, 7, 15). SL8-written.
# Usage: [ROUTE_CHECK_CODE=<access code>] [ROUTE_CHECK_FILE=<completed generation id>] \
#        bash route-check.sh <base url> [extra routes: "/path" (GET) or "METHOD:/path"] ...
# Without a session cookie every server operation must answer 401 JSON (never a redirect to an HTML
# page), a GET to the generate route must answer 405, and a POST from a foreign Origin must answer 403.
# With ROUTE_CHECK_CODE (read it from the app's .env.local into the variable; never print it) the happy
# path runs too: login, an authenticated read, a Range request when ROUTE_CHECK_FILE is given, logout,
# and the old cookie refused. Add every route the build writes (references, chains, cover) as an extra
# argument. Exits 1 on any mismatch.
set -u
BASE="${1:?usage: route-check.sh <base url> [extra routes]}"; shift
command -v curl >/dev/null || { echo "route-check: curl missing"; exit 2; }
fail=0; JAR="$(mktemp)"; trap 'rm -f "$JAR"' EXIT
expect () { # method path want [body] [origin] [cookie jar flag...]
  local got ct m="$1" p="$2" w="$3" body="${4:-}" origin="${5:-$BASE}"
  got="$(curl -s -o /dev/null -w '%{http_code} %{content_type}' -X "$m" -H 'content-type: application/json' -H "origin: $origin" ${body:+--data "$body"} "$BASE$p")"
  ct="${got#* }"; got="${got%% *}"
  local ok=ok; [ "$got" = "$w" ] || ok=FAIL
  [ "$w" = 401 ] && [ "$got" = 401 ] && case "$ct" in application/json*) ;; *) ok=FAIL ;; esac
  printf '%-4s %-6s %-34s want %s got %s %s\n' "$ok" "$m" "$p" "$w" "$got" "$ct"
  [ "$ok" = ok ] || fail=1
}
authed () { # label, want, curl args...
  local label="$1" want="$2"; shift 2
  local got; got="$(curl -s -o /dev/null -w '%{http_code}' "$@")"
  local ok=ok; [ "$got" = "$want" ] || ok=FAIL
  printf '%-4s %-41s want %s got %s\n' "$ok" "$label" "$want" "$got"; [ "$ok" = ok ] || fail=1
}
expect GET  /api/session 401
expect POST /api/estimate 401 '{}'
expect POST /api/generate 401 '{}'
expect GET  /api/generate 405
expect GET  /api/generations 401
expect GET  /api/generations/does-not-exist 401
expect POST /api/media/upload 401
expect GET  /api/files/does-not-exist 401
expect GET  /api/admin/spend 401
expect POST /api/session/login 403 '{"code":"x"}' 'https://evil.invalid'
expect POST /api/session/login 400 '{"code":""}'
for r in "$@"; do case "$r" in *:/*) expect "${r%%:*}" "${r#*:}" 401 '{}' ;; *) expect GET "$r" 401 ;; esac; done
if [ -n "${ROUTE_CHECK_CODE:-}" ]; then
  authed "POST /api/session/login (right code)" 200 -c "$JAR" -X POST -H 'content-type: application/json' -H "origin: $BASE" --data "{\"code\":\"$ROUTE_CHECK_CODE\"}" "$BASE/api/session/login"
  authed "GET  /api/session (cookie)" 200 -b "$JAR" "$BASE/api/session"
  authed "GET  /api/generations (cookie)" 200 -b "$JAR" "$BASE/api/generations"
  authed "GET  /api/admin/spend (user cookie)" 403 -b "$JAR" "$BASE/api/admin/spend"
  [ -n "${ROUTE_CHECK_FILE:-}" ] && authed "GET  /api/files/<id> -r 0-99 (Range)" 206 -b "$JAR" -r 0-99 "$BASE/api/files/$ROUTE_CHECK_FILE"
  cp "$JAR" "$JAR.old"
  authed "POST /api/session/logout" 200 -b "$JAR" -c "$JAR" -X POST -H "origin: $BASE" "$BASE/api/session/logout"
  authed "GET  /api/session (old cookie, revoked)" 401 -b "$JAR.old" "$BASE/api/session"; rm -f "$JAR.old"
else
  echo "skip authenticated path: set ROUTE_CHECK_CODE to run login, an authenticated read, Range and logout"
fi
exit $fail
