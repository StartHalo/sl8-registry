# Script craft for story-faceless-long

## Contents
- [What the script is for](#what-the-script-is-for)
- [Through-line](#through-line)
- [Research](#research)
- [The arc in N blocks](#the-arc-in-n-blocks)
- [Narration lines](#narration-lines)
- [Shots](#shots)
- [Kids explainer skeleton](#kids-explainer-skeleton)
- [Fairy Tale & Myth tone](#fairy-tale--myth-tone)
- [Rewrite pass](#rewrite-pass)
- [What the validator checks](#what-the-validator-checks)

SL8 wording; the method is WF53-a1 in the capability assessment (sl8-resesarch@559a1305),
restated from Higgsfield's faceless-video script reference and cited by research id. Example lines
are SL8's own (`references/prompts.json`).

## What the script is for

A faceless script fails when it is a list: fact, fact, fact. Facts are the material; the shape is
the product. Every block carries one idea, every block escalates, and the last block pays off the
first (higgsfield/faceless-intake-script#43, #47).

## Through-line

Pick one physical object that appears in every block and changes in one direction as the story
goes: fuller, taller, shorter, closer (a fuse burning down, a pile growing until it blocks a door,
a map filling with dots). It gets its own prop asset so it never morphs, its id sits in every
block's `assets_used`, each block's `through_line_state` says how it has changed, and the payoff
resolves it. An object that only recurs as decoration is not a through-line
(higgsfield/facelessvideo-103c40#59; higgsfield/faceless-intake-script#44).

## Research

Factual channels (Explainer, History, documentary length) research to a target before writing:
the hook figure, 3-5 concrete details (documentary length 4-6 per chapter), and the
counter-intuitive turn. Every spoken number is checked against a second independent source, and
`sources` lists full links (`https://…`), never bare labels. Fantasy and Kids topics skip research
but invent nothing false about the real world (higgsfield/facelessvideo-103c40#60;
higgsfield/faceless-intake-script#48; HR18).

## The arc in N blocks

- **Hook (block 1).** Opens on a line of eight words or fewer; History and Explainer never greet.
  Understatement makes a big number bigger; a direct question is a legal hook, but its answer waits
  for the payoff (`hook-example`; higgsfield/facelessvideo-103c40#62; higgsfield/faceless-intake-script#45).
- **Early stakes.** Soon after the hook: the misconception ("everyone blames X; they are wrong") or
  the reason it touches the viewer this week (higgsfield/faceless-intake-script#46).
- **Build.** One idea per block, each one raising the stakes. Reorder test: if the build blocks
  could be shuffled without loss, you listed instead of escalating; rewrite.
- **Turn.** Changes what the viewer believed two blocks ago; it surprises, it does not summarise.
- **Payoff (last block).** Reframes the hook and resolves the through-line.

## Narration lines

- 20-23 words per full 10 s block (Kids 17-21; dialogue blocks 16-22 across the speakers). These
  are English Defaults for the vendor's voice: the facts rows put multilingual-v2 near 3.0 words a
  second, so the first take wave calibrates the band (`takes.py rate`, SKILL.md step 7) and the
  measured band replaces this one for the run. At most two sentences.
- Delivery does not pace the voice model: word count is the only length lever. Prefer one flowing
  clause to clipped sentences, because every full stop and comma adds a pause (about 0.7 s at a
  full stop, 0.5 s at a comma) (higgsfield/faceless-intake-script#49).
- Spoken words only in `vo_line`: no brackets, no timecodes. On multilingual-v2 the line is sent
  exactly as written (that model has no direction or tag syntax and would read them aloud); mood
  lives in word choice, the preset and the `stability`/`style` fields.
- Numbers as words; no filler (you know, I mean, sort of, kinda, basically, um, uh); no five-word
  phrase shared with another block.
- Mood and intonation come from the words, never from another voice.

## Shots

- Each shot opens with its framing size and angle (WIDE, MEDIUM, CLOSE-UP, EXTREME CLOSE-UP,
  OVERHEAD …), and two adjacent shots never share a size.
- Only the first block in a new location may open on an establishing wide; a visited location is
  never re-established. About 20 seconds (two blocks) per location or distance, then move; never
  park the character back in the opening wide (higgsfield/facelessvideo-103c40#35).
- Over-the-shoulder only over a named character who is in the shot; otherwise the model invents a
  person (higgsfield/facelessvideo-103c40#34).
- Show what the line names: if the line says spices, the spices are on screen. No action motif
  twice in a row (higgsfield/faceless-intake-script#51).
- Beats are pure choreography, with no style or color words: "A, then B, then C, staggered", landing
  verbs, one camera behaviour per shot, one impact beat (a slam, a stamp, a snap, a whip-pan hit)
  echoed in the AUDIO line, and a settled last shot (higgsfield/faceless-intake-script#38, #39).
- No eight-word shot description repeats anywhere in the video; no two nearby blocks use the same
  location with the same references in the same order.

## Kids explainer skeleton

- The question is answered in the first sentence; no wind-up and no "today we are going to learn".
- Middle blocks follow the order a child asks in: what it is, where it is, what it does, what
  happens without it; never two ideas in one block.
- Say what a thing does before what it is called, name it once, compare it with everyday objects;
  no decimals, ranges or dates.
- Every block shows a change with a before and an after; the four-cut pattern stages one action, not
  four angles of a still moment.
- The last block lands one surprising quantity in words, then a 4-5-word callback that answers the
  opening question again.
- The test before SCRIPT LOCK: read only the first sentence of every block, in order; together they
  must answer the opening question, or rewrite (do not patch)
  (higgsfield/faceless-style-library#13-#18).
- Interplay with the narrator, direct address and call-and-response: `kids-interplay`,
  `kids-call-examples`.

## Fairy Tale & Myth tone

A hushed, mythic storyteller; no jokes and none of History's dry wit; the cold open is still eight
words or fewer. Book-spread inserts only at the opening, a chapter turn and the closing moral, with
faint, unreadable decorative script (higgsfield/faceless-style-library#54, #56).

## Rewrite pass

Run `rewrite-pass` (eight questions) before the validator and before any voice is made. A line that
fails is rewritten, not patched with a filler word.

## What the validator checks

`faceless_script.py validate` blocks every later step until it passes: the exact block count
(ceil(duration / 10)); the word band per block; at most two sentences; no digits, brackets,
timecodes or filler; no long word repeated within six words; the eight-word cold open for
education and history; no shared five-word phrase across lines and no shared eight-word run across
shots; five shots (Kids four; one fewer for a block listed in `--fewer-cuts`), each opening with a
size, adjacent sizes different; no re-establishing; the over-the-shoulder rule when the manifest
has an `assets` roster; 1-7 references with the through-line in each; at most two consecutive
blocks per location; no repeat of location plus ordered references within three blocks; the
through-line and arc fields; full-link sources; the talking-characters flag, alternation, bands
and speaker count. It then writes `script.lock` (a hash of the spoken words, the block count and
the duration), which the assembler checks.
