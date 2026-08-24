# Endpoint pairs — the craft of the two frames

The model is asked to find a path between two images. Everything that makes that easy or hard is
decided before a single credit is spent, in how the pair is drawn.

## The one rule

> **One variable per pair.** The two frames differ in the thing that is supposed to change, and
> in nothing else.

Same framing, same subject distance, same lens feel, same lighting direction, same background,
same palette. Every additional difference is a second morph competing for the same seconds, and
the model resolves competition by smearing.

R10's probe is the worked example: one door, closed then open, everything else held. It landed
on the target frame — and it also interpolated the wall colour, because the two source frames
happened to differ there too. That was a *bonus* on a 4-second clip with one subject. On a busy
frame it is the mechanism by which a morph turns to mush.

## What each frame is for

| frame | job |
|---|---|
| `NNa` (start) | the state the viewer arrives in. It gets the most screen time at full clarity. |
| `NNb` (end) | the state the scene exists to reach. **This is the money frame** — it is what the shot is remembered as, and it is what QC-15 grades. |

Draw the end frame first when the reveal is the point. It is easier to work backwards from the
image you want than to discover it by extending the start.

## Changes that interpolate well

Ordered roughly by reliability on the current engine:

1. **State change of a single object** — open/closed, on/off, empty/full, intact/broken.
2. **Reveal** — something occluded becomes visible; a light comes up; fog clears.
3. **Assembly / disassembly** — parts converge into a whole, or scatter.
4. **Material or seasonal change on a held composition** — frost melts, paint dries, leaves turn.
5. **Fill and drain** — liquid level, crowd density, progress bars in physical form.

## Changes that interpolate badly

Not forbidden — but expect a soft result, and say so before spending:

- **Large subject displacement.** A figure on the left in frame A and on the right in frame B
  gives the model a whole traverse to invent. Prefer a camera move, or split into two scenes.
- **Incompatible framing.** A wide in A and a close-up in B is a cut, not a morph. Cut it as two
  scenes and let assembly join them.
- **Identity swaps.** A becomes B where A and B are different characters. The model will average
  them through an uncanny middle. If a transformation is the point, keep one anchor trait fixed
  across both frames.
- **Count changes.** Three birds to seven birds — the intermediate counts are invented and
  usually wrong.
- **Text.** Any text differing between endpoints will mangle in the middle. Titles are post.

## Duration and the amount of change

The envelope is `≤10s @720p / ≤12s @480p`, but the *useful* duration is set by how much has to
happen, not by the ceiling:

- a single state change: **4–6s**. Longer, and the model pads with drift.
- a reveal with a camera move: **6–8s**.
- more than one thing changing: **it is two scenes.** Say so rather than buying a longer clip.

Reaching for the maximum duration to "get more" is the most common way to make an endpoint pair
look worse than a shorter one would have.

## The carry chain

`carry_end_forward: true` means scene N's end frame **is** scene N+1's start frame — the same
file, copied, byte-identical. Not "regenerated to match", which produces a lookalike and reads as
a jump on the cut.

The endpoint gate asserts this by hash, because it is invisible until assembly and expensive
after. When a chain is broken the fix is a file copy, not a re-render.

A chained sequence is how this workflow does continuity: A→B, B→C, C→D. Each scene is
independently capped and independently re-renderable, and the joins are exact by construction.

## Before you spend, ask three questions

1. **Could a viewer draw the in-between frames?** If you cannot describe roughly what second 3
   looks like, the model is inventing rather than interpolating — and you are gambling.
2. **Is exactly one thing different?** If not, is the second difference deliberate or an
   accident of how the frames were generated? Accidents are the usual cause.
3. **Is the end frame the one you actually want on screen?** It is the frame the scene is
   remembered as. Re-roll it at ~25× less than a clip.

## Prompt phrasing at the paid call

With both ends pinned, the prompt is the transition and only the transition. Naming the contents
again invites the model to re-interpret images it was already given.

```
GOOD  "the door swings inward, static locked-off camera"
GOOD  "slow push in as the frost melts from the glass"
BAD   "a green wooden door in a plain cream room, and it opens to reveal light"
BAD   "a beautiful cinematic transformation scene"
```

One motion clause, one camera clause. Negatives live once in the project's constraint suffix,
never inside the scene line.
