---
name: bot-022-compliance-guard
description: Pre-publish marketplace compliance gate for AI-touched product images — audits and repairs an image against the EXACT Amazon main-image spec via Pillow (exact RGB 255,255,255 background, 85%+ frame fill, 1600px+, a text/logo/watermark flag), attaches a C2PA Content Credentials manifest and writes the correct PER-CHANNEL AI-disclosure text (Amazon substantially-modified note, Meta AI-Info label, TikTok AIGC) plus a dated EU/CA/NY jurisdiction note, and returns a per-channel PASS or FAIL linter answering "will this get rejected or suppressed anywhere?". Deterministic Pillow plus c2patool plus a Claude policy judge, with NO model dependency. Use it as the final pre-flight stage of any product-image project (phase 4), or whenever asked to compliance-check, pre-flight, disclosure-stamp, C2PA stamp, Amazon-spec-check, or check "will this get rejected" before a human publishes. Never auto-uploads.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-022
  shared: true
  canonical_owner: BOT-023
  inputs:
    - name: image
      type: image
      required: true
      description: The AI-touched product image to gate — a JPEG/PNG, typically artifacts/<product>/01-hero/hero.jpg (or any angle/scene). The main-image spec is audited on this exact file; the repaired/stamped copies are written alongside.
    - name: channels
      type: text
      required: false
      description: Comma-separated target channels for the linter — any of amazon,etsy,meta,tiktok,shopify. Default `amazon` (the strictest image spec). Determines which per-channel rows the linter and disclosure-stamp emit.
    - name: jurisdictions
      type: text
      required: false
      description: Comma-separated selling jurisdictions for the dated law note — any of us,eu,ca,ny. Default `us`. EU AI Act Art.50 / CA SB 942 are operative 2026-08-02; NY SB-8420A is live 2026-06-09 — the note is dated and scoped, never asserted as confirmed.
    - name: copy
      type: text
      required: false
      description: Optional ad copy / review / testimonial text and a note on whether any person shown is AI-generated. Drives the FTC 16 CFR Part 465 fake-review / synthetic-spokesperson / AI-washing judge. Absent → the FTC gate runs on the image-origin signal only and reports `no_copy_supplied`.
  outputs:
    - name: preflight
      type: json
      path: artifacts/<product>/04-preflight/preflight.json
      description: The per-channel PASS/FAIL verdict object — for each requested channel { spec checks, c2pa_ai, disclosure status }, plus the FTC verdict and the dated jurisdiction note. The single "will this get rejected/suppressed anywhere?" answer. Advisory rows (Amazon gen-AI threshold, channel sub-policies) are flagged confirmed=false.
    - name: stamped-image
      type: image
      path: artifacts/<product>/04-preflight/<name>-cc.jpg
      description: The image with a C2PA Content Credentials manifest signed onto it (c2patool `-m manifest.json -o`). One `-cc.jpg` per input image. Uses c2patool's dev test-cert unless a production private_key/sign_cert is provided — disclosed in the report.
    - name: disclosure
      type: markdown
      path: artifacts/<product>/04-preflight/disclosure.md
      description: Ready-to-paste per-channel AI-disclosure strings (Amazon / Meta / TikTok verbatim from the template pack) + the dated EU/CA/NY jurisdiction note, with the advisory caveats stated in-line. A human pastes these; the bot never posts them.
---

# Marketplace Compliance Guard (BOT-022 · phase 4 · SHARED skill)

A pre-publish gate. Before a seller ships an AI-touched product image to a
channel, this skill runs three things and returns a report — **it never
uploads**: a human takes the report, the stamped image, and the disclosure text
and ships them.

1. **Amazon main-image spec audit + repair** — deterministic Pillow: background
   EXACTLY `RGB 255,255,255` (off-white like `250,252,253` silently suppresses),
   product ≥85% of frame, ≥1600px longest side, and a quick text/logo/watermark
   flag. Repairs by flattening onto pure white + stripping metadata.
2. **Provenance + per-channel disclosure** — read C2PA (`c2patool`) for the
   AI-origin marker, sign a Content Credentials manifest onto the output, and
   write the correct disclosure text per channel + a dated EU/CA/NY jurisdiction
   note.
3. **Multi-channel linter + FTC fake-review gate** — one PASS/FAIL-per-channel
   verdict across Amazon / Etsy / Meta / TikTok / Shopify, and a hard BLOCK on
   AI-generated reviews / synthetic spokespeople under 16 CFR Part 465.

This is the **shared anchor** of the ecommerce-seller fleet. v1 is authored here
under BOT-022; the canonical owner is the future **BOT-023** (compliance fleet).
There is **NO model dependency** — Pillow + c2patool + Claude are the whole
stack, so the check is deterministic and offline. The only optional model hop
(hard background repair via Bria) is *not* used by this skill — re-backgrounding
a real packshot generatively is forbidden (see CONSTRAINT C1).

