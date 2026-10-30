---
name: motion-doc-explainer
description: >-
  Narrated explainer video from a customer's documents, slides, code, pull request or web pages:
  the agent reads the source, writes slide markup (code, diffs, lists, cards, tables, pictures, a
  four-part infographic, optional Manim animations) whose narration points at exact lines, checks it
  with scripts, voices every line with ElevenLabs, times a pointer from Scribe word timings, draws
  each slide as a HyperFrames composition and assembles one MP4, keeping the editable markup and
  source notes. Use when: explain this repo, doc, PDF, deck, PR or page as a video; a code
  walkthrough, onboarding or refactor explainer with spoken narration and highlights; a translated
  or revised copy of one. NOT for: a motion-designed PR changelog video (pr-to-video); a topic
  explainer with no customer source (faceless-explainer); a photo slideshow (slideshow); overlay
  titles or kinetic type (motion-graphics); captions on an existing video (captions-overlay).
license: SL8 wording and SL8-authored scripts; method from the Scrimba Explain companion kit and markup contract (no licence stated for the assessed units), restated and cited;points from fal agent skills (no licence stated, used with attribution) and HyperFrames (Apache-2.0)
compatibility: "hyperframes-studio E2-narrow (HyperFrames CLI 0.8.61, chrome-headless-shell 152, GSAP 3.14.2 loaded from the jsDelivr address hyperframes-core's examples use, or from a local file passed with --gsap-file); ai-gen 2.2.0; ffmpeg 5.1.9; python3 with Pillow; poppler-utils; gh; manim 0.20.1 (variant B); fonts 1.1.0 and fonts-noto; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [explain-video-generator/explaincompanionkit-8081e1, explain-video-generator/explainer-markup-contract, explain-video-generator/explain-tool-declarations, fal/falaudiogeneration-ba1a03, fal/falvideoproduction-09f33d, fal/charactersheet-a2ae87, hyperframes/hf-docs-prompting, hyperframes/hyperframes-2afd9d, hyperframes/hf-docs-render-contract, hyperframes/mediause-ec397d]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; markup contract snapshot 2026-10-11)
  approach: WF34-a1
  attribution: Method from the SL8 capability assessment (WF34-a1), restated from Scrimba's Explain companion kit, markup contract and tool declarations, with points from fal and HyperFrames (Apache-2.0); scripts written by SL8
  deltas: HF-D300..HF-D319
---

# Doc explainer

Turns a customer's material into a narrated slide video. The agent is the author: it writes
markup to a fixed grammar, scripts check it, every narration line is voiced and timed, and each slide
is drawn and rendered locally. The editable markup ships with the MP4, so a revision or another
language reruns only what changed. Nothing here has run on an SL8 Studio yet: treat the first job as
the test and report every figure.

```bash
X=$HOME/.agents/skills/motion-doc-explainer/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
P=<project>; J=work/$P                     # the job folder; deliverables go to artifacts/$P/explainer/
python3 $X/preflight.py check $J            # join chunks -> document.xml; grammar, budgets, frame limits
python3 $X/preflight.py says $J --voice <voice>   # says.json + one TTS params file per say
python3 $X/align.py $J                      # timeline.json: pointer times from word timings
python3 $X/build_slides.py $J               # render/slide-NN/index.html + render/plan.json
python3 $X/assemble.py audio|join|frames|probe $J
```

Every script prints figures and exits non-zero on a failed check. The grammar is
[references/markup-grammar.md](references/markup-grammar.md); the prompt wording this skill sends is
[references/prompts.json](references/prompts.json); the regression fixture is
[references/fixture.xml](references/fixture.xml).

## Steps (WF34-a1)

1. **Intake and open the job.** Take the material (document, deck, repo, PR, URL, notes,
   screenshots) and the request. Fix before any authoring, from the brief or else the defaults,
   stating each default in one line of the delivery (no question tool, HR12):
   - frame: **Default: square** (1080x1080); portrait 9:16 for phones and reels, landscape 16:9 for
     desktop; a kit or brief may name another. A frame change later is a new job.
   - language and region (`lang`, e.g. `en-US`): the brief's, else the source's language with its
     most-spoken region.
   - title (search words first, under 45 characters) and a 120-160 character description.
   - voice: **Default: the brief's voice id; with none named, `Brian`** (the one ElevenLabs voice
     with a measured rate on record, unverified on SL8); a kit or brief may name another. One voice
     for the whole explainer.
   - animation (variant B): **Default: off**; on only when the brief asks for motion or a beat
     cannot teach standing still.
   `mkdir -p $J/{chunks,assets,audio,render,anim,qc,source}`; write `$J/config.json`
   `{"mode","lang","title","description","voice","animation":false,"fps":30}`;
   `node $S/manifest.mjs init --project $P`; `ai-gen doctor --format json` (failing: stop and name the
   missing credential; never print it) and `ai-gen balance --format json`. Nothing is hosted, so there
   is no link, ownership claim or visibility setting.
