import { useState, useEffect, useCallback, useRef } from "react";
import { loadData as _loadData, saveData as _saveData, deleteData, saveAudio, loadAudio, deleteAudio, clearAllAudio } from "./storage.js";
import { useAuth, AuthUI, SyncBadge, AuthGate } from "./Auth.jsx";
import { syncAudioOnLogin } from "./sync.js";
import { FREE_LIMITS } from "./billing.js";

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
const Search=(p)=><I {...p} d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}/>;
const Disc=(p)=><I {...p} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></>}/>;
const CheckIcon=(p)=><I {...p} d={<><polyline points="20 6 9 17 4 12"/></>}/>;
const Loader=({size=14,color="#4af0a0"})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={{flexShrink:0,animation:"spin 1s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>);

/* ── Storage ───────────────────────────────── */
const S_KEY="lyric-workspace-v3";const S_AP="lyric-audio:";const S_RC="lyric-rec:";
async function loadAppData(){return _loadData(S_KEY);}
async function saveAppData(d){return _saveData(S_KEY,d);}
const syncStamp=d=>({...d,__updatedAt:Date.now()});
const syncTime=d=>Number(d?.__updatedAt||0);
const syncedTime=d=>Number(d?.__lastSyncedAt||0);
const markSynced=d=>({...d,__lastSyncedAt:syncTime(d)||Date.now()});
const remoteTime=(d,updatedAt)=>syncTime(d)||(updatedAt?Date.parse(updatedAt):0)||0;

/* ── Helpers ───────────────────────────────── */
const SEC_C={"Verse":"#3b82f6","Hook":"#f59e0b","Chorus":"#f59e0b","Bridge":"#a855f7","Outro":"#22c55e","Intro":"#22c55e"};
function getSecColor(l){const m=l.match(/^\[(.+?)\]/);if(!m)return null;for(const k of Object.keys(SEC_C)){if(m[1].toLowerCase().startsWith(k.toLowerCase()))return SEC_C[k];}return"#7a7e8e";}
function getSecLabel(l){const m=l.match(/^\[(.+?)\]/);return m?m[1]:null;}
const fmtT=s=>{if(!s||isNaN(s)||!isFinite(s))return"0:00";return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;};
const fmtS=b=>b<1048576?(b/1024).toFixed(1)+"KB":(b/1048576).toFixed(1)+"MB";
const ts=()=>{const n=new Date();return`${n.getHours()}:${String(n.getMinutes()).padStart(2,"0")}`;};
function findSection(text,sel){const idx=text.indexOf(sel);if(idx===-1)return"メモ";const before=text.substring(0,idx);const lines=text.split("\n");const li=before.split("\n").length-1;let sec="メモ";for(let i=0;i<=li&&i<lines.length;i++){const lb=getSecLabel(lines[i]);if(lb)sec=lb;}return sec;}

const DEF_PROJECTS=[{id:"proj_1",title:"New Project",emoji:"🎵"}];
const DEF_LYRICS={"proj_1":""};

const ff="'Courier New','JetBrains Mono',ui-monospace,Menlo,monospace";const mf=ff;

/* ═══════════════════════════════════════════════
   MOBILE APP
   ═══════════════════════════════════════════════ */
export default function MobileApp(){
  const remoteRef=useRef(null);
  const audioSyncRef=useRef(null);
  const{user,authLoading,syncStatus,login,logout,push,pushNow,pushAudio,removeAudio,hasSupabase,billing,isPro,refreshBilling,startUpgrade,manageBilling}=useAuth(
    useCallback((data)=>{if(remoteRef.current)remoteRef.current(data);},[]),
    useCallback(async(userId,aLib,rLib)=>{if(audioSyncRef.current)await audioSyncRef.current(userId,aLib,rLib);},[])
  );
  const[loading,setLoading]=useState(true);
  const[cloudLoading,setCloudLoading]=useState(false);
  const[projects,setProjects]=useState(DEF_PROJECTS);const[activeProj,setActiveProj]=useState("proj_1");
  const[lyrics,setLyrics]=useState(DEF_LYRICS);const[cards,setCards]=useState([]);
  const[audioLib,setAudioLib]=useState([]);const[recLib,setRecLib]=useState([]);
  const[activeTrackId,setActiveTrackId]=useState(null);
  const[memo,setMemo]=useState({});
  const[projectList,setProjectList]=useState([]);
  const[projectFolders,setProjectFolders]=useState([]);

  const[tab,setTab]=useState("editor");
  const[isPlaying,setIsPlaying]=useState(false);const[isMuted,setIsMuted]=useState(false);
  const[seekPos,setSeekPos]=useState(0);const[volume,setVolume]=useState(0.7);
  const[trackName,setTrackName]=useState("");const[curTime,setCurTime]=useState(0);const[dur,setDur]=useState(0);
  const[repeatOn,setRepeatOn]=useState(false);
  const[isRecording,setIsRecording]=useState(false);
  const[saveStatus,setSaveStatus]=useState("idle");
  const[showPlayer,setShowPlayer]=useState(false);
  const[showNewProj,setShowNewProj]=useState(false);const[newProjTitle,setNewProjTitle]=useState("");
  const[showNewFolder,setShowNewFolder]=useState(false);const[newFolderTitle,setNewFolderTitle]=useState("");
  const[projectQuery,setProjectQuery]=useState("");
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
  const[projectDrag,setProjectDrag]=useState(null);
  const longPressTimer=useRef(null);

  const saveTimer=useRef(null);const audioEl=useRef(null);const fileInput=useRef(null);
  const stateRef=useRef({});
  const localUpdatedAtRef=useRef(0);
  const localLastSyncedAtRef=useRef(0);
  const audioCache=useRef({});const mediaRec=useRef(null);const recChunks=useRef([]);
  const audioCtx=useRef(null);const dest=useRef(null);
  const pulledUserRef=useRef(null);
  const projectPointerRef=useRef(null);
  const projectDragRef=useRef(null);
  const suppressProjectClickRef=useRef(false);
  const projectDragTimerRef=useRef(null);

  const btn={background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center"};

  // Always keep stateRef up to date for async push
  stateRef.current={projects,lyrics,cards,activeProj,audioLib,recLib,memo,trash,projectList,projectFolders,__updatedAt:localUpdatedAtRef.current,__lastSyncedAt:localLastSyncedAtRef.current};

  // Remote sync callback
  useEffect(()=>{
    remoteRef.current=async(data)=>{const incomingTime=syncTime(data);const hasUnsyncedLocal=localUpdatedAtRef.current>localLastSyncedAtRef.current;if(hasUnsyncedLocal)return;if(incomingTime&&localUpdatedAtRef.current&&incomingTime<localUpdatedAtRef.current)return;if(data.projects)setProjects(data.projects);if(data.lyrics)setLyrics(data.lyrics);if(data.cards)setCards(data.cards);if(data.activeProj)setActiveProj(data.activeProj);if(data.memo)setMemo(data.memo);if(data.trash)setTrash(data.trash);if(data.projectList)setProjectList(data.projectList);if(data.projectFolders)setProjectFolders(data.projectFolders);if(data.audioLib)setAudioLib(data.audioLib);if(data.recLib)setRecLib(data.recLib);const merged={...stateRef.current,...data};localUpdatedAtRef.current=syncTime(merged)||Date.now();localLastSyncedAtRef.current=localUpdatedAtRef.current;merged.__updatedAt=localUpdatedAtRef.current;merged.__lastSyncedAt=localLastSyncedAtRef.current;stateRef.current=merged;await saveAppData(merged);if(user&&(data.audioLib||data.recLib)){await syncAudioOnLogin(user.id,data.audioLib||[],data.recLib||[],loadAudio,saveAudio,S_AP,S_RC,audioCache);}};
    audioSyncRef.current=async(userId,aLib,rLib)=>{await syncAudioOnLogin(userId,aLib,rLib,loadAudio,saveAudio,S_AP,S_RC,audioCache);setAudioLib(aLib);setRecLib(rLib);};
  });

  /* ── Audio init ── */
  useEffect(()=>{const a=new Audio();a.preload="metadata";a.addEventListener("timeupdate",()=>{setCurTime(a.currentTime);if(a.duration)setSeekPos((a.currentTime/a.duration)*100);});a.addEventListener("loadedmetadata",()=>{if(a.duration===Infinity||isNaN(a.duration)){a.currentTime=1e101;const fix=()=>{a.currentTime=0;setDur(a.duration);a.removeEventListener("timeupdate",fix);};a.addEventListener("timeupdate",fix);}else{setDur(a.duration);}});a.addEventListener("ended",()=>{if(a.loop)return;setIsPlaying(false);setSeekPos(0);setCurTime(0);});audioEl.current=a;return()=>{a.pause();a.src="";};},[]);

  /* ── Load ── */
  useEffect(()=>{(async()=>{try{const d=await loadAppData();if(d){localUpdatedAtRef.current=syncTime(d);localLastSyncedAtRef.current=syncedTime(d)||localUpdatedAtRef.current;d.projects&&setProjects(d.projects);d.lyrics&&setLyrics(d.lyrics);d.cards&&setCards(d.cards);d.activeProj&&setActiveProj(d.activeProj);d.audioLib&&setAudioLib(d.audioLib);d.recLib&&setRecLib(d.recLib);d.memo&&setMemo(d.memo);if(d.trash){const now=Date.now();setTrash(d.trash.filter(t=>now-t.deletedAt<30*24*60*60*1000));}if(d.projectList)setProjectList(d.projectList);if(d.projectFolders)setProjectFolders(d.projectFolders);}}catch(e){console.error("Load error:",e);}setLoading(false);})();},[]);

  useEffect(()=>{pulledUserRef.current=null;setCloudLoading(!!user);},[user?.id]);

  // Auto-pull from cloud whenever a logged-in account becomes active
  useEffect(()=>{if(loading||authLoading||!user||pulledUserRef.current===user.id)return;pulledUserRef.current=user.id;setCloudLoading(true);(async()=>{try{const{pullFromCloud}=await import("./sync.js");const result=await pullFromCloud(user.id);if(result.data){const d=result.data;const cloudTime=remoteTime(d,result.updatedAt);const hasUnsyncedLocal=localUpdatedAtRef.current>localLastSyncedAtRef.current;if(hasUnsyncedLocal&&localUpdatedAtRef.current>cloudTime){const pushResult=await pushNow(stateRef.current);if(pushResult?.ok){const synced=markSynced(stateRef.current);localLastSyncedAtRef.current=synced.__lastSyncedAt;stateRef.current=synced;await saveAppData(synced);}return;}localUpdatedAtRef.current=cloudTime||Date.now();localLastSyncedAtRef.current=localUpdatedAtRef.current;if(d.projects)setProjects(d.projects);if(d.lyrics)setLyrics(d.lyrics);if(d.cards)setCards(d.cards);if(d.activeProj)setActiveProj(d.activeProj);if(d.memo)setMemo(d.memo);if(d.trash){const now=Date.now();setTrash(d.trash.filter(t=>now-t.deletedAt<30*24*60*60*1000));}if(d.projectList)setProjectList(d.projectList);if(d.projectFolders)setProjectFolders(d.projectFolders);if(d.audioLib){setAudioLib(d.audioLib);}if(d.recLib){setRecLib(d.recLib);}const{syncAudioOnLogin:sAOL}=await import("./sync.js");await sAOL(user.id,d.audioLib||[],d.recLib||[],loadAudio,saveAudio,S_AP,S_RC,audioCache);const synced=markSynced({...stateRef.current,...d,__updatedAt:localUpdatedAtRef.current});stateRef.current=synced;await saveAppData(synced);}else if(localUpdatedAtRef.current>localLastSyncedAtRef.current){const pushResult=await pushNow(stateRef.current);if(pushResult?.ok){const synced=markSynced(stateRef.current);localLastSyncedAtRef.current=synced.__lastSyncedAt;stateRef.current=synced;await saveAppData(synced);}}}catch(e){console.error("Auto-pull error:",e);}finally{setCloudLoading(false);}})();},[user,loading,authLoading,pushNow]);

  /* ── Save ── */
  const doSave=useCallback((o={})=>{if(saveTimer.current)clearTimeout(saveTimer.current);setSaveStatus("saving");saveTimer.current=setTimeout(async()=>{const s=stateRef.current;const d=syncStamp({projects:o.projects||s.projects,lyrics:o.lyrics||s.lyrics,cards:o.cards||s.cards,activeProj:o.activeProj||s.activeProj,audioLib:o.audioLib||s.audioLib,recLib:o.recLib||s.recLib,memo:o.memo||s.memo,trash:o.trash||s.trash,projectList:o.projectList||s.projectList,projectFolders:o.projectFolders||s.projectFolders});d.__lastSyncedAt=localLastSyncedAtRef.current;localUpdatedAtRef.current=d.__updatedAt;await saveAppData(d);if(user){const pushResult=await push(d);if(pushResult?.ok){const synced=markSynced(d);localLastSyncedAtRef.current=synced.__lastSyncedAt;await saveAppData(synced);}}setSaveStatus("saved");setTimeout(()=>setSaveStatus("idle"),1500);},800);},[user,push]);

  const curText=lyrics[activeProj]||"";
  const setCurText=t=>{const nl={...lyrics,[activeProj]:t};setLyrics(nl);doSave({lyrics:nl});};
  const allProjects=[...projects,...projectList.filter(p=>!projects.some(x=>x.id===p.id))];
  const folderProjectIds=new Set(projectFolders.flatMap(f=>f.projectIds||[]));
  const rootProjects=allProjects.filter(p=>!folderProjectIds.has(p.id));
  const q=projectQuery.trim().toLowerCase();
  const visibleRootProjects=rootProjects.filter(p=>!q||p.title.toLowerCase().includes(q));
  const visibleFolders=projectFolders.map(f=>({...f,items:(f.projectIds||[]).map(id=>allProjects.find(p=>p.id===id)).filter(Boolean).filter(p=>!q||p.title.toLowerCase().includes(q)||f.title.toLowerCase().includes(q))})).filter(f=>!q||f.title.toLowerCase().includes(q)||f.items.length>0);
  const curProject=allProjects.find(p=>p.id===activeProj);
  const curMemo=memo[activeProj]||"";
  const setCurMemo=t=>{const nm={...memo,[activeProj]:t};setMemo(nm);doSave({memo:nm});};
  const allTags=[...new Set(cards.filter(c=>c.projId===activeProj).flatMap(c=>c.tags))];
  const filteredCards=cards.filter(c=>c.projId===activeProj&&(tagFilter==="all"||c.tags.includes(tagFilter)));
  const sections=[];curText.split("\n").forEach(l=>{const lb=getSecLabel(l);if(lb)sections.push({label:lb,color:getSecColor(l)});});

  useEffect(()=>{projectDragRef.current=projectDrag;},[projectDrag]);

  const switchProject=id=>{setActiveProj(id);setTagFilter("all");setProjPickerOpen(false);doSave({activeProj:id});};
  const addProject=()=>{if(!newProjTitle.trim())return;if(!isPro&&allProjects.length>=FREE_LIMITS.projects){alert("Free版ではプロジェクトは5件までです。Proにすると無制限で作成できます。");setTab("settings");return;}const id="proj_"+Date.now(),np=[...projects,{id,title:newProjTitle.trim()}];const nl={...lyrics,[id]:""};setProjects(np);setLyrics(nl);setActiveProj(id);setShowNewProj(false);setNewProjTitle("");doSave({projects:np,lyrics:nl,activeProj:id});};
  const addFolder=()=>{if(!newFolderTitle.trim())return;const nf=[...projectFolders,{id:"folder_"+Date.now(),title:newFolderTitle.trim(),projectIds:[],open:true,locked:false}];setProjectFolders(nf);setShowNewFolder(false);setNewFolderTitle("");doSave({projectFolders:nf});};
  const toggleFolderOpen=id=>{const nf=projectFolders.map(f=>f.id===id?{...f,open:f.open===false?true:false}:f);setProjectFolders(nf);doSave({projectFolders:nf});};
  const toggleFolderLock=id=>{const nf=projectFolders.map(f=>f.id===id?{...f,locked:!f.locked}:f);setProjectFolders(nf);doSave({projectFolders:nf});};
  const deleteFolder=id=>{const folder=projectFolders.find(f=>f.id===id);if(folder?.locked)return;const nf=projectFolders.filter(f=>f.id!==id);setProjectFolders(nf);doSave({projectFolders:nf});};
  const moveProjectToFolder=(projectId,folderId)=>{const nf=projectFolders.map(f=>({...f,projectIds:(f.projectIds||[]).filter(id=>id!==projectId)})).map(f=>f.id===folderId?{...f,projectIds:[...(f.projectIds||[]),projectId],open:true}:f);setProjectFolders(nf);doSave({projectFolders:nf});};
  const moveProjectToRoot=projectId=>{const nf=projectFolders.map(f=>({...f,projectIds:(f.projectIds||[]).filter(id=>id!==projectId)}));setProjectFolders(nf);doSave({projectFolders:nf});};
  const deleteProject=id=>{const proj=allProjects.find(p=>p.id===id);if(!proj||proj.locked||allProjects.length<=1)return;const trashItem={id:"tr_"+Date.now(),type:"project",data:{project:proj,lyrics:lyrics[id],cards:cards.filter(c=>c.projId===id),memo:memo[id]},deletedAt:Date.now()};const nt=[...trash,trashItem];const np=projects.filter(p=>p.id!==id);const npl=projectList.filter(p=>p.id!==id);const nf=projectFolders.map(f=>({...f,projectIds:(f.projectIds||[]).filter(pid=>pid!==id)}));const nl={...lyrics};delete nl[id];const nc=cards.filter(c=>c.projId!==id);const na=id===activeProj?(np[0]||npl[0])?.id||"proj_1":activeProj;const nm={...memo};delete nm[id];setTrash(nt);setProjects(np);setProjectList(npl);setProjectFolders(nf);setLyrics(nl);setCards(nc);setActiveProj(na);setMemo(nm);doSave({trash:nt,projects:np,projectList:npl,projectFolders:nf,lyrics:nl,cards:nc,activeProj:na,memo:nm});};
  const renameProject=(id,n)=>{const np=projects.map(p=>p.id===id?{...p,title:n}:p);const npl=projectList.map(p=>p.id===id?{...p,title:n}:p);setProjects(np);setProjectList(npl);doSave({projects:np,projectList:npl});};
  const toggleLock=(id)=>{const np=projects.map(p=>p.id===id?{...p,locked:!p.locked}:p);const npl=projectList.map(p=>p.id===id?{...p,locked:!p.locked}:p);setProjects(np);setProjectList(npl);doSave({projects:np,projectList:npl});};
  const moveToList=(id)=>{const p=projects.find(x=>x.id===id);if(!p||projects.length<=1)return;const np=projects.filter(x=>x.id!==id);const npl=[...projectList,p];setProjects(np);setProjectList(npl);if(activeProj===id)setActiveProj(np[0].id);doSave({projects:np,projectList:npl});};
  const moveToProjects=(id)=>{const p=projectList.find(x=>x.id===id);if(!p)return;const npl=projectList.filter(x=>x.id!==id);const np=[...projects,p];setProjects(np);setProjectList(npl);doSave({projects:np,projectList:npl});};
  const reorderArr=(arr,setArr,key,idx,dir)=>{const n=[...arr];const ni=idx+dir;if(ni<0||ni>=n.length)return;[n[idx],n[ni]]=[n[ni],n[idx]];setArr(n);doSave({[key]:n});};
  const activeFolder=projectFolders.find(f=>(f.projectIds||[]).includes(activeProj));
  const allProjs=activeFolder?(activeFolder.projectIds||[]).map(id=>allProjects.find(p=>p.id===id)).filter(Boolean):rootProjects;
  const swipeNav=(dir)=>{const idx=allProjs.findIndex(p=>p.id===activeProj);const ni=idx+dir;if(ni>=0&&ni<allProjs.length){switchProject(allProjs[ni].id);}};
  const findProjectDropTarget=(x,y)=>{const el=document.elementFromPoint(x,y);if(!el)return null;const row=el.closest?.("[data-mobile-project-id]");if(row){const rect=row.getBoundingClientRect();return{folderId:row.dataset.mobileFolderId||null,targetId:row.dataset.mobileProjectId,position:y<rect.top+rect.height/2?"before":"after"};}const folder=el.closest?.("[data-mobile-folder-id]");if(folder)return{folderId:folder.dataset.mobileFolderId,intoFolder:true};const list=el.closest?.("[data-mobile-project-list]");if(list)return{folderId:null,targetId:null,position:"after"};return null;};
  const applyProjectDrop=(projectId,target)=>{if(!target||target.targetId===projectId)return;const proj=allProjects.find(p=>p.id===projectId);if(!proj)return;let nf=projectFolders.map(f=>({...f,projectIds:(f.projectIds||[]).filter(id=>id!==projectId)}));let np=[...projects];if(target.folderId){nf=nf.map(f=>{if(f.id!==target.folderId)return f;const ids=[...(f.projectIds||[]).filter(id=>id!==projectId)];let idx=target.targetId?ids.indexOf(target.targetId):-1;if(idx<0)idx=ids.length;else if(target.position==="after")idx+=1;ids.splice(idx,0,projectId);return{...f,projectIds:ids,open:true};});}else{if(!np.some(p=>p.id===projectId))np=[...np,proj];np=np.filter(p=>p.id!==projectId);let idx=target.targetId?np.findIndex(p=>p.id===target.targetId):-1;if(idx<0)idx=np.length;else if(target.position==="after")idx+=1;np.splice(idx,0,proj);}setProjects(np);setProjectFolders(nf);doSave({projects:np,projectFolders:nf});};
  const clearProjectDragTimer=()=>{if(projectDragTimerRef.current){clearTimeout(projectDragTimerRef.current);projectDragTimerRef.current=null;}};
  const startProjectDrag=(e,id)=>{if(editingName===id)return;clearProjectDragTimer();projectPointerRef.current={id,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dragging:false,cancelled:false};projectDragTimerRef.current=setTimeout(()=>{const s=projectPointerRef.current;if(!s||s.cancelled)return;s.dragging=true;suppressProjectClickRef.current=true;setLongPressMenu(null);setProjectDrag({id:s.id,target:findProjectDropTarget(s.lastX,s.lastY)});try{document.body.style.overflow="hidden";}catch(err){}},360);};
  const moveProjectDrag=e=>{const s=projectPointerRef.current;if(!s)return;s.lastX=e.clientX;s.lastY=e.clientY;const dx=Math.abs(e.clientX-s.x),dy=Math.abs(e.clientY-s.y);if(!s.dragging){if(dy>24||dx>32){s.cancelled=true;clearProjectDragTimer();}return;}e.preventDefault();const target=findProjectDropTarget(e.clientX,e.clientY);setProjectDrag({id:s.id,target});};
  const endProjectDrag=e=>{clearProjectDragTimer();const s=projectPointerRef.current;if(!s)return;if(s.dragging){e.preventDefault();applyProjectDrop(s.id,projectDragRef.current?.target);setTimeout(()=>{suppressProjectClickRef.current=false;},120);}projectPointerRef.current=null;setProjectDrag(null);try{document.body.style.overflow="";}catch(err){}};
  const cancelProjectDrag=()=>{clearProjectDragTimer();projectPointerRef.current=null;setProjectDrag(null);setTimeout(()=>{suppressProjectClickRef.current=false;},120);try{document.body.style.overflow="";}catch(err){}};
  const dragRowStyle=(id)=>projectDrag?.id===id?{opacity:.45,outline:"1px solid #4a4e5e"}:{};
  const projectDragBaseStyle={WebkitUserSelect:"none",userSelect:"none",WebkitTouchCallout:"none",touchAction:"pan-y"};

  /* ── Scrap ── */
  const saveToScrap=()=>{if(!selText.trim())return;const sec=findSection(curText,selText);const nc=[{id:Date.now(),text:selText,tags:[sec],time:ts(),projId:activeProj},...cards];setCards(nc);setShowSelBar(false);setSelText("");doSave({cards:nc});setTab("scraps");};
  const deleteCard=id=>{const nc=cards.filter(c=>c.id!==id);setCards(nc);doSave({cards:nc});};
  const addManualCard=()=>{if(!scrapInputText.trim())return;const tags=scrapInputTags.trim()?scrapInputTags.split(/[,、\s]+/).filter(Boolean):["メモ"];const nc=[{id:Date.now(),text:scrapInputText.trim(),tags,time:ts(),projId:activeProj},...cards];setCards(nc);setScrapInputText("");setScrapInputTags("");setShowScrapInput(false);doSave({cards:nc});};
  const copyText=t=>{navigator.clipboard?.writeText(t).catch(()=>{});};

  /* ── Audio ── */
  const playTrack=useCallback((meta,b64)=>{const a=audioEl.current;if(!a)return;if(meta.id===activeTrackId&&a.src){if(isPlaying){a.pause();setIsPlaying(false);}else{a.play().then(()=>setIsPlaying(true)).catch(()=>{});}return;}a.pause();a.src=b64;a.volume=isMuted?0:volume;a.loop=repeatOn;setTrackName(meta.name);setActiveTrackId(meta.id);setSeekPos(0);setCurTime(0);setDur(0);a.load();const r=()=>{a.play().then(()=>setIsPlaying(true)).catch(()=>{});a.removeEventListener("canplay",r);};a.addEventListener("canplay",r);},[isMuted,volume,activeTrackId,isPlaying,repeatOn]);
  const loadAndPlay=useCallback(async(meta,prefix=S_AP)=>{let b=audioCache.current[meta.id];if(!b){b=await loadAudio(prefix+meta.id);if(!b)return;audioCache.current[meta.id]=b;}playTrack(meta,b);},[playTrack]);
  const handleFileUpload=async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;if(!isPro&&audioLib.length>=FREE_LIMITS.audio){alert("Free版では音源は3曲までです。Proにすると無制限で追加できます。");setTab("settings");return;}setUploadingAudio(true);const reader=new FileReader();reader.onload=async ev=>{const b64=ev.target.result;const id="aud_"+Date.now();const meta={id,name:file.name.replace(/\.[^.]+$/,""),size:file.size,ext:file.name.split(".").pop()};const ok=await saveAudio(S_AP+id,b64);if(!ok){alert("ファイルサイズ上限超過");setUploadingAudio(false);return;}audioCache.current[id]=b64;pushAudio(id,b64);const nal=[...audioLib,meta];setAudioLib(nal);doSave({audioLib:nal});playTrack(meta,b64);setUploadingAudio(false);};reader.readAsDataURL(file);};
  const removeTrack=async(id,lib,setLib,prefix,key)=>{const track=lib.find(t=>t.id===id);const trashItem={id:"tr_"+Date.now(),type:key==="audioLib"?"audio":"recording",data:{track},deletedAt:Date.now()};const nt=[...trash,trashItem];setTrash(nt);const nl=lib.filter(t=>t.id!==id);setLib(nl);if(activeTrackId===id){audioEl.current?.pause();setTrackName("");setIsPlaying(false);setActiveTrackId(null);}doSave({trash:nt,[key]:nl});};

  // Trash functions
  const restoreFromTrash=(trashId)=>{const item=trash.find(t=>t.id===trashId);if(!item)return;const nt=trash.filter(t=>t.id!==trashId);if(item.type==="project"){const d=item.data;const np=[...projects,d.project];const nl={...lyrics,[d.project.id]:d.lyrics||""};const nc=[...cards,...(d.cards||[])];const nm={...memo,[d.project.id]:d.memo||""};setProjects(np);setLyrics(nl);setCards(nc);setMemo(nm);setTrash(nt);doSave({trash:nt,projects:np,lyrics:nl,cards:nc,memo:nm});}else{const track=item.data.track;if(item.type==="audio"){const nal=[...audioLib,track];setAudioLib(nal);setTrash(nt);doSave({trash:nt,audioLib:nal});}else{const nrl=[...recLib,track];setRecLib(nrl);setTrash(nt);doSave({trash:nt,recLib:nrl});}}};
  const permanentDeleteTrash=async(trashId)=>{const item=trash.find(t=>t.id===trashId);if(!item)return;if(item.type==="audio"||item.type==="recording"){const track=item.data.track;const prefix=item.type==="audio"?S_AP:S_RC;await deleteAudio(prefix+track.id);delete audioCache.current[track.id];await removeAudio(track.id);}const nt=trash.filter(t=>t.id!==trashId);setTrash(nt);const sd=syncStamp({projects,lyrics,cards,activeProj,audioLib,recLib,memo,trash:nt,projectList,projectFolders});sd.__lastSyncedAt=localLastSyncedAtRef.current;localUpdatedAtRef.current=sd.__updatedAt;await saveAppData(sd);if(user){const pushResult=await pushNow(sd);if(pushResult?.ok){const synced=markSynced(sd);localLastSyncedAtRef.current=synced.__lastSyncedAt;await saveAppData(synced);}}};
  const emptyTrash=async()=>{for(const item of trash){if(item.type==="audio"||item.type==="recording"){const track=item.data.track;const prefix=item.type==="audio"?S_AP:S_RC;await deleteAudio(prefix+track.id);delete audioCache.current[track.id];await removeAudio(track.id);}}setTrash([]);const sd=syncStamp({projects,lyrics,cards,activeProj,audioLib,recLib,memo,trash:[],projectList,projectFolders});sd.__lastSyncedAt=localLastSyncedAtRef.current;localUpdatedAtRef.current=sd.__updatedAt;await saveAppData(sd);if(user){const pushResult=await pushNow(sd);if(pushResult?.ok){const synced=markSynced(sd);localLastSyncedAtRef.current=synced.__lastSyncedAt;await saveAppData(synced);}}};
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
  const startRec=async()=>{if(!isPro&&recLib.length>=FREE_LIMITS.recordings){alert("Free版では録音は3件までです。Proにすると無制限で録音できます。");setTab("settings");return;}try{const ms=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,autoGainControl:false,noiseSuppression:false}});const ctx=new(window.AudioContext||window.webkitAudioContext)({sampleRate:48000});audioCtx.current=ctx;await ctx.resume();const d=ctx.createMediaStreamDestination();d.channelCount=2;d.channelCountMode="explicit";d.channelInterpretation="speakers";const mixBus=ctx.createGain();mixBus.channelCount=2;mixBus.channelCountMode="explicit";mixBus.channelInterpretation="speakers";mixBus.connect(d);dest.current=d;ctx.createMediaStreamSource(ms).connect(mixBus);const a=audioEl.current;if(a&&a.src){try{const s2=a.captureStream?a.captureStream():a.mozCaptureStream();ctx.createMediaStreamSource(s2).connect(mixBus);}catch(e){}if(a.paused){a.play().then(()=>setIsPlaying(true)).catch(()=>{});}}recChunks.current=[];const mr=new MediaRecorder(d.stream,{mimeType:MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm"});mr.ondataavailable=e=>{if(e.data.size>0)recChunks.current.push(e.data);};mr.onstop=async()=>{ms.getTracks().forEach(t=>t.stop());const blob=new Blob(recChunks.current,{type:"audio/webm"});const r=new FileReader();r.onload=async ev=>{const b64=ev.target.result;const id="rec_"+Date.now();const meta={id,name:"録音_"+ts().replace(":",""),size:blob.size,ext:"webm"};await saveAudio(S_RC+id,b64);audioCache.current[id]=b64;pushAudio(id,b64);const nrl=[...recLib,meta];setRecLib(nrl);doSave({recLib:nrl});};r.readAsDataURL(blob);try{ctx.close();}catch(e){}audioCtx.current=null;};mr.start(100);mediaRec.current=mr;setIsRecording(true);}catch(e){alert("マイクアクセスを許可してください\n"+e.message);}};
  const stopRec=()=>{if(mediaRec.current&&isRecording){mediaRec.current.stop();mediaRec.current=null;setIsRecording(false);}};

  /* ── Selection check ── */
  const checkSelection=()=>{const s=window.getSelection().toString().trim();if(s&&s.length>0){setSelText(s);setShowSelBar(true);}else{setShowSelBar(false);}};

  const hasSrc=!!activeTrackId;

  if(loading||authLoading||cloudLoading)return(<div style={{fontFamily:ff,position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a0a",color:"#7a7e8e",fontSize:14}}>読み込み中...</div>);
  if(!user)return <AuthGate user={user} onLogin={login} onLogout={logout} syncStatus={syncStatus} hasSupabase={hasSupabase} billing={billing} onUpgrade={startUpgrade} onManageBilling={manageBilling} onRefreshBilling={refreshBilling}/>;

  return(
    <div style={{fontFamily:ff,position:"fixed",top:0,left:0,right:0,bottom:0,display:"flex",flexDirection:"column",background:"#0a0a0a",color:"#c8ccd8",overflow:"hidden",maxWidth:480,margin:"0 auto"}}>
      <input ref={fileInput} type="file" accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma,.opus,.webm" style={{display:"none"}} onChange={handleFileUpload}/>

      {/* ── Header ── */}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,borderBottom:"1px solid #1a1a1a"}}>
        <div style={{display:"flex",alignItems:"center",gap:4,flex:1,minWidth:0}}>
          <button onClick={()=>swipeNav(-1)} style={{...btn,padding:4,color:allProjs.findIndex(p=>p.id===activeProj)>0?"#7a7e8e":"#2a2a35",flexShrink:0}}><ChevronLeft size={16}/></button>
          <button onClick={()=>setProjPickerOpen(!projPickerOpen)} style={{...btn,gap:8,flex:1,minWidth:0}}>
            <FileText size={16} color="#7a7e8e" style={{flexShrink:0}}/>
            <div style={{textAlign:"left",minWidth:0,flex:1}}>
              <div style={{fontSize:15,fontWeight:600,color:"#c8ccd8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{curProject?.title||"無題"}</div>
              <div style={{fontSize:10,color:saveStatus==="saving"?"#4af0a0":"#4a4e5e",fontFamily:mf}}>{saveStatus==="saving"?"保存中...":""}</div>
            </div>
            <ChevronDown size={14} color="#4a4e5e" style={{flexShrink:0}}/>
          </button>
          <button onClick={()=>swipeNav(1)} style={{...btn,padding:4,color:allProjs.findIndex(p=>p.id===activeProj)<allProjs.length-1?"#7a7e8e":"#2a2a35",flexShrink:0}}><ChevronRight size={16}/></button>
        </div>
        <button onClick={()=>setShowPlayer(!showPlayer)} style={{...btn,width:36,height:36,borderRadius:18,background:showPlayer?"#2a2a35":"#111116",border:"1px solid #3a3a4a",flexShrink:0,marginLeft:8}}>
          <MusicIcon size={16} color={hasSrc?"#4af0a0":"#4a4e5e"}/>
        </button>
      </div>

      {/* ── Project Picker ── */}
      {projPickerOpen&&(<div onClick={()=>{setProjPickerOpen(false);setLongPressMenu(null);}} onPointerMove={moveProjectDrag} onPointerUp={endProjectDrag} onPointerCancel={cancelProjectDrag} style={{position:"fixed",inset:0,zIndex:120,pointerEvents:"auto"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.28)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:56,bottom:"calc(62px + env(safe-area-inset-bottom, 0px))",left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#111116",border:"1px solid #3a3a4a",borderRadius:"0 0 16px 16px",padding:12,boxShadow:"0 20px 40px rgba(0,0,0,0.5)",boxSizing:"border-box",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",border:"1px solid #2a2a35",borderRadius:10,background:"#0a0a0a",marginBottom:10}}>
          <Search size={13} color="#7a7e8e"/>
          <input value={projectQuery} onChange={e=>setProjectQuery(e.target.value)} placeholder="検索..." style={{flex:1,minWidth:0,background:"transparent",border:"none",outline:"none",color:"#c8ccd8",fontFamily:ff,fontSize:14}}/>
          {projectQuery&&<button onClick={()=>setProjectQuery("")} style={{...btn,color:"#4a4e5e"}}><XIcon size={12}/></button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <button onClick={()=>{setShowNewProj(!showNewProj);setShowNewFolder(false);}} style={{...btn,width:"100%",padding:"11px 8px",borderRadius:10,border:"1px dashed #3a3a4a",color:showNewProj?"#4af0a0":"#7a7e8e",gap:6,justifyContent:"center",fontFamily:ff,fontSize:12,background:showNewProj?"rgba(74,240,160,0.08)":"transparent"}}><Plus size={14}/>プロジェクト</button>
          <button onClick={()=>{setShowNewFolder(!showNewFolder);setShowNewProj(false);}} style={{...btn,width:"100%",padding:"11px 8px",borderRadius:10,border:"1px dashed #3a3a4a",color:showNewFolder?"#4af0a0":"#7a7e8e",gap:6,justifyContent:"center",fontFamily:ff,fontSize:12,background:showNewFolder?"rgba(74,240,160,0.08)":"transparent"}}><FolderOpen size={14}/>フォルダ</button>
        </div>
        {showNewProj&&(<div style={{padding:12,background:"#0a0a0a",borderRadius:10,marginBottom:10}}>
          <input placeholder="プロジェクト名" value={newProjTitle} onChange={e=>setNewProjTitle(e.target.value)} style={{width:"100%",background:"#111116",border:"1px solid #3a3a4a",borderRadius:8,padding:"10px 12px",fontSize:16,color:"#c8ccd8",outline:"none",fontFamily:ff,boxSizing:"border-box",marginBottom:8}}/>
          <div style={{display:"flex",gap:8}}><button onClick={addProject} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#4af0a0",color:"#111116",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff}}>作成</button><button onClick={()=>setShowNewProj(false)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #3a3a4a",background:"transparent",color:"#7a7e8e",fontSize:13,cursor:"pointer",fontFamily:ff}}>取消</button></div>
        </div>)}
        {showNewFolder&&(<div style={{padding:12,background:"#0a0a0a",borderRadius:10,marginBottom:10}}>
          <input placeholder="フォルダ名" value={newFolderTitle} onChange={e=>setNewFolderTitle(e.target.value)} style={{width:"100%",background:"#111116",border:"1px solid #3a3a4a",borderRadius:8,padding:"10px 12px",fontSize:16,color:"#c8ccd8",outline:"none",fontFamily:ff,boxSizing:"border-box",marginBottom:8}}/>
          <div style={{display:"flex",gap:8}}><button onClick={addFolder} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#4af0a0",color:"#111116",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff}}>作成</button><button onClick={()=>setShowNewFolder(false)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #3a3a4a",background:"transparent",color:"#7a7e8e",fontSize:13,cursor:"pointer",fontFamily:ff}}>取消</button></div>
        </div>)}
        <div data-mobile-project-list="true" style={{flex:1,overflowY:"auto",minHeight:0}}>
        <div style={{fontSize:10,fontWeight:500,color:"#7a7e8e",textTransform:"uppercase",letterSpacing:"0.1em",padding:"0 4px",marginBottom:6}}>PROJECTS</div>
        {visibleFolders.map(f=>(<div key={f.id} data-mobile-folder-id={f.id} style={{marginBottom:8,border:"1px solid #2a2a35",borderRadius:10,background:"#0a0a0a"}}>
          <div onClick={()=>toggleFolderOpen(f.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",color:"#7a7e8e",cursor:"pointer",WebkitUserSelect:"none",userSelect:"none",WebkitTouchCallout:"none"}}>
            <ChevronRight size={12} style={{transform:f.open===false?"rotate(0deg)":"rotate(90deg)",transition:"transform .15s ease"}}/>
            <FolderOpen size={14}/><span style={{flex:1,fontSize:13,color:"#c8ccd8",fontWeight:600}}>{f.title}</span>
            <button onClick={e=>{e.stopPropagation();toggleFolderLock(f.id);}} style={{...btn,padding:4,color:f.locked?"#4af0a0":"#3a3a4a"}}>{f.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
            {!f.locked&&<button onClick={e=>{e.stopPropagation();deleteFolder(f.id);}} style={{...btn,padding:4,color:"#4a4e5e"}}><XIcon size={12}/></button>}
          </div>
          {f.open!==false&&f.items.length===0&&<div style={{fontSize:11,color:"#4a4e5e",padding:"0 12px 8px"}}>空</div>}
          {f.open!==false&&f.items.map((p,idx)=>(<div key={p.id} data-mobile-project-id={p.id} data-mobile-folder-id={f.id} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>startProjectDrag(e,p.id)} onPointerMove={moveProjectDrag} onPointerUp={endProjectDrag} onPointerCancel={cancelProjectDrag} onClick={()=>{if(suppressProjectClickRef.current||editingName===p.id)return;handleTap(p.id,p.title,()=>switchProject(p.id));}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px 8px 28px",borderRadius:8,background:activeProj===p.id?"#2a2a35":"transparent",margin:"0 4px 4px",cursor:projectDrag?.id===p.id?"grabbing":"grab",...projectDragBaseStyle,...dragRowStyle(p.id)}}>
            <FileText size={13} color="#7a7e8e"/>
            <div style={{flex:1,minWidth:0}}>{editingName===p.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #4af0a040",borderRadius:6,padding:"4px 8px",fontSize:16,color:"#c8ccd8",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<span style={{fontSize:14,color:activeProj===p.id?"#c8ccd8":"#7a7e8e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{p.title}</span>}</div>
            <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>toggleLock(p.id)} style={{...btn,padding:4,color:p.locked?"#4af0a0":"#3a3a4a"}}>{p.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
              {!p.locked&&<button onClick={()=>deleteProject(p.id)} style={{...btn,padding:4,color:"#4a4e5e"}}><XIcon size={12}/></button>}
            </div>
          </div>))}
        </div>))}
        {visibleRootProjects.map((p,idx)=>(<div key={p.id} data-mobile-project-id={p.id} data-mobile-folder-id="" onContextMenu={e=>e.preventDefault()} onPointerDown={e=>startProjectDrag(e,p.id)} onPointerMove={moveProjectDrag} onPointerUp={endProjectDrag} onPointerCancel={cancelProjectDrag} onClick={()=>{if(suppressProjectClickRef.current||editingName===p.id)return;handleTap(p.id,p.title,()=>switchProject(p.id));}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:10,background:activeProj===p.id?"#2a2a35":"transparent",marginBottom:4,cursor:projectDrag?.id===p.id?"grabbing":"grab",...projectDragBaseStyle,...dragRowStyle(p.id)}}>
          <FileText size={13} color="#7a7e8e"/>
          <div style={{flex:1,minWidth:0}}>{editingName===p.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #4af0a040",borderRadius:6,padding:"4px 8px",fontSize:16,color:"#c8ccd8",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<span style={{fontSize:14,color:activeProj===p.id?"#c8ccd8":"#7a7e8e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{p.title}</span>}</div>
          <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>toggleLock(p.id)} style={{...btn,padding:4,color:p.locked?"#4af0a0":"#3a3a4a"}}>{p.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
            {allProjects.length>1&&!p.locked&&<button onClick={()=>deleteProject(p.id)} style={{...btn,padding:4,color:"#4a4e5e"}}><XIcon size={12}/></button>}
          </div>
        </div>))}
        {longPressMenu&&longPressMenu.from==="projects"&&(<div style={{background:"#0a0a0a",border:"1px solid #4a4e5e",borderRadius:10,padding:8,marginBottom:8}}>
          <div style={{fontSize:10,color:"#7a7e8e",marginBottom:6,padding:"0 4px"}}>{projects.find(p=>p.id===longPressMenu.id)?.title}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>{reorderArr(projects,setProjects,"projects",longPressMenu.idx,-1);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #3a3a4a",background:"transparent",color:"#7a7e8e",fontSize:11,fontFamily:ff}}>↑上へ</button>
            <button onClick={()=>{reorderArr(projects,setProjects,"projects",longPressMenu.idx,1);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #3a3a4a",background:"transparent",color:"#7a7e8e",fontSize:11,fontFamily:ff}}>↓下へ</button>
            {projectFolders.map(f=><button key={f.id} onClick={()=>{moveProjectToFolder(longPressMenu.id,f.id);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(74,240,160,0.3)",background:"rgba(74,240,160,0.08)",color:"#4af0a0",fontSize:11,fontFamily:ff}}>{f.title}へ</button>)}
          </div>
        </div>)}
        {false&&(projectList.length>0)&&(<><div style={{fontSize:10,fontWeight:500,color:"#7a7e8e",textTransform:"uppercase",letterSpacing:"0.1em",padding:"0 4px",marginTop:12,marginBottom:6}}>LIST</div>
        {projectList.map((p,idx)=>(<div key={p.id} onClick={()=>{if(editingName===p.id)return;handleTap(p.id,p.title,()=>switchProject(p.id));}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:10,background:activeProj===p.id?"#2a2a35":"transparent",marginBottom:4,cursor:"pointer"}} onTouchStart={()=>startLongPress(p.id,"list",idx)} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress}>
          <span style={{fontSize:16}}>{p.emoji}</span>
          <div style={{flex:1,minWidth:0}}>{editingName===p.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameProject(p.id,editNameVal.trim()||p.title);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #4af0a040",borderRadius:6,padding:"4px 8px",fontSize:16,color:"#c8ccd8",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<span style={{fontSize:14,color:activeProj===p.id?"#c8ccd8":"#7a7e8e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{p.title}</span>}</div>
          <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>toggleLock(p.id)} style={{...btn,padding:4,color:p.locked?"#4af0a0":"#3a3a4a"}}>{p.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
            {!p.locked&&<button onClick={()=>deleteProject(p.id)} style={{...btn,padding:4,color:"#4a4e5e"}}><XIcon size={12}/></button>}
          </div>
        </div>))}
        {longPressMenu&&longPressMenu.from==="list"&&(<div style={{background:"#0a0a0a",border:"1px solid #4a4e5e",borderRadius:10,padding:8,marginBottom:8}}>
          <div style={{fontSize:10,color:"#7a7e8e",marginBottom:6,padding:"0 4px"}}>{projectList.find(p=>p.id===longPressMenu.id)?.title}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>{reorderArr(projectList,setProjectList,"projectList",longPressMenu.idx,-1);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #3a3a4a",background:"transparent",color:"#7a7e8e",fontSize:11,fontFamily:ff}}>↑上へ</button>
            <button onClick={()=>{reorderArr(projectList,setProjectList,"projectList",longPressMenu.idx,1);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #3a3a4a",background:"transparent",color:"#7a7e8e",fontSize:11,fontFamily:ff}}>↓下へ</button>
            <button onClick={()=>{moveToProjects(longPressMenu.id);setLongPressMenu(null);}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(74,240,160,0.3)",background:"rgba(74,240,160,0.08)",color:"#4af0a0",fontSize:11,fontFamily:ff}}>プロジェクトに移動</button>
          </div>
        </div>)}</>)}
        </div>
      </div></div>)}

      {/* ── Content ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* EDITOR TAB */}
        {tab==="editor"&&(<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {sections.length>0&&(<div style={{padding:"10px 16px",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0,borderBottom:"1px solid #1a1a1a"}}>{sections.map((s,i)=>(<span key={i} style={{fontSize:11,fontFamily:mf,fontWeight:500,color:s.color,background:s.color+"18",border:`1px solid ${s.color}40`,borderRadius:6,padding:"4px 12px"}}>{s.label}</span>))}</div>)}
          <div style={{flex:1,overflow:"auto",position:"relative"}}>
            <textarea value={curText} onChange={e=>setCurText(e.target.value)} onSelect={checkSelection} onTouchEnd={()=>setTimeout(checkSelection,200)} spellCheck={false} style={{width:"100%",height:"100%",fontFamily:ff,fontSize:16,lineHeight:2,letterSpacing:"0.02em",caretColor:"#4af0a0",background:"transparent",color:"#c8ccd8",border:"none",outline:"none",resize:"none",padding:"16px",boxSizing:"border-box"}}/>
          </div>
          {/* Selection toolbar */}
          {showSelBar&&selText&&(<div style={{position:"absolute",bottom:140,left:16,right:16,background:"#111116",border:"1px solid #4a4e5e",borderRadius:12,padding:"8px",display:"flex",justifyContent:"center",gap:4,zIndex:20,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
            <button onClick={saveToScrap} style={{...btn,gap:6,padding:"10px 16px",borderRadius:8,background:"rgba(74,240,160,0.1)",border:"1px solid rgba(74,240,160,0.2)",color:"#4af0a0",fontFamily:ff,fontSize:12}}><Bookmark size={14}/>スクラップに保存</button>
            <button onClick={()=>{copyText(selText);setShowSelBar(false);}} style={{...btn,gap:6,padding:"10px 16px",borderRadius:8,color:"#7a7e8e",fontFamily:ff,fontSize:12}}><Copy size={14}/>コピー</button>
            <button onClick={()=>setShowSelBar(false)} style={{...btn,padding:"10px",borderRadius:8,color:"#4a4e5e"}}><XIcon size={14}/></button>
          </div>)}
        </div>)}

        {/* SCRAPS TAB */}
        {tab==="scraps"&&(<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,borderBottom:"1px solid #1a1a1a"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1,marginRight:8}}>
              {["all",...allTags].map(t=>(<button key={t} onClick={()=>setTagFilter(t)} style={{...btn,fontSize:11,padding:"5px 12px",borderRadius:20,background:tagFilter===t?"rgba(74,240,160,0.12)":"#111116",color:tagFilter===t?"#4af0a0":"#7a7e8e",border:tagFilter===t?"1px solid rgba(74,240,160,0.25)":"1px solid #2a2a35",fontFamily:ff}}>{t==="all"?"すべて":t}</button>))}
            </div>
            <button onClick={()=>setShowScrapInput(!showScrapInput)} style={{...btn,width:36,height:36,borderRadius:18,background:showScrapInput?"#2a2a35":"#111116",border:"1px solid #3a3a4a"}}><Plus size={16} color={showScrapInput?"#4af0a0":"#7a7e8e"}/></button>
          </div>
          {showScrapInput&&(<div style={{padding:16,borderBottom:"1px solid #1a1a1a",flexShrink:0}}>
            <textarea value={scrapInputText} onChange={e=>setScrapInputText(e.target.value)} placeholder="アイデア、フレーズ..." rows={3} autoFocus style={{width:"100%",background:"#111116",border:"1px solid #3a3a4a",borderRadius:10,padding:"12px",fontSize:16,color:"#c8ccd8",outline:"none",fontFamily:ff,resize:"vertical",lineHeight:1.6,boxSizing:"border-box",marginBottom:8}}/>
            <input value={scrapInputTags} onChange={e=>setScrapInputTags(e.target.value)} placeholder="タグ（カンマ区切り）" style={{width:"100%",background:"#111116",border:"1px solid #3a3a4a",borderRadius:10,padding:"10px 12px",fontSize:16,color:"#c8ccd8",outline:"none",fontFamily:ff,boxSizing:"border-box",marginBottom:8}}/>
            <div style={{display:"flex",gap:8}}><button onClick={addManualCard} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#4af0a0",color:"#111116",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff}}>追加</button><button onClick={()=>{setShowScrapInput(false);setScrapInputText("");setScrapInputTags("");}} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #3a3a4a",background:"transparent",color:"#7a7e8e",fontSize:13,cursor:"pointer",fontFamily:ff}}>取消</button></div>
          </div>)}
          <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
            {filteredCards.length===0&&<div style={{textAlign:"center",padding:"40px 16px",color:"#4a4e5e",fontSize:13}}>エディタでテキスト選択→ツールバーで保存<br/>または＋ボタンで手動追加</div>}
            {filteredCards.map(c=>(<div key={c.id} style={{background:"#111116",border:"1px solid #2a2a35",borderRadius:12,padding:14}}>
              <p style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-line",color:"#c8ccd8",margin:"0 0 10px"}}>{c.text}</p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{c.tags.map(t=>(<span key={t} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"#2a2a35",color:"#7a7e8e",display:"inline-flex",alignItems:"center",gap:3}}><Tag size={8}/>{t}</span>))}</div>
                <div style={{display:"flex",gap:8}}><button onClick={()=>copyText(c.text)} style={{...btn,padding:6,color:"#4a4e5e"}}><Copy size={16}/></button><button onClick={()=>deleteCard(c.id)} style={{...btn,padding:6,color:"#4a4e5e"}}><Trash2 size={16}/></button></div>
              </div>
            </div>))}
          </div>
        </div>)}

        {/* MEMO TAB */}
        {tab==="memo"&&(<div style={{flex:1,padding:16}}>
          <textarea value={curMemo} onChange={e=>setCurMemo(e.target.value)} placeholder="自由にメモ..." spellCheck={false} style={{width:"100%",height:"100%",background:"#111116",borderRadius:12,border:"1px solid #2a2a35",color:"#c8ccd8",outline:"none",resize:"none",padding:16,fontSize:16,lineHeight:1.8,fontFamily:ff,boxSizing:"border-box"}}/>
        </div>)}

        {/* LIBRARY TAB */}
        {tab==="library"&&(<div style={{flex:1,overflowY:"auto",padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:500,color:"#7a7e8e",textTransform:"uppercase",letterSpacing:"0.1em"}}>Music Library</span>
            <button onClick={()=>fileInput.current?.click()} style={{...btn,width:36,height:36,borderRadius:18,background:"#111116",border:"1px solid #3a3a4a"}}><Upload size={16} color="#7a7e8e"/></button>
          </div>
          {uploadingAudio&&<div style={{padding:12,fontSize:12,color:"#4af0a0",display:"flex",gap:6,alignItems:"center"}}><Loader size={14}/>アップロード中...</div>}
          {audioLib.length===0&&!uploadingAudio&&<div style={{padding:"20px 0",fontSize:13,color:"#4a4e5e",textAlign:"center"}}>アップロードボタンからトラックを追加</div>}
          {audioLib.map(t=>(<div key={t.id} onClick={()=>{if(editingName===t.id)return;handleTap(t.id,t.name,()=>loadAndPlay(t,S_AP));}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:activeTrackId===t.id?"rgba(74,240,160,0.06)":"#111116",border:activeTrackId===t.id?"1px solid rgba(74,240,160,0.15)":"1px solid #2a2a35",borderRadius:12,marginBottom:8,cursor:"pointer"}}>
            <div style={{width:44,height:44,borderRadius:10,background:activeTrackId===t.id?"#1c1917":"#2a2a35",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeTrackId===t.id&&isPlaying?<Disc size={20} color="#4af0a0" style={{animation:"spin 2s linear infinite"}}/>:<MusicIcon size={20} color={activeTrackId===t.id?"#4af0a0":"#4a4e5e"}/>}</div>
            <div style={{flex:1,minWidth:0}}>
              {editingName===t.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameTrk(audioLib,setAudioLib,"audioLib",t.id,editNameVal.trim()||t.name);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameTrk(audioLib,setAudioLib,"audioLib",t.id,editNameVal.trim()||t.name);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #4af0a040",borderRadius:6,padding:"4px 8px",fontSize:14,color:"#c8ccd8",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<div style={{fontSize:14,color:activeTrackId===t.id?"#4af0a0":"#c8ccd8",fontWeight:500}}>{t.name}</div>}
              <div style={{fontSize:11,color:"#4a4e5e",marginTop:2}}>{fmtS(t.size)} · {t.ext}</div>
            </div>
            <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>toggleTrackLock(audioLib,setAudioLib,"audioLib",t.id)} style={{...btn,padding:6,color:t.locked?"#4af0a0":"#3a3a4a"}}>{t.locked?<Lock size={12}/>:<Unlock size={12}/>}</button>
              {!t.locked&&<button onClick={()=>removeTrack(t.id,audioLib,setAudioLib,S_AP,"audioLib")} style={{...btn,padding:6,color:"#4a4e5e"}}><XIcon size={14}/></button>}
            </div>
          </div>))}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24,marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:500,color:"#7a7e8e",textTransform:"uppercase",letterSpacing:"0.1em"}}>Recordings</span>
            <span style={{fontSize:11,color:"#4a4e5e",fontFamily:mf}}>{recLib.length}</span>
          </div>
          {recLib.length===0&&<div style={{padding:"20px 0",fontSize:13,color:"#4a4e5e",textAlign:"center"}}>録音データなし</div>}
          {recLib.map(t=>(<div key={t.id} onClick={()=>{if(editingName===t.id)return;handleTap(t.id,t.name,()=>loadAndPlay(t,S_RC));}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:activeTrackId===t.id?"rgba(239,68,68,0.06)":"#111116",border:activeTrackId===t.id?"1px solid rgba(239,68,68,0.15)":"1px solid #2a2a35",borderRadius:12,marginBottom:8,cursor:"pointer"}}>
            <div style={{width:44,height:44,borderRadius:10,background:"#2a2a35",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeTrackId===t.id&&isPlaying?<Disc size={20} color="#f87171" style={{animation:"spin 2s linear infinite"}}/>:<MicIcon size={20} color={activeTrackId===t.id?"#f87171":"#4a4e5e"}/>}</div>
            <div style={{flex:1,minWidth:0}}>
              {editingName===t.id?<input autoFocus value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={()=>{renameTrk(recLib,setRecLib,"recLib",t.id,editNameVal.trim()||t.name);setEditingName(null);}} onKeyDown={e=>{if(e.key==="Enter"){renameTrk(recLib,setRecLib,"recLib",t.id,editNameVal.trim()||t.name);setEditingName(null);}}} style={{width:"100%",background:"#0a0a0a",border:"1px solid #f8717140",borderRadius:6,padding:"4px 8px",fontSize:14,color:"#c8ccd8",outline:"none",fontFamily:ff,boxSizing:"border-box"}}/>:<div style={{fontSize:14,color:activeTrackId===t.id?"#f87171":"#c8ccd8",fontWeight:500}}>{t.name}</div>}
              <div style={{fontSize:11,color:"#4a4e5e",marginTop:2}}>{fmtS(t.size)} · {t.ext}</div>
            </div>
            <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>toggleTrackLock(recLib,setRecLib,"recLib",t.id)} style={{...btn,padding:6,color:t.locked?"#4af0a0":"#3a3a4a"}}>{t.locked?<Lock size={12}/>:<Unlock size={12}/>}</button>
              {!t.locked&&<button onClick={()=>removeTrack(t.id,recLib,setRecLib,S_RC,"recLib")} style={{...btn,padding:6,color:"#4a4e5e"}}><XIcon size={14}/></button>}
            </div>
          </div>))}
        </div>)}

        {/* SETTINGS TAB */}
        {tab==="settings"&&(<div style={{flex:1,overflowY:"auto",padding:16}}>
          <div style={{fontSize:16,fontWeight:600,color:"#c8ccd8",marginBottom:16}}>設定</div>
          <div style={{background:"#111116",borderRadius:12,border:"1px solid #2a2a35",padding:16,marginBottom:16}}>
            <AuthUI user={user} onLogin={login} onLogout={logout} syncStatus={syncStatus} hasSupabase={hasSupabase} billing={billing} onUpgrade={startUpgrade} onManageBilling={manageBilling} onRefreshBilling={refreshBilling} compact />
          </div>
          {/* Trash */}
          <div style={{background:"#111116",borderRadius:12,border:"1px solid #2a2a35",padding:16,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><Trash2 size={14} color="#7a7e8e"/><span style={{fontSize:14,color:"#c8ccd8"}}>ゴミ箱</span><span style={{fontSize:10,color:"#4a4e5e"}}>{trash.length}件</span></div>
              {!showTrashView&&trash.length>0&&<button onClick={()=>setShowTrashView(true)} style={{fontSize:11,color:"#4af0a0",background:"none",border:"none",cursor:"pointer",fontFamily:ff}}>表示</button>}
              {showTrashView&&<button onClick={()=>setShowTrashView(false)} style={{fontSize:11,color:"#7a7e8e",background:"none",border:"none",cursor:"pointer",fontFamily:ff}}>閉じる</button>}
            </div>
            {showTrashView&&(<div>
              {trash.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:"#4a4e5e",fontSize:12}}>ゴミ箱は空です</div>}
              {trash.map(item=>(<div key={item.id} style={{background:"#0a0a0a",border:"1px solid #2a2a35",borderRadius:8,padding:12,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:item.type==="project"?"rgba(59,130,246,0.1)":item.type==="audio"?"rgba(74,240,160,0.1)":"rgba(239,68,68,0.1)",color:item.type==="project"?"#3b82f6":item.type==="audio"?"#4af0a0":"#f87171"}}>{item.type==="project"?"プロジェクト":item.type==="audio"?"音楽":"録音"}</span>
                    <span style={{fontSize:12,color:"#c8ccd8"}}>{item.type==="project"?item.data.project?.title:item.data.track?.name}</span>
                  </div>
                  <span style={{fontSize:9,color:"#4a4e5e"}}>残り{daysLeft(item.deletedAt)}日</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>restoreFromTrash(item.id)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid rgba(74,222,128,0.3)",background:"rgba(74,222,128,0.08)",color:"#4ade80",fontSize:11,cursor:"pointer",fontFamily:ff}}>復元</button>
                  <button onClick={()=>permanentDeleteTrash(item.id)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:11,cursor:"pointer",fontFamily:ff}}>完全に削除</button>
                </div>
              </div>))}
              {trash.length>0&&<button onClick={emptyTrash} style={{width:"100%",padding:"8px",borderRadius:6,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:11,cursor:"pointer",fontFamily:ff,marginTop:4}}>ゴミ箱を空にする</button>}
            </div>)}
          </div>
          <div style={{background:"#111116",borderRadius:12,border:"1px solid #2a2a35",padding:16,marginBottom:16}}>
            <div style={{fontSize:14,color:"#c8ccd8",marginBottom:6}}>データリセット</div>
            <div style={{fontSize:12,color:"#7a7e8e",marginBottom:12}}>すべてのデータを初期状態に戻します（取消不可）</div>
            <button onClick={()=>setConfirmReset(true)} style={{padding:"10px 20px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:13,cursor:"pointer",fontFamily:ff}}>リセット</button>
          </div>
          <div style={{background:"#111116",borderRadius:12,border:"1px solid #2a2a35",padding:16}}>
            <div style={{fontSize:14,color:"#c8ccd8",marginBottom:8}}>ストレージ情報</div>
            <div style={{fontSize:12,color:"#7a7e8e",lineHeight:1.8}}>プロジェクト: {projects.length}<br/>スクラップ: {cards.length}<br/>音楽: {audioLib.length}<br/>録音: {recLib.length}</div>
          </div>
        </div>)}
      </div>

      {/* ── Expanded Player ── */}
      {showPlayer&&(<div style={{position:"absolute",bottom:70,left:8,right:8,background:"#111116",border:"1px solid #3a3a4a",borderRadius:16,padding:16,zIndex:40,boxShadow:"0 -8px 32px rgba(0,0,0,0.5)",maxWidth:464,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:500,color:"#c8ccd8"}}>{trackName||"トラック未選択"}</div>
          <button onClick={()=>setShowPlayer(false)} style={{...btn,padding:4,color:"#4a4e5e"}}><XIcon size={16}/></button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <span style={{fontSize:11,fontFamily:mf,color:"#7a7e8e",width:36,textAlign:"right"}}>{fmtT(curTime)}</span>
          <div style={{flex:1,position:"relative",height:20,display:"flex",alignItems:"center"}}><div style={{width:"100%",height:4,borderRadius:999,background:"#3a3a4a"}}><div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",left:0,height:4,borderRadius:999,background:"#4af0a0",width:`${seekPos}%`}}/></div><input type="range" min={0} max={100} value={seekPos} onChange={e=>handleSeek(Number(e.target.value))} style={{position:"absolute",inset:0,width:"100%",opacity:0,cursor:"pointer"}}/></div>
          <span style={{fontSize:11,fontFamily:mf,color:"#7a7e8e",width:36}}>{fmtT(dur)}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
          {isRecording?<button onClick={stopRec} style={{...btn,padding:8}}><StopCircle size={28} color="#ef4444" fill="#ef4444"/></button>:<button onClick={startRec} style={{...btn,padding:8,color:"#7a7e8e"}}><MicIcon size={22}/></button>}
          {isRecording&&<span style={{fontSize:10,color:"#ef4444",fontFamily:mf,animation:"pulse 1s infinite"}}>REC</span>}
          <button onClick={()=>{if(audioEl.current)audioEl.current.currentTime=Math.max(0,audioEl.current.currentTime-5);}} style={{...btn,padding:8,color:hasSrc?"#7a7e8e":"#4a4e5e"}}><SkipBack size={22}/></button>
          <button onClick={togglePlay} style={{...btn,width:48,height:48,borderRadius:24,background:hasSrc?"#c8ccd8":"#3a3a4a"}}>{isPlaying?<PauseI size={20} color="#111116" fill="#111116"/>:<Play size={20} color={hasSrc?"#111116":"#7a7e8e"} fill={hasSrc?"#111116":"#7a7e8e"} style={{marginLeft:2}}/>}</button>
          <button onClick={()=>{if(audioEl.current)audioEl.current.currentTime=Math.min(dur,audioEl.current.currentTime+5);}} style={{...btn,padding:8,color:hasSrc?"#7a7e8e":"#4a4e5e"}}><SkipFwd size={22}/></button>
          <button onClick={()=>setRepeatOn(!repeatOn)} style={{...btn,padding:8,color:repeatOn?"#4af0a0":"#7a7e8e"}}><RepeatIcon size={20}/></button>
        </div>
      </div>)}

      {/* ── Mini Player ── */}
      {hasSrc&&!showPlayer&&(<div onClick={()=>setShowPlayer(true)} style={{margin:"0 8px 6px",background:"#111116",borderRadius:14,border:"1px solid #2a2a35",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:8,background:"#1c1917",border:"1px solid rgba(74,240,160,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isPlaying?<Disc size={16} color="#4af0a0" style={{animation:"spin 2s linear infinite"}}/>:<MusicIcon size={16} color="#4af0a0"/>}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:500,color:"#c8ccd8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{trackName}</div>
          <div style={{width:"100%",height:2,borderRadius:1,background:"#3a3a4a",marginTop:4}}><div style={{width:`${seekPos}%`,height:"100%",borderRadius:1,background:"#4af0a0"}}/></div>
        </div>
        <button onClick={e=>{e.stopPropagation();togglePlay();}} style={{...btn,padding:6}}>{isPlaying?<PauseI size={22} color="#c8ccd8" fill="#c8ccd8"/>:<Play size={22} color="#c8ccd8" fill="#c8ccd8"/>}</button>
      </div>)}

      {/* ── Tab Bar ── */}
      {/* CONFIRM RESET */}
      {confirmReset&&(<div onClick={()=>setConfirmReset(false)} style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#111116",border:"1px solid #4a4e5e",borderRadius:12,padding:24,width:"100%",maxWidth:340,margin:"0 16px",textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>⚠️</div>
        <div style={{fontSize:14,fontWeight:500,color:"#c8ccd8",marginBottom:8}}>本当にリセットしますか？</div>
        <div style={{fontSize:12,color:"#7a7e8e",marginBottom:20,lineHeight:1.5}}>すべてのデータが完全に削除されます。この操作は取り消せません。</div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>setConfirmReset(false)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #3a3a4a",background:"transparent",color:"#7a7e8e",fontSize:13,cursor:"pointer",fontFamily:ff}}>キャンセル</button><button onClick={async()=>{setConfirmReset(false);for(const t of audioLib)await deleteAudio(S_AP+t.id);for(const t of recLib)await deleteAudio(S_RC+t.id);await deleteData(S_KEY);await clearAllAudio();const resetProjects=[{id:"proj_1",title:"New Project"}];const resetData=syncStamp({projects:resetProjects,lyrics:{"proj_1":""},cards:[],audioLib:[],recLib:[],memo:{},trash:[],projectList:[],projectFolders:[],activeProj:"proj_1"});resetData.__lastSyncedAt=localLastSyncedAtRef.current;localUpdatedAtRef.current=resetData.__updatedAt;setProjects(resetProjects);setLyrics(resetData.lyrics);setCards([]);setAudioLib([]);setRecLib([]);setMemo({});setTrash([]);setProjectList([]);setProjectFolders([]);setActiveProj("proj_1");await saveAppData(resetData);if(user){const pushResult=await push(resetData);if(pushResult?.ok){const synced=markSynced(resetData);localLastSyncedAtRef.current=synced.__lastSyncedAt;await saveAppData(synced);}}}} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff}}>リセット</button></div>
      </div></div>)}

      {/* Tab Bar */}
      <div style={{display:"flex",borderTop:"1px solid #2a2a35",background:"#0a0a0a",padding:"6px 0 env(safe-area-inset-bottom, 12px)",flexShrink:0}}>
        {[
          {id:"editor",icon:<Edit size={20}/>,label:"エディタ"},
          {id:"scraps",icon:<Layers size={20}/>,label:"スクラップ"},
          {id:"memo",icon:<FileText size={20}/>,label:"メモ"},
          {id:"library",icon:<Headphones size={20}/>,label:"ライブラリ"},
          {id:"settings",icon:<Settings size={20}/>,label:"設定"},
        ].map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"8px 0"}}>
          <div style={{color:tab===t.id?"#4af0a0":"#4a4e5e"}}>{t.icon}</div>
          <span style={{fontSize:9,color:tab===t.id?"#4af0a0":"#4a4e5e",fontFamily:ff}}>{t.label}</span>
        </button>))}
      </div>
    </div>
  );
}
