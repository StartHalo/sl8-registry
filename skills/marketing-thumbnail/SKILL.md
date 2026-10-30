---
name: marketing-thumbnail
description: >-
  Video thumbnail or cover: one finished image, or a set of variants, that sells a video at feed
  size. A concept from 16 frameworks, an eleven-block house prompt that locks each character
  image, one Nano Banana Pro render per variant, a check at full size and at 120 px, surgical
  tweaks, and the headline baked last by a local headless-Chromium script, never drawn by the
  model. Use when: make a YouTube thumbnail or video cover, a set of thumbnail variants with
  different expressions or takes, a split, before-after or versus thumbnail, put a character or a
  logo on a thumbnail, add a bold headline to a render, tweak a finished thumbnail, a cover
  handed over by a video skill, or a thumbnail from a real frame. NOT for: a branded graphic or
  poster with copy (marketing-branded-graphic); saving a brand (marketing-brand-kit); free-prompt
  stills (media-image-generation); cutouts and retouching (media-photo-editing); character
  sheets (media-character-sheet); running ai-gen (media-ai-gen); file checks (media-qc).
license: SL8 wording and SL8-authored scripts; method from Higgsfield's thumbnail skill (no licence stated), restated and cited
compatibility: "marketing-studio 1.0.0 (built FROM sl8-video 1.5.0, sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; node 22; Playwright on chrome-headless-shell 152; imagemagick 6.9; ffmpeg 5.1; fontconfig with the fonts 1.1.0 (Anton, Inter) and fonts-noto packs; fal endpoint facts as of 2026-10-05"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [higgsfield/thumbnailgeneration-e3191f, kling/klingaigenerateimage-572826, fal/characterdesign-c8e4b8, fal/charactersheet-a2ae87, openart/openart-model-schemas, higgsfield/faceless-generation-delivery]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27)
  approach: WF13-a2
  attribution: Method from the SL8 capability assessment (WF13-a2), restated in SL8 wording from Higgsfield's thumbnail skill, with points from Kling (MIT), fal agent skills (used with attribution) and OpenArt; scripts written by SL8 from the recorded behaviour
  deltas: MKT-D420..MKT-D439
---

# Thumbnail

A thumbnail has one job: read in under a second at feed size. This method picks a concept that
opens an information gap, writes one prompt per variant from a fixed block library
(`references/library.json`), renders each variant once, looks at it full size and at 120 px wide,
and adds any headline last with a deterministic bake. Exact text and the logo never pass through
a model unless the customer explicitly orders it (HR10).

The library is SL8's restatement of a vendor method written for the same model family on another
host. Neither the wording nor the defaults below have been run on this machine: treat the first
renders as a test, and start a new customer at one variant before a set.

```bash
T=$HOME/.agents/skills/marketing-thumbnail/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
node $T/thumb.mjs assemble --brief work/<p>/brief.json --variants work/<p>/variants.json --dir work/<p>
node $T/thumb.mjs check    --brief work/<p>/brief.json --variants work/<p>/variants.json --dir work/<p>
node $T/bake_headline.mjs bake --image <render> --text-file work/<p>/headline.txt --out <png> [--style …] [--position …]
```

## What a request needs, and the defaults

Precedence: what the customer says beats a field read from a style reference, which beats a
default. Each default is the approach's choice; a kit or brief may name another.

| Field | Default |
|---|---|
| Ratio | 16:9 (also 9:16, 4:3, 3:4, 1:1; 4:5 only on Nano Banana Pro) |
| Render | Default: `fal-ai/nano-banana-pro` (no references) or `fal-ai/nano-banana-pro/edit` (references), resolution 4K, one image per call (untested against 2K; trial queued, MKT-L421) |
| Variants | one; a set is emotions x takes, at most 16, each its own call |
| Expression | shock when a person is in frame; a count without names follows the ladder shock, hype, rage, awe, laugh, fear, smug, charisma, confusion, determination, disgust |
| Take | 1 (the designed framing); takes 2-4 each add one ALTERNATE TAKE line |
| Text in the render | none: the no-lettering line goes in every prompt |
| Headline | baked by `bake_headline.mjs`, style beast, Anton, upper case, position by eye |
| Logo | composited locally after the render (HR10); in-render 2D or 3D only on an explicit ask |
| Tweaks | Default: `fal-ai/nano-banana-pro/edit` at 2K |

