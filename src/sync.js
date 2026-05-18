import { supabase } from "./supabase.js";

const BUCKET = "audio";
const DESKTOP_AUTH_REDIRECT = "lyric-workspace://auth/callback";
const GOOGLE_WEB_DEFAULT_CLIENT_ID = "384809706283-9hfsce08oovfs5csiuem7i99qqna3guq.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID = GOOGLE_WEB_DEFAULT_CLIENT_ID;

function resolvedWebClientId() {
  return GOOGLE_WEB_CLIENT_ID;
}

async function isTauriApp() {
  if (typeof window !== "undefined" && (
    window.__TAURI_INTERNALS__ ||
    window.__TAURI__ ||
    window.isTauri ||
    window.location.protocol === "tauri:"
  )) return true;
  if (typeof globalThis !== "undefined" && globalThis.isTauri) return true;
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    return typeof isTauri === "function" ? isTauri() : false;
  } catch (e) {
    return false;
  }
}

// ── Data sync ─────────────────────────────────

export async function pushToCloud(userId, data) {
  if (!supabase || !userId) return { ok: false };
  try {
    const localUpdatedAt = Number(data?.__updatedAt || 0);
    const localLastSyncedAt = Number(data?.__lastSyncedAt || 0);
    const { data: existing, error: readError } = await supabase
      .from("user_data")
      .select("data, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) { console.error("Push read error:", readError); return { ok: false, error: readError.message }; }
    if (existing) {
      const remoteUpdatedAt = Number(existing.data?.__updatedAt || 0) || Date.parse(existing.updated_at || "") || 0;
      const isBasedOnOlderCloud = remoteUpdatedAt && (!localLastSyncedAt || localLastSyncedAt < remoteUpdatedAt);
      const isOlderLocalSnapshot = remoteUpdatedAt && localUpdatedAt && localUpdatedAt < remoteUpdatedAt;
      if (isBasedOnOlderCloud || isOlderLocalSnapshot) {
        return {
          ok: false,
          conflict: true,
          error: "Cloud data is newer than this local copy.",
          remote: existing.data,
          remoteUpdatedAt: existing.updated_at
        };
      }
    }
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("user_data")
      .upsert(
        { user_id: userId, data, updated_at: updatedAt },
        { onConflict: "user_id" }
      );
    if (error) { console.error("Push error:", error); return { ok: false, error: error.message }; }
    return { ok: true, updatedAt };
  } catch (e) { console.error("Push error:", e); return { ok: false, error: e.message || String(e) }; }
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
    return { data: data?.data || null, updatedAt: data?.updated_at || null, error: null };
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
  if (desktop) {
    return signInWithDesktopSupabaseGoogle();
  }
  const webClientId = resolvedWebClientId();
  if (!desktop && webClientId) {
    const direct = await signInWithWebGooglePrompt(webClientId);
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

async function signInWithDesktopSupabaseGoogle() {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: DESKTOP_AUTH_REDIRECT,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) return { error: error.message };
    if (!data?.url) return { error: "GoogleログインURLを取得できませんでした" };
    await openUrl(data.url);
    return { pending: true };
  } catch (e) {
    return { error: e?.message || String(e) || "Googleログインに失敗しました" };
  }
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id || window.google?.accounts?.oauth2) return Promise.resolve();
  const waitForGoogle = (resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (window.google?.accounts?.id || window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      attempts += 1;
      if (attempts > 40) {
        reject(new Error("Googleログインの読み込みに失敗しました"));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  };
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-identity]");
    if (existing) {
      if (window.google?.accounts?.id || window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => waitForGoogle(resolve, reject), { once: true });
      existing.addEventListener("error", () => reject(new Error("Googleログインの読み込みに失敗しました")), { once: true });
      waitForGoogle(resolve, reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => waitForGoogle(resolve, reject);
    script.onerror = () => reject(new Error("Googleログインの読み込みに失敗しました"));
    document.head.appendChild(script);
  });
}

export async function getWebGoogleClientId() {
  return (await isTauriApp()) ? null : resolvedWebClientId();
}

export async function signInWithGoogleIdToken(idToken) {
  if (!supabase) return { error: "Supabase未設定" };
  if (!idToken) return { error: "id_token required" };
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) return { error: error.message };
  return { user: data.user };
}

export async function renderGoogleLoginButton(container, onResult) {
  const clientId = await getWebGoogleClientId();
  if (!clientId || !container) return false;
  await loadGoogleIdentityScript();
  container.innerHTML = "";
  window.google.accounts.id.initialize({
    client_id: clientId,
    ux_mode: "popup",
    callback: async (response) => {
      const result = await signInWithGoogleIdToken(response?.credential);
      onResult?.(result);
    },
  });
  window.google.accounts.id.renderButton(container, {
    type: "standard",
    theme: "filled_black",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "center",
    width: 385,
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
  return !!container.querySelector("iframe");
}

async function signInWithWebGooglePrompt(clientId) {
  try {
    await loadGoogleIdentityScript();
    const credential = await new Promise((resolve, reject) => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) resolve(response.credential);
          else reject(new Error("Googleログインに失敗しました"));
        },
      });
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          reject(new Error("Googleログインボタンからログインしてください"));
        }
      });
    });
    return signInWithGoogleIdToken(credential);
  } catch (e) {
    return { error: e?.message || String(e) || "Googleログインに失敗しました" };
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
