# Seedance reference-to-video — mechanics, cost, and failure triage

> Harvested from BOT-027 cinematic-director-seedance (`bot-027-seedance-cinematic`
> `references/seedance-dialect.md`), 2026-08. The routing row itself lives in
> `../../video-prompting/SKILL.md` — this file is operating gotchas, not a second
> routing table. Cross-pipeline billing/proxy rules live in the studio ledger:
> `../../assembly-qc/references/models-and-gotchas.md` (read it before debugging any
> failure).

## The call shape (one pass per scene)

```bash
ai-gen video "$(cat artifacts/<project>/shots/NN/prompt.txt)" \
  -m bytedance/seedance-2.0/fast/reference-to-video \
  --ref artifacts/<project>/character/sheet.png \
  --ref artifacts/<project>/character/hero.png \
  --duration <s, within the measured envelope> --aspect-ratio <16:9|9:16|1:1> \
  --resolution <480p|720p> --audio on --max-cost <cr> --format json
```

## Mechanics

- **`--ref` maps to `image_urls`, IN ORDER.** The first `--ref` is `@Image1` in the
  prompt, the second `@Image2`. Sheet first (identity/turnaround), hero second (canonical
  look). Local paths and hosted URLs both work (the CLI uploads locals). An untagged
  reference gets averaged into mush — the prompt's identity line must address both.
- **Native audio is default-ON** for reference-to-video, no surcharge — the MP4 arrives
  WITH score + SFX + ambience, steered by the prompt's `Audio:` line. Never add a music
  bed downstream (it doubles up).
- **Duration: obey the MEASURED envelope** (≤10s @720p / ≤12s @480p, as-of 2026-07-22).
  The schema and `estimate` claim 15s; a 15s submit returns 422 — uncharged but slow to
  fail. <!-- BOT-027's 15s PoC (2026-06-20) predates the measurement. -->
- **Resolution 480p/720p only** on the fast tier (no 1080p). 480p roughly halves cost —
  the draft tier.
- **Slug discipline:** the namespace is the **bare** `bytedance/seedance-2.0/...` — the
  `fal-ai/bytedance/...` form 404s. `standard` tier = drop the `/fast/` segment. Always
  pass `-m` explicitly. Discovery is informative only: the proxy has served unlisted
  models and 404'd listed ones; the JSON `success` field is the only truth. A wholesale
  engine swap is STOP-and-ask.
- **JSON contract:** the local file is `files[0].local_path` (files[] entries are
  OBJECTS — parse, don't regex); the hosted URL is `hosted_urls[0]` (`*.fal.media`).
  Hosted URLs expire — download and keep `local_path` immediately.

## Cost

- Basis is **`ai-gen estimate` + balance deltas, NEVER `credits_used`** (over-reports
  ~8.4× on Seedance). Verified points: 4s @480p ≈ 108 cr (~$0.43); a full-length 720p
  pass runs several hundred credits (the donor's 15s/720p pass estimated ~908 cr ≈
  $3.63 — pre-envelope figure; estimate your actual duration).
- `--max-cost` is in credits (1 cr ≈ $0.004) and aborts BEFORE submitting when the
  estimate exceeds it (exit 13): raise the cap, drop to 480p, or shorten the scene.
- 422 = uncharged schema mismatch: re-inspect the exact field (`ai-gen info <slug>`),
  fix it — don't blind-retry.

## Failure triage

| Symptom | Cause | Response |
|---|---|---|
| Call exits non-zero | arg rejected / upstream / queue | read stderr; 422 → fix the exact field; else once more, then change params |
| Output has NO audio stream | audio didn't fire | re-render the pass (native audio is the contract); never ship silent as "with audio" |
| Duration off by >1s (real A/V) | model chose a different length | DELIVER + FLAG in the shots record; don't discard a usable scene over a wobble |
| Identity drifts across shots | paraphrased tokens / >6 shots / weak refs | ≤6 shots per scene; BOTH refs passed; tokens verbatim; re-render is the lever, not a mid-run rewrite |
| Wrong audio mood / stock-music feel | `Audio:` line vague | sharpen the score + SFX + ambience clause; re-render |
| Garbled in-frame text | engine text rendering | keep text out of shots; titles are post (assembly-qc) |
| Slug 404s though "listed" | catalog volatility / wrong namespace | confirm the bare slug; attempt regardless of discovery; engine swap = STOP-and-ask |
| Two identical failures | — | change the prompt or parameters; never retry verbatim |

## The fallback route (recorded, never silent)

If a scene's r2v pass fails twice even after a prompt/param change: fall back to
per-shot generation — one `bytedance/seedance-2.0/fast/image-to-video` clip per shot
(video-prompting's single-shot row), start frame = `character/hero.png`, the shot's text
+ the constraint suffix as the prompt — then normalize + concat via assembly-qc (QC-01
first). This trades the single-pass identity lock for a shared start frame + verbatim
shot text, and native cuts for concat seams. Say so in the shots record: which route
shipped and why the pass was abandoned. If every route fails, the run stops with the
failure recorded — never a fabricated or placeholder MP4.
