const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function player(){
 let clock=0;const pending=[],starts=[];
 class Context{
  constructor(){this.state='running';this.currentTime=0;this.destination={}}
  async resume(){this.state='running'}async suspend(){this.state='suspended'}
  decodeAudioData(){return new Promise(resolve=>pending.push(()=>resolve({duration:8})))}
  createGain(){return{gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}}}
  createBufferSource(){return{connect(){},disconnect(){},stop(){},start(...args){starts.push(args)}}}
 }
 const sandbox={window:{AudioContext:Context,SpringGarden:{audioData:{dog:{data:'YQ==',duration:3.78,normalized:true},monkey:{data:'Yg==',duration:2.86,normalized:true}}}},performance:{now:()=>clock},atob};
 vm.createContext(sandbox);for(const file of ['core.js','audio.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),sandbox);
 return{audio:sandbox.window.SpringGarden.audio,starts,advance:ms=>clock+=ms,decode:()=>pending.splice(0).forEach(done=>done())};
}
test('a first explicit call survives slow initial audio decoding and retains its complete response duration',async()=>{
 const h=player(),request=h.audio.play('monkey',{exclusive:true});await Promise.resolve();h.advance(1800);h.decode();assert.equal(await request,true);assert.equal(h.starts.length,1);assert.equal(h.starts[0][2],2.86);
});
test('only the latest explicit request plays when decoding completes after several touches',async()=>{
 const h=player(),old=h.audio.play('dog',{exclusive:true}),latest=h.audio.play('monkey',{exclusive:true});await Promise.resolve();h.decode();assert.equal(await old,false);assert.equal(await latest,true);assert.equal(h.starts.length,1);assert.equal(h.audio.lastPlayed,'monkey');
});
test('muting or leaving the scene invalidates an explicit request that is still decoding',async()=>{
 for(const action of ['setMuted','stopAll']){const h=player(),request=h.audio.play('dog',{exclusive:true});await Promise.resolve();h.audio[action](true);h.decode();assert.equal(await request,false);assert.equal(h.starts.length,0);}
});
test('late background calls remain discarded instead of starting after the relevant action',async()=>{
 const h=player(),request=h.audio.play('dog',{exclusive:false});await Promise.resolve();h.advance(1800);h.decode();assert.equal(await request,false);assert.equal(h.starts.length,0);
});
