#!/usr/bin/env python3
"""loop_av.py: the local ffmpeg work and the measurements of video-ambient-loop (WF48-a1 steps 9-16, 20).

  probe   FILE [--loudness]                                           streams, frames, fps, durations, loudness
  check   CLIP --frame PICTURE --out-dir DIR [--name clip] [--stt local] [--silent]
          step 9: first, middle and last frames (and a strip to view), seam against an ordinary frame
          step, sound per second and per 400 ms, a spectrogram to view, optional local speech-to-text
  cell    CLIP --out CELL.mkv [--into CLIP_B] [--blend 1.0] [--gain 2.0] [--silent]
          step 11: the self-closing blend cell (CLIP from its blend point to its end, its last second
          dissolved into the first second of CLIP_B, or of CLIP itself), then measured
  window  CLIP --out WIN.mkv [--window S] [--partial S] [--xfade 0.015] [--gain 1.0] [--silent]
          step 14: one hard-cut window whose own sound closes on itself with a short crossfade
  video   --cells C1 [C2 ...] --n N --out OUT.mp4 [--last CELL] [--tail WIN.mkv] [--music M]
          [--music-gain 0.30] [--work DIR] [--silent]   steps 12, 13, 16: the cells in turn N times (the
          closing cell last), optional music, one encode
  measure VIDEO --cell-s S --n N [--tail-s T] [--audio-from WAV] [--out-dir DIR]
          steps 12 and 16: length, last frame against first, every join in picture and sound
  record  --project P [--artifacts DIR]                               step 20: artifacts/P/run.json

Each command prints one JSON line. Exit 0: done and every figure within its default limit. Exit 1: a
figure over its limit (listed in "over") or the step failed. Exit 2: usage. Exit 3: a tool is missing or
a file cannot be read. The limits are the vendor's numbers, measured on Seedance 2.5 in its own editor
(research:everygen/rainambient-fe45fe#87, #101, #107; WF48-a1 step 9): defaults to re-measure on this
machine's models, never proof. Picture figures are the mean change per pixel on a 0-255 scale at
320 pixels wide; sound figures are EBU R128 momentary loudness (400 ms windows) in LUFS.
Python 3.11, numpy, ffmpeg and ffprobe 5.1 or later.
"""
import argparse
import glob
import json
import os
import shutil
import statistics
import subprocess
import sys
from fractions import Fraction

try:
    import numpy as np
except ImportError:  # the machine bakes numpy (python-imaging pack); never install it (HR21)
    np = None

LIMITS = {
    'seam': 3.2,              # last frame against first, mean change per pixel (vendor T5, fused prompt)
    'level_range_1s': 2.2,    # spread of the per-second level (vendor)
    'level_range_400ms': 3.6,  # spread of the 400 ms level: a standout sound shows here (vendor)
    'end_step': 1.0,          # level of the last second against the first (a plain repeat's step)
    'join_step': 1.0,         # level step across a join in the finished video
}
AW = 320  # analysis width


def emit(code, body):
    print(json.dumps(body, ensure_ascii=False, default=lambda o: round(float(o), 4)))
    sys.exit(code)


def run(cmd, binary=False):
    r = subprocess.run(cmd, capture_output=True)
    if binary:
        return r
    return subprocess.CompletedProcess(r.args, r.returncode, r.stdout.decode('utf-8', 'replace'), r.stderr.decode('utf-8', 'replace'))


def tools():
    missing = [t for t in ('ffmpeg', 'ffprobe') if shutil.which(t) is None]
    if np is None:
        missing.append('numpy')
    if missing:
        emit(3, {'error': f"missing on this machine: {', '.join(missing)} (report it, never install it: HR21)"})


def r4(x):
    return None if x is None else round(float(x), 4)


def rate(txt):
    try:
        f = Fraction(txt)
        return f if f > 0 else None
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def probe(path):
    if not os.path.exists(path) or not os.path.getsize(path):
        emit(3, {'error': f'{path}: missing or empty'})
    r = run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries',
             'stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames,duration,sample_rate,channels:format=duration',
             '-of', 'json', path])
    if r.returncode:
        emit(3, {'error': f'ffprobe cannot read {path}: {r.stderr.strip()[:300]}'})
    j = json.loads(r.stdout)
    v = next((s for s in j['streams'] if s['codec_type'] == 'video' and s.get('width')), None)
    a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), None)
    fmt = float(j.get('format', {}).get('duration') or 0)
    info = {'file': path, 'container_s': r4(fmt)}
    if v:
        fps = rate(v.get('avg_frame_rate')) or rate(v.get('r_frame_rate'))
        if not fps:
            emit(3, {'error': f'{path}: no frame rate'})
        frames = int(v.get('nb_read_frames') or 0)
        info.update({'width': v['width'], 'height': v['height'], 'fps': float(fps), 'fps_rational': f'{fps.numerator}/{fps.denominator}',
                     'frames': frames, 'video_s': r4(frames / fps) if frames else r4(float(v.get('duration') or fmt)),
                     'vfr': v.get('avg_frame_rate') != v.get('r_frame_rate')})
    if a:
        info.update({'audio_s': r4(float(a.get('duration') or fmt)), 'sample_rate': int(a.get('sample_rate') or 0), 'channels': a.get('channels')})
    return info


