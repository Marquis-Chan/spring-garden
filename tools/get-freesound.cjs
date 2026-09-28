const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'research'),{recursive:true});fs.mkdirSync(path.join(root,'assets/audio'),{recursive:true});
for(const item of process.argv.slice(2)){
 const [animal,user,id]=item.split(':');const url=`https://freesound.org/people/${user}/sounds/${id}/`;const page=path.join(root,'research',animal+'-source.html');
 try{
 execFileSync('curl.exe',['-4','-L','--fail','--silent','--show-error','--max-time','25',url,'-o',page]);
 const html=fs.readFileSync(page,'utf8').replace(/\\u002[Ff]/g,'/').replace(/\\\//g,'/');
 const previews=[...new Set([...html.matchAll(/https:\/\/(?:cdn|freesound)\.freesound\.org\/[^"<>\s\\]+?\.(?:mp3|ogg)/g)].map(m=>m[0]))];
 const p=previews.find(x=>x.includes('-hq.mp3'))||previews.find(x=>x.includes('-lq.mp3'))||previews[0];
 console.log(JSON.stringify({animal,url,previews}));if(!p)continue;
 const out=path.join(root,'assets/audio',animal+'.mp3');execFileSync('curl.exe',['-4','-L','--fail','--silent','--show-error','--max-time','30',p,'-o',out]);console.log('saved '+animal+' '+fs.statSync(out).size);
 }catch(e){console.log('FAILED '+animal+' '+e.message)}
}
