#!/usr/bin/env bash
# words.sh — recover word-level timing from the beat wavs via ai-gen ASR (Wizper) and write 04-timing.json.
#
#   bash words.sh <vo-dir> <timing-json-out>
#   e.g. bash words.sh artifacts/teaser/assets/vo artifacts/teaser/04-timing.json
#
# For every <beat>.wav in <vo-dir> (filename order, narration.wav excluded), it runs:
#   ai-gen audio stt "<wav>" -m fal-ai/wizper          (keyless SL8 proxy; pass a real FILE, not a dir)
# and parses the v2 JSON. Wizper may return per-word timestamps (chunks/words[] with start/end) OR just a
# transcript string. The node parser handles both:
#   - word-level timestamps present  -> "timing_method":"wizper"
#   - transcript only                -> split into words spread evenly over the ffprobe duration
#                                        ("timing_method":"even") — approximate but never fabricated words
#   - stt failed for a beat          -> "timing_method":"missing", words:[] (caller may have already taken
#                                        the silent fallback; beat still gets a timed slot from its duration)
# Per-beat words are offset by the cumulative start of the beat so the flat words[] track is ABSOLUTE
# timeline time (what caption blocks read). Writes a single merged 04-timing.json. Exit 0 if the file was
# written (even with even/missing beats); non-zero only if it could not write the file at all.
set -uo pipefail

VO_DIR="${1:?usage: words.sh <vo-dir> <timing-json-out>}"
OUT="${2:?missing timing-json output path}"

if [ ! -d "$VO_DIR" ]; then echo "!! vo dir not found: $VO_DIR" >&2; exit 1; fi
mkdir -p "$(dirname "$OUT")"

dur_of () {  # seconds (float) via ffprobe, else empty
  command -v ffprobe >/dev/null 2>&1 || { echo ""; return; }
  ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" 2>/dev/null || echo ""
}

# collect beat wavs in order (exclude the concatenated narration.wav)
BEATS=()
for f in $(ls "$VO_DIR"/*.wav 2>/dev/null | sort); do
  case "$f" in */narration.wav) continue;; esac
  BEATS+=( "$f" )
done

# transcribe each beat -> a per-beat raw JSON file we hand to the node merger
WORKDIR="$(mktemp -d)"
MANIFEST="$WORKDIR/manifest.tsv"   # cols: beat_id <TAB> wav_rel <TAB> duration <TAB> raw_json_path
: > "$MANIFEST"

# vo dir relative to the timing file's project root (so 04-timing.json stores assets/vo/<beat>.wav)
VO_REL="assets/vo"
case "$VO_DIR" in */assets/vo) VO_REL="assets/vo";; *) VO_REL="$(basename "$VO_DIR")";; esac

if [ "${#BEATS[@]}" -eq 0 ]; then
  echo ">> no beat wavs in $VO_DIR — writing an empty/estimated timing track."
fi

for WAV in "${BEATS[@]:-}"; do
  [ -n "${WAV:-}" ] || continue
  BEAT_ID="$(basename "$WAV" .wav)"
  DUR="$(dur_of "$WAV")"
  RAW="$WORKDIR/$BEAT_ID.json"
  if ai-gen audio stt "$WAV" -m fal-ai/wizper > "$RAW" 2>"$WORKDIR/$BEAT_ID.err"; then
    :
  else
    echo "   !! ai-gen stt failed for $BEAT_ID (see stderr); will emit a timed slot with no words." >&2
    printf '{"success":false}' > "$RAW"
  fi
  printf '%s\t%s/%s.wav\t%s\t%s\n' "$BEAT_ID" "$VO_REL" "$BEAT_ID" "${DUR:-}" "$RAW" >> "$MANIFEST"
done

# ---- merge into 04-timing.json (node = always present on this runtime) ----
node - "$MANIFEST" "$OUT" <<'NODE'
const fs = require('fs');
const [, , manifestPath, outPath] = process.argv;

const lines = fs.existsSync(manifestPath)
  ? fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean)
  : [];

