---
derive_from:
  source_file: 1-requirements.md
  jtbds:
    - JTBD-1
    - JTBD-2
  derivation_method: outputs+acceptance+failure
  derived_at: 2026-04-27T16:49:23.893Z
skill: bot-007-restaurant-logo-gen
target_score: 0.8
publish_threshold: 0.75
stuck_window: 2
max_iterations: 5
diversity_interval: 3
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: logo-concept-doc-shape
      weight: 0.05
      source: structural
      jtbd_source: JTBD-1
      assertion: Verify that `artifacts/<project-name>/logo-concept.md` exists, is non-empty Markdown, and contains all seven required section headings — Assumptions, Base Concept, Anti-Cliché Statement, Recraft V4 Prompt, Nano Banana Pro Prompt, Ideogram V3 Prompt, FLUX 2 Pro Prompt — matched case-insensitively. The check passes only when all seven headings are present; a missing heading is a failure regardless of content quality.
    - id: logo-concept-doc-quality
      weight: 0.1
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: This dimension scores the Base Concept section of the JTBD-1 logo concept doc for word count and six-dimension coverage. Score 10 if the Base Concept block is ≥100 words AND explicitly names or paraphrases all six dimensions — subject, composition, style/aesthetic, color palette, typography, mood — each paired with a concrete descriptor (e.g., 'single centered crest', 'muted terracotta + ivory', 'condensed serif wordmark'). Score 5 if the block reaches ≥100 words but covers only 4–5 of the 6 dimensions, or covers all 6 using placeholder language such as 'appropriate color palette' or 'suitable typography'. Score 0 if the block is fewer than 100 words or addresses fewer than 3 of the 6 named dimensions.
    - id: logo-concept-doc-shape-2
      weight: 0.05
      source: structural
      jtbd_source: JTBD-1
      assertion: In `artifacts/<project-name>/logo-concept.md`, apply the regex `#[0-9A-Fa-f]{6}` to the color palette section and count unique matches. The check passes if ≥3 distinct hex codes are found within that section.
    - id: logo-concept-doc-quality-2
      weight: 0.1
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension scores the Anti-Cliché Statement section of the JTBD-1 logo concept doc for specificity of avoidance and named substitution. Score 10 if the section names ≥1 specific visual trope being avoided (e.g., 'NOT the stereotypical pizza-chef toque') AND pairs it with ≥1 concrete fresher substitute (e.g., 'INSTEAD: a Tuscan estate wax seal'), both stated in clear opposing language such as NOT/INSTEAD, avoid/replace, or an equivalent contrastive pair. Score 5 if a recognizable trope is named but the substitute is abstract or generic (e.g., 'use something modern') with no concrete named visual reference. Score 0 if the Anti-Cliché Statement section is absent, empty, or contains only vague style preferences with no named trope and no named substitute."
    - id: logo-concept-doc-quality-3
      weight: 0.08
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension scores all four model-specific prompt sections in the JTBD-1 logo concept doc for adherence to their documented dialect. Score 10 if all four conform: Recraft V4 Prompt is in paragraph form covering hierarchy, material, and typography; Nano Banana Pro Prompt uses one of the five documented frameworks and contains no negative framing ('avoid', 'no', 'without'); Ideogram V3 Prompt contains ≤2 quoted text blocks; FLUX 2 Pro Prompt is in narrative form with no instruction to render subtitle or supporting text. Score 5 if 2–3 of the 4 prompts follow their dialect and 1–2 are generic or formatted as if for a different model. Score 0 if all four prompts are identical or generic with no evidence of model-specific dialect differentiation in any of them."
    - id: logo-concept-doc-quality-4
      weight: 0.07
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: This dimension scores the JTBD-1 logo concept doc for mark singularity — exactly one primary icon or mark choice named throughout. Score 10 if a single primary mark is referenced consistently across all model prompt sections and the string ' or ' does not appear between two icon options anywhere in the document, confirming a decisive, unambiguous choice. Score 5 if the concept section names a single mark but one model prompt hedges with an alternative phrasing (e.g., 'olive branch or grape vine'), creating ambiguity in that prompt only while the rest are consistent. Score 0 if two or more icon options appear side-by-side joined by 'or' in the concept block or in any model prompt, leaving the primary mark undecided.
    - id: logo-images-shape
      weight: 0.06
      source: structural
      jtbd_source: JTBD-2
      assertion: Verify that ≥1 file exists under `artifacts/<project-name>/logos/` with a non-zero byte size and a filename matching the pattern `<slot>-<family>.<ext>` where ext is one of png, webp, or svg. A directory containing zero non-empty image files is a hard failure regardless of the presence of other artifacts.
    - id: model-manifest-shape
      weight: 0.04
      source: structural
      jtbd_source: JTBD-2
      assertion: Verify that `artifacts/<project-name>/models-used.md` exists and contains a Markdown table with at minimum four columns — slot, model_id, status, and file — where every model attempt, including failed primaries and their surviving fallbacks, appears as a separate row with non-empty values in the slot, model_id, and status columns. The check passes only if the table is present and no attempt row is omitted.
    - id: comparison-summary-shape
      weight: 0.04
      source: structural
      jtbd_source: JTBD-2
      assertion: Verify that `artifacts/<project-name>/comparison.md` exists, is non-empty Markdown, and contains all four required section headings — Generation Details, Models Used, Per-Model Observations, and Recommendation — matched case-insensitively. The check passes only when all four headings are present.
    - id: comparison-summary-quality
      weight: 0.06
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: This dimension scores the Per-Model Observations section of the JTBD-2 comparison summary for balanced critique coverage across all surviving models. Score 10 if every model that produced a surviving image has ≥1 named strength AND ≥1 named weakness stated as concrete visual properties (e.g., 'clean negative space around the crest mark', 'wordmark characters collapsed illegibly at 32 px'), totaling ≥2 substantive sentences per model. Score 5 if all surviving models are mentioned but one or more models receive only a strength OR only a weakness — not both — or if individual sentences are fewer than ten words and carry no visual specifics. Score 0 if the section is absent, covers fewer than the full set of surviving models, or uses only single-word verdicts with no visual description.
    - id: comparison-summary-shape-2
      weight: 0.05
      source: structural
      jtbd_source: JTBD-2
      assertion: "Verify that `artifacts/<project-name>/comparison.md` contains a Markdown table with exactly 9 row labels matching (case-insensitively): text rendering, composition, style match, color accuracy, iconography, mark singularity, freshness / cliché resistance, scale-down legibility, and overall; each row must contain at least one numeric score in the 1–5 range per surviving model column. The check passes only if all 9 dimension rows are present in the table."
    - id: comparison-summary-quality-2
      weight: 0.08
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: This dimension scores the Freshness / Cliché Resistance entries in the JTBD-2 scoring table for substantive per-model justification tied to the anti-cliché statement. Score 10 if the Freshness cell for every surviving model contains an explicit statement that either (a) the output avoided the specific trope named in the Anti-Cliché Statement (e.g., 'honored the anti-chef constraint — used a geometric crest instead of a toque') or (b) the output drifted into that trope (e.g., 'drifted into pizza-chef cliché — toque glyph visible in mark'), plus a one-sentence visual justification; no model's freshness cell is a bare number. Score 5 if most models have a freshness justification but one model's cell is a bare score or contains a vague phrase such as 'somewhat fresh' with no reference to the anti-cliché statement. Score 0 if the Freshness column contains only numeric scores for all models with no textual justification, or the anti-cliché statement is never referenced in any freshness cell.
    - id: comparison-summary-quality-3
      weight: 0.05
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: This dimension scores the Recommendation section of the JTBD-2 comparison summary for decisiveness and scoring-table traceability. Score 10 if the section names exactly one model as the primary recommendation AND includes a rationale sentence that explicitly cites at least one named dimension and its numeric score from the 9-dimension table (e.g., 'Recraft V4 recommended — highest composite driven by mark singularity 5/5 and freshness 4/5'). Score 5 if a single model is named as the recommendation but the rationale is generic ('it looked the best overall') without referencing any table dimension or numeric score. Score 0 if the Recommendation section is absent, names more than one model as co-equal choices, or contains a rationale that references no dimension from the scoring table.
    - id: comparison-summary-shape-3
      weight: 0.02
      source: structural
      jtbd_source: JTBD-2
      assertion: Verify that `artifacts/<project-name>/comparison.md` contains the exact phrase 'AI image generation models cannot reliably render text' as a case-insensitive substring match anywhere in the file. The check passes if and only if this literal disclaimer string is present.
    - id: edge-case-minimal-input-name-only-handling
      weight: 0.03
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-1
      judge_prompt: This dimension scores JTBD-1 behavior when the user prompt contains only a restaurant name ('Make a logo for Tuck Shop') with no cuisine, category, style, or palette specified. Score 10 if logo-concept.md is produced with an Assumptions section that explicitly lists all four documented defaults — cuisine → 'International', category → 'fast casual', style → 'energetic + modern', palette → 'bright primary + neutral' (or verbatim documented equivalents) each labeled as a default — AND all four model-specific prompt sections are fully populated with substantive, non-placeholder content referencing the restaurant name. Score 5 if the doc is produced and all four prompts are populated, but the Assumptions section lists only 2–3 of the 4 defaults or omits the 'default' label so it is unclear they were inferred. Score 0 if logo-concept.md is absent, any model prompt section is a placeholder or empty, or the Assumptions section contains fewer than 2 of the 4 documented defaults.
    - id: edge-case-primary-models-unavailable-fallbacks-fire-handling
      weight: 0.03
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-2
      judge_prompt: This dimension scores JTBD-2 behavior when the SL8 proxy returns 'unsupported provider' for Recraft V4 SVG, requiring the slot's full fallback chain to fire. Score 10 if models-used.md logs all attempted models for the affected slot in documented order (V4 SVG → V4 raster → V3 → FLUX Schnell), marking each failed attempt with status 'failure' and an error note, and the surviving fallback with status 'success' and the output file path, AND ≥1 non-empty image file exists in the logos directory, AND comparison.md is present. Score 5 if the run completes with ≥1 image and the successful fallback is logged, but failed primary attempts are missing from models-used.md or the documented fallback order is not preserved in the log. Score 0 if no image file is produced, comparison.md is absent, or models-used.md logs only the successful model with no record of any failed attempt.
    - id: restaurant-name-missing-fallback
      weight: 0.015
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: This dimension scores the JTBD-1 failure-mode recovery when the user prompt contains no identifiable restaurant name. Score 10 if the bot writes `work/error.md` containing a human-readable explanation that names the missing field (e.g., 'No restaurant name provided — cannot generate logo concept'), exits non-zero, and produces zero logo concept or image artifacts. Score 5 if the bot exits non-zero and writes an error message but the file is placed at an incorrect path (e.g., `artifacts/error.md` instead of `work/error.md`), or partial concept artifacts are created alongside the error file. Score 0 if the bot proceeds to generate a concept or images despite the missing name, exits with code zero, or terminates non-zero without writing any error file.
    - id: cuisine-specified-but-unknown-fallback
      weight: 0.01
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: This dimension scores the JTBD-1 failure-mode recovery when the user specifies a cuisine absent from the taxonomy (e.g., 'Ethiopian'). Score 10 if the bot classifies the unknown cuisine to a named nearest neighbor via visible inspection logic, records the substitution in the Assumptions section in the form '[original cuisine] classified as [nearest neighbor] — [one-sentence reason]', and proceeds to generate a complete concept doc with all four model prompts fully populated. Score 5 if the bot proceeds and logs a substitution in Assumptions but omits the rationale sentence, or maps the cuisine to an implausible neighbor (e.g., 'Ethiopian → Fast Food') without any explanatory note. Score 0 if the bot errors out and halts because the cuisine is unrecognized, or silently uses a default taxonomy value without any Assumptions entry noting the substitution.
    - id: user-specifies-multiple-icon-fallback
      weight: 0.015
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: This dimension scores the JTBD-1 failure-mode recovery when the user prompt specifies two icon options joined by 'or' (e.g., 'olive branch or grape vine'). Score 10 if the bot selects exactly one icon based on the cuisine taxonomy, records the rejected option in the Assumptions section with a one-sentence rationale (e.g., 'Rejected grape vine — olive branch chosen per Mediterranean taxonomy alignment'), and references only the selected icon — never the rejected one — across all four model prompts. Score 5 if the bot picks one icon and proceeds but the Assumptions section either omits the rejection log entirely or lists both icons without labeling one as explicitly rejected. Score 0 if both icon options survive as 'X or Y' in any model prompt, or the bot errors out instead of making a taxonomy-based single selection.
    - id: single-model-fails-fallback
      weight: 0.015
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: This dimension scores the JTBD-2 failure-mode recovery when one model in a slot returns an API error or non-zero exit code. Score 10 if the bot immediately tries the next model in the slot's documented fallback chain, logs the failed attempt in models-used.md with status 'failure' and the verbatim or paraphrased error reason, logs the successful fallback with status 'success' and the output file path, and completes the run without manual intervention or repeated retries of the same model. Score 5 if the bot walks the chain and eventually produces an image but models-used.md records only the successful fallback, omitting the failed primary attempt or its error reason. Score 0 if the bot treats the single failure as terminal and stops the run, retries the same model in a loop, or models-used.md contains no record of the failed attempt or the fallback action.
    - id: all-three-slots-fail-fallback
      weight: 0.01
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: This dimension scores the JTBD-2 failure-mode recovery when all three image generation slots exhaust their complete fallback chains and produce no image. Score 10 if the bot writes `comparison.md` with a 'Run failed' header (literal string present), lists every attempted model for each of the three slots with its failure reason, exits non-zero, and leaves zero non-empty image files in the logos directory. Score 5 if the bot exits non-zero and writes failure content to comparison.md, but the 'Run failed' header is absent, not all three slots' attempt chains and failure reasons are documented, or empty/corrupt image files remain in the artifacts folder. Score 0 if the bot exits zero despite all slots failing, comparison.md is absent or does not describe the failure, or the bot enters an indefinite retry loop without terminating.
    - id: ai-gen-models-itself-fails-fallback
      weight: 0.005
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: This dimension scores the JTBD-2 failure-mode recovery when the `ai-gen models` discovery command returns a non-zero exit code or empty/unparseable output. Score 10 if the bot falls back to the documented default model chain for all three slots without interruption, logs an explicit entry under the Assumptions section of logo-concept.md (or comparison.md if the concept phase is already complete) stating that `ai-gen models` discovery failed and that the default chain was assumed, and generates images as normal. Score 5 if the bot uses the default chain and generates images but logs the discovery failure in the wrong artifact or uses a terse note that does not name the discovery command or the default-chain assumption. Score 0 if the bot halts generation entirely because `ai-gen models` failed, proceeds without any log of the discovery failure anywhere in the artifacts, or silently uses a non-default model chain with no explanation.
    - id: model-returns-success-but-fallback
      weight: 0.01
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: This dimension scores the JTBD-2 failure-mode recovery when an `ai-gen` call returns a success exit code but the expected output file is absent or zero bytes. Score 10 if the bot checks file existence and non-zero size after each generation call, records the attempt in models-used.md as status 'failure' with the annotation 'file missing/empty despite success exit code', and immediately walks to the next model in the slot's fallback chain — treating the zero-byte result as a hard failure, not a partial success. Score 5 if the bot walks the fallback chain and ultimately produces a valid image, but models-used.md logs the failed attempt without the 'file missing/empty' annotation, making it indistinguishable from a normal API error. Score 0 if the bot accepts the absent or zero-byte file as valid output and includes it in the comparison summary, or does not attempt the fallback after detecting the missing file.
    - id: svg-output-requested-but-fallback
      weight: 0.01
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: This dimension scores the JTBD-2 failure-mode recovery when SVG output is requested but the proxy returns a raster file (PNG or WebP). Score 10 if the bot detects the format mismatch via file extension or MIME type check, logs the substitution in models-used.md with a note such as 'requested SVG, received PNG — proceeding with raster', proceeds with the raster file without re-attempting SVG on the same model, and notes the substitution in the Per-Model Observations or Generation Details section of comparison.md. Score 5 if the bot proceeds with the raster and notes the substitution somewhere in comparison.md, but models-used.md contains no record of the format mismatch or the SVG-to-raster substitution. Score 0 if the bot discards the raster file and produces no output for that slot, treats the format mismatch as a hard failure and unnecessarily walks the fallback chain, or neither models-used.md nor comparison.md contains any mention of the substitution.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-007-restaurant-logo-gen/iteration-charter.md
---