2. **Read the grammar whole.** Read `references/markup-grammar.md` to its last line,
   `END OF MARKUP GRAMMAR` (`grep -c 'END OF MARKUP GRAMMAR'` is 1); for portrait or landscape its
   frame table overrides every other number. Hold the author rules (`prompts.json` row
   `author-rules`) while writing. The grammar restates a 2026-10-11 snapshot of a live vendor
   contract and cannot be refreshed per job.
3. **Read every source before planning,** with the agent's own tools. Save quotations, file paths
   with line numbers and URLs in `$J/source-notes.md`; every claim the narration makes must trace to
   a line there. A link is no substitute for reading it: a page or file that cannot be read is named as unread in
   the explainer and the notes, never filled in. Check any version, release or date that may be
   newer than your training, or leave it out. An earlier explainer handed back is context only.
   - Repo or PR: a checkout handed in is read in place. `git` is not offered on this machine yet as
     a listed tool. The job holds no GitHub credential, and `gh` refuses calls without a token even
     for public repos, so read public sources with `curl` and no token: a PR's files and commits from
     `https://api.github.com/repos/<o>/<r>/pulls/<n>/files` and `.../pulls/<n>` (`base.sha`,
     `head.sha`), a file at a commit from `https://raw.githubusercontent.com/<o>/<r>/<sha>/<path>`.
     Use `gh` only when `gh auth status` already shows a token. A private repo needs a credential this
     job does not hold: report it unread (HR12).
   - PDF: `pdftotext -layout <file.pdf> $J/source/doc.txt`; pages with figures:
     `pdftoppm -r 80 -png <file.pdf> $J/source/page`, then read the page images.
   - PowerPoint or Google Slides: python-pptx is not offered on this machine yet; use a PDF export
     of the deck (the PDF route above). Without one, the delivery names the deck as unread.
   - Web page: the harness's web fetch.
4. **Plan the deck** in `$J/plan.md`: one row per slide with anchor, visual type, the source line
   it teaches from and target words per say. 10 to 50 slides and about 1,500 spoken words in all
   (a deeper subject gets a tighter script). One visual per slide chosen by content: code, diff,
   picture, infographic, `ul`/`ol`/`cards`, one small table, or (variant B) an animation. Teach
   purpose before mechanism and mark inferred reasons. Code topics still get two to four picture
   slides around the core, and every explainer one picture or infographic. Exact content never
   goes into a picture. Omit any type the request rules out. Recipes: a codebase walkthrough
   (real files, exact excerpts, identifiers named); a PR or refactor (one diff per focused change);
   onboarding from screenshots (one action per picture slide, `ol` for ordered tasks, `cards` for
   choices); a general source. **Diagram and maths slides** (Mermaid, KaTeX) are not offered on
   this machine yet: plan a flow as `ol`, parties or states as `cards`, a model as code, a formula
   as a short text line inside a layout entry, or (variant B) an animation.
   **Quote the whole job now,** before any paid call, from the plan: pictures (one `ai-gen estimate`
   per route, about 37.5 credits each), the infographic (about 52.75 at `high`), voice (one line per
   say, 1-2 credits, so at most 2 each) and Scribe (per say `ceil(minutes) x 2 x 1.3` credits, so at
   most 2.6 each; facts `price-scribe-v2`). Check the sum with `node $S/manifest.mjs budget --project $P`.
   Over the budget, or no budget known:
   `node $S/gate.mjs open --project $P --slug approve-spend --question "<steps, routes, credits>" --options '[{"id":"a","label":"Voice, transcribe and draw","credits":<quote>},{"id":"b","label":"Stop with the markup","credits":0}]' --resume-at "step 14" --quote <quote>`
   and end `partial` with the free steps done (HR5, HR12).