// pull a word-timestamp array out of whatever shape Wizper/ai-gen returned
function extractWords(raw) {
  let j;
  try { const m = raw.match(/\{[\s\S]*\}/); j = JSON.parse(m ? m[0] : raw); } catch { return { words: null, text: '' }; }
  if (j && j.success === false) return { words: null, text: '' };
  // common shapes: chunks[].{text,timestamp:[s,e]}, words[].{word|text,start,end},
  // segments[].words[], or just {text}
  const cands = j.words || j.chunks || (j.output && (j.output.words || j.output.chunks)) || null;
  const out = [];
  const pushW = (text, start, end) => {
    text = String(text == null ? '' : text).trim();
    if (!text) return;
    const s = Number(start), e = Number(end);
    out.push({ text, start: Number.isFinite(s) ? +s.toFixed(3) : null, end: Number.isFinite(e) ? +e.toFixed(3) : null });
  };
  if (Array.isArray(cands)) {
    for (const c of cands) {
      if (Array.isArray(c.timestamp)) pushW(c.text ?? c.word, c.timestamp[0], c.timestamp[1]);
      else pushW(c.word ?? c.text, c.start, c.end);
    }
  } else if (Array.isArray(j.segments)) {
    for (const seg of j.segments) for (const w of (seg.words || [])) pushW(w.word ?? w.text, w.start, w.end);
  }
  const haveTimes = out.length && out.every(w => w.start != null && w.end != null);
  const text = j.text || j.transcript || (j.output && j.output.text) ||
    (out.length ? out.map(w => w.text).join(' ') : '');
  return { words: haveTimes ? out : null, text: String(text || '').trim() };
}

const beats = [];
const flat = [];
let cursor = 0;

for (const line of lines) {
  const [beatId, wavRel, durStr, rawPath] = line.split('\t');
  const dur = durStr ? Number(durStr) : NaN;
  let raw = '';
  try { raw = fs.readFileSync(rawPath, 'utf8'); } catch {}
  const { words: real, text } = extractWords(raw);

  let words = [];
  let method = 'missing';
  let beatDur = Number.isFinite(dur) ? dur : 0;

  if (real && real.length) {
    method = 'wizper';
    // normalize to start at 0 within the beat, then offset by cursor below
    const base = real[0].start || 0;
    words = real.map(w => ({ text: w.text, start: +(w.start - base).toFixed(3), end: +(w.end - base).toFixed(3) }));
    const last = words[words.length - 1].end;
    if (!Number.isFinite(beatDur) || beatDur <= 0) beatDur = last;
  } else if (text) {
    method = 'even';
    const toks = text.split(/\s+/).filter(Boolean);
    // estimate duration if ffprobe was unavailable: pacing rule ~ max(0.8, n/2.5)s
    if (!Number.isFinite(beatDur) || beatDur <= 0) beatDur = Math.max(0.8, toks.length / 2.5);
    const step = toks.length ? beatDur / toks.length : beatDur;
    words = toks.map((t, i) => ({ text: t, start: +(i * step).toFixed(3), end: +((i + 1) * step).toFixed(3) }));
  } else {
    method = 'missing';
    if (!Number.isFinite(beatDur) || beatDur <= 0) beatDur = 0.8;
  }

  beats.push({
    beat: beatId,
    wav: wavRel,
    duration: +beatDur.toFixed(3),
    timing_method: method,
    words
  });
  for (const w of words) {
    flat.push({ text: w.text, start: +(w.start + cursor).toFixed(3), end: +(w.end + cursor).toFixed(3), beat: beatId });
  }
  cursor = +(cursor + beatDur).toFixed(3);
}

const doc = {
  beats,
  words: flat,
  total_duration: +cursor.toFixed(3),
  source: 'ai-gen audio stt fal-ai/wizper',
  generated_at: new Date().toISOString()
};
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
const real = beats.filter(b => b.timing_method === 'wizper').length;
process.stderr.write(`>> wrote ${outPath}: ${beats.length} beats (${real} wizper, ${beats.length - real} even/missing), ${flat.length} words, ${doc.total_duration}s\n`);
NODE
RC=$?
rm -rf "$WORKDIR"
[ -s "$OUT" ] && { echo "$OUT"; exit 0; } || { echo "!! failed to write $OUT (node rc=$RC)" >&2; exit 1; }