## Notes for the proposer

The bot's signature differentiator is **anti-cliché discipline**. Two dimensions carry that load: `logo-concept-doc-quality-2` (the named-trope + named-substitute statement, weight 0.10) and `comparison-summary-quality-2` (per-model Freshness with cliché-honored / cliché-violated verdict, weight 0.08). Iterations that improve average composite by softening these will be reverted — the rubric is intentionally heavy here.

Other signals to prioritize:

1. **Base concept ≥100 words / 6 dimensions** (`logo-concept-doc-quality`, weight 0.10) — this is the single highest-leverage quality lever. Without a 6-dim base concept, models default to "vector logo stock" output. Keep proposals focused on tightening the base-concept step's self-check and exemplars.
2. **Per-model dialect compliance** (`logo-concept-doc-quality-3`, weight 0.08) — the Recraft paragraph brief, Nano Banana Pro five frameworks, Ideogram ≤2 quoted blocks, FLUX narrative-no-subtitles split is the textbook anti-pattern fix. Copy-paste across models is the failure mode.
3. **Mark singularity** (`logo-concept-doc-quality-4`, weight 0.07) — the `\bor\b` rejection rule is mechanical; if a proposal weakens it, the next run will produce "olive branch or grape vine" prompts and Freshness will collapse. Keep this strict.

