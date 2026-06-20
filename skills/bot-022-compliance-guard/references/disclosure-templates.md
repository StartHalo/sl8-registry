# Disclosure Templates (VERBATIM) — bot-022-compliance-guard

> The exact per-channel disclosure strings `scripts/disclosure-stamp.sh` writes
> into `disclosure.md`. **Verbatim, dated to source.** A human pastes these; the
> bot never posts. Each string ships with its advisory caveat inline so the
> caveat survives copy-paste. Keep this file and `disclosure-stamp.sh` in sync —
> the script is the source of the emitted text; this file is the rationale.

---

## Amazon (gen-AI / "substantially modified" — for the LISTING, not on the main image)

```
This image was created or substantially modified using AI; it accurately
represents the physical product shipped to the customer.
```

**Caveat (emitted inline):** ADVISORY — the gen-AI "substantially modified"
threshold is VENDOR-SOURCED; the official Style Guide G1881 is login-gated, NOT
machine-confirmed. "Minimal AI retouching" (background removal / color / lighting)
may not require disclosure; disclosure applies when AI "fundamentally creates new
visual elements not captured through traditional photography." Re-validate at
build. [Rewarx 2026]

> Note: this string goes in the listing copy, **not** burned onto the main image
> (the main image must carry no text — see §AMAZON spec). The C2PA stamp goes on
> the image file itself.

---

## Meta (Facebook / Instagram ads)

```
AI-generated
```

**Caveat (emitted inline):** Toggle Meta's "AI Info" / AI-generated label on the
post or ad. Any ad where AI tools "generate, substantially modify, or composite
visual or audio content" must carry the label; Meta scans for C2PA metadata.
Undisclosed AI in a UGC-style ad = "Deceptive Practice" → ad rejection + a
significant account-health penalty. Use the **Partnership Ads** designation for
UGC-style creative. [AuditSocials 2026-05-09]

---

## TikTok

```
AI-generated
```

**Caveat (emitted inline):** Turn ON TikTok's AIGC label + the commercial-content
toggle. Applies to content "completely generated or significantly edited by AI";
TikTok is moving to auto-apply a label it detects (still testing). [TikTok
newsroom 2023-09-19]

---

## Etsy

```
(no standard label) Listing images must accurately represent the actual item;
AI mockups of products you cannot photograph are not allowed.
```

**Caveat (emitted inline):** INTERPRETIVE rule ("accurately represent the item")
— not an API contract. [Etsy policy via Rewarx 2026]

---

## Shopify

```
(no platform-mandated AI label) Follow the destination marketplace + your own
jurisdiction law (below).
```

---

## Jurisdiction note (dated — attached per selling market)

```
EU — AI Act Art.50 (operative 2026-08-02): synthetic image/audio/video output must
be "marked in a machine-readable format and detectable as artificially generated
or manipulated" (the C2PA stamp satisfies the machine-readable mark); deep fakes
must be disclosed "in a clear and distinguishable manner".

California — SB 942 (as amended by AB 853, operative 2026-08-02): a "manifest
disclosure" (clear/conspicuous "AI-generated") + a "latent disclosure" (provider,
system name+version, time/date, unique identifier — detectable by the provider's
AI-detection tool).

New York — SB-8420A (effective 2026-06-09): ads using AI "synthetic performers"
(digitally created media that appear as a real person) must "conspicuously
disclose" it. Penalty $1,000 first / $5,000 subsequent.

US federal — FTC 16 CFR Part 465 (eff. 2024-10-21): no fake/AI-generated reviews
or synthetic spokespeople presented as real customers; up to $53,088/violation.
```

**Caveat (emitted inline):** Today is 2026-06-19 — EU + CA are NOT yet operative
(both pivot on 2026-08-02); NY is live. Each note is scoped to its operative date
and never asserted as binding before it. C2PA is strippable (CDNs/optimizers drop
metadata) and not universal — absence of a manifest is NOT proof of human origin.

---

## C2PA manifest (the latent/machine-readable mark)

The Content Credentials manifest `disclosure-stamp.sh` signs onto `<name>-cc.jpg`
carries the AI-origin marker:

```json
{
  "claim_generator": "sl8-bot-022-compliance-guard/1.0.0",
  "title": "<image-stem>",
  "assertions": [
    { "label": "c2pa.actions",
      "data": { "actions": [
        { "action": "c2pa.created",
          "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia" },
        { "action": "c2pa.published" }
      ] } }
  ]
}
```

- Default cert: c2patool's **dev test-cert** ("suitable only for development") —
  the report states "dev test-cert, not a production credential". A production
  stamp requires `private_key`/`sign_cert` in the manifest (pass via
  `--manifest`).
- This manifest IS the EU Art.50 / CA SB 942 "latent / machine-readable"
  disclosure; the pasted text strings above are the "manifest / conspicuous"
  disclosure. Both layers ship together.
