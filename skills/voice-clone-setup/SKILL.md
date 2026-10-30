---
name: voice-clone-setup
description: >-
  A consented clone of a person's own voice, saved for later speech. One message asks for a clean
  1 to 2 minute solo recording, names who processes it, quotes the consent statement and asks the
  language; the sample is cut once with ffmpeg; fal MiniMax voice-clone makes a stored voice by
  default (Qwen reference clone or one-off Chatterbox clip on request); the person judges an
  audition on their own name, a number and a sentence; the voice is reused, re-made from the kept
  sample when its id lapses, replaced or deleted on request. A named real person's voice or a
  sample of unknown origin is refused. Use when: clone my voice, use or
  save my voice, speak this in my cloned voice, audition or re-record my voice, my clone stopped
  working, delete my voice. NOT for: stock or timed voiceover, voice swap (media-audio-generation);
  dubbing (voice-dub); an avatar or presenter (voice-avatar-identity, voice-presenter-video); new
  lines or lip-sync in footage (voice-line-replace); writing the script (media-script-writer).
license: SL8 wording, with the messages adapted from Creative Claw clone-voice 5.4.2 (Apache-2.0) and the refusal list from fal agent skills (no licence stated; used with attribution)
compatibility: "sl8-video >=1.5.0 (sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0 (manifest.mjs, gate.mjs); media-qc 1.2.0; media-audio-generation 1.1.0 (references/facts.md); ffmpeg 5.1 and ffprobe; node 22; siblings voice-dub, voice-line-replace, voice-avatar-identity and voice-presenter-video ship in the same Video 1.5.0 bundle"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [creative-claw/creativeclawclonevoice-a9fd28, fal/falaudiogeneration-ba1a03, creative-claw/cc-voice-references]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27)
  approach: WF09-a1
  attribution: Method from the SL8 capability assessment (WF09-a1); consent, recording and hand-over wording adapted from Creative Claw creativeclaw-clone-voice 5.4.2 (Apache-2.0); Whose voice rules adapted from fal agent skills (the audio generation skill; no licence stated, used with attribution); scripts written by SL8
  deltas: VID-D460..VID-D479, VID-D615
---

# Your cloned voice

Makes a consented, reusable clone of a person's own voice and keeps it for later speech. One
message asks for the recording and the person's agreement; the sample is cut once from their
original; one clone call makes the voice; a short audition on their own name, a number and a
natural sentence is judged by them; then the stored voice is reused, re-made when its id lapses,
replaced or deleted on request. Possessing or uploading a recording is never consent.

The method was written for a vendor's own clone providers (Cartesia, ElevenLabs, Fish), which are
not on this machine. Neither its wording nor the fal routes below have been run here: treat the
first clone and audition as a test.

```bash
V=$HOME/.agents/skills/voice-clone-setup/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
node $V/sample.mjs prep <recording> --route minimax --dir artifacts/<p>/audio/voices/<role>
node $V/voices.mjs check --project <p> --role <role> --endpoint fal-ai/minimax/speech-2.8-hd   # for production
```

Both print one JSON line. `sample.mjs` exits 0 usable, 1 not usable (no audio, under the route
minimum, silent: nothing is kept), 3 ffmpeg missing. `voices.mjs` exits 0, 1 refused or blocked
(empty consent, wrong model, a duplicate, a missing sample, an audition not yet `approved` when
`check` is for production), 3 no record for the role. Stored paths are relative to `artifacts/<p>/`,
so any working directory finds them. The first `ai-gen` call on a fresh machine takes 1 to 3
minutes: give it a 300 s timeout (commands.md). Messages: [references/consent.md](references/consent.md).

## What a request needs

- **One recording** of the person's own voice, or of a speaker who gave them permission: one audio
  file, or a video whose sound is used (`artifacts/attachments/`). No recording: step 2's stock
  voice.
- **Their reply** agreeing to the statement and naming the language (step 5).
- **The terms and privacy links**: the brief fields `terms_url` and `privacy_url` (a kit may carry
  them as defaults). Their wording is pending the owner's approval (VID-L461).
