# The AVATAR file: template and consumer contract

`AVATAR-<NAME>.md` is the deliverable of voice-avatar-identity and the one source of truth for a
subject's face and voice. It lives in the record folder, `artifacts/avatars/` by default (a kit or
brief may name another project), beside the subject's files in `artifacts/avatars/<name>/`. Every
path in it is relative to the file itself, so the folder can move. Names: `AVATAR-EVE.md` (an
agent), `AVATAR-KEN.md` (a user), `AVATAR-CLEO.md` (a named character); NAME in capitals, `<name>`
the same in kebab-case. Check it with
`node $HOME/.agents/skills/voice-avatar-identity/scripts/avatar.mjs record <file>`
(`--stage identity` before the portrait exists).

## Template

The Appearance and Voice sections are portable natural language and come from HeyGen's
heygen-avatar template (MIT); the SL8 section replaces its HeyGen ids with files and a voice entry.
Write it at step 5 with the SL8 lines empty (nothing after the colon), and fill them at step 14.

```markdown
# Avatar: <Name>

## Appearance
- Age: <natural language>
- Gender: <natural language>
- Ethnicity: <natural language>
- Hair: <natural language>
- Build: <natural language>
- Features: <natural language>
- Style: <natural language>
- Reference: <optional path relative to this file, or none>

## Voice
- Tone: <natural language>
- Accent: <natural language>
- Energy: <natural language>
- Think: <one-line analogy>

## SL8
- Subject: <agent | user | named>
- Base portrait: <path - THE stable reference; every look derives from it>
- Looks: <landscape=<path>, portrait=<path>, square=<path>, or none>
- Portrait source: <prompt | photo | footage-frame>
- Portrait model and prompt: <fal endpoint and <name>/prompt.txt, or none for a photo or a frame>
- Identity references: <the best original photo of a real person, or none>
- Voice endpoint: <fal-ai/elevenlabs/tts/multilingual-v2, or the clone's speech endpoint>
- Voice: <preset name, ElevenLabs voice id, or the clone's voice id or sample path>
- Voice Name: <human-readable>
- Voice Designed: <true if cloned from a sample, false if picked from the preset list>
- Voice Settings: <stability, similarity_boost, style, speed>
- Voice Batch: <index of the shortlist batch the pick came from, or n/a>
- Consent: <owner | written permission from <name> | n/a>
- Last Synced: <ISO timestamp>

Note: looks are files, not server records: resolve the portrait from the Looks line, else the base
portrait; a missing file is regenerated from the base portrait and the stored prompt. A MiniMax
custom_voice_id is deleted after 7 days without use.
```

- **Appearance holds stable appearance only:** face, hair, build, signature wardrobe. Never a
  scene, a setting, a pose or a lighting mood: every later generation that reads the file inherits
  them.
- **Never invent a trait.** A trait nobody gave is `unspecified`.
- **Consent** is `n/a` only for an agent or a fictional named character made from a prompt. A
  user's photo or footage, a frame of a real person, or a cloned voice needs `owner` or
  `written permission from <name>` (HR17); `record` fails without it. The Consent line is the one SL8
  line written early: with a photo or footage Reference, `record --stage identity` fails until it
  is set. The SL8 consent text is not approved yet, so the skill refuses real people (VID-L444).
- **Role aliases** `AVATAR-USER.md` and `AVATAR-AGENT.md` are relative symlinks beside the named
  files. A named character gets none. The named file is canonical; an alias can go stale when the
  agent or user is renamed, which the next run's staleness check re-links.

## Consumer contract (approach step 27)

A skill that puts this subject in a video (voice-presenter-video, media-video-generation's
lip-sync, any kit) reads the record this way:

1. **Resolve the file**, in this order: a named request ("a video with Eve") reads
   `AVATAR-EVE.md`; an agent self-reference ("a video of yourself") reads `AVATAR-AGENT.md`; a user
   self-reference ("a video of me") reads `AVATAR-USER.md`; none of them exists: use a generated
   presenter, or say that no avatar is set up. `cat` follows the alias at read time.
2. **Take the portrait path:** the look for the orientation the video needs (landscape 16:9,
   portrait 9:16, square 1:1), else the base portrait. Pass that file explicitly to the video
   route; never let a route pick a stock presenter.
3. **Take the voice entry** (endpoint, voice, settings). The record does not put its voice into a
   video by itself: make the speech first with the saved voice, then use an audio-driven
   talking-head route.
4. **Pin the voice once** and send the same voice, settings, rate and language on every fragment.
   A route that cannot take the saved voice is a reason to change route, never to accept another
   voice.
5. **Copy the entry into the project's registry** (`artifacts/<project>/audio/voices.json`,
   media-audio-generation) under a role key when that project keeps one; the AVATAR file stays the
   source of truth.
6. **A missing file** (a look, the base): regenerate it from the base portrait and the stored prompt
   with voice-avatar-identity, or keep the record as it is; never substitute another face. A clone
   id unused for 7 days is gone: re-clone from the kept consented sample with voice-clone-setup.
7. **Consent travels with the record:** read the Consent line before animating a real person's
   portrait (HR17).
