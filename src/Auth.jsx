import { useState, useEffect, useRef, useCallback } from "react";
import { signInWithGoogle, signOut, getUser, onAuthChange, pullFromCloud, pushToCloud, subscribeToChanges, uploadAudioToCloud, deleteAudioFromCloud } from "./sync.js";
import { supabase } from "./supabase.js";
import { createBillingPortalSession, createCheckoutSession, getBillingStatus, openBillingUrl } from "./billing.js";

const ff = "'Courier New', 'JetBrains Mono', ui-monospace, Menlo, monospace";

// Hook: useAuth with realtime sync + audio sync
// onRemoteData: (data) => void — called when data changes from another device
// onAudioSync: (userId, audioLib, recLib) => Promise — called after login to download missing audio
export function useAuth(onRemoteData, onAudioSync) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [billing, setBilling] = useState({ profile: null, isPro: false, loading: true, error: null });
  const subRef = useRef(null);
  const pushTimerRef = useRef(null);
  const ignoreNextRemote = useRef(false);

  useEffect(() => {
    (async () => { const u = await getUser(); setUser(u); setAuthLoading(false); })();
    const { data: { subscription } } = onAuthChange((event, session) => { setUser(session?.user || null); });
    return () => subscription.unsubscribe();
  }, []);

  const refreshBilling = useCallback(async () => {
    if (!user) {
      setBilling({ profile: null, isPro: false, loading: false, error: null });
      return { isPro: false };
    }
    setBilling((prev) => ({ ...prev, loading: true, error: null }));
    const status = await getBillingStatus();
    setBilling({ ...status, loading: false });
    return status;
  }, [user]);

  useEffect(() => {
    refreshBilling();
  }, [refreshBilling]);

  // Realtime subscription
  useEffect(() => {
    if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; }
    if (!user || !billing.isPro) return;
    subRef.current = subscribeToChanges(user.id, (data) => {
      if (ignoreNextRemote.current) { ignoreNextRemote.current = false; return; }
      if (data && onRemoteData) { onRemoteData(data); setSyncStatus("synced"); setTimeout(() => setSyncStatus("idle"), 2000); }
    });
    return () => { if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; } };
  }, [user, billing.isPro, onRemoteData]);

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
    await signOut(); setUser(null); setBilling({ profile: null, isPro: false, loading: false, error: null }); setSyncStatus("idle");
  };

  // Debounced push (text data only, audio pushed separately)
  const push = useCallback(async (data) => {
    if (!user || !billing.isPro) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      ignoreNextRemote.current = true;
      setSyncStatus("syncing");
      const ok = await pushToCloud(user.id, data);
      setSyncStatus(ok ? "synced" : "error");
      setTimeout(() => setSyncStatus("idle"), 2000);
    }, 1500);
  }, [user, billing.isPro]);

  // Immediate push (no debounce) for destructive ops like trash empty
  const pushNow = useCallback(async (data) => {
    if (!user || !billing.isPro) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    ignoreNextRemote.current = true;
    setSyncStatus("syncing");
    const ok = await pushToCloud(user.id, data);
    setSyncStatus(ok ? "synced" : "error");
    setTimeout(() => setSyncStatus("idle"), 2000);
  }, [user, billing.isPro]);

  // Audio cloud helpers (exposed for App/Mobile to call on upload/delete)
  const pushAudio = useCallback(async (audioId, base64) => {
    if (!user || !billing.isPro) return; await uploadAudioToCloud(user.id, audioId, base64);
  }, [user, billing.isPro]);

  const removeAudio = useCallback(async (audioId) => {
    if (!user || !billing.isPro) return; await deleteAudioFromCloud(user.id, audioId);
  }, [user, billing.isPro]);

  const startUpgrade = useCallback(async () => {
    const result = await createCheckoutSession();
    if (result.url) await openBillingUrl(result.url);
    return result;
  }, []);

  const manageBilling = useCallback(async () => {
    const result = await createBillingPortalSession();
    if (result.url) await openBillingUrl(result.url);
    return result;
  }, []);

  return { user, authLoading, syncStatus, login, logout, push, pushNow, pushAudio, removeAudio, hasSupabase: !!supabase, billing, isPro: billing.isPro, refreshBilling, startUpgrade, manageBilling };
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
export function AuthUI({ user, onLogin, onLogout, syncStatus, hasSupabase, billing, onUpgrade, onManageBilling, onRefreshBilling, compact = false }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  if (!hasSupabase) {
    return (<div style={{ padding: compact ? 0 : 16 }}><div style={{ fontSize: 13, color: "#c8ccd8", marginBottom: 8, fontWeight: 500 }}>アカウント同期</div><div style={{ fontSize: 12, color: "#7a7e8e", lineHeight: 1.6 }}>Supabaseの設定が必要です。</div></div>);
  }

  if (user) {
    const isPro = billing?.isPro;
    const billingStatus = billing?.profile?.subscription_status;
    const handleUpgrade = async () => {
      setError(""); setBillingLoading(true);
      const result = await onUpgrade?.();
      setBillingLoading(false);
      if (result?.error) setError(result.error);
    };
    const handleManage = async () => {
      setError(""); setBillingLoading(true);
      const result = await onManageBilling?.();
      setBillingLoading(false);
      if (result?.error) setError(result.error);
    };
    return (<div style={{ padding: compact ? 0 : 16 }}>
      <div style={{ fontSize: 13, color: "#c8ccd8", marginBottom: 12, fontWeight: 500 }}>アカウント</div>
      <div style={{ background: "#111116", borderRadius: 2, border: "1px solid #2a2a35", padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#7a7e8e", marginBottom: 4 }}>ログイン中</div>
        <div style={{ fontSize: 13, color: "#c8ccd8", wordBreak: "break-all" }}>{user.email}</div>
      </div>
      <div style={{ background: isPro ? "rgba(74,240,160,0.08)" : "#0a0a0a", border: isPro ? "1px solid rgba(74,240,160,0.24)" : "1px solid #2a2a35", borderRadius: 2, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: isPro ? "#4af0a0" : "#c8ccd8", fontWeight: 600 }}>{isPro ? "Pro" : "Free"}</span>
          {billingStatus && <span style={{ fontSize: 9, color: "#7a7e8e", fontFamily: "'JetBrains Mono', monospace" }}>{billingStatus}</span>}
        </div>
        <div style={{ fontSize: 11, color: "#7a7e8e", lineHeight: 1.5, marginBottom: 10 }}>{isPro ? "すべての機能とクラウド同期が利用できます。" : "Freeは5プロジェクト、音源3曲、録音3件、ローカル保存のみです。"}</div>
        {error && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 6 }}>
          {isPro ? <button onClick={handleManage} disabled={billingLoading} style={{ flex: 1, padding: "8px 0", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#c8ccd8", fontSize: 11, cursor: "pointer", fontFamily: ff }}>支払い管理</button> : <button onClick={handleUpgrade} disabled={billingLoading} style={{ flex: 1, padding: "8px 0", borderRadius: 2, border: "none", background: "#4af0a0", color: "#111116", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Proにする（月500円）</button>}
          <button onClick={onRefreshBilling} disabled={billingLoading || billing?.loading} style={{ padding: "8px 10px", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#7a7e8e", fontSize: 11, cursor: "pointer", fontFamily: ff }}>更新</button>
        </div>
      </div>
      {isPro ? <SyncBadge syncStatus={syncStatus} user={user} /> : <div style={{ fontSize: 10, color: "#4a4e5e", fontFamily: "'JetBrains Mono', monospace" }}>ローカル保存</div>}
      <button onClick={onLogout} style={{ width: "100%", padding: "10px 0", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#7a7e8e", fontSize: 13, cursor: "pointer", fontFamily: ff, marginTop: 12 }}>ログアウト</button>
    </div>);
  }

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    const result = await onLogin();
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (<div style={{ padding: compact ? 0 : 16 }}>
    <div style={{ fontSize: 13, color: "#c8ccd8", marginBottom: 4, fontWeight: 500 }}>Googleアカウント</div>
    <div style={{ fontSize: 11, color: "#7a7e8e", marginBottom: 16 }}>ログインすると、複数端末でデータと音源が同期されます</div>
    {error && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{error}</div>}
    <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 2, border: "1px solid #3a3a4a", background: "#c8ccd8", color: "#111116", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: ff, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <span style={{ width: 20, height: 20, borderRadius: 2, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#4285f4", fontSize: 14, fontWeight: 700, fontFamily: "Arial, sans-serif" }}>G</span>
      {loading ? "Googleへ接続中..." : "Googleでログイン"}
    </button>
  </div>);
}
