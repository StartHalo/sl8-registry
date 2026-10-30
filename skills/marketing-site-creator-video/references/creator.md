# Choosing the creator

How step 7 turns the intake into the three blanks of the `creator-still` row in
[prompts.json](prompts.json): `{person}`, `{wardrobe}` and `{scene}`. SL8 wording; it replaces the
vendor's separate creator guide, which is not carried (MKT-D405). None of it has run on our models.

## Contents

- [Person](#person)
- [Wardrobe](#wardrobe)
- [Variety numbers](#variety-numbers)

## Person

`{person}` is always one sentence with an explicit adult age: "a woman in her late twenties", "a man
in his mid thirties". Never "a woman", "a guy" or "a girl" alone: an unstated age can come out young.
Allowed ages are 25-45 unless the brief states another adult age; never below 21, and never age a
stated age up or down. Then add, in this order: build, hair (colour and length), one ordinary
feature (glasses, a beard, freckles), and an expression. The gender is the locked one from intake.
Skin tone and ethnicity come from the brief when it states them, otherwise from the audience the
site serves; do not default every creator to one look.

## Wardrobe

`{wardrobe}` is one everyday garment line from the site's category and tier. Plain, solid or
lightly textured, no logos or text on the clothes.

| Category (step 7) | Premium tier | Drugstore tier |
|---|---|---|
| tech (software, service, portfolio, content) | fitted crew-neck tee or overshirt, muted colour | plain hoodie or tee |
| beauty or personal care | soft knit top in a neutral | plain tank or tee |
| fashion | one simple layer in a colour that suits the product | plain tee |
| home or food | cosy sweater or casual shirt | plain tee |
| anything else | plain tee or casual shirt | plain tee |

## Variety numbers

Step 7 records eight fresh random numbers. Use them as tie-breakers, one per choice, so two jobs for
similar sites do not give the same person: 1 age within the band, 2 build, 3 hair colour, 4 hair
length or style, 5 the ordinary feature, 6 the garment colour, 7 the expression, 8 spare. Map a number
to the option at its position modulo the number of options you listed. The brief wins over any number.
