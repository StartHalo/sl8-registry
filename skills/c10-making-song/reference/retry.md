# Retry-once commands

# Retry-once commands (step 10)

## The one retry (attempt 2)

Prompt lever: write `artifacts/<project>/source/prompt.v2.txt` with the one clause changed, then build its params:
`node -e "const fs=require('fs');const d='artifacts/<project>/source/';const p=JSON.parse(fs.readFileSync(d+'song.params.json','utf8'));p.prompt=fs.readFileSync(d+'prompt.v2.txt','utf8').trim();fs.writeFileSync(d+'song.v2.params.json',JSON.stringify(p,null,1))"`
Estimate it and read what remains:
`ai-gen estimate fal-ai/minimax-music/v2.6 --params-file artifacts/<project>/source/song.v2.params.json --format json > artifacts/<project>/source/song.v2.estimate.json`
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>`
Route lever (instrumental): estimate elevenlabs again for this attempt:
`ai-gen estimate fal-ai/elevenlabs/music --params-file artifacts/<project>/source/song.el.params.json --format json > artifacts/<project>/source/song.el.estimate.json`

Quote over what remains: open the gate, go to step 11, outcome stays partial:
`node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-retry --question "The one retry on <route> costs <quote2> credits, over the <remaining> remaining. Run it?" --options '[{"id":"a","label":"Run the retry on <route>","credits":<quote2>},{"id":"b","label":"Stop with attempt 1 and its debt","credits":0}]' --resume-at "step 10: retry-once (reads artifacts/<project>/source/song.v2.params.json and song.v2.estimate.json)" --quote <quote2>`

Otherwise run it to its own file; attempt 1 is never overwritten:
`ai-gen run fal-ai/minimax-music/v2.6 --params-file artifacts/<project>/source/song.v2.params.json --queue --strict-params --max-cost <quote2> -o artifacts/<project>/audio/ --format json > work/<project>/song.v2.result.json`
Route lever instead:
`ai-gen run fal-ai/elevenlabs/music --params-file artifacts/<project>/source/song.el.params.json --queue --strict-params --max-cost <quote_el> -o artifacts/<project>/audio/ --format json > work/<project>/song.v2.result.json`
`SRC=$(node -e "console.log(JSON.parse(require('fs').readFileSync('work/<project>/song.v2.result.json','utf8')).files[0].local_path)")`
`mv "$SRC" "artifacts/<project>/audio/<project>_v2.${SRC##*.}"`
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/song.v2.result.json --params artifacts/<project>/source/song.v2.params.json --json '{"item":"song","node":"audio","attempt":2,"lever":"<prompt: clause X replaces Y | route: fal-ai/elevenlabs/music>","declared":{"audio":"on","format":"mp3","length":"no target","delivery":"MP3 128k"},"credits":{"estimate":<quote2>},"files":["artifacts/<project>/audio/<project>_v2.<ext>"]}'`
(route lever: `--params artifacts/<project>/source/song.el.params.json` and the elevenlabs quote.) Measure it:
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/audio/<project>_v2.<ext>`
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs takes artifacts/<project>/audio/<project>_v2.<ext> --n 3`
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs loudness artifacts/<project>/audio/<project>_v2.<ext>`
plus the step 9 ffmpeg and ffprobe lines on `_v2`; re-add row 2 with its `measured` block under the same `--result`.

A failed retry (exit, no file):
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/source/song.v2.params.json --json '{"item":"song","node":"audio","endpoint":"fal-ai/minimax-music/v2.6","request_id":null,"status":"failed","attempt":2,"lever":"<lever>","notes":"exit <n> <error.code>","declared":{"audio":"on","format":"mp3","length":"no target","delivery":"MP3 128k"},"credits":{"estimate":<quote2 or null>},"files":[]}'`

## Second failure: the approve-next gate

Before the gate opens, save what a resumed third attempt needs: write `prompt.v3.txt` (one more clause moved), build `song.v3.params.json` exactly as v2 but from `prompt.v3.txt`, and estimate it (free):
`ai-gen estimate fal-ai/minimax-music/v2.6 --params-file artifacts/<project>/source/song.v3.params.json --format json > artifacts/<project>/source/song.v3.estimate.json`
`node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-next --question "Attempt 2 failed too (<figures or exit code>). A third attempt on <route> needs your explicit waiver of HR7. Run it, or stop with the takes so far?" --options '[{"id":"a","label":"Waive HR7 and run a third attempt on <route>","credits":<quote3 or null>},{"id":"b","label":"Stop with the takes so far","credits":0}]' --resume-at "step 10: retry-once, third attempt (reads artifacts/<project>/source/song.v3.params.json and song.v3.estimate.json)"`
Then go to step 11; outcome stays partial.

## Third attempt (only after approve-next a)

Step 1 has recorded the waiver:
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR7 --instruction "<the owner's words>"`
Estimate again (the command above), then:
`ai-gen run fal-ai/minimax-music/v2.6 --params-file artifacts/<project>/source/song.v3.params.json --queue --strict-params --max-cost <quote3> -o artifacts/<project>/audio/ --format json > work/<project>/song.v3.result.json`
`SRC=$(node -e "console.log(JSON.parse(require('fs').readFileSync('work/<project>/song.v3.result.json','utf8')).files[0].local_path)")`
`mv "$SRC" "artifacts/<project>/audio/<project>_v3.${SRC##*.}"`
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/song.v3.result.json --params artifacts/<project>/source/song.v3.params.json --json '{"item":"song","node":"audio","attempt":3,"lever":"<prompt: clause X replaces Y>","waiver":"<the owner's words>","declared":{"audio":"on","format":"mp3","length":"no target","delivery":"MP3 128k"},"credits":{"estimate":<quote3>},"files":["artifacts/<project>/audio/<project>_v3.<ext>"]}'`
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/audio/<project>_v3.<ext>`
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs takes artifacts/<project>/audio/<project>_v3.<ext> --n 3`
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs loudness artifacts/<project>/audio/<project>_v3.<ext>`
Re-add row 3 with its `measured` block under the same `--result`. A third failure ends partial with all takes listed.
