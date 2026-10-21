# Lip-sync: defaults, quote and run

Loaded from SKILL.md's Lip-sync section, after consent (step 1) and the registry speech (step 2) are
settled. Prices and their dates are in [facts.md](facts.md); routes in [picks.md](picks.md); fabric's
fields in [endpoints.md](endpoints.md).

## 3. Declared defaults, not questions (HR12)

Write them into `plan.json` before the quote: face
source (the file), speech source (the registry role, or the supplied audio file), the case (talking
head, or re-dub), length (the speech's measured seconds), aspect (the portrait's own; fabric keeps
it) and the registry voice. Footage for a re-dub is probed (`ffprobe`) before any quote, because its
seconds are billed.

## 4. Quote per step, on the speech's seconds

These routes bill on input seconds, not output.
Quote the voice-over, then the lip-sync line on the speech file's measured length, rounded up to a
whole second (fabric billed 4.13 s of speech as 5 s, facts.md `measured-fabric-480p`), with a running
total: `ai-gen estimate veed/fabric-1.0 resolution=480p duration:=<ceil seconds> --format json`. Quote
`480p`, the measured tier: the estimate prices `720p` the same, but fal lists `720p` at almost twice
the rate and SL8 has not measured it, so a `720p` ask is quoted at fal's list (`price-fabric-720p`)
and named unmeasured at the gate.

## 5. Run

Local files go in with `ai-gen run veed/fabric-1.0 --image <portrait> --audio-file
<speech> --params-file p.json --queue` (`p.json`: `{"resolution": "480p"}`; all three fields are
required, and none is default-on). There is no default fallback: by default, if fabric refuses or fails, end the item
`partial` and say so. Known result: only `veed/fabric-1.0` has passed owner review for a talking head (VP-195); the candidate fallback `fal-ai/bytedance/omnihuman/v1.5` is unproven (estimate 200 cr for 5 s, not run) and `fal-ai/creatify/aurora` is unpriced (exit 12). A re-dub has no routed endpoint on this machine; stop at a gate that says so,
and offer the talking head from a still of the footage instead.

## fal's tips

fal's tips are fal's claims, not measured on SL8: a front-facing portrait, clean speech with no
music, and first takes under 10 seconds.
