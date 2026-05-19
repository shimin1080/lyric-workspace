import { useState, useEffect, useRef, useCallback } from "react";
import { signInWithGoogle, signOut, getUser, onAuthChange, pullFromCloud, pushToCloud, subscribeToChanges, uploadAudioToCloud, deleteAudioFromCloud, renderGoogleLoginButton } from "./sync.js";
import { supabase } from "./supabase.js";

const ff = "'Courier New', 'JetBrains Mono', ui-monospace, Menlo, monospace";

// Hook: useAuth with realtime sync + audio sync
// onRemoteData: (data) => void — called when data changes from another device
// onAudioSync: (userId, audioLib, recLib) => Promise — called after login to download missing audio
export function useAuth(onRemoteData, onAudioSync) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("idle");
  const subRef = useRef(null);
  const pushTimerRef = useRef(null);
  const ignoreNextRemote = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const sessionResult = await Promise.race([
          supabase?.auth.getSession(),
          new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 10000)),
        ]);
        setUser(sessionResult?.data?.session?.user || await getUser());
      } catch (e) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
    const { data: { subscription } } = onAuthChange((event, session) => { setUser(session?.user || null); });
    return () => subscription.unsubscribe();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; }
    if (!user) return;
    subRef.current = subscribeToChanges(user.id, (data) => {
      if (ignoreNextRemote.current) { ignoreNextRemote.current = false; return; }
      if (data && onRemoteData) { onRemoteData(data); setSyncStatus("synced"); setTimeout(() => setSyncStatus("idle"), 2000); }
    });
    return () => { if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; } };
  }, [user, onRemoteData]);

  const login = async () => {
    setSyncStatus("syncing");
    const result = await signInWithGoogle();
    if (result.error) {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } else {
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 2000);
    }
    return result;
  };

  const logout = async () => {
    if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; }
    await signOut(); setUser(null); setSyncStatus("idle");
  };

  const push = useCallback(async (data) => {
    if (!user) return { ok: false };
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    ignoreNextRemote.current = true;
    setSyncStatus("syncing");
    const result = await pushToCloud(user.id, data);
    if (result.conflict && result.remote && onRemoteData) {
      await onRemoteData(result.remote);
    }
    setSyncStatus(result.ok || result.conflict ? "synced" : "error");
    setTimeout(() => setSyncStatus("idle"), 2000);
    return result;
  }, [user, onRemoteData]);

  // Immediate push (no debounce) for destructive ops like trash empty
  const pushNow = useCallback(async (data) => {
    if (!user) return { ok: false };
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    ignoreNextRemote.current = true;
    setSyncStatus("syncing");
    const result = await pushToCloud(user.id, data);
    if (result.conflict && result.remote && onRemoteData) {
      await onRemoteData(result.remote);
    }
    setSyncStatus(result.ok || result.conflict ? "synced" : "error");
    setTimeout(() => setSyncStatus("idle"), 2000);
    return result;
  }, [user, onRemoteData]);

  // Audio cloud helpers (exposed for App/Mobile to call on upload/delete)
  const pushAudio = useCallback(async (audioId, base64) => {
    if (!user) return; await uploadAudioToCloud(user.id, audioId, base64);
  }, [user]);

  const removeAudio = useCallback(async (audioId) => {
    if (!user) return; await deleteAudioFromCloud(user.id, audioId);
  }, [user]);

  return { user, authLoading, syncStatus, login, logout, push, pushNow, pushAudio, removeAudio, hasSupabase: !!supabase };
}

