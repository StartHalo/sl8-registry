# Commercial workflows (ad creative set)

# Commercial workflows

## Ad creative set

Produce separate assets for:

- Hook frame: product and benefit visible in under one second.
- Proof frame: product detail, ingredient, feature, texture, or before-after.
- Lifestyle frame: human or environmental context.
- Conversion frame: clean safe-zone layout for external text and CTA.

Do not generate legal claims, pricing, discounts, or health claims unless the
user supplies the exact copy.

On SL8, each frame has its own params file and its own queued ai-gen call, named hook, proof, lifestyle and conversion. All four keep the same product invariant and the declared aspect. The four primary quotes are added up and gated before any frame runs, and each retry is quoted on its own (SKILL.md, "Quote the whole chain and gate" and "Retry or fall back on a measured failure only").
