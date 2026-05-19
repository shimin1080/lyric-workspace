import { useEffect, useState } from "react";

const ff = "'Courier New','JetBrains Mono',ui-monospace,Menlo,monospace";

let pendingUpdate = null;
let autoStarted = false;
const listeners = new Set();
let state = {
  supported: false,
  checked: false,
  checking: false,
  installing: false,
  available: false,
  currentVersion: "",
  version: "",
  body: "",
  progress: 0,
  message: "",
  error: "",
};

function emit(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

async function isNativeApp() {
  if (typeof window !== "undefined" && (window.__TAURI_INTERNALS__ || window.__TAURI__ || window.location.protocol === "tauri:")) return true;
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    return typeof isTauri === "function" ? isTauri() : false;
  } catch (e) {
    return false;
  }
}

export async function checkForNativeUpdate({ silent = false } = {}) {
  if (state.checking || state.installing) return state;
  const supported = await isNativeApp();
  if (!supported) {
    emit({ supported: false, checked: true });
    return state;
  }
  emit({ supported: true, checking: true, error: "", message: silent ? "" : "更新を確認中..." });
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check({ timeout: 30000 });
    pendingUpdate = update;
    if (update) {
      emit({
        checked: true,
        checking: false,
        available: true,
        currentVersion: update.currentVersion || "",
        version: update.version || "",
        body: update.body || "",
        message: `バージョン ${update.version} に更新できます`,
      });
    } else {
      emit({ checked: true, checking: false, available: false, message: silent ? "" : "最新バージョンです" });
    }
  } catch (e) {
    emit({ checked: true, checking: false, error: e?.message || String(e), message: silent ? "" : "更新確認に失敗しました" });
  }
  return state;
}

export async function installNativeUpdate() {
  if (!pendingUpdate || state.installing) return;
  emit({ installing: true, error: "", progress: 0, message: "アップデートをダウンロード中..." });
  let downloaded = 0;
  let total = 0;
  try {
    await pendingUpdate.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength || 0;
        downloaded = 0;
        emit({ progress: 0, message: "アップデートをダウンロード中..." });
      }
      if (event.event === "Progress") {
        downloaded += event.data.chunkLength || 0;
        const progress = total ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
        emit({ progress, message: total ? `ダウンロード中... ${progress}%` : "ダウンロード中..." });
      }
      if (event.event === "Finished") emit({ progress: 100, message: "インストール中..." });
    });
    emit({ installing: false, progress: 100, message: "更新完了。アプリを再起動します..." });
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (e) {
    emit({ installing: false, error: e?.message || String(e), message: "アップデートに失敗しました" });
  }
}

export function useNativeUpdater({ auto = false } = {}) {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(state);
    if (auto && !autoStarted) {
      autoStarted = true;
      setTimeout(() => checkForNativeUpdate({ silent: true }), 2500);
    }
    return () => listeners.delete(setSnapshot);
  }, [auto]);
  return snapshot;
}

export function NativeUpdaterPanel({ compact = false }) {
  const updater = useNativeUpdater();
  if (updater.checked && !updater.supported) return null;
  return (
    <div style={{ borderTop: compact ? "none" : "1px solid #2a2a35", paddingTop: compact ? 0 : 16, marginTop: compact ? 0 : 16 }}>
      <div style={{ fontSize: compact ? 13 : 12, color: "#c8ccd8", marginBottom: 4 }}>アプリ更新</div>
      <div style={{ fontSize: 11, color: "#7a7e8e", lineHeight: 1.5, marginBottom: 10 }}>
        {updater.available ? `新しいバージョン ${updater.version} が利用できます。` : updater.message || "インストール済みアプリの更新を確認できます。"}
      </div>
      {updater.installing && (
        <div style={{ height: 4, background: "#0a0a0a", border: "1px solid #2a2a35", borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: `${updater.progress || 8}%`, height: "100%", background: "#4af0a0", transition: "width .2s ease" }} />
        </div>
      )}
      {updater.error && <div style={{ color: "#f87171", fontSize: 11, lineHeight: 1.4, marginBottom: 10 }}>{updater.error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => checkForNativeUpdate()} disabled={updater.checking || updater.installing} style={{ flex: 1, padding: "8px 10px", borderRadius: compact ? 8 : 2, border: "1px solid #3a3a4a", background: "transparent", color: "#c8ccd8", fontSize: 11, cursor: updater.checking || updater.installing ? "default" : "pointer", fontFamily: ff }}>
          {updater.checking ? "確認中..." : "更新を確認"}
        </button>
        {updater.available && (
          <button onClick={() => installNativeUpdate()} disabled={updater.installing} style={{ flex: 1, padding: "8px 10px", borderRadius: compact ? 8 : 2, border: "none", background: "#4af0a0", color: "#111116", fontSize: 11, fontWeight: 700, cursor: updater.installing ? "default" : "pointer", fontFamily: ff }}>
            {updater.installing ? "更新中..." : "更新して再起動"}
          </button>
        )}
      </div>
    </div>
  );
}

export function NativeUpdaterToast({ mobile = false }) {
  const updater = useNativeUpdater({ auto: true });
  if (!updater.available) return null;
  return (
    <div style={{ position: "fixed", right: mobile ? 14 : 18, left: mobile ? 14 : "auto", bottom: mobile ? 78 : 18, zIndex: 300, width: mobile ? "auto" : 300, background: "#111116", border: "1px solid rgba(74,240,160,0.28)", boxShadow: "0 18px 36px rgba(0,0,0,.42)", borderRadius: mobile ? 12 : 2, padding: 14, fontFamily: ff }}>
      <div style={{ color: "#4af0a0", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>アップデートがあります</div>
      <div style={{ color: "#a8adbd", fontSize: 11, lineHeight: 1.45, marginBottom: 10 }}>バージョン {updater.version} に更新できます。</div>
      <button onClick={() => installNativeUpdate()} disabled={updater.installing} style={{ width: "100%", padding: "8px 10px", borderRadius: mobile ? 8 : 2, border: "none", background: "#4af0a0", color: "#111116", fontSize: 11, fontWeight: 700, cursor: updater.installing ? "default" : "pointer", fontFamily: ff }}>
        {updater.installing ? updater.message || "更新中..." : "更新して再起動"}
      </button>
    </div>
  );
}
