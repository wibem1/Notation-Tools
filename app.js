import{LilyPondRenderer}from"./lilypond-renderer.js";import{MidiPlayer}from"./midi-player.js";
const $=s=>document.querySelector(s),src=$("#source"),fmt=$("#format"),score=$("#score"),status=$("#status"),box=$("#player"),kind=$("#kind");
const lily=new LilyPondRenderer,player=new MidiPlayer({play:$("#play"),stop:$("#stop"),seek:$("#seek"),time:$("#time"),state:status});
let abcSynth=null,abcDuration=0,abcPlaying=false,mode="midi",sourceFormat="abc";
function type(){if(fmt.value!=="auto")return fmt.value;const s=src.value.trim();if(/^(<\?xml\b|<score-(partwise|timewise)\b)/i.test(s))return"musicxml";return /\\(version|score|relative|new|layout|midi)\b/.test(s)?"lilypond":"abc"}
function fmtTime(x){x=Math.max(0,+x||0);return Math.floor(x/60)+":"+String(Math.floor(x%60)).padStart(2,"0")}
function stopAbc(){try{abcSynth?.stop()}catch{}abcPlaying=false;$("#play").textContent="▶︎";$("#seek").value="0";$("#time").textContent="0:00 / "+fmtTime(abcDuration)}
async function abcPlay(){if(!abcSynth)return;try{if(abcPlaying){abcSynth.pause();abcPlaying=false;$("#play").textContent="▶︎";return}await abcSynth.start();abcPlaying=true;$("#play").textContent="❚❚";status.textContent="abcjs Synth bereit"}catch(e){status.textContent="ABC-Playback-Fehler: "+(e?.message||String(e))}}
$("#play").onclick=()=>mode==="abc"?abcPlay():player.playing?player.pause():player.play().catch(e=>player.error(e));
$("#stop").onclick=()=>mode==="abc"?stopAbc():player.stop();
$("#seek").onchange=()=>{if(mode==="abc"&&abcSynth){abcSynth.seek(+$("#seek").value||0,"seconds");$("#time").textContent=fmtTime(+$("#seek").value||0)+" / "+fmtTime(abcDuration)}};
async function abcRender(abc,label="ABC"){
 const v=ABCJS.renderAbc("score",abc,{responsive:"resize"})?.[0];if(!v)throw Error(label+" konnte nicht gesetzt werden");
 player.stop();mode="abc";abcSynth=new ABCJS.synth.CreateSynth();
 const info=await abcSynth.init({visualObj:v});await abcSynth.prime();
 abcDuration=+(info?.duration||abcSynth.duration||0);$("#seek").min="0";$("#seek").max=String(Math.max(.01,abcDuration));$("#seek").value="0";$("#time").textContent="0:00 / "+fmtTime(abcDuration);box.hidden=false;
 status.textContent=label+" gesetzt · abcjs Audio bereit";
}
async function render(){const t=type();sourceFormat=t;kind.textContent=t==="abc"?"ABC":t==="lilypond"?"LilyPond":"MusicXML";status.textContent="wird gesetzt …";box.hidden=true;stopAbc();player.stop();
 try{if(t==="abc")await abcRender(src.value);
 else if(t==="musicxml"){if(typeof window.vertaal!=="function")throw Error("MusicXML-Konverter ist nicht geladen");const doc=new DOMParser().parseFromString(src.value,"application/xml");if(doc.querySelector("parsererror"))throw Error("MusicXML ist nicht gültig");const result=window.vertaal(doc,{m:2}),abc=Array.isArray(result)?result[0]:result;if(!abc||typeof abc!=="string"||!abc.trim())throw Error("MusicXML konnte nicht in Notation umgesetzt werden"+(Array.isArray(result)&&result[1]?" · "+result[1]:""));await abcRender(abc,"MusicXML")}
 else{mode="midi";const r=await lily.render(src.value);score.innerHTML=r.svg;if(r.midi){await player.load(r.midi);box.hidden=false}status.textContent="LilyPond gesetzt"+(r.midi?" · MIDI bereit":" · kein MIDI")+" · "+(r.ms??"?")+" ms"}}catch(e){status.textContent=e.message||String(e)}}
$("#render").onclick=render;
$("#open").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;src.value=await f.text();await render()};
$("#save").onclick=()=>{const t=type(),u=URL.createObjectURL(new Blob([src.value],{type:"text/plain"})),a=document.createElement("a");a.href=u;a.download="score."+(t==="abc"?"abc":t==="musicxml"?"musicxml":"ly");a.click();URL.revokeObjectURL(u)};
function download(data,name,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$("#exportMidi").onclick=async()=>{try{let b;if(mode==="abc"){b=ABCJS.synth.getMidiFile(ABCJS.renderAbc("*",type()==="musicxml"?window.vertaal(new DOMParser().parseFromString(src.value,"application/xml"),{m:2}):src.value,{})[0],{midiOutputType:"binary"})}else b=player.getMidiBytes();if(!b){status.textContent="Zuerst Noten erzeugen – noch kein MIDI vorhanden.";return}download(b,"score.mid","audio/midi");status.textContent="MIDI exportiert"}catch(e){status.textContent="MIDI-Exportfehler: "+(e?.message||String(e))}};
$("#exportPdf").onclick=()=>{if(!score.querySelector("svg")){status.textContent="Zuerst Noten erzeugen.";return}window.print()};
