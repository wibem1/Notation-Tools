import{OpenSheetMusicDisplay}from"opensheetmusicdisplay";import{parseCompositionLabMusicXML}from"./compositionlab-musicxml-parser.js";import{buildCompositionLabMusicXML}from"./compositionlab-musicxml-builder.js";import{LilyPondRenderer}from"./lilypond-renderer.js";import{MidiPlayer}from"./midi-player.js";import{musicXMLToMidiBytes}from"./musicxml-midi.js";
const $=s=>document.querySelector(s),src=$("#source"),fmt=$("#format"),score=$("#score"),status=$("#status"),box=$("#player"),kind=$("#kind");
const lily=new LilyPondRenderer,player=new MidiPlayer({play:$("#play"),stop:$("#stop"),seek:$("#seek"),time:$("#time"),state:status});
let abcSynth=null,abcDuration=0,abcPlaying=false,mode="midi",sourceFormat="abc",osmdView=null;
function type(){if(fmt.value!=="auto")return fmt.value;const s=src.value.trim();if(/^(<\?xml\b|<score-(partwise|timewise)\b)/i.test(s))return"musicxml";return /\\(version|score|relative|new|layout|midi)\b/.test(s)?"lilypond":"abc"}
function fmtTime(x){x=Math.max(0,+x||0);return Math.floor(x/60)+":"+String(Math.floor(x%60)).padStart(2,"0")}
function stopAbc(){try{abcSynth?.stop()}catch{}abcPlaying=false;$("#play").textContent="▶︎";$("#seek").value="0";$("#time").textContent="0:00 / "+fmtTime(abcDuration)}
async function abcPlay(){if(!abcSynth)return;try{if(abcPlaying){abcSynth.pause();abcPlaying=false;$("#play").textContent="▶︎";return}await abcSynth.start();abcPlaying=true;$("#play").textContent="❚❚";status.textContent="abcjs Synth bereit"}catch(e){status.textContent="ABC-Playback-Fehler: "+(e?.message||String(e))}}
$("#play").onclick=()=>mode==="abc"?abcPlay():player.playing?player.pause():player.play().catch(e=>player.error(e));
$("#stop").onclick=()=>mode==="abc"?stopAbc():player.stop();
$("#seek").onchange=()=>{if(mode==="abc"&&abcSynth){abcSynth.seek(+$("#seek").value||0,"seconds");$("#time").textContent=fmtTime(+$("#seek").value||0)+" / "+fmtTime(abcDuration)}};
function musicXmlToAbc(xmlText){
 let xmldata;try{xmldata=window.jQuery.parseXML(xmlText)}catch(e){throw Error("MusicXML ist nicht gültig: "+(e?.message||String(e)))}
 const options={b:4,n:0,c:0,v:0,d:8,x:0,noped:0,p:"",v1:0,stm:0,s:0,t:0,u:0,mnum:-1,m:1,addstavenum:0,rehparts:0};
 const result=window.vertaal(xmldata,options),abc=Array.isArray(result)?result[0]:result,diag=Array.isArray(result)?result[1]:"";
 if(!abc||typeof abc!=="string"||!abc.trim())throw Error("MusicXML-Konvertierung lieferte kein ABC"+(diag?" · "+diag:""));
 return {abc:abc.replaceAll("[K:treble]","").replaceAll("[K:alto]","").replaceAll("[K:alto1]","").replaceAll("[K:alto2]","").replaceAll("[K:tenor]","").replaceAll("[K:bass]","").replaceAll("[K:bass3]",""),diag};
}
async function abcRender(abc,label="ABC"){
 const v=ABCJS.renderAbc("score",abc,{responsive:"resize"})?.[0];if(!v)throw Error(label+" konnte nicht gesetzt werden");
 player.stop();mode="abc";abcSynth=new ABCJS.synth.CreateSynth();
 const info=await abcSynth.init({visualObj:v});await abcSynth.prime();
 abcDuration=+(info?.duration||abcSynth.duration||0);$("#seek").min="0";$("#seek").max=String(Math.max(.01,abcDuration));$("#seek").value="0";$("#time").textContent="0:00 / "+fmtTime(abcDuration);box.hidden=false;
 status.textContent=label+" gesetzt · abcjs Audio bereit";
}
async function render(){const t=type();sourceFormat=t;kind.textContent=t==="abc"?"ABC":t==="lilypond"?"LilyPond":"MusicXML";status.textContent="wird gesetzt …";box.hidden=true;stopAbc();player.stop();
 try{if(t==="abc")await abcRender(src.value);
 else if(t==="musicxml"){score.innerHTML="";osmdView=new OpenSheetMusicDisplay(score,{autoResize:true,backend:"svg",drawTitle:true});const displayXML=buildCompositionLabMusicXML(parseCompositionLabMusicXML(src.value));await osmdView.load(displayXML);osmdView.Zoom=scoreZoom;osmdView.render();const midiBytes=musicXMLToMidiBytes(src.value);stopAbc();mode="midi";await player.load(midiBytes);box.hidden=false;status.textContent="MusicXML nativ gesetzt · SoundFont-MIDI bereit"}
 else{mode="midi";const r=await lily.render(src.value);score.innerHTML=r.svg;if(r.midi){await player.load(r.midi);box.hidden=false}status.textContent="LilyPond gesetzt"+(r.midi?" · MIDI bereit":" · kein MIDI")+" · "+(r.ms??"?")+" ms"}}catch(e){status.textContent=e.message||String(e)}}
