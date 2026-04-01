import { useState, useEffect, useCallback, useRef } from "react";
import { loadData as _loadData, saveData as _saveData, deleteData, saveAudio, loadAudio, deleteAudio, clearAllAudio } from "./storage.js";
import { useAuth, AuthUI, SyncBadge } from "./Auth.jsx";
import { syncAudioOnLogin } from "./sync.js";

/* ── Icons ─────────────────────────────────── */
const I=({d,size=16,color="currentColor",style={}})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...style}}>{typeof d==="string"?<path d={d}/>:d}</svg>);
const Edit=(p)=><I {...p} d={<><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></>}/>;
const Layers=(p)=><I {...p} d={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>}/>;
const FileText=(p)=><I {...p} d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>}/>;
const Lock=(p)=><I {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}/>;
const Unlock=(p)=><I {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></>}/>;
const ChevronUp=(p)=><I {...p} d="M18 15l-6-6-6 6"/>;
const ArrowRight=(p)=><I {...p} d={<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>}/>;
const ArrowLeft2=(p)=><I {...p} d={<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>}/>;
const Headphones=(p)=><I {...p} d={<><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></>}/>;
const Settings=(p)=><I {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>}/>;
const MusicIcon=(p)=><I {...p} d={<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>}/>;
const Play=(p)=><I {...p} d={<polygon points="5 3 19 12 5 21 5 3" fill={p.fill||"none"}/>}/>;
const PauseI=(p)=><I {...p} d={<><rect x="6" y="4" width="4" height="16" fill={p.fill||"none"}/><rect x="14" y="4" width="4" height="16" fill={p.fill||"none"}/></>}/>;
const MicIcon=(p)=><I {...p} d={<><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></>}/>;
const StopCircle=(p)=><I {...p} d={<><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" fill={p.fill||"none"}/></>}/>;
const RepeatIcon=(p)=><I {...p} d={<><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></>}/>;
const SkipBack=(p)=><I {...p} d={<><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></>}/>;
const SkipFwd=(p)=><I {...p} d={<><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></>}/>;
const Plus=(p)=><I {...p} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>;
const XIcon=(p)=><I {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>;
const Trash2=(p)=><I {...p} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>}/>;
const Bookmark=(p)=><I {...p} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>;
const Tag=(p)=><I {...p} d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>}/>;
const Upload=(p)=><I {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>}/>;
const Copy=(p)=><I {...p} d={<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>}/>;
const ChevronDown=(p)=><I {...p} d="M6 9l6 6 6-6"/>;
const ChevronLeft=(p)=><I {...p} d="M15 18l-6-6 6-6"/>;
const ChevronRight=(p)=><I {...p} d="M9 18l6-6-6-6"/>;
const FolderOpen=(p)=><I {...p} d={<><path d="M2 19a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-7l-2-2H4a2 2 0 00-2 2z"/></>}/>;
const Disc=(p)=><I {...p} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></>}/>;
const CheckIcon=(p)=><I {...p} d={<><polyline points="20 6 9 17 4 12"/></>}/>;
const Loader=({size=14,color="#fbbf24"})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={{flexShrink:0,animation:"spin 1s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>);

/* ── Storage ───────────────────────────────── */
const S_KEY="lyric-workspace-v3";const S_AP="lyric-audio:";const S_RC="lyric-rec:";
async function loadAppData(){return _loadData(S_KEY);}
async function saveAppData(d){return _saveData(S_KEY,d);}

/* ── Helpers ───────────────────────────────── */
const SEC_C={"Verse":"#3b82f6","Hook":"#f59e0b","Chorus":"#f59e0b","Bridge":"#a855f7","Outro":"#22c55e","Intro":"#22c55e"};
function getSecColor(l){const m=l.match(/^\[(.+?)\]/);if(!m)return null;for(const k of Object.keys(SEC_C)){if(m[1].toLowerCase().startsWith(k.toLowerCase()))return SEC_C[k];}return"#737373";}
function getSecLabel(l){const m=l.match(/^\[(.+?)\]/);return m?m[1]:null;}
const fmtT=s=>{if(!s||isNaN(s)||!isFinite(s))return"0:00";return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;};
const fmtS=b=>b<1048576?(b/1024).toFixed(1)+"KB":(b/1048576).toFixed(1)+"MB";
const ts=()=>{const n=new Date();return`${n.getHours()}:${String(n.getMinutes()).padStart(2,"0")}`;};
function findSection(text,sel){const idx=text.indexOf(sel);if(idx===-1)return"メモ";const before=text.substring(0,idx);const lines=text.split("\n");const li=before.split("\n").length-1;let sec="メモ";for(let i=0;i<=li&&i<lines.length;i++){const lb=getSecLabel(lines[i]);if(lb)sec=lb;}return sec;}

const DEF_PROJECTS=[{id:"proj_1",title:"New Project",emoji:"🎵"}];
const DEF_LYRICS={"proj_1":""};
const EMOJI_OPTS=["🎵","🎤","🔥","🧊","🏚️","🏀","💀","🌙","🚬","📻","🎹","🌊","⚡","🍵"];

const ff="'Noto Sans JP',sans-serif";const mf="'JetBrains Mono',monospace";

/* ═══════════════════════════════════════════════
   MOBILE APP
   ═══════════════════════════════════════════════ */
export default function MobileApp(){
  const remoteRef=useRef(null);
  const audioSyncRef=useRef(null);
  const{user,authLoading,syncStatus,login,register,logout,push,pushNow,pushAudio,removeAudio,hasSupabase}=useAuth(
    useCallback((data)=>{if(remoteRef.current)remoteRef.current(data);},[]),
    useCallback(async(userId,aLib,rLib)=>{if(audioSyncRef.current)await audioSyncRef.current(userId,aLib,rLib);},[])
  );
  const[loading,setLoading]=useState(true);
  const[projects,setProjects]=useState(DEF_PROJECTS);const[activeProj,setActiveProj]=useState("proj_1");
  const[lyrics,setLyrics]=useState(DEF_LYRICS);const[cards,setCards]=useState([]);
  const[audioLib,setAudioLib]=useState([]);const[recLib,setRecLib]=useState([]);
  const[activeTrackId,setActiveTrackId]=useState(null);
  const[memo,setMemo]=useState({});
  const[projectList,setProjectList]=useState([]);

  const[tab,setTab]=useState("editor");
  const[isPlaying,setIsPlaying]=useState(false);const[isMuted,setIsMuted]=useState(false);
  const[seekPos,setSeekPos]=useState(0);const[volume,setVolume]=useState(0.7);
  const[trackName,setTrackName]=useState("");const[curTime,setCurTime]=useState(0);const[dur,setDur]=useState(0);
  const[repeatOn,setRepeatOn]=useState(false);
  const[isRecording,setIsRecording]=useState(false);
  const[saveStatus,setSaveStatus]=useState("idle");
  const[showPlayer,setShowPlayer]=useState(false);
  const[showNewProj,setShowNewProj]=useState(false);const[newProjTitle,setNewProjTitle]=useState("");const[newProjEmoji,setNewProjEmoji]=useState("🎵");
  const[showScrapInput,setShowScrapInput]=useState(false);const[scrapInputText,setScrapInputText]=useState("");const[scrapInputTags,setScrapInputTags]=useState("");
  const[tagFilter,setTagFilter]=useState("all");
  const[selText,setSelText]=useState("");const[showSelBar,setShowSelBar]=useState(false);
  const[uploadingAudio,setUploadingAudio]=useState(false);
  const[trash,setTrash]=useState([]);
  const[confirmReset,setConfirmReset]=useState(false);
  const[showTrashView,setShowTrashView]=useState(false);
  const[projPickerOpen,setProjPickerOpen]=useState(false);
  const[editingName,setEditingName]=useState(null);const[editNameVal,setEditNameVal]=useState("");
  const[longPressMenu,setLongPressMenu]=useState(null);
  const longPressTimer=useRef(null);

  const saveTimer=useRef(null);const audioEl=useRef(null);const fileInput=useRef(null);
  const stateRef=useRef({});
  const audioCache=useRef({});const mediaRec=useRef(null);const recChunks=useRef([]);
  const audioCtx=useRef(null);const dest=useRef(null);

  const btn={background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center"};

  // Always keep stateRef up to date for async push
  stateRef.current={projects,lyrics,cards,activeProj,audioLib,recLib,memo,trash,projectList};

  // Remote sync callback
  useEffect(()=>{
    remoteRef.current=async(data)=>{if(data.projects)setProjects(data.projects);if(data.lyrics)setLyrics(data.lyrics);if(data.cards)setCards(data.cards);if(data.activeProj)setActiveProj(data.activeProj);if(data.memo)setMemo(data.memo);if(data.trash)setTrash(data.trash);if(data.projectList)setProjectList(data.projectList);if(data.audioLib)setAudioLib(data.audioLib);if(data.recLib)setRecLib(data.recLib);const merged={...stateRef.current,...data};stateRef.current=merged;await saveAppData(merged);if(user&&(data.audioLib||data.recLib)){await syncAudioOnLogin(user.id,data.audioLib||[],data.recLib||[],loadAudio,saveAudio,S_AP,S_RC,audioCache);}};
    audioSyncRef.current=async(userId,aLib,rLib)=>{await syncAudioOnLogin(userId,aLib,rLib,loadAudio,saveAudio,S_AP,S_RC,audioCache);setAudioLib(aLib);setRecLib(rLib);};
  });

  /* ── Audio init ── */
  useEffect(()=>{const a=new Audio();a.preload="metadata";a.addEventListener("timeupdate",()=>{setCurTime(a.currentTime);if(a.duration)setSeekPos((a.currentTime/a.duration)*100);});a.addEventListener("loadedmetadata",()=>{if(a.duration===Infinity||isNaN(a.duration)){a.currentTime=1e101;const fix=()=>{a.currentTime=0;setDur(a.duration);a.removeEventListener("timeupdate",fix);};a.addEventListener("timeupdate",fix);}else{setDur(a.duration);}});a.addEventListener("ended",()=>{if(a.loop)return;setIsPlaying(false);setSeekPos(0);setCurTime(0);});audioEl.current=a;return()=>{a.pause();a.src="";};},[]);

  /* ── Load ── */
  useEffect(()=>{(async()=>{try{const d=await loadAppData();if(d){d.projects&&setProjects(d.projects);d.lyrics&&setLyrics(d.lyrics);d.cards&&setCards(d.cards);d.activeProj&&setActiveProj(d.activeProj);d.audioLib&&setAudioLib(d.audioLib);d.recLib&&setRecLib(d.recLib);d.memo&&setMemo(d.memo);if(d.trash){const now=Date.now();setTrash(d.trash.filter(t=>now-t.deletedAt<30*24*60*60*1000));}if(d.projectList)setProjectList(d.projectList);}}catch(e){console.error("Load error:",e);}setLoading(false);})();},[]);

  // Auto-pull from cloud on restart if logged in
  const hasPulledRef=useRef(false);
  useEffect(()=>{if(authLoading||!user||hasPulledRef.current)return;hasPulledRef.current=true;(async()=>{try{const{pullFromCloud}=await import("./sync.js");const result=await pullFromCloud(user.id);if(result.data){const d=result.data;if(d.projects)setProjects(d.projects);if(d.lyrics)setLyrics(d.lyrics);if(d.cards)setCards(d.cards);if(d.activeProj)setActiveProj(d.activeProj);if(d.memo)setMemo(d.memo);if(d.trash){const now=Date.now();setTrash(d.trash.filter(t=>now-t.deletedAt<30*24*60*60*1000));}if(d.projectList)setProjectList(d.projectList);if(d.audioLib){setAudioLib(d.audioLib);}if(d.recLib){setRecLib(d.recLib);}const{syncAudioOnLogin:sAOL}=await import("./sync.js");await sAOL(user.id,d.audioLib||[],d.recLib||[],loadAudio,saveAudio,S_AP,S_RC,audioCache);}}catch(e){console.error("Auto-pull error:",e);}})();},[user,authLoading]);

  /* ── Save ── */
  const doSave=useCallback((o={})=>{if(saveTimer.current)clearTimeout(saveTimer.current);setSaveStatus("saving");saveTimer.current=setTimeout(async()=>{const s=stateRef.current;const d={projects:o.projects||s.projects,lyrics:o.lyrics||s.lyrics,cards:o.cards||s.cards,activeProj:o.activeProj||s.activeProj,audioLib:o.audioLib||s.audioLib,recLib:o.recLib||s.recLib,memo:o.memo||s.memo,trash:o.trash||s.trash,projectList:o.projectList||s.projectList};await saveAppData(d);if(user){push(d);}setSaveStatus("saved");setTimeout(()=>setSaveStatus("idle"),1500);},800);},[user,push]);

  const curText=lyrics[activeProj]||"";
  const setCurText=t=>{const nl={...lyrics,[activeProj]:t};setLyrics(nl);doSave({lyrics:nl});};
  const curProject=projects.find(p=>p.id===activeProj)||projectList.find(p=>p.id===activeProj);
  const curMemo=memo[activeProj]||"";
  const setCurMemo=t=>{const nm={...memo,[activeProj]:t};setMemo(nm);doSave({memo:nm});};
  const allTags=[...new Set(cards.filter(c=>c.projId===activeProj).flatMap(c=>c.tags))];
  const filteredCards=cards.filter(c=>c.projId===activeProj&&(tagFilter==="all"||c.tags.includes(tagFilter)));
  const sections=[];curText.split("\n").forEach(l=>{const lb=getSecLabel(l);if(lb)sections.push({label:lb,color:getSecColor(l)});});

  const switchProject=id=>{setActiveProj(id);setTagFilter("all");setProjPickerOpen(false);doSave({activeProj:id});};
  const addProject=()=>{if(!newProjTitle.trim())return;const id="proj_"+Date.now(),np=[...projects,{id,title:newProjTitle.trim(),emoji:newProjEmoji}];const nl={...lyrics,[id]:""};setProjects(np);setLyrics(nl);setActiveProj(id);setShowNewProj(false);setNewProjTitle("");setNewProjEmoji("🎵");doSave({projects:np,lyrics:nl,activeProj:id});};
  const deleteProject=id=>{const proj=projects.find(p=>p.id===id)||projectList.find(p=>p.id===id);if(!proj||proj.locked)return;if(projects.find(p=>p.id===id)&&projects.length<=1)return;const trashItem={id:"tr_"+Date.now(),type:"project",data:{project:proj,lyrics:lyrics[id],cards:cards.filter(c=>c.projId===id),memo:memo[id]},deletedAt:Date.now()};const nt=[...trash,trashItem];const np=projects.filter(p=>p.id!==id);const npl=projectList.filter(p=>p.id!==id);const nl={...lyrics};delete nl[id];const nc=cards.filter(c=>c.projId!==id);const na=id===activeProj?(np[0]||npl[0])?.id||"proj_1":activeProj;const nm={...memo};delete nm[id];setTrash(nt);setProjects(np);setProjectList(npl);setLyrics(nl);setCards(nc);setActiveProj(na);setMemo(nm);doSave({trash:nt,projects:np,projectList:npl,lyrics:nl,cards:nc,activeProj:na,memo:nm});};
  const renameProject=(id,n)=>{const np=projects.map(p=>p.id===id?{...p,title:n}:p);const npl=projectList.map(p=>p.id===id?{...p,title:n}:p);setProjects(np);setProjectList(npl);doSave({projects:np,projectList:npl});};
  const toggleLock=(id)=>{const np=projects.map(p=>p.id===id?{...p,locked:!p.locked}:p);const npl=projectList.map(p=>p.id===id?{...p,locked:!p.locked}:p);setProjects(np);setProjectList(npl);doSave({projects:np,projectList:npl});};
  const moveToList=(id)=>{const p=projects.find(x=>x.id===id);if(!p||projects.length<=1)return;const np=projects.filter(x=>x.id!==id);const npl=[...projectList,p];setProjects(np);setProjectList(npl);if(activeProj===id)setActiveProj(np[0].id);doSave({projects:np,projectList:npl});};
  const moveToProjects=(id)=>{const p=projectList.find(x=>x.id===id);if(!p)return;const npl=projectList.filter(x=>x.id!==id);const np=[...projects,p];setProjects(np);setProjectList(npl);doSave({projects:np,projectList:npl});};
  const reorderArr=(arr,setArr,key,idx,dir)=>{const n=[...arr];const ni=idx+dir;if(ni<0||ni>=n.length)return;[n[idx],n[ni]]=[n[ni],n[idx]];setArr(n);doSave({[key]:n});};
  const allProjs=[...projects,...projectList];
  const swipeNav=(dir)=>{const idx=allProjs.findIndex(p=>p.id===activeProj);const ni=idx+dir;if(ni>=0&&ni<allProjs.length){switchProject(allProjs[ni].id);}};

  /* ── Scrap ── */
  const saveToScrap=()=>{if(!selText.trim())return;const sec=findSection(curText,selText);const nc=[{id:Date.now(),text:selText,tags:[sec],time:ts(),projId:activeProj},...cards];setCards(nc);setShowSelBar(false);setSelText("");doSave({cards:nc});setTab("scraps");};
  const deleteCard=id=>{const nc=cards.filter(c=>c.id!==id);setCards(nc);doSave({cards:nc});};
  const addManualCard=()=>{if(!scrapInputText.trim())return;const tags=scrapInputTags.trim()?scrapInputTags.split(/[,、\s]+/).filter(Boolean):["メモ"];const nc=[{id:Date.now(),text:scrapInputText.trim(),tags,time:ts(),projId:activeProj},...cards];setCards(nc);setScrapInputText("");setScrapInputTags("");setShowScrapInput(false);doSave({cards:nc});};
  const copyText=t=>{navigator.clipboard?.writeText(t).catch(()=>{});};

  /* ── Audio ── */
  const playTrack=useCallback((meta,b64)=>{const a=audioEl.current;if(!a)return;if(meta.id===activeTrackId&&a.src){if(isPlaying){a.pause();setIsPlaying(false);}else{a.play().then(()=>setIsPlaying(true)).catch(()=>{});}return;}a.pause();a.src=b64;a.volume=isMuted?0:volume;a.loop=repeatOn;setTrackName(meta.name);setActiveTrackId(meta.id);setSeekPos(0);setCurTime(0);setDur(0);a.load();const r=()=>{a.play().then(()=>setIsPlaying(true)).catch(()=>{});a.removeEventListener("canplay",r);};a.addEventListener("canplay",r);},[isMuted,volume,activeTrackId,isPlaying,repeatOn]);
  const loadAndPlay=useCallback(async(meta,prefix=S_AP)=>{let b=audioCache.current[meta.id];if(!b){b=await loadAudio(prefix+meta.id);if(!b)return;audioCache.current[meta.id]=b;}playTrack(meta,b);},[playTrack]);
  const handleFileUpload=async e=>{const file=e.target.files?.[0];if(!file)return;setUploadingAudio(true);const reader=new FileReader();reader.onload=async ev=>{const b64=ev.target.result;const id="aud_"+Date.now();const meta={id,name:file.name.replace(/\.[^.]+$/,""),size:file.size,ext:file.name.split(".").pop()};const ok=await saveAudio(S_AP+id,b64);if(!ok){alert("ファイルサイズ上限超過");setUploadingAudio(false);return;}audioCache.current[id]=b64;pushAudio(id,b64);const nal=[...audioLib,meta];setAudioLib(nal);doSave({audioLib:nal});playTrack(meta,b64);setUploadingAudio(false);};reader.readAsDataURL(file);e.target.value="";};
  const removeTrack=async(id,lib,setLib,prefix,key)=>{const track=lib.find(t=>t.id===id);const trashItem={id:"tr_"+Date.now(),type:key==="audioLib"?"audio":"recording",data:{track},deletedAt:Date.now()};const nt=[...trash,trashItem];setTrash(nt);const nl=lib.filter(t=>t.id!==id);setLib(nl);if(activeTrackId===id){audioEl.current?.pause();setTrackName("");setIsPlaying(false);setActiveTrackId(null);}doSave({trash:nt,[key]:nl});};

  // Trash functions
  const restoreFromTrash=(trashId)=>{const item=trash.find(t=>t.id===trashId);if(!item)return;const nt=trash.filter(t=>t.id!==trashId);if(item.type==="project"){const d=item.data;const np=[...projects,d.project];const nl={...lyrics,[d.project.id]:d.lyrics||""};const nc=[...cards,...(d.cards||[])];const nm={...memo,[d.project.id]:d.memo||""};setProjects(np);setLyrics(nl);setCards(nc);setMemo(nm);setTrash(nt);doSave({trash:nt,projects:np,lyrics:nl,cards:nc,memo:nm});}else{const track=item.data.track;if(item.type==="audio"){const nal=[...audioLib,track];setAudioLib(nal);setTrash(nt);doSave({trash:nt,audioLib:nal});}else{const nrl=[...recLib,track];setRecLib(nrl);setTrash(nt);doSave({trash:nt,recLib:nrl});}}};
  const permanentDeleteTrash=async(trashId)=>{const item=trash.find(t=>t.id===trashId);if(!item)return;if(item.type==="audio"||item.type==="recording"){const track=item.data.track;const prefix=item.type==="audio"?S_AP:S_RC;await deleteAudio(prefix+track.id);delete audioCache.current[track.id];await removeAudio(track.id);}const nt=trash.filter(t=>t.id!==trashId);setTrash(nt);const sd={projects,lyrics,cards,activeProj,audioLib,recLib,memo,trash:nt,projectList};await saveAppData(sd);if(user)await pushNow(sd);};
  const emptyTrash=async()=>{for(const item of trash){if(item.type==="audio"||item.type==="recording"){const track=item.data.track;const prefix=item.type==="audio"?S_AP:S_RC;await deleteAudio(prefix+track.id);delete audioCache.current[track.id];await removeAudio(track.id);}}setTrash([]);const sd={projects,lyrics,cards,activeProj,audioLib,recLib,memo,trash:[],projectList};await saveAppData(sd);if(user)await pushNow(sd);};
  const daysLeft=(deletedAt)=>Math.max(0,30-Math.floor((Date.now()-deletedAt)/(24*60*60*1000)));
  const renameTrk=(lib,setLib,key,id,n)=>{const nl=lib.map(t=>t.id===id?{...t,name:n}:t);setLib(nl);if(activeTrackId===id)setTrackName(n);doSave({[key]:nl});};
  const toggleTrackLock=(lib,setLib,key,id)=>{const nl=lib.map(t=>t.id===id?{...t,locked:!t.locked}:t);setLib(nl);doSave({[key]:nl});};
  const startLongPress=(id,from,idx)=>{longPressTimer.current=setTimeout(()=>{setLongPressMenu({id,from,idx});},500);};
  const cancelLongPress=()=>{if(longPressTimer.current)clearTimeout(longPressTimer.current);};
  const dblTapRef=useRef({id:null,time:0});
  const tapTimerRef=useRef(null);
  const handleTap=(id,name,action)=>{const now=Date.now();if(dblTapRef.current.id===id&&now-dblTapRef.current.time<350){if(tapTimerRef.current)clearTimeout(tapTimerRef.current);tapTimerRef.current=null;setEditingName(id);setEditNameVal(name);dblTapRef.current={id:null,time:0};}else{dblTapRef.current={id,time:now};if(tapTimerRef.current)clearTimeout(tapTimerRef.current);tapTimerRef.current=setTimeout(()=>{if(action)action();tapTimerRef.current=null;},350);}};

  useEffect(()=>{if(audioEl.current)audioEl.current.volume=isMuted?0:volume;},[volume,isMuted]);
  useEffect(()=>{if(audioEl.current)audioEl.current.loop=repeatOn;},[repeatOn]);
  const togglePlay=()=>{const a=audioEl.current;if(!a||!a.src)return;if(isPlaying){a.pause();setIsPlaying(false);}else{a.play().then(()=>setIsPlaying(true)).catch(()=>{});}};
  const handleSeek=v=>{setSeekPos(v);if(audioEl.current&&dur)audioEl.current.currentTime=(v/100)*dur;};

  /* ── Recording ── */
  const startRec=async()=>{try{const ms=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,autoGainControl:false,noiseSuppression:false}});const ctx=new(window.AudioContext||window.webkitAudioContext)({sampleRate:48000});audioCtx.current=ctx;await ctx.resume();const d=ctx.createMediaStreamDestination();d.channelCount=2;d.channelCountMode="explicit";d.channelInterpretation="speakers";const mixBus=ctx.createGain();mixBus.channelCount=2;mixBus.channelCountMode="explicit";mixBus.channelInterpretation="speakers";mixBus.connect(d);dest.current=d;ctx.createMediaStreamSource(ms).connect(mixBus);const a=audioEl.current;if(a&&a.src){try{const s2=a.captureStream?a.captureStream():a.mozCaptureStream();ctx.createMediaStreamSource(s2).connect(mixBus);}catch(e){}if(a.paused){a.play().then(()=>setIsPlaying(true)).catch(()=>{});}}recChunks.current=[];const mr=new MediaRecorder(d.stream,{mimeType:MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm"});mr.ondataavailable=e=>{if(e.data.size>0)recChunks.current.push(e.data);};mr.onstop=async()=>{ms.getTracks().forEach(t=>t.stop());const blob=new Blob(recChunks.current,{type:"audio/webm"});const r=new FileReader();r.onload=async ev=>{const b64=ev.target.result;const id="rec_"+Date.now();const meta={id,name:"録音_"+ts().replace(":",""),size:blob.size,ext:"webm"};await saveAudio(S_RC+id,b64);audioCache.current[id]=b64;pushAudio(id,b64);const nrl=[...recLib,meta];setRecLib(nrl);doSave({recLib:nrl});};r.readAsDataURL(blob);try{ctx.close();}catch(e){}audioCtx.current=null;};mr.start(100);mediaRec.current=mr;setIsRecording(true);}catch(e){alert("マイクアクセスを許可してください\n"+e.message);}};
  const stopRec=()=>{if(mediaRec.current&&isRecording){mediaRec.current.stop();mediaRec.current=null;setIsRecording(false);}};

  /* ── Selection check ── */
  const checkSelection=()=>{const s=window.getSelection().toString().trim();if(s&&s.length>0){setSelText(s);setShowSelBar(true);}else{setShowSelBar(false);}};

  const hasSrc=!!activeTrackId;

  if(loading)return(<div style={{fontFamily:ff,position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a0a",color:"#737373",fontSize:14}}>読み込み中...</div>);

  return(
    <div style={{fontFamily:ff,position:"fixed",top:0,left:0,right:0,bottom:0,display:"flex",flexDirection:"column",background:"#0a0a0a",color:"#e5e5e5",overflow:"hidden",maxWidth:480,margin:"0 auto"}}>
      <input ref={fileInput} type="file" accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma,.opus,.webm" style={{display:"none"}} onChange={handleFileUpload}/>

      {/* ── Header ── */}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,borderBottom:"1px solid #1a1a1a"}}>
        <div style={{display:"flex",alignItems:"center",gap:4,flex:1,minWidth:0}}>
          <button onClick={()=>swipeNav(-1)} style={{...btn,padding:4,color:allProjs.findIndex(p=>p.id===activeProj)>0?"#737373":"#262626",flexShrink:0}}><ChevronLeft size={16}/></button>
          <button onClick={()=>setProjPickerOpen(!projPickerOpen)} style={{...btn,gap:8,flex:1,minWidth:0}}>
            <span style={{fontSize:20,flexShrink:0}}>{curProject?.emoji||"🎵"}</span>
            <div style={{textAlign:"left",minWidth:0,flex:1}}>
              <div style={{fontSize:15,fontWeight:600,color:"#f5f5f5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{curProject?.title||"無題"}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{fontSize:10,color:saveStatus==="saving"?"#fbbf24":"#404040",fontFamily:mf}}>{saveStatus==="saving"?"保存中...":"自動保存"}</div>
                {user&&<SyncBadge syncStatus={syncStatus} user={user}/>}
              </div>
            </div>
            <ChevronDown size={14} color="#525252" style={{flexShrink:0}}/>
          </button>
          <button onClick={()=>swipeNav(1)} style={{...btn,padding:4,color:allProjs.findIndex(p=>p.id===activeProj)<allProjs.length-1?"#737373":"#262626",flexShrink:0}}><ChevronRight size={16}/></button>
        </div>
        <button onClick={()=>setShowPlayer(!showPlayer)} style={{...btn,width:36,height:36,borderRadius:18,background:showPlayer?"#262626":"#171717",border:"1px solid #333",flexShrink:0,marginLeft:8}}>
          <MusicIcon size={16} color={hasSrc?"#fbbf24":"#525252"}/>
        </button>
      </div>

      {/* ── Project Picker ── */}
      {projPickerOpen&&<div onClick={()=>{setProjPickerOpen(false);setLongPressMenu(null);}} style={{position:"fixed",inset:0,zIndex:40}}/>}
      {projPickerOpen&&(<div style={{position:"absolute",top:56,left:0,right:0,zIndex:50,background:"#171717",border:"1px solid #333",borderRadius:"0 0 16px 16px",padding:12,maxHeight:"60vh",overflowY:"auto",boxShadow:"0 20px 40px rgba(0,0,0,0.5)",maxWidth:480,margin:"0 auto"}}>
        <div style={{fontSize:10,fontWeight:500,color:"#737373",textTransform:"uppercase",letterSpacing:"0.1em",padding:"0 4px",marginBottom:6}}>PROJECTS</div>
        {projects.map((p,idx)=>(<div key={p.id} onClick={()=>{if(editingName===p.id)return;handleTap(p.id,p.title,()=>switchProject(p.id));}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:10,background:activeProj===p.id?"#262626":"transparent",marginBottom:4,cursor:"pointer"}} onTouchStart={()=>startLongPress(p.id,"projects",idx)} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress}>
          <span style={{fontSize:16}}>{p.emoji}</span>
          <div style={{flex:1,minWidth:0}}>{editingName===p.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #fbbf2440",borderRadius:6,padding:"4px 8px",fontSize:16,color:"#e5e5e5",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<span style={{fontSize:14,color:activeProj===p.id?"#f5f5f5":"#a3a3a3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{p.title}</span>}</div>
          <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>toggleLock(p.id)} style={{...btn,padding:4,color:p.locked?"#fbbf24":"#333"}}>{p.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
            {projects.length>1&&!p.locked&&<button onClick={()=>deleteProject(p.id)} style={{...btn,padding:4,color:"#404040"}}><XIcon size={12}/></button>}
          </div>
        </div>))}
        {longPressMenu&&longPressMenu.from==="projects"&&(<div style={{background:"#0a0a0a",border:"1px solid #404040",borderRadius:10,padding:8,marginBottom:8}}>
          <div style={{fontSize:10,color:"#737373",marginBottom:6,padding:"0 4px"}}>{projects.find(p=>p.id===longPressMenu.id)?.title}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>{reorderArr(projects,setProjects,"projects",longPressMenu.idx,-1);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:11,fontFamily:ff}}>↑上へ</button>
            <button onClick={()=>{reorderArr(projects,setProjects,"projects",longPressMenu.idx,1);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:11,fontFamily:ff}}>↓下へ</button>
            {projects.length>1&&<button onClick={()=>{moveToList(longPressMenu.id);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(251,191,36,0.3)",background:"rgba(251,191,36,0.08)",color:"#fbbf24",fontSize:11,fontFamily:ff}}>リストに移動</button>}
          </div>
        </div>)}
        {(projectList.length>0)&&(<><div style={{fontSize:10,fontWeight:500,color:"#737373",textTransform:"uppercase",letterSpacing:"0.1em",padding:"0 4px",marginTop:12,marginBottom:6}}>LIST</div>
        {projectList.map((p,idx)=>(<div key={p.id} onClick={()=>{if(editingName===p.id)return;handleTap(p.id,p.title,()=>switchProject(p.id));}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:10,background:activeProj===p.id?"#262626":"transparent",marginBottom:4,cursor:"pointer"}} onTouchStart={()=>startLongPress(p.id,"list",idx)} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress}>
          <span style={{fontSize:16}}>{p.emoji}</span>
          <div style={{flex:1,minWidth:0}}>{editingName===p.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #fbbf2440",borderRadius:6,padding:"4px 8px",fontSize:16,color:"#e5e5e5",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<span style={{fontSize:14,color:activeProj===p.id?"#f5f5f5":"#a3a3a3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{p.title}</span>}</div>
          <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>toggleLock(p.id)} style={{...btn,padding:4,color:p.locked?"#fbbf24":"#333"}}>{p.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
            {!p.locked&&<button onClick={()=>deleteProject(p.id)} style={{...btn,padding:4,color:"#404040"}}><XIcon size={12}/></button>}
          </div>
        </div>))}
        {longPressMenu&&longPressMenu.from==="list"&&(<div style={{background:"#0a0a0a",border:"1px solid #404040",borderRadius:10,padding:8,marginBottom:8}}>
          <div style={{fontSize:10,color:"#737373",marginBottom:6,padding:"0 4px"}}>{projectList.find(p=>p.id===longPressMenu.id)?.title}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>{reorderArr(projectList,setProjectList,"projectList",longPressMenu.idx,-1);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:11,fontFamily:ff}}>↑上へ</button>
            <button onClick={()=>{reorderArr(projectList,setProjectList,"projectList",longPressMenu.idx,1);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:11,fontFamily:ff}}>↓下へ</button>
            <button onClick={()=>{moveToProjects(longPressMenu.id);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(251,191,36,0.3)",background:"rgba(251,191,36,0.08)",color:"#fbbf24",fontSize:11,fontFamily:ff}}>プロジェクトに移動</button>
          </div>
        </div>)}</>)}
        {showNewProj?(<div style={{padding:12,background:"#0a0a0a",borderRadius:10,marginTop:8}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{EMOJI_OPTS.map(e=>(<button key={e} onClick={()=>setNewProjEmoji(e)} style={{...btn,width:30,height:30,borderRadius:8,fontSize:14,background:newProjEmoji===e?"#262626":"transparent",border:newProjEmoji===e?"1px solid #525252":"1px solid transparent"}}>{e}</button>))}</div>
          <input placeholder="プロジェクト名" value={newProjTitle} onChange={e=>setNewProjTitle(e.target.value)} style={{width:"100%",background:"#171717",border:"1px solid #333",borderRadius:8,padding:"10px 12px",fontSize:16,color:"#e5e5e5",outline:"none",fontFamily:ff,boxSizing:"border-box",marginBottom:8}}/>
          <div style={{display:"flex",gap:8}}><button onClick={addProject} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#fbbf24",color:"#171717",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff}}>作成</button><button onClick={()=>setShowNewProj(false)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:13,cursor:"pointer",fontFamily:ff}}>取消</button></div>
        </div>):(<button onClick={()=>setShowNewProj(true)} style={{...btn,width:"100%",padding:"12px",borderRadius:10,border:"1px dashed #333",color:"#737373",gap:6,justifyContent:"center",fontFamily:ff,fontSize:13,marginTop:8}}><Plus size={14}/> 新しいプロジェクト</button>)}
      </div>)}

      {/* ── Content ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* EDITOR TAB */}
        {tab==="editor"&&(<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {sections.length>0&&(<div style={{padding:"10px 16px",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0,borderBottom:"1px solid #1a1a1a"}}>{sections.map((s,i)=>(<span key={i} style={{fontSize:11,fontFamily:mf,fontWeight:500,color:s.color,background:s.color+"18",border:`1px solid ${s.color}40`,borderRadius:6,padding:"4px 12px"}}>{s.label}</span>))}</div>)}
          <div style={{flex:1,overflow:"auto",position:"relative"}}>
            <textarea value={curText} onChange={e=>setCurText(e.target.value)} onSelect={checkSelection} onTouchEnd={()=>setTimeout(checkSelection,200)} spellCheck={false} style={{width:"100%",height:"100%",fontFamily:ff,fontSize:16,lineHeight:2,letterSpacing:"0.02em",caretColor:"#fbbf24",background:"transparent",color:"#e5e5e5",border:"none",outline:"none",resize:"none",padding:"16px",boxSizing:"border-box"}}/>
          </div>
          {/* Selection toolbar */}
          {showSelBar&&selText&&(<div style={{position:"absolute",bottom:140,left:16,right:16,background:"#171717",border:"1px solid #404040",borderRadius:12,padding:"8px",display:"flex",justifyContent:"center",gap:4,zIndex:20,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
            <button onClick={saveToScrap} style={{...btn,gap:6,padding:"10px 16px",borderRadius:8,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",color:"#fbbf24",fontFamily:ff,fontSize:12}}><Bookmark size={14}/>スクラップに保存</button>
            <button onClick={()=>{copyText(selText);setShowSelBar(false);}} style={{...btn,gap:6,padding:"10px 16px",borderRadius:8,color:"#a3a3a3",fontFamily:ff,fontSize:12}}><Copy size={14}/>コピー</button>
            <button onClick={()=>setShowSelBar(false)} style={{...btn,padding:"10px",borderRadius:8,color:"#525252"}}><XIcon size={14}/></button>
          </div>)}
        </div>)}

        {/* SCRAPS TAB */}
        {tab==="scraps"&&(<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,borderBottom:"1px solid #1a1a1a"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1,marginRight:8}}>
              {["all",...allTags].map(t=>(<button key={t} onClick={()=>setTagFilter(t)} style={{...btn,fontSize:11,padding:"5px 12px",borderRadius:20,background:tagFilter===t?"rgba(251,191,36,0.12)":"#171717",color:tagFilter===t?"#fbbf24":"#737373",border:tagFilter===t?"1px solid rgba(251,191,36,0.25)":"1px solid #262626",fontFamily:ff}}>{t==="all"?"すべて":t}</button>))}
            </div>
            <button onClick={()=>setShowScrapInput(!showScrapInput)} style={{...btn,width:36,height:36,borderRadius:18,background:showScrapInput?"#262626":"#171717",border:"1px solid #333"}}><Plus size={16} color={showScrapInput?"#fbbf24":"#a3a3a3"}/></button>
          </div>
          {showScrapInput&&(<div style={{padding:16,borderBottom:"1px solid #1a1a1a",flexShrink:0}}>
            <textarea value={scrapInputText} onChange={e=>setScrapInputText(e.target.value)} placeholder="アイデア、フレーズ..." rows={3} autoFocus style={{width:"100%",background:"#171717",border:"1px solid #333",borderRadius:10,padding:"12px",fontSize:16,color:"#e5e5e5",outline:"none",fontFamily:ff,resize:"vertical",lineHeight:1.6,boxSizing:"border-box",marginBottom:8}}/>
            <input value={scrapInputTags} onChange={e=>setScrapInputTags(e.target.value)} placeholder="タグ（カンマ区切り）" style={{width:"100%",background:"#171717",border:"1px solid #333",borderRadius:10,padding:"10px 12px",fontSize:16,color:"#e5e5e5",outline:"none",fontFamily:ff,boxSizing:"border-box",marginBottom:8}}/>
            <div style={{display:"flex",gap:8}}><button onClick={addManualCard} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#fbbf24",color:"#171717",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff}}>追加</button><button onClick={()=>{setShowScrapInput(false);setScrapInputText("");setScrapInputTags("");}} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:13,cursor:"pointer",fontFamily:ff}}>取消</button></div>
          </div>)}
          <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
            {filteredCards.length===0&&<div style={{textAlign:"center",padding:"40px 16px",color:"#404040",fontSize:13}}>エディタでテキスト選択→ツールバーで保存<br/>または＋ボタンで手動追加</div>}
            {filteredCards.map(c=>(<div key={c.id} style={{background:"#171717",border:"1px solid #262626",borderRadius:12,padding:14}}>
              <p style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-line",color:"#d4d4d4",margin:"0 0 10px"}}>{c.text}</p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{c.tags.map(t=>(<span key={t} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"#262626",color:"#a3a3a3",display:"inline-flex",alignItems:"center",gap:3}}><Tag size={8}/>{t}</span>))}</div>
                <div style={{display:"flex",gap:8}}><button onClick={()=>copyText(c.text)} style={{...btn,padding:6,color:"#525252"}}><Copy size={16}/></button><button onClick={()=>deleteCard(c.id)} style={{...btn,padding:6,color:"#525252"}}><Trash2 size={16}/></button></div>
              </div>
            </div>))}
          </div>
        </div>)}

        {/* MEMO TAB */}
        {tab==="memo"&&(<div style={{flex:1,padding:16}}>
          <textarea value={curMemo} onChange={e=>setCurMemo(e.target.value)} placeholder="自由にメモ..." spellCheck={false} style={{width:"100%",height:"100%",background:"#171717",borderRadius:12,border:"1px solid #262626",color:"#d4d4d4",outline:"none",resize:"none",padding:16,fontSize:16,lineHeight:1.8,fontFamily:ff,boxSizing:"border-box"}}/>
        </div>)}

        {/* LIBRARY TAB */}
        {tab==="library"&&(<div style={{flex:1,overflowY:"auto",padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:500,color:"#737373",textTransform:"uppercase",letterSpacing:"0.1em"}}>Music Library</span>
            <button onClick={()=>fileInput.current?.click()} style={{...btn,width:36,height:36,borderRadius:18,background:"#171717",border:"1px solid #333"}}><Upload size={16} color="#a3a3a3"/></button>
          </div>
          {uploadingAudio&&<div style={{padding:12,fontSize:12,color:"#fbbf24",display:"flex",gap:6,alignItems:"center"}}><Loader size={14}/>アップロード中...</div>}
          {audioLib.length===0&&!uploadingAudio&&<div style={{padding:"20px 0",fontSize:13,color:"#404040",textAlign:"center"}}>アップロードボタンからトラックを追加</div>}
          {audioLib.map(t=>(<div key={t.id} onClick={()=>{if(editingName===t.id)return;handleTap(t.id,t.name,()=>loadAndPlay(t,S_AP));}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:activeTrackId===t.id?"rgba(251,191,36,0.06)":"#171717",border:activeTrackId===t.id?"1px solid rgba(251,191,36,0.15)":"1px solid #262626",borderRadius:12,marginBottom:8,cursor:"pointer"}}>
            <div style={{width:44,height:44,borderRadius:10,background:activeTrackId===t.id?"#1c1917":"#262626",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeTrackId===t.id&&isPlaying?<Disc size={20} color="#fbbf24" style={{animation:"spin 2s linear infinite"}}/>:<MusicIcon size={20} color={activeTrackId===t.id?"#fbbf24":"#525252"}/>}</div>
            <div style={{flex:1,minWidth:0}}>
              {editingName===t.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameTrk(audioLib,setAudioLib,"audioLib",t.id,editNameVal.trim()||t.name);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameTrk(audioLib,setAudioLib,"audioLib",t.id,editNameVal.trim()||t.name);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #fbbf2440",borderRadius:6,padding:"4px 8px",fontSize:14,color:"#e5e5e5",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<div style={{fontSize:14,color:activeTrackId===t.id?"#fbbf24":"#e5e5e5",fontWeight:500}}>{t.name}</div>}
              <div style={{fontSize:11,color:"#525252",marginTop:2}}>{fmtS(t.size)} · {t.ext}</div>
            </div>
            <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>toggleTrackLock(audioLib,setAudioLib,"audioLib",t.id)} style={{...btn,padding:6,color:t.locked?"#fbbf24":"#333"}}>{t.locked?<Lock size={12}/>:<Unlock size={12}/>}</button>
              {!t.locked&&<button onClick={()=>removeTrack(t.id,audioLib,setAudioLib,S_AP,"audioLib")} style={{...btn,padding:6,color:"#404040"}}><XIcon size={14}/></button>}
            </div>
          </div>))}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24,marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:500,color:"#737373",textTransform:"uppercase",letterSpacing:"0.1em"}}>Recordings</span>
            <span style={{fontSize:11,color:"#404040",fontFamily:mf}}>{recLib.length}</span>
          </div>
          {recLib.length===0&&<div style={{padding:"20px 0",fontSize:13,color:"#404040",textAlign:"center"}}>録音データなし</div>}
          {recLib.map(t=>(<div key={t.id} onClick={()=>{if(editingName===t.id)return;handleTap(t.id,t.name,()=>loadAndPlay(t,S_RC));}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:activeTrackId===t.id?"rgba(239,68,68,0.06)":"#171717",border:activeTrackId===t.id?"1px solid rgba(239,68,68,0.15)":"1px solid #262626",borderRadius:12,marginBottom:8,cursor:"pointer"}}>
            <div style={{width:44,height:44,borderRadius:10,background:"#262626",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeTrackId===t.id&&isPlaying?<Disc size={20} color="#f87171" style={{animation:"spin 2s linear infinite"}}/>:<MicIcon size={20} color={activeTrackId===t.id?"#f87171":"#525252"}/>}</div>
            <div style={{flex:1,minWidth:0}}>
              {editingName===t.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameTrk(recLib,setRecLib,"recLib",t.id,editNameVal.trim()||t.name);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameTrk(recLib,setRecLib,"recLib",t.id,editNameVal.trim()||t.name);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #f8717140",borderRadius:6,padding:"4px 8px",fontSize:14,color:"#e5e5e5",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<div style={{fontSize:14,color:activeTrackId===t.id?"#f87171":"#e5e5e5",fontWeight:500}}>{t.name}</div>}
              <div style={{fontSize:11,color:"#525252",marginTop:2}}>{fmtS(t.size)} · {t.ext}</div>
            </div>
            <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>toggleTrackLock(recLib,setRecLib,"recLib",t.id)} style={{...btn,padding:6,color:t.locked?"#fbbf24":"#333"}}>{t.locked?<Lock size={12}/>:<Unlock size={12}/>}</button>
              {!t.locked&&<button onClick={()=>removeTrack(t.id,recLib,setRecLib,S_RC,"recLib")} style={{...btn,padding:6,color:"#404040"}}><XIcon size={14}/></button>}
            </div>
          </div>))}
        </div>)}

        {/* SETTINGS TAB */}
        {tab==="settings"&&(<div style={{flex:1,overflowY:"auto",padding:16}}>
          <div style={{fontSize:16,fontWeight:600,color:"#e5e5e5",marginBottom:16}}>設定</div>
          <div style={{background:"#171717",borderRadius:12,border:"1px solid #262626",padding:16,marginBottom:16}}>
            <AuthUI user={user} onLogin={login} onRegister={register} onLogout={logout} syncStatus={syncStatus} hasSupabase={hasSupabase} compact />
          </div>
          {/* Trash */}
          <div style={{background:"#171717",borderRadius:12,border:"1px solid #262626",padding:16,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><Trash2 size={14} color="#737373"/><span style={{fontSize:14,color:"#e5e5e5"}}>ゴミ箱</span><span style={{fontSize:10,color:"#525252"}}>{trash.length}件</span></div>
              {!showTrashView&&trash.length>0&&<button onClick={()=>setShowTrashView(true)} style={{fontSize:11,color:"#fbbf24",background:"none",border:"none",cursor:"pointer",fontFamily:ff}}>表示</button>}
              {showTrashView&&<button onClick={()=>setShowTrashView(false)} style={{fontSize:11,color:"#737373",background:"none",border:"none",cursor:"pointer",fontFamily:ff}}>閉じる</button>}
            </div>
            {showTrashView&&(<div>
              {trash.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:"#404040",fontSize:12}}>ゴミ箱は空です</div>}
              {trash.map(item=>(<div key={item.id} style={{background:"#0a0a0a",border:"1px solid #262626",borderRadius:8,padding:12,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:item.type==="project"?"rgba(59,130,246,0.1)":item.type==="audio"?"rgba(251,191,36,0.1)":"rgba(239,68,68,0.1)",color:item.type==="project"?"#3b82f6":item.type==="audio"?"#fbbf24":"#f87171"}}>{item.type==="project"?"プロジェクト":item.type==="audio"?"音楽":"録音"}</span>
                    <span style={{fontSize:12,color:"#e5e5e5"}}>{item.type==="project"?item.data.project?.title:item.data.track?.name}</span>
                  </div>
                  <span style={{fontSize:9,color:"#525252"}}>残り{daysLeft(item.deletedAt)}日</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>restoreFromTrash(item.id)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid rgba(74,222,128,0.3)",background:"rgba(74,222,128,0.08)",color:"#4ade80",fontSize:11,cursor:"pointer",fontFamily:ff}}>復元</button>
                  <button onClick={()=>permanentDeleteTrash(item.id)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:11,cursor:"pointer",fontFamily:ff}}>完全に削除</button>
                </div>
              </div>))}
              {trash.length>0&&<button onClick={emptyTrash} style={{width:"100%",padding:"8px",borderRadius:6,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:11,cursor:"pointer",fontFamily:ff,marginTop:4}}>ゴミ箱を空にする</button>}
            </div>)}
          </div>
          <div style={{background:"#171717",borderRadius:12,border:"1px solid #262626",padding:16,marginBottom:16}}>
            <div style={{fontSize:14,color:"#e5e5e5",marginBottom:6}}>データリセット</div>
            <div style={{fontSize:12,color:"#737373",marginBottom:12}}>すべてのデータを初期状態に戻します（取消不可）</div>
            <button onClick={()=>setConfirmReset(true)} style={{padding:"10px 20px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:13,cursor:"pointer",fontFamily:ff}}>リセット</button>
          </div>
          <div style={{background:"#171717",borderRadius:12,border:"1px solid #262626",padding:16}}>
            <div style={{fontSize:14,color:"#e5e5e5",marginBottom:8}}>ストレージ情報</div>
            <div style={{fontSize:12,color:"#737373",lineHeight:1.8}}>プロジェクト: {projects.length}<br/>スクラップ: {cards.length}<br/>音楽: {audioLib.length}<br/>録音: {recLib.length}</div>
          </div>
        </div>)}
      </div>

      {/* ── Expanded Player ── */}
      {showPlayer&&(<div style={{position:"absolute",bottom:70,left:8,right:8,background:"#171717",border:"1px solid #333",borderRadius:16,padding:16,zIndex:40,boxShadow:"0 -8px 32px rgba(0,0,0,0.5)",maxWidth:464,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:500,color:"#e5e5e5"}}>{trackName||"トラック未選択"}</div>
          <button onClick={()=>setShowPlayer(false)} style={{...btn,padding:4,color:"#525252"}}><XIcon size={16}/></button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <span style={{fontSize:11,fontFamily:mf,color:"#737373",width:36,textAlign:"right"}}>{fmtT(curTime)}</span>
          <div style={{flex:1,position:"relative",height:20,display:"flex",alignItems:"center"}}><div style={{width:"100%",height:4,borderRadius:999,background:"#333"}}><div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",left:0,height:4,borderRadius:999,background:"#fbbf24",width:`${seekPos}%`}}/></div><input type="range" min={0} max={100} value={seekPos} onChange={e=>handleSeek(Number(e.target.value))} style={{position:"absolute",inset:0,width:"100%",opacity:0,cursor:"pointer"}}/></div>
          <span style={{fontSize:11,fontFamily:mf,color:"#737373",width:36}}>{fmtT(dur)}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
          {isRecording?<button onClick={stopRec} style={{...btn,padding:8}}><StopCircle size={28} color="#ef4444" fill="#ef4444"/></button>:<button onClick={startRec} style={{...btn,padding:8,color:"#737373"}}><MicIcon size={22}/></button>}
          {isRecording&&<span style={{fontSize:10,color:"#ef4444",fontFamily:mf,animation:"pulse 1s infinite"}}>REC</span>}
          <button onClick={()=>{if(audioEl.current)audioEl.current.currentTime=Math.max(0,audioEl.current.currentTime-5);}} style={{...btn,padding:8,color:hasSrc?"#a3a3a3":"#404040"}}><SkipBack size={22}/></button>
          <button onClick={togglePlay} style={{...btn,width:48,height:48,borderRadius:24,background:hasSrc?"#f5f5f5":"#333"}}>{isPlaying?<PauseI size={20} color="#171717" fill="#171717"/>:<Play size={20} color={hasSrc?"#171717":"#737373"} fill={hasSrc?"#171717":"#737373"} style={{marginLeft:2}}/>}</button>
          <button onClick={()=>{if(audioEl.current)audioEl.current.currentTime=Math.min(dur,audioEl.current.currentTime+5);}} style={{...btn,padding:8,color:hasSrc?"#a3a3a3":"#404040"}}><SkipFwd size={22}/></button>
          <button onClick={()=>setRepeatOn(!repeatOn)} style={{...btn,padding:8,color:repeatOn?"#fbbf24":"#737373"}}><RepeatIcon size={20}/></button>
        </div>
      </div>)}

      {/* ── Mini Player ── */}
      {hasSrc&&!showPlayer&&(<div onClick={()=>setShowPlayer(true)} style={{margin:"0 8px 6px",background:"#171717",borderRadius:14,border:"1px solid #262626",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:8,background:"#1c1917",border:"1px solid rgba(251,191,36,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isPlaying?<Disc size={16} color="#fbbf24" style={{animation:"spin 2s linear infinite"}}/>:<MusicIcon size={16} color="#fbbf24"/>}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:500,color:"#e5e5e5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{trackName}</div>
          <div style={{width:"100%",height:2,borderRadius:1,background:"#333",marginTop:4}}><div style={{width:`${seekPos}%`,height:"100%",borderRadius:1,background:"#fbbf24"}}/></div>
        </div>
        <button onClick={e=>{e.stopPropagation();togglePlay();}} style={{...btn,padding:6}}>{isPlaying?<PauseI size={22} color="#f5f5f5" fill="#f5f5f5"/>:<Play size={22} color="#f5f5f5" fill="#f5f5f5"/>}</button>
      </div>)}

      {/* ── Tab Bar ── */}
      {/* CONFIRM RESET */}
      {confirmReset&&(<div onClick={()=>setConfirmReset(false)} style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#171717",border:"1px solid #404040",borderRadius:12,padding:24,width:"100%",maxWidth:340,margin:"0 16px",textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>⚠️</div>
        <div style={{fontSize:14,fontWeight:500,color:"#e5e5e5",marginBottom:8}}>本当にリセットしますか？</div>
        <div style={{fontSize:12,color:"#737373",marginBottom:20,lineHeight:1.5}}>すべてのデータが完全に削除されます。この操作は取り消せません。</div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>setConfirmReset(false)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:13,cursor:"pointer",fontFamily:ff}}>キャンセル</button><button onClick={async()=>{setConfirmReset(false);for(const t of audioLib)await deleteAudio(S_AP+t.id);for(const t of recLib)await deleteAudio(S_RC+t.id);await deleteData(S_KEY);await clearAllAudio();setProjects([{id:"proj_1",title:"New Project",emoji:"🎵"}]);setLyrics({"proj_1":""});setCards([]);setAudioLib([]);setRecLib([]);setMemo({});setTrash([]);setProjectList([]);setActiveProj("proj_1");if(user){push({projects:[{id:"proj_1",title:"New Project",emoji:"🎵"}],lyrics:{"proj_1":""},cards:[],audioLib:[],recLib:[],memo:{},trash:[],projectList:[],activeProj:"proj_1"});}}} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff}}>リセット</button></div>
      </div></div>)}

      {/* Tab Bar */}
      <div style={{display:"flex",borderTop:"1px solid #262626",background:"#0a0a0a",padding:"6px 0 env(safe-area-inset-bottom, 12px)",flexShrink:0}}>
        {[
          {id:"editor",icon:<Edit size={20}/>,label:"エディタ"},
          {id:"scraps",icon:<Layers size={20}/>,label:"スクラップ"},
          {id:"memo",icon:<FileText size={20}/>,label:"メモ"},
          {id:"library",icon:<Headphones size={20}/>,label:"ライブラリ"},
          {id:"settings",icon:<Settings size={20}/>,label:"設定"},
        ].map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"8px 0"}}>
          <div style={{color:tab===t.id?"#fbbf24":"#525252"}}>{t.icon}</div>
          <span style={{fontSize:9,color:tab===t.id?"#fbbf24":"#525252",fontFamily:ff}}>{t.label}</span>
        </button>))}
      </div>
    </div>
  );
}
