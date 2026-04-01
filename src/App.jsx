import { useState, useEffect, useCallback, useRef } from "react";
import { loadData as _loadData, saveData as _saveData, deleteData, saveAudio, loadAudio, deleteAudio, clearAllAudio } from "./storage.js";
import { useAuth, AuthUI, SyncBadge } from "./Auth.jsx";
import { syncAudioOnLogin } from "./sync.js";

/* ── Icons ─────────────────────────────────── */
const I=({d,size=16,color="currentColor",style={}})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...style}}>{typeof d==="string"?<path d={d}/>:d}</svg>);
const ChevronLeft=(p)=><I {...p} d="M15 18l-6-6 6-6"/>;
const ChevronRight=(p)=><I {...p} d="M9 18l6-6-6-6"/>;
const ChevronDown=(p)=><I {...p} d="M6 9l6 6 6-6"/>;
const Plus=(p)=><I {...p} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>;
const Search=(p)=><I {...p} d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}/>;
const Settings=(p)=><I {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>}/>;
const MusicIcon=(p)=><I {...p} d={<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>}/>;
const FolderOpen=(p)=><I {...p} d={<><path d="M2 19a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-7l-2-2H4a2 2 0 00-2 2z"/></>}/>;
const Bookmark=(p)=><I {...p} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>;
const Layers=(p)=><I {...p} d={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>}/>;
const PenTool=(p)=><I {...p} d={<><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></>}/>;
const Tag=(p)=><I {...p} d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>}/>;
const Trash2=(p)=><I {...p} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>}/>;
const Play=(p)=><I {...p} d={<polygon points="5 3 19 12 5 21 5 3" fill={p.fill||"none"}/>}/>;
const PauseI=(p)=><I {...p} d={<><rect x="6" y="4" width="4" height="16" fill={p.fill||"none"}/><rect x="14" y="4" width="4" height="16" fill={p.fill||"none"}/></>}/>;
const SkipBack=(p)=><I {...p} d={<><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></>}/>;
const SkipForward=(p)=><I {...p} d={<><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></>}/>;
const Volume2=(p)=><I {...p} d={<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></>}/>;
const VolumeX=(p)=><I {...p} d={<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>}/>;
const RepeatIcon=(p)=><I {...p} d={<><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></>}/>;
const Upload=(p)=><I {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>}/>;
const XIcon=(p)=><I {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>;
const CheckIcon=(p)=><I {...p} d={<><polyline points="20 6 9 17 4 12"/></>}/>;
const Loader=({size=14,color="#fbbf24"})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={{flexShrink:0,animation:"spin 1s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>);
const Disc=(p)=><I {...p} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></>}/>;
const Headphones=(p)=><I {...p} d={<><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></>}/>;
const MicIcon=(p)=><I {...p} d={<><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>}/>;
const StopCircle=(p)=><I {...p} d={<><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" fill={p.fill||"none"}/></>}/>;
const FileText=(p)=><I {...p} d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>}/>;
const Lock=(p)=><I {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}/>;
const Unlock=(p)=><I {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></>}/>;

/* ── Storage keys ──────────────────────────── */
const S_KEY = "lyric-workspace-v3";
const S_AP = "lyric-audio:";
const S_RC = "lyric-rec:";

/* ── Helpers ───────────────────────────────── */
const SEC_C = { Verse: "#3b82f6", Hook: "#f59e0b", Chorus: "#f59e0b", Bridge: "#a855f7", Outro: "#22c55e", Intro: "#22c55e" };
function getSecColor(l) { const m = l.match(/^\[(.+?)\]/); if (!m) return null; for (const k of Object.keys(SEC_C)) { if (m[1].toLowerCase().startsWith(k.toLowerCase())) return SEC_C[k]; } return "#737373"; }
function getSecLabel(l) { const m = l.match(/^\[(.+?)\]/); return m ? m[1] : null; }
function buildSecMap(ls) { const m = new Array(ls.length).fill(null); let c = null; for (let i = 0; i < ls.length; i++) { const cc = getSecColor(ls[i]); if (cc) c = cc; if (ls[i].trim() === "" && (i + 1 >= ls.length || getSecColor(ls[i + 1] || ""))) c = null; m[i] = c; } return m; }
const fmtT = (s) => { if (!s || isNaN(s) || !isFinite(s)) return "0:00"; return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); };
const fmtS = (b) => b < 1048576 ? (b / 1024).toFixed(1) + "KB" : (b / 1048576).toFixed(1) + "MB";
const ts = () => { const n = new Date(); return n.getHours() + ":" + String(n.getMinutes()).padStart(2, "0"); };

function findSection(text, sel) {
  const idx = text.indexOf(sel);
  if (idx === -1) return "メモ";
  const lines = text.split("\n");
  const li = text.substring(0, idx).split("\n").length - 1;
  let sec = "メモ";
  for (let i = 0; i <= li && i < lines.length; i++) { const lb = getSecLabel(lines[i]); if (lb) sec = lb; }
  return sec;
}

const EMOJI_OPTS = ["🎵", "🎤", "🔥", "🧊", "🏚️", "🏀", "💀", "🌙", "🚬", "📻", "🎹", "🌊", "⚡", "🍵"];
const ff = "'Noto Sans JP', sans-serif";
const mf = "'JetBrains Mono', monospace";

/* ── Sub-components ────────────────────────── */
function LyricEditor({ text, setText, onContextMenu }) {
  const ta = useRef(null), gut = useRef(null);
  const [cl, setCl] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const ls = text.split("\n"), sm = buildSecMap(ls), LH = 28;
  const sync = () => { if (ta.current && gut.current) gut.current.scrollTop = ta.current.scrollTop; };
  const uc = () => { if (!ta.current) return; setCl(text.substring(0, ta.current.selectionStart).split("\n").length - 1); };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); const d = e.dataTransfer.getData("text/plain"); if (!d || !ta.current) return; const el = ta.current; const pos = el.selectionStart; const before = text.substring(0, pos); const after = text.substring(pos); const ins = (before.length > 0 && !before.endsWith("\n") ? "\n" : "") + d + "\n"; setText(before + ins + after); setTimeout(() => { el.selectionStart = el.selectionEnd = pos + ins.length; el.focus(); }, 0); };
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div ref={gut} style={{ flexShrink: 0, overflowY: "hidden", paddingTop: 16, paddingBottom: 16, userSelect: "none", display: "flex" }}>
        <div style={{ width: 3, flexShrink: 0 }}>{ls.map((l, i) => (<div key={i} style={{ height: LH, background: sm[i] || "transparent", opacity: getSecLabel(l) ? 1 : 0.4 }} />))}</div>
        <div style={{ width: 40 }}>{ls.map((l, i) => { const iS = !!getSecLabel(l), iA = i === cl, sc = getSecColor(l); if (iS) { return (<div key={i} style={{ height: LH, lineHeight: LH + "px", fontSize: 9, fontFamily: mf, textAlign: "right", paddingRight: 10, color: sc, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getSecLabel(l)}</div>); } const lineNum = ls.slice(0, i + 1).filter((x, j) => j <= i && !getSecLabel(x)).length; return (<div key={i} style={{ height: LH, lineHeight: LH + "px", fontSize: 11, fontFamily: mf, textAlign: "right", paddingRight: 10, color: iA ? "#737373" : "#333", fontWeight: 400 }}>{lineNum}</div>); })}</div>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        {dragOver && <div style={{ position: "absolute", inset: 0, border: "2px dashed #fbbf24", borderRadius: 8, background: "rgba(251,191,36,0.04)", zIndex: 3, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 12, color: "#fbbf24" }}>ここにドロップして挿入</span></div>}
        <textarea ref={ta} value={text} onChange={(e) => { setText(e.target.value); setTimeout(uc, 0); }} onScroll={sync} onClick={uc} onKeyUp={uc} onContextMenu={onContextMenu} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} spellCheck={false} style={{ width: "100%", height: "100%", fontFamily: ff, fontSize: 14, lineHeight: LH + "px", letterSpacing: "0.02em", caretColor: "#fbbf24", background: "transparent", color: "#e5e5e5", border: "none", outline: "none", resize: "none", padding: "16px 16px 16px 8px", overflowY: "auto" }} />
      </div>
    </div>
  );
}

