# Writing the monologue (steps 10-11)

SL8's restatement of Higgsfield's website-lane monologue guidance (no licence stated; cited by
research id in `adaptations/marketing-site-creator-video.json`). The pace and word figures were tuned
by the vendor on Seedance 2.5; this machine's default clip model is Seedance 2.0, where none of them
has been measured yet (learnings MKT-L405). `scripts/plan.py script` enforces what can be counted.

## Contents
- [Shape](#shape)
- [The hook](#the-hook)
- [The body](#the-body)
- [The closer](#the-closer)
- [Sounding spoken](#sounding-spoken)
- [Word budget](#word-budget)
- [Files](#files)

## Shape

| Part | Share of the runtime | What it does |
|---|---|---|
| Hook | about 8-12%, the first 1-2 s | One bold, specific claim. No greeting and no pointing at the site |
| Body | about 70% | The captured sections in card order, one concrete line per card while it is on screen |
| Closer | about 15% | A concrete result with the call to action inside it, said while the creator does the closing action; no card |

The whole monologue is one run of momentum: no part should feel like a new scene. Filler sections
(navigation, footer, a strip of logos) get no line and no card.

## The hook

- At most 6 words in one clause (the method's plate limit; the spoken-hook limit is 8, and one value
  keeps both: learnings MKT-L401), said in about 2 seconds.
- A hard detail in the first breath: a number, a price, a percentage, a span of time, a contrast or
  a named outcome. "These are great" has none and is not a hook.
- The first word is the claim. Never open with filler (OK, So, Wait, Um, Well, Like) or with a
  pointing intro that stakes nothing (These are, This is, Here's, Meet, I found, Let me show, Say
  hello to, I want to show).
- The hook may mention the brand only inside a claim. Naming the site as the thing being used is
  the first body beat, and the hero card lands there, not on the hook.
- Choose one angle and write a new line in it; never reuse a sample line:

  | Angle | When it fits | Shape of a line (ours, for illustration only) |
  |---|---|---|
  | Price contrast | it costs less than it looks | "$12 a month, ALL my invoicing." |
  | Reveal | a premium result for little money | "Clients think I hired designers." |
  | Proof in numbers | many buyers or reviews (only when approved or on a card) | "4.8 stars from 2,000 shoppers." |
  | Stop doing X | a category people overpay or overwork in | "Stop paying $300 for a logo." |
  | Result | software, services, earnings | "Payroll: 3 hours to 10 minutes." |
  | Speed | a fast result or delivery | "Booked a plumber in 90 seconds." |

  Bold but believable; never a claim that sounds like a scam.
- **Claims come only from the brief's approved claims or from what a captured card shows.** A
  first-person or crowd claim ("saved me 20 hours", "3 million bought this") is not invented for a
  generated creator (HR18).

## The body

- One beat per captured card, in card order: the hero first (the beat that names the site), then
  the product or details, reviews, then price or warranty. Sections that prove the point get more
  beats; minor ones fewer.
- Each beat talks about what its card actually shows ("4.9 from 800 reviews" while the reviews card
  is up). Never promise a screen the capture does not have.
- More cards on screen come from more captured stills and more beats, never from longer windows.
- Talking-head-only jobs (no cards) write the body from the approved claims alone (learnings
  MKT-L411).

## The closer

- Software, service or app: the creator picks up their phone and taps it, its display dark or
  turned away. Write a line that motivates the tap ("so I hit book and it was done").
- Physical product with a real product image from the page: the creator may pick it up and show it
  ("and it turned up two days later, look"). Only here may the product appear.
- Physical product without a usable image: a neutral closing gesture.

## Sounding spoken

- Contractions always (it's, they're, I'm, you'll).
- One or two casual linking phrases (ok so, honestly, and get this, here's the thing), never as the
  hook's first word.
- Mix very short lines (2-4 words) with longer ones; an even rhythm is out.
- Exactly one live, imperfect moment: a small self-correction, a thought said out loud, or a
  reaction to their own line.
- Put the performance into the words, since the clip model acts out what the words do: stretch the
  vowel on the payoff word ("it's SO easy"), at most one or two capitalised words per line, one
  broken sentence at the single strongest beat ("it's... ok wait. LOOK."), a quiet setup that jumps
  on the payoff. Human-sized: a real grin or "wait, what", never shouting or an infomercial voice.
- At most one planned pause, in the hook or the closer; extra pauses bloat the render.
- Every claim carries one concrete thing (a number, a time, a named comparison): "cut reporting from
  3 hours to 10 minutes" beats "saves time". Praise without one is cut.
- Words that are out: literally, obsessed, game-changer, holy grail, hits different, elevate,
  seamless, effortless, synergy, leverage, unlock, supercharge, revolutionary.
- Speed varies inside the take: quicker through linking words, slower to land the number, the price
  and the call to action. A crammed clip is the most common cause of a creator who talks too fast.
- English, unless the customer explicitly asks for another language (not offered on this machine
  yet: step 2).
- Write every brand exactly as spelled and every number as digits ("$10", "4.9", "2 minutes"):
  the captions take their spelling from the script, and the caption check fails on a number heard
  as a word that the script spells differently.

## Word budget

Per clip, by its planned length (aim for the middle, never above the top). The tops are the vendor's
density table capped at the stated pace of 2.7 words a second, so a 13 s clip is never asked for
3 words a second (MKT-D401); the pace itself is unmeasured on Seedance 2.0 (MKT-L405):

| Clip length | Words |
|---|---|
| 13 s | 31-35 |
| 14 s | 34-38 |
| 15 s | 35-40 (about 40 is the ceiling) |
| 11 s | 26-29 |
| 12 s | 28-32 |
| 10 s | 22-26 |
| 4-9 s | 2.2-2.6 words a second (`plan.py` derives it from the pace rule) |

Split the total about 8-12% hook, 70% body, 15% closer. Each clip says its own slice of the script,
cut at a phrase boundary; one idea per phrase, the key word at the end of its phrase.

## Files

Write `work/<p>/monologue.json`:

```json
{"site": "Name as spelled", "hook": "...", "body": [{"section_label": "<card label>", "text": "..."}],
 "closer": "...", "clips": ["clip 1 words", "clip 2 words"]}
```

`section_label` is the card's label from `cards.json`. `plan.py script` checks it and writes
`script.txt` (the full text), `hook.txt` (the hook, which is also the caption plate) and
`beats.json` (hook, body beats and closer with word counts) for the timeline.
