# Writing for a synthetic voice, and choosing the presenter

## Contents
- [Length](#length)
- [Sentences](#sentences)
- [Pauses](#pauses)
- [Spoken forms](#spoken-forms)
- [Speed](#speed)
- [Scenes](#scenes)
- [Presenter photo](#presenter-photo)
- [Presenter descriptors](#presenter-descriptors)
- [Look checklist](#look-checklist)

SL8 wording. The method is HeyGen's legacy avatar-video skill as the capability assessment records it
(`heygen/retired-avatarvideo-8ce216`, fine points #13-#18, #22-#23, #3, #4, #33; restated, not
copied: that repository sits outside the copyable HeyGen surface), with points added by the assessment
from fal, Creative Claw and HyperFrames, each cited. The figures were written for HeyGen's own voices;
they have not been run on our fal routes. `scripts/presenter.mjs script` checks every rule here that a
script can measure.

## Length

Plan at **150 words a minute** (Default; a kit or brief may name another rate, and a measured
`rate_wps` in the project's voice registry replaces it once the test in step 9 has measured one).

| Words | About |
|---|---|
| 75 | 30 s |
| 150 | 1 min |
| 300 | 2 min |
| 450 | 3 min |
| 750 | 5 min |

Frames for a composition: words / 150 × 60 × fps.

## Sentences

- 10 to 20 words is the comfortable range; a sentence of 30 words or more is split.
- Contractions read as natural speech ("we're", "you'll").
- One exclamation mark in a whole script is usually plenty.
- One idea per scene.

## Pauses

Write a pause as `<break time="0.5s"/>`: a space on each side of the tag, the time in seconds
written with `s` (never `ms`), and the tag closed in itself. Two tags in a row add up. On ElevenLabs
v2 keep them sparse and never longer than 3 s in total at one spot, and never use the bracketed
performance tags of ElevenLabs v3 (`[excited]`): v2 may read them aloud (creative-claw
cc-model-contracts-speech#31). Whether the fal route honours break tags is unverified: step 9's test
listens for them.

| Where | Pause |
|---|---|
| After the greeting | 0.5-1 s |
| Between sections | 1-1.5 s |
| Just before the key point | 0.5 s |
| A dramatic beat | 1.5-2 s |
| After a question | 1 s |
| Between list items | 0.5 s |

| Length | How it feels | Use |
|---|---|---|
| 0.3-0.5 s | a breath | between clauses |
| 0.5-1 s | natural | between sentences |
| 1-1.5 s | deliberate | between sections |
| 1.5-2 s | dramatic | before a reveal |
| over 2 s | awkward | rarely, on purpose |

Tags belong to the ElevenLabs v2 voice only. Strip them before any other route (route C's built-in
voice, another TTS model): one model's tags and settings stay with that model
(creative-claw creativeclawgeneratevoiceover-4c393d#27). `presenter.mjs` writes `spoken_text` without
tags for that.

## Spoken forms

The voice reads literally. Write numbers, acronyms, URLs and brand names the way they are said, while
titles, lower thirds and captions show the written form (hyperframes websitetohyperframes-c794ad#24).
Keep both in one script: the written form in the script file and a `say.json` map of written form to
spoken form (references/prompts.json row `say-map`), passed as `presenter.mjs script --say say.json`.
The map also carries pronunciation hints for invented words and for words spelled one way and said
two ways. Never write a hint in brackets inside the narration: the voice would read the bracket too.

## Speed

Default `speed` 1.0; a kit or brief may name another. The fal schema for
`fal-ai/elevenlabs/tts/multilingual-v2` takes **0.7 to 1.2** (media-audio-generation facts
`schema-ml2-turbo`, 2026-10-05), so HeyGen's faster settings do not exist here.

| Speed | Effect | When |
|---|---|---|
| 0.8-0.9 | slower, deliberate | complex topics, older audiences |
| 1.0 | normal | most content |
| 1.1-1.2 | a little faster | energetic content, younger audiences |

Send `speed` in one place only in the request (creative-claw cc-model-contracts-speech#34), and keep one
speed per presenter in the voice registry so every scene matches.

## Scenes

One scene = one narration file = one talking-head job. Split at section ends. Each scene's narration
must fit one TTS request: the figure on record for ElevenLabs v2 is 10,000 characters per request, from
another vendor's route (creative-claw cc-voice-references#55), so the live schema read in step 2 wins.
No maximum audio length per talking-head job is on record; this skill's Default is 45 s of speech per
scene (`--max-scene-s 45`; a kit or brief may name another, or the live schema's limit). When a route
refuses a long scene, split it at a sentence end and record the limit as a learning.

## Presenter photo

This section is for an image of an invented or non-human presenter (a mascot, an illustrated or
rendered figure); a photo of a real person is refused until SL8's consent text is approved (SKILL.md
step 2). A character image animates well when it is a JPEG or PNG, at least 512 × 512 px, under 10 MB, with one
clear face looking at the camera, even light, a neutral expression and a plain background. Side
profiles animate badly and full-body shots may not animate at all. `presenter.mjs photo` measures the
first three; you look at the rest.

## Presenter descriptors

A portrait made from a description takes eight descriptors, written into the `portrait` row of
`references/prompts.json`:

| Descriptor | Values the method lists | Default when not given |
|---|---|---|
| name | a label for the presenter | `presenter` |
| age | young adult, early middle age, late middle age, senior | early middle age |
| gender | woman, man | none: taken from the brief, else the voice's stated gender (step 5), else asked before the portrait is made (step 3) |
| ethnicity | as the brief states | none: left out of the prompt when not given |
| orientation | horizontal, vertical, square | from the target aspect (16:9, 9:16, 1:1) |
| pose | half body, close-up, full body | half body (`chest-up framing`) |
| style | realistic, cinematic, and other looks | realistic |
| appearance | clothing, expression, light, setting, in at most 1,000 characters | a plain business look |

For business content keep the look plain and studio-like: no seasonal or themed costume. The person is
invented: never describe or name a real person (HR17).

## Look checklist

Before any paid animation, the approved portrait passes all of these (step 4):
- the customer has seen it (a file path in chat, or the gate's file in a bot job);
- its look suits the content's tone (formal or casual);
- the voice chosen in step 5 has the presenter's gender, as the voice's source states it (the AVATAR
  record, the registry entry or the brief); no gender label is on record for the ElevenLabs preset
  names, so a voice whose gender nobody stated is never matched by guess;
- its orientation matches the target aspect, because the talking-head clip keeps the portrait's frame.