function SectionNav({ text }) {
  const s = [];
  text.split("\n").forEach((l) => { const lb = getSecLabel(l); if (lb) s.push({ label: lb, color: getSecColor(l) }); });
  if (!s.length) return null;
  return (<div style={{ padding: "8px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0, alignItems: "center" }}><span style={{ fontSize: 10, color: "#404040", marginRight: 4 }}>SECTIONS</span>{s.map((x, i) => (<span key={i} style={{ fontSize: 10, fontFamily: mf, fontWeight: 500, color: x.color, background: x.color + "14", border: "1px solid " + x.color + "40", borderRadius: 4, padding: "2px 8px" }}>{x.label}</span>))}</div>);
}

function ScrapCard({ card, onDelete }) {
  const [h, setH] = useState(false);
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", card.text); e.dataTransfer.effectAllowed = "copy"; }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ background: "#171717", border: h ? "1px solid #525252" : "1px solid #262626", borderRadius: 8, padding: 10, cursor: "grab", transition: "border-color 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "#525252" }}>{card.time}</span>
        <div style={{ display: "flex", gap: 2, opacity: h ? 1 : 0, transition: "opacity 0.15s" }}>
          <button onClick={onDelete} style={{ padding: 3, background: "none", border: "none", cursor: "pointer", borderRadius: 4, color: "#525252" }}><Trash2 size={10} /></button>
        </div>
      </div>
      <p style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-line", color: "#d4d4d4", margin: "0 0 8px 0" }}>{card.text}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {card.tags.map((t) => (<span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, padding: "1px 6px", borderRadius: 999, background: "#262626", color: "#a3a3a3", border: "1px solid rgba(82,82,82,0.5)" }}><Tag size={8} />{t}</span>))}
      </div>
    </div>
  );
}

function EditableName({ name, onSave, style: { fontSize: fs = 11, ...rest } = {} }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(name);
  if (editing) return <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { onSave(v.trim() || name); setEditing(false); }} onKeyDown={(e) => { if (e.key === "Enter") { onSave(v.trim() || name); setEditing(false); } if (e.key === "Escape") setEditing(false); }} style={{ background: "#0a0a0a", border: "1px solid #fbbf2440", borderRadius: 3, padding: "1px 4px", fontSize: fs, color: "#e5e5e5", outline: "none", fontFamily: ff, width: "100%", boxSizing: "border-box", ...rest }} />;
  return <span onDoubleClick={() => { setV(name); setEditing(true); }} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "default", fontSize: fs, ...rest }} title="ダブルクリックで名前変更">{name}</span>;
}

