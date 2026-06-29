---
name: bot-035-update-character
description: "Sets, re-freezes, or reports the keyframe channel's persistent SEED kit (the reusable character + look) at artifacts/seed/. This is the ONE author-facing skill for changing the look that carries across all future keyframe projects, and the only writer of artifacts/seed/. It is a TOKEN kit — identity is pinned by 5-7 FROZEN CHARACTER tokens plus a style look header and a locked seed, with NO PNG anchors (the keyframes are synthesized per project from the tokens). Routes by intent: reuse (report the current kit, no writes), reset (archive the current kit, re-read the edited style.md/identity.md, re-freeze the tokens into seed.manifest.json, re-run the FREE token-lock linter, bump provenance — no image generation), and kit-only (establish the kit then stop, no video). make-keyframe-scene calls this skill's freeze routine on first run to bootstrap the kit. Use it whenever the user wants to set up, change, reset, or inspect their keyframe character or style."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [bot-035-make-keyframe-scene]
  inputs:
    - name: intent
      type: chat
      required: true
      description: "What the user wants: set up / change / reset / inspect the channel character or style. Routes to reuse | reset | kit-only."
    - name: seed-docs
      type: markdown
      required: false
      description: "The editable seed docs the user may have changed — artifacts/seed/style.md and artifacts/seed/identity.md (or the shipped templates/seed/ defaults on first run)."
  outputs:
    - name: seed-kit
      type: x-seed-kit
      path: artifacts/seed/
      description: "The persistent TOKEN kit: seed.manifest.json (kitType token, consumption text-weave, anchors []) + style.md + identity.md (the 5-7 frozen CHARACTER tokens + locked seed) + archive/<date>/ on reset. NO anchors/ dir by design."
---

# bot-035-update-character — set / re-freeze / report the keyframe TOKEN seed kit