def frame_stream(path, width=AW):
    """Decode the video at analysis size, one RGB frame at a time."""
    info = probe(path)
    h = max(2, int(round(info['height'] * width / info['width'] / 2.0)) * 2)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-map', '0:v:0', '-vf',
                          f'scale={width}:{h}:flags=area,format=rgb24', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    size = width * h * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, width, 3)
    p.wait()


def still(path, width, height):
    r = run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-frames:v', '1', '-vf',
             f'scale={width}:{height}:flags=area,format=rgb24', '-f', 'rawvideo', '-'], binary=True)
    if r.returncode or len(r.stdout) < width * height * 3:
        emit(3, {'error': f'cannot decode {path}'})
    return np.frombuffer(r.stdout[:width * height * 3], np.uint8).reshape(height, width, 3)


def diff(a, b):
    return float(np.abs(a.astype(np.int16) - b.astype(np.int16)).mean())


def picture_figures(path, picture=None, tail_s=1.5, fps=None, total=None):
    """Seam (last against first), the ordinary frame step, and (for a clip) where it comes closest to frame 0."""
    first = prev = None
    steps = []
    tail = []
    n = 0
    tail_from = total - int(round(tail_s * fps)) if (total and fps) else None
    for f in frame_stream(path):
        if first is None:
            first = f
        else:
            steps.append(diff(f, prev))
        if tail_from is not None and n >= tail_from:
            tail.append((n, diff(f, first)))
        prev = f
        n += 1
    if first is None:
        emit(3, {'error': f'{path}: no decodable frame'})
    s = sorted(steps) or [0.0]
    fig = {'frames_decoded': n, 'seam_last_vs_first': r4(diff(prev, first)),
           'step_median': r4(statistics.median(s)), 'step_p90': r4(s[int(0.9 * (len(s) - 1))]), 'step_max': r4(s[-1])}
    if picture:
        h, w = first.shape[:2]
        pic = still(picture, w, h)
        fig['first_vs_picture'] = r4(diff(first, pic))
        fig['last_vs_picture'] = r4(diff(prev, pic))
    if tail:
        idx, val = min(tail, key=lambda x: x[1])
        fig['best_return_frame'] = idx
        fig['best_return_s'] = r4(idx / fps) if fps else None
        fig['best_return_vs_first'] = r4(val)
    return fig, steps


def momentary(path, audio_from=None):
    """EBU R128 momentary loudness every 100 ms: [(t, M)], and the integrated loudness."""
    src = audio_from or path
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-nostdin', '-i', src, '-map', '0:a:0', '-af',
             'ebur128=framelog=info', '-f', 'null', '-'])
    if r.returncode:
        return None, None
    pts = []
    integrated = None
    for line in r.stderr.splitlines():
        if 'TARGET' in line and 'M:' in line:
            try:
                t = float(line.split('t:')[1].split()[0])
                m = line.split('M:')[1].split()[0]
                pts.append((t, -120.0 if 'inf' in m else max(-120.0, float(m))))
            except (IndexError, ValueError):
                continue
    at = r.stderr.rfind('Summary:')
    if at >= 0:
        seg = r.stderr[at:]
        try:
            v = seg.split('I:')[1].split('LUFS')[0].strip()
            integrated = None if 'inf' in v else float(v)
        except IndexError:
            pass
    return pts, integrated


def energy_mean(vals):
    if not vals:
        return None
    return 10 * np.log10(np.mean([10 ** (v / 10.0) for v in vals]))


def sound_figures(path, duration, audio_from=None):
    pts, integrated = momentary(path, audio_from)
    if not pts:
        return {'audio': False}
    valid = [(t, m) for t, m in pts if 0.4 <= t <= duration + 0.05]
    ms = [m for _, m in valid]
    if not ms:
        return {'audio': True, 'too_short': True}
    secs = []
    k = 0
    while k + 1 <= duration + 1e-6:
        vals = [m for t, m in valid if k + 0.4 <= t <= k + 1.0 + 1e-6]
        if vals:
            secs.append(float(energy_mean(vals)))
        k += 1
    fig = {'audio': True, 'loudness_I': r4(integrated), 'level_1s': [round(x, 2) for x in secs],
           'level_range_1s': r4(max(secs) - min(secs)) if len(secs) > 1 else 0.0,
           'level_range_400ms': r4(max(ms) - min(ms)), 'standout_db': r4(max(ms) - statistics.median(ms)),
           'median_momentary': r4(statistics.median(ms))}
    if len(secs) > 1:
        fig['end_step_db'] = r4(abs(secs[-1] - secs[0]))
        x = np.arange(len(secs))
        fig['trend_db'] = r4(float(np.polyfit(x, secs, 1)[0]) * (len(secs) - 1))
    fig['silent'] = statistics.median(ms) < -70
    return fig


