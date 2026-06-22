#!/usr/bin/env bash
# words.sh — recover word-level timing via ai-gen ASR (Wizper) and write 04-timing.json.
#
#   bash words.sh full <narration.wav> <timing-json-out> <beats-tsv>     # ONE transcribe -> split into beats (DEFAULT/batch path)
#   bash words.sh <vo-dir> <timing-json-out>                             # per-beat dir: one transcribe per beat (compat/fallback)
#
#   e.g. bash words.sh full artifacts/teaser/assets/vo/narration.wav artifacts/teaser/04-timing.json artifacts/teaser/work/beats.tsv
#        bash words.sh artifacts/teaser/assets/vo artifacts/teaser/04-timing.json
#
# FULL mode (batch): transcribes the single narration.wav ONCE, gets the flat word list (absolute times if
# Wizper returned them), then SPLITS the flat words into beats BY ORDER — walking the beats-tsv
# (beat_id <TAB> narration_text, one line per beat, in order) and assigning each beat the next slice of the
# flat word stream sized to that beat's token count (tokenize narration_text on whitespace). If the Wizper
# word count differs from the script token count, split PROPORTIONALLY by each beat's fraction of total tokens.
# Each beat's start = its first word's start, end = its last word's end. The flat words[] keep ABSOLUTE times.
#   - per-word times present  -> "timing_method":"wizper"
#   - transcript only         -> "timing_method":"even" (split across ffprobe duration by token fraction)
#   - stt failed entirely     -> "timing_method":"estimated", words:[] (max(0.8, tokens/2.5)s per beat) — never fabricate words
#
# PER-BEAT-DIR mode (compat/fallback): for every <beat>.wav in <vo-dir> (filename order, narration.wav
# excluded) it transcribes the beat independently and offsets the words by the cumulative beat start, so the
# flat words[] track is ABSOLUTE timeline time. Same 04-timing.json shape.
#
# Both modes emit:
#   { beats:[{beat,wav,duration,timing_method,words:[{text,start,end}]}],
#     words:[{text,start,end,beat}] (flat absolute), total_duration, source, generated_at }
# Exit 0 if the file was written (even with even/estimated/missing beats); non-zero only if it could not write at all.
set -uo pipefail

dur_of () {  # seconds (float) via ffprobe, else empty
  command -v ffprobe >/dev/null 2>&1 || { echo ""; return; }
  ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" 2>/dev/null || echo ""
}

# ============================================================================
# FULL mode — one transcribe of narration.wav, split flat words into beats by order
# ============================================================================
if [ "${1:-}" = "full" ]; then
  WAV="${2:?usage: words.sh full <narration.wav> <timing-json-out> <beats-tsv>}"
  OUT="${3:?missing timing-json output path}"
  BEATS_TSV="${4:?missing beats-tsv (beat_id<TAB>narration_text per line, in order)}"
  mkdir -p "$(dirname "$OUT")"

  WORKDIR="$(mktemp -d)"
  RAW="$WORKDIR/narration.json"
  DUR="$(dur_of "$WAV")"

  if [ -s "$WAV" ]; then
    if ai-gen audio stt "$WAV" -m fal-ai/wizper > "$RAW" 2>"$WORKDIR/narration.err"; then
      :
    else
      echo "   !! ai-gen stt failed for narration.wav (see stderr); falling back to estimated pacing from the script." >&2
      printf '{"success":false}' > "$RAW"
    fi
  else
    # no wav (TTS silent fallback) — drive estimated pacing purely from the script tokens
    echo "   !! no narration.wav present; emitting estimated pacing from the script." >&2
    printf '{"success":false}' > "$RAW"
  fi

  node - "$RAW" "$OUT" "$BEATS_TSV" "${DUR:-}" <<'NODE'
const fs = require('fs');
const [, , rawPath, outPath, beatsTsv, durStr] = process.argv;

// ---- read beats (beat_id <TAB> narration_text), in order ----
const beatRows = (fs.existsSync(beatsTsv)
  ? fs.readFileSync(beatsTsv, 'utf8').split('\n').filter(Boolean)
  : []
).map(line => {
  const tab = line.indexOf('\t');
  const beatId = (tab === -1 ? line : line.slice(0, tab)).trim();
  const text = tab === -1 ? '' : line.slice(tab + 1);
  const tokens = String(text).split(/\s+/).filter(Boolean);
  return { beatId, text: String(text).trim(), tokens };
});

// ---- pull a word-timestamp array out of whatever shape Wizper/ai-gen returned ----
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

let raw = '';
try { raw = fs.readFileSync(rawPath, 'utf8'); } catch {}
const { words: real, text } = extractWords(raw);