5. **Fit the frame.** Check every planned excerpt against the frame table; split long code over
   two slides rather than shrink it. `preflight.py` enforces the limits.
6. **One style line.** Before any picture, write `$J/style.txt`: one line naming one look for the
   whole explainer (never mix photographic and illustrated). Every generated picture prompt ends
   with that line and then `No text, lettering or labels anywhere in the image.`, copied exactly.
7. **Register customer pictures:** `python3 $X/preflight.py register $J <file>...` copies each
   picture that will appear into `assets/` as `att-01`... with size and format in
   `assets/manifest.json` (at most 12, each up to 8 MB, as png, jpeg, webp or gif; uploads do not count toward
   the 12 generated pictures). A picture that cannot be read or breaks a limit is skipped and named
   in the delivery. Use only ids from the manifest; an uploaded slide carries no prompt. When a
   product or character in it must reappear in generated scenes, show it once as a slide first.
8. **Write the intro** in `chunks/01-opening.xml` (the intro and the first teaching slides):
   a plain item `anchor="intro"`, then a first say of about ten words that links only `#intro`.
9. **Code slides:** excerpts copied byte-exact with
   `python3 $X/preflight.py excerpt <file> <first> <last>`; narrated with line refs and quoted
   spans (grammar: Code, Links). Code renders in one colour: syntax colouring is not offered on
   this machine yet; line and span highlights carry the pointer.
10. **Diff slides** from the PR's before and after sources (`gh api ... ?ref=<base sha>` and
    `?ref=<head sha>`); two panes, closed properly, narrated before, after, consequence. If the
    before source cannot be fetched, show the final version as code and say so.
11. **Layout and table slides** (grammar: Layouts and tables).
12. **Markup safety** (grammar: Document shape): markup only, escaped angle brackets, type or
    layout first.
13. **Write every say** as final narration (grammar: Says, Writing rules), with `lang` first and
    the same on every say. Then run `python3 $X/preflight.py check $J` now and fix every chunk issue
    (the style line, the closing sentence, picture limits, the infographic quadrant order) before any
    generation: it needs no picture files. Step 18 runs it again on the finished document.
14. **Generated pictures.** Default: `fal-ai/nano-banana-pro` at `resolution` `1K`, and
    `fal-ai/nano-banana-pro/edit` when the slide has `reference=`; a kit or brief may name another.
    Prompt wording was written for the vendor's unnamed image model and has not been run on ours.
    Per picture, a params file `$J/assets/gen-<anchor>.params.json`
    `{"prompt": "<item prompt>", "aspect_ratio": "<1:1|9:16|16:9 = the frame>", "resolution": "1K", "num_images": 1}`, then
    `ai-gen estimate fal-ai/nano-banana-pro --params-file <params> --format json` and
    `ai-gen run fal-ai/nano-banana-pro --params-file <params> --queue --strict-params --max-cost <quote> -o $J/assets/gen-<anchor>/ --format json > $J/assets/gen-<anchor>.result.json`.
    With a reference, run `fal-ai/nano-banana-pro/edit` with `--ref $J/assets/<referenced file>`
    (the edit route takes `image_urls`, which `--ref` fills; pin `aspect_ratio`, whose edit default
    is `auto`). `-o` is a folder: save the file as `$J/assets/gen-<anchor>.png`
     (`python3 -c "from PIL import Image; Image.open('<downloaded>').save('<dst>')"`; copy, do not
     move, so the envelope's `local_path` still exists) and give the row the saved file:
     `node $S/manifest.mjs add --project $P --result <result.json> --params <params> --json '{"item":"gen-<anchor>","node":"assets","files":["$J/assets/gen-<anchor>.png"],"declared":{"aspect":"<ratio>"},"credits":{"estimate":<quote>}}'`.
     Look at each picture: an off-style picture, garbled lettering or a character that does not
     match its first scene gets one regeneration with a named change (for lettering: quote the words
     and describe the letter style, never name a font), then the slide becomes a layout (HR7). The
     second row for the same item carries `"attempt":2,"lever":"<the change, e.g. prompt:lettering style>"`;
     a model with no seed (nano-banana-pro and gpt-image-2 here) has the prompt or the `reference`
     as its lever; a third attempt is the layout swap, not a call. Keep each `request_id`. On exit 10
     or 14 the call is charged: run `ai-gen result <request_id>` before any resubmit; on exit 9 or 13
     follow `$HOME/.agents/skills/media-ai-gen/references/recovery.md` (exit-code playbook).
15. **The infographic** (usually one). Compose one picture prompt from the item: the `prompts.json`
    row `infographic-composed`, filled with the four titles, drawings and labels in visiting order
    and the item's `Style:` sentence (the vendor's composer is not exposed; this composition is
    ours). Default: `openai/gpt-image-2` with `quality` `high` and `image_size` = the frame
    (`square_hd`, `portrait_16_9` or `landscape_16_9`; check the enum with `ai-gen info`); a kit or
    brief may name another. This route has `image_size`, not an aspect ratio. Params file, estimate,
    `ai-gen run openai/gpt-image-2 ... -o $J/assets/infographic-<anchor>/`, saved as
    `$J/assets/infographic-<anchor>.png`, manifest row: as in step 14. Read the drawn labels;
    misspelled, regenerate once, then replace the slide with `cards` (P10) and record the swap.