let scoreZoom=1;
function updateZoomLabel(){$("#zoomReset").textContent=Math.round(scoreZoom*100)+" %"}
function remember(){try{localStorage.setItem("notation-tools-memory",JSON.stringify({source:src.value,format:fmt.value,zoom:scoreZoom}))}catch{}}
async function setScoreZoom(v){scoreZoom=Math.max(.5,Math.min(2.0,v));updateZoomLabel();remember();if(type()==="musicxml"&&osmdView){status.textContent="Notensatz wird neu umbrochen …";osmdView.Zoom=scoreZoom;osmdView.render();status.textContent="MusicXML neu gesetzt · "+Math.round(scoreZoom*100)+" %"}}
$("#zoomOut").onclick=()=>setScoreZoom(scoreZoom-.1);
$("#zoomIn").onclick=()=>setScoreZoom(scoreZoom+.1);
$("#zoomReset").onclick=()=>setScoreZoom(1);
$("#render").onclick=()=>{remember();render()};
$("#open").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;src.value=await f.text();remember();await render()};
src.addEventListener("input",remember);fmt.addEventListener("change",remember);
function readHandoff(){try{const q=new URLSearchParams(location.search);if(q.get("handoff")!=="lilypond")return false;const id=q.get("id")||"";let text="";if(id){try{text=localStorage.getItem("notation-tools-handoff-"+id)||""}catch{}}if(!text)return false;src.value=text;fmt.value="lilypond";scoreZoom=1;updateZoomLabel();remember();try{localStorage.removeItem("notation-tools-handoff-"+id)}catch{}status.textContent="LilyPond aus Composition App übernommen";history.replaceState(null,"",location.pathname+location.hash);render();return true}catch(e){status.textContent="Übergabe konnte nicht gelesen werden: "+(e?.message||String(e));return false}}
const bridgeMode=new URLSearchParams(location.search).get("bridge")==="1";
window.addEventListener("message",async e=>{const m=e.data;if(!m||m.type!=="notation-tools-lilypond-midi"||!m.id)return;try{const r=await lily.render(String(m.source||""));if(!r.midi?.length)throw Error("LilyPond-Compiler lieferte kein MIDI.");e.source?.postMessage({type:"notation-tools-lilypond-midi-result",id:m.id,ok:true,midi:Array.from(r.midi)},e.origin||"*")}catch(err){e.source?.postMessage({type:"notation-tools-lilypond-midi-result",id:m.id,ok:false,error:err?.message||String(err)},e.origin||"*")}});
if(bridgeMode){document.body.style.display="none";status.textContent="Compiler-Brücke bereit"}
else if(!readHandoff()){try{const m=JSON.parse(localStorage.getItem("notation-tools-memory")||"null");if(m?.source){src.value=m.source;if(["auto","abc","lilypond","musicxml"].includes(m.format))fmt.value=m.format;if(Number.isFinite(+m.zoom))scoreZoom=Math.max(.5,Math.min(2.5,+m.zoom));updateZoomLabel();status.textContent="letzten Stand wiederhergestellt";render()}}catch{}}
$("#save").onclick=()=>{const t=type(),u=URL.createObjectURL(new Blob([src.value],{type:"text/plain"})),a=document.createElement("a");a.href=u;a.download="score."+(t==="abc"?"abc":t==="musicxml"?"musicxml":"ly");a.click();URL.revokeObjectURL(u)};
function download(data,name,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$("#exportMidi").onclick=async()=>{try{let b;if(mode==="abc"){b=ABCJS.synth.getMidiFile(ABCJS.renderAbc("*",type()==="musicxml"?window.vertaal(new DOMParser().parseFromString(src.value,"application/xml"),{m:2}):src.value,{})[0],{midiOutputType:"binary"})}else b=player.getMidiBytes();if(!b){status.textContent="Zuerst Noten erzeugen – noch kein MIDI vorhanden.";return}download(b,"score.mid","audio/midi");status.textContent="MIDI exportiert"}catch(e){status.textContent="MIDI-Exportfehler: "+(e?.message||String(e))}};
$("#exportPdf").onclick=()=>{if(!score.querySelector("svg")){status.textContent="Zuerst Noten erzeugen.";return}window.print()};
