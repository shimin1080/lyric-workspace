import { useState, useEffect, useRef, useCallback } from "react";
import { signUp, signIn, signOut, getUser, onAuthChange, pullFromCloud, pushToCloud, subscribeToChanges, uploadAudioToCloud, deleteAudioFromCloud } from "./sync.js";
import { supabase } from "./supabase.js";

const ff = "'Noto Sans JP', sans-serif";

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
    (async () => { const u = await getUser(); setUser(u); setAuthLoading(false); })();
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

  const login = async (email, password) => {
    const result = await signIn(email, password);
    if (result.user) {
      setUser(result.user);
      setSyncStatus("syncing");
      const pullResult = await pullFromCloud(result.user.id);
      if (pullResult.error) { setSyncStatus("error"); setTimeout(() => setSyncStatus("idle"), 3000); }
      else if (pullResult.data) {
        if (onRemoteData) onRemoteData(pullResult.data);
        // Sync audio files after data is applied
        if (onAudioSync && pullResult.data.audioLib && pullResult.data.recLib) {
          await onAudioSync(result.user.id, pullResult.data.audioLib, pullResult.data.recLib);
        }
        setSyncStatus("synced"); setTimeout(() => setSyncStatus("idle"), 2000);
      } else { setSyncStatus("idle"); }
    }
    return result;
  };

  const register = async (email, password) => { return await signUp(email, password); };

  const logout = async () => {
    if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; }
    await signOut(); setUser(null); setSyncStatus("idle");
  };

  // Debounced push (text data only, audio pushed separately)
  const push = useCallback(async (data) => {
    if (!user) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      ignoreNextRemote.current = true;
      setSyncStatus("syncing");
      const ok = await pushToCloud(user.id, data);
      setSyncStatus(ok ? "synced" : "error");
      setTimeout(() => setSyncStatus("idle"), 2000);
    }, 1500);
  }, [user]);

  // Immediate push (no debounce) for destructive ops like trash empty
  const pushNow = useCallback(async (data) => {
    if (!user) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    ignoreNextRemote.current = true;
    setSyncStatus("syncing");
    const ok = await pushToCloud(user.id, data);
    setSyncStatus(ok ? "synced" : "error");
    setTimeout(() => setSyncStatus("idle"), 2000);
  }, [user]);

  // Audio cloud helpers (exposed for App/Mobile to call on upload/delete)
  const pushAudio = useCallback(async (audioId, base64) => {
    if (!user) return; await uploadAudioToCloud(user.id, audioId, base64);
  }, [user]);

  const removeAudio = useCallback(async (audioId) => {
    if (!user) return; await deleteAudioFromCloud(user.id, audioId);
  }, [user]);

  return { user, authLoading, syncStatus, login, register, logout, push, pushNow, pushAudio, removeAudio, hasSupabase: !!supabase };
}

