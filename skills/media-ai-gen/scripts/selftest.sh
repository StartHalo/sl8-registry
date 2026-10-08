#!/usr/bin/env bash
# selftest.sh: proves manifest.mjs and gate.mjs keep their contracts (row fields, retry levers, async
# merge, budget, verify, waivers, gates, partial/resume, text gates that do not block, parallel adds).
# Runs in a throwaway folder,
# spends nothing, needs node >= 20. Exit 0 when every case behaves; 1 otherwise. Studio check IMG-T3.
set -u
S="$(cd "$(dirname "$0")" && pwd)"
T="$(cd "$(mktemp -d)" && pwd -P)"   # physical path: the manifest stores paths relative to it
trap 'rm -rf "$T"' EXIT
cd "$T"
pass=0; fail=0
check () { local want=$1; shift; local name=$1; shift; "$@" > out.txt 2> err.txt; local rc=$?
  if [ "$rc" = "$want" ]; then pass=$((pass+1)); echo "ok   $name (exit $rc)"; else fail=$((fail+1)); echo "FAIL $name: exit $rc, wanted $want"; cat out.txt err.txt; fi; }
export SL8_SPEND_LEDGER="$T/ledger.jsonl" SL8_SPEND_CEILING=100
P=demo
check 0 init node $S/manifest.mjs init --project $P
check 0 init-idempotent node $S/manifest.mjs init --project $P
check 2 bad-project node $S/manifest.mjs init --project "Bad Name"
mkdir -p artifacts/$P/hero; printf 'png-bytes-1' > artifacts/$P/hero/a.png
echo '{"prompt":"a red cube","aspect_ratio":"16:9","resolution":"1K","num_images":1}' > work/$P/hero.params.json
cat > work/$P/hero.result.json <<J
{"schema_version":"2.0","success":true,"model":"fal-ai/nano-banana-pro","request_id":"req-1","files":[{"local_path":"$T/artifacts/$P/hero/a.png","kind":"image"}],"hosted_urls":["https://v3b.fal.media/x"],"credits_used":38,"credits_basis":"result"}
J
echo '{"at":"t","model":"fal-ai/nano-banana-pro","request_id":"req-1","credits_used":38,"credits_basis":"result"}' > ledger.jsonl
check 1 add-missing-declared node $S/manifest.mjs add --project $P --result work/$P/hero.result.json --params work/$P/hero.params.json --json '{"item":"hero","node":"hero","credits":{"estimate":38}}'
check 1 add-missing-estimate node $S/manifest.mjs add --project $P --result work/$P/hero.result.json --params work/$P/hero.params.json --json '{"item":"hero","node":"hero","declared":{"aspect":"16:9"}}'
check 0 add-attempt-1 node $S/manifest.mjs add --project $P --result work/$P/hero.result.json --params work/$P/hero.params.json --json '{"item":"hero","node":"hero","declared":{"aspect":"16:9"},"credits":{"estimate":38}}'
node -e 'const m=require("./artifacts/demo/manifest.json");const a=m.assets[0];if(a.files[0].path!=="hero/a.png"||a.credits.ledger!==38||a.request_id!=="req-1"||a.prompt!=="a red cube"||a.attempt!==1)process.exit(1)' && { pass=$((pass+1)); echo "ok   row-fields (path, ledger, request id, prompt, attempt)"; } || { fail=$((fail+1)); echo "FAIL row-fields"; cat artifacts/demo/manifest.json; }
printf 'png-bytes-2' > artifacts/$P/hero/b.png
sync_row () { echo "{\"item\":\"hero\",\"node\":\"hero\",\"endpoint\":\"$1\",\"request_id\":null,\"mode\":\"sync\",\"params\":{},\"declared\":{},\"credits\":{\"estimate\":38},\"files\":[\"artifacts/$P/hero/b.png\"]$2}"; }
check 1 retry-without-lever node $S/manifest.mjs add --project $P --json "$(sync_row fal-ai/nano-banana-pro '')"
check 0 retry-with-lever node $S/manifest.mjs add --project $P --json "$(sync_row fal-ai/nano-banana-pro ',"lever":"prompt: empty street, not no cars"')"
check 1 third-attempt-same-route node $S/manifest.mjs add --project $P --json "$(sync_row fal-ai/nano-banana-pro ',"lever":"reference added"')"
check 0 third-attempt-fallback-route node $S/manifest.mjs add --project $P --json "$(sync_row fal-ai/nano-banana-2 ',"lever":"fallback route"')"
echo '{"request_id":"req-2","model":"bytedance/seedance-2.0/fast/image-to-video"}' > work/$P/shot.submit.json
echo '{"duration":"4","resolution":"480p","generate_audio":false}' > work/$P/shot.params.json
check 1 async-without-pending node $S/manifest.mjs add --project $P --result work/$P/shot.submit.json --params work/$P/shot.params.json --json '{"item":"shot-1","node":"clips","declared":{"duration_s":4},"credits":{"estimate":108}}'
check 0 async-pending node $S/manifest.mjs add --project $P --result work/$P/shot.submit.json --params work/$P/shot.params.json --json '{"item":"shot-1","node":"clips","status":"pending","declared":{"duration_s":4},"credits":{"estimate":108}}'
check 0 verify-warns-pending node $S/manifest.mjs verify --project $P
grep -q 'WARN shot-1#1 pending' out.txt && { pass=$((pass+1)); echo "ok   pending-warning"; } || { fail=$((fail+1)); echo "FAIL pending-warning"; cat out.txt; }
mkdir -p artifacts/$P/clips; printf 'mp4' > artifacts/$P/clips/s1.mp4
echo "{\"schema_version\":\"2.0\",\"success\":true,\"model\":\"bytedance/seedance-2.0/fast/image-to-video\",\"request_id\":\"req-2\",\"files\":[{\"local_path\":\"$T/artifacts/$P/clips/s1.mp4\"}],\"credits_used\":108}" > work/$P/shot.result.json
echo '{"at":"t","model":"x","request_id":"req-2","credits_used":108}' >> ledger.jsonl
check 0 async-result-updates node $S/manifest.mjs add --project $P --result work/$P/shot.result.json --json '{"item":"shot-1","node":"clips"}'
node -e 'const m=require("./artifacts/demo/manifest.json");const r=m.assets.filter(a=>a.item==="shot-1");if(r.length!==1||r[0].status!=="done"||r[0].mode!=="async"||r[0].credits.ledger!==108||r[0].credits.estimate!==108)process.exit(1)' && { pass=$((pass+1)); echo "ok   async-row-merged"; } || { fail=$((fail+1)); echo "FAIL async-row-merged"; cat artifacts/demo/manifest.json; }
check 1 error-envelope-refused node $S/manifest.mjs add --project $P --result <(echo '{"success":false,"error":{"code":"TIMEOUT"}}') --json '{"item":"x","node":"x"}'
check 0 budget node $S/manifest.mjs budget --project $P
node -e 'const b=JSON.parse(require("fs").readFileSync("out.txt"));if(b.spent!==146||b.remaining!==0||b.calls!==2)process.exit(1)' && { pass=$((pass+1)); echo "ok   budget-figures (146 spent, 0 left of 100)"; } || { fail=$((fail+1)); echo "FAIL budget-figures"; cat out.txt; }
check 0 verify-clean node $S/manifest.mjs verify --project $P
printf 'tampered' > artifacts/$P/hero/a.png
check 1 verify-catches-change node $S/manifest.mjs verify --project $P
rm artifacts/$P/clips/s1.mp4
check 1 verify-catches-missing node $S/manifest.mjs verify --project $P
check 2 waive-needs-instruction node $S/manifest.mjs waive --project $P --rule HR5
check 0 waive node $S/manifest.mjs waive --project $P --rule HR5 --instruction "spend up to 300, I approve" --cost "+200 cr"
# gates
check 0 gate-status-none node $S/gate.mjs status --project $P
check 2 gate-open-bad-options node $S/gate.mjs open --project $P --slug approve-clips --question "Render?" --options '[{"id":"a"}]' --resume-at "step 4"
check 0 gate-open node $S/gate.mjs open --project $P --slug approve-clips --question "Render two 4 s clips at 480p for 216 credits?" --options '[{"id":"a","label":"Render both clips","credits":216},{"id":"b","label":"Stop with the stills","credits":0}]' --resume-at "step 4: render clips" --quote 216
[ -f artifacts/$P/gates/01-approve-clips.json ] && [ -f artifacts/$P/gates/01-approve-clips.md ] && node -e 'const o=require("./artifacts/demo/outcome.json");if(o.status!=="partial")process.exit(1)' && { pass=$((pass+1)); echo "ok   gate-files-and-outcome-partial"; } || { fail=$((fail+1)); echo "FAIL gate-files"; }
check 0 gate-open-reuses node $S/gate.mjs open --project $P --slug approve-clips --question "again" --options '[{"id":"a","label":"x"},{"id":"b","label":"y"}]' --resume-at "step 4"
grep -q '"reused":true' out.txt && { pass=$((pass+1)); echo "ok   gate-reuse"; } || { fail=$((fail+1)); echo "FAIL gate-reuse"; cat out.txt; }
check 10 gate-status-open node $S/gate.mjs status --project $P
check 2 gate-answer-bad-option env -u SL8_SPEND_LEDGER node $S/gate.mjs answer --project $P --gate 01 --option z
check 0 gate-answer env -u SL8_SPEND_LEDGER node $S/gate.mjs answer --project $P --gate 1 --option a --by "owner reply"
check 0 gate-status-answered node $S/gate.mjs status --project $P
grep -q '"resume_at": "step 4: render clips"' out.txt && { pass=$((pass+1)); echo "ok   gate-resume-at"; } || { fail=$((fail+1)); echo "FAIL gate-resume-at"; cat out.txt; }
check 1 gate-answer-twice env -u SL8_SPEND_LEDGER node $S/gate.mjs answer --project $P --gate 01 --option b
check 2 gate-text-needs-default node $S/gate.mjs open --project $P --slug tone --kind text --question "Tone?" --options '[{"id":"warm","label":"Warm"},{"id":"cool","label":"Cool"}]' --resume-at "step 2"
check 0 gate-text node $S/gate.mjs open --project $P --slug tone --kind text --default warm --question "Tone?" --options '[{"id":"warm","label":"Warm"},{"id":"cool","label":"Cool"}]' --resume-at "step 2"
# an open text gate never stops the next job (HR12: it proceeds on its default); status lists it, exit 0
check 0 gate-status-text-open-proceeds node $S/gate.mjs status --project $P
node -e 'const b=JSON.parse(require("fs").readFileSync("out.txt"));const t=b.open_text[0];if(b.open.length!==0||b.open_text.length!==1||t.slug!=="tone"||t.kind!=="text"||t.default!=="warm"||b.resume_at!=="step 4: render clips")process.exit(1)' && { pass=$((pass+1)); echo "ok   gate-text-listed-with-default"; } || { fail=$((fail+1)); echo "FAIL gate-text-listed-with-default"; cat out.txt; }
check 0 gate-waive node $S/gate.mjs waive --project $P --gate 02 --instruction "just pick one, do not ask"
node -e 'const m=require("./artifacts/demo/manifest.json");if(m.gates.length!==2||m.gates[0].status!=="answered"||m.gates[1].status!=="waived"||m.waivers.length!==2)process.exit(1)' && { pass=$((pass+1)); echo "ok   manifest-gate-index-and-waivers"; } || { fail=$((fail+1)); echo "FAIL manifest-gate-index"; cat artifacts/demo/manifest.json; }
# a second project: a text gate writes no partial outcome; only an open spend gate blocks, and its answer unblocks
Q=mixed
check 0 mixed-text-gate node $S/gate.mjs open --project $Q --slug scope --kind text --default a --question "Scope?" --options '[{"id":"a","label":"As briefed"},{"id":"b","label":"Shorter"}]' --resume-at "step 1"
[ ! -e artifacts/$Q/outcome.json ] && grep -q '"proceed_with":"a"' out.txt && { pass=$((pass+1)); echo "ok   text-gate-no-partial-outcome"; } || { fail=$((fail+1)); echo "FAIL text-gate-no-partial-outcome"; cat out.txt; ls artifacts/$Q; }
check 0 mixed-status-text-only node $S/gate.mjs status --project $Q
check 0 mixed-spend-gate node $S/gate.mjs open --project $Q --slug approve-structure --question "Render the beat map for 300 credits?" --options '[{"id":"a","label":"Approve","credits":300},{"id":"b","label":"Stop","credits":0}]' --resume-at "stage 2: stills" --quote 300
check 10 mixed-status-spend-blocks node $S/gate.mjs status --project $Q
node -e 'const b=JSON.parse(require("fs").readFileSync("out.txt"));if(b.open.length!==1||b.open[0].slug!=="approve-structure"||b.open[0].kind!=="spend"||b.open_text.length!==1||b.open_text[0].slug!=="scope"||b.resume_at!==null)process.exit(1)' && { pass=$((pass+1)); echo "ok   mixed-status-lists-both"; } || { fail=$((fail+1)); echo "FAIL mixed-status-lists-both"; cat out.txt; }
check 0 mixed-answer-spend env -u SL8_SPEND_LEDGER node $S/gate.mjs answer --project $Q --gate 02 --option a --by "owner reply"
check 0 mixed-status-unblocked node $S/gate.mjs status --project $Q
node -e 'const b=JSON.parse(require("fs").readFileSync("out.txt"));if(b.open.length!==0||b.open_text.length!==1||b.resume_at!=="stage 2: stills")process.exit(1)' && { pass=$((pass+1)); echo "ok   mixed-resume-at-after-answer"; } || { fail=$((fail+1)); echo "FAIL mixed-resume-at-after-answer"; cat out.txt; }
# 1.0.2: a job never answers its own spend gate (the owner answers outside a job, or a later job records it)
Q=selfgate
SL8_SPEND_LEDGER="$T/run-a/spend.jsonl" check 0 own-gate-open node $S/gate.mjs open --project $Q --slug approve-clips --question "Render?" --options '[{"id":"a","label":"Render","credits":20},{"id":"b","label":"Stop","credits":0}]' --resume-at "step 4"
SL8_SPEND_LEDGER="$T/run-a/spend.jsonl" check 1 own-gate-answer-refused node $S/gate.mjs answer --project $Q --gate 01 --option a --by "the same job"
check 10 own-gate-still-open node $S/gate.mjs status --project $Q
# 1.0.3: nor waives it (HR12): a waive is the user's instruction from outside the job, never the job's own
SL8_SPEND_LEDGER="$T/run-a/spend.jsonl" check 1 own-gate-waive-refused node $S/gate.mjs waive --project $Q --gate 01 --instruction "the user said go"
check 10 own-gate-open-after-waive-refused node $S/gate.mjs status --project $Q
SL8_SPEND_LEDGER="$T/run-b/spend.jsonl" check 0 next-job-answers node $S/gate.mjs answer --project $Q --gate 01 --option a --by "owner, via the next job's brief"
R=ownerout
SL8_SPEND_LEDGER="$T/run-c/spend.jsonl" check 0 owner-gate-open node $S/gate.mjs open --project $R --slug approve-vo --question "Voice?" --options '[{"id":"a","label":"Voice","credits":5},{"id":"b","label":"Stop","credits":0}]' --resume-at "step 5"
check 0 owner-answers-outside-a-job env -u SL8_SPEND_LEDGER node $S/gate.mjs answer --project $R --gate 01 --option a --by "owner"
# concurrency: 8 parallel adds must all land
for i in 1 2 3 4 5 6 7 8; do printf "f$i" > artifacts/$P/hero/p$i.png; node $S/manifest.mjs add --project $P --json "{\"item\":\"par-$i\",\"node\":\"hero\",\"tool\":\"convert\",\"declared\":{},\"files\":[\"artifacts/$P/hero/p$i.png\"]}" > /dev/null & done; wait
node -e 'const m=require("./artifacts/demo/manifest.json");if(m.assets.filter(a=>a.item.startsWith("par-")).length!==8)process.exit(1)' && { pass=$((pass+1)); echo "ok   parallel-adds-locked"; } || { fail=$((fail+1)); echo "FAIL parallel-adds"; }
echo "{\"check\":\"media-ai-gen selftest\",\"passed\":$pass,\"failed\":$fail}"
[ $fail -eq 0 ]
