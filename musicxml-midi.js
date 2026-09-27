import { Midi } from "@tonejs/midi";
const STEP={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midiPitch(p){if(!p)return null;const s=p.querySelector("step")?.textContent,o=+p.querySelector("octave")?.textContent,a=+(p.querySelector("alter")?.textContent||0);return s in STEP?(o+1)*12+STEP[s]+a:null}
function dynValue(note,current){const v=+note.getAttribute("dynamics");return Number.isFinite(v)&&v>0?Math.max(.08,Math.min(1,v/127)):current}
export function musicXMLToMidiBytes(text){
 const d=new DOMParser().parseFromString(text,"application/xml");if(d.querySelector("parsererror"))throw Error("MusicXML konnte nicht gelesen werden");
 const midi=new Midi(),div0=+(d.querySelector("divisions")?.textContent||1),tempo=+(d.querySelector("sound[tempo]")?.getAttribute("tempo")||120);
 midi.header.setTempo(tempo);
 const parts=[...d.querySelectorAll("score-partwise > part")];
 for(const part of parts){
  const tr=midi.addTrack(),id=part.id,sp=d.querySelector(`score-part[id="${id}"]`),program=+(sp?.querySelector("midi-program")?.textContent||1)-1;
  tr.instrument.number=Math.max(0,Math.min(127,program));
  let div=div0,abs=0,velocity=.7;
  for(const m of [...part.children].filter(x=>x.tagName==="measure")){
   div=+(m.querySelector(":scope > attributes > divisions")?.textContent||div);let cur=0,last=0,max=0;
   for(const e of m.children){
    if(e.tagName==="backup"){cur-=+(e.querySelector("duration")?.textContent||0)/div;continue}
    if(e.tagName==="forward"){cur+=+(e.querySelector("duration")?.textContent||0)/div;max=Math.max(max,cur);continue}
    if(e.tagName==="direction"){const w=e.querySelector("dynamics > *");if(w){const map={ppp:.25,pp:.35,p:.45,mp:.58,mf:.7,f:.82,ff:.92,fff:1};velocity=map[w.tagName]??velocity}continue}
    if(e.tagName!=="note")continue;
    const dur=+(e.querySelector(":scope > duration")?.textContent||0)/div,chord=!!e.querySelector(":scope > chord"),start=chord?last:cur;
    if(!chord)last=cur;
    const pitch=midiPitch(e.querySelector(":scope > pitch"));
    if(pitch!=null&&!e.querySelector(":scope > rest")){
      const vel=dynValue(e,velocity),stacc=!!e.querySelector("staccato"),ten=!!e.querySelector("tenuto"),factor=stacc?.55:ten?1:.94;
      tr.addNote({midi:pitch,ticks:Math.max(0,Math.round((abs+start)*midi.header.ppq)),durationTicks:Math.max(1,Math.round(dur*factor*midi.header.ppq)),velocity:vel});
    }
    if(!chord){cur+=dur;max=Math.max(max,cur)}
   }
   abs+=Math.max(max,cur,4);
  }
 }
 return new Uint8Array(midi.toArray())
}