def join_steps(pts, joins):
    """Level step across each join: the 400 ms just before against the 400 ms just after."""
    if not pts:
        return []
    ts = np.array([t for t, _ in pts])
    out = []
    for j in joins:
        b = pts[int(np.argmin(np.abs(ts - j)))][1]
        a = pts[int(np.argmin(np.abs(ts - (j + 0.4))))][1]
        out.append(round(abs(a - b), 2))
    return out


def over_list(fig, keys):
    out = []
    for k, lim in keys:
        v = fig.get(k)
        if v is not None and v > lim:
            out.append({'figure': k, 'value': v, 'limit': lim})
    return out


def stt_local(path, work):
    """Words heard in the clip's sound by the machine's faster-whisper, if its weights load offline."""
    try:
        from faster_whisper import WhisperModel  # baked on the Image machine (layer 3); never fetched
    except Exception as e:  # noqa: BLE001
        return {'method': 'faster-whisper', 'ran': False, 'why': f'not importable ({type(e).__name__})'}
    wav = os.path.join(work, 'voices.wav')
    r = run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', path, '-vn', '-ac', '1', '-ar', '16000', wav])
    if r.returncode:
        return {'method': 'faster-whisper', 'ran': False, 'why': 'no audio to screen'}
    try:
        model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True)
        segs, _ = model.transcribe(wav, vad_filter=True, condition_on_previous_text=False, beam_size=5)
        text = ' '.join(s.text.strip() for s in segs).strip()
    except Exception as e:  # noqa: BLE001
        return {'method': 'faster-whisper small', 'ran': False, 'why': f'model did not load offline ({type(e).__name__})'}
    words = len([w for w in text.split() if any(c.isalpha() for c in w)])
    return {'method': 'faster-whisper small (VAD on)', 'ran': True, 'words': words, 'text': text[:300],
            'note': 'speech-to-text can invent words in noise: read the spectrogram too'}


def cmd_probe(a):
    info = probe(a.file)
    if a.loudness and info.get('audio_s') is not None:
        _, integrated = momentary(a.file)
        info['loudness_I'] = r4(integrated)
        info['reference'] = 'vendor: Lyria tracks near -15.5 dBFS; clip rain at -36 to -43 dBFS (#105)'
    emit(0, info)


def cmd_check(a):
    info = probe(a.clip)
    if 'frames' not in info:
        emit(1, {'check': 'clip', 'file': a.clip, 'fails': ['no video stream']})
    os.makedirs(a.out_dir, exist_ok=True)
    name = a.name
    files = {k: os.path.join(a.out_dir, f'{name}-{k}.png') for k in ('first', 'middle', 'last')}
    run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', a.clip, '-map', '0:v:0', '-frames:v', '1', files['first']])
    run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-ss', str(info['video_s'] / 2), '-i', a.clip, '-map', '0:v:0', '-frames:v', '1', files['middle']])
    run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-ss', str(max(0, info['video_s'] - 1.0)), '-i', a.clip, '-map', '0:v:0', '-update', '1', files['last']])
    files['strip'] = os.path.join(a.out_dir, f'{name}-frames.png')
    run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', a.frame, '-i', files['first'], '-i', files['middle'], '-i', files['last'],
         '-filter_complex', '[0]scale=-2:360[p];[1]scale=-2:360[f];[2]scale=-2:360[m];[3]scale=-2:360[l];[p][f][m][l]hstack=inputs=4',
         '-frames:v', '1', files['strip']])
    fig, _ = picture_figures(a.clip, picture=a.frame, fps=info['fps'], total=info['frames'])
    fig.update({k: info.get(k) for k in ('video_s', 'audio_s', 'frames', 'fps', 'width', 'height', 'vfr')})
    over = over_list(fig, [('seam_last_vs_first', LIMITS['seam'])])
    redo = []
    notes = []
    if a.silent:
        fig['sound'] = {'audio': 'not checked (silent route)'}
    else:
        snd = sound_figures(a.clip, info['video_s'])
        fig['sound'] = snd
        if not snd.get('audio'):
            redo.append('no sound in the clip: the rain sound is the product (re-film with the audio flag pinned on)')
        elif snd.get('silent'):
            redo.append('the clip sound is silent')
        else:
            so = over_list(snd, [('level_range_1s', LIMITS['level_range_1s']), ('level_range_400ms', LIMITS['level_range_400ms']), ('end_step_db', LIMITS['end_step'])])
            over += so
            if any(o['figure'] == 'level_range_400ms' for o in so):
                redo.append('a standout sound: the 400 ms level spreads over its limit (it would return at every repeat)')
        if info.get('audio_s') is not None:
            fig['audio_ends_early_s'] = r4(info['video_s'] - info['audio_s'])
        files['spectrogram'] = os.path.join(a.out_dir, f'{name}-spectrum.png')
        run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', a.clip, '-lavfi', 'showspectrumpic=s=1024x512:legend=1', files['spectrogram']])
        if a.stt == 'local':
            v = stt_local(a.clip, a.out_dir)
            fig['voices'] = v
            if v.get('ran') and v.get('words', 0) > 0:
                redo.append(f"voices: speech-to-text heard {v['words']} word(s)")
    if a.seen and a.seen.lower() != 'ok':
        redo.append(f'seen by eye: {a.seen}')
    body = {'check': 'clip', 'file': a.clip, 'seen': a.seen, 'figures': fig, 'limits': LIMITS, 'over': over, 'redo_reasons': redo,
            'files': files, 'look_at': [files['strip']] + ([files['spectrogram']] if 'spectrogram' in files else []),
            'notes': notes + ['exit 1 only for a redo reason; figures in over are reported beside their control, not redo reasons',
                              'view the strip: redo only for a person or animal, any writing, rising smoke or steam, or a different place',
                              'limits are vendor numbers from Seedance 2.5: report each figure beside step_median, its control']}
    with open(os.path.join(a.out_dir, f'{name}-check.json'), 'w', encoding='utf-8') as f:
        json.dump(body, f, indent=2, default=r4)
    emit(1 if redo else 0, body)


