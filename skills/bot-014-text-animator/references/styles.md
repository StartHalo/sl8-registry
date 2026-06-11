# The nine styles (what each looks like + fields it uses)

A "style" is a folder under `scripts/remotion-template/src/styles/`; it's chosen via `props.style`. All nine share the engine (fonts, safe zones, type-scale floors, seeded motion) **and the shared scene-sequencer** — so every style **progresses through the whole message** (headline → body beats → hero stat → quote → credit), not just a held headline. Each also carries an optional **background score** (a mood bed, muxed in automatically). You pick a style + optional mood — you don't edit them at runtime.

| id | Look | MessageDoc fields it leans on | Best for |
|---|---|---|---|
| `kinetic-typography` | Bold **word-by-word** reveals on a shifting aurora gradient; emphasis words pop; an animated **counter** for the hero stat; kicker chip + progress bar | `headline`, `primaryStat`, `bodyBeats`, `keyPhrases`, `category` | a number-led story or punchy short-form social (9:16, 1:1) |
| `box-reveal` | Heavy condensed caps where a **solid block sweeps across each word** to reveal it (accent block on key phrases); minimal dark stage; kicker + progress bar | `headline`, `bodyBeats`, `keyPhrases`, `primaryStat`, `source` | bold, editorial, attention-grabbing announcements (all ARs) |
| `giant-word` | ONE enormous word/line at a time that **slams in from center** (spring overshoot + blur-to-sharp) over a soft **radial accent glow** | `headline`, `bodyBeats`, `keyPhrases`, `primaryStat` | loud, social-first, hype/launch moments (9:16, 1:1) |
| `perspective-3d` | Cinematic **3D-tilted serif** text on a receding plane, drifting up with a horizon glow + film grain; renders a **pull-quote** scene | `headline`, `bodyBeats`, `keyPhrases`, `primaryStat`, `quote`, `source` | premium / filmic, a quotable or visionary message (16:9, 1:1) |
| `pixel-reveal` | Retro/tech: text resolves through a seeded **pixel-block dissolve** + a hand-drawn **rough.js underline** on key phrases; faint grid/scanlines | `headline`, `bodyBeats`, `keyPhrases`, `primaryStat`, `source` | dev/tech/product, a "systems" or data feel (all ARs) |
| `blur-carousel` | Elegant & soft: a stable lead label with a slot that **cycles short key words with a blur-swap**, then a tidy **list card** of the beats + credit; light premium gradient | `headline`, `keyPhrases`, `bodyBeats`, `primaryStat`, `source`, `dateline` | refined brand / "what's new" updates, lists (1:1, 9:16) |
| `breaking-news` | TV-news authority: **BREAKING flag + lower-third + scrolling ticker + bug/clock**, now **advancing** through beats → a stat panel → a "soundbite" quote → sign-off | `headline`, `bodyBeats`, `primaryStat`, `quote`, `dateline`, `source` | urgent / official / time-stamped news (16:9, 1:1) |
| `headline-highlight` | Editorial light cards with a subtle 3D drift; a seeded **rough.js highlighter** sweeps behind each `keyPhrase` per scene; ordinal pips on beats; pull-quote | `headline`, `keyPhrases`, `dek`, `bodyBeats`, `primaryStat`, `quote`, `source` | a quotable line or crisp announcement to annotate (1:1, 16:9) |
| `minimal-editorial` | Premium & calm: **serif headline, running head, folio markers, a divider that wipes in**, an understated figure, and a **pull-quote centerpiece**; slow eased fades, lots of whitespace | `headline`, `dek`, `bodyBeats`, `quote`, `primaryStat`, `dateline`, `source`, `category` | brand-calm / premium, or the **safe default** when nothing else clearly fits |

## Background score (mood)
Every style carries an optional bed, chosen by `props.mood` (`calm` / `dramatic` / `upbeat` / `tech`) or derived from the style + the message `tone`. The score is generated in-project by `make-scores.mjs` (run by `render.sh`) and muxed into the MP4 with frame-driven fades at a background level (~0.42). Set `props.music = false` to render silent. Default beds: kinetic/box-reveal/headline-highlight → `upbeat`, breaking-news/giant-word → `dramatic`, minimal-editorial/perspective-3d/blur-carousel → `calm`, pixel-reveal → `tech`; strong tones (urgent/celebratory/technical) override.

## Notes
- Every style renders gracefully when optional fields are `null` (the engine + sequencer guard them). `minimal-editorial` is the safe default precisely because it reads well from a headline alone.
- Attribution: if `source.name` is present, every style shows a visible credit/endcard.
- A style is a parameter — the same three aspect-ratio compositions (`News-16x9/9x16/1x1`) render any style via `props.style`. (The composition ids keep the `News-` prefix internally; they're invisible to the customer.)
- `quote` is featured by `perspective-3d`, `breaking-news` (soundbite), `headline-highlight`, and `minimal-editorial`; the others omit it gracefully when absent.
