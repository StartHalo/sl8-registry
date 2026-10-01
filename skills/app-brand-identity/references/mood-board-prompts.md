# Mood boards with ai-gen

A mood board shows a direction's feel: colours, textures, light, kinds of imagery. It is not a
design and never contains a logo, the app's name or any text (image models misspell text, and a
board with words looks like a finished design).

## The budget

- One board per direction: the recommended one and at most two alternatives.
- At most 4 images per job: one per direction, and a second try only for the recommended one.
- Every call carries `--max-cost 40` (40 credits, $0.40; Nano Banana Pro estimates 38); if the
  estimate is over, skip that board. A job spends at most $1.60 on images.

## Steps

1. Pick the model once per job: `ai-gen info fal-ai/nano-banana-pro --format json`. If it isn't
   active, use `fal-ai/flux/dev`. Don't invent model ids; `ai-gen models --search <name>` lists
   real ones.
2. Write the prompt from the direction, in this order, 60–110 words:
   - "A brand mood board, a clean grid of 6 to 9 photographs and textures, no text, no letters,
     no logos."
   - the subjects (from the imagery rules: objects, moments, people as the rules describe them);
   - the light and the treatment;
   - the palette as colour names with hex values;
   - the mood words from Look and feel;
   - what to avoid: the category clichés from S1, by name.
   Keep the style clause the same for every board in the job, so the boards differ only in the
   direction.
3. Save every prompt, used or not, in `images/prompts.md` (direction, prompt, model, result), so
   the person or a designer can re-run it anywhere.
4. Generate:
   `ai-gen image "<prompt>" -m <model> --aspect-ratio 4:3 -o artifacts/<project>/images --max-cost 40 --format json`
   Read `files[].local_path`; rename the file to `images/<direction-slug>-board.png`.
5. Look at the image. For the recommended direction only, retry once with a tighter prompt if it
   shows text or letters, a logo, a cliché you named, or colours far from the palette. A failed
   board keeps its direction in words.
6. Record each board in `03-identity.md` under `## Mood boards`: the path, the direction, and one
   line on what it shows.

## When ai-gen isn't available

If `ai-gen` reports missing configuration, insufficient credits, a declined model or a cost
over the cap, write no images. Keep the prompts in `images/prompts.md`, keep the direction in
words, and add an open decision: "Mood boards weren't made this time; the prompts in
images/prompts.md can be run later." Don't explain the error to the person.
