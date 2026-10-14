# Recovery (step 13)

Read this file at step 13. Retry only on a measured failure (media-qc exit 1 or pixdiff.py exit 1), or on a product-fidelity miss the owner reports in a later brief. Fidelity and taste are never retried on the agent's own judgment (HR14).

## Generative paths (text and photo)

Attempt 2 stays on the route in plan.json and moves one named lever: a material-cue clause, the camera, the aspect, or the unaltered single reference. Write the lever in the row. A second miss, or any fidelity miss, switches route, following the Quality bar's last rule: the photo path if a photo is now attached, otherwise the fallback in plan.json (openai/gpt-image-2 or openai/gpt-image-2/edit). Before a route switch, run steps 3 to 6 for the new route, plus step 4 for a newly attached photo. Edits always start from the original photo. Never make a third attempt on one route; the fallback attempt uses -r3 and "attempt":3 on its own route.

Estimate and budget-check each attempt first:

```bash
ai-gen estimate <route> --params-file work/<project>/<item>-r2.params.json --format json > work/<project>/<item>-r2.estimate.json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

If an answered approve-retry with credits > 0 exists for this attempt (step 1) and the estimate is at most its credits, run the attempt now: the owner already approved it. Otherwise, if the attempt is over budget, save the params, open a gate, write PROGRESS.md and end partial:

```bash
mkdir -p artifacts/<project>/params && cp work/<project>/*.params.json artifacts/<project>/params/
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-retry --question "<route>, <item>, <estimate> credits" --options '[{"id":"a","label":"<route>","credits":<estimate>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 13: recover-from-a-miss" --quote <estimate>
```

Run the attempt into its own file name and record it:

```bash
ai-gen run <route> --params-file work/<project>/<item>-r2.params.json [--ref artifacts/<project>/source/<input>] --queue --strict-params --max-cost <estimate> -o artifacts/<project>/<node>/ --format json > work/<project>/<item>-r2.result.json
SRC=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/<item>-r2.result.json) && test ! -e artifacts/<project>/<node>/<item>-r2.png && mv "$SRC" artifacts/<project>/<node>/<item>-r2.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<item>-r2.result.json --params work/<project>/<item>-r2.params.json --json '{"item":"<item>","node":"<node>","declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"credits":{"estimate":<estimate>},"attempt":2,"lever":"<lever>","files":["<node>/<item>-r2.png"]}'
```

Then rerun step 12 on <node>/<item>-r2.png. When it measures exit 0:

- Text path: copy the retry to final/hero-r2.png, measure it, and add its tool row:

```bash
cp artifacts/<project>/variant_<v>/hero-<v>-r2.png artifacts/<project>/final/hero-r2.png && node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/hero-r2.png --aspect <W:H> --format png --alpha forbidden
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"hero-retry","node":"final","tool":"cp variant_<v>/hero-<v>-r2.png (retry promoted)","parents":["hero-<v>#2"],"declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"measured":{<figures>},"files":["final/hero-r2.png"]}'
```

- Photo path: the retry is already final/hero-r2.png (item hero, node final, attempt 2).

Never copy over final/hero.png, whose row holds a sha256. Name final/hero-r2.png as the delivered hero under Decisions. A retry that measures exit 1 again goes to the route switch, or ends partial with the figures.

## Background path (pixdiff.py exit 1)

composite.py is deterministic, so re-running it with the same cutout cannot change pixdiff. Do one Bria re-cut of the unaltered original, estimated first and gated as above:

```bash
cp work/<project>/cutout.params.json work/<project>/cutout-r2.params.json
ai-gen estimate fal-ai/bria/background/remove --params-file work/<project>/cutout-r2.params.json --format json > work/<project>/cutout-r2.estimate.json
ai-gen run fal-ai/bria/background/remove --params-file work/<project>/cutout-r2.params.json --image artifacts/<project>/source/<input> --queue --strict-params --max-cost <estimate> -o artifacts/<project>/keyframes/ --format json > work/<project>/cutout-r2.result.json
SRC=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/cutout-r2.result.json) && test ! -e artifacts/<project>/keyframes/cutout-r2.png && mv "$SRC" artifacts/<project>/keyframes/cutout-r2.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/cutout-r2.result.json --params work/<project>/cutout-r2.params.json --json '{"item":"cutout","node":"keyframes","declared":{"format":"png","alpha":"required"},"credits":{"estimate":<estimate>},"attempt":2,"lever":"re-cut from the unaltered original","files":["keyframes/cutout-r2.png"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/keyframes/cutout-r2.png --alpha required
```

Then re-composite (keep `--reserve-top 0.2` when copy is supplied), compare, measure, and add a new hero tool row:

```bash
python3 -I ${CLAUDE_SKILL_DIR}/scripts/composite.py --cutout artifacts/<project>/keyframes/cutout-r2.png --plate artifacts/<project>/keyframes/plate.png --aspect <W:H> --fill 0.6 --reserve-top 0.2 --placement work/<project>/placement-r2.json --out artifacts/<project>/final/hero-r2.png
python3 -I ${CLAUDE_SKILL_DIR}/scripts/pixdiff.py --original artifacts/<project>/source/<input> --cutout artifacts/<project>/keyframes/cutout-r2.png --final artifacts/<project>/final/hero-r2.png --placement work/<project>/placement-r2.json
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/hero-r2.png --aspect <W:H> --format png --alpha forbidden
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"hero-retry","node":"final","tool":"python3 scripts/composite.py on cutout#2","parents":["cutout#2","plate#1","source/<input>"],"declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"measured":{<figures>},"files":["final/hero-r2.png"]}'
```

A second pixdiff exit 1 ends partial and reports the figures. Never switch to gpt-image-2/edit or another generative redraw, because that would redraw the product this option promises to keep unchanged.