16. **Animations (variant B only).** Manim CE 0.20.1 is on this machine. Write each scene into its
    item (grammar: Animation), then `python3 $X/preflight.py anim $J` writes `anim/<anchor>.py`, and
    `manim render -qh --fps 30 -r <W>,<H> --media_dir $J/manim -o anim-<anchor> $J/anim/<anchor>.py <SceneName>`
    (confirm flags with `manim render --help`); Manim writes under
    `$J/manim/videos/<script>/<height>p<fps>/`: find it with `find $J/manim -name 'anim-<anchor>.mp4'`
    and copy it to `$J/render/anim-<anchor>.mp4` (the build does not check the name). It
    must exit 0 and run 8-25 s (`ffprobe`); look at its last frame for clipping. Failing that, drop
    the animation for a layout or code slide.
17. **Close and review.** Two `<followup>` nodes last (they become the end card), then the final
    quality pass (grammar, last section); revise on any yes. A written rule beats any example.
18. **Assemble and check:** `python3 $X/preflight.py check --fixture` (the fixture must pass), then
    `python3 $X/preflight.py check $J`. It joins `chunks/*.xml` into the editable `document.xml`;
    a failed check means fix the chunk and rerun, never append a second copy. A pass leaves
    `.check-ok`; `says` and `anim` refuse to run without a fresh one (a failed check, or a chunk
    edited since). It checks the
    structure and everything the vendor's own checker left out: upload ids, one visual per slide,
    title, description, first-say and follow-up lengths, frame limits, the style and closing
    sentence of every prompt, infographic say order and the 25-35-word opening, selectors with an
    apostrophe, one language AND one region, 64,000 bytes per chunk and 512,000 in all. It reports
    planned length at 150 words a minute and at the measured 2.82 words a second (an estimate
    only); over 1,500 words, cut slides and record what was cut, never stop silently.
19. **Voice every say.** Default: `fal-ai/elevenlabs/tts/multilingual-v2`, one voice for the
    explainer; a kit or brief may name another. `python3 $X/preflight.py says $J --voice <voice>`
    writes `audio/say-NN.params.json` (link markup stripped, text otherwise as written,
    `apply_text_normalization` pinned `on` so numbers and code read alike). Quote the whole step
    first: `ai-gen estimate fal-ai/elevenlabs/tts/multilingual-v2 --params-file <each> --format json`
    (billed per line, 1-2 credits) and compare the exact sum with step 4's quote. Only if the pictures
    already generated plus the exact voice and Scribe quotes pass the budget that step 4 cleared,
    reopen `approve-spend` (`gate.mjs open ... --resume-at "step 19"`) and end `partial` (HR5, HR12).
    Then per say
    `ai-gen run fal-ai/elevenlabs/tts/multilingual-v2 --params-file $J/audio/say-NN.params.json --queue --strict-params --max-cost <quote> -o $J/audio/say-NN/ --format json > $J/audio/say-NN.result.json`,
    copy the MP3 (always MP3, no format field) to `$J/audio/say-NN.mp3`, then
    `node $S/manifest.mjs add --project $P --result $J/audio/say-NN.result.json --params $J/audio/say-NN.params.json --json '{"item":"say-NN","node":"audio","files":["$J/audio/say-NN.mp3"],"declared":{"voice":"<voice>"},"credits":{"estimate":<quote>}}'`.
    On exit 10 or 14 run `ai-gen result <request_id>` before resubmitting; rerun only the say
    numbers that have no MP3. The
    model has no seed and its pace varies by about 4%: never rewrite a say to hit a length; the
    slide follows the audio. `python3 $X/assemble.py audio $J` flags silent, short or clipped files
    and the total (at most about 600 s; over it, cut says).
