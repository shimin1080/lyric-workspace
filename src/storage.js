/*
  Storage adapter for Lyric Workspace
  - Small data (settings, lyrics, cards): localStorage
  - Large data (audio files): IndexedDB
*/

// ── IndexedDB for audio ──────────────────────
const DB_NAME = "lyric-workspace-audio";
const DB_VERSION = 1;
const STORE_NAME = "audio";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function idbClear() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ── Exports ──────────────────────────────────

// General data (JSON) — localStorage
export async function loadData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("loadData error:", e);
    return null;
  }
}

export async function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("saveData error:", e);
    return false;
  }
}

export async function deleteData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

// Audio data (base64 strings) — IndexedDB (no size limit like localStorage)
export async function saveAudio(id, base64) {
  try {
    await idbSet(id, base64);
    return true;
  } catch (e) {
    console.error("saveAudio error:", e);
    return false;
  }
}

export async function loadAudio(id) {
  try {
    return await idbGet(id);
  } catch (e) {
    console.error("loadAudio error:", e);
    return null;
  }
}

export async function deleteAudio(id) {
  try {
    await idbDelete(id);
    return true;
  } catch (e) {
    return false;
  }
}

export async function clearAllAudio() {
  try {
    await idbClear();
    return true;
  } catch (e) {
    return false;
  }
}
