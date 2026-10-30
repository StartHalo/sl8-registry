# Locale guide for dubbing

Adapted from HeyGen's heygen-translate 3.2.0 locale guide and proofreads reference (MIT,
heygen-com/skills), as the SL8 capability assessment carries it (WF23-a1 steps 5, 8, 17, 18). HeyGen
request fields are replaced by what this machine does; the language codes live in
[languages.json](languages.json). The figures are HeyGen's observations of its own engine; **none has
been measured on the fal chain this skill runs.**

## Contents
- [Ambiguous language names](#ambiguous-language-names)
- [Regional variants](#regional-variants)
- [Length: compression and expansion](#length-compression-and-expansion)
- [Formality register](#formality-register)
- [Right-to-left targets](#right-to-left-targets)
- [Languages where lip-sync is harder](#languages-where-lip-sync-is-harder)
- [Multi-speaker sources](#multi-speaker-sources)
- [Proofread edit playbook](#proofread-edit-playbook)

## Ambiguous language names

| User said | Default | When to ask instead |
|---|---|---|
| "Spanish" | Spanish (Spain) | The user mentions a LATAM audience, Mexico, Argentina, etc. |
| "Portuguese" | ASK: the split is critical | Always ask Portugal vs Brazil. They are not interchangeable for audiences. |
| "Chinese" / "Mandarin" | Chinese (Mandarin, Simplified) | Taiwan → Traditional. Hong Kong → Cantonese. |
| "French" | French (France) | A Quebec / Canadian audience. |
| "English" | English (United States) | A UK, AU or IN audience. |
| "German" | German (Germany) | Rarely: Austria/Switzerland differ, but most German content uses the Germany standard. |
| "Arabic" | Arabic (the pan-region option) | The user names a country: use that country's variant. |
| "Japanese" / "Korean" | Japanese (Japan) / Korean (Korea) | Single canonical option. |

**On this machine the region reaches the voice only on the proofread path** (steps 16-21): the
dubbing model takes one ISO 639-1 code per language, so Spain and Mexico Spanish dub the same way on
the standard path. Say so whenever a region was asked for.

## Regional variants

Spanish has the largest audience-perception gap of any major language. Picking the wrong variant
for an audience can sound foreign or off-putting.

| Variant | Audience | Notes |
|---|---|---|
| Spanish (Spain) | Spain, some Spanish-speaking Europe | Castilian. "Vosotros" used. Z/C = θ. |
| Spanish (Mexico) | Mexico, US Hispanic (skews Mexican), much of Central America | Most-requested LATAM variant. Neutral-LATAM. |
| Spanish (Argentina) | Argentina, Uruguay | "Vos" instead of tú. Italian-influenced intonation. |
| Spanish (Colombia) | Colombia, parts of the Andean region | Neutral, often considered the "clearest" Spanish. |
| Spanish (Latin America) | Pan-LATAM | Use when the audience is mixed-LATAM and Mexico-specific feels too regional. |
| Spanish (United States) | US Hispanic / US-centric Spanish content | Less common but real: anglicisms preserved. |

When the user just says "Spanish" in a conversation, the question is: *"Latin America or Spain? If
Latin America: Mexico, broader LATAM, or somewhere specific?"* In a job with no one to answer, the
default is Spain and the delivery says so (HR12).

**Portuguese (Portugal) and Portuguese (Brazil) are NOT interchangeable.** They diverge in
vocabulary, grammar and pronunciation; each audience hears the other as foreign. Always ask, never
default (see SKILL.md step 3 for what a job with no one to ask does).

| Chinese variant | Audience |
|---|---|
| Chinese (Mandarin, Simplified) | Mainland China. The default for "Chinese". |
| Chinese (Taiwanese Mandarin, Traditional) | Taiwan: Traditional characters, distinct vocabulary. |
| Chinese (Cantonese, Traditional) | Hong Kong, Macau, the Cantonese-speaking diaspora: a different language from Mandarin. |

Cantonese is NOT a Mandarin dialect. "Translate for Hong Kong" is Cantonese; "translate for China"
is Mandarin (Simplified). Whether the dubbing model produces Cantonese at all is unverified
(languages.json).

## Length: compression and expansion

| Direction | Typical change | Notes |
|---|---|---|
| English → Mandarin Chinese | ~25–35% shorter | Highest compression. Flexible duration is the only sensible choice. |
| English → Japanese | ~20–30% shorter | Politeness markers vary the length by register. |
| English → Korean | ~15–25% shorter | Honorific levels affect length. |
| English → Spanish | ~10–15% LONGER | Spanish is wordier than English. |
| English → German | ~5–15% LONGER | Compound nouns extend phrasing. |
| English → Arabic | ~15–25% LONGER | Plus RTL caption rendering. |
| English → French | ~10–15% LONGER | Romance languages run longer. |
| German → English | ~10–20% shorter | |
| Japanese → English | ~25–40% LONGER | Japanese drops subjects/objects English must restate. |
| Spanish → English | ~5–10% shorter | |

**Flexible duration is the default**: translated speech gets room to be spoken at a comfortable pace,
and the picture is held to match (SKILL.md step 13). Fixed length only when the user needs it (an ad
slot, a synced timeline, music beats). Fixed length on a high-compression or high-expansion pair
degrades quality; the proofread path, with cues rewritten to fit, is the better route there. Length
is never fixed by time-stretching or speed changes (fal audio guidance; SKILL.md step 20).

## Formality register

The dub lands **neutral-formal** in most languages. If the source is casual and the user wants the
dub to match, that is a judgement call:

| Language | Register concern | Default | Override path |
|---|---|---|---|
| Japanese | keigo levels: tameguchi (casual) → desu/masu (polite) → sonkeigo/kenjougo (honorific) | desu/masu | Proofread: drop polite endings for a casual feel |
| Korean | 7 speech levels | haeyo-che (polite informal) | Proofread: replace endings (-요/-ㅂ니다) |
| German | Sie vs du | Sie | Proofread: Sie→du, Ihr→dein, Sie haben→du hast |
| French | tu vs vous | vous | Proofread: tu/vous swap |
| Spanish | tú vs usted, by region | tú in most LATAM, usted in formal Spain | Proofread per region |
| Thai | royal / polite / casual registers, particles ka/krap | polite + ka/krap | Proofread: drop particles for casual |
| Indonesian | formal Bahasa vs colloquial | formal | Proofread: relax to colloquial |
| Vietnamese | pronouns encode hierarchy | neutral | Proofread per audience |
| Hindi | आप (aap) vs तुम (tum) vs तू (tu) | aap | Proofread for casual |

Rule of thumb: **a conversational source into a language with strong formality conventions (ja, ko,
th, de, hi) goes to the proofread path**, even when the video is short.

## Right-to-left targets

Arabic, Hebrew, Urdu, Persian (Farsi), Pashto. Burned-in captions render right-justified in the
lower third and collide with source lower-thirds, on-screen text or chyrons. For an RTL target over
any source lower-third graphics: deliver the dub with a **sidecar SRT** (or audio-only), and let the
user's editor place the captions. Burned RTL captions need an RTL-capable face (`fonts-noto`). RTL is
text direction only: the voice dub works as for any other language.

## Languages where lip-sync is harder

Lip-sync depends partly on phoneme overlap with the source. Mouth shapes differ markedly from
English in:
- **Mandarin / Cantonese**: tonal phonemes do not map to English mouth shapes.
- **Japanese**: mora-based phonology (/tsu/, /ryu/, /ja/); acceptable on a talking head, visibly off
  on close-ups.
- **Arabic**: pharyngeal consonants (ع, ح, خ, ق) need throat positions English does not use.
- **Russian**: palatalization adds mouth shapes.
- **Korean**: unaspirated / aspirated / tense consonant trios.

Set expectations slightly lower: natural enough, not photorealistic on close-ups. Invisible on mid
and wide shots; on a close-up talking head, propose a short test clip first.

## Multi-speaker sources

Separating speakers works well for two-host podcasts with distinct voices, interviews with clear
turn-taking, and two-person conversations without overlap. It works poorly for overlapping speech,
three or more speakers where two sound alike, and single-speaker content wrongly tagged as
multi-speaker. **The count is confirmed, never inferred from metadata or the filename.** Over three
speakers: say up front that voice swaps or merged voices may happen.

## Proofread edit playbook

**Glossary / do-not-translate.** Proper nouns and jargon get translated unless restored. Show the
full list first and apply it only once confirmed, with `srt_tools.py glossary` (list, then
`--apply`). Beware over-broad replacements: a word that is also a common word in the target
language is replaced only where it was meant.

**Register edits** for ja/ko/de/fr/es/th/hi conversational content that landed too formal:

| Language | Find | Replace |
|---|---|---|
| German | `Sie ` / `Ihr ` / `Ihre ` / `Sie haben` | `du ` / `dein ` / `deine ` / `du hast` |
| French | `vous` / `votre` / `vos` | `tu` / `ton` or `ta` / `tes` (context-aware) |
| Japanese | `です`, `ます` | strip, per-line review |
| Korean | `ㅂ니다` | `요`, per-line review |
| Thai | `ค่ะ` / `ครับ` | strip, per-line review |
| Spanish | `usted` / `vosotros` | `tú` (LATAM informal) / `ustedes` (es-ES → LATAM) |

Bulk replacement of register markers breaks sentences in CJK and South-East Asian languages where
the marker is part of the verb: walk through line by line for ja/ko/th; batch with confirmation for
de/fr/es.

**Numbers, dates, units.** Spot-check: currency (`$1,000` → `mil dólares`, `US$1.000` or `1.000 $`:
pick the audience convention); dates (`4/27` → `27 de abril`, `4月27日`, `27.04.`, `27/4`); imperial
units are NOT converted to metric: tell the user when the audience expects metric. Idioms, sports and
pop-culture references often translate literally and lose meaning: flag the lines and ask whether to
adapt or keep them literal.

**Timecodes never change.** Edit cue text only; `srt_tools.py check` proves it.