Inputs are files and stated choices: a scene or topic, 0-3 character images, a style
reference thumbnail, a logo (a marketing-brand-kit kit may supply the logo and a headline font),
the headline, the ratio, the expressions, the count, or a video for a real frame. Prompts are in
English; a headline stays word for word in the customer's language.

## Steps (approach step numbers in brackets)

1. **Activation** [1]. Run only when the output is a finished thumbnail or cover, or a revision of
   one. A readability opinion, a comparison of concepts or title ideas stay a text answer, and the
   word "cover" inside some other request does not start this method. Start the project once
   (`node $S/manifest.mjs init --project <p>`) and copy every customer file to
   `artifacts/<p>/source/` (HR11).
2. **Intake into one file** [2]. Write `work/<p>/brief.json`: `ratio`, `resolution`, `scene`,
   `characters` (`{ref, kind: "character", look}` in CHARACTER order; `look` is `photo` for a generated or photographic person and `illustrated` for a mascot, cartoon or 3D character, which also needs `medium`), `people` (text-described), `key_elements`,
   `logo` (`file`, `mode` composite, 2d or 3d), `location`, `composition` and `background` (null
   takes the library default), `rim` (a palette key or a phrase), `text`, `split`, `medium`,
   `style_reference`. Every key, its values and its default are in `references/brief-schema.md`. Every later step and every revision reads this file. KEY ELEMENTS default:
   the topic's most concrete thing you can picture, oversized and flying at the lens (row
   `key-elements-default`), or `"none"` when it would repeat the subject.
3. **Concept** [3]. Read the 16 frameworks and the ten rules (rows `fw-01`..`fw-16`,
   `ten-rules`). Write at least five concept options, each opening an information gap; carry the
   strongest into the brief (the options and the pick go to `work/<p>/concept.md`, listed in the delivery), combining two frameworks only when that deepens the gap without
   clutter. Frameworks 1, 5 and 12 are the default path; the others are made with the existing
   blocks, never a second renderer. Exaggerate, never misrepresent the video. A specific day
   comes from the last fifth or so of the story. Graphical (8) sets `medium` to a clean diagram,
   which drops the photoreal and lighting blocks. Compelling Screenshot (4) is not a generation:
   go to the real-frame route below. Product (11): the source's "Angle Lock" is not defined, so it
   is not offered on this machine yet; keep the product's own label as it is.
4. **Text gate** [4]. Default: a clean render with the no-lettering line. Text goes into the
   render (`text.mode` headline or baked-ui) only when the customer explicitly asks for it or names
   a text framework (2, 7, 10, 15); an auto-picked text framework renders clean, and text intent is
   never read from the topic. In-render text is an HR10 waiver: record it
   (`node $S/manifest.mjs waive --project <p> --rule HR10 --instruction "<the ask>"`). Baked UI
   stays brand-generic, short and true (HR18: no invented ratings, reviews or figures).