20. **Time the pointer.** Default: `fal-ai/elevenlabs/speech-to-text/scribe-v2`, chosen because it
    returns word start and end times; a kit or brief may name another that does. Read its fields
    first (`ai-gen info fal-ai/elevenlabs/speech-to-text/scribe-v2 --format json`). Per say:
    `ai-gen run fal-ai/elevenlabs/speech-to-text/scribe-v2 --audio-file $J/audio/say-NN.mp3 language_code=<iso-639-3> diarize=false tag_audio_events=false 'keyterms:=["<identifier>","<name>"]' --queue --strict-params--max-cost <quote> --format json > $J/audio/say-NN.words.json`
    (transcripts print to stdout: no `-o`). `estimate` cannot price local audio, so the quote is
    `ceil(minutes) x 2 x 1.3` credits from `assemble.py audio`'s duration (facts `price-scribe-v2`);
    use it as `--max-cost` and record it as `credits.estimate` with that basis. The row has no
    media file, so point it at the envelope:
    `node $S/manifest.mjs add --project $P --result $J/audio/say-NN.words.json --json '{"item":"stt-NN","node":"audio","files":["$J/audio/say-NN.words.json"],"credits":{"estimate":<quote>}}'`.
    The language code is ISO 639-3: `says` prints it (en eng, es spa, de deu, fr fra, pt por, ja jpn,
    ar ara, and others); for one it does not list, read `ai-gen info`. Diarization and sound tags are on by
    default and would pollute the words; identifiers and names go in `keyterms`. Then
    `python3 $X/align.py $J` writes `timeline.json`: each link starts on its label's first word. A say
    without word times (an STT without them, a failed call, alignment under 0.6) gets an even
    spread, is listed under `even`, and its pointer check is declared not run (P14). Says under
    `readback` misread a name (plain numbers are not compared: the voice speaks them as words): regenerate only those (step 19), then re-transcribe.
21. **Draw and render the slides.** `python3 $X/build_slides.py $J` writes one HyperFrames
    composition per slide (intro, layouts, table, code with line and span highlights, diff panes
    with changed lines computed locally, pictures, the infographic with one zoom per quadrant say,
    and the end card), with the pointer driven by `timeline.json` and the timeline registered
    synchronously at load (hyperframes-core's rule; box positions are read lazily when GSAP first
    renders, and the build refuses a script that wraps the timeline in a promise). GSAP comes from
    the jsDelivr address the baked examples use; with no network at render, pass `--gsap-file
    <local gsap.min.js>`. Default fonts: `Inter` for text and `JetBrains Mono` for code, both
    bundled with HyperFrames; another family needs an `@font-face` file in the slide folder, and
    non-Latin text a Noto family. Per slide (load `hyperframes-cli` and `hyperframes-core`):
    `npx hyperframes check $J/render/slide-NN --json` (it runs lint first; overflow, collisions,
    runtime errors, contrast), fix and rerun until it passes (if `check` reports a GSAP load error, stop and report it), then
    `npx hyperframes render $J/render/slide-NN --fps 30 --quality high --output $J/render/slide-NN.mp4`.
    The brief is the approval to render (HR12): there is no preview pause in a job. Checks prove
    structure, not quality: step 23 still runs. `plan.json` lists `short_cues` (a link shorter than
    two frames, held to two): look at those moments in the render; the per-word frame clock at 24
    versus 30 fps is untested on 0.8.61. A blocked render routes to P15. A build that fails on any slide writes `plan.partial.json`, not
    `plan.json`: fix it and rebuild before step 22.
22. **Assemble:** `python3 $X/assemble.py join $J` builds each slide's audio (pre-roll 0.3 s, says
    0.35 s apart, tail 0.4 s), retimes animation clips to it, muxes, joins in order, normalises
    loudness (I -16, TP -1.5, LRA 11) and encodes H.264 yuv420p with AAC 192k to
    `$J/explainer.mp4`; `python3 $X/assemble.py probe $J` checks one video and one audio stream,
    the frame size, the slide count and the length (within 0.5 s of the plan). `join` refuses audio that
    changed since `build_slides.py` (a regenerated say): rerun `align.py` and `build_slides.py` first.
    Audio is one continuous track encoded once, so slides add no drift.