// Sync status badge
export function SyncBadge({ syncStatus, user }) {
  if (!user) return null;
  const configs = {
    idle: { color: "#525252", text: "☁ 同期済み" },
    syncing: { color: "#fbbf24", text: "☁ 同期中..." },
    synced: { color: "#4ade80", text: "☁ 同期完了" },
    error: { color: "#f87171", text: "☁ 同期エラー" },
  };
  const c = configs[syncStatus] || configs.idle;
  return <span style={{ fontSize: 10, color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>{c.text}</span>;
}

// Login/Register UI
export function AuthUI({ user, onLogin, onRegister, onLogout, syncStatus, hasSupabase, compact = false }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  if (!hasSupabase) {
    return (<div style={{ padding: compact ? 0 : 16 }}><div style={{ fontSize: 13, color: "#e5e5e5", marginBottom: 8, fontWeight: 500 }}>アカウント同期</div><div style={{ fontSize: 12, color: "#737373", lineHeight: 1.6 }}>Supabaseの設定が必要です。</div></div>);
  }

  if (registered) {
    return (<div style={{ padding: compact ? 0 : 16 }}>
      <div style={{ fontSize: 13, color: "#e5e5e5", marginBottom: 12, fontWeight: 500 }}>メール確認</div>
      <div style={{ background: "#171717", borderRadius: 10, border: "1px solid rgba(74,222,128,0.2)", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 24, textAlign: "center", marginBottom: 8 }}>📧</div>
        <div style={{ fontSize: 13, color: "#4ade80", textAlign: "center", marginBottom: 8, fontWeight: 500 }}>確認メールを送信しました</div>
        <div style={{ fontSize: 12, color: "#a3a3a3", textAlign: "center", lineHeight: 1.6 }}>登録したメールアドレスに確認メールが届いています。<br />メール内のリンクをクリックしてアカウントを有効化してください。</div>
      </div>
      <button onClick={() => { setRegistered(false); setMode("login"); setEmail(""); setPassword(""); }} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "#fbbf24", color: "#171717", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>ログイン画面へ</button>
    </div>);
  }

  if (user) {
    return (<div style={{ padding: compact ? 0 : 16 }}>
      <div style={{ fontSize: 13, color: "#e5e5e5", marginBottom: 12, fontWeight: 500 }}>アカウント</div>
      <div style={{ background: "#171717", borderRadius: 10, border: "1px solid #262626", padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 4 }}>ログイン中</div>
        <div style={{ fontSize: 13, color: "#e5e5e5", wordBreak: "break-all" }}>{user.email}</div>
      </div>
      <div style={{ fontSize: 11, color: "#525252", marginBottom: 12, lineHeight: 1.5 }}>データと音源は自動的にクラウドと同期されます。</div>
      <SyncBadge syncStatus={syncStatus} user={user} />
      <button onClick={onLogout} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#a3a3a3", fontSize: 13, cursor: "pointer", fontFamily: ff, marginTop: 12 }}>ログアウト</button>
    </div>);
  }

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    const result = mode === "login" ? await onLogin(email, password) : await onRegister(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
    else if (mode === "register") setRegistered(true);
  };

  return (<div style={{ padding: compact ? 0 : 16 }}>
    <div style={{ fontSize: 13, color: "#e5e5e5", marginBottom: 4, fontWeight: 500 }}>アカウント</div>
    <div style={{ fontSize: 11, color: "#737373", marginBottom: 16 }}>ログインすると、複数端末でデータと音源がリアルタイム同期されます</div>
    <div style={{ display: "flex", marginBottom: 16, borderRadius: 8, overflow: "hidden", border: "1px solid #333" }}>
      <button onClick={() => { setMode("login"); setError(""); }} style={{ flex: 1, padding: "8px 0", background: mode === "login" ? "#262626" : "transparent", color: mode === "login" ? "#e5e5e5" : "#737373", border: "none", cursor: "pointer", fontSize: 12, fontFamily: ff }}>ログイン</button>
      <button onClick={() => { setMode("register"); setError(""); }} style={{ flex: 1, padding: "8px 0", background: mode === "register" ? "#262626" : "transparent", color: mode === "register" ? "#e5e5e5" : "#737373", border: "none", cursor: "pointer", fontSize: 12, fontFamily: ff }}>新規登録</button>
    </div>
    <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", background: "#171717", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", fontSize: 16, color: "#e5e5e5", outline: "none", fontFamily: ff, boxSizing: "border-box", marginBottom: 8 }} />
    <input type="password" placeholder="パスワード（6文字以上）" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={{ width: "100%", background: "#171717", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", fontSize: 16, color: "#e5e5e5", outline: "none", fontFamily: ff, boxSizing: "border-box", marginBottom: 12 }} />
    {error && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{error}</div>}
    <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "#fbbf24", color: "#171717", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: ff, opacity: loading ? 0.6 : 1 }}>
      {loading ? "処理中..." : mode === "login" ? "ログイン" : "新規登録"}
    </button>
  </div>);
}