5. **Hand-off from a calling skill** [5]. A video skill may pass locked values (style key, a 3-6
   word hook, the render medium, a people choice, one variant). Read them from the calling run's
   own manifest, never from memory of another run, write them into `brief.json`, and do not
   reopen intake: one 16:9 image. A non-photographic medium sets `medium`, which swaps block 1 for
   the medium contract, drops blocks 10 and 11, and keeps characters in their own design. Default
   for the hook (HR10): a clean render, then the bake with `--case preserve` so the hook stays
   exact; rendering the hook in the image ("provider-first", the approach's handoff default) only on
   the customer's explicit instruction, recorded as an HR10 waiver (MKT-D427, MKT-L423); if that rendered hook differs from the ordered
   string by any character, make one clean render of the same concept and bake the hook with
   `--case preserve`. A cover that still fails after its retries
   returns a one-line failure note to the caller and never holds the video.
6. **Character default** [6]. **A real person's face is refused on this machine for now.** A face
   photo of a real person (the requester, staff, anyone named) needs SL8's consent text and privacy
   note, which are not yet approved (owner decision pending, learnings MKT-L412 and MKT-L434). Until
   then it is not used, uploaded or described into a prompt, and no real person is rendered from a
   name (HR17). A supplied character image (illustrated, 3D, or a generated person who is no real
   individual) is always a reference and gets its lock; mark it `"kind": "character"` in
   `brief.characters`, and `thumb.mjs` refuses any other kind. Also set `look`: `illustrated` (with
   `brief.medium` set to the character's own medium) gives it the design lock, so a mascot or 3D
   character is never turned into a photographic face; `photo` gives the identity lock. `thumb.mjs`
   stops when `look` is missing or an illustrated character has no medium. A concept with a person but no
   character image and no explicit "generated person", or a refused real-face photo: proceed
   people-free (a
   subject-only framework: landscape, product, graphical, map), record it
   (`node $S/gate.mjs open --project <p> --slug people --kind text --default people-free --question "<row character-note>" --options '[{"id":"people-free","label":"no people"},{"id":"character","label":"send a character image"},{"id":"generated","label":"a generated person"}]' --resume-at 6`)
   and put the `character-note` row in the delivery. A generated person is described in prose
   (`people`). Never a stranger in place of a supplied character. No question tool (HR12).
7. **Variant plan** [7]. Write `work/<p>/variants.json`, a list of `{n, emotion | custom, take}`;
   pairs must differ, at most 16. A custom phrase replaces the preset word for word; charisma is
   the calm positive choice, since determination alone reads harsh. A set without names: the
   ladder in order. With no people, variants are takes only.
8. **Style reference** [8]. Default Match; "match" or "inspired by" is already the answer, and an
   explicit "unique" asks for a fresh take. Analyse the reference with your own eyes (row
   `reference-analysis`) into `work/<p>/reference.json` and fold its fields into the brief,
   following how it frames its shot (row `reference-derive`). Its subject becomes the pose of
   the supplied characters and never adds a person; a real person in it is never reproduced
   (step 6). Its `emotion_detail` sentence goes in `brief.emotion_detail` and is appended only to a
   variant that sets `keep_reference_emotion: true`. The reference file never goes to a model: `thumb.mjs check` fails if it is among the
   refs.
9. **Stage the references** [9]. Character images first, in CHARACTER order, then an in-render logo; style
   references never. `--ref` maps them to `image_urls` (the `--image` flag would set `image_url`,
   which these edit routes reject). Known result (facts `schema-nbp-edit-refs`): no item limit in
   the schema; the vendor's ceiling was 14. HEIC images: convert to PNG first with python3
   (pillow-heif).
10. **3D logo, only when the customer wants it 3D** [10]. HR10 waiver as in step 4. Default:
    `openai/gpt-image-2/edit`, quality high, 2880x2880; a kit or brief may name another.
    `node $T/thumb.mjs logo3d --out work/<p>/logo3d.params.json`, quote it (step 12), then
    `ai-gen run openai/gpt-image-2/edit --params-file work/<p>/logo3d.params.json --ref artifacts/<p>/source/<logo> -o artifacts/<p>/logo3d/ --queue --strict-params --max-cost <quote> --format json > work/<p>/logo3d.result.json`.
    Not set: `input_fidelity` (facts `schema-gpt2-edit-fields`: the field does not exist and the
    proxy drops it). Check by eye that every letter and brand colour survived, then set
    `logo.render` to the file. Main renders wait for it.
11. **Assemble** [11]. `node $T/thumb.mjs assemble …` writes `work/<p>/vNN.prompt.txt` and
    `vNN.params.json` per variant: the IMAGE REFERENCES line when there are two or more refs, block
    1 first (frame, split or medium; the 9:16 clause), then scene, text, subjects (one identity lock
    for each character image, an expression per subject, the subject-size guidance), key elements, logo, location,
    composition, background, the lighting rig on people (a coloured rim recolours the back and
    hair light alone), the take line, and GRADE last. Split frames fire only on a layout ask (split,
    before-after, versus, side by side) or a reference with `split` true; then `brief.split` is an
    object (`mode`, `count`, `panels` with one line per side, or `custom` text), and `assemble` stops
    when the panels are missing; a scene of "X vs Y" stays a single frame. The grade stays vivid unless the customer asks for calm, premium or muted (`grade`).
    Variants differ only by expression and take. The prompt lives in the params file, never on the
    command line.
12. **Pre-submit check and quote** [12, 14]. `node $T/thumb.mjs check … --manifest artifacts/<p>/manifest.json`
    must print every variant ok (row `pre-submit`); it also fails when in-render text or a 2D or 3D
    logo is set without a recorded HR10 waiver, or a reference file is missing. Then quote every call
    (the first `estimate` on a fresh machine takes 1-3 minutes: allow 300 s or more):
    `ai-gen estimate <model> --params-file work/<p>/vNN.params.json --format json`, add the 3D logo
    and planned retries, and compare the total with `node $S/manifest.mjs budget --project <p>`
    (`ai-gen balance` is the account, not the run). Known result (facts `price-nbp`): 37.5 cr at 1K
    or 2K, 75 cr at 4K per image. Over the remaining budget, or no budget known: open a spend gate
    (`node $S/gate.mjs open --project <p> --slug render-plan --question "…" --options '[…4K…, …2K…, {"id":"stop","label":"stop","credits":0}]' --resume-at 13 --quote <total>`)
    and end `partial` (HR5, HR12). Never lower the resolution or the count silently.
13. **Render** [13]. One call per variant, up to six at once:
    `ai-gen run <model> --params-file work/<p>/vNN.params.json [--ref artifacts/<p>/source/<character> …] -o artifacts/<p>/vNN/ --queue --strict-params --max-cost <quote> --format json > work/<p>/vNN.result.json &`
    keeping each job's id (`pidN=$!`), then `wait $pidN` for each one so every exit code is seen
    (a bare `wait` hides a timeout that is already charged). Record each: `node $T/thumb.mjs record --variants work/<p>/variants.json --n N --result work/<p>/vNN.result.json`
    (file, request id, `rendered_seed`), `node $S/manifest.mjs add --project <p> --result work/<p>/vNN.result.json --params work/<p>/vNN.params.json --json '{"item":"vNN","node":"vNN","declared":<from assemble>,"credits":{"estimate":<quote>},"parents":["source/<character>"]}'`
    (HR9) and `node $Q declared --plan artifacts/<p>/manifest.json --file <render>` (HR1). A timeout
    (exit 10) is already charged: `ai-gen result <request-id> -o artifacts/<p>/vNN/ --format json`,
    never resubmit (HR6). A route that is gone (exit 6, 8, or 9 for a failed job): read its contract
    first (`ai-gen info <model> --format json` and the raw OpenAPI, HR2), then the step 14 route.
14. **Post-render check** [15]. Make the small view for real
    (`ffmpeg -v error -y -i <render> -vf scale=120:-1 work/<p>/vNN.120.png`) and look at both,
    writing what you see for each point (HR14):
    - on the full-size render: (a) identity and character design match the character images; (b) no stray
      text or watermark when text was not ordered; (c) ordered text matches character for
      character;
    - at 120 px only: (d) the expression and the hero element read.
    Failing (d) is fixed in the composition, never by more resolution or an upscale. Retries move a
    named lever (HR7), recorded as `"attempt"` and `"lever"` in the manifest row. Retry 1: a new
    seed with the same prompt for drift or stray text: first `ai-gen info <model> --format json` and
    check that `seed` is a field of the route, then set `"seed": <new>, "reuse_seed": true` on the
    variant and assemble again, so the seed sits in the params file and HR9 can replay it (never
    `--seed` on the command line); when the route has no `seed`, use a prompt change instead, as for
    (d) (larger subject, plainer background in `brief.json`, assemble again). Retry 2: route, for a
    variant with references, to `openai/gpt-image-2/edit` (set `"model"` on the variant, assemble
    again, re-quote the new params file with `ai-gen estimate … --params-file`, and add
    `"attempt": 2, "lever": "route"` to the manifest row; known result `beh-nbp-scores`: it ranked first on identity-preserving headshots
    where Nano Banana Pro scored 0/4); without references, stop. After that, report the variant
    honestly and never ship it silently.
15. **Tweaks, on request** [16]. One call per tweak on the finished render, chained: each accepted
    output is the source of the next (an iterative chain the customer asked for, HR11).
    `node $T/thumb.mjs tweak --kind emotion|background|recolor|rim --value "<phrase>" --model fal-ai/nano-banana-pro/edit --ratio <r> --out work/<p>/vNN_tK.params.json`,
    quote it, then `ai-gen run fal-ai/nano-banana-pro/edit --params-file … --ref <render> -o artifacts/<p>/vNN_tK/ --queue --strict-params --max-cost <quote> --format json`.
    `--ratio` is required (the job's ratio), so a tweak can never come back at the wrong shape. The
    tweaked image is 2K unless `--resolution` says otherwise, so a tweak of a 4K master returns a
    smaller file: bake on that size and say so.
    When a route is unavailable, try the next once, never retrying one that vanished:
    `openai/gpt-image-2/edit`, then `bytedance/seedream/v5/lite/edit` (the catalog id; the
    approach's `fal-ai/bytedance/seedream/v5/lite/edit` is an alias untested through the proxy).
    Seedream rewrites every prompt and cannot be told not to (HR16: say so, keep any returned
    rewrite) and has no 4:5: tweak at 3:4 and say so, or stay on Nano Banana Pro. Run step 14 on
    every tweak; the unedited regions must be unchanged.
16. **Logo, composited** (HR10; approach step 11 block 6). The result is `work/<p>/vNN_logo.png`;
    steps 17 and 18 use it in place of the raw render. With `logo.mode` composite, place the
    supplied file exactly as given in a free corner, never over a face, sized by eye to read at
    120 px, with a soft shadow:
    `convert artifacts/<p>/source/<logo> -resize <w>x \( +clone -background black -shadow 50x<blur>+0+<drop> \) +swap -background none -layers merge +repage work/<p>/logo_shadow.png`
    then `convert <render> work/<p>/logo_shadow.png -gravity <corner> -geometry +<m>+<m> -composite work/<p>/vNN_logo.png`.
17. **Headline bake** [17]. Skipped when there is no headline. Write the headline to
    `work/<p>/headline.txt` with a file write (never inside a shell string). Look at the render and
    choose the position (top, bottom, left, right, center) whose quarter is empty and keeps clear
    of every face and of the logo's corner, and a style: beast (default), fire, neon-lime, clean-glass (Inter 800) or marker
    (rows `bake-traits`, `bake-placement`, `bake-quick-check`). Two to four words read best; the
    script refuses fewer than two or more than six. Upper case, except `--case preserve` for a hook
    that must stay exact.
    `node $T/bake_headline.mjs bake --image <vNN_logo.png when step 16 ran, else the render> --text-file work/<p>/headline.txt --style beast --position bottom --out artifacts/<p>/final/thumbnail_vNN_<emotion>-t<take>.png`
    (`thumbnail_vNN_t<take>.png` for a variant with no people).
    The script counts words (2-6; for Chinese, Japanese and Thai, which have no spaces, 2-12
    characters), sizes the type from the short side of the frame, and wraps to two lines before it
    gives up; non-Latin display looks are not checked on the build yet (MKT-L432). If the first
    120 px look is weak, raise the size with `--size-frac 0.17`-`0.20` (default 0.16; the cap-height
    target of 12-18% is measured on the build, MKT-L424). German `ß` and Turkish `i` take
    `--case preserve` with the customer's own casing.
    The script checks first that the family resolves to itself (`fc-match`) and covers every
    character (`fc-list :charset=…`); exit 5 lists families that do. A non-Latin headline or a
    customer font takes `--font "<family>" [--weight N]` (row `font-swap`), for example a
    fonts-noto family; say which font was used. A delicate serif or script takes
    `--stroke-frac 0.03`-`0.06` or `0`, and a script face is an accent, never the main word. The
    output is a flat PNG at the render's size, never a browser preview. Check it: the JSON line's
    width and height, `identify <png>`, then look at it full size (exact text) and at 120 px
    (legibility). The first bake of each style on the build is compared by eye with the style
    table (MKT-L424). If the bake cannot run (exit 3 no browser, 4 font does not resolve, or 1 no fit)
    after one retry with `--font`, `--size-frac` or another position, deliver the clean render (or
    `vNN_logo.png`) and name the headline as still owed (HR15); never draw it with a model instead.
18. **Deliver** [18]. Every variant that passed (all of them unless the customer picked one), named
    by expression and take, in `artifacts/<p>/final/` (a clean render with no headline is copied
    there as it is, or `vNN_logo.png` when a logo was composited). Reply with a short list: the exact prompt file per variant, the models,
    retries and credits used (`node $S/manifest.mjs budget --project <p>`), every default that was
    applied (people-free, one variant, Match, 4K), and every variant that failed and why.

**Real frame** (framework 4) [3, 17]. Find the moment:
`ffmpeg -v error -i <video> -vf "fps=1/<step>,scale=480:-1,tile=4x3" -frames:v 1 work/<p>/frames.jpg`,
look, then `ffmpeg -v error -y -ss <t> -i <video> -frames:v 1 work/<p>/frame.png`. A frame that
shows a recognisable real person's face is refused for now (step 6): pick a moment without one, or
say that none was usable and offer a generated concept instead. Crop to the ratio
around the subject with ffmpeg `crop`, say so when the crop is under 1280 px wide, run step 14 (d),
and continue at step 16 or 17. No generation and no credits.

## Not on this machine

- **The fallback method WF13-a1** (a short guidance procedure with ffmpeg drawtext headlines) is not
  offered on this machine yet. Local alternative: this skill at 2K with one variant, or a free-prompt
  still with media-image-generation (MKT-L428).
- **Angle Lock** for product thumbnails is not offered on this machine yet: the source names it
  without defining it (MKT-L430).
- **A hosted gallery or upload slot**: delivery is files under `artifacts/<p>/final/`.

## House rules (HR-1.0)

Relies on: HR1 (format and aspect declared by `thumb.mjs assemble` and measured with
media-qc, with the long side as a floor on Nano Banana Pro and width and height on the GPT routes;
the exact pixel size is not compared on Nano Banana Pro, so read it from the file; bake output
size checked by the script), HR2 and HR3 (every field from the params file,
`--strict-params`; raw OpenAPI before the first call of a session), HR4 (resolution, aspect, count,
format, `limit_generations`, `enable_web_search` and `safety_tolerance` pinned), HR5 (every call
quoted, the plan against the budget), HR6, HR7 (retry 1 seed or prompt, retry 2 route), HR8, HR9,
HR10 (headline baked and logo composited last; in-render text or logo only as a recorded waiver),
HR11 (renders from the customer's originals; tweaks chain only on request), HR12 (stated defaults
and gate files, no question tool), HR13 (`thumb.mjs check`, `bake_headline.mjs` font and size
checks), HR14, HR15 (a headline that could not be baked is named as owed), HR16 (Seedream's
rewrite), HR17 (a real person's face is refused until SL8's consent text is approved; no one rendered
from a name), HR18 (baked UI is generic
and true), HR19, HR20 (waivers recorded), HR21 (fonts, browser and Playwright are baked; nothing
installed), HR22 (facts rows `price-nbp`, `schema-nbp-*`, `schema-gpt2-*`, `beh-nbp-scores`,
`beh-rewriters`) — see media-ai-gen/references/house-rules.md.
