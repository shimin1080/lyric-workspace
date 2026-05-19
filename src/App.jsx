import { Fragment, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { loadData as _loadData, saveData as _saveData, deleteData, saveAudio, loadAudio, deleteAudio, clearAllAudio } from "./storage.js";
import { useAuth, AuthUI, AuthGate } from "./Auth.jsx";
import { syncAudioOnLogin } from "./sync.js";
import { getNativeRecordingStatus, isNativeRecordingAvailable, listNativeInputDevices, startNativeRecording, stopNativeRecording } from "./nativeRecording.js";
import { NativeUpdaterPanel, NativeUpdaterToast } from "./updater.jsx";

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
const CopyIcon=(p)=><I {...p} d={<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>}/>;
const Loader=({size=14,color="#4af0a0"})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={{flexShrink:0,animation:"spin 1s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>);
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
const syncStamp = (data) => ({ ...data, __updatedAt: Date.now() });
const syncTime = (data) => Number(data?.__updatedAt || 0);
const syncedTime = (data) => Number(data?.__lastSyncedAt || 0);
const markSynced = (data) => ({ ...data, __lastSyncedAt: syncTime(data) || Date.now() });
const remoteTime = (data, updatedAt) => syncTime(data) || (updatedAt ? Date.parse(updatedAt) : 0) || 0;

/* ── Helpers ───────────────────────────────── */
const SEC_C = { Verse: "#4af0a0", Hook: "#e8a840", Chorus: "#e8a840", Bridge: "#7ab8c8", Outro: "#c88868", Intro: "#98b870" };
function getSecColor(l) { const m = l.match(/^\[(.+?)\]/); if (!m) return null; for (const k of Object.keys(SEC_C)) { if (m[1].toLowerCase().startsWith(k.toLowerCase())) return SEC_C[k]; } return "#7a7e8e"; }
function getSecLabel(l) { const m = l.match(/^\[(.+?)\]/); return m ? m[1] : null; }
function buildSecMap(ls) { const m = new Array(ls.length).fill(null); let c = null; for (let i = 0; i < ls.length; i++) { const cc = getSecColor(ls[i]); if (cc) c = cc; if (ls[i].trim() === "" && (i + 1 >= ls.length || getSecColor(ls[i + 1] || ""))) c = null; m[i] = c; } return m; }
const fmtT = (s) => { if (!s || isNaN(s) || !isFinite(s)) return "0:00"; return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); };
const fmtS = (b) => b < 1048576 ? (b / 1024).toFixed(1) + "KB" : (b / 1048576).toFixed(1) + "MB";
const ts = () => { const n = new Date(); return n.getHours() + ":" + String(n.getMinutes()).padStart(2, "0"); };
const norm = (v) => String(v || "").toLowerCase();
const moveInArray = (arr, fromIdx, toIdx) => {
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return arr;
  const next = [...arr];
  const [item] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, item);
  return next;
};
const setDragPayload = (e, payload) => {
  const text = JSON.stringify(payload);
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("application/json", text);
  e.dataTransfer.setData("text/plain", text);
};
const getDragPayload = (e) => {
  const text = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain") || "{}";
  try { return JSON.parse(text); } catch (err) { return {}; }
};

function dataUrlToArrayBuffer(dataUrl) {
  const b64 = String(dataUrl || "").split(",")[1] || "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function bytesToBase64(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

function audioBufferToStereoWavDataUrl(buffer) {
  const channels = 2;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytes = 44 + frames * channels * 2;
  const ab = new ArrayBuffer(bytes);
  const view = new DataView(ab);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, frames * channels * 2, true);

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(buffer.numberOfChannels > 1 ? 1 : 0);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, left[i] || 0));
    const r = Math.max(-1, Math.min(1, right[i] || 0));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    view.setInt16(offset + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 4;
  }
  return { dataUrl: "data:audio/wav;base64," + bytesToBase64(new Uint8Array(ab)), size: bytes };
}

function makeCenteredStereoBuffer(ctx, buffer) {
  const out = ctx.createBuffer(2, buffer.length, buffer.sampleRate);
  const left = out.getChannelData(0);
  const right = out.getChannelData(1);
  const inputs = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) inputs.push(buffer.getChannelData(ch));
  for (let i = 0; i < buffer.length; i++) {
    let mono = 0;
    let maxAbs = 0;
    for (const input of inputs) {
      const value = input[i] || 0;
      const abs = Math.abs(value);
      if (abs > maxAbs) {
        maxAbs = abs;
        mono = value;
      }
    }
    left[i] = mono;
    right[i] = mono;
  }
  return out;
}

async function centerRecordingToStereo(micDataUrl) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("Web Audio is not available");
  const decodeCtx = new AudioCtx({ sampleRate: 48000 });
  const micBuffer = await decodeCtx.decodeAudioData(dataUrlToArrayBuffer(micDataUrl));
  const centered = makeCenteredStereoBuffer(decodeCtx, micBuffer);
  try { await decodeCtx.close(); } catch (err) {}
  return audioBufferToStereoWavDataUrl(centered);
}

async function mixRecordingWithTrack({ micDataUrl, trackDataUrl, trackStartTime, trackGain, loopTrack }) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AudioCtx || !OfflineCtx) throw new Error("Web Audio is not available");

  const decodeCtx = new AudioCtx({ sampleRate: 48000 });
  const [micBuffer, trackBuffer] = await Promise.all([
    decodeCtx.decodeAudioData(dataUrlToArrayBuffer(micDataUrl)),
    decodeCtx.decodeAudioData(dataUrlToArrayBuffer(trackDataUrl)),
  ]);
  try { await decodeCtx.close(); } catch (err) {}

  const sampleRate = micBuffer.sampleRate || 48000;
  const frames = Math.max(1, Math.ceil(micBuffer.duration * sampleRate));
  const ctx = new OfflineCtx(2, frames, sampleRate);
  const centeredMicBuffer = makeCenteredStereoBuffer(ctx, micBuffer);

  const mic = ctx.createBufferSource();
  mic.buffer = centeredMicBuffer;
  mic.connect(ctx.destination);
  mic.start(0);

  if (trackBuffer.duration > 0 && trackGain > 0) {
    const gain = ctx.createGain();
    gain.gain.value = trackGain;
    gain.connect(ctx.destination);

    let cursor = 0;
    let offset = Math.max(0, trackStartTime || 0);
    if (loopTrack) offset = offset % trackBuffer.duration;
    while (cursor < micBuffer.duration) {
      if (offset >= trackBuffer.duration) break;
      const span = Math.min(trackBuffer.duration - offset, micBuffer.duration - cursor);
      if (span <= 0) break;
      const src = ctx.createBufferSource();
      src.buffer = trackBuffer;
      src.connect(gain);
      src.start(cursor, offset, span);
      cursor += span;
      offset = 0;
      if (!loopTrack) break;
    }
  }

  const rendered = await ctx.startRendering();
  return audioBufferToStereoWavDataUrl(rendered);
}

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
const ff = "'Courier New', 'JetBrains Mono', ui-monospace, Menlo, monospace";
const mf = ff;

/* ── Sub-components ────────────────────────── */
function LyricEditor({ text, setText, onContextMenu }) {
  const ta = useRef(null), gut = useRef(null);
  const [cl, setCl] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [caret, setCaret] = useState({ top: 16, left: 8 });
  const ls = text.split("\n"), sm = buildSecMap(ls), LH = 28, caretH = LH;
  let sectionLine = 0;
  const updateCaret = () => {
    if (!ta.current) return;
    const el = ta.current;
    const pos = el.selectionStart;
    const before = text.substring(0, pos);
    const lines = before.split("\n");
    const line = lines.length - 1;
    const col = lines.at(-1)?.length || 0;
    setCl(line);
    setCaret({ top: 16 + line * LH - el.scrollTop, left: 8 + col * 8.45 - el.scrollLeft });
  };
  const sync = () => { if (ta.current && gut.current) gut.current.scrollTop = ta.current.scrollTop; updateCaret(); };
  const uc = () => { updateCaret(); };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); const d = e.dataTransfer.getData("text/plain"); if (!d || !ta.current) return; const el = ta.current; const pos = el.selectionStart; const before = text.substring(0, pos); const after = text.substring(pos); const ins = (before.length > 0 && !before.endsWith("\n") ? "\n" : "") + d + "\n"; setText(before + ins + after); setTimeout(() => { el.selectionStart = el.selectionEnd = pos + ins.length; el.focus(); }, 0); };
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div ref={gut} style={{ flexShrink: 0, overflowY: "hidden", paddingTop: 16, paddingBottom: 16, userSelect: "none", display: "flex" }}>
        <div style={{ width: 3, flexShrink: 0 }}>{ls.map((l, i) => (<div key={i} style={{ height: LH, background: sm[i] || "transparent", opacity: getSecLabel(l) ? 1 : 0.4 }} />))}</div>
        <div style={{ width: 40 }}>{ls.map((l, i) => { const label = getSecLabel(l), iS = !!label, iA = i === cl, sc = getSecColor(l); if (iS) { sectionLine = 0; return (<div key={i} style={{ height: LH, lineHeight: LH + "px", fontSize: 9, fontFamily: mf, textAlign: "right", paddingRight: 10, color: sc, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>); } sectionLine += 1; return (<div key={i} style={{ height: LH, lineHeight: LH + "px", fontSize: 11, fontFamily: mf, textAlign: "right", paddingRight: 10, color: iA ? "#7a7e8e" : "#3a3a4a", fontWeight: 400 }}>{sectionLine}</div>); })}</div>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        {dragOver && <div className="lw-drop-caret" style={{ position: "absolute", left: Math.max(8, caret.left), top: Math.max(16, caret.top), width: 3, height: caretH, borderRadius: 999, background: "#4af0a0", zIndex: 3, pointerEvents: "none" }} />}
        <textarea ref={ta} value={text} onChange={(e) => { setText(e.target.value); setTimeout(uc, 0); }} onScroll={sync} onClick={uc} onKeyUp={uc} onSelect={uc} onContextMenu={onContextMenu} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(true); updateCaret(); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} spellCheck={false} wrap="off" style={{ width: "100%", height: "100%", fontFamily: ff, fontSize: 14, lineHeight: LH + "px", letterSpacing: "0.02em", caretColor: dragOver ? "transparent" : "#4af0a0", background: "transparent", color: "#c8ccd8", border: "none", outline: "none", resize: "none", padding: "16px 16px 16px 8px", overflow: "auto", whiteSpace: "pre" }} />
      </div>
    </div>
  );
}

function SectionNav({ text }) {
  const s = [];
  text.split("\n").forEach((l) => { const lb = getSecLabel(l); if (lb) s.push({ label: lb, color: getSecColor(l) }); });
  if (!s.length) return null;
  return (<div style={{ padding: "8px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0, alignItems: "center" }}><span style={{ fontSize: 10, color: "#4a4e5e", marginRight: 4 }}>SECTIONS</span>{s.map((x, i) => (<span key={i} style={{ fontSize: 10, fontFamily: mf, fontWeight: 500, color: x.color, background: x.color + "14", border: "1px solid " + x.color + "40", borderRadius: 2, padding: "2px 8px" }}>{x.label}</span>))}</div>);
}

function ScrapCard({ card, onDelete }) {
  const [h, setH] = useState(false);
  const copyText = (e) => {
    e.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(card.text).catch(() => {});
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = card.text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  };
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", card.text); e.dataTransfer.effectAllowed = "copy"; }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ background: "#111116", border: h ? "1px solid #4a4e5e" : "1px solid #2a2a35", borderRadius: 2, padding: 10, cursor: "grab", transition: "border-color 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "#4a4e5e" }}>{card.time}</span>
        <div onMouseDown={(e) => e.stopPropagation()} style={{ display: "flex", gap: 2, opacity: h ? 1 : 0, transition: "opacity 0.15s" }}>
          <button onClick={copyText} title="コピー" style={{ padding: 3, background: "none", border: "none", cursor: "pointer", borderRadius: 2, color: "#7a7e8e" }}><CopyIcon size={10} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="削除" style={{ padding: 3, background: "none", border: "none", cursor: "pointer", borderRadius: 2, color: "#4a4e5e" }}><Trash2 size={10} /></button>
        </div>
      </div>
      <p style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-line", color: "#c8ccd8", margin: "0 0 8px 0" }}>{card.text}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {card.tags.map((t) => (<span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, padding: "1px 6px", borderRadius: 999, background: "#2a2a35", color: "#7a7e8e", border: "1px solid rgba(82,82,82,0.5)" }}><Tag size={8} />{t}</span>))}
      </div>
    </div>
  );
}

function EditableName({ name, onSave, style: { fontSize: fs = 11, ...rest } = {} }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(name);
  if (editing) return <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { onSave(v.trim() || name); setEditing(false); }} onKeyDown={(e) => { if (e.key === "Enter") { onSave(v.trim() || name); setEditing(false); } if (e.key === "Escape") setEditing(false); }} style={{ background: "#0a0a0a", border: "1px solid #4af0a040", borderRadius: 3, padding: "1px 4px", fontSize: fs, color: "#c8ccd8", outline: "none", fontFamily: ff, width: "100%", boxSizing: "border-box", ...rest }} />;
  return <span onDoubleClick={() => { setV(name); setEditing(true); }} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "default", fontSize: fs, ...rest }} title="ダブルクリックで名前変更">{name}</span>;
}

