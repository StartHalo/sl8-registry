---
name: marketing-brand-kit
description: >-
  Brand kit: captures, extracts or edits a brand as one saved kit (colours with roles, fonts with
  their files, logo variants, reference images, Markdown notes on audience, tone and visual
  direction), written merge-safe and read back, then applied to generation with the exact logo
  composited, never redrawn. Values come from the customer, their files or the official brand page
  read by a local headless browser; ambiguous values wait for the customer. Use when: set up my
  brand, create or edit a brand theme or style guide, pull the brand from a website, import a logo
  pack or fonts, make a logo transparent, or make a still, edit or series on brand from a kit. NOT
  for: a finished branded graphic (marketing-branded-graphic); free-prompt stills (media-image-generation); cutouts and
  composites in general (media-photo-editing); motion rules or animated brand titles
  (media-motion-graphics; motion rules not offered); product presets (image-product-presets);
  running ai-gen (media-ai-gen); file checks (media-qc).
license: Theme contract copied from Creative Claw 5.4.2 (Apache-2.0) with attribution; method and all other wording SL8's, restated from Creative Claw, HyperFrames (Apache-2.0) and fal agent skills (used with attribution) and cited
compatibility: "marketing-studio 1.0.0 (built FROM sl8-video 1.5.0, sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; node 22; Playwright on chrome-headless-shell 152; imagemagick 6.9; fontconfig (fc-scan); curl; fal endpoints as of 2026-10-20"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [creative-claw/cc-brand-theme, creative-claw/cc-mcp-tool-declarations, hyperframes/hyperframes-2afd9d, hyperframes/hyperframescli-e1e7eb, fal/brandedgraphics-96ba6e, fal/photoediting-ba8ff5, fal/fal-mcp-tools, fal/falmodelscatalog-4c46e7]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Creative Claw 5.4.2 installed 2026-10-25)
  approach: WF14-a1
  attribution: Method from the SL8 capability assessment (WF14-a1), after Creative Claw's brand themes workflow (Apache-2.0; its theme data contract is copied in references/theme-contract.md); rules restated from HyperFrames (Apache-2.0) and fal agent skills
  deltas: MKT-D340..MKT-D359
---

# Brand kit

One saved kit per brand: exact colours with roles, fonts with their files, logo variants, a few
reference images and notes, in one JSON file with stable local copies beside it. The kit is read
before every change and before every branded generation, written only with the contract's merge
rules, and checked after every write. Applying it means translating it into the prompt, passing
only the references that control the result, and placing the real logo file afterwards.

The method is Creative Claw's, written for its own theme store and generation tools. None of it has
run on this machine yet: treat the first kits and the first branded stills as a test.

```bash
KIT=$HOME/.agents/skills/marketing-brand-kit/scripts/kit.mjs        # new list show import font-meta validate merge verify contrast prompt delete
B=$HOME/.agents/skills/marketing-brand-kit/scripts/browser.mjs      # extract raster shot
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
```

The file format, roles, merge rules and folder layout are in
[references/theme-contract.md](references/theme-contract.md). Read it before the first write.

## What a request needs

- **A brand,** and at least one of: values typed by the customer (hex codes, font names), files
  (logo pack, font files, product photos, style references), direct URLs to them, or the brand's
  website. A company name alone is not a source: find the official site first (step 4).
- **For an edit:** the kit's name (the default kit when there is one and none is named) and the change.
- **To apply the kit:** what to make, and which references control palette, lighting or composition.

A bot job has no one to answer a question (HR12). Wherever this skill says "ask", an interactive
session sends one message; a bot job writes the question into the kit folder, saves only what is
certain, and its hand-off names what waits for the customer (HR15).

## Steps (approach step numbers in brackets)

