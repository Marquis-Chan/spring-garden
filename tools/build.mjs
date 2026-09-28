import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const credits=JSON.parse(read('assets/credits.json'));const data={};
for(const c of credits){const bytes=fs.readFileSync(path.join(root,'assets',c.file));if(bytes.length<1000)throw new Error('Missing or invalid recording '+c.id);data[c.id]={data:bytes.toString('base64'),offset:c.offset,duration:c.duration,normalized:!!c.processing};}
let html=read('index.template.html');const slots={'STYLES':'styles.css','CORE':'src/core.js','MOTION':'src/motion.js','NATURE':'src/nature.js','DAYNIGHT':'src/daynight.js','ART':'src/illustrations.js','WILDLIFE':'src/wildlife.js','AUDIO':'src/audio.js','GAME':'src/game.js'};
for(const [marker,p]of Object.entries(slots))html=html.replace('/* '+marker+' */',()=>read(p)+(marker==='STYLES'?'\n'+read('wildlife.css'):''));
html=html.replace('/* AUDIO_DATA */',()=>`window.SpringGarden={audioData:${JSON.stringify(data)},audioCredits:${JSON.stringify(credits)}};`);
html=html.replace('</body>',`<script type="application/json" id="audio-credits">${JSON.stringify({notice:'Real recording sources and licenses. Clips cleaned and matched by active-call loudness, with peak headroom and fades; natural pitch preserved. The giraffe audio retains CC BY-SA 4.0.',recordings:credits},null,2)}</script></body>`);
if(/(?:src|href)\s*=\s*["']https?:\/\//i.test(html))throw new Error('External runtime resource remains');
if(html.includes('/* GAME */'))throw new Error('Unresolved build slot');
const bytes=Buffer.byteLength(html);if(bytes>15*1024*1024)throw new Error('HTML exceeds 15MB budget');
fs.writeFileSync(path.join(root,'春日小花园.html'),html);console.log(`Built 春日小花园.html — ${(bytes/1024/1024).toFixed(2)} MiB; ${credits.length} real recordings; no runtime network resources.`);
