# Messages: the one message, the refusal, the hand-overs

The fixed wording voice-clone-setup sends. Fill the `{…}` values; change nothing else in the
consent statement (it is what the person agrees to, and the gate file keeps it).

Adapted from Creative Claw's `creativeclaw-clone-voice` 5.4.2 (Apache-2.0; research ids
`creative-claw/creativeclawclonevoice-a9fd28@Recording specification`, `@Consent request
instruction`, `@Consent statement (quote in full)`, `@Consent single-question example`,
`@Not-connected stop instruction`, and `creative-claw/cc-voice-references#152`), changed for SL8:
second person, the processor named for the fal route that will run, SL8's own terms and privacy
links, ai-gen in place of the vendor's connector. The wording was written for the vendor's own
providers (Cartesia, ElevenLabs, Fish) and has not been run with the fal routes.

Status: pending owner approval (VID-L461). While this line stands, the skill sends no consent
message and clones no real person's voice (SKILL.md step 5). The owner replaces it with
`Status: approved <date>` when the statement, the terms and the privacy notice are agreed.

## The one message (step 5)

Send it once, whole. Leave out a bracketed line that does not apply.

```text
Please send one recording of your own voice, or of a speaker who has given you permission:
- at least 60 seconds, ideally 1 to 2 minutes, of natural speech by one person;
- a quiet room, the same distance from the microphone throughout, and your normal speaking voice;
- varied sentences, including names and numbers, in the language the voice will speak;
- no music, other voices, echo, clipping, heavy filters or long silences. A clean phone recording is fine.
[Qwen route: Please also send the exact words spoken in the first 300 seconds of the recording (a longer recording is cut there), and check them.]
[Replacement: This replaces the voice saved as "{role}" ({route}, made {created_at}); the old clone stops being used.]

The recording will be processed by {processor}. To go ahead, reply "I agree" to the statement
below and tell me the recording's language[, and whose voice it is: yours, or someone else's, with their name]:

> I own this recording or have permission to use it, and this is my voice or I have the
> speaker's explicit permission to clone it and generate speech in this workspace. I authorize
> SL8 and the voice-generation provider selected for this job ({processor}) to process it for
> this purpose, and accept the [SL8 voice-cloning terms]({terms_url}) and
> [privacy notice]({privacy_url}).
```

- `{processor}`, by route: `fal, through MiniMax voice models` (minimax);
  `fal, through Qwen voice models` (qwen); `fal, through Resemble AI's Chatterbox model` (oneshot).
- `{terms_url}`, `{privacy_url}`: from the kit or brief. Without both, the statement cannot be
  quoted whole: do not send the message (SKILL.md step 5).
- The bracketed whose-voice words stay only when neither the request nor the brief says whose voice
  it is; the answer fixes the consent value (SKILL.md step 6).
- The language was already named: drop "and tell me the recording's language". One reply that
  agrees and names the language covers both; an agreement that names none takes `en`, said in one
  line. The recording is already attached: send the same message before cloning.

## The refusal (step 2)

One line, then carry on without waiting for a reply:

```text
I can't make a voice that sounds like {the person} without their own documented permission, so I won't clone it. [I'll use an ordinary {register} voice instead.]
```

## Not connected (step 1)

```text
I can't reach the voice service ({what is missing}), so no voice was made and nothing was charged.
```

## The audition (step 12)

```text
Here is a short test of your cloned voice: {file} ({seconds} s). Please listen for whether it
sounds like you, and for the accent, clarity and pace, then reply "approved", "adjust" (say what
is off) or "re-record". [I have not listened to it myself.] [A clone can carry your recording's
accent into another language.]
```

## One-shot delivery (oneshot route)

```text
This is a one-off match made for this clip only: no reusable voice was saved. [Your recording is
in {language} and the script in {other}: the accent may not carry over reliably.]
```

## Deletion (step 14)

```text
Deleted {removed}. This cannot be undone. Not deleted: {your upload}, which is yours; and the
copies sent to the voice provider for the calls (a MiniMax voice id expires after 7 unused days).
```
