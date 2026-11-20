import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const result=await build({entryPoints:[path.join(root,'src/game.js')],bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,write:false,legalComments:'inline'});
const recordingNames=['frog','bird','dog','cat','bee','elephant','giraffe','zebra','lion','hippo','rhino','fox','squirrel','woodpecker','duckling',
 'bear','polar-bear','tiger','peacock','owl','monkey','toucan','penguin','whale','dolphin','croc','koala','silvereye','macaw'];
const recordings=Object.fromEntries(recordingNames.map(name=>[name,fs.readFileSync(path.join(root,'assets',name+'.wav')).toString('base64')]));
const template=read('src/index.html');
const licenseNotice=[read('../LICENSE'),read('node_modules/three/LICENSE')].join('\n\n');
const html=template.replace('</head>',()=>`<!--\n${licenseNotice}\n-->\n</head>`)
 .replace('/* CSS */',()=>read('src/pond.css'))
 .replace('/* AUDIO */',()=>`// Duckling Sound Effect, Alexander / Orange Free Sounds. Short excerpt, low-frequency cleanup and fades.
// https://orangefreesounds.com/duckling-sound-effect/ | https://creativecommons.org/licenses/by-nc/4.0/
window.POND_AUDIO=${JSON.stringify(recordings)};`)
 .replace('/* GAME */',()=>result.outputFiles[0].text.replace(/<\/script/ig,'<\\/script'));
if(/(?:src|href)="https?:\/\//.test(html))throw Error('Standalone bundle requests network resources');
const output=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'动物王国.html');
fs.writeFileSync(output,html);
console.log('单文件生成',Buffer.byteLength(html),'bytes');
