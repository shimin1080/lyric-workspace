export async function isNativeRecordingAvailable() {
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    return isTauri();
  } catch (e) {
    return false;
  }
}

export async function listNativeInputDevices() {
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke("list_native_input_devices");
}

export async function getNativeRecordingStatus() {
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke("get_native_recording_status");
}

export async function startNativeRecording(deviceId = null) {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("start_native_recording", { deviceId });
}

export async function stopNativeRecording() {
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke("stop_native_recording");
}
