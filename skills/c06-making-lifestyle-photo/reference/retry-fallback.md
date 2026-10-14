# Retry, then fallback (SKILL.md step 13)

This runs only on a measured failure (a media-qc exit 1 in step 10, or a failed ai-gen call recorded in step 8), or when a later brief from the owner orders it. It never runs on the agent's own view of fidelity or taste (HR14). Earlier files are never overwritten. Each attempt is estimated and checked against the budget first. Read the routes from plan.json:

```bash
PRIMARY=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json'))['route']['primary'])")
FALLBACK=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json'))['route']['fallback'])")
```

## Attempt 2: one retry on the primary

Move one named lever (HR7): the field named by an exit 7 in error.details (media-ai-gen recovery.md), the aspect or size field after an IQ-03, one prompt clause, or the unaltered original as the only product reference. Write `artifacts/<project>/params/lifestyle-01-a2.params.json` as lifestyle-01.params.json with that one lever changed. Keep every `--ref` of attempt 1, so Image 2 is never dropped:

```bash
ai-gen estimate "$PRIMARY" --params-file artifacts/<project>/params/lifestyle-01-a2.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
ai-gen run "$PRIMARY" --params-file artifacts/<project>/params/lifestyle-01-a2.params.json [--ref artifacts/<project>/source/product.<ext>] [--ref artifacts/<project>/source/scene.<ext>] --queue --strict-params --max-cost <cap-a2> -o artifacts/<project>/final/ --format json > work/<project>/lifestyle-01-a2.result.json
```

Then run SKILL.md steps 9 and 10 with stem lifestyle-01-a2, attempt 2 and the lever. A failed call is recorded like step 8's failed row, with `"attempt":2`, its lever, and `--params artifacts/<project>/params/lifestyle-01-a2.params.json`.

## Attempt 3: the fallback

A second failure goes to route.fallback, another model family. It uses the params file step 6 wrote in that family's shape (checked in step 5), and the same refs as attempt 1:

```bash
ai-gen estimate "$FALLBACK" --params-file artifacts/<project>/params/lifestyle-01-fb.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
ai-gen run "$FALLBACK" --params-file artifacts/<project>/params/lifestyle-01-fb.params.json [--ref artifacts/<project>/source/product.<ext>] [--ref artifacts/<project>/source/scene.<ext>] --queue --strict-params --max-cost <cap-fb> -o artifacts/<project>/final/ --format json > work/<project>/lifestyle-01-fb.result.json
```

Then run steps 9 and 10 with stem lifestyle-01-fb, attempt 3 and lever "route: <fallback>", and step 12 rebuilds the sheet. Caps follow step 7: the estimate, or ceil(1.5 x estimate) on `openai/gpt-image-2/edit`.

## When an attempt does not fit the budget

Its params are already under `artifacts/<project>/params/`. Open a gate, write PROGRESS.md and outcome.json `{"status":"partial"}`, and end. Option b spends nothing, and the outcome stays partial:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-fallback --question "<item, route, credits>" --options '[{"id":"a","label":"<fallback>","credits":<cap-fb>},{"id":"b","label":"Stop and deliver the earlier attempt with the defect named","credits":0}]' --resume-at "step 13: retry, then fallback" --quote <cap-fb>
```

## After the fallback

Nothing runs past the fallback; the source's third edit pick, Seedream v5 lite edit, is unmeasured on SL8. A failure with no route left, or with route.fallback null, is delivered with the defect named as a debt. A generated-scene result that misses fidelity is named as a debt, with the source's recovery as the next step: switch to the edit workflow once a photo is supplied. manifest.mjs add refuses a third attempt on the same route.
