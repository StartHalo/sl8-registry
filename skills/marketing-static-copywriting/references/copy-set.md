# The copy set and the lock entry

SL8's file shapes for marketing-static-copywriting. `scripts/copyset.py` reads them; a calling
workflow reads the copy set or a file exported from it, verbatim.

## Copy set: `artifacts/<project>/copy/copy-set.json`

```json
{
  "project": "spring-planner",
  "language": "en",
  "copy_target": "With [Brand], the week's posts are ready before Monday.",
  "brand": {
    "name": "[Brand]",
    "sources": ["artifacts/brand/notes.md", "artifacts/attachments/claims.txt"],
    "claims": ["drafts and schedules social posts from one product photo"],
    "bans": ["no 'set and forget'", "never imply paid-ad management"],
    "protected_terms": ["[Brand]"]
  },
  "allowed_numbers": ["$9"],
  "promotion": null,
  "leads": [],
  "count": 5,
  "mode": "test",
  "limits": { "headline": 8 },
  "variants": [
    { "id": "v1", "entry": "swamped first-timer", "format": "checklist", "angle": "time",
      "length": "setup", "supplied": false,
      "slots": { "headline": "…", "body": "…", "cta": "…" }, "risks": [] }
  ],
  "checklist": { "brand": "…", "numbers": "…", "absolutes": "…", "price-outcome": "…",
    "urgency": "…", "concept": "…", "list-ending": "…", "money": "…", "brand-bans": "…",
    "claims": "…", "plain": "…", "axes": "…", "scam-text": "…" }
}
```

| Field | Meaning | Checked by `lint` |
|---|---|---|
| `copy_target` | the one sentence every variant lands (step 4) | present, one sentence |
| `brand` | name, files read this job, claims, bans, protected terms (steps 2, 3) | present; `sources` and `claims` not empty |
| `allowed_numbers` | figures the brand can stand behind: real prices, documented figures, the promotion's numbers | any other figure in a line fails |
| `promotion` | `null`, or `{ "text": …, "ends": "YYYY-MM-DD" }` for a real dated offer | urgency words fail unless `ends` is a date today or later; a non-object fails |
| `leads` | `[{ "where": "v3", "seen": "…" }]`: your answer to each LEAD; `where` is the variant id or `set` | a LEAD with no answer of 20+ characters fails |
| `count`, `mode` | variants per concept (default 5) and `test` (the axes apply) or `single` (one line, axes skipped) | in `test` mode the authored variants (not `supplied`) must equal `count`; the axes are checked for any number |
| `limits` | words per slot from the calling workflow (characters for zh, ja, th) | exceeding one fails; a slot no variant uses fails |
| `variants[].slots` | slot name to text, in reading order; `\n` between overlay lines | protected terms spelled exactly |
| `variants[].entry/format/angle/length` | the five axes (step 8) | allowed values, repeats, one punch (counted on the headline slot; zh, ja, th: under 16 characters) and one setup at five or more; a `testimonial` with a name, rating or "customers say" fails |
| `variants[].supplied` | `true` for the customer's own wording (step 9) | findings become REPORT; `risks[]` needs one entry per finding, each with `pattern` and `alternative` |
| `checklist` | the 13 items, each with what was seen (step 11) | missing, bare (`pass`, `none`, `nothing found`…) or under 20 characters fails |

Word-list checks (absolutes, urgency, money framing, stacking, list endings) run for English only.
They catch shapes, not meaning: a clean lint does not replace reading every line against
`rules.json`.

## Lock entry (localization, step 10)

One JSON object per source ad, written with
`python3 copyset.py lock <entry.json> --ledger artifacts/<project>/qa/<code>/translation-provenance.json`
before that ad's first render (add `--copy-set <copy-set.json>` to check the locked text against the
brand). The ledger folder is created if missing and the file is written atomically. The ledger is
`{ "entries": [ … ] }`; the script appends and always stamps `locked_at`. Sources are compared after
path normalization.

```json
{ "source": "set-01/ad-03.png", "target": "set-01-es/ad-03.png",
  "headline": "…", "body": "…", "cta": "…",
  "protected_tokens": ["[Brand]"], "product_marks": ["text printed on the pack, as printed"],
  "notes": "body shortened to keep the type size of the source" }
```

The lock refuses an entry with a field missing, with all three copy fields empty, or with a
protected token absent from the copy and the product marks; with `--copy-set`, also an entry with a
brand protected term missing from `protected_tokens` or a figure outside `allowed_numbers` and the
source copy. A second lock of the same source needs `--replace --reason`: the earlier entry stays
and is marked `superseded_by: <new locked_at>`, the new one carries `replaces`. **A reader takes the
entry for a source that has no `superseded_by`.**

## Export

`python3 copyset.py export <copy-set.json> --variant <id> [--slot <name>] --out <file>` writes the
variant's slots (or one slot) as plain text, verbatim, for a caller that reads one text file. It runs the lint first, prints the variant's LEAD
and REPORT lines, and refuses on a FAIL unless `--force`. The output folder is created if missing.