This is **Layer 2** (seed elements) for the keyframe scene director — see
`docs/features/video-director-fleet/07-seed-element-interface.md`. It owns the persistent
**token** kit at `artifacts/seed/`. `make-keyframe-scene` only *reads* the kit (and calls
this skill's **freeze routine** to bootstrap it on first run). Everything that writes
`artifacts/seed/` lives here.

**Kit shape (token — no PNGs):**

```
artifacts/seed/
  seed.manifest.json          # the interface — kitType: token, consumption: text-weave, anchors: []
  style.md                    # the look header (woven verbatim into every keyframe prompt)
  identity.md                 # the 5-7 frozen CHARACTER tokens + the locked seed
  archive/<YYYY-MM-DD>/        # the previous kit, moved here on reset (never silently destroyed)
  # NO anchors/ dir — token kits ship NO PNGs by design. The keyframes are synthesized per
  # project from the tokens (consumption: text-weave) — that is the technique, unchanged.
```

> **The token asymmetry (the key spec point).** An image-anchor bot (BOT-033/034) regenerates
> reference PNGs on reset — PAID image-gen + a pixel self-check. A **token** bot has no PNGs,
> so a reset is **FREE and instant**: re-read the edited docs, re-freeze the 5-7 tokens into
> the manifest, re-run the structural **token-lock linter**, bump `provenance.updatedAt`. The
> render still synthesizes each keyframe per project from the tokens via the shared
> `.claude/skills/video-toolkit/scripts/gen-image.sh` — that is the technique, not a kit asset. `anchors: []` in the
> manifest is what makes "regenerate anchors" a declared no-op.

The token-lock linter is the bot-local
`.claude/skills/bot-035-make-keyframe-scene/scripts/lint-seed-tokens.sh` (structural,
pure-LLM-free, no network). This skill ships **no image driver** — there is nothing to render.

---

## Step 1 — Route the request

Decide the route from intent BEFORE touching any file:

| Route | Trigger | Action |
|---|---|---|
| **reuse** | "show / inspect my character", or `make-keyframe-scene` finds an existing kit | Read `seed.manifest.json`; report kitType, seed, the 5-7 tokens, the look header, model/date. **No writes.** Stop. |
| **reset** | "reset character / new character / change the style / new look", or the user says they edited `style.md` / `identity.md` | Archive → re-read edited docs → **re-freeze tokens (FREE, no image-gen)** → run the token-lock linter → bump provenance (Steps 2–5). |
| **kit-only** | "just set up my character / set up my look", no project topic given | Same as reset's establish path, then **stop — no video**. |

First-run **bootstrap** (called by `make-keyframe-scene` resolve-seed when `artifacts/seed/` is
absent): copy the shipped `templates/seed/` into `artifacts/seed/`, then run the **freeze**
path below. `origin = "default-template"`.

---

## Step 2 — Bootstrap / archive

1. **If `artifacts/seed/` is absent** (first run): copy this skill's `templates/seed/`
   (`seed.manifest.json`, `style.md`, `identity.md`) verbatim into `artifacts/seed/`.
   Note: "Created token seed kit from default template." Set `provenance.origin = "default-template"`.
2. **If re-freezing an existing kit** (reset / kit-only): move the current `style.md`,
   `identity.md`, and `seed.manifest.json` into `artifacts/seed/archive/<YYYY-MM-DD>/`. Record
   the archive path in the new manifest's `archive` field and in `state.md`. **Never overwrite a
   live kit without archiving** (the "never silently destroy identity" rule). Set
   `provenance.origin = "user-reset"` (or `"user-kit-only"` for the kit-only route). There are
   no anchors to move.

For **reuse**, you already reported and stopped in Step 1.

---

## Step 3 — Re-read the docs & re-freeze the tokens (FREE)

Read `artifacts/seed/style.md` and `artifacts/seed/identity.md` (the user may have edited them).
Then freeze, into `seed.manifest.json`:

- **`identity.tokens`** — the 5–7 `- <key>: <token>` bullets from `identity.md`'s
  `## Character tokens`, copied **byte-identical** as `"<key>: <token>"` strings, in document
  order. These are the verbatim identity lock woven into every keyframe (`consumption: text-weave`).
- **`identity.blocks.STYLE_HEADER`** — the `## Style` paragraph from `style.md` (the look header
  woven into every keyframe prompt).
- **`identity.blocks.CHARACTER_BLOCK`** — a one-paragraph prose concatenation of the tokens (for
  recipes that want a single block); optional but recommended.
- **`seed`** — the integer from `identity.md`'s `## Seed` (default 2929).
- **`kitType: "token"`, `consumption: "text-weave"`, `anchors: []`** — never change these for
  this bot; `recipe.acceptsKitTypes` stays `["token"]`.

This is a **pure-text freeze** — no `ai-gen`, no network, no cost.

---

## Step 4 — Run the FREE token-lock linter (the reset gate)

```bash
.claude/skills/bot-035-make-keyframe-scene/scripts/lint-seed-tokens.sh artifacts/seed
```

It checks (structural, zero LLM judgment): 5–7 non-empty token bullets in `identity.md`; a
non-empty `## Style` header in `style.md`; the manifest is valid JSON with
`kitType==token` / `consumption==text-weave` / `anchors==[]` / `acceptsKitTypes` ⊇ `["token"]`;
the manifest `identity.tokens` are **byte-identical** to `identity.md` (the freeze took); and
the manifest seed matches `identity.md`'s `## Seed`. On `FAIL`, fix the manifest/docs and re-run
(this is free) until it prints `OK: token-lock — …`. Never finish a reset on a failing lock.

---

## Step 5 — Write the kit back & finish

1. **`seed.manifest.json`** — set `identity.tokens`, `identity.blocks`, `seed`,
   `provenance.updatedAt` (today), `provenance.createdAt` (today on first create, else keep),
   `provenance.origin`, and `archive` (the archive path if this was a reset, else null).
2. **`artifacts/dashboard.html`** — update the seed-kit block: `style.md ✓ ready`,
   `identity.md ✓ ready (N frozen tokens)`, `seed ✓ <N>` (there are no anchor rows — token kit).
3. **`state.md`** — if this ran inside a project (bootstrap), mark the `resolve-seed` stage
   `done` and hand back to `make-keyframe-scene`. For the **kit-only** route, set
   `status: complete`, `next_action: "Token seed kit ready at artifacts/seed/ — give me a story brief to make a keyframe short."` and **stop**.

---

## Honesty & headless rules

- **Never silently destroy identity** — a reset always archives the prior kit first.
- **Reset is free** — there are no anchors and no image-gen; "regenerate anchors" is a declared
  no-op (`anchors: []`). Disclose that the look is text-only (token kit) when reporting.
- **Cost** — zero for every route (reuse / reset / kit-only). The character only becomes pixels
  at render time, per project, via the shared image driver — not here.
- **Headless** — never ask for missing inputs; if `style.md`/`identity.md` are absent, bootstrap
  from the template and note the assumption.