1. **Pick the route** [1]. Record it in the job's notes, and never ask for a value the request
   already gives.
   - **Guided capture:** "set up my brand", "create a theme", "edit my theme" with no exact values
     and no site. The vendor's visual theme editor has no equivalent here, so values are collected
     in one closed form (step 3), not a long interview.
   - **Direct update:** the customer supplies exact values or names a narrow change: read, import,
     smallest patch, write, read back (steps 2, 6, 9-11).
   - **Extraction:** only a website or brand-kit page is given (step 4), or files and direct URLs
     when no browser can run (step 6).
   - A new kit: `node $KIT new --kit "<Brand>"` (names are unique, case-insensitive; the first kit
     on the machine becomes the default). It prints `project`, the folder name (`brand-acme-corp`): **`<kit>` in every
     path below is that `project` value without its `brand-` prefix** (`acme-corp`; `node $KIT list` shows `project`), not the display name.
   - In every job that will make a paid call, new kit or not: `node $S/manifest.mjs init --project brand-<kit>`
     (it is idempotent; a kit made by an earlier job may have no manifest, and `manifest.mjs add` fails without one).
2. **Read the kit before any change** [2]. `node $KIT list`, then `node $KIT show --kit <name>`:
   note its colours, fonts, logos and images, and keep the `sha256` it prints. `merge` refuses
   without it, and refuses again if the kit changed after you read it. The token ignores `assets[]`,
   so importing files (steps 6-8) after the read does not invalidate it; any other change does, and
   the refusal prints the sha the kit has now. Run `show` again right before the merge when in doubt.
3. **Capture the checklist** [3]. Every item is filled or listed under `missing[]` with a reason:
   - exact colours, each with one role (`primary`, `secondary`, `accent`, `bg`, `fg`, `muted`);
   - fonts: family, source (`google` or `custom`), role (`heading`, `body`, `mono`, `accent`) and,
     for custom fonts, the files. Request only the weights a family ships: a weight it does not ship
     (600 or 700 from a 400-only family) renders a fake, synthesised bold; `verify` lists the shipped weights;
   - logo variants (`light`, `dark`, `mono`, `color`), transparent where they will sit on imagery;
   - one to several reference images;
   - notes in Markdown: audience, mood, composition, lighting, materials, typography character,
     prohibited treatments, tone of voice, and do and don't.

   Interactive: one message listing the open items as closed choices with a recommendation each.
   Bot job: write `artifacts/brand-<kit>/capture.md` (the same list, with what is known filled in),
   save what is certain, and end the job naming the missing values.
4. **Extract from the site** [4]. Find the official brand, press or media kit page first (web
   search when no URL is given); fall back to the home page. Then:
   `node $B extract <url> --out artifacts/brand-<kit>/source/extracted/`. It saves the rendered
   `page.html`, every stylesheet the page loaded, cross-origin CDN and Google Fonts ones included
   (`css/`), every `@font-face` rule from them with its `unicode-range` (`font-face.css`), a
   `page.png` to look at, and `candidates.json`: colours from computed CSS in any colour space
   (oklch, lab, hsl, `rgb`/`hsl` triples in custom properties) converted to sRGB hex and flagged
   `converted from <space>`, with their contexts and custom-property names, the computed heading
   and body font stacks, logo, image and logo-pack download URLs. `network_idle_reached` says
   whether the page settled; a page that never idles is still read.
   - Assign roles by the rules in theme-contract.md: the default link blue and status colours are
     never the accent; an icon font is never heading or body; monospace goes to `mono`.
   - A family whose `@font-face` files are on `fonts.gstatic.com` is `source: google`: record it by
     name and copy no files (candidates.json flags it). Any other family with files is `custom`.
   - Colours come from computed CSS or the customer, never from a screenshot, the company's name or
     a generated image; a colour read off `page.png` is a guess and goes to step 5.
   - Exit 3 (no Playwright or no browser) or a site that will not load: use the customer's files or
     direct URLs instead (step 6), and say so in the hand-off.
