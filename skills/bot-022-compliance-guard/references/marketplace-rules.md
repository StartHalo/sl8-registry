# Marketplace Rule-Pack (DATED) — bot-022-compliance-guard

> The canonical data the linter, the spec-check, and the disclosure-stamp read.
> **Every rule is DATED and SOURCED; re-validate at build** — law is fast-moving
> and several rules pivot on 2026-08-02. A 2026-06 PASS may differ from a 2026-08
> PASS. Rules that are interpretive, vendor-sourced, or login-gated carry
> `confirmed: false` / **UNVERIFIED** explicitly — the bot states the caveat, it
> never asserts a soft rule as a hard one.
> Last re-validated: **2026-06-19**.

---

## §AMAZON — main-image spec (the deterministic core)

The audit enforces this EXACT spec (Pillow, `scripts/amazon-spec-check.py`):

```
Pure white background — RGB EXACTLY (255,255,255)        # off-white (250,252,253) FAILS; 254 fails
Minimum size — 1,000px on the longest side (zoom)        # 1,600px recommended (this skill's default --min-long)
Product fills 85% or more of the frame, not touching edges
File formats — JPEG (.jpg), PNG, TIFF, or GIF (no animated GIFs)
No text, logos, watermarks, inset images, props, or extra products on the MAIN image
1:1 (square) for the main image
```

- The exact-255 check is the highest-ROI gate: Amazon **silently suppresses**
  off-white backgrounds (no Buy Box, no error) — a corner/edge sample pass-fails
  with zero ambiguity. `(250,252,253)` is the typical AI background-fill artifact
  that fails.
- `text_flag` is an **advisory heuristic** (margin-ink density), NOT OCR — it
  flags likely text/logo/watermark/inset for human review; it never certifies
  "no text".
- **G1881 (the official Amazon Style Guide) is LOGIN-GATED → this spec is the
  published vendor interpretation, flagged UNVERIFIED** against the official
  guide. Source: Seller Labs "Amazon Product Image Requirements 2026"
  (2026, WebFetch).
- **"Amazon auto-detects AI artifacts" is UNVERIFIED** — no primary spec;
  enforcement is still described in classic white-bg/text/prop terms. Do not
  assert it.

### §AMAZON — gen-AI disclosure threshold (ADVISORY, vendor-sourced)

- Disclosure applies when AI "fundamentally creates new visual elements not
  captured through traditional photography." "Minimal AI retouching" (background
  removal, color, lighting) may NOT require disclosure.
- **VENDOR-SOURCED** (Rewarx "Amazon AI Generated Image Policy 2026", 2026,
  WebFetch); the official line is login-gated. Emit the Amazon disclosure string
  as **advisory** with "Amazon spec not machine-confirmed (G1881 login-gated)".

---

## §META — ad creative (Facebook / Instagram)

- Any ad where AI tools "generate, substantially modify, or composite visual or
  audio content" must carry an **"AI-generated" / "AI Info"** label; Meta scans
  for **C2PA** metadata (so the C2PA stamp helps detection).
- Undisclosed AI in a UGC-style ad = a **"Deceptive Practice"** → "immediate ad
  rejection and a significant account health penalty." UGC-style creative should
  use the **Partnership Ads** designation.
- Source: AuditSocials "Meta Ad Policy Updates 2026 guide" (2026-05-09,
  WebFetch). Meta gives **no specific date** for some 2026 sub-policies →
  `confirmed: false` for the sub-policy detail.

---

## §TIKTOK — AIGC label

- Creators must **label AI-generated content** that contains realistic images,
  audio, or video; the label applies to content "completely generated or
  significantly edited by AI." Turn ON the AIGC label + the
  **commercial-content toggle** for ads. TikTok is moving to **auto-apply** a
  detected "AI-generated" label (still "testing" → `confirmed: false`).
- Source: TikTok newsroom "new labels for disclosing AI-generated content"
  (2023-09-19, WebFetch).

---

## §ETSY — interpretive

