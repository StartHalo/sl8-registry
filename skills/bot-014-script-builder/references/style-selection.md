# Style + mood selection — which look & score to recommend

Set `recommended_style` from **what the message leads with** × **register/platform**, and `recommended_mood` from the **tone**. The user can always override. There are **nine** styles (full look + fields each uses: the render skill's `references/styles.md`).

| Style | Recommend when the message… | Native platform / AR |
|---|---|---|
| **kinetic-typography** | leads with a `primary_stat` or a stat-led headline; punchy short-form | TikTok / Reels / Shorts — 9:16, 1:1 |
| **giant-word** | is one loud claim / launch / hype line; wants maximum impact | Reels / Shorts / Stories — 9:16, 1:1 |
| **box-reveal** | is a bold announcement with 1–2 key phrases to punch | feed / social — any AR |
| **pixel-reveal** | is dev / tech / product / "systems"-flavored; wants a retro-tech feel | X / dev social — any AR |
| **breaking-news** | is time-sensitive with a clear `source.name`; official / market / urgent | news feeds / broadcast — 16:9, 1:1 |
| **headline-highlight** | has a strong `quote` OR a crisp headline + key phrases to annotate | LinkedIn / X / blog header — 1:1, 16:9 |
| **perspective-3d** | is visionary / premium / quotable; wants a cinematic, filmic register | brand / hero — 16:9, 1:1 |
| **blur-carousel** | is a refined "what's new" / multi-point update or a list of items | brand channels / IG — 1:1, 9:16 |
| **minimal-editorial** | is a clean headline (+`dek`/`quote`); premium / brand-calm; or nothing else fits (SAFE DEFAULT) | brand / premium IG — 16:9, 1:1 |

## Decision shortcut
1. A single number carries it / short-form social? → **kinetic-typography** (or **giant-word** for max hype).
2. Bold announcement with key phrases to punch? → **box-reveal**.
3. Dev / tech / product, retro-tech feel? → **pixel-reveal**.
4. Urgent / official / time-stamped? → **breaking-news**.
5. A quotable line to annotate? → **headline-highlight**.
6. Cinematic / visionary / premium hero? → **perspective-3d**.
7. A "what's new" update or a list of points? → **blur-carousel**.
8. Otherwise (premium / brand-calm / unclear) → **minimal-editorial** (safe default).

## Mood (`recommended_mood`)
Map the message `tone` to one of `calm` / `dramatic` / `upbeat` / `tech`:
- **upbeat** — celebratory, exciting, growth, launches, wins.
- **dramatic** — urgent, serious, official, high-stakes, somber.
- **tech** — product/engineering/data, "systems", developer-facing.
- **calm** — reflective, premium, brand, neutral/measured (the default when unsure).

If you don't set `recommended_mood`, the render engine derives a sensible bed from the style + tone — so it's optional. Always state the one-line style (and mood, if notable) reason in `01-newsdoc.md`.

## Font pack (a brand choice, not content)
Color + fonts are the developer's **brand kit** (in `context.md`), not derived from the message — the render skill resolves them with defaults. If the developer has no preference, a fitting default per register is: premium/editorial → **modern** or **editorial**; punchy/launch/social → **bold**; dev/tech/product → **tech**. The default is **modern**. (Full packs: the render skill's `references/styles.md`.)

If the user named a platform, default to its native aspect ratio (9:16 social, 16:9 desktop/YouTube, 1:1 feed) and let that nudge the style.
