import { useState, useEffect, useRef, useCallback } from "react";
import { signInWithGoogle, signOut, getUser, onAuthChange, pullFromCloud, pushToCloud, subscribeToChanges, uploadAudioToCloud, deleteAudioFromCloud, renderGoogleLoginButton } from "./sync.js";
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
    (async () => {
      try {
        const u = await Promise.race([
          getUser(),
          new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);
        setUser(u);
      } catch (e) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
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
    await signOut(); setUser(null); setBilling({ profile: null, isPro: false, loading: false, error: null }); setSyncStatus("idle");
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
export function AuthUI({ user, onLogin, onLogout, syncStatus, hasSupabase, billing, onUpgrade, onManageBilling, onRefreshBilling, compact = false, hideLoginTitle = false }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [hasWebGoogleButton, setHasWebGoogleButton] = useState(false);
  const googleButtonRef = useRef(null);

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
        <div style={{ fontSize: 11, color: "#7a7e8e", lineHeight: 1.5, marginBottom: 10 }}>{isPro ? "すべての機能とクラウド同期が利用できます。" : "Freeは5プロジェクト、音源3曲、録音3件まで。同じGoogleアカウントで同期できます。"}</div>
        {error && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 6 }}>
          {isPro ? <button onClick={handleManage} disabled={billingLoading} style={{ flex: 1, padding: "8px 0", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#c8ccd8", fontSize: 11, cursor: "pointer", fontFamily: ff }}>支払い管理</button> : <button onClick={handleUpgrade} disabled={billingLoading} style={{ flex: 1, padding: "8px 0", borderRadius: 2, border: "none", background: "#4af0a0", color: "#111116", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Proにする（月500円）</button>}
          <button onClick={onRefreshBilling} disabled={billingLoading || billing?.loading} style={{ padding: "8px 10px", borderRadius: 2, border: "1px solid #3a3a4a", background: "transparent", color: "#7a7e8e", fontSize: 11, cursor: "pointer", fontFamily: ff }}>更新</button>
        </div>
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

export function AuthGate({ user, onLogin, onLogout, syncStatus, hasSupabase, billing, onUpgrade, onManageBilling, onRefreshBilling }) {
  return (
    <div style={{ fontFamily: ff, minHeight: "100vh", width: "100%", display: "grid", placeItems: "center", background: "#0a0a0d", color: "#c8ccd8", padding: 20, boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 420, border: "1px solid #2a2a35", background: "#111116", borderRadius: 2, boxShadow: "0 24px 64px rgba(0,0,0,0.45)", overflow: "hidden" }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #2a2a35" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4af0a0", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>// LYRIC WORKSPACE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#c8ccd8", marginBottom: 8 }}>Googleログインが必要です</div>
        </div>
        <AuthUI user={user} onLogin={onLogin} onLogout={onLogout} syncStatus={syncStatus} hasSupabase={hasSupabase} billing={billing} onUpgrade={onUpgrade} onManageBilling={onManageBilling} onRefreshBilling={onRefreshBilling} hideLoginTitle />
      </div>
    </div>
  );
}
