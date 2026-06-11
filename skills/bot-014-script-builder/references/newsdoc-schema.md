# NewsDoc schema (the render contract)

The single object every style renderer consumes. Produced here, read-only downstream. All text is verbatim or a meaning-preserving **compression** of the input; absent → `null`. Canonical detail: `research/domain-analysis.md` §3.

```jsonc
{
  "schema_version": "1.0",
  "headline": { "text": "Acme raises $40M Series B to scale its robotics platform",
                "source_span": "Acme Robotics announced today it has raised $40 million in a Series B round...",
                "compressed": true },
  "dek": { "text": "Round led by Foundry Capital; company now valued at $300M.",
           "source_span": "...led by Foundry Capital, valuing the company at $300 million.",
           "compressed": true },                          // or null
  "dateline": { "location": "SAN FRANCISCO",              // or null
                "date": "2026-06-09",                     // ISO; NEVER default to today; or null
                "date_display": "June 9, 2026" },         // or null
  "source": { "name": "Acme Press Release",               // or null (then no credit line renders)
              "url": "https://...", "byline": "Jane Doe" }, // url/byline nullable
  "body_beats": [                                          // 2-6, ordered most-important-first
    { "text": "Acme raises $40M Series B", "role": "lede",
      "source_span": "...raised $40 million in a Series B round", "compressed": true },
    { "text": "Round led by Foundry Capital", "role": "detail",
      "source_span": "The round was led by Foundry Capital", "compressed": false }
  ],
  "key_phrases": ["$40M", "Series B"],                     // 1-3; each VERBATIM in headline/beats
  "primary_stat": { "value": "$40M", "label": "Series B raised",
                    "source_span": "raised $40 million" }, // value VERBATIM; or null
  "quote": { "text": "This is our most important milestone.", // VERBATIM, inside the input's quote marks
             "speaker": "Maria Chen", "speaker_title": "CEO, Acme",
             "source_span": "\"This is our most important milestone,\" said CEO Maria Chen." }, // or null
  "category": "funding|launch|partnership|hire|policy|research|product|update|quote|other",
  "tone": "neutral|exciting|urgent|celebratory|technical|reflective", // how the message reads; nudges mood
  "recommended_style": "minimal-editorial",                // one of the 9 styles (see style-selection.md)
  "recommended_mood": "calm",                              // optional: calm|dramatic|upbeat|tech (else engine derives)
  "meta": { "input_mode": "text|url", "extraction_confidence": "high|thin|headline_only", "language": "en" }
}
```

## Field rules (the validator enforces the strict ones)
- **headline**: required, non-empty. Keep ≤ ~120 chars for a hero line.
- **body_beats**: 1–6 (target 3–5), ordered by the inverted pyramid; index 0 is the lede. One on-screen line each.
- **key_phrases**: 1–3, each a **verbatim substring** of `headline.text` or some `body_beats[].text` (else a highlight has no target — the validator FAILS this).
- **primary_stat.value**: the FIGURE ONLY — a number with its unit/symbol, kept SHORT (e.g. `"$40M"`, `"35%"`, `"2M"`, `"200"`). It is rendered very large (a hero counter), so it must NOT be a phrase. Put the descriptive words in `label` (e.g. value `"2M"`, label `"workers reached in week one"` — NOT value `"2 million workers"`). Still traces to the input figure.
- **`compressed`**: `true` if shortened from `source_span`; `false` must be a verbatim substring. Quotes are always verbatim; `primary_stat.value` is the verbatim figure (compacted to its number + unit).
- **Absent fields are `null`**, never empty-string-padded or guessed.

The render skill (`bot-014-text-animator`) also accepts a **flat** shape where text fields are plain strings (e.g. `"headline": "..."`); the engine's `normalizeDoc` collapses either form. Writing the rich shape (with `source_span`) is preferred because it lets a grader prove nothing was invented.
