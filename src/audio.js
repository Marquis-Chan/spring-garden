(function(){
 'use strict';const G=window.SpringGarden;
 class GardenAudio{
  constructor(){this.ctx=null;this.master=null;this.buffers=new Map();this.sources=new Map();this.gate=new G.core.VoiceGate(2);this.failures=[];this.muted=false;this.volume=.46;this.paused=false;this.ready=null;this.epoch=0;this.pendingForeground=null;this.totalPlayed=0;this.lastPlayed=null}
  get loaded(){return this.buffers.size}
  async unlock(){
   try{
    if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination)}
    if(this.ctx.state!=='running'&&!this.paused)await this.ctx.resume();
    if(!this.ready)this.ready=Promise.all(Object.entries(G.audioData).map(async([id,asset])=>{
     try{const raw=atob(asset.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const decoded=await this.ctx.decodeAudioData(bytes.buffer);this.buffers.set(id,decoded)}catch(e){this.failures.push(id+': '+e.message)}
    }));
    await this.ready;return this.ctx.state==='running';
   }catch(e){this.muted=true;return false}
  }
  async play(id,{exclusive=false}={}){
   if(!G.audioData[id]||this.muted||this.paused)return false;
   if(exclusive){this.stopAll();this.pendingForeground=this.epoch}else if(this.sources.size||this.pendingForeground!==null)return false;
   const epoch=this.epoch,requested=performance.now();await this.unlock();
   if(exclusive&&this.pendingForeground===epoch)this.pendingForeground=null;
   if(this.muted||this.paused||epoch!==this.epoch||performance.now()-requested>1200||!this.buffers.has(id)||(!exclusive&&(this.sources.size||this.pendingForeground!==null))||!this.gate.take(id,performance.now()))return false;
   try{
    const asset=G.audioData[id],buffer=this.buffers.get(id),source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
    source.buffer=buffer;const offset=Math.min(asset.offset||0,Math.max(0,buffer.duration-.1));const duration=Math.min(asset.duration||2.8,buffer.duration-offset);
    // Processed clips have a shared active-call level and already retain peak headroom.
    const level=asset.normalized?1:(asset.reviewGain||1),now=this.ctx.currentTime;
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+.025);gain.gain.setValueAtTime(level,now+Math.max(.03,duration-.055));gain.gain.linearRampToValueAtTime(0,now+duration);
    source.connect(gain);gain.connect(this.master);this.sources.set(id,source);source.onended=()=>{if(this.sources.get(id)===source){this.sources.delete(id);this.gate.release(id)}source.disconnect();gain.disconnect()};source.start(now,offset,duration);this.totalPlayed++;this.lastPlayed=id;return true;
   }catch{this.gate.release(id);return false}
  }
  stopAll(){this.epoch++;this.pendingForeground=null;for(const source of this.sources.values())try{source.stop()}catch{}this.sources.clear();this.gate.clear()}
  setMuted(value){this.muted=value;if(value)this.stopAll()}
  setVolume(value){this.volume=Math.max(0,Math.min(.6,value));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.06)}
  async setPaused(value){this.paused=value;this.stopAll();if(this.ctx)try{if(value)await this.ctx.suspend();else if(!this.muted)await this.ctx.resume()}catch{}}
 }
 G.audio=new GardenAudio();
})();
