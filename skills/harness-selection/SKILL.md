---
name: harness-selection
description: >
  Inspect harness readiness and select one exact certified harness/mode/provider/model tuple before
  an SL8 run can spend. Use for “which harness can run this?”, Claude-to-Codex/OpenRouter routing,
  installed-versus-usable diagnosis, capability requirements, image/template trust, rollback, or
  any request to change harness/provider/model. Do not use to assemble bot files or skill closure;
  use portable-agent-bundle after selection.
---

# Harness selection

Choose from observed readiness, never from the catalog alone. Installed means a binary exists;
certified means an external attestor approved this exact tuple on this exact immutable image and
20-character E2B template ID. Treat those as different security states.

## Inputs

- `/etc/sl8/harnesses.json` plus its verified SHA-256;
- immutable image identity and exact E2B template ID reported by the running sandbox;
- signed certification ledger, external public key, and pinned public-key SHA-256;
- required capabilities such as streaming, interrupt, skills, resume, hooks, or pre-tool policy;
- provider/model preference, budget, and rollback policy;
- provider credentials supplied by SL8 provisioning and present only in the sandbox controller
  process; never require a duplicate host key.

## Observe readiness

```bash
export SL8_CERTIFICATION_ATTESTOR_SHA256="$PINNED_PUBLIC_KEY_SHA256"
sl8-harness doctor \
  --catalog /etc/sl8/harnesses.json \
  --image "$IMMUTABLE_IMAGE" \
  --template-id "$E2B_TEMPLATE_ID" \
  --certifications "$SIGNED_LEDGER" \
  --attestor-public-key "$ATTESTOR_PUBLIC_KEY" \
  --output "$READINESS_PATH"
```

Do not print credentials or pass them as command-line flags. The controller bridges only the
selected provider's allowlisted environment names into the harness process.

## Select

Require one readiness row whose:

1. `availability` is exactly `certified`;
2. mode is listed by the harness;
3. signed `certifiedTuples` contains the exact mode, provider ID, and model ID;
4. provider family matches the harness wire route;
5. every required capability is true;
6. evidence names the current image and exact template ID;
7. required credential exists without being serialized into readiness.

Prefer the user's explicit certified tuple. Otherwise apply the product's routing policy and
record why. The rollback tuple is `legacy-claude/legacy/anthropic` only when its own exact-image
claim is certified; rollback status does not exempt it from trust.

## Reject before spend

Stop before constructing a driver or model request when any check fails. Preserve the structured
controller code, including:

- `HARNESS_NOT_INSTALLED` / `HARNESS_NOT_CERTIFIED`;
- `TUPLE_NOT_CERTIFIED` / `MODE_NOT_CERTIFIED`;
- `PROVIDER_NOT_CONFIGURED` / `PROVIDER_INCOMPATIBLE`;
- `CAPABILITY_MISMATCH` / `INVALID_MODEL_ID`;
- unattested, wrong-image, wrong-template, stale, or wrong-key certification evidence.

Never substitute a “similar” model, inherit certification from another harness, or upgrade a row
because authentication happens to be configured. A declared row is useful discovery, not support.

## Output

Persist the resolved tuple with requested/resolved model, wire API, provider family, readiness
evidence, immutable image, exact template ID, capabilities, and zero secret values. Hand that
selection to portable-agent-bundle and the RunSpec. If no tuple qualifies, return remediation and
the non-spending failure; do not silently fall back.