This skill runs **headless**: never ask the user. Every optional input has a
default below; a missing required input is a clean recorded failure, not a
question.

## When to use

- The `preflight` row in a product project's `state.md` (phase 4 — after the
  hero/angles/scenes exist). The other generation skills call this guard as their
  final stage.
- Directly when asked to "compliance-check", "pre-flight", "disclosure-stamp",
  "C2PA stamp", "Amazon spec check this image", or "will this get rejected /
  suppressed" before a human publishes.
- One-shot mode: "is this image Amazon-compliant?" runs Steps 1–2 on a single
  file in its own product folder, one phase.

## Read first (READ-BEFORE-WRITE)

1. `artifacts/<product>/context.md` — product truth (target channels /
   jurisdictions / whether any person shown is AI-generated, if recorded).
2. The image(s) under audit — `01-hero/hero.jpg` and/or each `02-angles/NN-*.jpg`,
   `03-scenes/NN-*.jpg`. The spec is audited on the **exact** file that ships.
3. `references/marketplace-rules.md` — the DATED rule-pack (read it every run; law
   is fast-moving and re-validated at build). `references/disclosure-templates.md`
   — the verbatim per-channel strings.

**Required-input gate (record, don't ask):** image missing/unreadable → write a
failure row in `state.md` (`status: blocked`,
`next_action: re-run phase 1 — <file> missing`) and stop. Do not invent a verdict.

**Defaults for optional inputs:** `channels=amazon` (strictest spec);
`jurisdictions=us`; no `copy` → the FTC gate runs on image origin only and reports
`no_copy_supplied` (not a PASS for the copy).

## Step 1 — Amazon spec audit + repair (deterministic, no model)

Run the Pillow gate on the input image. It samples 8 corner/edge pixels for
EXACT `(255,255,255)`, measures the product bounding-box vs frame for ≥85% fill,
checks the longest side ≥1600px, runs a quick high-contrast text/logo/watermark
heuristic, and (when asked) writes a repaired copy flattened onto pure white with
metadata stripped.

```bash
python3 scripts/amazon-spec-check.py \
  artifacts/<product>/01-hero/hero.jpg \
  --repair-out artifacts/<product>/04-preflight/hero-packshot.jpg \
  --min-long 1600 --format json
```

- Prints a JSON verdict: `{bg_pass, samples, fill, fill_pass, res_ok,
  longest_side, text_flag, overall_pass, repaired}`. Record it; the linter and
  `preflight.json` consume it.
- **`bg_pass` is EXACT 255** — `254` fails (Amazon silently suppresses off-white).
  If `bg_pass` is false on a *generated* scene, do **NOT** re-background it
  generatively (CONSTRAINT C1) — flag it for a deterministic RMBG+flatten upstream
  (the `white-bg-enforce` skill owns that path) or human review.
- `text_flag` is a **heuristic, not OCR** — it flags likely text/logo/watermark
  regions for human review; it never auto-certifies "no text". State it as
  advisory in the report.
- Repair is conservative: it flattens transparency/near-white onto exact
  `(255,255,255)` and re-exports sRGB JPEG q95 with metadata stripped. It does
  **not** move, recolor, or invent product pixels.

## Step 2 — Provenance read + C2PA stamp + disclosure text

```bash
scripts/disclosure-stamp.sh \
  artifacts/<product>/04-preflight/hero-packshot.jpg \
  --channels amazon,meta,tiktok \
  --jurisdictions us,eu \
  --out-dir artifacts/<product>/04-preflight \
  --ai-origin auto
```

What it does (depth in `references/marketplace-rules.md` §C2PA and
`disclosure-templates.md`):

- **Reads** the existing C2PA manifest with `c2patool` (if present) and looks for
  the AI-origin marker `digitalSourceType =
  http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia`.
  `--ai-origin auto` trusts that marker; `--ai-origin yes|no` overrides it from
  `context.md`. Absence of a manifest is **not** proof of human origin (C2PA is
  strippable) — recorded honestly.
- **Signs** a Content Credentials manifest onto the output
  (`<name>-cc.jpg`) via `c2patool <in> -m <manifest.json> -o <out>`. With no
  production key it uses c2patool's built-in **dev test certificate** — the
  report states "dev test-cert, not a production credential". A production stamp
  needs `private_key`/`sign_cert` in the manifest (pass `--manifest <file>`).
- **Writes `disclosure.md`** — the verbatim per-channel strings (Amazon
  "substantially modified" note, Meta "AI Info"/AI-generated label, TikTok AIGC
  toggle) and a dated EU/CA/NY jurisdiction note, each with its advisory caveat
  inline.
- **c2patool presence:** the script smoke-tests `c2patool --version` first. If
  absent it vendors the prebuilt binary into `work/bin/` (download guarded) and
  retries; if vendoring fails it writes the disclosure text + a clear
  `c2pa_signed: false (c2patool unavailable — vendor at build)` and continues —
  the disclosure half still ships.

**Honesty rules (graded):** never claim Amazon-confirmed where the Style Guide
(G1881) is login-gated — the gen-AI "substantially modified" threshold is
VENDOR-SOURCED and emitted as *advisory*. Never claim C2PA certifies "not AI" —
it marks *positive* AI signals and *adds* a manifest only.

## Step 3 — Multi-channel linter + FTC fake-review gate

```bash
scripts/multi-channel-lint.sh \
  --spec artifacts/<product>/04-preflight/spec.json \
  --c2pa artifacts/<product>/04-preflight/c2pa.json \
  --channels amazon,etsy,meta,tiktok,shopify \
  --jurisdictions us,eu,ca,ny \
  --copy-file artifacts/<product>/inputs/copy.txt \
  --out artifacts/<product>/04-preflight/preflight.json
```

- Reads the Step 1 spec verdict + the Step 2 C2PA result + the dated rule-pack
  and emits one **PASS / FIX row per requested channel** (Amazon keys on the
  exact-255 + frame + format; Etsy on "accurately represents the item"; Meta on
  the AI-generated label + C2PA scan; TikTok on the AIGC label; Shopify
  permissive). Interpretive rules carry `confirmed: false`.
- **FTC gate (16 CFR §465.2):** if `--copy-file` is supplied, it invokes the
  Claude judge (`references/marketplace-rules.md` §FTC carries the verbatim
  prompt) to BLOCK any AI-generated review/testimonial, any synthetic
  "spokesperson/customer presented as a real person" without disclosure, and any
  unsubstantiated / "AI-washing" claim. **Default to FLAG when uncertain; never
  PASS an AI-generated testimonial.** No copy supplied → `ftc: no_copy_supplied`
  (not a PASS).
- Emits the dated EU/CA/NY jurisdiction note for the requested jurisdictions.
- The overall verdict is `BLOCK` if the FTC gate blocks, else `FIX` if any
  channel fails, else `PASS` — and it is **never** an instruction to publish.

## Outputs

This skill writes exactly these paths (`<product>` = the active product slug;
`<name>` = the input image stem) — declared here and in the frontmatter so paths
are never guessed:

- `artifacts/<product>/04-preflight/preflight.json` — the per-channel PASS/FAIL
  verdict + FTC verdict + dated jurisdiction note (the single linter answer).
- `artifacts/<product>/04-preflight/<name>-cc.jpg` — the C2PA-stamped image, one
  per input image.
- `artifacts/<product>/04-preflight/disclosure.md` — ready-to-paste per-channel
  disclosure strings + dated EU/CA/NY note.
- Plus the repaired packshot (`<name>-packshot.jpg`) when `--repair-out` is given,
  and working JSON (`spec.json`, `c2pa.json`) under `04-preflight/` or `work/`.

Never an auto-submission to any channel.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| Image missing/unreadable | Record failure in `state.md`, stop. No invented verdict. |
| `bg_pass` false on a generated scene | FLAG for deterministic RMBG+flatten upstream / human review. **Never** re-background generatively (C1). |
| `text_flag` fires | Advisory only — flag for human review, never auto-certify "no text" (it is a heuristic, not OCR). |
| `c2patool` absent | Vendor prebuilt binary into `work/bin/`; if that fails, ship disclosure text + `c2pa_signed: false`, continue. |
| No production C2PA key | Sign with c2patool dev test-cert; report "dev test-cert, not production". |
| No C2PA manifest on input | Record `c2pa_ai: unknown` — absence is NOT proof of human origin; do not certify "not AI". |
| No `copy` supplied | FTC gate → `no_copy_supplied` (not a PASS); image-origin checks still run. |
| Amazon gen-AI disclosure threshold | Emit as ADVISORY with "Amazon spec not machine-confirmed (G1881 login-gated)". |
| Law not yet operative (EU/CA pre-2026-08-02) | Emit the dated note scoped to its operative date; never assert a not-yet-live rule as binding. |
| Reflective/metallic/fine-text product | Force human review on fidelity; the guard flags, it does not certify. |

## References

- `references/marketplace-rules.md` — the DATED rule-pack: Amazon main-image spec
  (G1881 login-gated → flagged UNVERIFIED), Meta / TikTok / Etsy / Shopify labels,
  FTC 16 CFR Part 465 (verbatim + the judge prompt), and the EU AI Act Art.50 /
  CA SB 942 / NY SB-8420A law with dates and penalties. Read this first.
- `references/disclosure-templates.md` — the verbatim per-channel disclosure
  strings emitted into `disclosure.md`, each dated to its source with its
  advisory caveat.
