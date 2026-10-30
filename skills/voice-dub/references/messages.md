# Messages to the customer

Wording adapted from HeyGen's heygen-translate 3.2.0 (MIT, heygen-com/skills) as the SL8 capability
assessment carries it (WF23-a1 adapted prompts), with HeyGen's engine terms replaced by what this
machine does. Reply in the customer's language; the commands stay in English. Fill the brackets;
never paste request ids, JSON or model names into a reply.

## Contents
- [How to talk](#how-to-talk)
- [Before anything is spent](#before-anything-is-spent)
- [Delivery](#delivery)
- [Failure decoder](#failure-decoder)

## How to talk

1. **Be concise.** Report the result (file, language), not the plumbing.
2. **No internal jargon.** Not "polling", "request id", "endpoint". Say "translating", "almost done",
   "your file".
3. **Waiting is silent.** Speak on a delivered language, on one stall note after more than 5 minutes,
   or on a hard failure.
4. **One result, one message**: per language, the file and a one-line summary.
5. **The customer's language** for every reply.

## Before anything is spent

**Questions, when a person is present** (at most two per message, never a form):
- *"What's the source video — a link or a file?"*
- *"Which language should I translate it into?"* (open question: no list of choices)
- *"How many distinct speakers are in the video?"* (any content with more than one person)
- *"Does the translated video need to be exactly the same length as the original, or can it be
  slightly longer or shorter? Allowing flexibility usually sounds more natural."*
- *"Any product names, company names, or jargon I should keep in the original language?"*
- *"Want to review and edit the subtitles before the final render? It adds a review round but lets
  you fix any wrong terms."*
- Consent: *"Before I copy anyone's voice or re-sync their lips: is every person who speaks or
  appears you, or do you have their written permission? Tell me which, and whose."*

**Cost quote (batches, and any job over the budget):** *"That's [N] languages × [M] minutes =
~[N×M] minutes of dubbing, about [credits] credits [with lip re-sync / audio only]. Sound good?"* Quote
credits from `ai-gen estimate`, never dollars, and no render time: none is measured on this machine.

**First-time customers** (they ask which languages exist, do not know lip-sync from audio-only, or
the project has no earlier dub): *"Want to try a 30–60 second test clip first? It shows the voice,
the lip-sync and any source problems before the whole video."* Billing is per started minute, so a
test clip costs one minute per language and model.

**Source-quality disclaimer** (send NOW, never after a bad result): *"Heads up — the source video
has [muffled audio / dim lighting / fast cuts / heavy music]. The dub can't improve on the source, so
it may inherit some of that. Want to proceed, fix the source first, or test with a short clip?"*

**Lip-sync ceiling:** *"Heads up — the source has [profile shots / fast cuts / a small face], so
lip-sync won't be as tight as on a steady talking head. Proceed anyway, or switch to an audio-only
translation?"*

**Burned-in source captions:** *"Your source has subtitles burned in already. Those will stay in the
dubbed video. Want me to skip new captions to avoid two layers, or do you have a clean source without
subtitles?"*

**No music-and-effects stem** (music or noisy source): *"The dub replaces the speech; the original
music bed can't be separated from it here, so the dubbed video will have the new voice without the
original music unless you send me a music-and-effects track."*

**Region on the standard path:** *"Note: the quick route dubs one standard [Spanish]; the
[Mexico] wording and accent need the subtitle-review route."*

## Delivery

One message per finished language, as each one lands:

> ✅ Spanish (Spain) — artifacts/[project]/final_es/[title]_es.mp4
> 1m 47s, lips re-synced, captions on.

Then, where they apply, one short line each: a flipped caption default; the default language mapping
used ("Spanish" taken as Spain); "the original music bed is not in this version"; "audio only: this
gives you a translated audio track. Lay it over the original video in your editor, or use it on its
own." (never offered as a fix for bad lip-sync); "sidecar subtitles: [file].srt". A failed language
gets one short cause line; no retry menu unless asked.

## Failure decoder

| Symptom | Likely cause | Next action |
|---|---|---|
| The link cannot be fetched | Needs a login, is a web page, or has the wrong type | Ask for a public direct link or the file itself |
| No audible speech, or the dub fails at the audio step | Silent, music-only or animation source | Dubbing is the wrong tool for it: say so |
| Wrong or swapped voices | The speaker count was wrong | Correct the count and dub again (a new quote), or take the subtitle-review route |
| Lips good on some shots, bad on others | Source face conditions (profile, cuts, occlusion) | Accept it, re-edit the source with cleaner shots, or deliver audio only |
| RTL captions collide with graphics | Burned captions over source lower-thirds | Deliver a sidecar SRT instead |
| A model or gateway error | Provider side | `ai-gen doctor`, `ffprobe` the source, then report the model's message as provider-side |
| Still running after 60 minutes | Provider queue | Say it may still finish and is already billed; fetch it later; never submit it again without a new quote |
