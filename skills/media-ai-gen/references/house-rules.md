# House rules HR-1.0 (media skills)

## Contents
- [What these rules are](#what-these-rules-are)
- [The rules](#the-rules)
- [How a skill cites them](#how-a-skill-cites-them)

## What these rules are

Every `media-*` skill on this machine follows one numbered set of rules.
- Each skill ends with a "House rules" footer: the rules it relies on, and the rules that do not
  apply to it and why.
- A rule changes only in a new house-rules version (HR-1.1, …). Every footer is re-checked in the
  same change.
- Rules 1–22 adapt the conventions in fal's agent skills to this machine, `ai-gen` and the SL8
  run evidence. The source of each is in `studio/image-studio/adaptations.md`.

## The rules

| # | Rule | Why (the run or finding that earned it) |
|---|---|---|
| HR1 | **Declare, then assert.** Before any paid call, write what the output must be (size, aspect, duration, fps, audio, format) into the plan or request record. After it, measure the file and compare (`media-qc`). | Two signed SL8 releases claimed 720p and shipped 864×496; nothing compared delivered with declared. |
| HR2 | **Check every value, not just every field name,** against the endpoint's schema `enum` / `const` before submitting. `ai-gen info` shows a `const` as a plain default, so read the raw OpenAPI for any field you set (see `commands.md`). | A `const` field rejects any other value with a charged 422; a name-only check passes it. |
| HR3 | **Unknown parameters are dropped silently** by the proxy. A field the schema does not list has no effect. Never assume a setting took; measure it (HR1). | `image_size` on nano-banana-pro was ignored and a square came back. |
| HR4 | **Pin every default-on flag explicitly** (audio, prompt expansion/rewriting, quality, resolution, safety), even when you want the default. | Audio and 2K/1080p defaults multiply cost silently; rewriters change prompts. |
| HR5 | **Cost first.** Run `ai-gen estimate` for every paid step and keep a running total. Stay inside the run ceiling (`SL8_SPEND_CEILING`, or the brief's budget). Never send `duration: auto` to per-second billing. Plan re-rolls in the budget. | One SL8 run spent 2,601 credits against an 800 cap while every call obeyed its own cap. |
| HR6 | **Never re-fire a job that may exist.** Once a request id exists, only `ai-gen result <id>` (or `status <id>` without `--wait`) touches it again. A timeout is already charged; fetch, do not resubmit. | Re-firing pays twice for one output. |
| HR7 | **One retry per item, and it moves a named lever** (prompt clause, reference, route, duration, `context`). A second failure goes to the named fallback route or to a gate; there is never a third attempt on the same route. Record attempts in the manifest. | A shot that took three attempts because the count lived in memory. |
| HR8 | **Artifacts layout.** Deliverables go under `artifacts/<project>/<node>/` via `ai-gen … -o`; scratch work under `work/<project>/`. Download outputs immediately: hosted URLs expire. | Lost outputs and mixed scratch/deliverables. |
| HR9 | **One manifest row per generation,** written by `scripts/manifest.mjs`: endpoint, request id, params, prompt (and the rewritten prompt if the route returns one), declared vs measured, credits, attempt, parents, files with sha256. | Provenance that the next job, the grader and the owner can trust. |
| HR10 | **Deterministic before generative.** Anything a slider, crop, composite or encode can do runs locally. Exact text, logos and brand marks never pass through a generative model; they are composited or burned last, in one encode. | Generated lettering misspells brand names; edit models redraw logos. |
| HR11 | **Edit from the original,** never from a render of a render, unless the brief asks for an iterative chain. | Each regeneration drifts identity and detail. |
| HR12 | **Gates have written defaults.** A step that would spend past what the brief approved opens a gate file (`scripts/gate.mjs`) and the job ends `partial`; the next job resumes. A text-only choice proceeds on the stated default and flags it in the delivery. Never call an ask-the-user tool: bot jobs run with no person present. | Headless jobs cannot answer cards; a spend made without approval cannot be undone. |
| HR13 | **Checks are scripts.** A quality rule that can be measured is measured by `media-qc` (or a skill script), which prints figures and fails on a known-bad input. | SL8's prose rules broke whenever they mattered; its scripted gates held. |
| HR14 | **The agent never writes PASS** for something a script can measure, and never grades its own taste. Report figures; taste goes to the owner's review. | An agent reported "identity: PASS" with 4 of 5 tokens missing. |
| HR15 | **A hand-off names the file and the debt still owed on it** (e.g. "captions still to burn on cut-03.mp4"). | On-screen text that every step assumed another step would add. |
| HR16 | **The rewriter is part of the model.** Many routes rewrite prompts by default. Turn rewriting off when your prompt is complete; when it cannot be turned off, store the rewritten prompt if returned and say so. | Results blamed on the model were the rewriter's. |
| HR17 | **Consent turns on whose likeness or voice it is,** not on how it is asked. No real person's face or voice without their documented consent; never imitate a named real person. | Provider terms and basic safety. |
| HR18 | **Claims need substantiation.** Never invent statistics, ratings, reviews, prices, awards or testimonials; a user's typed claim on a commercial asset needs their confirmation. | A convincing asset carries the weight of a printed claim. |
| HR19 | **Emphasis is not enforcement.** If a warning was ignored once, turn it into an ordered step with a printed artefact, and delete the old warning. | Bold warnings were skipped under momentum. |
| HR20 | **The user's explicit instruction wins,** even against these rules. Do it, state the cost in one line, and record it in the manifest's `waivers`. | Leverage, not law. |
| HR21 | **No runtime installs.** Never `pip install`, `npm install` or download tooling in a job. If a tool is missing, the machine is broken: report it, do not repair it. | The machine is immutable and tested; runtime installs break that. |
| HR22 | **Facts come from the facts files.** Model ids, limits, prices and defaults come from the owning skill's `references/facts.md` or `picks.md` (each row dated), checked live with `ai-gen models` / `info` / `estimate`. Never restate a tool default from memory. | Model picks went stale within months in every skill set studied. |

## How a skill cites them

Every `media-*` SKILL.md ends with:

```
## House rules (HR-1.0)
Relies on: HR1, HR5, … — see media-ai-gen/references/house-rules.md
Not applicable: HR17 (no likeness or voice in this skill), …
```