- Listing images must **"accurately represent the item"**; AI-generated mockups
  of products a seller **cannot photograph** are **not allowed**. This is an
  interpretive policy, not an API contract → linter row is **FLAG**,
  `confirmed: false`.
- Source: Etsy policy via Rewarx (2026, WebFetch).

---

## §SHOPIFY — permissive

- No platform-mandated AI label. Follow the **destination marketplace** rules +
  the seller's **jurisdiction law** (below). Linter row defaults PASS with that
  note.

---

## §FTC — 16 CFR Part 465 (fake reviews / testimonials) — HARD BLOCK

The fake-review gate keys on §465.2 (Final Rule effective **2024-10-21**):

```
§465.2(a) — It is an unfair or deceptive act or practice for a business to write,
create, or sell a consumer review, consumer testimonial, or celebrity testimonial
that materially misrepresents, expressly or by implication:
  (1) that the reviewer or testimonialist exists;
  (2) that the reviewer or testimonialist used or otherwise had experience with the
      product, service, or business; or
  (3) the reviewer's or testimonialist's experience with the product/service/business.
§465.2(b) — ... a business [must not] purchase, disseminate, or cause the
dissemination of a review/testimonial it knew or should have known materially
misrepresented [the same elements].
```

The FTC's own summary makes the AI case explicit: the rule "addresses reviews and
testimonials that misrepresent that they are by someone who **does not exist, such
as AI-generated fake reviews**, or who did not have actual experience."

- **Gate rule:** any AI-generated review/testimonial, or any synthetic
  "reviewer/spokesperson who does not exist" presented as a real customer, is a
  **hard BLOCK**.
- Civil penalty: **$51,744/violation** at finalization → **$53,088/violation**
  after the 2026 inflation adjustment.