5. **Confirm what is ambiguous before saving** [5]. Several candidate primaries, a font that could
   not be identified, a logo of uncertain variant, any guessed colour: never invent a brand value,
   and never save a guess as exact.
   - Interactive: one message with each item as a closed list, its evidence (context, count,
     custom-property name) and a recommendation; record the answer.
   - Bot job: put each item in the kit's `unconfirmed[]` (`item`, `candidates`, `evidence`,
     `recommended`), write `artifacts/brand-<kit>/confirm.md` with the same list, and save only the
     certain values. The next job merges the customer's answers and empties `unconfirmed[]`: confirming a colour is
     **one patch** that carries the full `colors` collection with the confirmed colour added and
     `unconfirmed` without that entry (a patch that adds the colour but leaves it listed is refused).
6. **Import stable copies** [6]. Logos, font files, product images and style references are copied
   into the kit, never hotlinked to a temporary, private or expiring URL:
   `node $KIT import <file-or-url> --kit <name> --name <brand>-logo-color --kind logo --tags <brand>,brand,logo,approved`.
   The name is unique in the kit (the script refuses a duplicate), and the row keeps the source URL.
   Name copied fonts by family, weight and style (`acme-sans-400-italic`) so two "Regular" files
   never collide. `import` looks at the bytes, not the URL: it names the copy by what it is, sends a
   plain browser user agent and the site as referer (`--referer <page>` to set it), and refuses an HTML
   page (hotlink protection, a bot challenge, a login) and a `.zip` pack: unzip a pack into `source/pack/`
   (`unzip -o <pack> -d artifacts/brand-<kit>/source/pack`) and import its members one by one.
   Google serves one font file per `unicode-range` subset for the same weight and style: import only the
   subset that covers the customer's language (normally `latin`), and list the others under `missing[]`
   with the reason `unicode-range subset not needed`. A file that cannot be downloaded goes under `missing[]` by name: never substitute
   a lookalike, and never call the kit complete.
**Before any paid call (steps 7, 8, 12, 13).** Quote it from its params file
(`ai-gen estimate <id> --params-file … --format json`), compare the quote with
`node $S/manifest.mjs budget --project brand-<kit>`, and run it only when it fits. Over the budget, or no
budget known: open a gate (`node $S/gate.mjs open …`) and end `partial` (HR5, HR12); do not run the call
and do not rely on `--max-cost` alone, which caps one call, not the job.

7. **Prepare the assets** [7]. Originals stay untouched in `source/`; prepared copies go to
   `prepared/` and are recorded with `import … --from source/<original>`. Keep light and dark logo
   variants as separate files.
   - **Transparent raster logo** (a PNG or JPEG logo with a background; an SVG needs none).
     Default: `fal-ai/bria/background/remove`; a kit or brief may name another. It takes
     `image_url`, which `ai-gen run --image` fills. Write `work/brand-<kit>/<logo>.params.json` as
     `{"sync_mode": false}` (do not set its optional `prompt`: it changes the cutout and raises the
     price). Quote it: `ai-gen estimate fal-ai/bria/background/remove --params-file work/brand-<kit>/<logo>.params.json --format json`
     (known result, facts `price-bria-remove`: 4.5 or 10 cr, so budget the higher; whether `estimate` accepts a params file without the required `image_url` is not yet shown, MKT-L344: if it rejects, add a placeholder `image_url` to the estimate params only), then
     `ai-gen run fal-ai/bria/background/remove --image artifacts/brand-<kit>/source/<logo>.png --params-file work/brand-<kit>/<logo>.params.json -o artifacts/brand-<kit>/prepared/ --queue --strict-params --max-cost <quote> --format json > work/brand-<kit>/<logo>.result.json`.
     Record it: `node $S/manifest.mjs add --project brand-<kit> --result work/brand-<kit>/<logo>.result.json --params work/brand-<kit>/<logo>.params.json --json '{"item":"<logo>-transparent","node":"prepared","declared":{"w":<source w>,"h":<source h>,"format":"png","alpha":true},"credits":{"estimate":<quote>},"parents":["source/<logo>.png"]}'`.
     Prove the alpha from the file itself, not a preview:
     `node $Q image <cutout> --w <source w> --h <source h> --alpha required --format png` (source
     resolution kept; PNG whenever transparency is involved). It fails or has no alpha: keep the
     original, leave `hasBackground: true`, and say the logo is not transparent.
   - **Custom font:** `node $KIT font-meta <file>` reads weight, style and format from the file
     (fc-scan plus the file's own signature, and the file's OS/2 table when fc-scan cannot read a WOFF2),
     never from its name. When it still cannot read the file, use the weight and style the page's own
     `@font-face` declared (candidates.json `font_faces[]`) with `--declared-weight N --declared-style S`;
     the result says "declared by the page, not read from the file", and the hand-off repeats it. With
     neither, do not guess: ask (interactive) or list it under `unconfirmed[]`.
