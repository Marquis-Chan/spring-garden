"""Extend genuine short calls at native speed and make dog feedback more audible.

No generation, stretching, or added substitute animal sounds. Preserved processed
single calls make this script idempotent; raw source recordings remain untouched.
"""
from pathlib import Path
import hashlib
import json
import math
import shutil
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
files = [ROOT / 'assets/credits.json', ROOT / 'assets/forest-credits.json']
groups = [json.loads(p.read_text(encoding='utf-8')) for p in files]
minimum = next(c['duration'] for g in groups for c in g if c['id'] == 'cat')
preserved = ROOT / 'assets/audio/feedback-original'
preserved.mkdir(parents=True, exist_ok=True)


def db(value):
    return round(float(20 * np.log10(max(float(value), 1e-10))), 2)


def active_rms(signal, sr):
    n = round(sr * .04)
    levels = np.array([np.sqrt(np.mean(signal[i:i+n]**2))
                       for i in range(0, len(signal)-n+1, n)])
    threshold = max(float(np.quantile(levels, .5)), float(levels.max()) * .16)
    return float(np.sqrt(np.mean(levels[levels >= threshold]**2)))


report = []
for group in groups:
    for credit in group:
        output = ROOT / 'assets' / credit['file']
        base = preserved / (credit['id'] + '.wav')
        changed = credit['duration'] < minimum - .001 or credit['id'] == 'dog' or base.exists()
        if changed and not base.exists():
            shutil.copyfile(output, base)
        with wave.open(str(base if changed else output), 'rb') as source:
            assert source.getnchannels() == 1 and source.getsampwidth() == 2
            sr = source.getframerate()
            call = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2').astype(float) / 32768
        seconds = len(call) / sr
        # 实际叫声材料本身达到参照长度，不靠补静音凑时长。
        repetitions = max(1, math.ceil((minimum - .001) / seconds))
        gap_seconds = .25 if credit['id'] == 'woodpecker' else .18
        gap = np.zeros(round(sr * gap_seconds))
        gain = 10 ** (3 / 20) if credit['id'] == 'dog' else 1
        call = call * min(gain, 10 ** (-2 / 20) / max(float(np.max(np.abs(call))), 1e-9))
        response = np.concatenate([part for i in range(repetitions)
                                   for part in ([gap, call] if i else [call])])
        if changed:
            pcm = np.round(response * 32768).astype('<i2')
            with wave.open(str(output), 'wb') as target:
                target.setnchannels(1)
                target.setsampwidth(2)
                target.setframerate(sr)
                target.writeframes(pcm.tobytes())
            credit['offset'] = 0
            credit['duration'] = len(response) / sr
            if repetitions > 1:
                credit['responseSequence'] = dict(
                    repetitions=repetitions, callSeconds=seconds,
                    gapSeconds=gap_seconds, preservedCallFile='audio/feedback-original/' + base.name,
                    preservedCallSha256=hashlib.sha256(base.read_bytes()).hexdigest())
            processing = credit['processing'].split('; Feedback revision:')[0]
            credit['processing'] = processing + (
                '; Feedback revision: original-speed complete processed call repeated '
                f'{repetitions} times with {gap_seconds:.2f}s gaps; no pitch/time change; '
                + ('dog gain +3dB subject to -2dBFS peak ceiling' if credit['id'] == 'dog'
                   else 'original call level preserved'))
        # 响度衡量只使用实际叫声段，避免停顿影响归一化统计。
        credit['activeDbfs'] = db(active_rms(call, sr))
        credit['peakDbfs'] = db(np.max(np.abs(call)))
        report.append(dict(id=credit['id'], duration=credit['duration'],
                           audibleMaterialSeconds=seconds*repetitions,
                           repetitions=repetitions, activeDbfs=credit['activeDbfs'],
                           peakDbfs=credit['peakDbfs'], sha256=hashlib.sha256(output.read_bytes()).hexdigest()))

for file, group in zip(files, groups):
    file.write_text(json.dumps(group, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
result = dict(minimumReferenceSeconds=minimum, reference='cat',
              method='Signal measurements; no subjective listening or species re-identification',
              recordings=report)
(ROOT / 'verification/feedback-audio.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))