def audio_chain(label, sr, start_s, end_s, pad_to_s=None):
    """atrim by samples (exact), after an optional pad to a fixed length."""
    pre = f'apad,atrim=end_sample={int(round(pad_to_s * sr))},' if pad_to_s else ''
    return f'{label}aformat=sample_fmts=fltp,{pre}asetpts=PTS-STARTPTS,atrim=start_sample={int(round(start_s * sr))}:end_sample={int(round(end_s * sr))},asetpts=PTS-STARTPTS'


def encode_intermediate(cmd_tail):
    return cmd_tail + ['-c:v', 'ffv1', '-level', '3', '-c:a', 'pcm_f32le']


def measure_cell(path, expected_s, silent, check='cell'):
    info = probe(path)
    fig, _ = picture_figures(path)
    fig.update({'duration_s': info.get('video_s'), 'audio_s': info.get('audio_s'), 'frames': info.get('frames'), 'expected_s': r4(expected_s)})
    over = over_list(fig, [('seam_last_vs_first', LIMITS['seam'])])
    frame_s = 1.0 / info['fps']
    if abs(info['video_s'] - expected_s) > frame_s + 1e-6:
        over.append({'figure': 'duration_s', 'value': info['video_s'], 'limit': f'{r4(expected_s)} plus or minus one frame'})
    if not silent:
        snd = sound_figures(path, info['video_s'])
        fig['sound'] = snd
        if not snd.get('audio') or snd.get('silent'):
            over.append({'figure': 'sound', 'value': 'none', 'limit': 'the rain sound throughout'})
        else:
            over += over_list(snd, [('level_range_1s', LIMITS['level_range_1s'])])
        if info.get('audio_s') is not None and abs(info['audio_s'] - info['video_s']) > frame_s:
            over.append({'figure': 'audio_s', 'value': info['audio_s'], 'limit': f"{info['video_s']} plus or minus one frame"})
    return fig, over