8. **Enlarge a reference, only when it is too small** [8]. Optional; the original is never
   overwritten: the copy lands in `prepared/` under ai-gen's file name and is recorded as `<name>-upscaled`.
   Default: `fal-ai/topaz/upscale/image` with `model` `High Fidelity V2`, `face_enhancement` false,
   `upscale_factor` 2 and `output_format` png; default fallback `fal-ai/seedvr/upscale/image`; a kit
   or brief may name another. Run fidelity-first: never a generative tier (`Wonder`, `Redefine`)
   for a brand reference, which must be enlarged, not reinterpreted. Check the fields with
   `ai-gen info <id> --format json` and the raw OpenAPI (HR2), quote, run, record and measure as in
   step 7. ImageMagick resizing is not a substitute: it adds no detail.
9. **Build the smallest exact patch** [9], shaped by the contract in theme-contract.md: name only
   the keys you change; a `colors`, `fonts` or `logos` key carries the whole collection, and
   `images` the whole array in deliberate order (the first is the thumbnail). Current arrays and
   roles only, never a legacy free-form structure. `node $KIT validate --patch work/brand-<kit>/patch.json`.
10. **Write the kit** [10].
    `node $KIT merge --kit <name> --patch work/brand-<kit>/patch.json --expect-sha <sha>`, where `<sha>` is the one
    `show` printed (step 2), or a fresh `show` if the kit was edited since.
    It keeps `theme.json.bak`, refuses a patch that drops collection entries (add `--allow-remove`
    only when the customer asked for the removal), and applies `--override` (replace the whole kit)
    and `--set-default` only when the customer's request names them. Delete a kit only on the
    customer's explicit request: `node $KIT delete --kit <name> --by "<their words>"`.
11. **Read it back and verify** [11]. `node $KIT verify --kit <name>`: every path opens, every
    remote URL answers (a signed or temporary one fails), every role is in its vocabulary, and the
    missing and unconfirmed items are listed. Then compare each role with what the customer
    confirmed. `node $KIT contrast --kit <name>` reports fg-on-bg ratios against 4.5:1 (normal
    text) and 3:1 (large text, 24 px and up or 19 px bold): a warning for the customer, never a
    change to a brand colour. If a pair fails, say what would pass (lighter ink on a dark ground, darker
    ink on a light one) as a suggestion for the customer, and do not apply it (MKT-L353).
