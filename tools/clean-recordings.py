"""Reproducible conservative spectral cleanup and active-call loudness matching.
Uses only bundled NumPy. No generation, pitch shifting or time stretching.
"""
import json, wave, argparse
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'research/decoded-unprocessed/manifest.json'
OUT=ROOT/'assets/audio/clean'
OUT.mkdir(parents=True,exist_ok=True)
clips=json.loads(MANIFEST.read_text(encoding='utf-8'))
parser=argparse.ArgumentParser()
parser.add_argument("--only", help="Process one recording ID, preserving all others")
args=parser.parse_args()
report=[]
def db(x): return float(20*np.log10(max(float(x),1e-8)))
def active_rms(x,sr):
    n=int(sr*.04)
    windows=np.array([np.sqrt(np.mean(x[i:i+n]**2)) for i in range(0,len(x)-n+1,n)])
    # Upper half of 40ms windows reflects calls rather than the between-call silence.
    threshold=max(float(np.quantile(windows,.5)),float(windows.max())*.16)
    return float(np.sqrt(np.mean(windows[windows>=threshold]**2))),windows

def quiet_relative(signal,sr,active_db):
    n=int(sr*.04)
    windows=np.array([np.sqrt(np.mean(signal[i:i+n]**2)) for i in range(0,len(signal)-n+1,n)])
    quiet=float(np.median(np.sort(windows)[:max(1,int(len(windows)*.2))]))
    return db(quiet)-active_db

for c in clips:
    if args.only and c["id"] != args.only: continue
    sr=c['sampleRate']; original=np.fromfile(ROOT/'research/decoded-unprocessed'/f"{c['id']}.f32",dtype='<f4').astype(np.float64)
    x=original-original.mean(); n=1024; hop=256; pad=n
    padded=np.pad(x,(pad,pad)); window=np.sqrt(np.hanning(n))
    frames=np.array([padded[i:i+n]*window for i in range(0,len(padded)-n+1,hop)])
    spec=np.fft.rfft(frames,axis=1); mag=np.abs(spec)
    energy=np.sqrt(np.mean(frames**2,axis=1)); valid=energy>1e-7
    # Quietest natural frames estimate stationary noise; reference clips keep their timbre.
    quiet=valid & (energy<=np.quantile(energy[valid],.18))
    noise=np.median(mag[quiet],axis=0) if quiet.any() else np.zeros(mag.shape[1])
    reference=c['id'] in ('cat','peacock')
    strength=.0 if reference else (.32 if c['id']=='giraffe' else .72)
    floor=.48 if c['id']=='giraffe' else .23
    mask=np.clip(1-strength*noise[None,:]/np.maximum(mag,1e-9),floor,1)
    # Smooth in time and frequency to avoid chirpy musical-noise artifacts.
    for _ in range(2):
        mask=(np.roll(mask,1,axis=0)+2*mask+np.roll(mask,-1,axis=0))/4
        mask=(np.roll(mask,1,axis=1)+2*mask+np.roll(mask,-1,axis=1))/4
    freqs=np.fft.rfftfreq(n,1/sr)
    # Keep low giraffe hum; reduce infrasonic rumble without removing growls.
    cutoff=28 if c['id']=='giraffe' else 45
    highpass=1-np.exp(-(freqs/cutoff)**4)
    cleaned=np.fft.irfft(spec*mask*highpass[None,:],n=n,axis=1)*window
    y=np.zeros(len(padded)); weight=np.zeros(len(padded))
    for k,f in enumerate(cleaned):
        i=k*hop; y[i:i+n]+=f; weight[i:i+n]+=window**2
    y=y/np.maximum(weight,1e-9); y=y[pad:pad+len(x)]
    # A gentle between-call gate stops gain matching from lifting constant room noise.
    rms,levels=active_rms(y,sr); frame_n=int(sr*.04)
    if not reference:
        threshold=float(levels.max())*(.035 if c['id']=='giraffe' else .075)
        control=np.clip((levels/ max(threshold,1e-6))**1.5,.25,1)
        knots=np.arange(len(control))*frame_n+frame_n/2
        y*=np.interp(np.arange(len(y)),knots,control)
    # Target -18 dBFS active call, limit peaks to -2 dBFS. Soft peak compression only
    # for unusually sharp recordings; no discontinuities or hard clipping.
    rms,levels=active_rms(y,sr); gain=10**(-18/20)/max(rms,1e-8); y*=gain
    peak=float(np.max(np.abs(y)))
    if peak>.79:
        knee=.52; excess=np.maximum(np.abs(y)-knee,0)
        y=np.sign(y)*np.where(np.abs(y)<=knee,np.abs(y),knee+.27*(1-np.exp(-excess/.27)))
        rms,_=active_rms(y,sr); y*=min(10**(-18/20)/rms,.79/max(np.max(np.abs(y)),1e-8))
    fade=min(int(sr*.028),len(y)//5); y[:fade]*=np.linspace(0,1,fade); y[-fade:]*=np.linspace(1,0,fade)
    pcm=np.round(np.clip(y,-.999,.999)*32767).astype('<i2')
    file=f"audio/clean/{c['id']}.wav"
    with wave.open(str(ROOT/'assets'/file),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
    before,_=active_rms(original,sr); after,levels_after=active_rms(y,sr)
    entry={k:v for k,v in c.items() if k not in ('sampleRate',)}
    entry.update(file=file,offset=0,duration=len(y)/sr,processing='Local mono excerpt; conservative spectral background reduction (reference cat/peacock exempt), rumble removal, active-call loudness matching, soft peak limiting, 28ms fades; natural pitch and timing retained',activeDbfs=round(db(after),2),peakDbfs=round(db(np.max(np.abs(y))),2))
    if c['id']=='tiger':entry['recording']=entry['recording'].replace('; playback volume reduced','')
    quiet_before=quiet_relative(original,sr,db(before)); quiet_after=quiet_relative(pcm.astype(float)/32767,sr,entry['activeDbfs'])
    report.append(dict(quietWindowRelativeBeforeDb=round(quiet_before,2),quietWindowRelativeAfterDb=round(quiet_after,2),quietToCallReductionDb=round(quiet_before-quiet_after,2),id=c['id'],originalActiveDbfs=round(db(before),2),activeDbfs=entry['activeDbfs'],peakDbfs=entry['peakDbfs'],gainDb=round(db(gain),2),duration=entry['duration'],sourceOffset=c['originalOffset'],sourceSha256=c['sourceSha256']))
    c.clear();c.update(entry)
credits_path=ROOT/'assets/credits.json'
current=json.loads(credits_path.read_text(encoding='utf-8'))
updated={c['id']:c for c in clips if not args.only or c['id']==args.only}
credits_path.write_text(json.dumps([updated.get(c['id'],c) for c in current],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if args.only:
    old=json.loads((ROOT/'verification/audio-processing.json').read_text(encoding='utf-8'))['recordings']
    latest={r['id']:r for r in report}
    report=[latest.get(r['id'],r) for r in old]
(ROOT/'verification/audio-processing.json').write_text(json.dumps(dict(method='Measured signal levels; this is not a listening-based species or noise audit',targetActiveDbfs=-18,quietWindowCaution='Quiet-window energy is not a classification of noise; includes real low-level animal signal and fades.',recordings=report),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
