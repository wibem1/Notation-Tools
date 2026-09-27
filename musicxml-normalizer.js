// MusicXML display normalization derived from Composition Lab's readablePiano policy.
// It changes display timing/staff layout only; source text and playback path remain untouched.
const q=(x,g=.25)=>Math.round(x/g)*g;
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const pitchMidi=p=>{if(!p)return 60;const step={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.querySelector("step")?.textContent||"C"]||0;return (+p.querySelector("octave")?.textContent+1)*12+step+(+p.querySelector("alter")?.textContent||0)};
const pitchXML=m=>{const names=[["C",0],["C",1],["D",0],["D",1],["E",0],["F",0],["F",1],["G",0],["G",1],["A",0],["A",1],["B",0]],n=names[((m%12)+12)%12],o=Math.floor(m/12)-1;return `<pitch><step>${n[0]}</step>${n[1]?`<alter>${n[1]}</alter>`:""}<octave>${o}</octave></pitch>`};
const durType=b=>{const vals=[[4,"whole"],[3,"half",1],[2,"half"],[1.5,"quarter",1],[1,"quarter"],[.75,"eighth",1],[.5,"eighth"],[.375,"16th",1],[.25,"16th"]];return vals.find(v=>Math.abs(v[0]-b)<.03)||null};
function noteXML(n,staff,voice,chord=false){const d=durType(n.dur),ticks=Math.max(1,Math.round(n.dur*480));return `<note>${chord?"<chord/>":""}${pitchXML(n.pitch)}<duration>${ticks}</duration><voice>${voice}</voice><type>${d?.[1]||"16th"}</type>${d?.[2]?"<dot/>":""}<staff>${staff}</staff></note>`}
function restXML(beats,staff,voice){let out="",r=beats;for(const v of [4,3,2,1.5,1,.75,.5,.375,.25])while(r>=v-.02){const d=durType(v);out+=`<note><rest/><duration>${Math.round(v*480)}</duration><voice>${voice}</voice><type>${d[1]}</type>${d[2]?"<dot/>":""}<staff>${staff}</staff></note>`;r-=v}return out}
export function normalizeMusicXMLForDisplay(text){
 const doc=new DOMParser().parseFromString(text,"application/xml");if(doc.querySelector("parsererror"))throw Error("MusicXML konnte nicht gelesen werden");
 const title=doc.querySelector("work-title,movement-title")?.textContent?.trim()||"Partitur";
 const parts=[...doc.querySelectorAll("score-partwise > part")];if(!parts.length)throw Error("Keine MusicXML-Parts gefunden");
 let beats=+(doc.querySelector("time > beats")?.textContent||4),beatType=+(doc.querySelector("time > beat-type")?.textContent||4),measureLen=beats*4/beatType;
 let fifths=+(doc.querySelector("key > fifths")?.textContent||0),tempo=+(doc.querySelector("sound[tempo]")?.getAttribute("tempo")||120);
 let notes=[];let globalMeasures=0;
 for(const [pi,part] of parts.entries()){let abs=0,div=1;const pname=doc.querySelector(`score-part[id="${part.id}"] part-name`)?.textContent?.toLowerCase()||"";
  const left=/\blh\b|left|linke/.test(pname);
  const ms=[...part.children].filter(x=>x.tagName==="measure");globalMeasures=Math.max(globalMeasures,ms.length);
  for(const m of ms){div=+(m.querySelector(":scope > attributes > divisions")?.textContent||div);let cur=0,last=0;
   for(const e of m.children){if(e.tagName==="backup"){cur-=+(e.querySelector("duration")?.textContent||0)/div;continue}if(e.tagName==="forward"){cur+=+(e.querySelector("duration")?.textContent||0)/div;continue}if(e.tagName!=="note")continue;
    const du=+(e.querySelector(":scope > duration")?.textContent||0)/div;if(e.querySelector(":scope > rest")){if(!e.querySelector(":scope > chord"))cur+=du;continue}
    const chord=!!e.querySelector(":scope > chord"),start=abs+(chord?last:cur),pitch=pitchMidi(e.querySelector(":scope > pitch"));if(!chord)last=cur;
    notes.push({start,dur:du,pitch,staff:left?2:(parts.length===1?(pitch<60?2:1):(pi===0?1:2))});if(!chord)cur+=du;
   }abs+=measureLen;
  }
 }
 // readablePiano: quarter-beat start grid, standard durations, short-gap closure.
 for(const n of notes){n.start=q(n.start,.25);const candidates=[4,3,2,1.5,1,.75,.5,.375,.25];const near=candidates.reduce((a,b)=>Math.abs(b-n.dur)<Math.abs(a-n.dur)?b:a);if(Math.abs(near-n.dur)<=Math.max(.21,n.dur*.15))n.dur=near}
 for(const staff of [1,2]){const a=notes.filter(n=>n.staff===staff).sort((x,y)=>x.start-y.start);for(let i=0;i<a.length;i++){const next=a.slice(i+1).find(x=>x.start>a[i].start+.001);const bar=(Math.floor(a[i].start/measureLen)+1)*measureLen;const end=Math.min(next?.start??Infinity,bar);const gap=end-(a[i].start+a[i].dur);if(gap>=-.02&&gap<=.25&&durType(end-a[i].start))a[i].dur=end-a[i].start}}
 let out=`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${esc(title)}</work-title></work><part-list><score-part id="P1"><part-name>Klavier</part-name></score-part></part-list><part id="P1">`;
 const count=Math.max(globalMeasures,Math.ceil(Math.max(...notes.map(n=>n.start+n.dur),measureLen)/measureLen));
 for(let mi=0;mi<count;mi++){const ms=mi*measureLen,me=ms+measureLen;out+=`<measure number="${mi+1}">`;if(mi===0)out+=`<attributes><divisions>480</divisions><key><fifths>${fifths}</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction><sound tempo="${tempo}"/></direction>`;
  for(const staff of [1,2]){if(staff===2)out+=`<backup><duration>${Math.round(measureLen*480)}</duration></backup>`;const a=notes.filter(n=>n.staff===staff&&n.start>=ms-.001&&n.start<me-.001).sort((x,y)=>x.start-y.start||y.dur-x.dur||x.pitch-y.pitch);let cursor=ms,i=0;
   while(i<a.length){const n=a[i],start=Math.max(ms,n.start);if(start>cursor+.02)out+=restXML(start-cursor,staff,1);const same=a.filter(x=>Math.abs(x.start-n.start)<.001&&Math.abs(x.dur-n.dur)<.03);for(let k=0;k<same.length;k++)out+=noteXML(same[k],staff,1,k>0);cursor=Math.max(cursor,start+n.dur);i+=same.length}if(cursor<me-.02)out+=restXML(me-cursor,staff,1)}
  out+="</measure>";
 }return out+"</part></score-partwise>";
}
