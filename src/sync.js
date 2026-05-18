import { supabase } from "./supabase.js";

const BUCKET = "audio";
const DESKTOP_AUTH_REDIRECT = "lyric-workspace://auth/callback";
const GOOGLE_DESKTOP_CLIENT_ID = "384809706283-0nu7ji3j7vflh4m7u7a4majgkm5nfddp.apps.googleusercontent.com";
const GOOGLE_WEB_DEFAULT_CLIENT_ID = "384809706283-9hfsce08oovfs5csiuem7i99qqna3guq.apps.googleusercontent.com";
const GOOGLE_NATIVE_CLIENT_ID = import.meta.env.VITE_GOOGLE_NATIVE_CLIENT_ID || GOOGLE_DESKTOP_CLIENT_ID;
const GOOGLE_NATIVE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_NATIVE_CLIENT_SECRET || "";
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_DEFAULT_CLIENT_ID;

function resolvedNativeClientId() {
  return GOOGLE_NATIVE_CLIENT_ID === GOOGLE_WEB_DEFAULT_CLIENT_ID ? GOOGLE_DESKTOP_CLIENT_ID : GOOGLE_NATIVE_CLIENT_ID;
}

function resolvedNativeClientSecret(clientId) {
  return clientId === GOOGLE_DESKTOP_CLIENT_ID ? "" : GOOGLE_NATIVE_CLIENT_SECRET;
}

function resolvedWebClientId() {
  return GOOGLE_WEB_CLIENT_ID === GOOGLE_DESKTOP_CLIENT_ID ? GOOGLE_WEB_DEFAULT_CLIENT_ID : GOOGLE_WEB_CLIENT_ID;
}

async function isTauriApp() {
  if (typeof window !== "undefined" && (window.__TAURI_INTERNALS__ || window.__TAURI__)) return true;
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    return typeof isTauri === "function" ? isTauri() : false;
  } catch (e) {
    return false;
  }
}

// ── Data sync ─────────────────────────────────

export async function pushToCloud(userId, data) {
  if (!supabase || !userId) return false;
  try {
    const { error } = await supabase
      .from("user_data")
      .upsert(
        { user_id: userId, data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) { console.error("Push error:", error); return false; }
    return true;
  } catch (e) { console.error("Push error:", e); return false; }
}

export async function pullFromCloud(userId) {
  if (!supabase || !userId) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("data, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) { console.error("Pull error:", error); return { data: null, error: error.message }; }
    return { data: data?.data || null, error: null };
  } catch (e) { console.error("Pull error:", e); return { data: null, error: e.message }; }
}

export function subscribeToChanges(userId, onDataChange) {
  if (!supabase || !userId) return { unsubscribe: () => {} };
  const channel = supabase
    .channel("user_data_changes")
    .on("postgres_changes", {
      event: "*", schema: "public", table: "user_data",
      filter: "user_id=eq." + userId
    }, (payload) => {
      if (payload.new && payload.new.data) onDataChange(payload.new.data);
    })
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}

// ── Audio sync (Supabase Storage) ─────────────

function base64ToBlob(base64DataUrl) {
  const [header, b64] = base64DataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "audio/webm";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function uploadAudioToCloud(userId, audioId, base64DataUrl) {
  if (!supabase || !userId) return false;
  try {
    const blob = base64ToBlob(base64DataUrl);
    const path = userId + "/" + audioId;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true });
    if (error) { console.error("Audio upload error:", error); return false; }
    return true;
  } catch (e) { console.error("Audio upload error:", e); return false; }
}

export async function downloadAudioFromCloud(userId, audioId) {
  if (!supabase || !userId) return null;
  try {
    const path = userId + "/" + audioId;
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error) { console.error("Audio download error:", error); return null; }
    return await blobToBase64(data);
  } catch (e) { console.error("Audio download error:", e); return null; }
}

export async function deleteAudioFromCloud(userId, audioId) {
  if (!supabase || !userId) return false;
  try {
    const path = userId + "/" + audioId;
    await supabase.storage.from(BUCKET).remove([path]);
    return true;
  } catch (e) { console.error("Audio delete error:", e); return false; }
}

// Download all missing audio files on login
export async function syncAudioOnLogin(userId, audioLib, recLib, localLoadAudio, localSaveAudio, S_AP, S_RC, cacheRef) {
  if (!supabase || !userId) return;
  const all = [
    ...audioLib.map(t => ({ ...t, prefix: S_AP })),
    ...recLib.map(t => ({ ...t, prefix: S_RC }))
  ];
  for (const track of all) {
    // Check if already local
    let local = cacheRef.current[track.id];
    if (!local) {
      try { local = await localLoadAudio(track.prefix + track.id); } catch (e) {}
    }
    if (local) { cacheRef.current[track.id] = local; continue; }
    // Download from cloud
    const b64 = await downloadAudioFromCloud(userId, track.id);
    if (b64) {
      await localSaveAudio(track.prefix + track.id, b64);
      cacheRef.current[track.id] = b64;
    }
  }
}

// ── Auth ──────────────────────────────────────

export async function signInWithGoogle() {
  if (!supabase) return { error: "Supabase未設定" };
  const desktop = await isTauriApp();
  const nativeClientId = resolvedNativeClientId();
  if (desktop && nativeClientId) {
    return signInWithNativeGoogle(nativeClientId, resolvedNativeClientSecret(nativeClientId));
  }
  if (desktop) {
    return { error: "ネイティブアプリ用のGoogleログイン設定が不足しています。アプリを更新して再度ログインしてください。" };
  }
  const webClientId = resolvedWebClientId();
  if (!desktop && webClientId) {
    const direct = await signInWithWebGoogle(webClientId);
    if (!direct.error) return direct;
    console.warn("Direct Google login failed:", direct.error);
    return { error: direct.error };
  }

  const redirectTo = window.location.origin + window.location.pathname;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
  if (error) return { error: error.message };
  return { url: data.url };
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Googleログインの読み込みに失敗しました")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Googleログインの読み込みに失敗しました"));
    document.head.appendChild(script);
  });
}

async function signInWithWebGoogle(clientId) {
  try {
    await loadGoogleIdentityScript();
    const tokenResponse = await new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        prompt: "select_account",
        callback: (response) => {
          if (response?.error) reject(new Error(response.error_description || response.error));
          else resolve(response);
        },
        error_callback: (error) => reject(new Error(error?.message || error?.type || "Googleログインに失敗しました")),
      });
      client.requestAccessToken();
    });
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      access_token: tokenResponse.access_token,
    });
    if (error) return { error: error.message };
    return { user: data.user };
  } catch (e) {
    return { error: e?.message || String(e) || "Googleログインに失敗しました" };
  }
}

async function signInWithNativeGoogle(clientId, clientSecret) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    const start = await invoke("start_google_oauth", {
      clientId,
      clientSecret: clientSecret || null,
    });
    await openUrl(start.auth_url);
    const callback = await invoke("finish_google_oauth");
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: callback.id_token,
      access_token: callback.access_token,
    });
    if (error) return { error: error.message };
    return { user: data.user };
  } catch (e) {
    const message = e?.message || String(e) || "Googleログインに失敗しました";
    if (message.includes("client_secret")) {
      return { error: "Googleログイン設定が不足しています（client_secret）。アプリを更新して再度ログインしてください。" };
    }
    return { error: message };
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export function onAuthChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}
