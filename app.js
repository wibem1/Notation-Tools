import{LilyPondRenderer}from"./lilypond-renderer.js";import{MidiPlayer}from"./midi-player.js";
const $=s=>document.querySelector(s),src=$("#source"),fmt=$("#format"),score=$("#score"),status=$("#status"),box=$("#player"),kind=$("#kind");
const lily=new LilyPondRenderer,player=new MidiPlayer({play:$("#play"),stop:$("#stop"),seek:$("#seek"),time:$("#time"),state:status});
let sourceFormat="abc";
function type(){
 if(fmt.value!=="auto")return fmt.value;
 const s=src.value.trim();
 if(/^(<\?xml\b|<score-(partwise|timewise)\b)/i.test(s))return"musicxml";
 return /\\(version|score|relative|new|layout|midi)\b/.test(s)?"lilypond":"abc";
}
async function abcRender(abc,label="ABC"){
 const v=ABCJS.renderAbc("score",abc,{responsive:"resize"})?.[0];if(!v)throw Error(label+" konnte nicht gesetzt werden");
 let m=ABCJS.synth.getMidiFile(abc,{midiOutputType:"binary"});if(m instanceof Promise)m=await m;
 if(!m)throw Error(label+"-MIDI konnte nicht erzeugt werden");
 player.load(m);box.hidden=false;status.textContent=label+" gesetzt · MIDI bereit";
}
async function render(){
 const t=type();sourceFormat=t;kind.textContent=t==="abc"?"ABC":t==="lilypond"?"LilyPond":"MusicXML";
 status.textContent="wird gesetzt …";box.hidden=true;player.stop();
 try{
  if(t==="abc")await abcRender(src.value);
  else if(t==="musicxml"){
   if(typeof window.vertaal!=="function")throw Error("MusicXML-Konverter ist nicht geladen");
   const doc=new DOMParser().parseFromString(src.value,"application/xml");
   if(doc.querySelector("parsererror"))throw Error("MusicXML ist nicht gültig");
   const abc=window.vertaal(doc,{m:2});
   if(!abc||!abc.trim())throw Error("MusicXML konnte nicht in Notation umgesetzt werden");
   await abcRender(abc,"MusicXML");
  }else{
   const r=await lily.render(src.value);score.innerHTML=r.svg;if(r.midi){player.load(r.midi);box.hidden=false}
   status.textContent="LilyPond gesetzt"+(r.midi?" · MIDI bereit":" · kein MIDI")+" · "+(r.ms??"?")+" ms";
  }
 }catch(e){status.textContent=e.message||String(e)}
}
$("#render").onclick=render;
$("#open").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const ext=(f.name.split(".").pop()||"").toLowerCase();src.value=await f.text();if(fmt.value==="auto"&&(ext==="xml"||ext==="musicxml"))sourceFormat="musicxml";await render()};
$("#save").onclick=()=>{const t=type(),u=URL.createObjectURL(new Blob([src.value],{type:"text/plain"})),a=document.createElement("a");a.href=u;a.download="score."+(t==="abc"?"abc":t==="musicxml"?"musicxml":"ly");a.click();URL.revokeObjectURL(u)};
function download(data,name,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$("#exportMidi").onclick=()=>{const b=player.getMidiBytes();if(!b){status.textContent="Zuerst Noten erzeugen – noch kein MIDI vorhanden.";return}download(b,"score.mid","audio/midi");status.textContent="MIDI exportiert"};
$("#exportPdf").onclick=()=>{if(!score.querySelector("svg")){status.textContent="Zuerst Noten erzeugen.";return}window.print()};
