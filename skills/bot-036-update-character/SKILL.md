---
name: bot-036-update-character
description: "Sets, re-freezes, or reports the continuous-shot channel's persistent TOKEN seed kit (the reusable subject + look) at artifacts/seed/. This is the ONE author-facing skill for changing the look/subject that carries across all future continuous shots, and the only writer of artifacts/seed/. It is a token kit — identity is pinned by 5-7 frozen text tokens only, with NO PNG anchors (anchors []); the base frame is regenerated per project from the tokens. Routes by intent — reuse (report the current kit, no writes), reset (archive the current kit, re-read the edited style.md/identity.md, re-freeze the 5-7 tokens, re-run the structural linter, bump provenance — FREE and instant, no image-gen), and kit-only (establish the kit then stop, no video). make-continuous-shot calls this skill's freeze routine on first run to bootstrap the kit. Use it whenever the user wants to set up, change, reset, or inspect their continuous-shot subject or look."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [video-toolkit, bot-036-make-continuous-shot]
  inputs:
    - name: intent
      type: chat
      required: true
      description: "What the user wants: set up / change / reset / inspect the channel subject or look. Routes to reuse | reset | kit-only."
    - name: seed-docs
      type: markdown
      required: false
      description: "The editable seed docs the user may have changed — artifacts/seed/style.md and artifacts/seed/identity.md (or the shipped templates/seed/ defaults on first run)."
  outputs:
    - name: seed-kit
      type: x-seed-kit
      path: artifacts/seed/
      description: "The persistent TOKEN kit: seed.manifest.json (kitType token, consumption text-repeat, anchors []) + style.md + identity.md + archive/<date>/ on reset. NO anchors/ dir — no PNGs by design."
---

# bot-036-update-character — set / reset / report the continuous-shot seed kit

