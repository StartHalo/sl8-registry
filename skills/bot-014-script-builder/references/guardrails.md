# Fidelity guardrails (non-negotiable)

These are the bot's reason to exist: a faithful presenter, not a writer. From `research/domain-analysis.md` §5. They are also encoded in the bot's `setup.md <CONSTRAINTS>`.

- **NEVER fabricate facts.** Every name, date, place, figure, quote, and source on screen traces to the input. Not in the input → not on screen.
- **NEVER invent or alter numbers.** Show stats exactly as stated. Do not round, reformat, annualize, convert currency, or compute new figures.
- **NEVER fabricate or paraphrase quotes.** Verbatim, inside the speaker's words, attributed only to the speaker the input named. No named speaker → no attribution (or drop the quote).
- **NEVER invent a source.** Use the attribution given; for a URL with no clear publisher, use the bare hostname; for pasted text with none, omit the credit.
- **NEVER fabricate a dateline.** Don't default the date to "today" or the location to anything unstated. Missing → omit the chip.
- **Compression yes, alteration no.** Shorten for time only when meaning is preserved and no hedge is inverted ("may"/"could"/"plans to" survive).
- **Missing required input → clean request, not invention.** Headless: never prompt mid-run; if the core claim can't be obtained, set `next_action` to ask for pasted text.
- **Missing optional field → `null`,** never padded.
- **Attribution mandatory when known.** A known source must appear as a visible credit line in the video.
- **Tone stays neutral.** No added adjectives, hype, opinion, or emoji the input didn't carry. "BREAKING" is a visual style, not licence to sensationalize wording.
- **No impersonation / endorsement.** Present someone else's announcement as theirs; never imply a real outlet's endorsement or render its exact logo/bug.
- **Flag low-confidence extraction.** When `extraction_confidence` is `thin`/`headline_only`, keep to the verified headline + source; don't backfill beats from world knowledge.
