# News anatomy — the parts to find

News is built on the **inverted pyramid**: most important first, supporting detail descending. That's exactly what a 5–15s video needs — *the top of the pyramid IS the video; the base is what we trim.* Full detail: `research/domain-analysis.md` §1.

| Part | What it is | Where it goes in the NewsDoc |
|---|---|---|
| Kicker / eyebrow | small category label ("FUNDING") | `category` / an editorial kicker chip |
| **Headline (hed)** | the main line, often a compressed sentence | `headline` (the hero line) |
| Dek / standfirst | one-line summary under the hed | `dek` |
| Dateline | "SAN FRANCISCO, June 9 —" | `dateline.location` + `.date` |
| **Lede** | first sentence; carries the 5W1H | `body_beats[0]` (role `lede`) |
| Nut graf | "why this matters now" | a beat (role `nut`), if room |
| Body | supporting detail, descending | beats (role `detail`/`context`) |
| Quote + attribution | a direct quotation + speaker | `quote` |
| Key stat | the anchoring number | `primary_stat` |
| Source | outlet / "according to X" / byline | `source` (credit line — mandatory if present) |

## The 5W1H
The lede answers as many of **Who / What / When / Where / Why / How** as the story has. The irreducible video core is **Who + What + (When or the hero figure)**. Never invent a missing W.

## Preserve vs trim (for 5–15s)
- **Preserve:** the headline/core claim; any number/name/quote/date you choose to show (verbatim); the source.
- **Trim:** background/history, boilerplate ("About X"), secondary reactions, methodology.
- **Compression preserves meaning; alteration fabricates.** Shorten freely; never invert a hedge ("may reach" stays "may reach") or change a figure.