/* ══════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════ */
export default function LyricWorkspace() {
  // State refs for remote sync callback
  const remoteRef = useRef(null);
  const audioSyncRef = useRef(null);
  const { user, authLoading, syncStatus, login, logout, push, pushNow, pushAudio, removeAudio, hasSupabase } = useAuth(
    useCallback((data) => { if (remoteRef.current) remoteRef.current(data); }, []),
    useCallback(async (userId, aLib, rLib) => { if (audioSyncRef.current) await audioSyncRef.current(userId, aLib, rLib); }, [])
  );
  const [loading, setLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
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
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [projectFolders, setProjectFolders] = useState([]);
  const [dragProjId, setDragProjId] = useState(null);
  const [dragTrackId, setDragTrackId] = useState(null);
  const [sidebarDragUi, setSidebarDragUi] = useState(null);
  const [folderFlyout, setFolderFlyout] = useState(null);
  const [showScrapInput, setShowScrapInput] = useState(false);
  const [scrapInputText, setScrapInputText] = useState("");
  const [scrapInputTags, setScrapInputTags] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [showTagDrop, setShowTagDrop] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [nativeRecAvailable, setNativeRecAvailable] = useState(false);
  const [inputDevices, setInputDevices] = useState([]);
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState("");
  const [inputLevel, setInputLevel] = useState(0);
  const [inputError, setInputError] = useState("");

  const saveTimerRef = useRef(null);
  const stateRef = useRef({});
  const localUpdatedAtRef = useRef(0);
  const localLastSyncedAtRef = useRef(0);
  const audioElRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCacheRef = useRef({});
  const mediaRecRef = useRef(null);
  const recChunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const destRef = useRef(null);
  const recordingModeRef = useRef("web");
  const recordingTrackRef = useRef(null);
  const sidebarPointerDragRef = useRef(null);
  const pulledUserRef = useRef(null);

  // Always keep stateRef up to date for async push
  stateRef.current = { projects, lyrics, cards, activeProj, audioLib, recLib, memo, trash, projectList, projectFolders, __updatedAt: localUpdatedAtRef.current, __lastSyncedAt: localLastSyncedAtRef.current };

  const btn = { background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" };

  // Remote sync callback
  useEffect(() => {
    remoteRef.current = async (data) => {
      const incomingTime = syncTime(data);
      const hasUnsyncedLocal = localUpdatedAtRef.current > localLastSyncedAtRef.current;
      if (hasUnsyncedLocal) return;
      if (incomingTime && localUpdatedAtRef.current && incomingTime < localUpdatedAtRef.current) return;
      if (data.projects) setProjects(data.projects);
      if (data.lyrics) setLyrics(data.lyrics);
      if (data.cards) setCards(data.cards);
      if (data.activeProj) setActiveProj(data.activeProj);
      if (data.memo) setMemo(data.memo);
      if (data.trash) setTrash(data.trash);
      if (data.projectList) setProjectList(data.projectList);
      if (data.projectFolders) setProjectFolders(data.projectFolders);
      if (data.audioLib) setAudioLib(data.audioLib);
      if (data.recLib) setRecLib(data.recLib);
      // Update stateRef + persist to localStorage immediately
      const merged = { ...stateRef.current, ...data };
      localUpdatedAtRef.current = syncTime(merged) || Date.now();
      localLastSyncedAtRef.current = localUpdatedAtRef.current;
      merged.__updatedAt = localUpdatedAtRef.current;
      merged.__lastSyncedAt = localLastSyncedAtRef.current;
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

  const refreshInputDevices = useCallback(async () => {
    if (!(await isNativeRecordingAvailable())) return;
    try {
      setNativeRecAvailable(true);
      const devices = await listNativeInputDevices();
      setInputDevices(devices);
      setInputError(devices.length ? "" : "入力デバイスが見つかりません");
      if (selectedInputDeviceId === "" && devices.length) {
        const preferred = devices.find((d) => d.is_default) || devices[0];
        setSelectedInputDeviceId(String(preferred.id));
      }
    } catch (e) {
      setInputError(e.message || String(e));
    }
  }, [selectedInputDeviceId]);

  useEffect(() => { refreshInputDevices(); }, [refreshInputDevices]);

  useEffect(() => {
    if (!isRecording || recordingModeRef.current !== "native") return;
    const timer = setInterval(async () => {
      try {
        const status = await getNativeRecordingStatus();
        setInputLevel(status.level || 0);
      } catch (e) {}
    }, 120);
    return () => clearInterval(timer);
  }, [isRecording]);

  // Load
  useEffect(() => { (async () => { try { const p = await _loadData(S_KEY); if (p) { localUpdatedAtRef.current = syncTime(p); localLastSyncedAtRef.current = syncedTime(p) || localUpdatedAtRef.current; if (p.projects) setProjects(p.projects); if (p.lyrics) setLyrics(p.lyrics); if (p.cards) setCards(p.cards); if (p.activeProj) setActiveProj(p.activeProj); if (p.audioLib) setAudioLib(p.audioLib); if (p.recLib) setRecLib(p.recLib); if (p.memo) setMemo(p.memo); if (p.trash) { const now = Date.now(); const alive = p.trash.filter(t => now - t.deletedAt < 30*24*60*60*1000); setTrash(alive); } if (p.projectList) setProjectList(p.projectList); if (p.projectFolders) setProjectFolders(p.projectFolders); } } catch (e) { console.error("Load:", e); } setLoading(false); })(); }, []);

  useEffect(() => {
    pulledUserRef.current = null;
    setCloudLoading(!!user);
  }, [user?.id]);

  // Auto-pull from cloud whenever a logged-in account becomes active
  useEffect(() => {
    if (loading || authLoading || !user || pulledUserRef.current === user.id) return;
    pulledUserRef.current = user.id;
    setCloudLoading(true);
    (async () => {
      try {
        const { pullFromCloud, syncAudioOnLogin: sAOL } = await import("./sync.js");
        const result = await pullFromCloud(user.id);
        if (result.data) {
          const d = result.data;
          const cloudTime = remoteTime(d, result.updatedAt);
          const hasUnsyncedLocal = localUpdatedAtRef.current > localLastSyncedAtRef.current;
          if (hasUnsyncedLocal && localUpdatedAtRef.current > cloudTime) {
            const pushResult = await pushNow(stateRef.current);
            if (pushResult?.ok) {
              const synced = markSynced(stateRef.current);
              localLastSyncedAtRef.current = synced.__lastSyncedAt;
              stateRef.current = synced;
              await _saveData(S_KEY, synced);
            }
            return;
          }
          localUpdatedAtRef.current = cloudTime || Date.now();
          localLastSyncedAtRef.current = localUpdatedAtRef.current;
          if (d.projects) setProjects(d.projects);
          if (d.lyrics) setLyrics(d.lyrics);
          if (d.cards) setCards(d.cards);
          if (d.activeProj) setActiveProj(d.activeProj);
          if (d.memo) setMemo(d.memo);
          if (d.trash) { const now = Date.now(); setTrash(d.trash.filter(t => now - t.deletedAt < 30*24*60*60*1000)); }
          if (d.projectList) setProjectList(d.projectList);
          if (d.projectFolders) setProjectFolders(d.projectFolders);
          if (d.audioLib) setAudioLib(d.audioLib);
          if (d.recLib) setRecLib(d.recLib);
          await sAOL(user.id, d.audioLib || [], d.recLib || [], loadAudio, saveAudio, S_AP, S_RC, audioCacheRef);
          const synced = markSynced({ ...stateRef.current, ...d, __updatedAt: localUpdatedAtRef.current });
          stateRef.current = synced;
          await _saveData(S_KEY, synced);
        } else if (localUpdatedAtRef.current > localLastSyncedAtRef.current) {
          const pushResult = await pushNow(stateRef.current);
          if (pushResult?.ok) {
            const synced = markSynced(stateRef.current);
            localLastSyncedAtRef.current = synced.__lastSyncedAt;
            stateRef.current = synced;
            await _saveData(S_KEY, synced);
          }
        }
      } catch (e) { console.error("Auto-pull error:", e); }
      finally { setCloudLoading(false); }
    })();
  }, [user, loading, authLoading, pushNow]);

  // Save
  const doSave = useCallback((o = {}) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      // Read latest state from ref, merge with overrides
      const s = stateRef.current;
      const d = syncStamp({ projects: o.projects || s.projects, lyrics: o.lyrics || s.lyrics, cards: o.cards || s.cards, activeProj: o.activeProj || s.activeProj, audioLib: o.audioLib || s.audioLib, recLib: o.recLib || s.recLib, memo: o.memo || s.memo, trash: o.trash || s.trash, projectList: o.projectList || s.projectList, projectFolders: o.projectFolders || s.projectFolders });
      d.__lastSyncedAt = localLastSyncedAtRef.current;
      localUpdatedAtRef.current = d.__updatedAt;
      await _saveData(S_KEY, d);
      if (user) {
        const pushResult = await push(d);
        if (pushResult?.ok) {
          const synced = markSynced(d);
          localLastSyncedAtRef.current = synced.__lastSyncedAt;
          await _saveData(S_KEY, synced);
        }
      }
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
  const allProjects = [...projects, ...projectList.filter((p) => !projects.some((x) => x.id === p.id))];
  const folderProjectIds = new Set(projectFolders.flatMap((f) => f.projectIds || []));
  const q = norm(searchQuery.trim());
  const projectMatchesSearch = (p) => !q || norm(p.title).includes(q) || norm(lyrics[p.id]).includes(q) || norm(memo[p.id]).includes(q);
  const visibleRootProjects = allProjects.filter((p) => !folderProjectIds.has(p.id) && projectMatchesSearch(p));
  const visibleAudioLib = audioLib.filter((t) => !q || norm(t.name).includes(q));
  const visibleRecLib = recLib.filter((t) => !q || norm(t.name).includes(q));
  const filteredFolders = projectFolders.map((f) => {
    const items = (f.projectIds || []).map((id) => allProjects.find((p) => p.id === id)).filter(Boolean);
    const visibleItems = items.filter(projectMatchesSearch);
    return { ...f, items: visibleItems, isVisible: !q || norm(f.title).includes(q) || visibleItems.length > 0 };
  }).filter((f) => f.isVisible);

  // Project CRUD
  const switchProject = (id) => { setActiveProj(id); setTagFilter("all"); doSave({ activeProj: id }); };
  const addProject = () => { if (!newProjTitle.trim()) return; const id = "proj_" + Date.now(); const np = [...projects, { id, title: newProjTitle.trim(), emoji: "🎵" }]; const nl = { ...lyrics, [id]: "" }; setProjects(np); setLyrics(nl); setActiveProj(id); setShowNewProj(false); setNewProjTitle(""); doSave({ projects: np, lyrics: nl, activeProj: id }); };
  const addFolder = () => { if (!newFolderTitle.trim()) return; const nf = [...projectFolders, { id: "folder_" + Date.now(), title: newFolderTitle.trim(), projectIds: [], open: true, locked: false }]; setProjectFolders(nf); setShowNewFolder(false); setNewFolderTitle(""); doSave({ projectFolders: nf }); };
  const renameFolder = (id, title) => { const nf = projectFolders.map((f) => f.id === id ? { ...f, title } : f); setProjectFolders(nf); doSave({ projectFolders: nf }); };
  const toggleFolderLock = (id) => { const nf = projectFolders.map((f) => f.id === id ? { ...f, locked: !f.locked } : f); setProjectFolders(nf); doSave({ projectFolders: nf }); };
  const deleteFolder = (id) => { const folder = projectFolders.find((f) => f.id === id); if (folder?.locked) return; const nf = projectFolders.filter((f) => f.id !== id); setProjectFolders(nf); doSave({ projectFolders: nf }); };
  const projectDragData = (e) => { const data = getDragPayload(e); return data.type === "project" || data.type === "folder" || data.from ? data : {}; };
  const moveProjectToFolder = (projectId, folderId, beforeId = null) => {
    const fromList = projectList.find((p) => p.id === projectId);
    const np = fromList && !projects.some((p) => p.id === projectId) ? [...projects, fromList] : projects;
    const npl = projectList.filter((p) => p.id !== projectId);
    const nf = projectFolders.map((f) => ({ ...f, projectIds: (f.projectIds || []).filter((id) => id !== projectId) })).map((f) => {
      if (f.id !== folderId) return f;
      const ids = [...(f.projectIds || [])];
      const toIdx = beforeId ? ids.indexOf(beforeId) : -1;
      if (toIdx >= 0) ids.splice(toIdx, 0, projectId); else ids.push(projectId);
      return { ...f, projectIds: ids, open: true };
    });
    setProjects(np); setProjectList(npl); setProjectFolders(nf); doSave({ projects: np, projectList: npl, projectFolders: nf });
  };
  const moveProjectToRoot = (projectId, beforeId = null) => {
    const fromList = projectList.find((p) => p.id === projectId);
    let np = fromList && !projects.some((p) => p.id === projectId) ? [...projects, fromList] : [...projects];
    const npl = projectList.filter((p) => p.id !== projectId);
    const fromIdx = np.findIndex((p) => p.id === projectId);
    const toIdx = beforeId ? np.findIndex((p) => p.id === beforeId) : -1;
    if (fromIdx >= 0 && toIdx >= 0) np = moveInArray(np, fromIdx, toIdx);
    const nf = projectFolders.map((f) => ({ ...f, projectIds: (f.projectIds || []).filter((id) => id !== projectId) }));
    setProjects(np); setProjectList(npl); setProjectFolders(nf); doSave({ projects: np, projectList: npl, projectFolders: nf });
  };
  const reorderFolderProject = (folderId, projectId, beforeId) => {
    if (!beforeId || projectId === beforeId) return;
    const nf = projectFolders.map((f) => {
      if (f.id !== folderId) return f;
      const ids = f.projectIds || [];
      return { ...f, projectIds: moveInArray(ids, ids.indexOf(projectId), ids.indexOf(beforeId)) };
    });
    setProjectFolders(nf); doSave({ projectFolders: nf });
  };
  const reorderFolder = (folderId, beforeId) => {
    if (!folderId || folderId === beforeId) return;
    const moving = projectFolders.find((f) => f.id === folderId);
    if (!moving) return;
    const nf = projectFolders.filter((f) => f.id !== folderId);
    const toIdx = beforeId ? nf.findIndex((f) => f.id === beforeId) : -1;
    if (toIdx >= 0) nf.splice(toIdx, 0, moving); else nf.push(moving);
    setProjectFolders(nf); doSave({ projectFolders: nf });
  };
  const clearSidebarPointerDrag = () => {
    if (sidebarPointerDragRef.current?.cleanup) sidebarPointerDragRef.current.cleanup();
    sidebarPointerDragRef.current = null;
    setDragProjId(null);
    setDragTrackId(null);
    setSidebarDragUi(null);
  };
  const targetKey = (target = {}) => [target.root ? "root" : "", target.folderEnd ? "folderEnd" : "", target.folderId, target.projectId, target.trackId].filter(Boolean).join(":");
  const findSidebarEl = (attr, value) => {
    if (!value) return null;
    return Array.from(document.querySelectorAll(`[${attr}]`)).find((el) => el.getAttribute(attr) === value) || null;
  };
  const folderInsertTargetFromPoint = (e, source) => {
    const rootEl = document.querySelector("[data-testid='projects-drop-root']");
    const rootRect = rootEl?.getBoundingClientRect();
    if (!rootRect || e.clientX < rootRect.left || e.clientX > rootRect.right || e.clientY < rootRect.top) return {};
    const folders = Array.from(rootEl.querySelectorAll("[data-testid='project-folder']"))
      .map((el) => ({ el, id: el.getAttribute("data-folder-id"), rect: el.getBoundingClientRect() }))
      .filter((item) => item.id && item.id !== source?.id);
    const lineBase = { left: rootRect.left + 10, width: Math.max(32, rootRect.width - 20) };
    if (!folders.length) return { folderEnd: true, indicator: { kind: "line", ...lineBase, top: rootRect.top + 2 } };
    for (let i = 0; i < folders.length; i++) {
      const current = folders[i];
      const prev = folders[i - 1];
      const currentMid = current.rect.top + current.rect.height / 2;
      if (e.clientY < currentMid) {
        const top = prev ? ((prev.rect.bottom + current.rect.top) / 2) - 1 : current.rect.top - 3;
        return { folderId: current.id, indicator: { kind: "line", ...lineBase, top } };
      }
    }
    const last = folders[folders.length - 1];
    return { folderEnd: true, indicator: { kind: "line", ...lineBase, top: last.rect.bottom + 3 } };
  };
  const sidebarIndicatorFor = (target, drag, e) => {
    if (!target || !drag) return null;
    if (target.indicator) return target.indicator;
    const rootEl = document.querySelector("[data-testid='projects-drop-root']");
    const rootRect = rootEl?.getBoundingClientRect();
    const pointNodes = e ? (document.elementsFromPoint?.(e.clientX || 0, e.clientY || 0) || []) : [];
    const pointFolder = pointNodes.map((node) => node?.closest?.("[data-testid='project-folder']")).find(Boolean);
    const pointProject = pointNodes.map((node) => node?.closest?.("[data-project-id]")).find(Boolean);
    if (drag.type === "project" && pointFolder && !pointFolder.contains(pointProject)) {
      const folderId = pointFolder.getAttribute("data-folder-id");
      if (!(drag.from === "folder" && folderId === drag.folderId)) {
        const rect = pointFolder.getBoundingClientRect();
        return { kind: "outline", left: rect.left + 2, top: rect.top + 2, width: rect.width - 4, height: rect.height - 4 };
      }
    }
    if (drag.type === "project" && target.folderId && !target.projectId) {
      const el = findSidebarEl("data-folder-id", target.folderId);
      const rect = el?.getBoundingClientRect();
      if (!rect) return null;
      return { kind: "outline", left: rect.left + 2, top: rect.top + 2, width: rect.width - 4, height: rect.height - 4 };
    }
    if (target.projectId) {
      const el = findSidebarEl("data-project-id", target.projectId);
      const rect = el?.getBoundingClientRect();
      if (!rect) return null;
      return { kind: "line", left: rect.left + 10, top: rect.top - 1, width: Math.max(32, rect.width - 20) };
    }
    if (drag.type === "folder" && target.folderId) {
      const el = findSidebarEl("data-folder-id", target.folderId);
      const rect = el?.getBoundingClientRect();
      if (!rect) return null;
      return { kind: "line", left: rect.left + 10, top: rect.top - 1, width: Math.max(32, rect.width - 20) };
    }
    if (drag.type === "folder" && target.folderEnd && rootRect) {
      const folderEls = Array.from(document.querySelectorAll("[data-testid='project-folder']"));
      const lastRect = folderEls.at(-1)?.getBoundingClientRect();
      const top = lastRect ? lastRect.bottom + 2 : rootRect.top + 2;
      return { kind: "line", left: rootRect.left + 10, top, width: Math.max(32, rootRect.width - 20) };
    }
    if (drag.type === "project" && target.root && rootRect) {
      const rootProjectEls = Array.from(rootEl?.querySelectorAll("[data-project-id]") || []).filter((el) => !el.closest("[data-folder-id]"));
      const lastFolderRect = Array.from(rootEl?.querySelectorAll("[data-testid='project-folder']") || []).at(-1)?.getBoundingClientRect();
      const firstProjectRect = rootProjectEls[0]?.getBoundingClientRect();
      const top = firstProjectRect?.top || (lastFolderRect ? lastFolderRect.bottom + 4 : rootRect.top + 2);
      return { kind: "line", left: rootRect.left + 10, top: top - 1, width: Math.max(32, rootRect.width - 20) };
    }
    return null;
  };
  const updateSidebarDragUi = (target, e) => {
    const drag = sidebarPointerDragRef.current;
    if (!drag) return;
    drag.target = target;
    const indicator = sidebarIndicatorFor(target, drag, e);
    setSidebarDragUi({
      label: drag.label || "",
      type: drag.type,
      target,
      indicator,
      x: e.clientX || drag.startX,
      y: e.clientY || drag.startY,
    });
  };
  const beginSidebarPointerDrag = (payload, e) => {
    if ((e.button ?? 0) !== 0 || e.target.closest("input, textarea, [data-no-drag='true']")) return;
    if (sidebarPointerDragRef.current?.cleanup) sidebarPointerDragRef.current.cleanup();
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget?.setPointerCapture?.(e.pointerId);
    const dragState = { ...payload, startX: e.clientX, startY: e.clientY };
    setSidebarDragUi({ label: payload.label || "", type: payload.type, target: {}, indicator: null, x: e.clientX, y: e.clientY });
    const onMove = (ev) => {
      const active = sidebarPointerDragRef.current;
      if (!active) return;
      const moved = Math.hypot((ev.clientX || 0) - active.startX, (ev.clientY || 0) - active.startY) > 6;
      if (!moved) return;
      const target = resolveSidebarDropTarget(ev, active);
      const key = targetKey(target);
      if (key) active.lastTargetKey = key;
      updateSidebarDragUi(key ? target : active.target || {}, ev);
    };
    const onUp = (ev) => finishSidebarPointerDrop(ev, applySidebarDrop);
    dragState.cleanup = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
    };
    sidebarPointerDragRef.current = dragState;
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    if (payload.type === "project" || payload.type === "folder") setDragProjId(payload.id);
    if (payload.type === "audio" || payload.type === "recording") setDragTrackId(payload.id);
  };
  const markSidebarDropTarget = (target) => {
    if (sidebarPointerDragRef.current) sidebarPointerDragRef.current.target = target;
  };
  const hoverSidebarDropTarget = (target, e, force = false) => {
    const payload = sidebarPointerDragRef.current;
    if (!payload) return;
    const moved = Math.hypot((e.clientX || 0) - payload.startX, (e.clientY || 0) - payload.startY) > 6;
    if (!force && !moved) return;
    const key = targetKey(target);
    if (!key) return;
    payload.lastTargetKey = key;
    updateSidebarDragUi(target, e);
  };
  const finishSidebarPointerDrop = (e, handler) => {
    const payload = sidebarPointerDragRef.current;
    if (!payload) return false;
    const moved = Math.hypot((e.clientX || 0) - payload.startX, (e.clientY || 0) - payload.startY) > 6;
    if (!moved) {
      clearSidebarPointerDrag();
      return false;
    }
    e.preventDefault();
    e.stopPropagation();
    const target = resolveSidebarDropTarget(e, payload);
    const remembered = payload.target || {};
    const sameSource = (payload.type === "project" && target.projectId === payload.id) || (payload.type === "folder" && target.folderId === payload.id);
    const hasRememberedTarget = remembered.root || remembered.projectId || remembered.folderId || remembered.folderEnd || remembered.trackId;
    const hasCurrentTarget = target.root || target.projectId || target.folderId || target.folderEnd || target.trackId;
    const dropTarget = sameSource && hasRememberedTarget ? remembered : (hasCurrentTarget ? target : remembered);
    handler(payload, dropTarget);
    clearSidebarPointerDrag();
    return true;
  };
  const resolveSidebarDropTarget = (e, source = sidebarPointerDragRef.current) => {
    if (source?.type === "folder") {
      const folderTarget = folderInsertTargetFromPoint(e, source);
      if (folderTarget.folderId || folderTarget.folderEnd) return folderTarget;
    }
    const nodes = document.elementsFromPoint?.(e.clientX || 0, e.clientY || 0) || [document.elementFromPoint(e.clientX || 0, e.clientY || 0)];
    let rootHit = false;
    for (const node of nodes) {
      if (node?.closest?.("[data-testid='projects-drop-root']")) rootHit = true;
      const projectEl = node?.closest?.("[data-project-id]");
      if (projectEl) {
        const projectTarget = { projectId: projectEl.getAttribute("data-project-id") || null };
        if (!(source?.type === "project" && projectTarget.projectId === source.id)) return projectTarget;
      }
      const el = node?.closest?.("[data-folder-id], [data-track-id]");
      if (!el) continue;
      if (source?.type === "folder" && el.hasAttribute("data-folder-id")) {
        const folderId = el.getAttribute("data-folder-id") || null;
        if (folderId === source.id) continue;
        const visibleIds = filteredFolders.map((f) => f.id);
        const idx = visibleIds.indexOf(folderId);
        const rect = el.getBoundingClientRect();
        if (e.clientY > rect.top + rect.height / 2) {
          const nextId = visibleIds.slice(idx + 1).find((id) => id !== source.id);
          return nextId ? { folderId: nextId } : { folderEnd: true };
        }
        return { folderId };
      }
      const target = {
        folderId: el.getAttribute("data-folder-id") || null,
        trackId: el.getAttribute("data-track-id") || null,
        trackType: el.getAttribute("data-track-type") || null,
      };
      if (source?.type === "folder" && target.folderId === source.id) continue;
      if (source?.type === "project" && source.from === "folder" && target.folderId === source.folderId && !target.projectId) return { root: true };
      return target;
    }
    const rootEl = document.querySelector("[data-testid='projects-drop-root']");
    const rootRect = rootEl?.getBoundingClientRect();
    if (source?.type === "project" && rootRect && e.clientX >= rootRect.left && e.clientX <= rootRect.right && e.clientY >= rootRect.top) {
      return { root: true };
    }
    return rootHit ? { root: true } : {};
  };
  const applyProjectDrop = (src, target) => {
    if (src.type !== "project") return;
    if (target.root) {
      moveProjectToRoot(src.id);
      return;
    }
    if (src.from === "folder" && target.folderId === src.folderId && !target.projectId) {
      moveProjectToRoot(src.id);
      return;
    }
    if (target.folderId && !target.projectId) {
      moveProjectToFolder(src.id, target.folderId);
      return;
    }
    if (!target.projectId || target.projectId === src.id) return;
    const targetFolder = projectFolders.find((f) => (f.projectIds || []).includes(target.projectId));
    if (targetFolder) {
      if (src.from === "folder" && src.folderId === targetFolder.id) reorderFolderProject(targetFolder.id, src.id, target.projectId);
      else moveProjectToFolder(src.id, targetFolder.id, target.projectId);
      return;
    }
    if (src.from === "projects") {
      const fromIdx = projects.findIndex((x) => x.id === src.id);
      const toIdx = projects.findIndex((x) => x.id === target.projectId);
      if (fromIdx !== -1 && toIdx !== -1) moveProject(fromIdx, toIdx, "projects", "projects");
    } else {
      moveProjectToRoot(src.id, target.projectId);
    }
  };
  const applySidebarDrop = (src, target) => {
    if (src.type === "folder" && (target.folderId || target.folderEnd)) reorderFolder(src.id, target.folderId || null);
    else if (src.type === "project") applyProjectDrop(src, target);
  };
  const dropOnProjectRoot = (e) => finishSidebarPointerDrop(e, (src, target) => {
    if (target.projectId || target.folderId) applySidebarDrop(src, target);
    else if (src.type === "project") moveProjectToRoot(src.id);
  });
  const dropOnFolder = (folderId, e) => finishSidebarPointerDrop(e, (src, target) => {
    const targetFolderId = target.folderId || folderId;
    if (src.type === "folder") reorderFolder(src.id, target.folderEnd ? null : targetFolderId);
    else if (src.type === "project") moveProjectToFolder(src.id, targetFolderId);
  });
  const dropOnProject = (project, e) => finishSidebarPointerDrop(e, (src, target) => {
    applyProjectDrop(src, target.projectId ? target : { ...target, projectId: project.id });
  });
  const dropOnTrack = (track, type, e) => finishSidebarPointerDrop(e, (src) => {
    if (src.type !== type || src.id === track.id) return;
    if (type === "audio") reorderTrack(audioLib, setAudioLib, "audioLib", src.id, track.id);
    if (type === "recording") reorderTrack(recLib, setRecLib, "recLib", src.id, track.id);
  });
  const folderHoverTarget = (f, e) => sidebarPointerDragRef.current?.type === "folder" ? resolveSidebarDropTarget(e, sidebarPointerDragRef.current) : { folderId: f.id };
  const projectRootHoverTarget = (e) => sidebarPointerDragRef.current?.type === "folder" ? folderInsertTargetFromPoint(e, sidebarPointerDragRef.current) : { root: true };
  const folderItemDragProps = (f) => ({
    draggable: false,
    onPointerDown: (e) => beginSidebarPointerDrag({ id: f.id, type: "folder", label: f.title }, e),
    onPointerEnter: (e) => { if (e.target.closest("[data-project-id]")) return; const target = folderHoverTarget(f, e); markSidebarDropTarget(target); hoverSidebarDropTarget(target, e); },
    onPointerMove: (e) => { if (e.target.closest("[data-project-id]")) return; const target = folderHoverTarget(f, e); markSidebarDropTarget(target); hoverSidebarDropTarget(target, e); },
    onPointerUp: (e) => dropOnFolder(f.id, e),
    onMouseDown: (e) => beginSidebarPointerDrag({ id: f.id, type: "folder", label: f.title }, e),
    onMouseEnter: (e) => { if (e.target.closest("[data-project-id]")) return; const target = folderHoverTarget(f, e); markSidebarDropTarget(target); hoverSidebarDropTarget(target, e); },
    onMouseMove: (e) => { if (e.target.closest("[data-project-id]")) return; const target = folderHoverTarget(f, e); markSidebarDropTarget(target); hoverSidebarDropTarget(target, e); },
    onMouseUp: (e) => dropOnFolder(f.id, e),
    onDragStart: (e) => {
      if (sidebarPointerDragRef.current) Object.assign(sidebarPointerDragRef.current, { id: f.id, type: "folder", startX: e.clientX, startY: e.clientY });
      else sidebarPointerDragRef.current = { id: f.id, type: "folder", startX: e.clientX, startY: e.clientY };
      setDragProjId(f.id);
      setDragPayload(e, { id: f.id, type: "folder" });
    },
    onDragEnd: clearSidebarPointerDrag,
  });
  const projectItemDragProps = (p) => {
    const folder = projectFolders.find((f) => (f.projectIds || []).includes(p.id));
    const payload = { id: p.id, type: "project", from: folder ? "folder" : "projects", folderId: folder?.id, label: p.title };
    return {
      draggable: false,
      onPointerDown: (e) => beginSidebarPointerDrag(payload, e),
      onPointerEnter: (e) => { markSidebarDropTarget({ projectId: p.id }); hoverSidebarDropTarget({ projectId: p.id }, e); },
      onPointerMove: (e) => { markSidebarDropTarget({ projectId: p.id }); hoverSidebarDropTarget({ projectId: p.id }, e); },
      onPointerUp: (e) => dropOnProject(p, e),
      onMouseDown: (e) => beginSidebarPointerDrag(payload, e),
      onMouseEnter: (e) => { markSidebarDropTarget({ projectId: p.id }); hoverSidebarDropTarget({ projectId: p.id }, e); },
      onMouseMove: (e) => { markSidebarDropTarget({ projectId: p.id }); hoverSidebarDropTarget({ projectId: p.id }, e); },
      onMouseUp: (e) => dropOnProject(p, e),
      onDragStart: (e) => {
        if (sidebarPointerDragRef.current) Object.assign(sidebarPointerDragRef.current, payload, { startX: e.clientX, startY: e.clientY });
        else sidebarPointerDragRef.current = { ...payload, startX: e.clientX, startY: e.clientY };
        setDragProjId(p.id);
        setDragPayload(e, payload);
      },
      onDragEnd: clearSidebarPointerDrag,
    };
  };
  const trackItemDragProps = (track, type) => ({
    draggable: false,
    onMouseDown: (e) => beginSidebarPointerDrag({ id: track.id, type, label: track.name }, e),
    onMouseUp: (e) => dropOnTrack(track, type, e),
    onDragStart: (e) => {
      setDragTrackId(track.id);
      setDragPayload(e, { id: track.id, type });
    },
    onDragEnd: clearSidebarPointerDrag,
  });
  const stopActionDrag = (e) => e.stopPropagation();
  const dragTarget = sidebarDragUi?.target || {};
  const rowMotion = { transition: "transform 0.14s ease, background 0.14s ease, box-shadow 0.14s ease, opacity 0.12s ease" };
  const sidebarDragHandleStyle = { display: "grid", placeItems: "center", width: 16, height: 22, color: "#7a7e8e", cursor: "grab", touchAction: "none", flexShrink: 0 };
  const dropLine = () => null;
  const dropOutline = {};
  const openFolderFlyout = (f, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 190;
    const gap = 8;
    const left = Math.min(Math.max(8, rect.right + gap), Math.max(8, window.innerWidth - width - 8));
    const top = Math.min(Math.max(72, rect.top - 4), Math.max(72, window.innerHeight - 280));
    setFolderFlyout((cur) => cur?.id === f.id ? null : { id: f.id, left, top });
  };
  const deleteProject = (id) => { const inProjects = projects.find(p => p.id === id); const inList = projectList.find(p => p.id === id); if (allProjects.length <= 1) return; const proj = inProjects || inList; if (!proj || proj.locked) return; const trashItem = { id: "tr_" + Date.now(), type: "project", data: { project: proj, lyrics: lyrics[id], cards: cards.filter(c => c.projId === id), memo: memo[id] }, deletedAt: Date.now() }; const nt = [...trash, trashItem]; const np = projects.filter((p) => p.id !== id); const npl = projectList.filter((p) => p.id !== id); const nf = projectFolders.map((f) => ({ ...f, projectIds: (f.projectIds || []).filter((pid) => pid !== id) })); const nl = { ...lyrics }; delete nl[id]; const nc = cards.filter((c) => c.projId !== id); const na = id === activeProj ? (np[0] || npl[0])?.id || "proj_1" : activeProj; const nm = { ...memo }; delete nm[id]; setTrash(nt); setProjects(np); setProjectList(npl); setProjectFolders(nf); setLyrics(nl); setCards(nc); setActiveProj(na); setMemo(nm); doSave({ trash: nt, projects: np, projectList: npl, projectFolders: nf, lyrics: nl, cards: nc, activeProj: na, memo: nm }); };
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
  const resetAll = async () => { for (const t of audioLib) await deleteAudio(S_AP + t.id); for (const t of recLib) await deleteAudio(S_RC + t.id); await deleteData(S_KEY); await clearAllAudio(); const resetData = syncStamp({ projects: [{ id: "proj_1", title: "New Project", emoji: "🎵" }], lyrics: { "proj_1": "" }, cards: [], audioLib: [], recLib: [], memo: {}, trash: [], projectList: [], projectFolders: [], activeProj: "proj_1" }); resetData.__lastSyncedAt = localLastSyncedAtRef.current; localUpdatedAtRef.current = resetData.__updatedAt; setProjects(resetData.projects); setLyrics(resetData.lyrics); setCards([]); setAudioLib([]); setRecLib([]); setMemo({}); setTrash([]); setProjectList([]); setProjectFolders([]); setActiveProj("proj_1"); setShowSettings(false); if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.src = ""; } setTrackName(""); setIsPlaying(false); setActiveTrackId(null); await _saveData(S_KEY, resetData); if (user) { const pushResult = await push(resetData); if (pushResult?.ok) { const synced = markSynced(resetData); localLastSyncedAtRef.current = synced.__lastSyncedAt; await _saveData(S_KEY, synced); } } };

  // Audio playback
  const playTrack = useCallback((meta, b64) => { const a = audioElRef.current; if (!a) return; if (meta.id === activeTrackId && a.src) { if (isPlaying) { a.pause(); setIsPlaying(false); } else { a.play().then(() => setIsPlaying(true)).catch(() => {}); } return; } a.pause(); a.src = b64; a.volume = isMuted ? 0 : volume; a.loop = repeatOn; setTrackName(meta.name); setActiveTrackId(meta.id); setSeekPos(0); setCurTime(0); setDur(0); a.load(); const rdy = () => { a.play().then(() => setIsPlaying(true)).catch(() => {}); a.removeEventListener("canplay", rdy); }; a.addEventListener("canplay", rdy); }, [isMuted, volume, activeTrackId, isPlaying, repeatOn]);
  const loadAndPlay = useCallback(async (meta, prefix) => { let b = audioCacheRef.current[meta.id]; if (!b) { b = await loadAudio(prefix + meta.id); if (!b) return; audioCacheRef.current[meta.id] = b; } playTrack(meta, b); }, [playTrack]);
  const handleFileUpload = async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setUploadingAudio(true); const reader = new FileReader(); reader.onload = async (ev) => { const b64 = ev.target.result; const id = "aud_" + Date.now(); const meta = { id, name: file.name.replace(/\.[^.]+$/, ""), size: file.size, ext: file.name.split(".").pop() }; const ok = await saveAudio(S_AP + id, b64); if (!ok) { alert("ファイルサイズ上限超過"); setUploadingAudio(false); return; } audioCacheRef.current[id] = b64; pushAudio(id, b64); const nal = [...audioLib, meta]; setAudioLib(nal); doSave({ audioLib: nal }); playTrack(meta, b64); setModal(false); setUploadingAudio(false); }; reader.readAsDataURL(file); };
  const renameTrk = (lib, setLib, key, id, n) => { const nl = lib.map((t) => t.id === id ? { ...t, name: n } : t); setLib(nl); if (activeTrackId === id) setTrackName(n); doSave({ [key]: nl }); };
  const toggleTrackLock = (lib, setLib, key, id) => { const nl = lib.map(t => t.id === id ? { ...t, locked: !t.locked } : t); setLib(nl); doSave({ [key]: nl }); };
  const reorderTrack = (lib, setLib, key, fromId, toId) => { if (!fromId || !toId || fromId === toId) return; const nl = moveInArray(lib, lib.findIndex((t) => t.id === fromId), lib.findIndex((t) => t.id === toId)); setLib(nl); doSave({ [key]: nl }); };
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
    const saveData = syncStamp({ projects, lyrics, cards, activeProj, audioLib, recLib, memo, trash: nt, projectList, projectFolders });
    saveData.__lastSyncedAt = localLastSyncedAtRef.current;
    localUpdatedAtRef.current = saveData.__updatedAt;
    await _saveData(S_KEY, saveData); if (user) { const pushResult = await pushNow(saveData); if (pushResult?.ok) { const synced = markSynced(saveData); localLastSyncedAtRef.current = synced.__lastSyncedAt; await _saveData(S_KEY, synced); } }
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
    const saveData = syncStamp({ projects, lyrics, cards, activeProj, audioLib, recLib, memo, trash: [], projectList, projectFolders });
    saveData.__lastSyncedAt = localLastSyncedAtRef.current;
    localUpdatedAtRef.current = saveData.__updatedAt;
    await _saveData(S_KEY, saveData); if (user) { const pushResult = await pushNow(saveData); if (pushResult?.ok) { const synced = markSynced(saveData); localLastSyncedAtRef.current = synced.__lastSyncedAt; await _saveData(S_KEY, synced); } }
  };
  const daysLeft = (deletedAt) => Math.max(0, 30 - Math.floor((Date.now() - deletedAt) / (24*60*60*1000)));

  useEffect(() => { if (audioElRef.current) audioElRef.current.volume = isMuted ? 0 : volume; }, [volume, isMuted]);
  useEffect(() => { if (audioElRef.current) audioElRef.current.loop = repeatOn; }, [repeatOn]);
  const togglePlay = () => { const a = audioElRef.current; if (!a || !a.src) { setModal(true); return; } if (isPlaying) { a.pause(); setIsPlaying(false); } else { a.play().then(() => setIsPlaying(true)).catch(() => {}); } };
  const handleSeek = (v) => { setSeekPos(v); if (audioElRef.current && dur) audioElRef.current.currentTime = (v / 100) * dur; };
  const handleVol = (v) => { const vol = v / 100; setVolume(vol); setIsMuted(vol === 0); };

  // Recording (mic + track)
  const startRecording = async () => {
    if (await isNativeRecordingAvailable()) {
      try {
        const a = audioElRef.current;
        const musicTrack = audioLib.find((t) => t.id === activeTrackId);
        let backingTrack = null;
        if (musicTrack && a?.src) {
          let b64 = audioCacheRef.current[musicTrack.id];
          if (!b64) {
            b64 = await loadAudio(S_AP + musicTrack.id);
            if (b64) audioCacheRef.current[musicTrack.id] = b64;
          }
          if (b64) {
            backingTrack = {
              id: musicTrack.id,
              name: musicTrack.name,
              dataUrl: b64,
              startTime: a.currentTime || 0,
              gain: isMuted ? 0 : volume,
              loop: repeatOn,
            };
          }
        }
        const deviceId = selectedInputDeviceId === "" ? null : Number(selectedInputDeviceId);
        await startNativeRecording(Number.isFinite(deviceId) ? deviceId : null);
        recordingTrackRef.current = backingTrack;
        recordingModeRef.current = "native";
        setInputError("");
        setInputLevel(0);
        if (a && a.src && a.paused) { a.play().then(() => setIsPlaying(true)).catch(() => {}); }
        setIsRecording(true);
        return;
      } catch (e) {
        recordingTrackRef.current = null;
        const message = e.message || String(e);
        setInputError(message);
        alert("ネイティブ録音を開始できませんでした\n" + message);
        return;
      }
    }
    try {
      recordingModeRef.current = "web";
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
  const stopRecording = async () => {
    if (!isRecording) return;
    if (recordingModeRef.current === "native") {
      try {
        const rec = await stopNativeRecording();
        let dataUrl = rec.data_url;
        let size = rec.size;
        let source = "native";
        const backingTrack = recordingTrackRef.current;
        if (backingTrack?.dataUrl) {
          try {
            const mixed = await mixRecordingWithTrack({
              micDataUrl: rec.data_url,
              trackDataUrl: backingTrack.dataUrl,
              trackStartTime: backingTrack.startTime,
              trackGain: backingTrack.gain,
              loopTrack: backingTrack.loop,
            });
            dataUrl = mixed.dataUrl;
            size = mixed.size;
            source = "native-mix";
          } catch (mixError) {
            console.error("Track mix failed:", mixError);
          }
        } else {
          try {
            const centered = await centerRecordingToStereo(rec.data_url);
            dataUrl = centered.dataUrl;
            size = centered.size;
            source = "native-centered";
          } catch (centerError) {
            console.error("Centering recording failed:", centerError);
          }
        }
        const id = "rec_" + Date.now();
        const meta = {
          id,
          name: "録音_" + ts().replace(":", ""),
          size,
          ext: "wav",
          channels: rec.channels,
          sampleRate: rec.sample_rate,
          durationMs: rec.duration_ms,
          source,
          trackId: backingTrack?.id,
          trackName: backingTrack?.name,
        };
        await saveAudio(S_RC + id, dataUrl);
        audioCacheRef.current[id] = dataUrl;
        pushAudio(id, dataUrl);
        const nrl = [...recLib, meta];
        setRecLib(nrl);
        doSave({ recLib: nrl });
      } catch (e) {
        alert("録音を保存できませんでした\n" + (e.message || e));
      }
      setIsRecording(false);
      setInputLevel(0);
      recordingTrackRef.current = null;
      recordingModeRef.current = "web";
      return;
    }
    if (mediaRecRef.current) { mediaRecRef.current.stop(); mediaRecRef.current = null; setIsRecording(false); }
  };

  // Keyboard navigation (arrow keys when sidebar hidden)
  useEffect(() => {
    if (sidebarOpen) return;
    const activeFolder = projectFolders.find((f) => (f.projectIds || []).includes(activeProj));
    const allItems = activeFolder
      ? (activeFolder.projectIds || []).map((id) => allProjects.find((p) => p.id === id)).filter(Boolean)
      : allProjects.filter((p) => !folderProjectIds.has(p.id));
    const handler = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      const idx = allItems.findIndex(p => p.id === activeProj);
      if (e.key === "ArrowLeft" && idx > 0) { switchProject(allItems[idx - 1].id); }
      else if (e.key === "ArrowRight" && idx < allItems.length - 1) { switchProject(allItems[idx + 1].id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen, allProjects, projectFolders, activeProj]);

  // Context menu
  useEffect(() => { if (!ctxMenu) return; const h = () => setCtxMenu(null); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [ctxMenu]);
  useEffect(() => {
    if (!folderFlyout) return;
    const closeFlyout = (e) => {
      if (e.target.closest("[data-folder-flyout], [data-testid='project-folder-button']")) return;
      const projectEl = e.target.closest("[data-project-id]");
      if (projectEl) {
        const projectId = projectEl.getAttribute("data-project-id");
        const isInFolder = projectFolders.some((f) => (f.projectIds || []).includes(projectId));
        if (!isInFolder) return;
      }
      setFolderFlyout(null);
    };
    document.addEventListener("pointerdown", closeFlyout, true);
    return () => document.removeEventListener("pointerdown", closeFlyout, true);
  }, [folderFlyout, projectFolders]);
  const onCtx = useCallback((e) => { e.preventDefault(); const s = window.getSelection().toString().trim(); if (s) { setSelText(s); setCtxMenu({ x: e.clientX, y: e.clientY }); } }, []);

  if (loading || authLoading || cloudLoading) return (<div style={{ fontFamily: ff, height: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0d", color: "#4a4e5e", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>// loading...</div>);
  if (!user) return <AuthGate user={user} onLogin={login} onLogout={logout} syncStatus={syncStatus} hasSupabase={hasSupabase} />;

  return (
    <div style={{ fontFamily: ff, height: "100vh", width: "100%", display: "flex", flexDirection: "column", background: "#0a0a0d", color: "#c8ccd8", overflow: "hidden", letterSpacing: "0.01em" }}>
      <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma,.opus,.webm" style={{ display: "none" }} onChange={handleFileUpload} />

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #2a2a35", background: "#0a0a0d", flexShrink: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ ...btn, padding: 6, borderRadius: 2, color: "#7a7e8e", border: "1px solid transparent" }}>{sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: "#4af0a0", letterSpacing: "0.15em", textTransform: "uppercase" }}>// LYRIC WORKSPACE</span><span style={{ fontSize: 11, color: "#4a4e5e" }}>/</span><span style={{ fontSize: 13, fontWeight: 700, color: "#c8ccd8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{curProject?.title || "untitled"}</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => setScrapsOpen(!scrapsOpen)} style={{ ...btn, padding: 8, borderRadius: 2, background: scrapsOpen ? "#1a5040" : "transparent", color: scrapsOpen ? "#4af0a0" : "#7a7e8e", border: scrapsOpen ? "1px solid #2a9060" : "1px solid transparent" }}><Layers size={15} /></button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <div className="lw-motion-sidebar" data-open={sidebarOpen ? "true" : "false"} style={{ width: sidebarOpen ? 220 : 0, flexShrink: 0, borderRight: sidebarOpen ? "1px solid #2a2a35" : "1px solid transparent", background: "#111116", display: "flex", flexDirection: "column", overflow: sidebarOpen ? "visible" : "hidden", pointerEvents: sidebarOpen ? "auto" : "none" }}>
          <div className="lw-motion-sidebar-inner" style={{ width: 220, height: "100%", display: "flex", flexDirection: "column", overflow: "visible" }}>
            <div style={{ padding: 12, flex: 1, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 2, background: "#18181f", border: "1px solid #2a2a35", marginBottom: 16 }}><Search size={13} color="#7a7e8e" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="// search..." style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#c8ccd8", width: "100%", fontFamily: ff }} />{searchQuery && <button onClick={() => setSearchQuery("")} style={{ ...btn, color: "#4a4e5e" }}><XIcon size={11} /></button>}</div>

              {/* Projects */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: "#4a4e5e", textTransform: "uppercase", letterSpacing: "0.12em" }}>Projects</span><div style={{ display: "flex", gap: 4 }}><button onClick={() => setShowNewFolder(true)} title="フォルダ作成" style={{ ...btn, padding: 2, borderRadius: 2, color: "#7a7e8e" }}><FolderOpen size={13} /></button><button onClick={() => setShowNewProj(true)} title="プロジェクト作成" style={{ ...btn, padding: 2, borderRadius: 2, color: "#7a7e8e" }}><Plus size={13} /></button></div></div>
                {showNewProj && (<div style={{ background: "#111116", border: "1px solid #4a4e5e", borderRadius: 2, padding: 8, marginBottom: 6 }}><input type="text" placeholder="プロジェクト名..." value={newProjTitle} onChange={(e) => setNewProjTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addProject()} autoFocus style={{ width: "100%", background: "#0a0a0a", border: "1px solid #3a3a4a", borderRadius: 2, padding: "4px 8px", fontSize: 11, color: "#c8ccd8", outline: "none", fontFamily: ff, marginBottom: 6, boxSizing: "border-box" }} /><div style={{ display: "flex", gap: 4 }}><button onClick={addProject} style={{ flex: 1, padding: "4px 0", borderRadius: 2, border: "none", background: "#4af0a0", color: "#111116", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: ff }}>作成</button><button onClick={() => { setShowNewProj(false); setNewProjTitle(""); }} style={{ flex: 1, padding: "4px 0", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#7a7e8e", fontSize: 11, cursor: "pointer", fontFamily: ff }}>取消</button></div></div>)}
                {showNewFolder && (<div style={{ background: "#111116", border: "1px solid #4a4e5e", borderRadius: 2, padding: 8, marginBottom: 6 }}><input type="text" placeholder="フォルダ名..." value={newFolderTitle} onChange={(e) => setNewFolderTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFolder()} autoFocus style={{ width: "100%", background: "#0a0a0a", border: "1px solid #3a3a4a", borderRadius: 2, padding: "4px 8px", fontSize: 11, color: "#c8ccd8", outline: "none", fontFamily: ff, marginBottom: 6, boxSizing: "border-box" }} /><div style={{ display: "flex", gap: 4 }}><button onClick={addFolder} style={{ flex: 1, padding: "4px 0", borderRadius: 2, border: "none", background: "#4af0a0", color: "#111116", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: ff }}>作成</button><button onClick={() => { setShowNewFolder(false); setNewFolderTitle(""); }} style={{ flex: 1, padding: "4px 0", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#7a7e8e", fontSize: 11, cursor: "pointer", fontFamily: ff }}>取消</button></div></div>)}
	                <div
	                  data-testid="projects-drop-root"
                  onPointerEnter={(e) => { const target = projectRootHoverTarget(e); markSidebarDropTarget(target); hoverSidebarDropTarget(target, e); }}
                  onPointerMove={(e) => { if (!e.target.closest("[data-folder-id], [data-project-id]")) { const target = projectRootHoverTarget(e); markSidebarDropTarget(target); hoverSidebarDropTarget(target, e); } }}
                  onPointerUpCapture={dropOnProjectRoot}
                  onMouseEnter={(e) => { const target = projectRootHoverTarget(e); markSidebarDropTarget(target); hoverSidebarDropTarget(target, e); }}
                  onMouseMove={(e) => { if (!e.target.closest("[data-folder-id], [data-project-id]")) { const target = projectRootHoverTarget(e); markSidebarDropTarget(target); hoverSidebarDropTarget(target, e); } }}
                  onMouseUpCapture={dropOnProjectRoot}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!e.target.closest("[data-folder-id], [data-project-id]")) hoverSidebarDropTarget(projectRootHoverTarget(e), e, true); }}
	                  onDrop={(e) => { e.preventDefault(); const src = projectDragData(e); if (src.type === "project") moveProjectToRoot(src.id); }}
			                  style={{ borderRadius: 2, minHeight: 28, paddingBottom: 18, transition: "background 0.14s ease, box-shadow 0.14s ease" }}
	                >
	                  {filteredFolders.map((f) => (
                    <Fragment key={f.id}>
                    {dragTarget.folderId === f.id && !dragTarget.projectId && sidebarDragUi?.type === "folder" && dragProjId !== f.id && dropLine("drop-line-folder-" + f.id)}
                    <div
                      data-testid="project-folder"
                      data-folder-id={f.id}
		                      style={{ marginBottom: 3, borderRadius: 2, ...(dragTarget.folderId === f.id && !dragTarget.projectId && sidebarDragUi?.type === "project" ? dropOutline : {}), ...rowMotion }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; hoverSidebarDropTarget(folderHoverTarget(f, e), e, true); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = projectDragData(e); if (src.type === "folder") reorderFolder(src.id, f.id); else if (src.type === "project") moveProjectToFolder(src.id, f.id); }}
                    >
                      <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                        <button
                          data-testid="project-folder-button"
	                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; hoverSidebarDropTarget(folderHoverTarget(f, e), e, true); }}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = projectDragData(e); if (src.type === "folder") reorderFolder(src.id, f.id); else if (src.type === "project") moveProjectToFolder(src.id, f.id); }}
	                          onClick={(e) => openFolderFlyout(f, e)}
	                          style={{ ...btn, width: "100%", gap: 7, padding: "5px 10px", borderRadius: 2, textAlign: "left", fontFamily: ff, fontSize: 12, color: "#7a7e8e", background: "transparent", cursor: "pointer", ...rowMotion }}
                        >
                          <ChevronRight size={11} />
                          <span {...folderItemDragProps(f)} onClick={(e) => e.stopPropagation()} style={{ ...sidebarDragHandleStyle, cursor: dragProjId === f.id ? "grabbing" : "grab" }}><FolderOpen size={12} /></span>
                          <EditableName name={f.title} onSave={(n) => renameFolder(f.id, n)} style={{ fontSize: 12, flex: 1 }} />
                        </button>
                        <div style={{ position: "absolute", right: 4, display: "flex", gap: 1, alignItems: "center" }}>
                          <button data-no-drag="true" onMouseDown={stopActionDrag} onClick={(e) => { e.stopPropagation(); toggleFolderLock(f.id); }} style={{ ...btn, padding: 3, borderRadius: 2, color: f.locked ? "#4af0a0" : "#3a3a4a" }}>{f.locked ? <Lock size={9} /> : <Unlock size={9} />}</button>
                          {!f.locked && <button data-no-drag="true" onMouseDown={stopActionDrag} onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }} style={{ ...btn, padding: 3, borderRadius: 2, color: "#4a4e5e", opacity: 0.4, fontSize: 13, lineHeight: 1 }}>×</button>}
                        </div>
                      </div>
	                    </div>
	                    </Fragment>
	                  ))}
                    {dragTarget.folderEnd && sidebarDragUi?.type === "folder" && dropLine("drop-line-folder-end")}
	                  {dragTarget.root && sidebarDragUi?.type === "project" && dropLine("drop-line-root")}
	                  {visibleRootProjects.map((p, idx) => (
                    <Fragment key={p.id}>
	                    {dragTarget.projectId === p.id && sidebarDragUi?.type === "project" && dragProjId !== p.id && dropLine("drop-line-root-project-" + p.id)}
                    <div
                      data-testid="project-row"
                      data-project-id={p.id}
                      draggable={false}
                      onDragStart={(e) => { setDragProjId(p.id); setDragPayload(e, { id: p.id, type: "project", from: "projects", idx }); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); hoverSidebarDropTarget({ projectId: p.id }, e, true); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = projectDragData(e); if (!src.id || src.id === p.id) return; if (src.from === "projects") { const fromIdx = projects.findIndex((x) => x.id === src.id); const toIdx = projects.findIndex((x) => x.id === p.id); if (fromIdx !== -1 && toIdx !== -1) moveProject(fromIdx, toIdx, "projects", "projects"); } else { moveProjectToRoot(src.id, p.id); } }}
                      onDragEnd={() => setDragProjId(null)}
	                      style={{ display: "flex", alignItems: "center", marginBottom: 2, position: "relative", opacity: dragProjId === p.id ? 0.32 : 1, borderRadius: 2, ...rowMotion }}
                    >
	                      <button onClick={() => switchProject(p.id)} style={{ ...btn, width: "100%", gap: 8, padding: "5px 10px", borderRadius: 2, textAlign: "left", fontFamily: ff, fontSize: 12, background: activeProj === p.id ? "#2a2a35" : "transparent", color: activeProj === p.id ? "#c8ccd8" : "#7a7e8e", cursor: "pointer", ...rowMotion }}><span {...projectItemDragProps(p)} onClick={(e) => e.stopPropagation()} style={{ ...sidebarDragHandleStyle, cursor: dragProjId === p.id ? "grabbing" : "grab" }}><FileText size={12} /></span><EditableName name={p.title} onSave={(n) => renameProject(p.id, n)} style={{ fontSize: 12, flex: 1 }} /></button>
                      <div style={{ position: "absolute", right: 4, display: "flex", gap: 1, alignItems: "center" }}><button data-no-drag="true" onMouseDown={stopActionDrag} onClick={() => toggleLock(p.id)} style={{ ...btn, padding: 3, borderRadius: 2, color: p.locked ? "#4af0a0" : "#3a3a4a" }}>{p.locked ? <Lock size={9} /> : <Unlock size={9} />}</button>{allProjects.length > 1 && !p.locked && (<button data-no-drag="true" onMouseDown={stopActionDrag} onClick={() => deleteProject(p.id)} style={{ ...btn, padding: 3, borderRadius: 2, color: "#4a4e5e", opacity: 0.4 }}><XIcon size={10} /></button>)}</div>
	                    </div>
                    </Fragment>
                  ))}
	                  {q && filteredFolders.length === 0 && visibleRootProjects.length === 0 && <div style={{ fontSize: 10, color: "#4a4e5e", padding: "4px 10px" }}>該当なし</div>}
	                </div>
		                {folderFlyout && (() => {
		                  const f = projectFolders.find((x) => x.id === folderFlyout.id);
		                  if (!f) return null;
		                  const items = (f.projectIds || []).map((id) => allProjects.find((p) => p.id === id)).filter(Boolean);
		                  return createPortal((
		                    <div
                          data-folder-flyout="true"
                          data-folder-id={f.id}
                          onPointerMove={(e) => { if (!e.target.closest("[data-project-id]")) hoverSidebarDropTarget({ folderId: f.id }, e); }}
                          onPointerUp={(e) => dropOnFolder(f.id, e)}
                          onMouseMove={(e) => { if (!e.target.closest("[data-project-id]")) hoverSidebarDropTarget({ folderId: f.id }, e); }}
                          onMouseUp={(e) => dropOnFolder(f.id, e)}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; if (!e.target.closest("[data-project-id]")) hoverSidebarDropTarget({ folderId: f.id }, e, true); }}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = projectDragData(e); if (src.type === "project") moveProjectToFolder(src.id, f.id); }}
                          className="lw-motion-flyout"
                          style={{ position: "fixed", left: folderFlyout.left ?? 224, top: folderFlyout.top, zIndex: 2400, width: 190, maxHeight: 260, overflowY: "auto", padding: 6, borderRadius: 2, background: "#111", border: "1px solid #2f2f2f", boxShadow: "0 18px 36px rgba(0,0,0,0.42)" }}
                        >
		                      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 7px 7px", color: "#7a7e8e", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}><FolderOpen size={11} />{f.title}</div>
		                      {items.length === 0 && <div style={{ padding: "6px 8px", fontSize: 10, color: "#4a4e5e" }}>空</div>}
		                      {items.map((p) => (
                            <Fragment key={p.id}>
		                          {dragTarget.projectId === p.id && sidebarDragUi?.type === "project" && dragProjId !== p.id && dropLine("drop-line-flyout-project-" + p.id)}
		                          <div
                                data-testid="project-row"
                                data-project-id={p.id}
                                draggable={false}
                                onDragStart={(e) => { setDragProjId(p.id); setDragPayload(e, { id: p.id, type: "project", from: "folder", folderId: f.id }); }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); hoverSidebarDropTarget({ projectId: p.id }, e, true); }}
                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = projectDragData(e); if (!src.id || src.id === p.id) return; if (src.from === "folder" && src.folderId === f.id) reorderFolderProject(f.id, src.id, p.id); else moveProjectToFolder(src.id, f.id, p.id); }}
                                onDragEnd={() => setDragProjId(null)}
                                style={{ display: "flex", alignItems: "center", marginBottom: 2, position: "relative", opacity: dragProjId === p.id ? 0.32 : 1, borderRadius: 2, ...rowMotion }}
                              >
		                            <button onClick={() => { switchProject(p.id); setFolderFlyout(null); }} style={{ ...btn, width: "100%", gap: 8, padding: "6px 8px", borderRadius: 2, textAlign: "left", fontFamily: ff, fontSize: 12, background: activeProj === p.id ? "#2a2a35" : "transparent", color: activeProj === p.id ? "#c8ccd8" : "#7a7e8e", cursor: "pointer", ...rowMotion }}><span {...projectItemDragProps(p)} onClick={(e) => e.stopPropagation()} style={{ ...sidebarDragHandleStyle, cursor: dragProjId === p.id ? "grabbing" : "grab" }}><FileText size={12} /></span><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span></button>
                              </div>
                            </Fragment>
		                      ))}
		                    </div>
		                  ), document.body);
		                })()}
		                {sidebarDragUi && (
		                  <div className="lw-drag-float" style={{ position: "fixed", left: sidebarDragUi.x + 12, top: sidebarDragUi.y + 10, zIndex: 2000, pointerEvents: "none", minWidth: 130, maxWidth: 190, padding: "6px 9px", borderRadius: 2, background: "rgba(82,82,82,0.22)", border: "1px solid rgba(122,126,142,0.18)", color: "#c8ccd8", fontSize: 11, fontFamily: ff, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
		                    {sidebarDragUi.label}
		                  </div>
		                )}
	              </div>


              {/* Music Library */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 500, color: "#7a7e8e", textTransform: "uppercase", letterSpacing: "0.1em" }}>Music Library</span><button onClick={() => fileInputRef.current?.click()} style={{ ...btn, padding: 2, borderRadius: 2, color: "#7a7e8e" }}><Plus size={13} /></button></div>
                {visibleAudioLib.length === 0 && <div style={{ padding: "4px 10px", fontSize: 10, color: "#4a4e5e" }}>{q ? "該当なし" : "トラックをアップロード"}</div>}
                {visibleAudioLib.map((t) => (<div key={t.id} draggable onDragStart={(e) => { setDragTrackId(t.id); setDragPayload(e, { id: t.id, type: "audio" }); }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = getDragPayload(e); if (src.type === "audio") reorderTrack(audioLib, setAudioLib, "audioLib", src.id, t.id); }} onDragEnd={() => setDragTrackId(null)} style={{ display: "flex", alignItems: "center", marginBottom: 2, position: "relative", opacity: dragTrackId === t.id ? 0.4 : 1 }}><button {...trackItemDragProps(t, "audio")} onClick={() => loadAndPlay(t, S_AP)} style={{ ...btn, width: "100%", gap: 6, padding: "5px 10px", borderRadius: 2, textAlign: "left", fontFamily: ff, fontSize: 11, background: activeTrackId === t.id ? "rgba(74,240,160,0.08)" : "transparent", color: activeTrackId === t.id ? "#4af0a0" : "#7a7e8e", border: activeTrackId === t.id ? "1px solid rgba(74,240,160,0.15)" : "1px solid transparent", cursor: "grab" }}>{activeTrackId === t.id && isPlaying ? <Disc size={12} color="#4af0a0" style={{ animation: "spin 2s linear infinite" }} /> : <Headphones size={12} />}<div style={{ flex: 1, minWidth: 0 }}><EditableName name={t.name} onSave={(n) => renameTrk(audioLib, setAudioLib, "audioLib", t.id, n)} style={{ fontSize: 11 }} /><div style={{ fontSize: 9, color: "#4a4e5e" }}>{fmtS(t.size)}</div></div></button><div style={{ position: "absolute", right: 4, display: "flex", gap: 1, alignItems: "center" }}><button onClick={() => toggleTrackLock(audioLib, setAudioLib, "audioLib", t.id)} style={{ ...btn, padding: 2, borderRadius: 2, color: t.locked ? "#4af0a0" : "#3a3a4a" }}>{t.locked ? <Lock size={8} /> : <Unlock size={8} />}</button>{!t.locked && <button onClick={() => removeTrack(t.id, audioLib, setAudioLib, S_AP, "audioLib")} style={{ ...btn, padding: 2, borderRadius: 2, color: "#4a4e5e", opacity: 0.3 }}><XIcon size={9} /></button>}</div></div>))}
                {uploadingAudio && <div style={{ padding: "4px 10px", fontSize: 10, color: "#4af0a0", display: "flex", gap: 4 }}><Loader size={10} />アップロード中...</div>}
              </div>

              {/* Recordings */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 500, color: "#7a7e8e", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recordings</span><span style={{ fontSize: 9, color: "#4a4e5e", fontFamily: mf }}>{recLib.length}</span></div>
                {visibleRecLib.length === 0 && <div style={{ padding: "4px 10px", fontSize: 10, color: "#4a4e5e" }}>{q ? "該当なし" : "録音データなし"}</div>}
                {visibleRecLib.map((t) => (<div key={t.id} draggable onDragStart={(e) => { setDragTrackId(t.id); setDragPayload(e, { id: t.id, type: "recording" }); }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const src = getDragPayload(e); if (src.type === "recording") reorderTrack(recLib, setRecLib, "recLib", src.id, t.id); }} onDragEnd={() => setDragTrackId(null)} style={{ display: "flex", alignItems: "center", marginBottom: 2, position: "relative", opacity: dragTrackId === t.id ? 0.4 : 1 }}><button {...trackItemDragProps(t, "recording")} onClick={() => loadAndPlay(t, S_RC)} style={{ ...btn, width: "100%", gap: 6, padding: "5px 10px", borderRadius: 2, textAlign: "left", fontFamily: ff, fontSize: 11, background: activeTrackId === t.id ? "rgba(239,68,68,0.08)" : "transparent", color: activeTrackId === t.id ? "#f87171" : "#7a7e8e", border: activeTrackId === t.id ? "1px solid rgba(239,68,68,0.15)" : "1px solid transparent", cursor: "grab" }}>{activeTrackId === t.id && isPlaying ? <Disc size={12} color="#f87171" style={{ animation: "spin 2s linear infinite" }} /> : <MicIcon size={12} />}<div style={{ flex: 1, minWidth: 0 }}><EditableName name={t.name} onSave={(n) => renameTrk(recLib, setRecLib, "recLib", t.id, n)} style={{ fontSize: 11 }} /><div style={{ fontSize: 9, color: "#4a4e5e" }}>{fmtS(t.size)}</div></div></button><div style={{ position: "absolute", right: 4, display: "flex", gap: 1, alignItems: "center" }}><button onClick={() => toggleTrackLock(recLib, setRecLib, "recLib", t.id)} style={{ ...btn, padding: 2, borderRadius: 2, color: t.locked ? "#4af0a0" : "#3a3a4a" }}>{t.locked ? <Lock size={8} /> : <Unlock size={8} />}</button>{!t.locked && <button onClick={() => removeTrack(t.id, recLib, setRecLib, S_RC, "recLib")} style={{ ...btn, padding: 2, borderRadius: 2, color: "#4a4e5e", opacity: 0.3 }}><XIcon size={9} /></button>}</div></div>))}
              </div>
            </div>
            <div style={{ padding: 12, borderTop: "1px solid #2a2a35", display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => setShowTrash(true)} style={{ ...btn, width: "100%", gap: 8, padding: "5px 10px", borderRadius: 2, color: "#7a7e8e", fontFamily: ff, fontSize: 12 }}><Trash2 size={14} /><span>ゴミ箱</span>{trash.length > 0 && <span style={{ fontSize: 9, background: "#2a2a35", color: "#7a7e8e", padding: "1px 5px", borderRadius: 2, marginLeft: "auto" }}>{trash.length}</span>}</button>
              <button onClick={() => setShowSettings(true)} style={{ ...btn, width: "100%", gap: 8, padding: "5px 10px", borderRadius: 2, color: "#7a7e8e", fontFamily: ff, fontSize: 12 }}><Settings size={14} /><span>設定</span></button>
            </div>
          </div>
        </div>

        {/* MAIN EDITOR */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <SectionNav text={curText} />
          <LyricEditor text={curText} setText={setCurText} onContextMenu={onCtx} />

          {/* Context Menu */}
          {ctxMenu && (<div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 80), zIndex: 999, animation: "ctxFade 0.12s ease-out" }}><div style={{ width: 200, background: "#111116", border: "1px solid #4a4e5e", borderRadius: 2, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}><div style={{ padding: "8px 12px", borderBottom: "1px solid #2a2a35" }}><div style={{ fontSize: 10, color: "#7a7e8e", marginBottom: 3 }}>選択テキスト</div><div style={{ fontSize: 10, color: "#e8a840", fontFamily: mf, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>「{selText}」</div></div><div style={{ padding: "4px 0" }}><button onClick={saveSelToScrap} style={{ ...btn, width: "100%", gap: 8, padding: "8px 12px", fontSize: 11, color: "#c8ccd8", fontFamily: ff, textAlign: "left" }}><Bookmark size={11} /><span>スクラップに保存</span></button></div></div></div>)}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="lw-motion-right-sidebar" data-open={scrapsOpen ? "true" : "false"} style={{ width: scrapsOpen ? 300 : 0, flexShrink: 0, borderLeft: scrapsOpen ? "1px solid #2a2a35" : "1px solid transparent", background: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden", pointerEvents: scrapsOpen ? "auto" : "none" }}>
          <div className="lw-motion-right-sidebar-inner" style={{ width: 300, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Scrap Notes */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #2a2a35", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={13} color="#4af0a0" /><span style={{ fontSize: 11, fontWeight: 500, color: "#c8ccd8" }}>スクラップノート</span><span style={{ fontSize: 9, color: "#4a4e5e", background: "#2a2a35", padding: "1px 5px", borderRadius: 2 }}>{filteredCards.length}</span>
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowTagDrop(!showTagDrop)} style={{ ...btn, gap: 3, padding: "2px 6px", borderRadius: 2, fontSize: 9, color: tagFilter === "all" ? "#7a7e8e" : "#4af0a0", background: tagFilter === "all" ? "transparent" : "rgba(74,240,160,0.08)", border: tagFilter === "all" ? "1px solid #3a3a4a" : "1px solid rgba(74,240,160,0.2)" }}><Tag size={8} />{tagFilter === "all" ? "タグ" : tagFilter}<ChevronDown size={8} /></button>
                    {showTagDrop && (<div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#111116", border: "1px solid #4a4e5e", borderRadius: 2, overflow: "hidden", boxShadow: "0 12px 24px rgba(0,0,0,0.4)", zIndex: 50, minWidth: 120, maxHeight: 200, overflowY: "auto" }}>
                      <button onClick={() => { setTagFilter("all"); setShowTagDrop(false); }} style={{ ...btn, width: "100%", padding: "6px 10px", fontSize: 10, color: tagFilter === "all" ? "#4af0a0" : "#7a7e8e", fontFamily: ff, textAlign: "left", background: tagFilter === "all" ? "rgba(74,240,160,0.08)" : "transparent" }}>すべて</button>
                      {allTags.map((t) => (<button key={t} onClick={() => { setTagFilter(t); setShowTagDrop(false); }} style={{ ...btn, width: "100%", padding: "6px 10px", fontSize: 10, color: tagFilter === t ? "#4af0a0" : "#7a7e8e", fontFamily: ff, textAlign: "left", background: tagFilter === t ? "rgba(74,240,160,0.08)" : "transparent" }}>{t}</button>))}
                    </div>)}
                  </div>
                </div>
                <button onClick={() => setShowScrapInput(!showScrapInput)} style={{ ...btn, padding: 3, borderRadius: 2, color: showScrapInput ? "#4af0a0" : "#7a7e8e" }}><Plus size={13} /></button>
              </div>
              {showScrapInput && (<div style={{ padding: 10, borderBottom: "1px solid #2a2a35", flexShrink: 0 }}><textarea value={scrapInputText} onChange={(e) => setScrapInputText(e.target.value)} placeholder="アイデア、フレーズ、メモ..." rows={2} autoFocus style={{ width: "100%", background: "#111116", border: "1px solid #3a3a4a", borderRadius: 2, padding: "6px 8px", fontSize: 11, color: "#c8ccd8", outline: "none", fontFamily: ff, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box", marginBottom: 6 }} /><input value={scrapInputTags} onChange={(e) => setScrapInputTags(e.target.value)} placeholder="タグ（カンマ区切り）" style={{ width: "100%", background: "#111116", border: "1px solid #3a3a4a", borderRadius: 2, padding: "5px 8px", fontSize: 10, color: "#c8ccd8", outline: "none", fontFamily: ff, boxSizing: "border-box", marginBottom: 6 }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addManualCard(); } }} /><div style={{ display: "flex", gap: 4 }}><button onClick={addManualCard} style={{ flex: 1, padding: "5px 0", borderRadius: 2, border: "none", background: "#4af0a0", color: "#111116", fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: ff }}>追加</button><button onClick={() => { setShowScrapInput(false); setScrapInputText(""); setScrapInputTags(""); }} style={{ flex: 1, padding: "5px 0", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#7a7e8e", fontSize: 10, cursor: "pointer", fontFamily: ff }}>取消</button></div></div>)}
              <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredCards.length === 0 && <div style={{ textAlign: "center", padding: "20px 12px", color: "#4a4e5e", fontSize: 11 }}>＋ボタンで手動追加<br />テキスト選択→右クリック→スクラップ保存</div>}
                {filteredCards.map((c) => (<ScrapCard key={c.id} card={c} onDelete={() => deleteCard(c.id)} />))}
              </div>
            </div>
            <div style={{ height: 1, background: "#2a2a35", flexShrink: 0 }} />
            {/* Memo */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #2a2a35", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}><FileText size={13} color="#4ade80" /><span style={{ fontSize: 11, fontWeight: 500, color: "#c8ccd8" }}>メモ</span></div>
              <div style={{ flex: 1, overflow: "hidden" }}><textarea value={curMemo} onChange={(e) => setCurMemo(e.target.value)} placeholder="自由にメモ..." spellCheck={false} style={{ width: "100%", height: "100%", background: "transparent", color: "#c8ccd8", border: "none", outline: "none", resize: "none", padding: "10px 14px", fontSize: 12, lineHeight: 1.7, fontFamily: ff, boxSizing: "border-box" }} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* AUDIO PLAYER */}
      <div style={{ flexShrink: 0, borderTop: "1px solid #2a2a35", background: "rgba(23,23,23,0.9)", backdropFilter: "blur(12px)", zIndex: 30 }}>
        <div style={{ display: "grid", gridTemplateColumns: "260px minmax(360px, 1fr) 260px", alignItems: "center", gap: 12, padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 2, background: hasSrc ? "#1c1917" : "#2a2a35", border: hasSrc ? "1px solid rgba(74,240,160,0.25)" : "1px solid #4a4e5e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{hasSrc && isPlaying ? <Disc size={15} color="#4af0a0" style={{ animation: "spin 2s linear infinite" }} /> : <MusicIcon size={15} color={hasSrc ? "#4af0a0" : "#7a7e8e"} />}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 500, color: "#c8ccd8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trackName || "トラック未選択"}</div><div style={{ fontSize: 10, color: "#7a7e8e" }}>{hasSrc ? fmtT(curTime) + " / " + fmtT(dur) : ""}</div></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, width: "100%", maxWidth: 620 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, minWidth: 0 }}>
                {nativeRecAvailable && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <div style={{ position: "relative", width: 146 }}>
                    <select value={selectedInputDeviceId} onChange={(e) => setSelectedInputDeviceId(e.target.value)} disabled={isRecording} title={inputError || "入力デバイス"} style={{ appearance: "none", WebkitAppearance: "none", width: "100%", height: 24, background: "#0a0a0a", border: "1px solid #3a3a4a", borderRadius: 2, color: inputError ? "#f87171" : "#7a7e8e", fontSize: 10, fontFamily: ff, padding: "0 18px 0 7px", outline: "none", boxShadow: "none" }}>
                      {inputDevices.length === 0 && <option value="">入力なし</option>}
                      {inputDevices.map((d) => <option key={d.id} value={String(d.id)}>{d.name}{d.is_default ? "（既定）" : ""}{d.max_channels ? ` / ${d.max_channels}ch` : ""}</option>)}
                    </select>
                    <ChevronDown size={10} color="#4a4e5e" style={{ position: "absolute", right: 6, top: 7, pointerEvents: "none" }} />
                  </div>
                  <div title={inputError || (isRecording ? "input " + Math.round(inputLevel * 100) + "%" : "input level")} style={{ width: 38, height: 5, borderRadius: 999, background: "#2a2a35", overflow: "hidden" }}>
                    <div style={{ width: Math.round(inputLevel * 100) + "%", height: "100%", background: inputLevel > 0.75 ? "#ef4444" : inputLevel > 0.25 ? "#4af0a0" : "#22c55e", transition: "width 0.08s linear" }} />
                  </div>
                </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isRecording ? <button onClick={stopRecording} style={{ ...btn, padding: 4, color: "#ef4444" }}><StopCircle size={16} color="#ef4444" fill="#ef4444" /></button> : <button onClick={startRecording} style={{ ...btn, padding: 4, color: "#7a7e8e" }} title="録音（マイク＋トラック）"><MicIcon size={14} /></button>}
                {isRecording && <span style={{ fontSize: 9, color: "#ef4444", fontFamily: mf, animation: "pulse 1s infinite" }}>REC</span>}
                <button onClick={() => { if (audioElRef.current) audioElRef.current.currentTime = Math.max(0, audioElRef.current.currentTime - 5); }} style={{ ...btn, padding: 4, color: hasSrc ? "#7a7e8e" : "#4a4e5e" }}><SkipBack size={14} /></button>
                <button onClick={togglePlay} style={{ ...btn, width: 30, height: 30, borderRadius: "50%", background: hasSrc ? "#c8ccd8" : "#4a4e5e" }}>{isPlaying ? <PauseI size={13} color="#111116" fill="#111116" /> : <Play size={13} color={hasSrc ? "#111116" : "#7a7e8e"} fill={hasSrc ? "#111116" : "#7a7e8e"} style={{ marginLeft: 1 }} />}</button>
                <button onClick={() => { if (audioElRef.current) audioElRef.current.currentTime = Math.min(dur, audioElRef.current.currentTime + 5); }} style={{ ...btn, padding: 4, color: hasSrc ? "#7a7e8e" : "#4a4e5e" }}><SkipForward size={14} /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                <button onClick={() => setRepeatOn(!repeatOn)} style={{ ...btn, padding: 4, color: repeatOn ? "#4af0a0" : "#7a7e8e" }}><RepeatIcon size={12} /></button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", maxWidth: 480 }}>
              <span style={{ width: 30, textAlign: "right", fontFamily: mf, fontSize: 9, color: "#7a7e8e" }}>{fmtT(curTime)}</span>
              <div style={{ flex: 1, position: "relative", height: 14, display: "flex", alignItems: "center" }}><div style={{ width: "100%", height: 3, borderRadius: 999, background: "#4a4e5e", position: "relative" }}><div style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 999, background: "#4af0a0", width: seekPos + "%" }} /></div><input type="range" min={0} max={100} value={seekPos} onChange={(e) => handleSeek(Number(e.target.value))} style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer" }} /></div>
              <span style={{ width: 30, fontFamily: mf, fontSize: 9, color: "#7a7e8e" }}>{fmtT(dur)}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, justifyContent: "flex-end" }}>
            <button onClick={() => setIsMuted(!isMuted)} style={{ ...btn, padding: 5, color: "#7a7e8e" }}>{isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
            <div style={{ width: 64, height: 12, borderRadius: 999, position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }} onMouseDown={(e) => { const bar = e.currentTarget; const calc = (ev) => { const r = bar.getBoundingClientRect(); handleVol(Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100))); }; calc(e); const move = (ev) => calc(ev); const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); }; window.addEventListener("mousemove", move); window.addEventListener("mouseup", up); }}><div style={{ width: "100%", height: 3, borderRadius: 999, background: "#4a4e5e", position: "relative" }}><div style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 999, background: "#7a7e8e", width: isMuted ? "0%" : (volume * 100) + "%" }} /></div></div>
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btn, padding: 5, borderRadius: 2, color: "#7a7e8e" }}><Upload size={13} /></button>
          </div>
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {modal && (<div className="lw-motion-backdrop" onClick={() => setModal(false)} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}><div className="lw-motion-panel" onClick={(e) => e.stopPropagation()} style={{ background: "#111116", border: "1px solid #4a4e5e", borderRadius: 2, width: "100%", maxWidth: 420, margin: "0 16px", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #2a2a35" }}><span style={{ fontSize: 13, fontWeight: 500, color: "#c8ccd8" }}>オーディオソース</span><button onClick={() => setModal(false)} style={{ ...btn, padding: 4, borderRadius: 2, color: "#7a7e8e" }}><XIcon size={15} /></button></div><div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}><div onClick={() => fileInputRef.current?.click()} style={{ border: "2px dashed #4a4e5e", borderRadius: 2, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}><Upload size={18} color="#7a7e8e" /><span style={{ fontSize: 11, color: "#7a7e8e" }}>MP3, WAV, FLAC を選択</span></div>{audioLib.length > 0 && <div><div style={{ fontSize: 11, color: "#7a7e8e", marginBottom: 6 }}>ライブラリから選択</div><div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>{audioLib.map((t) => (<button key={t.id} onClick={() => { loadAndPlay(t, S_AP); setModal(false); }} style={{ ...btn, width: "100%", gap: 6, padding: "7px 8px", borderRadius: 2, textAlign: "left", fontFamily: ff, fontSize: 11, background: activeTrackId === t.id ? "rgba(74,240,160,0.08)" : "#0a0a0a", color: activeTrackId === t.id ? "#4af0a0" : "#c8ccd8", border: "1px solid #2a2a35" }}><Headphones size={12} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span></button>))}</div></div>}</div></div></div>)}

      {/* SETTINGS MODAL */}
      {showSettings && (<div className="lw-motion-backdrop" onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}><div className="lw-motion-panel" onClick={(e) => e.stopPropagation()} style={{ background: "#111116", border: "1px solid #4a4e5e", borderRadius: 2, width: "100%", maxWidth: 440, maxHeight: "80vh", margin: "0 16px", boxShadow: "0 24px 48px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #2a2a35", flexShrink: 0 }}><span style={{ fontSize: 13, fontWeight: 500, color: "#c8ccd8" }}>設定</span><button onClick={() => setShowSettings(false)} style={{ ...btn, padding: 4, borderRadius: 2, color: "#7a7e8e" }}><XIcon size={15} /></button></div><div style={{ padding: 18, overflowY: "auto" }}>
        <AuthUI user={user} onLogin={login} onLogout={logout} syncStatus={syncStatus} hasSupabase={hasSupabase} />
        <NativeUpdaterPanel />
        <div style={{ borderTop: "1px solid #2a2a35", paddingTop: 16, marginTop: 16 }}><div style={{ fontSize: 12, color: "#c8ccd8", marginBottom: 4 }}>データ管理</div><div style={{ fontSize: 11, color: "#7a7e8e", marginBottom: 12 }}>すべてのデータを初期状態にリセット（取消不可）</div><button onClick={() => setConfirmReset(true)} style={{ padding: "7px 14px", borderRadius: 2, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: ff }}>リセット</button><div style={{ borderTop: "1px solid #2a2a35", paddingTop: 14, marginTop: 14 }}><div style={{ fontSize: 11, color: "#7a7e8e" }}>プロジェクト: {projects.length} / スクラップ: {cards.length} / 音楽: {audioLib.length} / 録音: {recLib.length}</div></div></div>
      </div></div></div>)}

      {/* CONFIRM RESET */}
      {confirmReset && (<div className="lw-motion-backdrop" onClick={() => setConfirmReset(false)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}><div className="lw-motion-panel" onClick={(e) => e.stopPropagation()} style={{ background: "#111116", border: "1px solid #4a4e5e", borderRadius: 2, padding: 24, width: "100%", maxWidth: 340, margin: "0 16px", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#c8ccd8", marginBottom: 8 }}>本当にリセットしますか？</div>
        <div style={{ fontSize: 12, color: "#7a7e8e", marginBottom: 20, lineHeight: 1.5 }}>すべてのプロジェクト・歌詞・スクラップ・メモ・音楽・録音データが完全に削除されます。この操作は取り消せません。</div>
        <div style={{ display: "flex", gap: 8 }}><button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: "10px", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#7a7e8e", fontSize: 13, cursor: "pointer", fontFamily: ff }}>キャンセル</button><button onClick={() => { setConfirmReset(false); resetAll(); }} style={{ flex: 1, padding: "10px", borderRadius: 2, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>リセット</button></div>
      </div></div>)}

      {/* TRASH MODAL */}
      {showTrash && (<div className="lw-motion-backdrop" onClick={() => setShowTrash(false)} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}><div className="lw-motion-panel" onClick={(e) => e.stopPropagation()} style={{ background: "#111116", border: "1px solid #4a4e5e", borderRadius: 2, width: "100%", maxWidth: 480, maxHeight: "80vh", margin: "0 16px", boxShadow: "0 24px 48px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #2a2a35", flexShrink: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Trash2 size={15} color="#7a7e8e" /><span style={{ fontSize: 13, fontWeight: 500, color: "#c8ccd8" }}>ゴミ箱</span><span style={{ fontSize: 10, color: "#4a4e5e" }}>{trash.length}件</span></div><button onClick={() => setShowTrash(false)} style={{ ...btn, padding: 4, borderRadius: 2, color: "#7a7e8e" }}><XIcon size={15} /></button></div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {trash.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#4a4e5e", fontSize: 12 }}>ゴミ箱は空です</div>}
          {trash.map(item => (<div key={item.id} style={{ background: "#0a0a0a", border: "1px solid #2a2a35", borderRadius: 2, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 2, background: item.type === "project" ? "rgba(59,130,246,0.1)" : item.type === "audio" ? "rgba(74,240,160,0.1)" : "rgba(239,68,68,0.1)", color: item.type === "project" ? "#3b82f6" : item.type === "audio" ? "#4af0a0" : "#f87171", border: "1px solid " + (item.type === "project" ? "rgba(59,130,246,0.2)" : item.type === "audio" ? "rgba(74,240,160,0.2)" : "rgba(239,68,68,0.2)") }}>{item.type === "project" ? "プロジェクト" : item.type === "audio" ? "音楽" : "録音"}</span>
                <span style={{ fontSize: 12, color: "#c8ccd8" }}>{item.type === "project" ? item.data.project?.title : item.data.track?.name}</span>
              </div>
              <span style={{ fontSize: 9, color: "#4a4e5e", fontFamily: mf }}>残り{daysLeft(item.deletedAt)}日</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => restoreFromTrash(item.id)} style={{ padding: "4px 10px", borderRadius: 2, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", color: "#4ade80", fontSize: 10, cursor: "pointer", fontFamily: ff }}>復元</button>
              <button onClick={() => permanentDelete(item.id)} style={{ padding: "4px 10px", borderRadius: 2, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 10, cursor: "pointer", fontFamily: ff }}>完全に削除</button>
            </div>
          </div>))}
        </div>
        {trash.length > 0 && <div style={{ padding: "10px 14px", borderTop: "1px solid #2a2a35", flexShrink: 0 }}><button onClick={emptyTrash} style={{ width: "100%", padding: "8px", borderRadius: 2, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: ff }}>ゴミ箱を空にする</button></div>}
      </div></div>)}
      <NativeUpdaterToast />
    </div>
  );
}