def cmd_cell(a):
    x = probe(a.clip)
    y = probe(a.into) if a.into else x
    if 'frames' not in x or 'frames' not in y:
        emit(1, {'check': 'cell', 'fails': ['no video stream']})
    if (x['width'], x['height'], x['fps_rational']) != (y['width'], y['height'], y['fps_rational']):
        emit(1, {'check': 'cell', 'fails': [f"the clips differ in size or frame rate ({x['width']}x{x['height']} {x['fps_rational']} against {y['width']}x{y['height']} {y['fps_rational']}): film them with the same settings"]})
    fps = Fraction(x['fps_rational'])
    F = x['frames']
    bf = int(round(a.blend * fps))
    b = bf / fps
    if F < 2 * bf + 1:
        emit(1, {'check': 'cell', 'fails': [f'{F} frames is too short for a {float(b)} s blend']})
    W = Fraction(F) / fps
    offset = float((F - 2 * bf) / fps)
    cell_s = float((F - bf) / fps)
    v = (f'[0:v]format=yuv420p,trim=start_frame={bf},setpts=PTS-STARTPTS[va];'
         f'[{1 if a.into else 0}:v]format=yuv420p,trim=end_frame={bf},setpts=PTS-STARTPTS[vb];'
         f'[va][vb]xfade=transition=fade:duration={float(b):.6f}:offset={offset:.6f},format=yuv420p[v]')
    inputs = ['-i', a.clip] + (['-i', a.into] if a.into else [])
    maps = ['-map', '[v]']
    if not a.silent:
        if x.get('sample_rate') is None or y.get('sample_rate') is None:
            emit(1, {'check': 'cell', 'fails': ['no audio stream: the rain sound is the product (or pass --silent for the silent route)']})
        sr = x['sample_rate']
        wy = Fraction(y['frames']) / fps
        if a.into:
            aud = (audio_chain('[0:a]', sr, float(b), float(W), pad_to_s=float(W)) + '[aa];' +
                   audio_chain('[1:a]', sr, 0, float(b), pad_to_s=float(wy)) + '[ab];')
        else:
            aud = (f'[0:a]aformat=sample_fmts=fltp,apad,atrim=end_sample={int(round(float(W) * sr))},asetpts=PTS-STARTPTS,asplit=2[a0][a1];'
                   f'[a0]atrim=start_sample={int(round(float(b) * sr))},asetpts=PTS-STARTPTS[aa];'
                   f'[a1]atrim=end_sample={int(round(float(b) * sr))},asetpts=PTS-STARTPTS[ab];')
        v += ';' + aud + f'[aa][ab]acrossfade=d={float(b):.6f}:c1=qsin:c2=qsin,volume={a.gain}[a]'
        maps += ['-map', '[a]']
    cmd = encode_intermediate(['ffmpeg', '-v', 'error', '-y', '-nostdin'] + inputs + ['-filter_complex', v] + maps) + [a.out]
    if a.silent:
        cmd = [c for c in cmd if c not in ('-c:a', 'pcm_f32le')] + []
        cmd.insert(-1, '-an')
    r = run(cmd)
    if r.returncode:
        emit(1, {'check': 'cell', 'fails': [f'ffmpeg failed: {r.stderr.strip()[-600:]}'], 'filter': v})
    fig, over = measure_cell(a.out, cell_s, a.silent)
    fig.update({'window_s': r4(float(W)), 'frames_in': F, 'fps': float(fps), 'blend_s': r4(float(b)), 'gain': a.gain, 'into': a.into})
    emit(1 if over else 0, {'check': 'cell', 'out': a.out, 'cell_s': r4(cell_s), 'figures': fig, 'limits': LIMITS, 'over': over})


