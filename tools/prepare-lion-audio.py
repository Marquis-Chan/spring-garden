"""Process a decoded genuine male-lion recording; never generate or pitch-shift audio.

Input: research/lion-male.f32, mono float32 at 32000 Hz, decoded from the preserved
Commons original (assets/audio/lion-male-commons.ogg).
"""
from pathlib import Path
import hashlib, json, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 32000
raw = ROOT / 'assets/audio/lion-male-commons.ogg'
source = np.fromfile(ROOT / 'research/lion-male.f32', dtype='<f4').astype(float)
start, length = .28, 1.98
x = source[round(start * SR):round((start + length) * SR)].copy()
x -= x.mean()
quiet = source[round(2.45 * SR):round(3.25 * SR)]
n, hop = 1024, 256
window = np.sqrt(np.hanning(n))
padded = np.pad(x, (n, n))
frames = np.array([padded[i:i+n] * window for i in range(0, len(padded)-n+1, hop)])
noise_frames = np.array([quiet[i:i+n] * window for i in range(0, len(quiet)-n+1, hop)])
spec = np.fft.rfft(frames, axis=1)
noise = np.median(np.abs(np.fft.rfft(noise_frames, axis=1)), axis=0)
mask = np.clip(1 - .6 * noise[None, :] / np.maximum(np.abs(spec), 1e-9), .4, 1)
mask = (np.roll(mask, 1, 0) + 2 * mask + np.roll(mask, -1, 0)) / 4
highpass = 1 - np.exp(-(np.fft.rfftfreq(n, 1/SR) / 35)**4)
processed = np.fft.irfft(spec * mask * highpass[None, :], n=n, axis=1) * window
y, weights = np.zeros(len(padded)), np.zeros(len(padded))
for k, frame in enumerate(processed):
    i = k * hop
    y[i:i+n] += frame
    weights[i:i+n] += window**2
y = (y / np.maximum(weights, 1e-9))[n:n+len(x)]
fade = round(SR * .028)
y[:fade] *= np.linspace(0, 1, fade)
y[-fade:] *= np.linspace(1, 0, fade)

def active_rms(signal):
    levels = np.array([np.sqrt(np.mean(signal[i:i+1280]**2))
                       for i in range(0, len(signal)-1279, 1280)])
    threshold = max(float(np.quantile(levels, .5)), float(levels.max()) * .16)
    return float(np.sqrt(np.mean(levels[levels >= threshold]**2)))

y *= min(10**(-18/20) / active_rms(y), 10**(-2/20) / np.max(np.abs(y)))
pcm = np.round(np.clip(y, -.999, .999) * 32767).astype('<i2')
output = ROOT / 'assets/audio/clean/lion.wav'
with wave.open(str(output), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
quantized = pcm.astype(float) / 32767
db = lambda v: round(float(20*np.log10(max(float(v), 1e-10))), 2)
credit = dict(id='lion', file='audio/clean/lion.wav', species='Panthera leo',
              commonName='Male lion', sex='male', kind='vocalization',
              author='தகவலுழவன் (Info-farmer)',
              source='https://commons.wikimedia.org/wiki/File:Lion_raring-sound1TamilNadu178.ogg',
              downloadUrl='https://upload.wikimedia.org/wikipedia/commons/7/7d/Lion_raring-sound1TamilNadu178.ogg',
              license='Public-domain (PD-self)',
              licenseUrl='https://commons.wikimedia.org/wiki/File:Lion_raring-sound1TamilNadu178.ogg#Licensing',
              recording='Captive male lion roaring; author-owned recording dated 2010-09-04. Source description explicitly identifies a male lion; edited original released into the public domain by its author.',
              offset=0, duration=len(pcm)/SR, originalFile='audio/lion-male-commons.ogg',
              originalOffset=start, originalDuration=len(pcm)/SR,
              sourceSha256=hashlib.sha256(raw.read_bytes()).hexdigest(),
              processing='Mono 32 kHz excerpt; conservative stationary background attenuation (60% subtraction, 40% floor); 35 Hz rumble removal; gain matched to -18 dBFS active-call target with -2 dBFS peak ceiling; 28 ms fades; original pitch and timing retained',
              activeDbfs=db(active_rms(quantized)), peakDbfs=db(np.max(np.abs(quantized))),
              sampleRate=SR)
file = ROOT / 'assets/credits.json'
credits = [c for c in json.loads(file.read_text(encoding='utf-8')) if c['id'] != 'lion']
credits.append(credit)
file.write_text(json.dumps(credits, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
print(json.dumps(credit, ensure_ascii=True, indent=2))