const WAV_REL = 'assets/vo/narration.wav';
const totalTokens = beatRows.reduce((n, b) => n + b.tokens.length, 0);
let probeDur = durStr ? Number(durStr) : NaN;

const beats = [];
const flat = [];
let method;

// Split a flat (absolute-timed) word stream into beats BY ORDER. Each beat takes the next slice sized to its
// token count; if the flat word count differs from the script token count, size proportionally by token
// fraction (so every word is placed and beat boundaries stay monotonic).
function splitWordsIntoBeats(flatWords) {
  const total = flatWords.length;
  let assigned = 0;       // running script-token cursor
  let wordCursor = 0;     // running flat-word cursor
  beatRows.forEach((b, i) => {
    const isLast = i === beatRows.length - 1;
    let take;
    if (total === totalTokens) {
      take = b.tokens.length;                       // exact match: 1:1 slice
    } else if (totalTokens > 0) {
      const end = Math.round(((assigned + b.tokens.length) / totalTokens) * total);
      take = end - wordCursor;                       // proportional slice
    } else {
      take = 0;
    }
    assigned += b.tokens.length;
    if (isLast) take = total - wordCursor;            // last beat mops up any remainder
    take = Math.max(0, Math.min(take, total - wordCursor));
    const slice = flatWords.slice(wordCursor, wordCursor + take);
    wordCursor += take;

    const localWords = slice.map(w => ({ text: w.text, start: w.start, end: w.end }));
    const start = slice.length ? slice[0].start : 0;
    const end = slice.length ? slice[slice.length - 1].end : start;
    const duration = +Math.max(0, end - start).toFixed(3);

    beats.push({ beat: b.beatId, wav: WAV_REL, duration, timing_method: 'wizper', words: localWords });
    for (const w of slice) flat.push({ text: w.text, start: w.start, end: w.end, beat: b.beatId });
  });
}

if (real && real.length) {
  // ---- wizper: real absolute word times -> split by order ----
  method = 'wizper';
  splitWordsIntoBeats(real);
} else if (text) {
  // ---- transcript only: distribute words EVENLY across the wav duration, partitioned by token fraction ----
  method = 'even';
  const allToks = text.split(/\s+/).filter(Boolean);
  if (!Number.isFinite(probeDur) || probeDur <= 0) probeDur = Math.max(0.8, allToks.length / 2.5);
  const step = allToks.length ? probeDur / allToks.length : probeDur;
  const evenWords = allToks.map((t, i) => ({ text: t, start: +(i * step).toFixed(3), end: +((i + 1) * step).toFixed(3) }));
  splitWordsIntoBeats(evenWords);
  // method tag is per-beat below
  for (const bt of beats) bt.timing_method = 'even';
} else {
  // ---- stt failed entirely: estimated pacing from script tokens, NO fabricated words ----
  method = 'estimated';
  let cursor = 0;
  for (const b of beatRows) {
    const beatDur = +Math.max(0.8, b.tokens.length / 2.5).toFixed(3);
    beats.push({ beat: b.beatId, wav: WAV_REL, duration: beatDur, timing_method: 'estimated', words: [] });
    cursor = +(cursor + beatDur).toFixed(3);
  }
}

const total_duration = method === 'estimated'
  ? +beats.reduce((s, b) => s + b.duration, 0).toFixed(3)
  : +(flat.length ? flat[flat.length - 1].end : (Number.isFinite(probeDur) && probeDur > 0 ? probeDur : 0)).toFixed(3);

const doc = {
  beats,
  words: flat,
  total_duration,
  source: 'ai-gen audio stt fal-ai/wizper',
  generated_at: new Date().toISOString()
};
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
const realN = beats.filter(b => b.timing_method === 'wizper').length;
process.stderr.write(`>> wrote ${outPath}: ${beats.length} beats (method=${method}, ${realN} wizper), ${flat.length} words, ${total_duration}s\n`);
NODE
  RC=$?
  rm -rf "$WORKDIR"
  [ -s "$OUT" ] && { echo "$OUT"; exit 0; } || { echo "!! failed to write $OUT (node rc=$RC)" >&2; exit 1; }
fi

# ============================================================================
# PER-BEAT-DIR mode (compat/fallback) — one transcribe per beat wav, offset by cumulative beat start
# ============================================================================
VO_DIR="${1:?usage: words.sh full <narration.wav> <out> <beats-tsv>  |  words.sh <vo-dir> <out>}"
OUT="${2:?missing timing-json output path}"

if [ ! -d "$VO_DIR" ]; then echo "!! vo dir not found: $VO_DIR" >&2; exit 1; fi
mkdir -p "$(dirname "$OUT")"

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