// Sync status badge
export function SyncBadge({ syncStatus, user }) {
  if (!user) return null;
  const configs = {
    idle: { color: "#4a4e5e", text: "☁ 同期済み" },
    syncing: { color: "#4af0a0", text: "☁ 同期中..." },
    synced: { color: "#4ade80", text: "☁ 同期完了" },
    error: { color: "#f87171", text: "☁ 同期エラー" },
  };
  const c = configs[syncStatus] || configs.idle;
  return <span style={{ fontSize: 10, color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>{c.text}</span>;
}

// Login/Register UI
export function AuthUI({ user, onLogin, onLogout, syncStatus, hasSupabase, compact = false, hideLoginTitle = false }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasWebGoogleButton, setHasWebGoogleButton] = useState(false);
  const googleButtonRef = useRef(null);

  if (!hasSupabase) {
    return (<div style={{ padding: compact ? 0 : 16 }}><div style={{ fontSize: 13, color: "#c8ccd8", marginBottom: 8, fontWeight: 500 }}>アカウント同期</div><div style={{ fontSize: 12, color: "#7a7e8e", lineHeight: 1.6 }}>Supabaseの設定が必要です。</div></div>);
  }

  if (user) {
    return (<div style={{ padding: compact ? 0 : 16 }}>
      <div style={{ fontSize: 13, color: "#c8ccd8", marginBottom: 12, fontWeight: 500 }}>アカウント</div>
      <div style={{ background: "#111116", borderRadius: 2, border: "1px solid #2a2a35", padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#7a7e8e", marginBottom: 4 }}>ログイン中</div>
        <div style={{ fontSize: 13, color: "#c8ccd8", wordBreak: "break-all" }}>{user.email}</div>
      </div>
      <div style={{ background: "rgba(74,240,160,0.08)", border: "1px solid rgba(74,240,160,0.2)", borderRadius: 2, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#4af0a0", fontWeight: 600, marginBottom: 6 }}>Beta</div>
        <div style={{ fontSize: 11, color: "#7a7e8e", lineHeight: 1.5 }}>現在はすべての機能を無料で利用できます。データと音源は同じGoogleアカウントで同期されます。</div>
      </div>
      <SyncBadge syncStatus={syncStatus} user={user} />
      <button onClick={onLogout} style={{ width: "100%", padding: "10px 0", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#7a7e8e", fontSize: 13, cursor: "pointer", fontFamily: ff, marginTop: 12 }}>ログアウト</button>
    </div>);
  }

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    const result = await onLogin();
    setLoading(false);
    if (result.error) setError(result.error);
  };

  useEffect(() => {
    if (!hasSupabase || user || !googleButtonRef.current) return;
    let cancelled = false;
    renderGoogleLoginButton(googleButtonRef.current, (result) => {
      if (cancelled) return;
      setLoading(false);
      if (result?.error) setError(result.error);
    }).then((rendered) => {
      if (!cancelled) setHasWebGoogleButton(rendered);
    }).catch(() => {
      if (!cancelled) setHasWebGoogleButton(false);
    });
    return () => { cancelled = true; };
  }, [hasSupabase, user]);

  return (<div style={{ padding: compact ? 0 : 16 }}>
    {!hideLoginTitle && <div style={{ fontSize: 13, color: "#c8ccd8", marginBottom: 16, fontWeight: 500 }}>Googleログインが必要です</div>}
    {error && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{error}</div>}
    <div ref={googleButtonRef} style={{ display: hasWebGoogleButton ? "flex" : "none", width: "100%", justifyContent: "center", minHeight: 44, overflow: "hidden" }} />
    <button onClick={handleSubmit} disabled={loading} style={{ display: hasWebGoogleButton ? "none" : "flex", width: "100%", padding: "12px", borderRadius: 2, border: "1px solid #3a3a4a", background: "#c8ccd8", color: "#111116", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: ff, opacity: loading ? 0.6 : 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
      <span style={{ width: 20, height: 20, borderRadius: 2, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#4285f4", fontSize: 14, fontWeight: 700, fontFamily: "Arial, sans-serif" }}>G</span>
      {loading ? "Googleへ接続中..." : "Googleでログイン"}
    </button>
  </div>);
}

export function AuthGate({ user, onLogin, onLogout, syncStatus, hasSupabase }) {
  return (
    <div style={{ fontFamily: ff, minHeight: "100vh", width: "100%", display: "grid", placeItems: "center", background: "#0a0a0d", color: "#c8ccd8", padding: 20, boxSizing: "border-box" }}>
      <div className="lw-motion-panel" style={{ width: "100%", maxWidth: 420, border: "1px solid #2a2a35", background: "#111116", borderRadius: 2, boxShadow: "0 24px 64px rgba(0,0,0,0.45)", overflow: "hidden" }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #2a2a35" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4af0a0", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>// LYRIC WORKSPACE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#c8ccd8", marginBottom: 8 }}>Googleログインが必要です</div>
        </div>
        <AuthUI user={user} onLogin={onLogin} onLogout={onLogout} syncStatus={syncStatus} hasSupabase={hasSupabase} hideLoginTitle />
      </div>
    </div>
  );
}