def cmd_window(a):
    x = probe(a.clip)
    if 'frames' not in x:
        emit(1, {'check': 'window', 'fails': ['no video stream']})
    fps = Fraction(x['fps_rational'])
    audio_s = x.get('audio_s') if not a.silent else x['video_s']
    if audio_s is None:
        emit(1, {'check': 'window', 'fails': ['no audio stream (or pass --silent)']})
    if a.partial:
        win = a.partial
    elif a.window:
        win = a.window
    else:
        win = min(x['video_s'], audio_s) - 0.1  # its sound ends a little before its picture (#76, #101)
    wf = int(win * fps)  # whole frames, rounded down
    W = Fraction(wf) / fps
    xs = 0.0 if a.partial else a.xfade
    if float(W) + xs > min(x['video_s'], audio_s) + 1e-6:
        emit(1, {'check': 'window', 'fails': [f'a {float(W)} s window plus a {xs} s crossfade runs past the clip ({x["video_s"]} s picture, {audio_s} s sound)']})
    v = f'[0:v]format=yuv420p,trim=end_frame={wf},setpts=PTS-STARTPTS[v]'
    maps = ['-map', '[v]']
    if not a.silent:
        sr = x['sample_rate']
        n_w = int(round(float(W) * sr))
        n_x = int(round(xs * sr))
        if n_x:
            # A = sound [x, W + x] blends at its end into [0, x]: the window ends where it starts (as the blend cell, at 15 ms).
            v += (f';[0:a]aformat=sample_fmts=fltp,asplit=2[a0][a1];'
                  f'[a0]atrim=start_sample={n_x}:end_sample={n_w + n_x},asetpts=PTS-STARTPTS[aa];'
                  f'[a1]atrim=end_sample={n_x},asetpts=PTS-STARTPTS[ab];'
                  f'[aa][ab]acrossfade=ns={n_x}:c1=tri:c2=tri,volume={a.gain}[a]')
        else:
            v += f';[0:a]aformat=sample_fmts=fltp,atrim=end_sample={n_w},asetpts=PTS-STARTPTS,volume={a.gain}[a]'
        maps += ['-map', '[a]']
    cmd = encode_intermediate(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', a.clip, '-filter_complex', v] + maps) + [a.out]
    if a.silent:
        cmd = [c for c in cmd if c not in ('-c:a', 'pcm_f32le')]
        cmd.insert(-1, '-an')
    r = run(cmd)
    if r.returncode:
        emit(1, {'check': 'window', 'fails': [f'ffmpeg failed: {r.stderr.strip()[-600:]}'], 'filter': v})
    fig, over = measure_cell(a.out, float(W), a.silent, check='window')
    if a.partial:  # the last, shorter window ends the video: it does not lead back into the start
        over = [o for o in over if o['figure'] != 'seam_last_vs_first']
    if not a.silent and fig.get('sound', {}).get('end_step_db') is not None:
        over += over_list(fig['sound'], [('end_step_db', LIMITS['end_step'])])
    fig.update({'window_s': r4(float(W)), 'crossfade_s': xs, 'gain': a.gain, 'partial': bool(a.partial)})
    # a seam inside one window is not its join (the windows are the fallback): figures are reported, exit 1 only for a failed build (review R12)
    emit(0, {'check': 'window', 'out': a.out, 'window_s': r4(float(W)), 'figures': fig, 'limits': LIMITS, 'over': over,
                            'notes': ['a hard cut shows the clip\'s own last-to-first change at every join: its seam figure is the join']})


def band_share(rain_wav, music_wav, sr=22050):
    """Share of 100 ms moments in which the rain is louder than the music above 2,000 Hz (vendor: median 94%)."""
    def pcm(f):
        r = run(['ffmpeg', '-v', 'error', '-nostdin', '-i', f, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], binary=True)
        return np.frombuffer(r.stdout, np.float32)
    x, y = pcm(rain_wav), pcm(music_wav)
    n = min(len(x), len(y))
    hop = sr // 10
    win = np.hanning(hop)
    freqs = np.fft.rfftfreq(hop, 1.0 / sr)
    hi = freqs >= 2000
    wins = 0
    rain_wins = 0
    for i in range(0, n - hop, hop):
        ex = np.sum(np.abs(np.fft.rfft(x[i:i + hop] * win))[hi] ** 2)
        ey = np.sum(np.abs(np.fft.rfft(y[i:i + hop] * win))[hi] ** 2)
        if ey < 1e-9:
            continue
        wins += 1
        rain_wins += ex > ey
    return None if not wins else round(rain_wins / wins, 3)


def cmd_video(a):
    cells = [probe(c) for c in a.cells]
    work = a.work or os.path.dirname(os.path.abspath(a.out))
    os.makedirs(work, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    if len(a.cells) > 1 and not a.last:
        emit(2, {'error': 'several cells (variety) need --last: the closing cell, built with cell <clip number ((N-1) mod clips)+1> --into <clip A>, so the end leads into the start'})
    seq = [a.cells[i % len(a.cells)] for i in range(a.n - 1)] + [a.last or a.cells[(a.n - 1) % len(a.cells)]]
    if a.tail:
        seq.append(a.tail)
    lst = os.path.join(work, 'cells.txt')
    with open(lst, 'w', encoding='utf-8') as f:
        for c in seq:
            f.write("file '" + os.path.abspath(c).replace("'", "'\\''") + "'\n")
    durs = {c: p['video_s'] for c, p in zip(a.cells, cells)}
    if a.last:
        durs[a.last] = probe(a.last)['video_s']
    if a.tail:
        durs[a.tail] = probe(a.tail)['video_s']
    expected = sum(durs[c] for c in seq)
    base = ['ffmpeg', '-v', 'error', '-y', '-nostdin', '-f', 'concat', '-safe', '0', '-i', lst]
    enc_v = ['-c:v', 'libx264', '-crf', str(a.crf), '-preset', 'medium', '-pix_fmt', 'yuv420p']
    enc_a = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
    stems = {}
    figures = {'n': a.n, 'cells': len(seq), 'expected_s': r4(expected)}
    if a.silent:
        cmd = base + ['-map', '0:v:0', '-an'] + enc_v + ['-movflags', '+faststart', a.out]
    elif a.music:
        mus = probe(a.music)
        D = min(mus.get('audio_s') or 0, expected)
        if D < 4:
            emit(1, {'check': 'video', 'fails': [f'music track of {mus.get("audio_s")} s is too short to fade']})
        mchain = (f'[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=end={D:.4f},asetpts=PTS-STARTPTS,'
                  f'afade=t=in:d=1,afade=t=out:st={D - 3:.4f}:d=3,volume={a.music_gain}')
        rchain = '[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo'
        fc = f'{rchain}[r];{mchain}[m];[r][m]amix=inputs=2:duration=first:normalize=0[a]'
        cmd = base + ['-i', a.music, '-filter_complex', fc, '-map', '0:v:0', '-map', '[a]'] + enc_v + enc_a + ['-movflags', '+faststart', a.out]
        stems = {'rain': os.path.join(work, 'rain-bed.wav'), 'music': os.path.join(work, 'music-as-mixed.wav')}
        run(base + ['-map', '0:a:0', '-af', 'aresample=48000,aformat=channel_layouts=stereo', stems['rain']])
        run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', a.music, '-af', mchain.replace('[1:a]', ''), stems['music']])
        figures['music_s'] = mus.get('audio_s')
        figures['music_gain'] = a.music_gain
        figures['music_ends_early_s'] = r4(expected - D) if D < expected else 0.0
    else:
        cmd = base + ['-map', '0:v:0', '-map', '0:a:0'] + enc_v + enc_a + ['-movflags', '+faststart', a.out]
    r = run(cmd)
    if r.returncode:
        emit(1, {'check': 'video', 'fails': [f'ffmpeg failed: {r.stderr.strip()[-600:]}']})
    info = probe(a.out)
    figures.update({'duration_s': info.get('video_s'), 'audio_s': info.get('audio_s'), 'width': info.get('width'), 'height': info.get('height'), 'fps': info.get('fps')})
    over = []
    if abs((info.get('video_s') or 0) - expected) > 1.0 / info['fps'] + 1e-6:
        over.append({'figure': 'duration_s', 'value': info.get('video_s'), 'limit': f'{r4(expected)} plus or minus one frame'})
    if stems:
        _, ri = momentary(stems['rain'])
        _, mi = momentary(stems['music'])
        figures['rain_I'] = r4(ri)
        figures['music_I'] = r4(mi)
        figures['music_over_rain_db'] = r4(mi - ri) if ri is not None and mi is not None else None
        figures['rain_above_2k_share'] = band_share(stems['rain'], stems['music'])
        figures['reference'] = 'vendor (Lyria solo felt piano only): at gain 0.30 the piano sat roughly 8 dB over the rain; above 2 kHz the rain led in a median 94% of 100 ms moments'
    emit(1 if over else 0, {'check': 'video', 'out': a.out, 'figures': figures, 'stems': stems, 'list': lst, 'over': over})


def cmd_measure(a):
    info = probe(a.video)
    fig, steps = picture_figures(a.video)
    fps = info['fps']
    expected = a.cell_s * a.n + (a.tail_s or 0)
    fig.update({k: info.get(k) for k in ('video_s', 'audio_s', 'frames', 'fps', 'width', 'height', 'vfr')})
    fig['expected_s'] = r4(expected)
    over = [] if a.tail_s else over_list(fig, [('seam_last_vs_first', LIMITS['seam'])])  # a tail window ends on its own
    if abs(info['video_s'] - expected) > 1.0 / fps + 1e-6:
        over.append({'figure': 'video_s', 'value': info['video_s'], 'limit': f'{r4(expected)} plus or minus one frame'})
    if a.asked_s and abs(info['video_s'] - a.asked_s) > 0.05 * a.asked_s:
        over.append({'figure': 'length_vs_asked', 'value': info['video_s'], 'limit': f'{r4(a.asked_s)} plus or minus 5% (record as a debt, HR15)'})
    joins_t = [a.cell_s * k for k in range(1, a.n)] + ([a.cell_s * a.n] if a.tail_s else [])
    jf = [int(round(t * fps)) for t in joins_t]
    picture_joins = [round(steps[i - 1], 3) for i in jf if 0 < i <= len(steps)]
    fig['join_picture'] = picture_joins
    fig['join_picture_max'] = max(picture_joins) if picture_joins else None
    if picture_joins and fig['join_picture_max'] > LIMITS['seam']:
        over.append({'figure': 'join_picture_max', 'value': fig['join_picture_max'], 'limit': LIMITS['seam']})
    if info.get('audio_s') is not None or a.audio_from:
        pts, integrated = momentary(a.video, a.audio_from)
        snd = sound_figures(a.video, info['video_s'], a.audio_from)
        js = join_steps(pts, joins_t)
        snd['join_steps_db'] = js
        snd['join_step_max_db'] = max(js) if js else None
        fig['sound'] = snd
        fig['sound_measured_on'] = a.audio_from or a.video
        if js and max(js) > LIMITS['join_step']:
            over.append({'figure': 'join_step_max_db', 'value': max(js), 'limit': LIMITS['join_step']})
        if a.audio_from is None and not snd.get('audio'):
            over.append({'figure': 'sound', 'value': 'none', 'limit': 'sound present'})
    body = {'check': 'video', 'file': a.video, 'figures': fig, 'limits': LIMITS, 'over': over,
            'notes': ['each join figure sits beside step_median, the ordinary frame step of the same video']}
    if a.out_dir:
        os.makedirs(a.out_dir, exist_ok=True)
        with open(os.path.join(a.out_dir, 'video-check.json'), 'w', encoding='utf-8') as f:
            json.dump(body, f, indent=2, default=r4)
    emit(1 if over else 0, body)


def cmd_record(a):
    art = os.path.join(a.artifacts, a.project)
    state_p = os.path.join(art, 'loop.json')
    if not os.path.exists(state_p):
        emit(2, {'error': f'no {state_p}: run loop_decide.py decide first'})
    with open(state_p, encoding='utf-8') as f:
        state = json.load(f)
    checks = {}
    for p in sorted(glob.glob(os.path.join(art, 'qc', '*-check.json'))):
        with open(p, encoding='utf-8') as f:
            checks[os.path.basename(p)[:-11]] = json.load(f)
    rows = []
    est = led = 0.0
    mp = os.path.join(art, 'manifest.json')
    if os.path.exists(mp):
        with open(mp, encoding='utf-8') as f:
            for r in json.load(f).get('assets', []):
                c = r.get('credits') or {}
                rows.append({'id': r.get('id'), 'endpoint': r.get('endpoint') or r.get('tool'), 'status': r.get('status'),
                             'estimate': c.get('estimate'), 'ledger': c.get('ledger'), 'lever': r.get('lever')})
                est += float(c.get('estimate') or 0)
                led += float(c.get('ledger') or 0)
    run_rec = {'schema': 'sl8.video-ambient-loop.run/1', 'project': a.project, 'decided': state.get('decided'),
               'prompts': state.get('prompts'), 'lines': state.get('lines'), 'history': state.get('history'),
               'measured_on': {'video_model': (state.get('decided') or {}).get('video_model'),
                               'music_model': (state.get('decided') or {}).get('music_model')},
               'checks': checks, 'limits': LIMITS,
               'limits_note': 'vendor numbers from Seedance 2.5; the figures above are measured on the model named in measured_on',
               'cost': {'estimate_credits': est, 'ledger_credits': led, 'rows': rows,
                        'vendor_headline': 'about 31 Everygen credits, 33 with music (not SL8 credits)'}}
    debts = []
    clipc = checks.get('clip') or {}
    if not clipc.get('seen'):
        debts.append('looked: no (the clip frames were not recorded as seen; pass --seen to the clip check) (HR15)')
    if clipc and not (((clipc.get('figures') or {}).get('voices') or {}).get('ran')):
        debts.append('voice screen: faster-whisper did not run; only the spectrogram by eye (or the Scribe route) checked voices (HR15)')
    run_rec['debts'] = debts
    out = os.path.join(art, 'run.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(run_rec, f, indent=2, default=r4)
    emit(0, {'ok': True, 'run': out, 'debts': debts, 'checks': sorted(checks), 'estimate_credits': est, 'ledger_credits': led})


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('probe'); s.add_argument('file'); s.add_argument('--loudness', action='store_true')
    s = sub.add_parser('check'); s.add_argument('clip'); s.add_argument('--frame', required=True); s.add_argument('--out-dir', required=True)
    s.add_argument('--name', default='clip'); s.add_argument('--stt', choices=['local', 'none'], default='none'); s.add_argument('--silent', action='store_true'); s.add_argument('--seen', help='what the look at qc/clip-frames.png showed: ok, or the redo reason')
    s = sub.add_parser('cell'); s.add_argument('clip'); s.add_argument('--out', required=True); s.add_argument('--into')
    s.add_argument('--blend', type=float, default=1.0); s.add_argument('--gain', type=float, default=2.0); s.add_argument('--silent', action='store_true')
    s = sub.add_parser('window'); s.add_argument('clip'); s.add_argument('--out', required=True); s.add_argument('--window', type=float)
    s.add_argument('--partial', type=float); s.add_argument('--xfade', type=float, default=0.015); s.add_argument('--gain', type=float, default=1.0)
    s.add_argument('--silent', action='store_true')
    s = sub.add_parser('video'); s.add_argument('--cells', nargs='+', required=True); s.add_argument('--n', type=int, required=True)
    s.add_argument('--out', required=True); s.add_argument('--tail'); s.add_argument('--last'); s.add_argument('--music'); s.add_argument('--music-gain', type=float, default=0.30)
    s.add_argument('--work'); s.add_argument('--silent', action='store_true'); s.add_argument('--crf', type=int, default=18)
    s = sub.add_parser('measure'); s.add_argument('video'); s.add_argument('--cell-s', type=float, required=True); s.add_argument('--n', type=int, required=True)
    s.add_argument('--tail-s', type=float); s.add_argument('--asked-s', type=float); s.add_argument('--audio-from'); s.add_argument('--out-dir')
    s = sub.add_parser('record'); s.add_argument('--project', required=True); s.add_argument('--artifacts', default='artifacts')
    try:
        a = p.parse_args()
    except SystemExit as e:
        sys.exit(2 if e.code else 0)
    if a.cmd != 'record':
        tools()
    {'probe': cmd_probe, 'check': cmd_check, 'cell': cmd_cell, 'window': cmd_window, 'video': cmd_video,
     'measure': cmd_measure, 'record': cmd_record}[a.cmd](a)


if __name__ == '__main__':
    main()
