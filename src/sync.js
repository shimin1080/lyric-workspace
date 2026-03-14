import { supabase } from "./supabase.js";

const BUCKET = "audio";

// ── Data sync ─────────────────────────────────

export async function pushToCloud(userId, data) {
  if (!supabase || !userId) return false;
  try {
    const { error: updateError } = await supabase
      .from("user_data")
      .update({ data, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (updateError) {
      const { error: insertError } = await supabase
        .from("user_data")
        .insert({ user_id: userId, data, updated_at: new Date().toISOString() });
      if (insertError) { console.error("Push insert error:", insertError); return false; }
    }
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

export async function signUp(email, password) {
  if (!supabase) return { error: "Supabase未設定" };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  return { user: data.user };
}

export async function signIn(email, password) {
  if (!supabase) return { error: "Supabase未設定" };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user };
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
