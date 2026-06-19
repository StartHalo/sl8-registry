# The fidelity rule — provenance, facts vs framing, and the restyle boundary

> The non-negotiable for `hf-script`. From `research/domain-analysis.md` §1 (Provenance) and
> `research/prompt-engineering.md` §6–§7 (anti-patterns + restyle/re-render discipline). Mirrors
> BOT-014's fact-preserving MessageDoc. The rubric grades this directly (the `fidelity` dimension).

## 1. The rule

> **Facts come from the user's input and are never invented or altered.**

A "fact" is any concrete, checkable claim: a **number/percentage/currency figure**, a **name**
(person, company, product, feature), a **date**, a **quote**, or a **specific claim** ("works offline",
"used by 10,000 teams"). Every fact that appears in any VO line or on-screen text MUST be traceable to
the brief (`context.md`) via the **provenance table** in `02-script.md`. If you can't point to where a
fact came from in the brief, it does not go in the script.

This is *anti-hallucination by construction*: building the provenance table forces you to check each
fact against the source before it ships. A script with an untraceable number is a failed script even if
it reads beautifully.

## 2. Facts vs framing

You ARE allowed to write **framing/transition language** that carries no new fact — the connective
tissue that turns a list of facts into a narrative arc. Mark these `[framing]` in the provenance table.

| Allowed (framing — no new fact) | NOT allowed (a fabricated fact) |
|---|---|
| "Here's what changed." | "Adoption tripled." (no such number in the brief) |
| "Your API just got faster." (the brief is about an API speedup) | "Trusted by 10,000 developers." (no such claim given) |
| "Let's look at the numbers." | "...the fastest in the industry." (unsupported superlative) |
| "Start today." (generic CTA, brief asked for a teaser) | "Free for 30 days." (no offer in the brief) |

Litmus test: could a reader fact-check this sentence? If yes, it's a fact and needs a provenance row
pointing at the brief. If it's only tone/connective and verifiable-against-nothing, it's framing.

When in doubt, **leave it out** — a shorter faithful script beats a padded one with an invented claim.

## 3. Numbers and quotes are copied exactly

- **Numbers**: use the brief's figure exactly. Don't round (`$1.23M` ≠ `$1.2M` unless the brief
  rounded), don't change units, don't compute a derived statistic the brief didn't state (e.g. a
  growth % the user didn't give). For data-viz (JTBD-2) the on-screen numbers must equal the input data
  exactly — later phases animate counters to these values, so an error here propagates to the pixels.
- **Quotes**: reproduce verbatim, attributed to whoever the brief attributes them to. Never paraphrase a
  quote into a different claim.
- **Names**: exact spelling/casing of products, features, people, companies as the brief gives them.

## 4. The restyle / re-render boundary (the only phase that changes facts)

`hf-script` (phase 2) is the **only** phase allowed to change facts. The phase chain re-enters at
different points for different changes, and only this one touches the message:

| User asks for… | Re-run phase | Facts change? |
|---|---|---|
| "darker / bolder style", "different look" | build (5) | **No** — re-author visuals from the SAME script |
| "different voice", "re-voice it" | voiceover (4) | **No** |
| "make it 9:16", "re-render", "resize" | render (7) | **No** |
| "change the stat to 52%", "add a fact", "fix the name" | **script (2)** | **Yes** — re-script, re-run 3+ |

So: when the user asks to **restyle / re-voice / resize**, do NOT touch the script — those phases read
the *unchanged* facts. Only when the user changes the **message itself** (adds, removes, or corrects a
fact) do you re-run `hf-script`. If a "restyle" request smuggles in a new fact ("make it bolder and say
we doubled revenue"), split it: re-script for the new fact (with provenance), then restyle. Never let a
fact change ride in silently on a cosmetic request.

## 5. Thin briefs

If the brief is too thin to fill the arc, do NOT manufacture facts to fill it. Instead:
- Shorten the arc to the facts you have (a faithful 2-beat script beats a padded 5-beat one).
- Use framing language for connective beats (marked `[framing]`).
- Record the gap in the script's **Assumptions** block ("brief gave one stat and a topic; built a 3-beat
  arc around them; no CTA in the brief so ended on the takeaway").

A faithful, shorter script is always the correct output over an invented-fact longer one.