23. **Check the result.** `python3 $X/assemble.py frames $J --cues` takes one frame per slide midpoint and
    per infographic zoom and one labelled sheet, `qc/sheet.png`, and one frame at each pointer cue
    (every encoded frame of a short cue) in `qc/cues.png`, counting highlight-coloured pixels in each:
    a cue with none fails. Read the sheet as one image, and
    open single frames only where it shows a problem. Look for legibility, clipped code, the
    highlight on the narrated span, garbled or off-style pictures, a mismatched character and
    readable infographic labels. There is no listening on this machine: audio is judged by
    step 19's figures, the read-back list and `probe`'s loudness. Fix a failing slide alone, then
    rerun step 22. Report figures, never a written pass (HR14).
24. **Deliver** to `artifacts/$P/explainer/`: `explainer.mp4`, `document.xml`, `chunks/`, `plan.md`,
    `source-notes.md`, `timeline.json`, `qc/sheet.png` and `report.json` (frame, voice, models, request
    ids, durations, credits, what was cut or swapped, says on even spread, checks not run). The
    generation rows are in the project manifest. Keep the grammar and fixture apart from what was
    authored. `grep -rIlE 'SL8_SESSION_TOKEN|SL8_API_URL|ghp_|sk-[A-Za-z0-9]{20}' artifacts/$P/` finds
    nothing. One status line names what was verified and what was not.
25. **Revisions and other languages.** A revision edits `document.xml` back into the chunks, reruns
    step 18 and regenerates only the changed audio, timings and slides, then step 22; uploads keep
    their ids. Another language is its own job: `cp -r $J work/$P-<lang>`, translate on-screen text, the says, the infographic labels and both follow-ups (facts, code and quoted spans stay exact), set the new `lang`
    on every say and a voice for it, then steps 18-24.

## Paths and fallbacks

| Path | When | What changes |
|---|---|---|
| P1 | Readable files, notes or a brief; square; no animation | Steps 1-6, 8, 11-14, 17-24 |
| P2 / P3 | A repository / a PR or refactor | Adds step 9 / steps 9-10 |
| P4 / P5 | URLs / a PDF or deck | Step 3's web or PDF route |
| P6 | Customer pictures or screenshots | Adds step 7; onboarding recipe |
| P7 | Portrait or landscape | Frame table column; render size |
| P8 / P9 | Recurring subject / an infographic | `reference=` / adds step 15 |
| P10 | Infographic labels fail twice, or the model is out or over budget | The slide becomes `cards`; recorded |
| P11 | Variant B | Adds step 16; step 22 retimes |
| P12 / P13 | Another language / a revision | Step 25, then 18-24 |
| P14 | No word times for a say | Even spread; pointer check declared not run |
| P15 | Slides cannot render | Deliver `document.xml`, the say audio and stills; no MP4, and say why. Never swap in another workflow |

## House rules (HR-1.0)

Relies on: HR1 (frame, size and length declared in `config.json` and measured by `probe`), HR2, HR3
(the transcript and voice params are sent with `--strict-params`), HR4 (`apply_text_normalization`,
`diarize`, `tag_audio_events`, `resolution`, `quality` and the edit route's aspect pinned), HR5 (every
paid step quoted; the whole job checked against the budget), HR6, HR7 (one regeneration with a named
change, then the layout fallback), HR8 (`work/$P/` and `artifacts/$P/explainer/`), HR9 (one manifest
row per call), HR10 (code, labels and exact text are drawn by the renderer, never by a model), HR11,
HR12 (stated defaults; a spend past the budget is a gate; no question tool), HR13 (four scripts that
fail on bad input), HR14, HR15 (the status line names what is still owed), HR16 (the composed
infographic prompt is complete; no rewriter is turned on), HR18 (only claims from the source notes),
HR19, HR20, HR21 (nothing is installed: missing Mermaid, KaTeX and python-pptx are reported, not
fetched), HR22. See `$HOME/.agents/skills/media-ai-gen/references/house-rules.md`.
Not applicable: HR17 (no real person's likeness or voice is cloned; a stock voice is used).
