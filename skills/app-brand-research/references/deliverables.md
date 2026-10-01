# Deliverables and the brand book

Milestone deliverables go in `artifacts/<project>/deliverables/` as Markdown (PDF is added when
the machine can render it). Each one **stands alone**: a reader who opens only this file
understands what was done, what was found, what was decided and what was assumed. Never write
"see state.md" or "see the step files".

Every deliverable has these four sections, with these exact headings:

```text
# M<n> <Name>: <app>, <project>
<one line: the date, and the brand book version if there is one>

## What was done
## Findings
## Decisions
## Assumptions
```

Under **Decisions**, mark each brand decision "proposed: approve or change". Under
**Assumptions**, list every value that came from a default or "assume for me", and every `[TBD]`,
with what would replace it.

| Milestone | File | Written by | Covers |
|---|---|---|---|
| M1 Findings | `deliverables/M1-findings.md` | app-brand-research | S1: the problem, touchpoint audit, competitors, review themes, clichés, key findings |
| M2 Brand brief | `deliverables/M2-brand-brief.md` | app-brand-strategy | S2: audience, positioning, onliness statement, promise, values, what the brand will not do |
| M3 Brand book | `deliverables/M3-brand-book.md` | app-brand-guidelines | S3–S5 in brief: voice, messages, look, touchpoints, guidelines; points the reader to `brand-book.md` for the full book |
| M4 Review | `deliverables/M4-review-<date>.md` | app-brand-review | findings by severity, the three tests, what to fix first |

## `brand-book.md`

The executable brand: one document a marketer and a designer can work from. Written by
app-brand-guidelines after S5, from the step files.

```text
# Brand book: <app> · v<N>
## What changed and why      (v2 and later only, first, tied to the person's request)
## Assumptions               (first: every default and [TBD])
## The brand in one page     (audience, onliness statement, promise, umbrella message, three voice words)
## Strategy                  (from S2: audience, positioning, vision, promise, we will not)
## Voice and messages        (from S3)
## Look and feel             (from S3: palette with contrast, type, imagery and icons, distinctive assets, mood boards)
## Touchpoints               (from S4, each touchpoint's example)
## Guidelines                (from S5: owner and home, do and don't, templates, consistency checklist, review cadence)
## Health-claims limits
## Decisions waiting on you
## Tokens                    (a table later jobs and other tools read: name · value · use)
```

The **Tokens** table lists each palette colour (`color.<name>` · hex · where it is used), each
type family (`type.display`, `type.body` · family · fallback), and the voice attributes
(`voice.1` … · "X, not Y").