/* ══════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════ */
export default function LyricWorkspace() {
  // State refs for remote sync callback
  const remoteRef = useRef(null);
  const audioSyncRef = useRef(null);
  const { user, authLoading, syncStatus, login, register, logout, push, pushNow, pushAudio, removeAudio, hasSupabase } = useAuth(
    useCallback((data) => { if (remoteRef.current) remoteRef.current(data); }, []),
    useCallback(async (userId, aLib, rLib) => { if (audioSyncRef.current) await audioSyncRef.current(userId, aLib, rLib); }, [])
  );
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([{ id: "proj_1", title: "New Project", emoji: "🎵" }]);
  const [activeProj, setActiveProj] = useState("proj_1");
  const [lyrics, setLyrics] = useState({ "proj_1": "" });
  const [cards, setCards] = useState([]);
  const [audioLib, setAudioLib] = useState([]);
  const [recLib, setRecLib] = useState([]);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [memo, setMemo] = useState({});

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scrapsOpen, setScrapsOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [seekPos, setSeekPos] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [trackName, setTrackName] = useState("");
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [repeatOn, setRepeatOn] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [selText, setSelText] = useState("");
  const [modal, setModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [showNewProj, setShowNewProj] = useState(false);
  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjEmoji, setNewProjEmoji] = useState("🎵");
  const [showSettings, setShowSettings] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [dragProjId, setDragProjId] = useState(null);
  const [showScrapInput, setShowScrapInput] = useState(false);
  const [scrapInputText, setScrapInputText] = useState("");
  const [scrapInputTags, setScrapInputTags] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [showTagDrop, setShowTagDrop] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const saveTimerRef = useRef(null);
  const stateRef = useRef({});
  const audioElRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCacheRef = useRef({});
  const mediaRecRef = useRef(null);
  const recChunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const destRef = useRef(null);

  // Always keep stateRef up to date for async push
  stateRef.current = { projects, lyrics, cards, activeProj, audioLib, recLib, memo, trash, projectList };

  const btn = { background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" };

  // Remote sync callback
  useEffect(() => {
    remoteRef.current = async (data) => {
      if (data.projects) setProjects(data.projects);
      if (data.lyrics) setLyrics(data.lyrics);
      if (data.cards) setCards(data.cards);
      if (data.activeProj) setActiveProj(data.activeProj);
      if (data.memo) setMemo(data.memo);
      if (data.trash) setTrash(data.trash);
      if (data.projectList) setProjectList(data.projectList);
      if (data.audioLib) setAudioLib(data.audioLib);
      if (data.recLib) setRecLib(data.recLib);
      // Update stateRef + persist to localStorage immediately
      const merged = { ...stateRef.current, ...data };
      stateRef.current = merged;
      await _saveData(S_KEY, merged);
      if (user && (data.audioLib || data.recLib)) {
        await syncAudioOnLogin(user.id, data.audioLib || [], data.recLib || [], loadAudio, saveAudio, S_AP, S_RC, audioCacheRef);
      }
    };
    audioSyncRef.current = async (userId, aLib, rLib) => {
      await syncAudioOnLogin(userId, aLib, rLib, loadAudio, saveAudio, S_AP, S_RC, audioCacheRef);
      setAudioLib(aLib);
      setRecLib(rLib);
    };
  });

  // Audio init
  useEffect(() => {
    const a = new Audio(); a.preload = "metadata";
    a.addEventListener("timeupdate", () => { setCurTime(a.currentTime); if (a.duration) setSeekPos((a.currentTime / a.duration) * 100); });
    a.addEventListener("loadedmetadata", () => {
      if (a.duration === Infinity || isNaN(a.duration)) {
        a.currentTime = 1e101;
        const fix = () => { a.currentTime = 0; setDur(a.duration); a.removeEventListener("timeupdate", fix); };
        a.addEventListener("timeupdate", fix);
      } else { setDur(a.duration); }
    });
    a.addEventListener("ended", () => { if (a.loop) return; setIsPlaying(false); setSeekPos(0); setCurTime(0); });
    audioElRef.current = a;
    return () => { a.pause(); a.src = ""; };
  }, []);

  // Load
  useEffect(() => { (async () => { try { const d = await _loadData(S_KEY); if (d) { const p = JSON.parse(d); if (p.projects) setProjects(p.projects); if (p.lyrics) setLyrics(p.lyrics); if (p.cards) setCards(p.cards); if (p.activeProj) setActiveProj(p.activeProj); if (p.audioLib) setAudioLib(p.audioLib); if (p.recLib) setRecLib(p.recLib); if (p.memo) setMemo(p.memo); if (p.trash) { const now = Date.now(); const alive = p.trash.filter(t => now - t.deletedAt < 30*24*60*60*1000); setTrash(alive); } if (p.projectList) setProjectList(p.projectList); } } catch (e) { console.error("Load:", e); } setLoading(false); })(); }, []);

  // Auto-pull from cloud on restart if logged in
  const hasPulledRef = useRef(false);
  useEffect(() => {
    if (authLoading || !user || hasPulledRef.current) return;
    hasPulledRef.current = true;
    (async () => {
      try {
        const { pullFromCloud, syncAudioOnLogin: sAOL } = await import("./sync.js");
        const result = await pullFromCloud(user.id);
        if (result.data) {
          const d = result.data;
          if (d.projects) setProjects(d.projects);
          if (d.lyrics) setLyrics(d.lyrics);
          if (d.cards) setCards(d.cards);
          if (d.activeProj) setActiveProj(d.activeProj);
          if (d.memo) setMemo(d.memo);
          if (d.trash) { const now = Date.now(); setTrash(d.trash.filter(t => now - t.deletedAt < 30*24*60*60*1000)); }
          if (d.projectList) setProjectList(d.projectList);
          if (d.audioLib) setAudioLib(d.audioLib);
          if (d.recLib) setRecLib(d.recLib);
          await sAOL(user.id, d.audioLib || [], d.recLib || [], loadAudio, saveAudio, S_AP, S_RC, audioCacheRef);
        }
      } catch (e) { console.error("Auto-pull error:", e); }
    })();
  }, [user, authLoading]);

  // Save
  const doSave = useCallback((o = {}) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      // Read latest state from ref, merge with overrides
      const s = stateRef.current;
      const d = { projects: o.projects || s.projects, lyrics: o.lyrics || s.lyrics, cards: o.cards || s.cards, activeProj: o.activeProj || s.activeProj, audioLib: o.audioLib || s.audioLib, recLib: o.recLib || s.recLib, memo: o.memo || s.memo, trash: o.trash || s.trash, projectList: o.projectList || s.projectList };
      await _saveData(S_KEY, d);
      if (user) { push(d); }
      setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
  }, [user, push]);

  const curText = lyrics[activeProj] || "";
  const setCurText = (t) => { const nl = { ...lyrics, [activeProj]: t }; setLyrics(nl); doSave({ lyrics: nl }); };
  const curProject = projects.find((p) => p.id === activeProj) || projectList.find((p) => p.id === activeProj);
  const curMemo = memo[activeProj] || "";
  const setCurMemo = (t) => { const nm = { ...memo, [activeProj]: t }; setMemo(nm); doSave({ memo: nm }); };
  const allTags = [...new Set(cards.filter((c) => c.projId === activeProj).flatMap((c) => c.tags))];
  const filteredCards = cards.filter((c) => c.projId === activeProj && (tagFilter === "all" || c.tags.includes(tagFilter)));
  const hasSrc = !!activeTrackId;
  const lineCount = curText.split("\n").length;
  const charCount = curText.replace(/\s/g, "").length;
  const sectionCount = (curText.match(/^\[.+?\]/gm) || []).length;

  // Project CRUD
  const switchProject = (id) => { setActiveProj(id); setTagFilter("all"); doSave({ activeProj: id }); };
  const addProject = () => { if (!newProjTitle.trim()) return; const id = "proj_" + Date.now(); const np = [...projects, { id, title: newProjTitle.trim(), emoji: newProjEmoji }]; const nl = { ...lyrics, [id]: "" }; setProjects(np); setLyrics(nl); setActiveProj(id); setShowNewProj(false); setNewProjTitle(""); setNewProjEmoji("🎵"); doSave({ projects: np, lyrics: nl, activeProj: id }); };
  const deleteProject = (id) => { const inProjects = projects.find(p => p.id === id); const inList = projectList.find(p => p.id === id); if (inProjects && projects.length <= 1) return; const proj = inProjects || inList; if (!proj || proj.locked) return; const trashItem = { id: "tr_" + Date.now(), type: "project", data: { project: proj, lyrics: lyrics[id], cards: cards.filter(c => c.projId === id), memo: memo[id] }, deletedAt: Date.now() }; const nt = [...trash, trashItem]; const np = projects.filter((p) => p.id !== id); const npl = projectList.filter((p) => p.id !== id); const nl = { ...lyrics }; delete nl[id]; const nc = cards.filter((c) => c.projId !== id); const na = id === activeProj ? (np[0] || npl[0])?.id || "proj_1" : activeProj; const nm = { ...memo }; delete nm[id]; setTrash(nt); setProjects(np); setProjectList(npl); setLyrics(nl); setCards(nc); setActiveProj(na); setMemo(nm); doSave({ trash: nt, projects: np, projectList: npl, lyrics: nl, cards: nc, activeProj: na, memo: nm }); };
  const renameProject = (id, n) => { const np = projects.map((p) => p.id === id ? { ...p, title: n } : p); const npl = projectList.map((p) => p.id === id ? { ...p, title: n } : p); setProjects(np); setProjectList(npl); doSave({ projects: np, projectList: npl }); };
  const toggleLock = (id) => { const np = projects.map(p => p.id === id ? { ...p, locked: !p.locked } : p); const npl = projectList.map(p => p.id === id ? { ...p, locked: !p.locked } : p); setProjects(np); setProjectList(npl); doSave({ projects: np, projectList: npl }); };
  // Drag reorder
  const moveProject = (fromIdx, toIdx, srcList, destList) => {
    if (srcList === "projects" && destList === "projects") {
      const np = [...projects]; const [item] = np.splice(fromIdx, 1); np.splice(toIdx, 0, item); setProjects(np); doSave({ projects: np });
    } else if (srcList === "list" && destList === "list") {
      const nl = [...projectList]; const [item] = nl.splice(fromIdx, 1); nl.splice(toIdx, 0, item); setProjectList(nl); doSave({ projectList: nl });
    } else if (srcList === "projects" && destList === "list") {
      const np = [...projects]; const [item] = np.splice(fromIdx, 1); const nl = [...projectList]; nl.splice(toIdx, 0, item);
      if (np.length === 0) return; // keep at least 1 project
      setProjects(np); setProjectList(nl); if (activeProj === item.id) { setActiveProj(np[0].id); } doSave({ projects: np, projectList: nl });
    } else if (srcList === "list" && destList === "projects") {
      const nl = [...projectList]; const [item] = nl.splice(fromIdx, 1); const np = [...projects]; np.splice(toIdx, 0, item);
      setProjects(np); setProjectList(nl); doSave({ projects: np, projectList: nl });
    }
  };

  // Scrap CRUD
  const saveSelToScrap = useCallback(() => { if (!selText.trim()) return; const sec = findSection(curText, selText); const nc = [{ id: Date.now(), text: selText, tags: [sec], time: ts(), projId: activeProj }, ...cards]; setCards(nc); setCtxMenu(null); setScrapsOpen(true); doSave({ cards: nc }); }, [selText, activeProj, cards, curText, doSave]);
  const deleteCard = useCallback((id) => { const nc = cards.filter((c) => c.id !== id); setCards(nc); doSave({ cards: nc }); }, [cards, doSave]);
  const addManualCard = () => { if (!scrapInputText.trim()) return; const tags = scrapInputTags.trim() ? scrapInputTags.split(/[,、\s]+/).filter(Boolean) : ["メモ"]; const nc = [{ id: Date.now(), text: scrapInputText.trim(), tags, time: ts(), projId: activeProj }, ...cards]; setCards(nc); setScrapInputText(""); setScrapInputTags(""); setShowScrapInput(false); doSave({ cards: nc }); };

  // Reset
  const resetAll = async () => { for (const t of audioLib) await deleteAudio(S_AP + t.id); for (const t of recLib) await deleteAudio(S_RC + t.id); await deleteData(S_KEY); await clearAllAudio(); const resetData = { projects: [{ id: "proj_1", title: "New Project", emoji: "🎵" }], lyrics: { "proj_1": "" }, cards: [], audioLib: [], recLib: [], memo: {}, trash: [], projectList: [], activeProj: "proj_1" }; setProjects(resetData.projects); setLyrics(resetData.lyrics); setCards([]); setAudioLib([]); setRecLib([]); setMemo({}); setTrash([]); setProjectList([]); setActiveProj("proj_1"); setShowSettings(false); if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.src = ""; } setTrackName(""); setIsPlaying(false); setActiveTrackId(null); if (user) { push(resetData); } };

  // Audio playback
  const playTrack = useCallback((meta, b64) => { const a = audioElRef.current; if (!a) return; if (meta.id === activeTrackId && a.src) { if (isPlaying) { a.pause(); setIsPlaying(false); } else { a.play().then(() => setIsPlaying(true)).catch(() => {}); } return; } a.pause(); a.src = b64; a.volume = isMuted ? 0 : volume; a.loop = repeatOn; setTrackName(meta.name); setActiveTrackId(meta.id); setSeekPos(0); setCurTime(0); setDur(0); a.load(); const rdy = () => { a.play().then(() => setIsPlaying(true)).catch(() => {}); a.removeEventListener("canplay", rdy); }; a.addEventListener("canplay", rdy); }, [isMuted, volume, activeTrackId, isPlaying, repeatOn]);
  const loadAndPlay = useCallback(async (meta, prefix) => { let b = audioCacheRef.current[meta.id]; if (!b) { b = await loadAudio(prefix + meta.id); if (!b) return; audioCacheRef.current[meta.id] = b; } playTrack(meta, b); }, [playTrack]);
  const handleFileUpload = async (e) => { const file = e.target.files?.[0]; if (!file) return; setUploadingAudio(true); const reader = new FileReader(); reader.onload = async (ev) => { const b64 = ev.target.result; const id = "aud_" + Date.now(); const meta = { id, name: file.name.replace(/\.[^.]+$/, ""), size: file.size, ext: file.name.split(".").pop() }; const ok = await saveAudio(S_AP + id, b64); if (!ok) { alert("ファイルサイズ上限超過"); setUploadingAudio(false); return; } audioCacheRef.current[id] = b64; pushAudio(id, b64); const nal = [...audioLib, meta]; setAudioLib(nal); doSave({ audioLib: nal }); playTrack(meta, b64); setModal(false); setUploadingAudio(false); }; reader.readAsDataURL(file); e.target.value = ""; };
  const renameTrk = (lib, setLib, key, id, n) => { const nl = lib.map((t) => t.id === id ? { ...t, name: n } : t); setLib(nl); if (activeTrackId === id) setTrackName(n); doSave({ [key]: nl }); };
  const toggleTrackLock = (lib, setLib, key, id) => { const nl = lib.map(t => t.id === id ? { ...t, locked: !t.locked } : t); setLib(nl); doSave({ [key]: nl }); };
  const removeTrack = async (id, lib, setLib, prefix, key) => { const track = lib.find(t => t.id === id); const trashItem = { id: "tr_" + Date.now(), type: key === "audioLib" ? "audio" : "recording", data: { track }, deletedAt: Date.now() }; const nt = [...trash, trashItem]; setTrash(nt); const nl = lib.filter((t) => t.id !== id); setLib(nl); if (activeTrackId === id) { audioElRef.current?.pause(); setTrackName(""); setIsPlaying(false); setActiveTrackId(null); } doSave({ trash: nt, [key]: nl }); };

  // Trash: restore item
  const restoreFromTrash = (trashId) => {
    const item = trash.find(t => t.id === trashId);
    if (!item) return;
    const nt = trash.filter(t => t.id !== trashId);
    if (item.type === "project") {
      const d = item.data;
      const np = [...projects, d.project];
      const nl = { ...lyrics, [d.project.id]: d.lyrics || "" };
      const nc = [...cards, ...(d.cards || [])];
      const nm = { ...memo, [d.project.id]: d.memo || "" };
      setProjects(np); setLyrics(nl); setCards(nc); setMemo(nm); setTrash(nt);
      doSave({ trash: nt, projects: np, lyrics: nl, cards: nc, memo: nm });
    } else {
      const track = item.data.track;
      if (item.type === "audio") { const nal = [...audioLib, track]; setAudioLib(nal); setTrash(nt); doSave({ trash: nt, audioLib: nal }); }
      else { const nrl = [...recLib, track]; setRecLib(nrl); setTrash(nt); doSave({ trash: nt, recLib: nrl }); }
    }
  };
  // Trash: permanent delete
  const permanentDelete = async (trashId) => {
    const item = trash.find(t => t.id === trashId);
    if (!item) return;
    if (item.type === "audio" || item.type === "recording") {
      const track = item.data.track;
      const prefix = item.type === "audio" ? S_AP : S_RC;
      await deleteAudio(prefix + track.id); delete audioCacheRef.current[track.id]; await removeAudio(track.id);
    }
    const nt = trash.filter(t => t.id !== trashId); setTrash(nt);
    const saveData = { projects, lyrics, cards, activeProj, audioLib, recLib, memo, trash: nt, projectList };
    await _saveData(S_KEY, saveData); if (user) await pushNow(saveData);
  };
  // Trash: empty all
  const emptyTrash = async () => {
    for (const item of trash) {
      if (item.type === "audio" || item.type === "recording") {
        const track = item.data.track;
        const prefix = item.type === "audio" ? S_AP : S_RC;
        await deleteAudio(prefix + track.id); delete audioCacheRef.current[track.id]; await removeAudio(track.id);
      }
    }
    setTrash([]);
    const saveData = { projects, lyrics, cards, activeProj, audioLib, recLib, memo, trash: [], projectList };
    await _saveData(S_KEY, saveData); if (user) await pushNow(saveData);
  };
  const daysLeft = (deletedAt) => Math.max(0, 30 - Math.floor((Date.now() - deletedAt) / (24*60*60*1000)));

  useEffect(() => { if (audioElRef.current) audioElRef.current.volume = isMuted ? 0 : volume; }, [volume, isMuted]);
  useEffect(() => { if (audioElRef.current) audioElRef.current.loop = repeatOn; }, [repeatOn]);
  const togglePlay = () => { const a = audioElRef.current; if (!a || !a.src) { setModal(true); return; } if (isPlaying) { a.pause(); setIsPlaying(false); } else { a.play().then(() => setIsPlaying(true)).catch(() => {}); } };
  const handleSeek = (v) => { setSeekPos(v); if (audioElRef.current && dur) audioElRef.current.currentTime = (v / 100) * dur; };
  const handleVol = (v) => { const vol = v / 100; setVolume(vol); setIsMuted(vol === 0); };

  // Recording (mic + track)
  const startRecording = async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false } });
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      audioCtxRef.current = ctx; await ctx.resume();
      // Stereo mix bus → stereo destination
      const d = ctx.createMediaStreamDestination();
      d.channelCount = 2; d.channelCountMode = "explicit"; d.channelInterpretation = "speakers";
      const mixBus = ctx.createGain();
      mixBus.channelCount = 2; mixBus.channelCountMode = "explicit"; mixBus.channelInterpretation = "speakers";
      mixBus.connect(d);
      destRef.current = d;
      // Mic → mix bus (auto upmix mono→stereo via "speakers")
      ctx.createMediaStreamSource(micStream).connect(mixBus);
      // Track → mix bus via captureStream
      const a = audioElRef.current;
      if (a && a.src) {
        try {
          const s2 = a.captureStream ? a.captureStream() : a.mozCaptureStream();
          ctx.createMediaStreamSource(s2).connect(mixBus);
        } catch (err) { console.log("captureStream not available:", err); }
        if (a.paused) { a.play().then(() => setIsPlaying(true)).catch(() => {}); }
      }
      recChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(d.stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        micStream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recChunksRef.current, { type: "audio/webm" });
        const r2 = new FileReader(); r2.onload = async (ev) => { const b64 = ev.target.result; const id = "rec_" + Date.now(); const meta = { id, name: "録音_" + ts().replace(":", ""), size: blob.size, ext: "webm" }; await saveAudio(S_RC + id, b64); audioCacheRef.current[id] = b64; pushAudio(id, b64); const nrl = [...recLib, meta]; setRecLib(nrl); doSave({ recLib: nrl }); }; r2.readAsDataURL(blob);
        try { ctx.close(); } catch (err) {} audioCtxRef.current = null;
      };
      mr.start(100); mediaRecRef.current = mr; setIsRecording(true);
    } catch (e) { alert("マイクへのアクセスが許可されていません"); }
  };
  const stopRecording = () => { if (mediaRecRef.current && isRecording) { mediaRecRef.current.stop(); mediaRecRef.current = null; setIsRecording(false); } };

  // Keyboard navigation (arrow keys when sidebar hidden)
  useEffect(() => {
    if (sidebarOpen) return;
    const allItems = [...projects, ...projectList];
    const handler = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      const idx = allItems.findIndex(p => p.id === activeProj);
      if (e.key === "ArrowLeft" && idx > 0) { switchProject(allItems[idx - 1].id); }
      else if (e.key === "ArrowRight" && idx < allItems.length - 1) { switchProject(allItems[idx + 1].id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen, projects, projectList, activeProj]);

  // Context menu
  useEffect(() => { if (!ctxMenu) return; const h = () => setCtxMenu(null); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [ctxMenu]);
  const onCtx = useCallback((e) => { e.preventDefault(); const s = window.getSelection().toString().trim(); if (s) { setSelText(s); setCtxMenu({ x: e.clientX, y: e.clientY }); } }, []);

  if (loading) return (<div style={{ fontFamily: ff, height: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#737373", fontSize: 13 }}>読み込み中...</div>);

  return (
    <div style={{ fontFamily: ff, height: "100vh", width: "100%", display: "flex", flexDirection: "column", background: "#0a0a0a", color: "#e5e5e5", overflow: "hidden" }}>
      <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma,.opus,.webm" style={{ display: "none" }} onChange={handleFileUpload} />

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #262626", background: "#0a0a0a", flexShrink: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ ...btn, padding: 6, borderRadius: 6, color: "#a3a3a3" }}>{sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>{curProject?.emoji || "🎵"}</span><span style={{ fontSize: 14, fontWeight: 500, color: "#f5f5f5" }}>{curProject?.title || "無題"}</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 8, fontSize: 10, fontFamily: mf, color: saveStatus === "saving" ? "#fbbf24" : saveStatus === "saved" ? "#4ade80" : "#404040" }}>{saveStatus === "saving" ? <><Loader size={11} /><span>保存中</span></> : <><CheckIcon size={12} /><span>{saveStatus === "saved" ? "保存済み" : "自動保存"}</span></>}</div>
          <SyncBadge syncStatus={syncStatus} user={user} />
          <button onClick={() => setScrapsOpen(!scrapsOpen)} style={{ ...btn, padding: 8, borderRadius: 6, background: scrapsOpen ? "#262626" : "transparent", color: scrapsOpen ? "#fbbf24" : "#737373" }}><Layers size={15} /></button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        {sidebarOpen && (
          <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid #262626", background: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: 12, flex: 1, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "#171717", border: "1px solid #262626", marginBottom: 16 }}><Search size={13} color="#737373" /><input type="text" placeholder="検索..." style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#d4d4d4", width: "100%", fontFamily: ff }} /></div>

              {/* Projects */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 500, color: "#737373", textTransform: "uppercase", letterSpacing: "0.1em" }}>Projects</span><button onClick={() => setShowNewProj(true)} style={{ ...btn, padding: 2, borderRadius: 4, color: "#737373" }}><Plus size={13} /></button></div>
                {showNewProj && (<div style={{ background: "#171717", border: "1px solid #404040", borderRadius: 6, padding: 8, marginBottom: 6 }}><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>{EMOJI_OPTS.map((e) => (<button key={e} onClick={() => setNewProjEmoji(e)} style={{ ...btn, width: 22, height: 22, borderRadius: 4, fontSize: 11, background: newProjEmoji === e ? "#262626" : "transparent", border: newProjEmoji === e ? "1px solid #525252" : "1px solid transparent" }}>{e}</button>))}</div><input type="text" placeholder="プロジェクト名..." value={newProjTitle} onChange={(e) => setNewProjTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addProject()} autoFocus style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", fontSize: 11, color: "#e5e5e5", outline: "none", fontFamily: ff, marginBottom: 6, boxSizing: "border-box" }} /><div style={{ display: "flex", gap: 4 }}><button onClick={addProject} style={{ flex: 1, padding: "4px 0", borderRadius: 4, border: "none", background: "#fbbf24", color: "#171717", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: ff }}>作成</button><button onClick={() => { setShowNewProj(false); setNewProjTitle(""); }} style={{ flex: 1, padding: "4px 0", borderRadius: 4, border: "1px solid #333", background: "transparent", color: "#a3a3a3", fontSize: 11, cursor: "pointer", fontFamily: ff }}>取消</button></div></div>)}
                <div onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={(e) => { e.preventDefault(); const src = JSON.parse(e.dataTransfer.getData("application/json") || "{}"); if (!src.id) return; if (src.from === "list") { const fi = projectList.findIndex(p => p.id === src.id); moveProject(fi, projects.length, "list", "projects"); } }}>
                {projects.map((p, idx) => (<div key={p.id} draggable onDragStart={(e) => { setDragProjId(p.id); e.dataTransfer.setData("application/json", JSON.stringify({ id: p.id, from: "projects", idx })); e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = JSON.parse(e.dataTransfer.getData("application/json") || "{}"); if (!src.id || src.id === p.id) return; if (src.from === "projects") { moveProject(src.idx, idx, "projects", "projects"); } else if (src.from === "list") { const fi = projectList.findIndex(x => x.id === src.id); moveProject(fi, idx, "list", "projects"); } }} onDragEnd={() => setDragProjId(null)} style={{ display: "flex", alignItems: "center", marginBottom: 2, position: "relative", opacity: dragProjId === p.id ? 0.4 : 1 }}><button onClick={() => switchProject(p.id)} style={{ ...btn, width: "100%", gap: 8, padding: "5px 10px", borderRadius: 6, textAlign: "left", fontFamily: ff, fontSize: 12, background: activeProj === p.id ? "#262626" : "transparent", color: activeProj === p.id ? "#f5f5f5" : "#a3a3a3", cursor: "grab" }}><span style={{ fontSize: 13 }}>{p.emoji}</span><EditableName name={p.title} onSave={(n) => renameProject(p.id, n)} style={{ fontSize: 12, flex: 1 }} /></button><div style={{ position: "absolute", right: 4, display: "flex", gap: 1, alignItems: "center" }}><button onClick={() => toggleLock(p.id)} style={{ ...btn, padding: 3, borderRadius: 4, color: p.locked ? "#fbbf24" : "#333" }}>{p.locked ? <Lock size={9} /> : <Unlock size={9} />}</button>{projects.length > 1 && !p.locked && (<button onClick={() => deleteProject(p.id)} style={{ ...btn, padding: 3, borderRadius: 4, color: "#404040", opacity: 0.4 }}><XIcon size={10} /></button>)}</div></div>))}
                </div>
              </div>

              {/* List */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 500, color: "#737373", textTransform: "uppercase", letterSpacing: "0.1em" }}>List</span><span style={{ fontSize: 9, color: "#404040", fontFamily: mf }}>{projectList.length}</span></div>
                <div style={{ minHeight: 24, borderRadius: 6, border: projectList.length === 0 ? "1px dashed #262626" : "none", padding: projectList.length === 0 ? 4 : 0 }} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={(e) => { e.preventDefault(); const src = JSON.parse(e.dataTransfer.getData("application/json") || "{}"); if (!src.id) return; if (src.from === "projects") { if (projects.length <= 1) return; moveProject(src.idx, projectList.length, "projects", "list"); } }}>
                {projectList.length === 0 && <div style={{ fontSize: 9, color: "#333", textAlign: "center", padding: 2 }}>ドラッグで移動</div>}
                {projectList.map((p, idx) => (<div key={p.id} draggable onDragStart={(e) => { setDragProjId(p.id); e.dataTransfer.setData("application/json", JSON.stringify({ id: p.id, from: "list", idx })); e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = JSON.parse(e.dataTransfer.getData("application/json") || "{}"); if (!src.id || src.id === p.id) return; if (src.from === "list") { moveProject(src.idx, idx, "list", "list"); } else if (src.from === "projects") { if (projects.length <= 1) return; moveProject(src.idx, idx, "projects", "list"); } }} onDragEnd={() => setDragProjId(null)} style={{ display: "flex", alignItems: "center", marginBottom: 2, position: "relative", opacity: dragProjId === p.id ? 0.4 : 1 }}><button onClick={() => switchProject(p.id)} style={{ ...btn, width: "100%", gap: 8, padding: "5px 10px", borderRadius: 6, textAlign: "left", fontFamily: ff, fontSize: 12, background: activeProj === p.id ? "#262626" : "transparent", color: activeProj === p.id ? "#f5f5f5" : "#a3a3a3", cursor: "grab" }}><span style={{ fontSize: 13 }}>{p.emoji}</span><EditableName name={p.title} onSave={(n) => renameProject(p.id, n)} style={{ fontSize: 12, flex: 1 }} /></button><div style={{ position: "absolute", right: 4, display: "flex", gap: 1, alignItems: "center" }}><button onClick={() => toggleLock(p.id)} style={{ ...btn, padding: 3, borderRadius: 4, color: p.locked ? "#fbbf24" : "#333" }}>{p.locked ? <Lock size={9} /> : <Unlock size={9} />}</button>{!p.locked && (<button onClick={() => deleteProject(p.id)} style={{ ...btn, padding: 3, borderRadius: 4, color: "#404040", opacity: 0.4 }}><XIcon size={10} /></button>)}</div></div>))}
                </div>
              </div>


              {/* Music Library */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 500, color: "#737373", textTransform: "uppercase", letterSpacing: "0.1em" }}>Music Library</span><button onClick={() => fileInputRef.current?.click()} style={{ ...btn, padding: 2, borderRadius: 4, color: "#737373" }}><Plus size={13} /></button></div>
                {audioLib.length === 0 && <div style={{ padding: "4px 10px", fontSize: 10, color: "#404040" }}>トラックをアップロード</div>}
                {audioLib.map((t) => (<div key={t.id} style={{ display: "flex", alignItems: "center", marginBottom: 2, position: "relative" }}><button onClick={() => loadAndPlay(t, S_AP)} style={{ ...btn, width: "100%", gap: 6, padding: "5px 10px", borderRadius: 6, textAlign: "left", fontFamily: ff, fontSize: 11, background: activeTrackId === t.id ? "rgba(251,191,36,0.08)" : "transparent", color: activeTrackId === t.id ? "#fbbf24" : "#a3a3a3", border: activeTrackId === t.id ? "1px solid rgba(251,191,36,0.15)" : "1px solid transparent" }}>{activeTrackId === t.id && isPlaying ? <Disc size={12} color="#fbbf24" style={{ animation: "spin 2s linear infinite" }} /> : <Headphones size={12} />}<div style={{ flex: 1, minWidth: 0 }}><EditableName name={t.name} onSave={(n) => renameTrk(audioLib, setAudioLib, "audioLib", t.id, n)} style={{ fontSize: 11 }} /><div style={{ fontSize: 9, color: "#525252" }}>{fmtS(t.size)}</div></div></button><div style={{ position: "absolute", right: 4, display: "flex", gap: 1, alignItems: "center" }}><button onClick={() => toggleTrackLock(audioLib, setAudioLib, "audioLib", t.id)} style={{ ...btn, padding: 2, borderRadius: 4, color: t.locked ? "#fbbf24" : "#333" }}>{t.locked ? <Lock size={8} /> : <Unlock size={8} />}</button>{!t.locked && <button onClick={() => removeTrack(t.id, audioLib, setAudioLib, S_AP, "audioLib")} style={{ ...btn, padding: 2, borderRadius: 4, color: "#404040", opacity: 0.3 }}><XIcon size={9} /></button>}</div></div>))}
                {uploadingAudio && <div style={{ padding: "4px 10px", fontSize: 10, color: "#fbbf24", display: "flex", gap: 4 }}><Loader size={10} />アップロード中...</div>}
              </div>

              {/* Recordings */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 500, color: "#737373", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recordings</span><span style={{ fontSize: 9, color: "#404040", fontFamily: mf }}>{recLib.length}</span></div>
                {recLib.length === 0 && <div style={{ padding: "4px 10px", fontSize: 10, color: "#404040" }}>録音データなし</div>}
                {recLib.map((t) => (<div key={t.id} style={{ display: "flex", alignItems: "center", marginBottom: 2, position: "relative" }}><button onClick={() => loadAndPlay(t, S_RC)} style={{ ...btn, width: "100%", gap: 6, padding: "5px 10px", borderRadius: 6, textAlign: "left", fontFamily: ff, fontSize: 11, background: activeTrackId === t.id ? "rgba(239,68,68,0.08)" : "transparent", color: activeTrackId === t.id ? "#f87171" : "#a3a3a3", border: activeTrackId === t.id ? "1px solid rgba(239,68,68,0.15)" : "1px solid transparent" }}>{activeTrackId === t.id && isPlaying ? <Disc size={12} color="#f87171" style={{ animation: "spin 2s linear infinite" }} /> : <MicIcon size={12} />}<div style={{ flex: 1, minWidth: 0 }}><EditableName name={t.name} onSave={(n) => renameTrk(recLib, setRecLib, "recLib", t.id, n)} style={{ fontSize: 11 }} /><div style={{ fontSize: 9, color: "#525252" }}>{fmtS(t.size)}</div></div></button><div style={{ position: "absolute", right: 4, display: "flex", gap: 1, alignItems: "center" }}><button onClick={() => toggleTrackLock(recLib, setRecLib, "recLib", t.id)} style={{ ...btn, padding: 2, borderRadius: 4, color: t.locked ? "#fbbf24" : "#333" }}>{t.locked ? <Lock size={8} /> : <Unlock size={8} />}</button>{!t.locked && <button onClick={() => removeTrack(t.id, recLib, setRecLib, S_RC, "recLib")} style={{ ...btn, padding: 2, borderRadius: 4, color: "#404040", opacity: 0.3 }}><XIcon size={9} /></button>}</div></div>))}
              </div>
            </div>
            <div style={{ padding: 12, borderTop: "1px solid #262626", display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => setShowTrash(true)} style={{ ...btn, width: "100%", gap: 8, padding: "5px 10px", borderRadius: 6, color: "#737373", fontFamily: ff, fontSize: 12 }}><Trash2 size={14} /><span>ゴミ箱</span>{trash.length > 0 && <span style={{ fontSize: 9, background: "#262626", color: "#a3a3a3", padding: "1px 5px", borderRadius: 4, marginLeft: "auto" }}>{trash.length}</span>}</button>
              <button onClick={() => setShowSettings(true)} style={{ ...btn, width: "100%", gap: 8, padding: "5px 10px", borderRadius: 6, color: "#737373", fontFamily: ff, fontSize: 12 }}><Settings size={14} /><span>設定</span></button>
            </div>
          </div>
        )}

        {/* MAIN EDITOR */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <div style={{ padding: "12px 20px 8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#525252" }}><FolderOpen size={12} /><span>Projects / </span><span style={{ color: "#a3a3a3" }}>{curProject?.title}</span></div><div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, color: "#525252", fontFamily: mf }}><span>{sectionCount}sec</span><span>{lineCount}L</span><span>{charCount}C</span></div></div>
          <SectionNav text={curText} />
          <LyricEditor text={curText} setText={setCurText} onContextMenu={onCtx} />
          <div style={{ flexShrink: 0, padding: "6px 20px", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#404040" }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><PenTool size={11} />編集中</span><span style={{ fontFamily: mf, fontSize: 10 }}>UTF-8</span></div>

          {/* Context Menu */}
          {ctxMenu && (<div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 80), zIndex: 999, animation: "ctxFade 0.12s ease-out" }}><div style={{ width: 200, background: "#171717", border: "1px solid #404040", borderRadius: 8, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}><div style={{ padding: "8px 12px", borderBottom: "1px solid #262626" }}><div style={{ fontSize: 10, color: "#737373", marginBottom: 3 }}>選択テキスト</div><div style={{ fontSize: 10, color: "#fcd34d", fontFamily: mf, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>「{selText}」</div></div><div style={{ padding: "4px 0" }}><button onClick={saveSelToScrap} style={{ ...btn, width: "100%", gap: 8, padding: "8px 12px", fontSize: 11, color: "#d4d4d4", fontFamily: ff, textAlign: "left" }}><Bookmark size={11} /><span>スクラップに保存</span></button></div></div></div>)}
        </div>

        {/* RIGHT SIDEBAR */}
        {scrapsOpen && (
          <div style={{ width: 300, flexShrink: 0, borderLeft: "1px solid #262626", background: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Scrap Notes */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={13} color="#fbbf24" /><span style={{ fontSize: 11, fontWeight: 500, color: "#e5e5e5" }}>スクラップノート</span><span style={{ fontSize: 9, color: "#525252", background: "#262626", padding: "1px 5px", borderRadius: 4 }}>{filteredCards.length}</span>
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowTagDrop(!showTagDrop)} style={{ ...btn, gap: 3, padding: "2px 6px", borderRadius: 4, fontSize: 9, color: tagFilter === "all" ? "#737373" : "#fbbf24", background: tagFilter === "all" ? "transparent" : "rgba(251,191,36,0.08)", border: tagFilter === "all" ? "1px solid #333" : "1px solid rgba(251,191,36,0.2)" }}><Tag size={8} />{tagFilter === "all" ? "タグ" : tagFilter}<ChevronDown size={8} /></button>
                    {showTagDrop && (<div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#171717", border: "1px solid #404040", borderRadius: 6, overflow: "hidden", boxShadow: "0 12px 24px rgba(0,0,0,0.4)", zIndex: 50, minWidth: 120, maxHeight: 200, overflowY: "auto" }}>
                      <button onClick={() => { setTagFilter("all"); setShowTagDrop(false); }} style={{ ...btn, width: "100%", padding: "6px 10px", fontSize: 10, color: tagFilter === "all" ? "#fbbf24" : "#a3a3a3", fontFamily: ff, textAlign: "left", background: tagFilter === "all" ? "rgba(251,191,36,0.08)" : "transparent" }}>すべて</button>
                      {allTags.map((t) => (<button key={t} onClick={() => { setTagFilter(t); setShowTagDrop(false); }} style={{ ...btn, width: "100%", padding: "6px 10px", fontSize: 10, color: tagFilter === t ? "#fbbf24" : "#a3a3a3", fontFamily: ff, textAlign: "left", background: tagFilter === t ? "rgba(251,191,36,0.08)" : "transparent" }}>{t}</button>))}
                    </div>)}
                  </div>
                </div>
                <button onClick={() => setShowScrapInput(!showScrapInput)} style={{ ...btn, padding: 3, borderRadius: 4, color: showScrapInput ? "#fbbf24" : "#a3a3a3" }}><Plus size={13} /></button>
              </div>
              {showScrapInput && (<div style={{ padding: 10, borderBottom: "1px solid #262626", flexShrink: 0 }}><textarea value={scrapInputText} onChange={(e) => setScrapInputText(e.target.value)} placeholder="アイデア、フレーズ、メモ..." rows={2} autoFocus style={{ width: "100%", background: "#171717", border: "1px solid #333", borderRadius: 5, padding: "6px 8px", fontSize: 11, color: "#e5e5e5", outline: "none", fontFamily: ff, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box", marginBottom: 6 }} /><input value={scrapInputTags} onChange={(e) => setScrapInputTags(e.target.value)} placeholder="タグ（カンマ区切り）" style={{ width: "100%", background: "#171717", border: "1px solid #333", borderRadius: 5, padding: "5px 8px", fontSize: 10, color: "#e5e5e5", outline: "none", fontFamily: ff, boxSizing: "border-box", marginBottom: 6 }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addManualCard(); } }} /><div style={{ display: "flex", gap: 4 }}><button onClick={addManualCard} style={{ flex: 1, padding: "5px 0", borderRadius: 4, border: "none", background: "#fbbf24", color: "#171717", fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: ff }}>追加</button><button onClick={() => { setShowScrapInput(false); setScrapInputText(""); setScrapInputTags(""); }} style={{ flex: 1, padding: "5px 0", borderRadius: 4, border: "1px solid #333", background: "transparent", color: "#a3a3a3", fontSize: 10, cursor: "pointer", fontFamily: ff }}>取消</button></div></div>)}
              <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredCards.length === 0 && <div style={{ textAlign: "center", padding: "20px 12px", color: "#404040", fontSize: 11 }}>＋ボタンで手動追加<br />テキスト選択→右クリック→スクラップ保存</div>}
                {filteredCards.map((c) => (<ScrapCard key={c.id} card={c} onDelete={() => deleteCard(c.id)} />))}
              </div>
            </div>
            <div style={{ height: 1, background: "#262626", flexShrink: 0 }} />
            {/* Memo */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}><FileText size={13} color="#4ade80" /><span style={{ fontSize: 11, fontWeight: 500, color: "#e5e5e5" }}>メモ</span></div>
              <div style={{ flex: 1, overflow: "hidden" }}><textarea value={curMemo} onChange={(e) => setCurMemo(e.target.value)} placeholder="自由にメモ..." spellCheck={false} style={{ width: "100%", height: "100%", background: "transparent", color: "#d4d4d4", border: "none", outline: "none", resize: "none", padding: "10px 14px", fontSize: 12, lineHeight: 1.7, fontFamily: ff, boxSizing: "border-box" }} /></div>
            </div>
          </div>
        )}
      </div>

      {/* AUDIO PLAYER */}
      <div style={{ flexShrink: 0, borderTop: "1px solid #262626", background: "rgba(23,23,23,0.9)", backdropFilter: "blur(12px)", zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: 200, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 6, background: hasSrc ? "#1c1917" : "#262626", border: hasSrc ? "1px solid rgba(251,191,36,0.25)" : "1px solid #404040", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{hasSrc && isPlaying ? <Disc size={15} color="#fbbf24" style={{ animation: "spin 2s linear infinite" }} /> : <MusicIcon size={15} color={hasSrc ? "#fbbf24" : "#737373"} />}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 500, color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trackName || "トラック未選択"}</div><div style={{ fontSize: 10, color: "#737373" }}>{hasSrc ? fmtT(curTime) + " / " + fmtT(dur) : ""}</div></div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isRecording ? <button onClick={stopRecording} style={{ ...btn, padding: 4, color: "#ef4444" }}><StopCircle size={16} color="#ef4444" fill="#ef4444" /></button> : <button onClick={startRecording} style={{ ...btn, padding: 4, color: "#737373" }} title="録音（マイク＋トラック）"><MicIcon size={14} /></button>}
              {isRecording && <span style={{ fontSize: 9, color: "#ef4444", fontFamily: mf, animation: "pulse 1s infinite" }}>REC</span>}
              <button onClick={() => { if (audioElRef.current) audioElRef.current.currentTime = Math.max(0, audioElRef.current.currentTime - 5); }} style={{ ...btn, padding: 4, color: hasSrc ? "#a3a3a3" : "#404040" }}><SkipBack size={14} /></button>
              <button onClick={togglePlay} style={{ ...btn, width: 30, height: 30, borderRadius: "50%", background: hasSrc ? "#f5f5f5" : "#404040" }}>{isPlaying ? <PauseI size={13} color="#171717" fill="#171717" /> : <Play size={13} color={hasSrc ? "#171717" : "#737373"} fill={hasSrc ? "#171717" : "#737373"} style={{ marginLeft: 1 }} />}</button>
              <button onClick={() => { if (audioElRef.current) audioElRef.current.currentTime = Math.min(dur, audioElRef.current.currentTime + 5); }} style={{ ...btn, padding: 4, color: hasSrc ? "#a3a3a3" : "#404040" }}><SkipForward size={14} /></button>
              <button onClick={() => setRepeatOn(!repeatOn)} style={{ ...btn, padding: 4, color: repeatOn ? "#fbbf24" : "#737373" }}><RepeatIcon size={12} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", maxWidth: 480 }}>
              <span style={{ width: 30, textAlign: "right", fontFamily: mf, fontSize: 9, color: "#737373" }}>{fmtT(curTime)}</span>
              <div style={{ flex: 1, position: "relative", height: 14, display: "flex", alignItems: "center" }}><div style={{ width: "100%", height: 3, borderRadius: 999, background: "#404040", position: "relative" }}><div style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 999, background: "#fbbf24", width: seekPos + "%" }} /></div><input type="range" min={0} max={100} value={seekPos} onChange={(e) => handleSeek(Number(e.target.value))} style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer" }} /></div>
              <span style={{ width: 30, fontFamily: mf, fontSize: 9, color: "#737373" }}>{fmtT(dur)}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, width: 180, flexShrink: 0, justifyContent: "flex-end" }}>
            <button onClick={() => setIsMuted(!isMuted)} style={{ ...btn, padding: 5, color: "#a3a3a3" }}>{isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
            <div style={{ width: 64, height: 12, borderRadius: 999, position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }} onMouseDown={(e) => { const bar = e.currentTarget; const calc = (ev) => { const r = bar.getBoundingClientRect(); handleVol(Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100))); }; calc(e); const move = (ev) => calc(ev); const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); }; window.addEventListener("mousemove", move); window.addEventListener("mouseup", up); }}><div style={{ width: "100%", height: 3, borderRadius: 999, background: "#404040", position: "relative" }}><div style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 999, background: "#a3a3a3", width: isMuted ? "0%" : (volume * 100) + "%" }} /></div></div>
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btn, padding: 5, borderRadius: 6, color: "#737373" }}><Upload size={13} /></button>
          </div>
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {modal && (<div onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}><div onClick={(e) => e.stopPropagation()} style={{ background: "#171717", border: "1px solid #404040", borderRadius: 12, width: "100%", maxWidth: 420, margin: "0 16px", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #262626" }}><span style={{ fontSize: 13, fontWeight: 500, color: "#f5f5f5" }}>オーディオソース</span><button onClick={() => setModal(false)} style={{ ...btn, padding: 4, borderRadius: 6, color: "#a3a3a3" }}><XIcon size={15} /></button></div><div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}><div onClick={() => fileInputRef.current?.click()} style={{ border: "2px dashed #404040", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}><Upload size={18} color="#737373" /><span style={{ fontSize: 11, color: "#a3a3a3" }}>MP3, WAV, FLAC を選択</span></div>{audioLib.length > 0 && <div><div style={{ fontSize: 11, color: "#a3a3a3", marginBottom: 6 }}>ライブラリから選択</div><div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>{audioLib.map((t) => (<button key={t.id} onClick={() => { loadAndPlay(t, S_AP); setModal(false); }} style={{ ...btn, width: "100%", gap: 6, padding: "7px 8px", borderRadius: 6, textAlign: "left", fontFamily: ff, fontSize: 11, background: activeTrackId === t.id ? "rgba(251,191,36,0.08)" : "#0a0a0a", color: activeTrackId === t.id ? "#fbbf24" : "#d4d4d4", border: "1px solid #262626" }}><Headphones size={12} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span></button>))}</div></div>}</div></div></div>)}

      {/* SETTINGS MODAL */}
      {showSettings && (<div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}><div onClick={(e) => e.stopPropagation()} style={{ background: "#171717", border: "1px solid #404040", borderRadius: 12, width: "100%", maxWidth: 440, maxHeight: "80vh", margin: "0 16px", boxShadow: "0 24px 48px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #262626", flexShrink: 0 }}><span style={{ fontSize: 13, fontWeight: 500, color: "#f5f5f5" }}>設定</span><button onClick={() => setShowSettings(false)} style={{ ...btn, padding: 4, borderRadius: 6, color: "#a3a3a3" }}><XIcon size={15} /></button></div><div style={{ padding: 18, overflowY: "auto" }}>
        <AuthUI user={user} onLogin={login} onRegister={register} onLogout={logout} syncStatus={syncStatus} hasSupabase={hasSupabase} />
        <div style={{ borderTop: "1px solid #262626", paddingTop: 16, marginTop: 16 }}><div style={{ fontSize: 12, color: "#e5e5e5", marginBottom: 4 }}>データ管理</div><div style={{ fontSize: 11, color: "#737373", marginBottom: 12 }}>すべてのデータを初期状態にリセット（取消不可）</div><button onClick={() => setConfirmReset(true)} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: ff }}>リセット</button><div style={{ borderTop: "1px solid #262626", paddingTop: 14, marginTop: 14 }}><div style={{ fontSize: 11, color: "#737373" }}>プロジェクト: {projects.length} / スクラップ: {cards.length} / 音楽: {audioLib.length} / 録音: {recLib.length}</div></div></div>
      </div></div></div>)}

      {/* CONFIRM RESET */}
      {confirmReset && (<div onClick={() => setConfirmReset(false)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}><div onClick={(e) => e.stopPropagation()} style={{ background: "#171717", border: "1px solid #404040", borderRadius: 12, padding: 24, width: "100%", maxWidth: 340, margin: "0 16px", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#e5e5e5", marginBottom: 8 }}>本当にリセットしますか？</div>
        <div style={{ fontSize: 12, color: "#737373", marginBottom: 20, lineHeight: 1.5 }}>すべてのプロジェクト・歌詞・スクラップ・メモ・音楽・録音データが完全に削除されます。この操作は取り消せません。</div>
        <div style={{ display: "flex", gap: 8 }}><button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#a3a3a3", fontSize: 13, cursor: "pointer", fontFamily: ff }}>キャンセル</button><button onClick={() => { setConfirmReset(false); resetAll(); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>リセット</button></div>
      </div></div>)}

      {/* TRASH MODAL */}
      {showTrash && (<div onClick={() => setShowTrash(false)} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}><div onClick={(e) => e.stopPropagation()} style={{ background: "#171717", border: "1px solid #404040", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "80vh", margin: "0 16px", boxShadow: "0 24px 48px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #262626", flexShrink: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Trash2 size={15} color="#737373" /><span style={{ fontSize: 13, fontWeight: 500, color: "#f5f5f5" }}>ゴミ箱</span><span style={{ fontSize: 10, color: "#525252" }}>{trash.length}件</span></div><button onClick={() => setShowTrash(false)} style={{ ...btn, padding: 4, borderRadius: 6, color: "#a3a3a3" }}><XIcon size={15} /></button></div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {trash.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#404040", fontSize: 12 }}>ゴミ箱は空です</div>}
          {trash.map(item => (<div key={item.id} style={{ background: "#0a0a0a", border: "1px solid #262626", borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: item.type === "project" ? "rgba(59,130,246,0.1)" : item.type === "audio" ? "rgba(251,191,36,0.1)" : "rgba(239,68,68,0.1)", color: item.type === "project" ? "#3b82f6" : item.type === "audio" ? "#fbbf24" : "#f87171", border: "1px solid " + (item.type === "project" ? "rgba(59,130,246,0.2)" : item.type === "audio" ? "rgba(251,191,36,0.2)" : "rgba(239,68,68,0.2)") }}>{item.type === "project" ? "プロジェクト" : item.type === "audio" ? "音楽" : "録音"}</span>
                <span style={{ fontSize: 12, color: "#e5e5e5" }}>{item.type === "project" ? item.data.project?.title : item.data.track?.name}</span>
              </div>
              <span style={{ fontSize: 9, color: "#525252", fontFamily: mf }}>残り{daysLeft(item.deletedAt)}日</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => restoreFromTrash(item.id)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", color: "#4ade80", fontSize: 10, cursor: "pointer", fontFamily: ff }}>復元</button>
              <button onClick={() => permanentDelete(item.id)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 10, cursor: "pointer", fontFamily: ff }}>完全に削除</button>
            </div>
          </div>))}
        </div>
        {trash.length > 0 && <div style={{ padding: "10px 14px", borderTop: "1px solid #262626", flexShrink: 0 }}><button onClick={emptyTrash} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: ff }}>ゴミ箱を空にする</button></div>}
      </div></div>)}
    </div>
  );
}