- Sources: Cornell LII 16 CFR §465.2 (WebFetch); FTC Final Rule (Federal Register
  2024-08-22); Benesch Law (2026-04-06, the $53,088 figure + Dec-2025 warning
  letters). (ftc.gov fetch 403'd direct; text via Cornell LII + FTC summary.)

### §FTC — judge prompt (Claude, the only fuzzy layer — VERBATIM)

`scripts/multi-channel-lint.sh` feeds the supplied copy to `claude -p` with:

```
You are an FTC 16 CFR Part 465 + Section 5 compliance reviewer for ecommerce creative.
Given the AD COPY / REVIEW / TESTIMONIAL text below and a note on whether any person
shown is AI-generated, flag (and BLOCK) anything that:
 (1) presents a review/testimonial by a reviewer who does not exist (incl. AI-generated
     reviews), or who did not actually use the product, or misrepresents their experience [§465.2];
 (2) is a synthetic/AI "spokesperson" or "customer" presented as a real person without disclosure;
 (3) makes an unsubstantiated or "AI washing" claim (a capability/benefit you cannot substantiate).
Return ONLY JSON: {"verdict":"BLOCK|FLAG|PASS","hits":[{"text":"...","rule":"465.2|AI-washing|unsubstantiated","why":"..."}]}
Default to FLAG if uncertain. Never PASS an AI-generated testimonial.
```

- `claude` absent → the gate defaults to **FLAG** (never auto-PASS testimonial
  copy). No copy supplied → `no_copy_supplied` (not a PASS).

---

## §C2PA — provenance read + Content Credentials sign

`c2patool` (official C2PA CLI, Rust; `github.com/contentauth/c2patool`):

```
# READ — print the active manifest JSON
c2patool product-hero.jpg
# READ — detailed report; digitalSourceType lives here (confirms AI origin)
c2patool product-hero.jpg -d
# READ — tree view of the manifest store
c2patool product-hero.jpg --tree
# WRITE/SIGN — attach a Content Credentials manifest to the output
c2patool product-hero.jpg -m manifest.json -o product-hero-cc.jpg
c2patool product-hero.jpg -m manifest.json -f -o product-hero-cc.jpg   # force overwrite
```

- AI-origin marker (the IRI the reader keys on):
  `http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia`
  (Nano Banana Pro emits C2PA + SynthID on every output; DALL-E/Firefly/GPT
  Image embed signed manifests).
- An **unsigned** manifest uses c2patool's built-in **test certificate**
  ("suitable only for development"). A **production** stamp needs
  `private_key`/`sign_cert` in the manifest JSON (pass via `--manifest`).
- **C2PA is strippable** (CDNs/optimizers drop metadata) and **not universal** →
  absence-of-manifest is NOT proof of human origin. The bot flags *positive* AI
  signals and *adds* a manifest; it **cannot certify "not AI"**.
- `c2patool` is **NOT on the verified sl8 tool list** — smoke-test
  `c2patool --version` at build; `disclosure-stamp.sh` vendors the prebuilt
  binary into `work/bin/` if absent, and still ships the disclosure text if
  vendoring fails.
- Source: contentauth/c2patool usage docs (WebFetch); c2pa.org digitalsourcetype
  (WebFetch).

---

## §JURISDICTION — dated law note (re-validate per market at build)

| Jurisdiction | Rule | Date | Penalty / mechanism | Confirmed |
|---|---|---|---|---|
| US federal | FTC 16 CFR Part 465 — no fake/AI reviews or synthetic spokespeople as real customers | eff. **2024-10-21** | up to **$53,088**/violation (post-2026 adjustment) | yes (primary/Cornell LII) |
| EU | AI Act Art.50 — synthetic media "marked in a machine-readable format and detectable" (C2PA satisfies it); deep fakes clearly disclosed | operative **2026-08-02** | per Member-State enforcement | yes (artificialintelligenceact.eu) |
| California | SB 942 (as amended by AB 853) — "manifest disclosure" (clear "AI-generated") + "latent disclosure" (provider/system/version/time/id, detectable by the provider's AI-detection tool) | operative **2026-08-02** | statutory | yes (Mayer Brown) |
| New York | SB-8420A — AI "synthetic performers" (media appearing as a real person) in ads must be "conspicuously disclosed" | effective **2026-06-09** | **$1,000** first / **$5,000** subsequent | yes (Hunton) |

- **Today is 2026-06-19** → EU + CA are **not yet operative** (pivot 2026-08-02);
  NY **is** live. The note is emitted scoped to each rule's operative date with
  `operative_now` computed; never asserted as binding before its date.

---

## Sources (dated)

- FTC Final Rule banning fake reviews/testimonials (16 CFR Part 465; eff.
  2024-10-21; $51,744→$53,088/violation) · FTC / Federal Register / Cornell LII /
  Benesch Law (2024-08 → 2026-04) · WebSearch + WebFetch
- EU AI Act Article 50 (machine-readable marking; applies 2026-08-02) ·
  artificialintelligenceact.eu · WebFetch
- California SB 942 + AB 853 (manifest+latent disclosure; deadline pushed to
  2026-08-02) · Mayer Brown (2025-10) · WebFetch
- New York SB-8420A (synthetic performers; eff. 2026-06-09; $1,000/$5,000) ·
  Hunton (2025-12-11) · WebFetch
- c2patool usage docs (read + `-m`/`-o` sign; test-cert caveat) ·
  contentauth GitHub · WebFetch
- C2PA digitalSourceType (`trainedAlgorithmicMedia` IRI) · c2pa.org · WebFetch
- Amazon Product Image Requirements 2026 (RGB 255,255,255; 1000px/zoom; 85% fill;
  formats; no text/logo/watermark/inset) · Seller Labs (2026) · WebFetch
- Amazon AI-generated image policy 2026 ("substantially modified"; VENDOR-sourced;
  G1881 login-gated) · Rewarx (2026) · WebFetch
- Meta 2026 ad policy (AI-generated label; C2PA scan; Deceptive Practice) ·
  AuditSocials (2026-05-09) · WebFetch
- TikTok AIGC labeling · TikTok newsroom (2023-09-19) · WebFetch
- Etsy AI-image policy ("accurately represent the item") · Rewarx citing Etsy
  (2026) · WebFetch
- Deep-dive: `pipeline/personas/ecommerce-seller/deep-dives/marketplace-policy-ai-disclosure-guard.md`
  (2026-06-19, internal)