- Optional: the **role** key (default `narrator`), the **route** (default MiniMax), the project
  (the caller's, else `my-voice`).

| Route | Clone | Speech | Sample (kept) | What is stored |
|---|---|---|---|---|
| **minimax** (default) | `fal-ai/minimax/voice-clone`: `audio_url` of at least 10 s returns `custom_voice_id` | `fal-ai/minimax/speech-2.8-hd` with that id | mono, first 120 s | the id, which the provider **deletes after 7 unused days** |
| qwen | none: every speech call carries the sample and its transcript | `fal-ai/qwen-3-tts/clone-voice/1.7b` (`audio_url` up to 300 s, `reference_text`) | mono, first 300 s | no voice id; the sample is sent every time |
| oneshot | none | `resemble-ai/chatterboxhd/text-to-speech` (`audio_url` overrides the voice) | mono, first 30 s | nothing reusable: one clip |

Default: minimax; a kit or brief may name another. Known result (media-audio-generation
`references/facts.md`, rows `schema-minimax-clone`, `schema-other-clones`, as of 2026-10-05).

## Steps (approach step numbers in brackets)

1. **Preflight** [1]. `ai-gen doctor --format json` (300 s timeout; a timed-out doctor is retried
   once before the "Not connected" line): go on only when `config.ok` and `proxy.ok` are
   true. Otherwise stop with the "Not connected" line: no other tool, no audio described that was
   not made, and never print `SL8_SESSION_TOKEN` or `env`. Then
   `node $S/manifest.mjs init --project <p>`, `node $S/gate.mjs status --project <p>` (resume an
   answered gate) and `node $V/voices.mjs show --project <p>`. A deletion skips this step (14).
2. **Whose voice** [2], read off the request before anything else, with or without a sample. It
   turns on whose voice is asked for, not how: a supplied sample, a typed name, "the preset closest
   to him" and settings tuned toward a person are one request. **Refuse, every time, whatever the
   mechanism:**
   - the voice of a named real person the user does not own or hold documented permission to use
     (politician, executive, celebrity, streamer, colleague), however framed, including parody,
     satire, "internal only" and "it's only a test";
   - any script putting words in a real speaker's mouth that they did not say, where a listener
     could take it as genuine;
   - any sample whose origin the user cannot state.

   A legal assurance is not consent; consent has exactly two forms (step 6). On a refusal, act on
   this skill's authority without waiting: send the one-line refusal, and when the request also
   asked for speech, hand the text to media-audio-generation for an ordinary preset chosen for the
   brief's register: never the nearest match to the refused person, neutral settings, no imitation
   instruction in the text; it records the choice and its reason in the registry. No recording, or
   no agreement, is the same: no clone, a stock voice offered. Designing a new voice from a
   description is **not offered on this machine yet**.
3. **Find the role's record** [3]. Keys are project roles (`narrator`, `host`), never voice names; a
   second voice gets a second role, never `narrator2`. A role that already
   has a cloned voice is reused (step 13), never duplicated, and the same recording is never saved
   under a second role. `node $V/voices.mjs preflight --project <p> --role <role> --route <route>`
   runs these refusals without writing: run it now and again right before step 8's paid call, so no
   one is charged for a voice the registry would then refuse. A role holding another voice (a stock preset) is replaced by the clone, so
   step 5's message names it. The delivery the voice is for (a steady read or expressive speech)
   shapes the audition sentence; here it does not change the model, as it did for the vendor.
4. **Quote first** (HR5). Write the audition text (step 10; a draft of the same length while the
   name is not known) to `work/<p>/audition-1.txt`, and draft `work/<p>/clone.params.json` and
   `work/<p>/audition-1.params.json` (step 11's shape) after the schema reads of steps 8 and 11,
   then quote the clone and the audition as one total, from the same params files the calls use:
   `ai-gen estimate fal-ai/minimax/voice-clone --params-file work/<p>/clone.params.json --format json` and
   `ai-gen estimate fal-ai/minimax/speech-2.8-hd --params-file work/<p>/audition-1.params.json --format json`.
   Known result (facts `price-minimax-clone`, `price-minimax-speech`, list prices of 2026-10-05,
   not checked through the proxy): 375 credits per clone; 15 or 25 credits per 1,000 characters
   of speech. Qwen and Chatterbox have no price on record (`price-unknown`): an estimate exit 12
   means an uncapped call. Compare the total with `node $S/manifest.mjs budget --project <p>`. Over
   what remains, unpriced, or no budget known: in an interactive session say the total in chat and
   wait for the person's reply; in a bot job open a spend gate for the owner and end `partial`
   (HR12): `node $S/gate.mjs open --project <p> --slug approve-clone-<role> --question "<route, calls, credits>" --options '[{"id":"a","label":"Clone and audition","credits":<total>},{"id":"b","label":"Stop","credits":0}]' --resume-at "step 5" --quote <total>`.
5. **One message** [4]. First `node $V/sample.mjs measure <recording>` when one is attached
   (free): exit 1 (no audio, silent) or under 10 s means send the recording request only, with no
   consent text yet. Without both `terms_url` and `privacy_url` the statement cannot be quoted
   whole: send nothing and make no call; tell the person plainly "the voice-cloning terms are not
   set up yet, so I have not cloned anything", and write VID-L461 to the job log only. Otherwise fill "The one message" in references/consent.md:
   the recording request, the processor named for the route, the statement quoted in full, the
   language question (dropped when the language is named), the transcript request on the Qwen route
   and the replacement line from step 3. Send it once, even when the recording is already attached:
   - **the person is present** in an interactive session: send it as one chat message and wait for
     the reply (no question tool, HR12);
   - **a bot job** (no one present): the message is the job's reply. Write it to
     `work/<p>/consent-message.md`, open the consent gate with it as the question (the clone is the
     paid step it unlocks) and end `partial` with no paid call:
     `node $S/gate.mjs open --project <p> --slug consent-<role> --question "$(cat work/<p>/consent-message.md)" --options '[{"id":"a","label":"I agree (language named)","credits":<total>},{"id":"b","label":"Do not clone","credits":0}]' --resume-at "step 6" --quote <total>`.
     The person's reply answers it in the next job:
     `node $S/gate.mjs answer --project <p> --gate <NN> --option a --by "<their words, verbatim>"`.
6. **Fix the consent once** [5]. Their own voice is `owner`; another speaker's, with that speaker's
   permission, is `written permission from <speaker's name>`: the only two forms, and an empty value
   blocks the run. Their words stay in the gate file (bot job) or go in the clone row's `notes`
   (interactive). Never ask again after the upload, and never ask separately whether it is their
   voice; ask again only for a different speaker or recording, or when they hesitate or withdraw.
   A withdrawal means no consent: clone nothing; for a saved voice run
   `node $V/voices.mjs withdraw --project <p> --role <role>` (check then blocks it) and offer step 14.
7. **Prepare the sample** [6].
   `node $V/sample.mjs prep <recording> --route <route> --dir artifacts/<p>/audio/voices/<role>`
   keeps the person's file whole as `original.<ext>` and cuts `sample-<route>.mp3` from it once
   (`-ac 1 -t <cap> -b:a 128k`; caps in the table). It is never cut again from a sample, and a long
   original is never a reason to ask for a new upload. Exit 1 (under 10 s, 5 s on oneshot; no
   audio; silent): ask for a longer or cleaner take, no clone. Exit 0 with notes (under 60 s, peaks
   at 0 dB, long silences): read them; music, other voices, echo or clipping heard on listening
   (only when audio inspection really runs) mean a cleaner take, never a clone of a bad source. On
   oneshot, the sample is clean natural speech of one speaker, close to the emotion and pace wanted,
   because the reference performance carries over. The folder stays private: never copy its files
   into a deliverable folder and never post a hosted URL of them.
8. **Clone at once** [7, 8], with no message in between and no second prompt. There is no upload
   command: `--audio-file` uploads the sample inside the call and fills `audio_url` (facts
   `cli-audio-file`); a local path in a params file is not uploaded, and no id or URL is ever handed
   to the person to copy.
   - Schema first: `ai-gen info fal-ai/minimax/voice-clone --format json` and media-ai-gen's raw
     OpenAPI check (HR2). `work/<p>/clone.params.json` pins every default-on field the schema shows
     (HR4) and holds no `audio_url`.
   - Submit with `--async`, then fetch with `ai-gen result`. Known result (ai-gen 2.2.0
     `core/pipeline.ts`): `run` fails an answer with no file and no text as `EMPTY_RESULT` (exit 1,
     already charged) and keeps only its key names, so an answer holding only `custom_voice_id`
     would be paid for and lost; `result` keeps the whole answer in `raw`.
     ```bash
     ai-gen run fal-ai/minimax/voice-clone --audio-file artifacts/<p>/audio/voices/<role>/sample-minimax.mp3 \
       --params-file work/<p>/clone.params.json --async --strict-params --max-cost <clone quote> --format json > work/<p>/clone.submit.json
     node $S/manifest.mjs add --project <p> --result work/<p>/clone.submit.json --params work/<p>/clone.params.json \
       --json '{"item":"clone-<role>","node":"audio/voices/<role>","status":"pending","declared":{"returns":"custom_voice_id"},"credits":{"estimate":<clone quote>}}'
     ai-gen result <request_id> -o artifacts/<p>/audio/voices/<role>/ --format json > work/<p>/clone.result.json   # again while "ready": false
     node $V/voices.mjs record --project <p> --role <role> --route minimax --consent "<step 6 value>" \
       --consent-words "<their reply, verbatim>" --terms-url <terms_url> --privacy-url <privacy_url> --language <code> --result work/<p>/clone.result.json
     node $S/manifest.mjs add --project <p> --result work/<p>/clone.result.json --params work/<p>/clone.params.json \
       --json '{"item":"clone-<role>","node":"audio/voices/<role>","status":"done","declared":{"returns":"custom_voice_id"},"credits":{"estimate":<clone quote>},"files":["audio/voices/<role>/clone.json"],"parents":["audio/voices/<role>/sample-minimax.mp3"]}'
     ```
     `voices.mjs record` reads `raw.custom_voice_id`, writes `clone.json` (the row's file) and the
     registry entry; `--replace` after a confirmed replacement (step 13). The model may also return
     a preview file with the id; the real answer shape is a facts row owed after the first clone
     (VID-L462), and a preview in the role folder is private like the rest.
   - qwen and oneshot make no clone call: `voices.mjs record --route qwen --reference-text-file work/<p>/transcript.txt`
     (the transcript the person sent and checked, with the same `--consent-words`, `--terms-url` and
     `--privacy-url` flags) or `--route oneshot`, then step 11 is the first call.
9. **Never change route silently** [9]. When the person picks another route, say first what it
   loses (minimax: the id lapses after 7 unused days; qwen: no stored voice, the sample is sent on
   every call; oneshot: nothing reusable). A switch on the same recording and consent is not a
   replacement: `sample.mjs prep <original> --route <new>` (no `--force`), then
   `voices.mjs record --route <new> --switch-route` (plus `--result` or `--reference-text-file`);
   it keeps the consent and proof, the old route's id stays in `previous_route` until the new
   audition is approved, and nothing is deleted. On any failure, including a plan or capacity message,
   report the real message and stop: no stock voice or other route swapped in to hide it, and the
   record is not written (a replacement keeps the old one). A queued call that timed out (exit 10)
   is charged: fetch it with `ai-gen result <request-id>`, never resubmit (HR6).
10. **Audition text** [10]: one of the person's names, one number and one natural sentence in the
    target language. Localize the speech text, never the recording: Hebrew gets full niqqud on
    every spoken word with the wording kept; other languages spell names and numbers the way they
    are said. MiniMax takes a language name, not an ISO code: read the `language_boost` enum with
    `ai-gen info fal-ai/minimax/speech-2.8-hd --format json`, take the target language's entry and
    store it (`node $V/voices.mjs lang --project <p> --role <role> --language-boost <entry>`). The
    vendor's MiniMax names (`Hebrew`, `Persian`, `Chinese,Yue` for Cantonese) were written for its
    own backend and have not been run on ours. No such field, or no entry for the language: stop and
    report; there is no fallback.
11. **Audition call and checks** [11, 12]. Pass the model that matches the clone, by name:
    `node $V/voices.mjs check --project <p> --role <role> --endpoint <model> --for audition` exits 1
    on a mismatch (an unapproved audition passes here and only here).
    A clone is not portable across models; the default is to reuse the clone, not to re-clone it to change models. On minimax,
    `work/<p>/audition-1.params.json` is
    `{"prompt":"<audition text>","voice_setting":{"voice_id":"<voice>","speed":1,"vol":1,"pitch":0},"language_boost":"<entry>","output_format":"url"}`:
    the text field is `prompt` (facts `schema-minimax-speech`); the voice id alone, never with a
    stock voice; `output_format` `url`, because the default `hex` makes no file and fails after
    the charge (facts `cli-hex-empty`). Add every other default-on field `ai-gen info` shows,
    including any text-normalisation or rewrite switch, at its stated default (HR4, HR16).
    ```bash
    ai-gen run fal-ai/minimax/speech-2.8-hd --params-file work/<p>/audition-1.params.json -o artifacts/<p>/audio/voices/<role>/ \
      --queue --strict-params --max-cost <audition quote> --format json > work/<p>/audition-1.result.json
    node $S/manifest.mjs add --project <p> --result work/<p>/audition-1.result.json --params work/<p>/audition-1.params.json \
      --json '{"item":"audition-<role>","node":"audio/voices/<role>","declared":{"audio":"speech","duration_ms":<the answer's duration_ms, a number>},"credits":{"estimate":<audition quote>},"parents":["clone-<role>#1"]}'
    ```
    Use `ai-gen run`, not `ai-gen audio tts`, which sets both `text` and `prompt` (facts
    `cli-tts-fields`). On qwen and oneshot read the schema first: the route runs as written only if
    it takes the sample as `audio_url`, the text to speak (and `reference_text` on qwen) and returns
    audio; otherwise that route is **not offered on this machine yet**: say so and offer minimax.
    Their call is the same `ai-gen run <model>` with `--audio-file <sample-<route>.mp3>` added.
    Then check the file: `node $Q artifact <file>`, `node $Q takes <file> --floor -60` (decodes, not
    silent) and `ffprobe -v error -show_entries format=duration -of csv=p=0 <file>` against the
    answer's `raw.duration_ms`. A silent or empty file gets one re-run, quoted first (HR5), with the row keys
    `"attempt":2,"lever":"<what changed>"` (HR7), then a report. Store the measured rate (never an assumed one) and the use:
    `node $V/voices.mjs rate --project <p> --role <role> --text-file work/<p>/audition-1.txt --duration-ms <ms> --file <file>`
    (words per second; for Chinese, Japanese, Thai and other languages written without word spaces
    it stores `rate_cps` and leaves `rate_wps` null), then `node $V/voices.mjs touch --project <p> --role <role>`.
12. **The person judges** [13]. Hand over the file with "The audition" message: identity, accent,
    clarity and pace are theirs to judge. Do not claim to have listened unless audio inspection
    really ran; a transcript proves neither identity nor accent. Say that a clone can carry the
    recording's accent into another language. Record the verdict
    (`node $V/voices.mjs verdict --project <p> --role <role> --verdict approved|adjust|re-record --file <file> --by "<their words, verbatim>"`;
    `approved` is refused without `--by`; in a bot job it arrives with their next message,
    `pending` until then). No production speech before `approved`: step 13's `check` exits 1 until
    then, and after `re-record` the old voice is not used.
    - **adjust**: fix the smallest thing (spelling, niqqud, a word, one `voice_setting` value) and
      make one more audition, quoted first (HR5) and recorded with `"attempt":2,"lever":"<what changed>"` (HR7). One voice per speaker.
    - **re-record**, or a second audition still off: noise or a wrong identity needs a cleaner
      recording (a new recording is a new consent, step 5), not more paid synthesis; a long clean
      sample may take the qwen route instead (step 9's switch, no new consent).
    - **oneshot**: deliver with the "One-shot delivery" message: a one-off match, never a reusable
      clone, with the accent warning when the sample's language differs from the script's.
13. **Reuse, lapse and replacement** [14]. Later speech uses the stored voice, not the sample (qwen
    and oneshot send the sample on the call). Each speech job runs
    `voices.mjs check --project <p> --role <role> --endpoint <model>` first (production is the default; exit 1 blocks it, also while the audition is not
    `approved`), speaks
    with step 11's params and the job's text, and runs `voices.mjs touch` after each call and before
    finishing, since the lapse counts unused days. A job with a length target, several speakers or a
    mix belongs to media-audio-generation, which reads this record (`endpoint`, `voice` in
    `voice_setting.voice_id`, `rate_wps`); its hand-off names the debt: run `voices.mjs touch` after
    each use (HR15). A script with a claim follows that skill's claim rule (HR18).
    - **Lapse.** When `check` shows `lapse_likely` and the speech call fails with an error about the
      voice (the exact text is not on record), quote and re-clone once from the kept sample under
      the stored consent, without asking again: step 8's calls, the second clone row
      carrying `"attempt":2,"lever":"re-clone"` and `"parents"` of the first, with
      `voices.mjs record … --reclone` (the record is updated, not duplicated), then retry the speech once with the new id (lever:
      re-clone). Say in the delivery that the voice was re-made from the same recording, and ask the
      person to listen for a difference. No kept sample: no re-clone; it needs a new recording and
      consent (step 5). Under 7 unused days the same error is reported as it is (step 9).
    - **Replacement** destroys the clone the old recording made: name the role and its voice,
      explain, and have the person confirm (the replacement line of step 5); then
      `sample.mjs prep … --force` and `voices.mjs record … --replace`. Never replace a good voice
      merely to change models.
14. **Delete, on the person's explicit request only** [15], never on this skill's own initiative.
    It needs no ai-gen. `node $V/voices.mjs delete --project <p> --role <role> --confirm` removes the
    record, the role folder (kept recording, samples, auditions), the job's working copies
    (`work/<p>/clone*`, `audition*`, `transcript*`, `consent-message*`) and marks the manifest rows
    `rejected`. Send the "Deletion" message: it cannot be undone, and it names what stays (their
    own upload; the consent gate files, as the record of what was agreed; the copies
    sent to the provider, which this cannot delete).
15. **Visible speech** [16] is a later job: make the speech first with the approved voice. Laying
    speech over a video is not lip-sync, and a persona's image does not bring its voice. Lip-sync onto
    an existing clip (`fal-ai/sync-lipsync/v2`) is **not offered on this machine yet** by this skill:
    hand the approved speech and the clip to voice-line-replace; a talking head from a portrait is
    voice-presenter-video. Never hand on the private sample.

**Deliver** one line: route, role, the stored voice id (or "one-off"), language, the audition file
and its measured seconds, `rate_wps`, the verdict still owed, and the registry path
`artifacts/<p>/audio/voices.json`.

## House rules (HR-1.0)

Relies on: HR1 (the audition's audio and duration declared, then measured), HR2, HR3, HR4 (the
params files pin `output_format`, `voice_setting` and every default-on clone field), HR5 (clone and
audition quoted as one total against the budget), HR6, HR7 (one re-run per audition, with its
lever; one re-clone per lapse), HR8 (the role folder under `artifacts/<p>/audio/voices/`), HR9
(each call gets a manifest row), HR10 (the sample is cut and measured locally), HR11 (every sample
comes from the original), HR12 (stated defaults; the consent question and any spend over budget are
gate files in a bot job), HR13 (`sample.mjs`, `voices.mjs`, `mediaqc.mjs`), HR14, HR15, HR16 (a
text normalisation or rewrite field shown by the schema is pinned in the audition params file), HR17 (Whose
voice), HR18, HR19, HR21, HR22 (facts rows of media-audio-generation `references/facts.md`) — see
media-ai-gen/references/house-rules.md.
Departure: HR20 (the user's instruction wins) does not waive step 2's refusal "whatever the
framing"; the house rule HR17 wins (owner principle of Oct 28; VID-L460).
