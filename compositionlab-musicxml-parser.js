// Direct JavaScript port of Composition Lab's MusicXMLParser -> Score core.
// Timing rule intentionally matches Composition Lab: each part has its own measureStart,
// and a source measure advances by max(nominal measure length, final measure cursor).
const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const midiPitch=(step,alter,oct)=>Math.max(0,Math.min(127,(oct+1)*12+(PC[step]??0)+alter));
export function parseCompositionLabMusicXML(text){
 const d=new DOMParser().parseFromString(text,"application/xml");if(d.querySelector("parsererror"))throw Error("MusicXML konnte nicht gelesen werden");
 const title=d.querySelector("work-title,movement-title")?.textContent?.trim()||"Partitur";
 let bpm=+(d.querySelector("sound[tempo]")?.getAttribute("tempo")||d.querySelector("per-minute")?.textContent||120);
 let beats=+(d.querySelector("beats")?.textContent||4),beatType=+(d.querySelector("beat-type")?.textContent||4),fifths=+(d.querySelector("fifths")?.textContent||0);
 const info=new Map([...d.querySelectorAll("score-part")].map((s,i)=>[s.id,{name:s.querySelector("part-name")?.textContent?.trim()||`Spur ${i+1}`,program:Math.max(0,+(s.querySelector("midi-program")?.textContent||1)-1),channel:i}]));
 const tracks=[];
 for(const part of d.querySelectorAll("score-partwise > part")){
  let divisions=1,measureStart=0,currentVelocity=80;const nt=[],events=[];
  for(const m of [...part.children].filter(x=>x.tagName==="measure")){
   let cursor=0,lastStart=measureStart;
   const attrs=m.querySelector(":scope > attributes");if(attrs){divisions=+(attrs.querySelector("divisions")?.textContent||divisions);beats=+(attrs.querySelector("beats")?.textContent||beats);beatType=+(attrs.querySelector("beat-type")?.textContent||beatType)}
   const measureLen=beats*4/Math.max(1,beatType);
   for(const e of m.children){
    if(e.tagName==="backup"){cursor=Math.max(0,cursor-(+(e.querySelector("duration")?.textContent||0)/Math.max(1,divisions)));continue}
    if(e.tagName==="forward"){cursor+=+(e.querySelector("duration")?.textContent||0)/Math.max(1,divisions);continue}
    if(e.tagName==="direction"){
     const off=+(e.querySelector(":scope > offset")?.textContent||0)/Math.max(1,divisions),at=measureStart+cursor+off,staff=+(e.querySelector(":scope > staff")?.textContent||0)||null;
     const dyn=e.querySelector("dynamics > *");if(dyn){events.push({b:at,t:"dyn",v:dyn.tagName,st:staff});const map={ppp:32,pp:44,p:56,mp:70,mf:84,f:100,ff:116,fff:127};currentVelocity=map[dyn.tagName]??currentVelocity}
     const sound=e.querySelector("sound");if(sound?.hasAttribute("tempo"))bpm=+sound.getAttribute("tempo")||bpm;
     continue
    }
    if(e.tagName!=="note")continue;
    const dur=+(e.querySelector(":scope > duration")?.textContent||0)/Math.max(1,divisions),chord=!!e.querySelector(":scope > chord"),grace=!!e.querySelector(":scope > grace"),rest=!!e.querySelector(":scope > rest");
    const start=chord?lastStart:measureStart+cursor;if(!chord)lastStart=start;
    if(!rest){const p=e.querySelector(":scope > pitch"),step=p?.querySelector("step")?.textContent||"C",alter=+(p?.querySelector("alter")?.textContent||0),oct=+(p?.querySelector("octave")?.textContent||4),staff=Math.max(0,Math.min(2,+(e.querySelector(":scope > staff")?.textContent||0))),vel=Math.max(1,Math.min(127,+(e.querySelector(":scope > velocity")?.textContent||currentVelocity)));nt.push([start,grace?Math.max(.125,dur):Math.max(1/480,dur),midiPitch(step,alter,oct),vel,staff,.95])}
    if(!chord)cursor+=dur
   }
   measureStart+=Math.max(measureLen,cursor)
  }
  const x=info.get(part.id)||{name:"Spur",program:0,channel:tracks.length};if(nt.length)tracks.push({nm:x.name,ch:Math.min(15,x.channel),pg:x.program,nt,ev:events})
 }
 if(!tracks.length)throw Error("Die MusicXML-Datei enthält keine lesbaren Noten.");
 return {ti:title,bpm,ts:{n:beats,d:beatType},fifths,tr:tracks}
}