This is **Layer 2** (seed elements) for the continuous-shot director — see
`docs/features/video-director-fleet/07-seed-element-interface.md`. It owns the persistent
**token** kit at `artifacts/seed/`. `make-continuous-shot` only *reads* the kit (and calls
this skill's **freeze routine** to bootstrap it on first run). Everything that writes
`artifacts/seed/` lives here.

**Kit shape (token):**

```
artifacts/seed/
  seed.manifest.json          # the interface — kitType: token, consumption: text-repeat, anchors: []
  style.md                    # the global look header + discipline + constraints + audio directive
  identity.md                 # the 5-7 frozen CHARACTER tokens + the prose subject block + locked seed
  archive/<YYYY-MM-DD>/        # the previous kit, moved here on reset (never silently destroyed)
  # NO anchors/ dir — no PNGs by design (the base frame is regenerated per project from the tokens)
```

> **The token-vs-image asymmetry (the key spec point).** This is a token kit, so a **reset is
> FREE and instant** — re-read the edited `identity.md`/`style.md`, re-freeze the 5–7 tokens,
> re-run the structural linter's token-lock check, bump `provenance.updatedAt`. There is **no
> paid image regeneration and no pixel self-check** (those are the image-anchor bots, 033/034).
> `anchors: []` in the manifest is what makes "regenerate anchors" a declared no-op. The render
> still synthesizes the base frame per project from the tokens — that is the technique, unchanged.

---

## Step 1 — Route the request

Decide the route from intent BEFORE touching any file:

| Route | Trigger | Action |
|---|---|---|
| **reuse** | "show / inspect my character / subject", or `make-continuous-shot` finds an existing kit | Read `seed.manifest.json`; report kitType, consumption, seed, tokens, model/date. **No writes.** Stop. |
| **reset** | "reset character / new creature / change the look / new style", or the user says they edited `style.md` / `identity.md` | Archive → re-read → **re-freeze the tokens** → re-run the linter → bump provenance (Steps 2–5). **FREE — no image-gen.** |
| **kit-only** | "just set up my subject / set up my look", no shot brief given | Same as reset's establish path, then **stop — no video**. |

First-run **bootstrap** (called by `make-continuous-shot` resolve-seed when `artifacts/seed/`
is absent): copy the shipped `templates/seed/` into `artifacts/seed/`, then run the **reset**
freeze path (the tokens just need freezing into the manifest). `origin = "default-template"`.

---

## Step 2 — Bootstrap / archive

1. **If `artifacts/seed/` is absent** (first run): copy this skill's `templates/seed/`
   (`seed.manifest.json`, `style.md`, `identity.md`) verbatim into `artifacts/seed/`. Note:
   "Created token seed kit from default template." Set `provenance.origin = "default-template"`.
2. **If resetting an existing kit**: move the current `style.md` and `identity.md` into
   `artifacts/seed/archive/<YYYY-MM-DD>/`. Record the archive path in the manifest's `archive`
   field and in `state.md`. **Never overwrite a live kit without archiving** (never silently
   destroy identity). Set `provenance.origin = "user-reset"` (or `"user-kit-only"` for the
   kit-only route).

For **reuse**, skip to nothing — you already reported and stopped in Step 1.

---

## Step 3 — Re-freeze the tokens & the look block (FREE — pure LLM, no network)

Read `artifacts/seed/style.md` and `artifacts/seed/identity.md`. Extract and write into
`seed.manifest.json` (so the recipe reads them machine-side):

- **`identity.tokens`** — the **5–7 frozen CHARACTER tokens** from `identity.md` ("Character
  tokens"), verbatim. These are the language-level identity lock for `consumption: text-repeat`.
- **`identity.blocks.CHARACTER_BLOCK`** — the prose subject sentence from `identity.md`
  ("Character block"), woven from the tokens.
- **`style`** stays `{ "doc": "style.md" }` — the look header + audio directive are read live
  from `style.md` by the recipe; no block extraction needed (but you may cache the look header
  one-liner in the dashboard detail).
- **`seed`** — the locked seed from `identity.md` ("Seed", default 7777). Write it to
  `manifest.seed`.
- **`anchors`** — **MUST stay `[]`** (token kit). Do NOT add anchor entries; do NOT create an
  `anchors/` dir. "Regenerate anchors" is a declared no-op here.

There is **no image generation** in this step — it is pure text re-freezing.

---

## Step 4 — Re-run the structural linter (the token-lock check)

Validate that the re-frozen tokens are well-formed (5–7 tokens, non-empty, no duplication) by
re-running the recipe's plan linter's token rule indirectly: the load-bearing check is simply
that `identity.tokens` holds **5–7** distinct verbatim tokens (the same band
`scripts/validate-plan.sh` enforces on the plan's `CHARACTER:` block). If the user's edited
`identity.md` lists fewer than 5 or more than 7 tokens, do **not** silently truncate — report
it and ask the user to land on 5–7 (headless: clamp to the nearest valid set, keep the
edited tokens, and note the clamp in `provenance` + the dashboard). This keeps the token kit
in lockstep with what the make skill's plan stage will accept.

---

## Step 5 — Write the kit back & finish

1. **`seed.manifest.json`** — set `identity.tokens` + `identity.blocks.CHARACTER_BLOCK`
   (Step 3), `seed`, keep `anchors: []`, set `provenance.updatedAt` (today),
   `provenance.createdAt` (today if first run), `provenance.origin`, and `archive` (the archive
   path if this was a reset, else null). `provenance.models` stays `{}` — no models are called.
2. **`artifacts/dashboard.md`** (or the `dashboard.html` channel block, if present) — update
   the kit block: manifest `✓ ready — token, seed <N>`, style `✓ ready — <look one-liner>`,
   identity `✓ ready — <token one-liner>` (or `⚠ clamp: <note>` if Step 4 clamped).
3. **`state.md`** — if this ran inside a shot (bootstrap), mark the `resolve-seed` stage `done`
   and hand back to `make-continuous-shot`. For the **kit-only** route, set `status: complete`,
   `next_action: "Token seed kit ready at artifacts/seed/ — give me a subject to make a continuous shot."`
   and **stop**.

---

## Honesty & headless rules

- **Never silently destroy identity** — a reset always archives first.
- **Free reset** — a token reset costs **zero credits** (no image-gen). A `reuse` is also free.
  There is no `--max-cost` gate here because there are no paid calls.
- **Token count is load-bearing** — keep `identity.tokens` at 5–7; disclose any clamp.
- **No anchors, ever** — this kit is `anchors: []`. If a user asks for a "character sheet" or
  reference images, explain this is a token bot (the base frame is generated per project from
  the tokens) and route image-anchor needs to the image-anchor siblings (033/034).
- **Headless** — never ask for missing inputs; if `style.md`/`identity.md` are absent,
  bootstrap from the template and note the assumption.
