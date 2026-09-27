// MusicXML display normalization ported from Composition Lab readablePiano.
// Source MusicXML and playback remain untouched. This module only rebuilds readable display XML.
const DIV=480,EPS=.001;
const q=(x,g=.25)=>Math.round(x/g)*g;
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const DUR=[[4,"whole",0],[3,"half",1],[2,"half",0],[1.5,"quarter",1],[1,"quarter",0],[.75,"eighth",1],[.5,"eighth",0],[.375,"16th",1],[.25,"16th",0]];
const dtype=b=>DUR.find(v=>Math.abs(v[0]-b)<.02)||null;
const pitchMidi=p=>{if(!p)return 60;const s={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.querySelector("step")?.textContent||"C"]??0;return(+p.querySelector("octave")?.textContent+1)*12+s+(+p.querySelector("alter")?.textContent||0)};
const pitchXML=m=>{const n=[["C",0],["C",1],["D",0],["D",1],["E",0],["F",0],["F",1],["G",0],["G",1],["A",0],["A",1],["B",0]][((m%12)+12)%12];return `<pitch><step>${n[0]}</step>${n[1]?`<alter>${n[1]}</alter>`:""}<octave>${Math.floor(m/12)-1}</octave></pitch>`};
function pieces(d,start){let r=d,out=[],pos=start,frac=pos-Math.floor(pos);if(frac>EPS){const x=1-frac;if(x<=r+EPS&&dtype(x)){out.push(x);r-=x;pos+=x}}for(let guard=0;r>EPS&&guard<32;guard++){const exact=DUR.find(v=>Math.abs(v[0]-r)<.02);if(exact){out.push(exact[0]);break}const x=DUR.find(v=>v[0]<=r+EPS);if(!x){if(out.length)out[out.length-1]+=r;else out.push(.25);break}out.push(x[0]);r-=x[0];pos+=x[0]}return out}
function makeFragments(notes,measureLen){const out=[];for(const n of notes){let start=n.start;for(const d0 of pieces(n.dur,start)){let left=d0;while(left>EPS){const bar=(Math.floor((start+EPS)/measureLen)+1)*measureLen,part=Math.min(left,bar-start);const pp=pieces(part,start);for(const d of pp){out.push({...n,start,dur:d,tieStart:false,tieStop:false});start+=d;left-=d}}} }const by=new Map;for(const x of out){const k=`${x.staff}:${x.pitch}:${Math.round(x.sourceStart*1000)}`;if(!by.has(k))by.set(k,[]);by.get(k).push(x)}for(const a of by.values()){a.sort((x,y)=>x.start-y.start);if(a.length>1)for(let i=0;i<a.length;i++){a[i].tieStop=i>0;a[i].tieStart=i<a.length-1}}return out}
function groupsFor(frags){const a=[...frags].sort((x,y)=>x.start-y.start||y.dur-x.dur||x.pitch-y.pitch),groups=[];for(let i=0;i<a.length;){const f=a[i],notes=[f];let j=i+1;while(j<a.length&&Math.abs(a[j].start-f.start)<EPS&&Math.abs(a[j].dur-f.dur)<EPS)notes.push(a[j++]);groups.push({start:f.start,dur:f.dur,notes});i=j}const voices=[],ends=[];for(const g of groups){let v=ends.findIndex(e=>e<=g.start+EPS);if(v<0){v=voices.length;voices.push([]);ends.push(g.start)}voices[v].push(g);ends[v]=g.start+g.dur}return voices}
function beam(groups,i){const g=groups[i];if(g.dur>.5+EPS)return null;const ok=x=>x&&x.dur<=.5+EPS;const same=(a,b)=>Math.floor(a.start+EPS)===Math.floor(b.start+EPS);const cont=(a,b)=>Math.abs(a.start+a.dur-b.start)<.02;const p=groups[i-1],n=groups[i+1],prev=ok(p)&&same(p,g)&&cont(p,g),next=ok(n)&&same(g,n)&&cont(g,n);const primary=!prev&&next?"begin":prev&&next?"continue":prev&&!next?"end":null;return primary?{primary,secondary:g.dur<=.25+EPS?primary:null}:null}
function noteXML(n,staff,voice,chord,b){const d=dtype(n.dur),ticks=Math.max(1,Math.round(n.dur*DIV));let x=`<note>${chord?"<chord/>":""}${pitchXML(n.pitch)}<duration>${ticks}</duration><voice>${voice}</voice><type>${d?.[1]||"16th"}</type>${d?.[2]?"<dot/>":""}`;if(n.tieStop)x+="<tie type=\"stop\"/>";if(n.tieStart)x+="<tie type=\"start\"/>";if(b?.primary)x+=`<beam number="1">${b.primary}</beam>`;if(b?.secondary)x+=`<beam number="2">${b.secondary}</beam>`;x+=`<staff>${staff}</staff>`;if(n.tieStop||n.tieStart)x+=`<notations>${n.tieStop?'<tied type="stop"/>':""}${n.tieStart?'<tied type="start"/>':""}</notations>`;return x+"</note>"}
function restXML(beats,staff,voice,visible=true){let out="",r=beats;for(let guard=0;r>EPS&&guard<32;guard++){const x=DUR.find(v=>v[0]<=r+EPS);if(!x)break;out+=`<note><rest${visible?"/":' print-object="no"/'}><duration>${Math.round(x[0]*DIV)}</duration><voice>${voice}</voice><type>${x[1]}</type>${x[2]?"<dot/>":""}<staff>${staff}</staff></note>`;r-=x[0]}return out}
function applyReadableOctaves(xml){
 const d=new DOMParser().parseFromString(xml,"application/xml"),part=d.querySelector("part");if(!part)return xml;
 const entries={1:[],2:[]};
 for(const m of [...part.querySelectorAll(":scope > measure")]){
  let div=+(m.querySelector(":scope > attributes > divisions")?.textContent||DIV),cursor={1:0,2:0};
  for(const e of [...m.children]){
   if(e.tagName==="backup"){const x=+(e.querySelector("duration")?.textContent||0)/div;cursor[1]-=x;cursor[2]-=x;continue}
   if(e.tagName==="forward"){const x=+(e.querySelector("duration")?.textContent||0)/div;cursor[1]+=x;cursor[2]+=x;continue}
   if(e.tagName!=="note")continue;
   const chord=!!e.querySelector(":scope > chord"),dur=+(e.querySelector(":scope > duration")?.textContent||0)/div,staff=+(e.querySelector(":scope > staff")?.textContent||1),p=e.querySelector(":scope > pitch");
   if(p)entries[staff]?.push({m,e,pitch:pitchMidi(p)});
   if(!chord)cursor[staff]+=dur;
  }
 }
 for(const staff of [1,2]){
  const a=entries[staff],hot=n=>staff===1?n.pitch>=81:n.pitch<=40;
  // A high/low passage stays octave-shifted across up to two intervening notes.
  // This prevents isolated threshold crossings from terminating an otherwise continuous phrase.
  const keep=a.map((n,i)=>hot(n)||([-2,-1,1,2].some(k=>a[i+k]&&hot(a[i+k]))&&
    (a.slice(Math.max(0,i-2),Math.min(a.length,i+3)).filter(hot).length>=2)));
  let active=false;
  for(let i=0;i<a.length;i++){const want=keep[i];if(want===active)continue;
   const {m,e}=a[i],dir=d.createElement("direction");dir.setAttribute("placement",staff===1?"above":"below");
   const dt=d.createElement("direction-type"),os=d.createElement("octave-shift");os.setAttribute("type",want?(staff===1?"down":"up"):"stop");os.setAttribute("size","8");os.setAttribute("number",String(staff));dt.appendChild(os);dir.appendChild(dt);
   const st=d.createElement("staff");st.textContent=String(staff);dir.appendChild(st);m.insertBefore(dir,e);active=want;
  }
 }
 return new XMLSerializer().serializeToString(d)
}
export function normalizeMusicXMLForDisplay(text){
 const doc=new DOMParser().parseFromString(text,"application/xml");if(doc.querySelector("parsererror"))throw Error("MusicXML konnte nicht gelesen werden");
 const title=doc.querySelector("work-title,movement-title")?.textContent?.trim()||"Partitur",parts=[...doc.querySelectorAll("score-partwise > part")];if(!parts.length)throw Error("Keine MusicXML-Parts gefunden");
 const beats=+(doc.querySelector("time > beats")?.textContent||4),beatType=+(doc.querySelector("time > beat-type")?.textContent||4),measureLen=beats*4/beatType,fifths=+(doc.querySelector("key > fifths")?.textContent||0),tempo=+(doc.querySelector("sound[tempo]")?.getAttribute("tempo")||120);
 let notes=[],globalMeasures=0;
 for(const [pi,part] of parts.entries()){let abs=0,div=1;const pname=doc.querySelector(`score-part[id="${part.id}"] part-name`)?.textContent?.toLowerCase()||"",left=/\blh\b|left|linke/.test(pname),right=/\brh\b|right|rechte/.test(pname);const ms=[...part.children].filter(x=>x.tagName==="measure");globalMeasures=Math.max(globalMeasures,ms.length);
  for(const m of ms){div=+(m.querySelector(":scope > attributes > divisions")?.textContent||div);let cur=0,last=0;for(const e of m.children){if(e.tagName==="backup"){cur-=+(e.querySelector("duration")?.textContent||0)/div;continue}if(e.tagName==="forward"){cur+=+(e.querySelector("duration")?.textContent||0)/div;continue}if(e.tagName!=="note")continue;const du=+(e.querySelector(":scope > duration")?.textContent||0)/div;if(e.querySelector(":scope > rest")){if(!e.querySelector(":scope > chord"))cur+=du;continue}const chord=!!e.querySelector(":scope > chord"),rawStart=abs+(chord?last:cur),pitch=pitchMidi(e.querySelector(":scope > pitch")),sourceStaff=+(e.querySelector(":scope > staff")?.textContent||0);if(!chord)last=cur;let staff=sourceStaff||((left?2:right?1:(parts.length===1?(pitch<60?2:1):(pi===0?1:2))));notes.push({sourceStart:rawStart,start:q(rawStart,.25),dur:du,pitch,staff});if(!chord)cur+=du}abs+=measureLen}
 }
 // Composition Lab readablePiano duration policy: standard values + short gate-gap closure.
 for(const n of notes){const near=DUR.reduce((a,b)=>Math.abs(b[0]-n.dur)<Math.abs(a[0]-n.dur)?b:a);if(Math.abs(near[0]-n.dur)<=Math.max(.21,n.dur*.15))n.dur=near[0]}
 for(const staff of [1,2]){const a=notes.filter(n=>n.staff===staff).sort((x,y)=>x.start-y.start);for(const n of a){const next=a.find(x=>x.start>n.start+EPS),bar=(Math.floor(n.start/measureLen)+1)*measureLen,end=Math.min(next?.start??Infinity,bar),interval=end-n.start,tail=interval-n.dur;if(dtype(interval)&&tail>=-.02&&tail<=.25&&n.dur/interval>=.45)n.dur=interval}}
 const fragments=makeFragments(notes,measureLen);let out=`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${esc(title)}</work-title></work><part-list><score-part id="P1"><part-name>Klavier</part-name></score-part></part-list><part id="P1">`;
 const maxEnd=Math.max(measureLen,...fragments.map(n=>n.start+n.dur)),count=Math.max(globalMeasures,Math.ceil(maxEnd/measureLen));
 for(let mi=0;mi<count;mi++){const ms=mi*measureLen,me=ms+measureLen;out+=`<measure number="${mi+1}">`;if(mi===0)out+=`<attributes><divisions>${DIV}</divisions><key><fifths>${fifths}</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction><sound tempo="${tempo}"/></direction>`;
  for(const staff of [1,2]){if(staff===2)out+=`<backup><duration>${Math.round(measureLen*DIV)}</duration></backup>`;const fr=fragments.filter(n=>n.staff===staff&&n.start>=ms-EPS&&n.start<me-EPS),voices=groupsFor(fr);if(!voices.length){out+=restXML(measureLen,staff,1,true);continue}for(let vi=0;vi<voices.length;vi++){if(vi>0)out+=`<backup><duration>${Math.round(measureLen*DIV)}</duration></backup>`;const gs=voices[vi],voice=vi+1;let cursor=ms;for(let gi=0;gi<gs.length;gi++){const g=gs[gi];if(g.start>cursor+EPS)out+=restXML(g.start-cursor,staff,voice,vi===0);const b=beam(gs,gi);g.notes.forEach((n,k)=>out+=noteXML(n,staff,voice,k>0,b));cursor=Math.max(cursor,g.start+g.dur)}if(cursor<me-EPS)out+=restXML(me-cursor,staff,voice,vi===0)}}out+="</measure>"}
 return applyReadableOctaves(out+"</part></score-partwise>")
}