12. **Apply the kit to a generation** [12]. Re-read it first (`node $KIT show`, then
    `node $KIT prompt --kit <name>`, which prints the palette, type and notes block and the logos to
    composite, with paths relative to the job root, so you can pass them as printed). Then, in the job's own project (`artifacts/<project>/`):
    - Pick only the few references that control the result; more is not better. State in the
      prompt what each one controls (palette, lighting, composition) and which subject matter must
      not be copied from it. Translate the hex values with their roles and the notes into the
      prompt; the prompt goes in a params file, never on the command line. For a dark brand swap ground and ink
      (`bg` dark, `fg` light) rather than inverting the picture. End the prompt block with: "No logo, no
      brand name and no lettering anywhere in the picture; keep the <corner> area plain for the logo."
      After the call, view the output: a drawn mark or wordmark is redone with that line as the one lever (HR7).
    - Default model: the route media-image-generation's picks name for the request (HR22); a kit or
      brief may name another. Not a cheap draft endpoint for a branded final, unless the customer
      chooses one. Check its reference fields with `ai-gen info <id> --format json`.
    - A still from references: `ai-gen image -m <id> --ref <ref1> --ref <ref2> --params-file work/<project>/<item>.params.json -o artifacts/<project>/<node>/ --queue --strict-params --max-cost <quote> --format json`.
      `--ref` fills `image_urls` and uploads local files itself; on `ai-gen image`, `--image`
      always fills `image_url`, which models that take `image_urls` reject.
    - An edit of the customer's picture: `ai-gen run <edit-id> --image <base> …` when its schema
      takes `image_url`, `--ref <base>` when it takes `image_urls`. Keep the input resolution; PNG
      when transparency matters, otherwise the input's format (JPEG quality 95).
    - Quote each call (the gate above; `ai-gen estimate <id> --params-file …`) and compare the total with
      `node $S/manifest.mjs budget --project <project>`; over the budget, or no budget known, open
      a gate (`node $S/gate.mjs open …`) and end `partial` (HR5, HR12). Record every call with
      `manifest.mjs add` (HR9).
    - **Place the real logo afterwards;** never ask a model to draw it unless the customer asks
      for a reinterpretation (then say the logo is redrawn). Keep its shape, proportions and clear
      space. Fit it in a box, never past its own size.
      Default size and margin (SL8's, a kit or brief may set others): the box is 18% of the image width by 12% of its height, margin 4% of the width,
      bottom right; the corner comes from the brief. For a 9:16 story (height over 1.6 times the width)
      keep the bottom 20% free of the logo, because the platform's own interface sits there. Pick the
      variant by the corner's brightness: the kit's `dark` logo on a light corner, `light` on a dark one.
      ```bash
      convert <still> -auto-orient +repage work/<project>/base.png
      W=$(identify -format %w work/<project>/base.png); H=$(identify -format %h work/<project>/base.png)
      LW=$((W*18/100)); LH=$((H*12/100)); MX=$((W*4/100)); MY=$MX; [ $((H*10)) -gt $((W*16)) ] && MY=$((H*20/100))
      X=$((W-LW-MX)); Y=$((H-LH-MY))
      convert work/<project>/base.png -crop ${LW}x${LH}+$X+$Y +repage -colorspace Gray -format '%[fx:mean]' info:   # under 0.5: dark corner, use the light logo
      convert work/<project>/base.png \( <logo>.png -resize "${LW}x${LH}>" \) -gravity southeast -geometry +$MX+$MY -composite artifacts/<project>/final/<item>.png
      ```
      An SVG logo is rasterised intact first, at the box width: `node $B raster <logo>.svg --width $LW --out work/<project>/logo.png`
      (`--color <css>` when the SVG uses `currentColor`, or it comes out black); a tall or square mark
      is then shrunk into the box by the `>` resize above.
    - **HTML composition** (a banner or end card with the kit's fonts): write the page with each
      custom font as `@font-face` from the kit's files and Google families by name, place the logo
      file as it is (a complete SVG wordmark is never retyped in a font), and render with
      `node $B shot <page.html> --width <w> --height <h> --out artifacts/<project>/final/<item>.png`.
      Exit 1 names a font that did not load: list it as missing, never swap in a lookalike.
    - **Check before delivering.** View the output and write what you see: exact copy, logo
      fidelity against the source file, palette, legibility, cropping, safe areas (HR14). Measure
      it: `node $Q image <file> --format <png|jpeg>` with the declared size, or
      `node $Q declared --plan artifacts/<project>/manifest.json --file <file>` (HR1).
13. **Keep identity and style apart across a series** [13]. The kit is the art direction; a person
    or character's identity comes from their own reference image, passed first where the model
    supports it (there is no stored character id on this machine; HR17 applies to a real person).
    Save the kit's prompt block once and reuse it byte for byte, with the same reference order, in every shot:
    ```bash
    node $KIT prompt --kit <name> | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).prompt_block)' > work/<project>/brand-prefix.txt
    P=$(shasum -a 256 work/<project>/brand-prefix.txt | cut -d' ' -f1)
    ```
    Put the prefix first in each shot's prompt (in its params file) and record `"prefix_sha256":"$P"` and the
    ordered `"refs":["<identity>","<style>"]` in that shot's `manifest.mjs add --json`. A still shot:
    `ai-gen image -m <id> --ref <identity> --ref <style> --params-file …`. A video shot (`--ref` fills the
    schema's reference-images field; `--image` and `--first-frame` fill a start frame instead, so use them
    only when the model takes a start frame): `ai-gen video -m <id> --ref <identity> --ref <style> --params-file work/<project>/<shot>.params.json -o artifacts/<project>/<node>/ --queue --strict-params --max-cost <quote> --format json`
    (check the fields with `ai-gen info <id>`; the route is media-video-generation's). Before delivery, one
    line fails the series if any shot differs: `node -e 'const m=require("./artifacts/<project>/manifest.json");const r=m.assets.filter(x=>x.prefix_sha256);const k=x=>x.prefix_sha256+JSON.stringify(x.refs);process.exit(r.every(x=>k(x)===k(r[0]))?0:1)'`
    (the manifest's rows are `assets[]`); a shot that differs is redone. Measure each clip with `node $Q streams <clip>`.
14. **Hand off.** The kit's path, its default status, and the debt still owed on it (HR15): every
    `missing[]` and `unconfirmed[]` item, a logo left with its background, a contrast warning.
    Never claim a complete kit while either list has an entry.

## Failures and recoveries

- **A partial collection was sent:** `merge` refuses it; resend the full collection.
- **A partial images array:** send the whole array, thumbnail first.
- **A legacy free-form structure** (`palette`, `typography`): rewrite it with the current arrays.
- **The kit changed after it was read:** `merge` refuses and prints the sha the kit has now; run `show` again, rebuild the patch from it (step 2). An import does not trigger this.
- **A confirmed colour is refused as still unconfirmed:** send `colors` and `unconfirmed` in one patch (step 5).
- **An import refuses an HTML page or a zip:** the URL is protected or a pack; see step 6.
- **A private or expiring URL:** import a stable copy (step 6), or list it as missing.
- **Every reference in every generation:** pick the few that control the result (step 12).
- **A queued call timed out** (exit 10): it is already charged; fetch it with
  `ai-gen result <request-id> -o <the same folder> --format json` (the id is in
  `error.details.requestId`), never resubmit (HR6). One retry per item moves a named lever (HR7).

## Not on this machine

- **Motion rules, a standalone style prompt, and extraction from a video or a PDF guide** (the
  assessment's fallback method WF14-a2, a portable visual-style file) are **not offered on this
  machine yet**. Until then, mood and motion intent go into the kit's notes as Markdown, and a PDF
  guide's values are typed in by the customer or read by eye from its pages, then confirmed (step 5).
- **The vendor's visual theme editor and hosted theme store:** replaced by the closed form, the
  confirmation page and the local kit file. A kit is not shared between bots unless its folder is
  copied.

## House rules (HR-1.0)

Relies on: HR1 (prepared logos and branded outputs declared and measured with media-qc; alpha read
from the file), HR2, HR3, HR4 (`sync_mode` false on Bria; `face_enhancement` false and a fixed
`model` tier on Topaz), HR5 (every paid call quoted, the total checked against the budget), HR6,
HR7, HR8 (prepared copies in `prepared/`, outputs under `artifacts/<project>/`), HR9, HR10 (logos
composited last, never generated), HR11 (every prepared copy made from the original in `source/`),
HR12 (no question tool: capture.md, confirm.md and `unconfirmed[]` instead), HR13 (`kit.mjs
validate`, `merge`, `verify`; media-qc), HR14, HR15, HR16, HR17 (identity references in a series),
HR18 (notes and copy never invent claims), HR19 (read-before-write and full collections enforced
by the script, not by a warning), HR20 (a requested logo reinterpretation is the customer's call),
HR21 (no browser or font tool is installed at run time), HR22 — see media-ai-gen/references/house-rules.md.
