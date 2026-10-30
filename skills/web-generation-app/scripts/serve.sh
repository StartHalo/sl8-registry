#!/usr/bin/env bash
# Run a built web-generation-app headless for the checks. SL8-written (review R6).
# Usage: bash serve.sh start <app dir> <work dir> [port]   |   bash serve.sh stop <work dir>
# start: on the first run writes <app>/.env.local (mode 600, git-ignored) with random APP_ACCESS_CODE,
# APP_ADMIN_CODE, a 64-hex APP_SESSION_SECRET and SL8_SPEND_LEDGER=data/spend.jsonl, and takes
# SL8_SPEND_CEILING from the environment (the job's budget in credits; exit 2 when unset). Values are
# never printed. SL8_SESSION_TOKEN and SL8_API_URL must already be in the environment. It runs
# `npm start` in the background (log: <work>/server.log, pid: <work>/server.pid) and waits up to 60 s
# for GET /api/session to answer 401. Exit 0 ready, 1 not ready, 2 usage or missing input.
set -u
cmd="${1:-}"
case "$cmd" in
start)
  APP="${2:?app dir}"; WORK="${3:?work dir}"; PORT="${4:-3000}"
  [ -f "$APP/package.json" ] || { echo "serve: no $APP/package.json"; exit 2; }
  mkdir -p "$WORK"; WORK="$(cd "$WORK" && pwd)"
  cd "$APP" || exit 2
  if [ ! -f .env.local ]; then
    [ -n "${SL8_SPEND_CEILING:-}" ] || { echo "serve: set SL8_SPEND_CEILING (credits) before the first start"; exit 2; }
    ( umask 077; node -e '
      const h = (n) => require("node:crypto").randomBytes(n).toString("hex")
      console.log(["APP_ACCESS_CODE=" + h(8), "APP_ADMIN_CODE=" + h(8), "APP_SESSION_SECRET=" + h(32), "SL8_SPEND_LEDGER=data/spend.jsonl"].join("\n"))' > .env.local )
    grep -qx '.env.local' .gitignore 2>/dev/null || echo '.env.local' >> .gitignore
  fi
  for v in SL8_SESSION_TOKEN SL8_API_URL; do [ -n "${!v:-}" ] || { echo "serve: $v is not in the environment: a machine gap, report it"; exit 2; }; done
  set -a; . ./.env.local; set +a
  [ -n "${SL8_SPEND_CEILING:-}" ] || { echo "serve: set SL8_SPEND_CEILING (credits)"; exit 2; }
  PORT="$PORT" nohup npm start > "$WORK/server.log" 2>&1 &
  echo $! > "$WORK/server.pid"
  for _ in $(seq 1 60); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/session")" = 401 ] && { echo "serve: ready on $PORT (pid $(cat "$WORK/server.pid"))"; exit 0; }
    kill -0 "$(cat "$WORK/server.pid")" 2>/dev/null || break
    sleep 1
  done
  echo "serve: not ready; last log lines:"; tail -5 "$WORK/server.log" | sed 's/^/    /'; exit 1 ;;
stop)
  WORK="${2:?work dir}"
  [ -f "$WORK/server.pid" ] || { echo "serve: no pid file"; exit 0; }
  pid="$(cat "$WORK/server.pid")"; kill "$pid" 2>/dev/null; pkill -P "$pid" 2>/dev/null; rm -f "$WORK/server.pid"; echo "serve: stopped $pid" ;;
*) echo "usage: serve.sh start <app dir> <work dir> [port] | stop <work dir>"; exit 2 ;;
esac
