# Supplied copy or logo (SKILL.md step 14)

This runs only when the brief supplies exact copy or a logo, last, after every generative step. Place them in the still's empty area:

```bash
cp artifacts/attachments/<logo file> artifacts/<project>/source/logo.png
python3 ${CLAUDE_SKILL_DIR}/scripts/overlay.py artifacts/<project>/final/<chosen stem>.png artifacts/<project>/final/lifestyle-01-copy.png --text "<exact copy>" --logo artifacts/<project>/source/logo.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/lifestyle-01-copy.png --aspect <aspect> --format png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"lifestyle-01-copy","node":"final","tool":"python3 scripts/overlay.py --text --logo (Pillow ImageDraw text in DejaVuSans and logo alpha_composite)","parents":["lifestyle-01#<n>","source/logo.png"],"declared":{"aspect":"<aspect>","format":"png"},"measured":{"w":<w>,"h":<h>,"aspect":"<measured aspect>","format":"png"},"files":["final/lifestyle-01-copy.png"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet artifacts/<project>/source/product.<ext> artifacts/<project>/final/ --out artifacts/<project>/qc/contact.jpg
```

- When the brief supplies only one of the two, leave out `--text` or `--logo` (and, for the logo, the copy command and its parent).
- overlay.py places them in boxes given as shares of the frame (`--text-box`, `--logo-box`).
- Its first font is `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`, which is baked on the Image Studio. If it still exits 3 (no TTF found), deliver without the copy and name the missing font as a debt.
- With several variants and no stated choice, the copy goes on lifestyle-01, and the delivery note says so.
- A claim in the supplied copy is placed as written and listed for the user's confirmation (HR18).
- The sheet must list lifestyle-01-copy.png. Text legibility and placement go to owner review.
