# The four styles (what each looks like + fields it uses)

A "style" is a folder under `scripts/remotion-template/src/styles/`; it's chosen via `props.style`. All four share the engine (fonts, safe zones, type-scale floors, seeded motion). You pick one — you don't edit them at runtime. Full design rationale: `research/style-*.md`.

| id | Look | NewsDoc fields it leans on | Best for |
|---|---|---|---|
| `headline-highlight` | Clean editorial article card on a light surface; subtle 3D zoom/rotate; blur-in; a seeded **rough.js highlighter** sweeps behind each `key_phrase` | `headline`, `key_phrases`, `dek`, `bodyBeats`, `quote`, `source` | a quotable line or a crisp announcement to annotate (LinkedIn/X/blog; 1:1 or 16:9) |
| `breaking-news` | TV-news authority: **BREAKING flag + two-tier lower-third + scrolling ticker + corner bug/clock**; deep charcoal/navy, red accent | `headline`, `dek`, `bodyBeats`, `dateline`, `source` | urgent / official / time-stamped news (16:9 or 1:1) |
| `kinetic-typography` | Bold **word-by-word** reveals on a shifting gradient; emphasis words pop; an animated **counter** for the hero stat | `headline`, `primaryStat`, `bodyBeats`, `key_phrases`, `source` | a number-led story or short-form social (9:16) |
| `minimal-editorial` | Premium & calm: **serif headline, dateline row, a divider that wipes in, slow Ken Burns**, eased fades; lots of whitespace | `headline`, `dek`, `dateline`, `source`, `quote`, `category` | brand-calm / premium, or the **safe default** when nothing else clearly fits |

Notes:
- Every style renders gracefully when optional fields are `null` (the engine guards them). `minimal-editorial` is the safe default precisely because it reads well from a headline alone.
- Attribution: if `source.name` is present, every style shows a visible credit line.
- A style is a parameter — the same three aspect-ratio compositions (`News-16x9/9x16/1x1`) render any style via `props.style`.
