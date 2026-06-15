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

## Font packs (typography)
Every style draws with three roles — **body** (sans), **display** (headline), **condensed** (caps) — read from the chosen pack, never hardcoded. Pick one via `props.fontPack`; default **modern**. The developer can set a brand font pack in `context.md` so every render uses it.

| pack | body / display / condensed | character |
|---|---|---|
| **modern** (default) | Inter / Fraunces / Oswald | clean grotesque + premium serif + broadcast condensed |
| **editorial** | Manrope / Playfair Display / Oswald | refined magazine; high-contrast serif headlines |
| **bold** | Inter / Anton / Bebas Neue | high-impact; heavy display + tall caps |
| **tech** | Space Grotesk / DM Serif Display / Oswald | modern/techy with a dramatic serif accent |

A pack changes only personality — every style stays legible in any pack (roles are kept consistent). Styles that lean on a serif `display` (minimal-editorial, perspective-3d, headline-highlight, blur-carousel) look most "premium" in **modern**/**editorial**; **bold** maximizes punch (giant-word, box-reveal, breaking-news).

## Background score (mood)
Every style carries an optional score, chosen by `props.mood` (`calm` / `dramatic` / `upbeat` / `tech`) or derived from the style + the message `tone`. Set `props.music = false` to render silent.

**Score library (bundled, reusable):** real produced tracks live in `scripts/remotion-template/assets/audio/` — `announcement-1.mp3` (brighter/forward) and `announcement-2.mp3` (warmer/weightier), both ~−14 LUFS, 60 s, stereo. `render.sh` stages them into `public/music/`; `<BackgroundScore>` resolves a track per mood (`engine/moods.ts` `MOOD_FILE`), skips the track's quiet intro (`SCORE_START_SECONDS` ≈ 10 s) to ride the main groove, and muxes it under the clip with quick fades at near-unity volume. The four moods map onto the two tracks (`upbeat`/`calm` → announcement-1, `dramatic`/`tech` → announcement-2).

**To add or swap a track:** drop an mp3 in `assets/audio/`, add it to `MOOD_FILE`, and point a mood at it. **Fallback:** if no bundled track is present, `make-scores.mjs` synthesizes stand-in beds under the same filenames (a deterministic offline synth — kept as a safety net, not the default).

Per-style default mood: kinetic/box-reveal/headline-highlight → `upbeat`, breaking-news/giant-word → `dramatic`, minimal-editorial/perspective-3d/blur-carousel → `calm`, pixel-reveal → `tech`; strong tones (urgent/celebratory/technical) override.

## Notes
- Every style renders gracefully when optional fields are `null` (the engine + sequencer guard them). `minimal-editorial` is the safe default precisely because it reads well from a headline alone.
- Attribution: if `source.name` is present, every style shows a visible credit/endcard.
- A style is a parameter — the same three aspect-ratio compositions (`News-16x9/9x16/1x1`) render any style via `props.style`. (The composition ids keep the `News-` prefix internally; they're invisible to the customer.)
- `quote` is featured by `perspective-3d`, `breaking-news` (soundbite), `headline-highlight`, and `minimal-editorial`; the others omit it gracefully when absent.
