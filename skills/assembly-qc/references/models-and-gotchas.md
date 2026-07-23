# models-and-gotchas — the earned-rules ledger (read before debugging ANY failure)

One dated row per hard-won rule. Status: ✅ verified on our models/proxy · ◐ adopted from
the study corpus, pending re-derivation on our models (treat as a strong hypothesis).
A failure becomes a row within 48h (P4). Rules 1–12 are ours (measured); 13–24 are
study-adopted with the source noted.

## Billing & the proxy

| # | Rule | Status / since |
|---|---|---|
| 1 | `estimate` is exact for Seedance/nano-banana (matched balance deltas to the credit, ~250 cr/USD); `credits_used` in responses over-reports ~8.4× on Seedance video — NEVER use it for accounting; balance deltas settle ~5 min late | ✅ 2026-07-04, re-confirmed 2026-07-22 (R02) |
| 2 | kokoro bills a ~5-cr per-call minimum vs its 1-cr char-based estimate — batch lines per block, never per-sentence; expect estimate under-count on tiny TTS calls | ✅ 2026-07-22 (R02) |
| 3 | The proxy **silently DROPS unknown params** (no error, no charge difference): `image_size` on nano-banana-pro was ignored → square 1:1 default. Always take param names from `ai-gen info` schema, and always set `aspect_ratio` explicitly | ✅ 2026-07-22 (R02) |
| 4 | Above-envelope Seedance durations return 422 UPSTREAM_VALIDATION — uncharged, but can sit IN_PROGRESS 30+ min before failing; the schema enum and `estimate` still advertise 15s. Measured fast-tier ceiling: ≤12s @480p, ≤10s @720p | ✅ 2026-07-04 |
| 5 | Seedance lives under the bare `bytedance/` namespace, NOT `fal-ai/` — tools assuming `fal-ai/<model>` wrongly report it unavailable | ✅ 2026-06-25 |
| 6 | Hosted result URLs expire — download immediately, keep `local_path`; journal every request id at submit time (recovery via `result <id>` from any process) | ✅ 2026-07-04 |
| 7 | `lab/tools/sl8-proxy.sh run` downloads only image/video keys — audio responses (`data.audio.url`) need a manual download | ✅ 2026-07-22 (R02) |
| 8 | Host-side ai-gen needs SL8_SESSION_TOKEN + SL8_API_URL (auto-set only in sandboxes); provision short-lived (~60 min) creds via `market/playground/lib/provision.ts` (the sl8-proxy.sh path) | ✅ 2026-07-22 |

## Generation

| # | Rule | Status / since |
|---|---|---|
| 9 | The 1-ref rule: identity frames pass ONE strong anchor (max 2 refs total) — refs weight equally and dilute (1 ref = 7/10 identity; 4 refs = 2/10) | ✅ 2026-07-04 |
| 10 | The key frame owns identity in r2v — the animated subject is the FRAME's subject; video-stage refs are insurance, not correction; typography is decided at the frame stage | ✅ 2026-07-04 |
| 11 | Seedance fast i2v 4s/480p = 108 cr (~$0.43); nano-banana-pro frame = 38 cr (~$0.15); kokoro ≈ 5 cr/call — the draft-tier trio for cheap tests | ✅ 2026-07-22 (R02) |
| 12 | `end_image_url` appears in Seedance 2.0 fast i2v's live schema (first/last-frame candidate) — UNVERIFIED on our proxy; the Library still holds Hailuo 02 as the only verified first/last engine. Probe before relying | ◐ 2026-07-22 (schema-listed) |
| 13 | Never describe logos/brand text in a generation prompt — video models mangle text; generate clean, composite the logo in post | ◐ study (robonuggets R1), consistent with №10 |
| 14 | Always end video prompts with negatives: "No text, no logos, no words · No cuts · No camera shake" (+ per-style bans); always end flat-style frame prompts with "not photoreal, no CGI, no 3D render" | ◐ study (robonuggets R5, Higgsfield, vox) |
| 15 | Camera moves come from a CLOSED vocab (static/push_in/pull_out/pan/tilt/parallax); free-form camera language warps flat art; "snap/punch-in/slam/quick zoom" produce a one-frame jump — ask for ONE smooth continuous move | ◐ study (vox, earned by failure there) |
| 16 | Anti-monotony: no two adjacent beats share a camera move; `static` is reserved for the payoff beat; vary stage lengths; one stillness beat before the reveal | ◐ study (vox beat-layer, op7418) |
| 17 | Text-lock guard on every text-bearing shot: "keep the HEADLINE TEXT sharp, legible and stable — do not warp or wobble the lettering"; identity anchors need an explicit FREEZE sentence (labels re-letter without it: "PARFUM"→"PAREUM" class) | ◐ study (vox) |
| 18 | Keep video prompts under ~200 words / motion-graphics prompts 1000–1500 chars — models ignore long prompts | ◐ study (robonuggets, op7418) |
| 19 | Cheap-tier test batches first (4s/480p), promote winners to the final tier — never iterate at final quality | ◐ study (robonuggets), matches our draft-tier law |

## Story & timing

| # | Rule | Status / since |
|---|---|---|
| 20 | Hook in ≤3s — beat 1's baked headline carries the payoff promise, never setup (~65% of viewers decide by 3s) | ◐ study (vox beat-layer; Creatify hook-rate economics) |
| 21 | ~2.5 words/sec VO budget; 30s ≈ 70–80 words / 6–8 beats; prose duration estimates run ~2× long — never trust an unmeasured duration | ◐ study (toolkit) + ✅ EXP-006 lineage (Library) |
| 22 | Generate audio FIRST, anchor visuals to measured durations ("drift is impossible when nothing is estimated"); visuals stretch by holding the last frame; audio is never stretched | ✅ 2026-07-22 (R02 practiced) + study (toolkit) |
| 23 | Captions cut from the AUTHORED script, never ASR — wizper returned no word timings on short clean TTS; deterministic finish for anything exact (captions, charts, citations) | ✅ 2026-07-04 (Library) |
| 24 | Change something visually every 3–5s; never hold a static poster >8s — every beat needs internal element motion | ◐ study (vox) |

## Assembly

| # | Rule | Status / since |
|---|---|---|
| 25 | Normalize before concat (fps/pix_fmt/audio rate) — mismatched inputs are the top silent concat killer; export 24fps H.264/yuv420p + AAC 48k; loudnorm −16 LUFS / −1.5 dBTP | ✅ 2026-07-22 (R02) + Library assemble-mix lineage |
| 26 | Verify by frame extraction + contact sheet — an unwatched MP4 is unverified; ffprobe codecs/duration gate before any delivery claim | ✅ practiced R01/R02 (and the R05–R09 hyperframes lesson) |
