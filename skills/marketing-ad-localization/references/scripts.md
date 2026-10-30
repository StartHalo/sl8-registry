# Writing systems: copy, proof sheets and checks

SL8 wording; rules from JuicyLucy static-image-craft (proprietary, restated) and Creative Claw's
model guides (Apache-2.0), cited in the register.

## Every script

- Shape text through a real engine: Pillow with libraqm (HarfBuzz and FriBiDi). Check it once per
  session: `python3 -c "from PIL import features; print(features.check('raqm'))"`. `False` means a
  complex script cannot be drawn truthfully: no proof sheet and no Track A for it; say so.
- Brand tokens and numbers stay in Latin letters, drawn by the same font's Latin glyphs; never
  change font in the middle of a line.
- Find a font that covers every letter before using it:
  `fc-list ':lang=<xx>' family file` (for example `:lang=hi`, `:lang=kk`, `:lang=ar`,
  `:lang=zh-cn`, `:lang=zh-tw`); Noto families come from the fonts-noto pack.
- Render one locale per image so length and direction can rebalance.
- Generated letters are never trusted unchecked: read non-Latin text one character at a time at
  100%, and give prices, legal lines and numbers the same care.
- OCR is a lead: engines are weakest exactly where shaping is hardest.

## Devanagari (Hindi and others)

- Needs shaping for conjunct clusters, the short-i vowel sign that is drawn before its consonant,
  stacked vowel signs above and below, the nukta dot and chandrabindu.
- The top bar must run unbroken across each word; a broken bar is the sign of an unshaped
  renderer.
- Line height about 1.3 to 1.4 times the size; check the top bar and the hanging signs are never
  clipped.
- Fonts: Noto Sans Devanagari for headlines, Noto Serif Devanagari for serif body. Noto has no
  condensed Devanagari: stand in for a heavy condensed source with the heaviest weight installed
  (900 where present) and note the substitution in the ledger.
- Copy in everyday spoken register; common loanwords are fine in ads; avoid notice-board formality.

## Cyrillic, including Kazakh

- Kazakh ad copy is Cyrillic. Test its nine extra letters ә ғ қ ң ө ұ ү һ і in the chosen font:
  a font that covers Russian may lack them.
- Seeing Cyrillic in OCR is not evidence of leftover source text when the target is Cyrillic;
  tell languages apart by meaning.

## Chinese, Japanese, Korean

- No spaces between words: wrap by character.
- Keep the full-width ellipsis (……); it must not become Latin dots.
- Simplified or Traditional is a market choice (`languages.json`), and the font must match it.

## Right to left (Arabic, Hebrew)

- Direction flips text, alignment and wrapping: an approved left-to-right layout proves nothing.
  Re-check margins, alignment and reading order on every ad.
- Run right-to-left languages as their own lane, never mixed silently into a left-to-right batch,
  and use the right-to-left sentence of the render prompt.

## Proof sheet (step 7)

Write the locked strings to `qa/<code>/proof-copy.json` (`{"headline":…, "body":…, "cta":…,
"protected_tokens":[…]}`), then
`python3 $L/loc.py proof --copy qa/<code>/proof-copy.json --font <file> --out qa/<code>/proof-sheet.png [--rtl]`
and look at it. It is also the reference for judging the model's lettering later.

## Layout rules for the copy (step 6)

- Text on a person or a shaped surface: one centred, symmetrical column; every paragraph centred;
  even line widths and comfortable side margins; three levels (bold headline, smaller body, bold
  closing line); never a narrow body floating off-centre under a wide headline.
- Faces are protected: no sign, card, panel, headline, sticker, product or ornament may cover eyes,
  mouth or an expression that matters. Keep a visible gap between a held sign and the head. Longer
  copy makes the sign wider and shorter, or the copy shorter, never taller toward the face. Check
  this per language: copy length differs.
- Sparse landscape posters: three centred zones (the pain-led headline upper middle, a
  problem-to-solution line near the horizon, a bold relief line or neutral call to action below),
  separated by open space; no dense text over mountains, vehicles or people; use less copy than the
  space invites.
- Shorten the copy before shrinking the type.