Cost / model constraints:

- v1 default chain is cost-optimized: `recraft-ai/recraft-v4-svg → recraft-ai/recraft-v4 → fal-ai/recraft-v3 → fal-ai/flux-schnell` for slot 1; `google/nano-banana-pro → fal-ai/ideogram/v3 → fal-ai/flux-pro/v1.1` for slot 2; `fal-ai/flux-pro/v1.1 → fal-ai/flux-schnell` for slot 3. Worst-case cost ≈ $0.40/run. Premium variants (V4 Pro SVG, $0.30) are deferred until Stage 4 evidence justifies the upgrade.
- Hard ceiling: 9 model attempts (3 slots × 3 fallback levels). The proposer should not attempt to widen the chain beyond this.

Known weaknesses to target first (will be updated as Stage 4 iterations expose them):

- (none yet — populated by Stage 4 evidence)

## Mapping: JTBDs → rubric dimensions

| Dimension | JTBD source | Notes |
|---|---|---|
| `logo-concept-doc-shape` | JTBD-1 | structural — mechanical check |
| `logo-concept-doc-quality` | JTBD-1 | base concept block is ≥100 words and explicitly addresses all 6 dimensions (each |
| `logo-concept-doc-shape-2` | JTBD-1 | structural — mechanical check |
| `logo-concept-doc-quality-2` | JTBD-1 | anti-cliché statement names ≥1 specific trope being avoided AND ≥1 fresher refer |
| `logo-concept-doc-quality-3` | JTBD-1 | per-model prompts use the documented model-specific dialect: Recraft uses paragr |
| `logo-concept-doc-quality-4` | JTBD-1 | exactly ONE primary mark / iconography choice is named — the prompt does NOT con |
| `logo-images-shape` | JTBD-2 | structural — mechanical check |
| `model-manifest-shape` | JTBD-2 | structural — mechanical check |
| `comparison-summary-shape` | JTBD-2 | structural — mechanical check |
| `comparison-summary-quality` | JTBD-2 | per-model observations name ≥1 strength + ≥1 weakness for every surviving model  |
| `comparison-summary-shape-2` | JTBD-2 | structural — mechanical check |
| `comparison-summary-quality-2` | JTBD-2 | scoring is **substantive** — Freshness column explicitly names whether the outpu |
| `comparison-summary-quality-3` | JTBD-2 | recommendation block names a SINGLE primary direction (one model) with one-sente |
| `comparison-summary-shape-3` | JTBD-2 | structural — mechanical check |
| `edge-case-minimal-input-name-only-handling` | acceptance-scenario:JTBD-1 | Edge case — minimal input (name only) — Given the user prompt: "Make a logo for  |
| `edge-case-primary-models-unavailable-fallbacks-fire-handling` | acceptance-scenario:JTBD-2 | Edge case — primary models unavailable, fallbacks fire — Given the SL8 proxy ret |
| `restaurant-name-missing-fallback` | failure-mode:JTBD-1 | Recovery: write a clean error to `work/error.md`, exit non-zero. Do not generate |
| `cuisine-specified-but-unknown-fallback` | failure-mode:JTBD-1 | Recovery: classify to nearest neighbor by inspection, log the substitution under |
| `user-specifies-multiple-icon-fallback` | failure-mode:JTBD-1 | Recovery: pick ONE based on cuisine taxonomy, log the rejection under Assumption |
| `single-model-fails-fallback` | failure-mode:JTBD-2 | Recovery: walk the slot's fallback chain. Log every attempt. |
| `all-three-slots-fail-fallback` | failure-mode:JTBD-2 | Recovery: write `comparison.md` with a "Run failed" header explaining which mode |
| `ai-gen-models-itself-fails-fallback` | failure-mode:JTBD-2 | Recovery: assume default chain, generate, log the discovery failure under Assump |
| `model-returns-success-but-fallback` | failure-mode:JTBD-2 | Recovery: treat as failure, walk fallback. |
| `svg-output-requested-but-fallback` | failure-mode:JTBD-2 | Recovery: log substitution, proceed with raster, note in comparison. |

