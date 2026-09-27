import { Midi } from "@tonejs/midi";

export class MidiPlayer {
  constructor({play,stop,seek,time,state}) {
    this.u={play,stop,seek,time,state}; this.ac=null; this.fp=null; this.midi=null;
    this.playing=false; this.offset=0; this.startedAt=0; this.duration=0; this.timer=null; this.cache=new Map();
    play.onclick=()=>this.playing?this.pause():this.play().catch(e=>this.error(e));
    stop.onclick=()=>this.stop();
    seek.addEventListener("change",()=>{const was=this.playing;this.pause();this.offset=+seek.value||0;this.show(this.offset);if(was)this.play().catch(e=>this.error(e));});
  }
  error(e){this.stop();if(this.u.state)this.u.state.textContent="Playback-Fehler: "+(e?.message||String(e))}
  fmt(x){x=Math.max(0,+x||0);return Math.floor(x/60)+":"+String(Math.floor(x%60)).padStart(2,"0")}
  show(x){this.u.seek.value=String(Math.min(this.duration,x));this.u.time.textContent=this.fmt(x)+" / "+this.fmt(this.duration)}
  async engine(){
    if(!this.ac)this.ac=new(window.AudioContext||window.webkitAudioContext)();
    if(!window.WebAudioFontPlayer)await new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js";s.onload=ok;s.onerror=()=>no(new Error("SoundFont-Bibliothek konnte nicht geladen werden"));document.head.appendChild(s)});
    if(!this.fp)this.fp=new window.WebAudioFontPlayer();
  }
  async preset(program){
    program=Math.max(0,Math.min(127,Math.round(+program||0)));if(this.cache.has(program))return this.cache.get(program);
    await this.engine();const code=String(program).padStart(3,"0")+"0",name="_tone_"+code+"_FluidR3_GM_sf2_file";
    if(this.u.state)this.u.state.textContent="Instrumente laden …";
    await new Promise((ok,no)=>{this.fp.loader.startLoad(this.ac,"https://surikov.github.io/webaudiofontdata/sound/"+code+"_FluidR3_GM_sf2_file.js",name);this.fp.loader.waitLoad(()=>{const p=window[name];if(!p)return no(new Error("Instrument "+program+" fehlt"));try{this.fp.loader.decodeAfterLoading(this.ac,name)}catch{}this.cache.set(program,p);ok()})});return this.cache.get(program);
  }
  load(bytes){this.cancel();this.midi=new Midi(bytes);this.duration=this.midi.duration||0;this.offset=0;this.u.seek.max=String(Math.max(.01,this.duration));this.show(0)}
  cancel(){try{this.fp?.cancelQueue(this.ac)}catch{}if(this.timer){clearInterval(this.timer);this.timer=null}}
  pause(){if(this.playing&&this.ac)this.offset=Math.min(this.duration,this.offset+Math.max(0,this.ac.currentTime-this.startedAt));this.cancel();this.playing=false;this.u.play.textContent="▶︎";this.show(this.offset)}
  stop(){this.cancel();this.playing=false;this.offset=0;this.u.play.textContent="▶︎";this.show(0)}
  async play(){
    if(!this.midi)return;if(this.offset>=this.duration-.02)this.offset=0;
    await this.engine();await this.ac.resume();
    for(const t of this.midi.tracks)await this.preset(t.instrument?.number??0);
    const t0=this.ac.currentTime+.08;
    for(const t of this.midi.tracks){const p=this.cache.get(t.instrument?.number??0);for(const n of t.notes){const end=n.time+n.duration;if(end<=this.offset)continue;this.fp.queueWaveTable(this.ac,this.ac.destination,p,t0+Math.max(0,n.time-this.offset),n.midi,Math.max(.03,end-Math.max(n.time,this.offset)),Math.max(.02,Math.min(1,n.velocity||.7)))}}
    this.startedAt=t0;this.playing=true;this.u.play.textContent="❚❚";if(this.u.state)this.u.state.textContent="SoundFont bereit";
    this.timer=setInterval(()=>{const x=this.offset+Math.max(0,this.ac.currentTime-this.startedAt);if(x>=this.duration)this.stop();else this.show(x)},100);
  }
}