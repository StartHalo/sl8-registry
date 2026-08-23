# The consistency check — grade the pixels, then decide

The bible's own exam. The spec is the **answer key**; the turnaround sheet is the **exam**.
Read the answer key (`character/spec.md` — Identity Tokens, Seed, CHARACTER_BLOCK), then look
at the exam (the rendered pixels of `character/sheet.png`) and mark each token.

> Harvested from BOT-016 `bot-016-consistency-check`, 2026-08-23. It was the more rigorous of
> the studio's two identity self-checks — `cinematic-video` carried only an approval note —
> and it had no path into the studio until `character-bible` was promoted to the domain tier.

## The one rule that makes this worth running

**`Read` `character/sheet.png` as an image and grade against what you actually see.** A
filename, a path, the spec text, or the generation log are NOT evidence of what the sheet
shows — a file named `sheet.png` can still have the wrong hair in the side view. Grading from
anything but the rendered pixels is a **fabricated grade**, and a fabricated grade ships a
broken bible into every downstream shot of every scene.

This is not hypothetical. R05 (2026-08-23) recorded `QC-13 identity: PASS (consistent keeper
across all 4 shots)` while 4 of 5 identity tokens were missing from the prompts entirely. A
check that can be reported green by glancing at pictures is not a check — which is also why
the mechanical half (does the CHARACTER_BLOCK appear verbatim in the prompt?) is a **separate
assertion owned by the workflow**, and why this one is explicitly about the pixels instead.

If `Read` returns no viewable image, that is a clean recorded failure, not a guessed score.

## Per-trait verdicts

For **every** token in the spec's Identity Tokens, look across all four views and mark:

- **`consistent`** — present and the SAME across every view (front, three-quarter, side, back
  read as one character on this trait).
- **`drift`** — present in some views but changed in others (silver braids in front, loose
  dark hair in the side view), **or** rendered but not matching the spec token (spec says
  `glowing violet eyes`, the sheet shows brown).
- **`absent`** — not visible anywhere on the sheet (a locked signature prop missing entirely).

Grade by trait **class** across views — face, hair, eyes, outfit/props, palette, and overall
silhouette/proportions — because drift hides in the view the eye does *not* land on first.
Walk them in that order.

| trait class | what drift looks like here |
|---|---|
| face | facial structure or skin tone shifts between views; age reads differently |
| hair | length, braid pattern, parting or colour changes view to view |
| eyes | colour shift, or the locked glow/shape absent in profile |
| outfit/props | armor panels, jacket cut or a signature prop appearing/vanishing |
| palette | the accent colour migrates, or the grade warms/cools between views |
| silhouette | build, height-to-head ratio or posture proportions disagree |

## The score, and the pass bar

Combine the per-trait verdicts into ONE overall identity-consistency score:

| score | meaning | verdict |
|---|---|---|
| 9–10 | every trait consistent across every view; a stranger says "same character, every angle" | **pass** |
| 7–8 | identity clearly holds; at most one minor, non-identity-defining wobble (a cloak fold differs; face/hair/eyes/props all agree) | **pass** |
| 4–6 | one identity-defining trait drifts or is absent in a view | **regenerate** |
| 0–3 | multiple traits drift, the views look like different characters, or the sheet is unusable as an identity reference | **regenerate** |

**Pass bar: ≥7/10.**

## The regenerate-once rule (single variable, same seed)

On `regenerate`, recommend **exactly one** targeted regeneration — never an open loop, never
a free re-roll:

- **Same seed.** Drift is fixed by tightening language, not by re-rolling the dice.
- **One tightened token.** Name the single drifting trait and the tightened phrasing, e.g.
  tighten `hair` to `waist-length silver-white braided hair, identical braid pattern in every
  view`. Tightening means **more specific and explicit, never a synonym** — the no-synonym
  rule still holds; you are sharpening the locked token, not renaming it.
- **Once only.** Re-render the sheet once with the same seed and the tightened token, then
  re-grade. If the second sheet still scores below 7, do **not** loop a third time: keep the
  best attempt, write an honest `regenerate` verdict naming the residual drift, and surface it
  at the gate. A flagged imperfect bible beats an infinite loop or a rubber-stamped lie.

Changing more than one variable at a time makes the result uninterpretable — you learn nothing
about which change helped, and the next drift starts from zero knowledge.

## Output shape — `character/consistency-check.md`

```markdown
# Consistency Check: <Name>

## Per-trait verdict
| trait | spec token | verdict | evidence (what the pixels show across views) |
|---|---|---|---|
| face | <token> | consistent | <one line: same face front/¾/side/back> |
| hair | <token> | drift | <one line: silver braids front, loose dark hair in side view> |
| eyes | <token> | consistent | <...> |
| outfit/props | <token> | consistent | <...> |
| palette | <named palette> | consistent | <...> |
| silhouette | proportions/build | consistent | <...> |

## Overall identity-consistency score
<N>/10

## Verdict
<pass | regenerate>

## Regenerate instruction (only when verdict = regenerate)
- seed: <the spec seed — unchanged>
- tighten: <the single drifting token> → "<tightened, more-specific phrasing — not a synonym>"

## Method
Graded by viewing character/sheet.png (in-session vision); each token checked against the
pixels across all views, not from the filename or the spec text.
```

On `pass`, write the Regenerate-instruction header with `- (none — passed)` rather than
dropping the section: an absent section is ambiguous between "passed" and "not checked".

## Failure handling

| situation | action |
|---|---|
| `character/sheet.png` missing | Cannot grade pixels. Record the blocker, stop. **No score.** |
| `character/spec.md` missing | No trait checklist to grade against. Record the blocker, stop. |
| `Read` returns no viewable image | Do NOT guess a score. Record "could not view sheet.png (vision read failed)", stop. |
| Still below 7 after the one allowed regenerate | Write the check with the best attempt + an honest `regenerate` verdict naming the residual drift; surface at the gate. Never loop a third time. |

A clean recorded failure is a correct outcome. A guessed score, or a drifting bible shipped
quietly to keep the chain moving, is not.
