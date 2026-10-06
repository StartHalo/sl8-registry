# Burn and deliver: stage 8 and the stage-10 record

Read the first part before stage 8 and the second before stage 10. Overlays are designed and burned
by `media-motion-graphics`, the one overlay mechanism on this machine; this file holds what the
pipeline owns around it: ordering, what an overlay row is, the clearance check, captions, and the
figures the delivery states.

## Contents
- [Stage 8 — Burn the on-screen text, last](#stage-8--burn-the-on-screen-text-last)
- [8b. Captions of the voiceover](#8b-captions-of-the-voiceover)
- [Stage 10 — The delivery record](#stage-10--the-delivery-record)

## Stage 8 — Burn the on-screen text, last

Run only after every re-rendering step is complete. Extend, reframe, restyle,
upscale and re-concatenation all redraw pixels, and burned text does not survive
them.

Drive it from the plan's `overlay` column, not from memory of the brief. For
each row with an `overlay`, burn it over that window.

**An overlay is text *or* an image, and the image is the one that gets forgotten.**
A run burned the wordmark as type and **never placed the logo file at all**, because
the column was called `text` and a logo is not text — so nothing in the plan
could hold it and nothing noticed it was missing. If the user supplied a logo, a
badge, a QR code or any other asset, it is an overlay row with a file path, and it
is checked at the end of this stage exactly like a string is.

**Then check the overlay does not land on the subject.** The same run put the logo
and the end-card type on top of the man standing on the mountain, which passed every
check because every check asked whether the text was *present*, not whether it was
*legible against what is behind it*. Before burning:

1. Sample the frame at the middle of the overlay's window.
2. Measure the region the overlay will occupy — busyness and contrast against the
   overlay's own colour.
3. If the region is not clear, **fix the picture, not the text**: reframe or scale
   the underlying shot to move the subject out of the overlay's area, the way that
   run finally did with a ~1.25× zoom and a horizontal shift. Moving the overlay
   instead is the second choice, because a lockup that wanders between ads is a
   brand problem.

A reframe here re-renders pixels, so it happens **before** the burn, never after —
which is the same ordering trap as stage 8 itself, one level down.

**Set the type to a system, not by eye.** An overlay drawn with default font sizes
and a guessed position looks exactly like what it is, and "the end card looks
plain" is the result. `media-motion-graphics` carries the system this stage needs: read
`$HOME/.agents/skills/media-motion-graphics/SKILL.md` and apply its Steps 1–6 to every `overlay`
row — unit grid, font ladder from the machine's fonts pack, plate, colour, safe areas, motion and
timing — and print its Step 6 lines. A logo gets clearspace, not a guess: honour the brand's own
lockup rules (clearspace and minimum width) when the brief supplies them, and if the frame cannot
give the mark its clearspace, the mark is too big for the frame. If it will not load, the minimum
is cap height as a share of the short edge (an eyebrow at 2.5–3.5%, a title at 9–16%) and a stroke
of `max(2, round(0.05 × cap_px))`; say the type was set without the full system.

**Then do the burn in the sandbox, with PIL and ffmpeg**, by media-motion-graphics' Step 4:
full-frame RGBA sequences, every overlay in one encode (HR10). Record the burn as a manifest row
with `tool` and its parents.

**Never deliver a cut with an unburned `overlay` row silently** — that includes an
image asset as much as a string, since the logo is the one that went missing. If it truly
cannot be burned, it is an undelivered part of the request; say which strings are
missing.

## 8b. Captions of the voiceover

Captions of the *voiceover*, if the user asked for captions as well, are a separate, optional
deliverable, and they belong beside the lower-thirds rather than instead of them. The strings are
the script's fragments; the timings are words measured on the stage-7 mix (demux and transcribe as
stage 9 does, after the pre-spend steps in SKILL.md), never estimated from a script and never
guessed from duration. They burn as media-motion-graphics' caption block in the same single encode
as the lower-thirds. With no measured timings, skip captions and say so.

## Stage 10 — The delivery record

After the stems, state, in one short block:

- Runtime, shape, and the route each clip used.
- **Per clip:** its motion figure, the floor, and the frozen control — so a reader
  can tell a measurement from an opinion.
- **Largest silence measured at stage 9**, with its timestamp, and speech coverage
  beside it — the two are read together or not at all.
- Per-fragment placement: each fragment's measured first word against its
  `vo_start`.
- Mix: the **measured speech-to-bed separation in LUFS** against the 9 LUFS floor,
  the **bed's duck depth against the 12 dB cap** (the music dipped, it did not
  stop), and the final programme loudness. A duck setting is not evidence the
  duck worked.
- Overlays: each string, that the vision pass read it back, **each image asset and
  where it was placed**, and the clearance check on the region behind it.
- **Timing honesty:** each shot's `dur` against its `render_dur`, and which end any
  trim came from. A cut that lands at 30s by trimming is fine; one that lands there
  silently is not.
- **Look continuity:** the `look` of each shot in order, so a broken ramp is visible
  in the record rather than only on screen.
- **Native clip audio:** kept as a stem, or discarded — and if discarded, that
  recovering it later means re-rendering every shot.
- Total cost in credits, from the manifest, and the count of reshoots.

Anything the user chose that weakened a check — waiving the fence, accepting a
flagged-static clip, shipping without music, accepting a coverage figure under the
floor — is named here once, without argument. They made the call; the record shows
it (the manifest's `waivers`).
