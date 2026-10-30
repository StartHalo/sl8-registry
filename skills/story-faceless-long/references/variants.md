# Variants of story-faceless-long

## Contents
- [Kids (narrator only)](#kids-narrator-only)
- [Kids Talking Characters](#kids-talking-characters)
- [Song mode](#song-mode)
- [Fairy Tale & Myth](#fairy-tale--myth)
- [Documentary length (10 minutes or more)](#documentary-length-10-minutes-or-more)
- [Picture Story (frame by frame)](#picture-story-frame-by-frame)

SL8 wording; the method is WF53-a1 in the capability assessment (sl8-resesarch@559a1305), restated
from Higgsfield's faceless-video references (kids styles, kids song, talking characters, storybook,
history long-form, picture flow) and cited by research id. Every variant runs the SKILL.md steps;
this file says only what differs. Defaults may be overridden by a kit or brief.

## Kids (narrator only)

- Any Kids-catalog style (Studio 3D, Pastel Flat 2D, Colorful 3D, Hand-drawn Ink, Poster Vector);
  four hard cuts per block, WIDE, CLOSE-UP reaction, EXTREME CLOSE-UP detail, MEDIUM, in a new
  order every block (`block-kids`). A block that fails twice at four shots drops to three (`block-three-kids`, 3.3 s shots; the
  clip check allows 3.7 s per shot for it), for that
  block only (through the step 18 gate).
- Lines of 17-21 words with excitement carried by the words (`kids-delivery`); sound words and catch phrases
  count in the budget and are written as spoken words, never brackets; warmth lives in word choice,
  never in pauses.
- Characters react to the narrator by gesture and face only, look into the lens on lines aimed at
  the viewer, and questions end a block so the cut is the answer beat (`kids-interplay`).
- Clip sound: playful cues (`kids-audio`). A bed is on by default, mood matched to the channel, at
  `--music-vol 0.05` (the source tested it down from 0.10 and 0.07; not yet run on the fal music
  model, STO-L307).
- Voice: Default Jessica; a kit or brief may name another preset.

## Kids Talking Characters

- Only when asked, only for Kids, never as a fix for a weak script; song intent clears it; the flag
  describes this video only (higgsfield/faceless-style-library#19, #51).
- Manifest: `talking_characters: true`; `block_kind` alternates narration, dialogue, starting with
  narration (`talking-fields`, `talking-format`). Narration 17-21 words with closed mouths on
  screen; dialogue 16-22 words across at most two named speakers, one turn each, caused by the
  narration before it and setting up the next (a dialogue block that could move is rewritten).
- Dialogue block prompts quote each speaker's exact words and allow only those mouths
  (`talk-rule`); they get no narrator take. Character voices may differ in timbre; keep identity,
  wardrobe, palette and delivery direction stable.
- Dialogue audio: for each dialogue block,
  `ffmpeg -i artifacts/$P/clips/blockNN.mp4 -vn -ac 1 -ar 24000 -af loudnorm=I=-16 work/$P/voices/voiceNN.wav`;
  never centred, stretched or voice-changed, so the voice files stay one per clip. The assembler
  places it from 0 s and mutes that block's clip sound (the voice is the clip sound).
- Not yet run: Seedance 2.0 native lip-synced speech is unverified (STO-L306); check the first
  dialogue block before the rest.
- Captions are **not offered on this machine yet** for this variant: edit-captions stops when its
  voiced blocks differ in number from the script rows, and the dialogue rows count as script rows
  with no narration take. Deliver the clean master and say why in the delivery (STO-L318).

## Song mode

- Offered on Kids runs as a 1- or 2-minute sung music video (`song-duration`): 6 or 12 blocks. No
  narrator, no voice lock, no separate bed, no captions (speech-to-text on singing is unreliable).
  Non-Kids styles map to the closest Kids style.
- The song comes first. Choose GENTLE (C major, 100 BPM) or DANCE-ALONG (G major, 112 BPM, action
  words in the chorus) (`song-moods`); lyrics in the customer's language star the main character;
  one constant tempo, eight-syllable trochaic lines sung one syllable per beat, each line one 4-bar
  phrase from beat one, the chorus repeated word for word, concrete words, no groove jargon; a
  1-minute song is 2 verses and 2 choruses; trim instrument adjectives first, never the meter rules
  (higgsfield/faceless-style-library#45, #46).
- Default: `fal-ai/minimax-music/v2.6` with `{"prompt": "<style>", "lyrics": "<[Intro] [Verse] … [Outro]>"}`
  (`song-skeleton`); the singing voice is described in the prompt. Gate the two files first:
  `python3 $K/faceless_script.py song-prompt --prompt work/$P/song_prompt.txt --lyrics work/$P/song_lyrics.txt`
  (prompt 10-2,000 characters, lyrics up to 3,500, one tempo of 100 or 112 BPM, the meter
  clauses, no tempo or groove words, lines near eight syllables, identical choruses). The model has
  no length field: never promise a length; measure the song with
  `ffprobe -v error -show_entries format=duration -of csv=p=0 artifacts/$P/music/song.mp3`, which
  must be 60 or 120 s within 3 s; one retry (HR7), then a gate. Convert it with
  `ffmpeg -i artifacts/$P/music/song.mp3 work/$P/song.wav`.
- Then the style key and roster (the main character, the friends the lyrics name, 2-3 locations,
  the through-line prop), blocks mapped to the song (`song-maps`): verse blocks show what the lyrics
  name; chorus blocks repeat the same signature dance in the same place, bigger each time;
  characters dance on the beat, humming smiles allowed, mouths never articulate singing; four cuts
  a block; `song-choreo` in each prompt; AUDIO stays diegetic.
- Assembly: `python3 $K/assemble.py --song work/$P/song.wav --clips-dir artifacts/$P/clips --blocks N --out work/$P/output/final.mp4`
  (song at full level, clip sound about 0.06, the song within 3 s of N x 10 s, sidecar `"song": true`).
  `--accept-soft-blocks` and `--music` are refused here.

## Fairy Tale & Myth

- Cinematic Storybook by default; 2-3 minutes (12-18 blocks), five cuts a block, a hushed tone
  (`script-craft.md`). Voice: Default Callum; a kit or brief may name another.
- Every block prompt carries the on-twos token and its constraints (`storybook-twos`), and the
  assembly takes `--stepped 12`: image updates are re-timed to about twelve a second while the
  container frame rate and the audio stay as they are.
- Moderation-safe staging (`storybook-avoid`): dark moods through buildings, light and landscape.
- The bed is due on every run: dark, enchanted ambience with no drums and no singing
  (`storybook-bed`), at `--music-vol 0.09`.
- Captions, when on, use the paper look.

## Documentary length (10 minutes or more)

- Locked by "documentary" or a duration of ten minutes or more; lengths 10, 15 or 20 minutes; style
  Default Watercolor Chronicle (Editorial, Paper Diorama and Mannequin remain choices). Warn once
  about time and cost: 60+ clips, 60+ takes and 25-40 assets, often hours. At the facts rows'
  1,705 credits a 1080p block (759 at 720p) 60 clips are about 102,000 credits and 120 clips (20
  minutes) about 205,000 credits before retries, takes and assets. For N of 30 or more the quote
  is gated: it runs only inside a budget the brief states, otherwise a spend gate opens with the
  figure and a Stop option (SKILL.md step 6).
- Skeleton: a cold open in the middle of the action (blocks 1-2, `cold-open-example`); an explicit
  rewind line in block 3 (`rewind-example`); 5-8 chronological chapters of 8-14 blocks, each with
  its own small arc, a closing hand-over hook (`handover-example`) and at least one human vignette
  (honest when it is a composite); lines that admit uncertainty (`uncertainty-example`); a meaning
  chapter (`meaning-example`); one outro block (higgsfield/faceless-intake-script#55).
- ERA MAP: the story split into eras aligned with chapters; one character asset per era with the
  identity traits repeated word for word; later eras attach the first incarnation (from the third
  era on, also the previous one); each block uses only its era's variant
  (higgsfield/faceless-intake-script#56).
- Visual variety: show what the line names; a MOTIF LEDGER (each motif at most once a chapter and
  about three times a film; the through-line is exempt, but each return shows a new state); every
  chapter has at least one map beat, and a quantity beat when the narration cites money or
  resources (higgsfield/faceless-intake-script#57).
- Two locks, neither of which waits: OUTLINE LOCK (chapters, era map, motif ledger) before any
  asset is made, then SCRIPT LOCK. Generate chapter by chapter so a failed block stalls only its
  chapter; one assembly at the end with every pair (higgsfield/faceless-intake-script#58).
- Real people in history are named in the narration only (SKILL.md step 5).

## Picture Story (frame by frame)

- Locked by "picture story", "stills", "frame by frame" or `scene_based`, whatever the channel; the
  channel keeps only its tone, and the pick is never moved back to motion. Styles: Default Flat 2D
  Papercraft, also Stickman and Hand-drawn Ink, described by their one-liners; a nearby ask maps to
  the closest with a one-line note.
- No video model is called. Assets come first (characters 2:3, key locations at the video's
  aspect, props 1:1, the formula word for word, at most 7 references) and are references only,
  never slides.
- Script: one continuous narration plus a shot outline: a moment is a burst of near-identical
  frames of one shot, each changing ONE detail; a new framing only when the action or the place
  changes (`burst-example`). Shot sizes mix wide, medium and close at random with one ban, never
  two close-ups in a row; the close-up handing over to a medium is the strongest change (`shot-mix`).
  About 2-3 frames per spoken beat and about two in three frames are edits; show what the line
  names; a beat reuses its location reference with a new composition. Plan the count from the
  duration and show it at SCRIPT LOCK (one minute 45-70 frames, never fewer than about 40; two
  minutes 90-140).
- Manifest: `{"genre": …, "animation_mode": "scene_based", "beats": [{"n", "phrase", "image_mode": "new"|"variation", "variation_of", "change_only"}]}`;
  gate it with `python3 $K/faceless_script.py picture --script work/$P/script_manifest.json --duration-seconds S`
  (25-35 beats a minute, 4-8 words a beat, at most 2.5 words a second in all, a variation edits the
  beat before it and names its one change, the first beat is new). Once valid, its phrases and their
  order never change.
- Voice first: the whole narration as one read with the locked voice, in a few chunks of about
  1,800 characters (whole paragraphs, same voice and settings) when it is long, joined with
  `ffmpeg -f concat -safe 0 -i work/$P/chunks.txt -c copy work/$P/narration.mp3`, then
  `ffmpeg -i work/$P/narration.mp3 -ac 1 -ar 24000 work/$P/voices/narration.wav`. A chunk with the
  wrong timbre or a garbled read is regenerated (one retry). The review order is audio, then images.
- Timeline: `python3 $K/timeline.py build --script work/$P/script_manifest.json --audio work/$P/voices/narration.wav --requested-duration S --out work/$P/scene_manifest.json --language <xx>`
  (local faster-whisper words; remote: one Scribe call on the narration, then `--words-json`). It
  aligns beats to the spoken words (similarity 0.5 or more), checks the narration is within 3 s or
  10% of the request, cuts contiguous frames of 0.7-1.2 s (never over 1.5 s), at most two edits in
  a row, and numbers them in spoken order with waves 0, 1 and 2. Never hand-write a timeline or
  spread times evenly.
- Frames, by wave, frame number as the index (item `frame-NNN`, node `keyframes`):
  wave 0 new framings, fresh from the assets (location, then character sheets, then props) in the
  exact style, `bytedance/seedream/v5/lite/edit` with those `--ref`s; waves 1 and 2 are edits whose
  ONE reference is the previous rendered frame ("edit-frame"), recorded with `"parents": ["frame-<prev>"]`.
  Attaching the sheets to an edit rebuilds the scene: if two frames in a row look like different
  photos, redo the edit. Frames use the video's aspect (never 2:3 or 1:1), about 1080p, no text.
  Default edit route as above; `fal-ai/nano-banana-pro/edit` is the alternative to test (STO-L310).
- Bind and assemble: `python3 $K/timeline.py bind --timeline work/$P/scene_manifest.json --project-dir artifacts/$P --frames-dir work/$P/frames --out work/$P/scene_manifest.bound.json`
  (every slot needs a done row; edits must name the previous frame; files are swapped in through a
  staging folder and a missing slot fails closed), then
  `python3 $K/assemble.py --stills --timeline work/$P/scene_manifest.bound.json --narration work/$P/voices/narration.wav --duration-seconds S --out work/$P/output/final_clean.mp4 [--music … --music-vol 0.10]`
  (holds at most 1.5 s, at least one frame per 1.5 s of narration and as many distinct pictures,
  one aspect, frame time within -0.2/+0.5 s of the narration, long side at most 1920, narration at
  full level with an optional ducked bed, -16 LUFS). Billing blocks stay ceil(S / 10). Then captions
  (from `narration.wav` and the script, SKILL.md step 26 case B), cover and delivery as in steps 27-28; 10 s windows, cut templates, {MOTION} tokens and
  freeze probes do not apply.
