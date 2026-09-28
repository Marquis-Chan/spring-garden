// Development only. Public recording downloads; the built game never accesses the network.
const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');const cache=path.join(root,'research');const out=path.join(root,'assets/audio');
fs.mkdirSync(cache,{recursive:true});fs.mkdirSync(out,{recursive:true});
const slugs=process.argv.slice(2);
for(const slug of slugs){
  const file=path.join(cache,slug+'.html');
  try{
    execFileSync('curl.exe',['-4','-L','--fail','--silent','--show-error','--max-time','25','https://opengameart.org/content/'+slug,'-o',file]);
    const html=fs.readFileSync(file,'utf8');
    const matches=[...html.matchAll(/href="(https?:[^"<>]+\.(?:ogg|wav|mp3|zip)(?:\?[^"<>]*)?)"/g)].map(m=>m[1].replace(/&amp;/g,'&'));
    const files=[...new Set(matches)].filter(x=>x.includes('/sites/default/files/'));
    console.log(JSON.stringify({slug,files}));
    for(let i=0;i<Math.min(files.length,2);i++){
      const ext=new URL(files[i]).pathname.split('.').pop();const dest=path.join(out,slug+(i?'-'+i:'')+'.'+ext);
      execFileSync('curl.exe',['-4','-L','--fail','--silent','--show-error','--max-time','30',files[i],'-o',dest]);
      console.log('saved '+path.basename(dest)+' '+fs.statSync(dest).size+' bytes');
    }
  }catch(e){console.log('FAILED '+slug+' '+e.message)}
}
