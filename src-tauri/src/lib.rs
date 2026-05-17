use std::{
  fs::File,
  io::{BufRead, BufReader, BufWriter, Read, Write},
  net::TcpListener,
  sync::{
    atomic::{AtomicU32, Ordering},
    mpsc, Arc, Mutex,
  },
  thread,
  time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use base64::{engine::general_purpose, Engine as _};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use rand::{distributions::Alphanumeric, Rng};
use sha2::{Digest, Sha256};
use url::form_urlencoded;

struct NativeRecorder {
  session: Mutex<Option<RecorderControl>>,
}

struct NativeGoogleOAuth {
  session: Mutex<Option<GoogleOAuthControl>>,
}

struct RecorderControl {
  stop_tx: mpsc::Sender<()>,
  done_rx: mpsc::Receiver<Result<NativeRecordingResult, String>>,
  level: Arc<AtomicU32>,
}

struct GoogleOAuthControl {
  rx: mpsc::Receiver<Result<GoogleOAuthCallback, String>>,
  client_id: String,
  client_secret: Option<String>,
  state: String,
  code_verifier: String,
  redirect_uri: String,
}

struct GoogleOAuthCallback {
  code: String,
  state: String,
}

#[derive(serde::Serialize)]
struct NativeInputDevice {
  id: usize,
  name: String,
  is_default: bool,
  max_channels: u16,
}

#[derive(serde::Serialize)]
struct NativeRecordingStatus {
  level: f32,
}

#[derive(serde::Serialize)]
struct NativeRecordingResult {
  data_url: String,
  size: u64,
  channels: u16,
  sample_rate: u32,
  duration_ms: u128,
}

#[derive(serde::Serialize)]
struct GoogleOAuthStartResult {
  auth_url: String,
}

#[derive(serde::Serialize)]
struct GoogleOAuthFinishResult {
  id_token: String,
  access_token: Option<String>,
}

#[derive(serde::Deserialize)]
struct GoogleTokenResponse {
  access_token: Option<String>,
  id_token: Option<String>,
  error: Option<String>,
  error_description: Option<String>,
}

impl Default for NativeRecorder {
  fn default() -> Self {
    Self {
      session: Mutex::new(None),
    }
  }
}

impl Default for NativeGoogleOAuth {
  fn default() -> Self {
    Self {
      session: Mutex::new(None),
    }
  }
}

#[tauri::command]
fn list_native_input_devices() -> Result<Vec<NativeInputDevice>, String> {
  let host = cpal::default_host();
  let default_name = host.default_input_device().and_then(|d| d.name().ok());
  let devices = host
    .input_devices()
    .map_err(|e| format!("入力デバイス一覧を取得できません: {e}"))?;

  let mut results = Vec::new();
  for (id, device) in devices.enumerate() {
    let name = device.name().unwrap_or_else(|_| format!("Input {id}"));
    let is_default = default_name.as_ref().is_some_and(|default| default == &name);
    let max_channels = device
      .supported_input_configs()
      .ok()
      .and_then(|configs| configs.map(|c| c.channels()).max())
      .unwrap_or(0);
    results.push(NativeInputDevice {
      id,
      name,
      is_default,
      max_channels,
    });
  }
  Ok(results)
}

#[tauri::command]
fn get_native_recording_status(
  state: tauri::State<'_, NativeRecorder>,
) -> Result<NativeRecordingStatus, String> {
  let slot = state.session.lock().map_err(|_| "録音状態を取得できませんでした")?;
  let Some(control) = slot.as_ref() else {
    return Ok(NativeRecordingStatus { level: 0.0 });
  };
  Ok(NativeRecordingStatus {
    level: control.level.load(Ordering::Relaxed) as f32 / 1000.0,
  })
}

#[tauri::command]
fn start_native_recording(
  state: tauri::State<'_, NativeRecorder>,
  device_id: Option<usize>,
) -> Result<(), String> {
  let mut slot = state.session.lock().map_err(|_| "録音状態を取得できませんでした")?;
  if slot.is_some() {
    return Err("すでに録音中です".into());
  }

  let (stop_tx, stop_rx) = mpsc::channel();
  let (ready_tx, ready_rx) = mpsc::channel();
  let (done_tx, done_rx) = mpsc::channel();
  let level = Arc::new(AtomicU32::new(0));
  let level_for_thread = Arc::clone(&level);

  thread::spawn(move || {
    run_recording_thread(device_id, stop_rx, ready_tx, done_tx, level_for_thread);
  });

  match ready_rx.recv().map_err(|_| "録音スレッドを開始できませんでした".to_string())? {
    Ok(()) => {
      *slot = Some(RecorderControl { stop_tx, done_rx, level });
      Ok(())
    }
    Err(err) => Err(err),
  }
}

#[tauri::command]
fn stop_native_recording(
  state: tauri::State<'_, NativeRecorder>,
) -> Result<NativeRecordingResult, String> {
  let control = state
    .session
    .lock()
    .map_err(|_| "録音状態を取得できませんでした")?
    .take()
    .ok_or_else(|| "録音中ではありません".to_string())?;

  let _ = control.stop_tx.send(());
  control
    .done_rx
    .recv()
    .map_err(|_| "録音結果を受け取れませんでした".to_string())?
}

#[tauri::command]
fn start_google_oauth(
  client_id: String,
  client_secret: Option<String>,
  state: tauri::State<'_, NativeGoogleOAuth>,
) -> Result<GoogleOAuthStartResult, String> {
  let redirect_uri = "http://127.0.0.1:53682/callback".to_string();
  let listener = TcpListener::bind("127.0.0.1:53682")
    .map_err(|e| format!("Googleログイン用のローカル受信口を開始できません: {e}"))?;
  listener
    .set_nonblocking(false)
    .map_err(|e| format!("Googleログイン用の受信口を設定できません: {e}"))?;

  let oauth_state = random_token(32);
  let code_verifier = random_token(64);
  let code_challenge = pkce_challenge(&code_verifier);
  let (tx, rx) = mpsc::channel();

  thread::spawn(move || {
    let _ = tx.send(wait_for_google_callback(listener));
  });

  let mut slot = state
    .session
    .lock()
    .map_err(|_| "Googleログイン状態を開始できませんでした")?;
  *slot = Some(GoogleOAuthControl {
    rx,
    client_id: client_id.clone(),
    client_secret: client_secret.and_then(|secret| {
      let trimmed = secret.trim().to_string();
      if trimmed.is_empty() { None } else { Some(trimmed) }
    }),
    state: oauth_state.clone(),
    code_verifier: code_verifier.clone(),
    redirect_uri: redirect_uri.clone(),
  });

  let query = form_urlencoded::Serializer::new(String::new())
    .append_pair("client_id", &client_id)
    .append_pair("redirect_uri", &redirect_uri)
    .append_pair("response_type", "code")
    .append_pair("scope", "openid email profile")
    .append_pair("code_challenge", &code_challenge)
    .append_pair("code_challenge_method", "S256")
    .append_pair("state", &oauth_state)
    .append_pair("access_type", "offline")
    .append_pair("prompt", "select_account")
    .finish();

  Ok(GoogleOAuthStartResult {
    auth_url: format!("https://accounts.google.com/o/oauth2/v2/auth?{query}"),
  })
}

#[tauri::command]
fn finish_google_oauth(state: tauri::State<'_, NativeGoogleOAuth>) -> Result<GoogleOAuthFinishResult, String> {
  let control = state
    .session
    .lock()
    .map_err(|_| "Googleログイン状態を取得できませんでした")?
    .take()
    .ok_or_else(|| "Googleログインが開始されていません".to_string())?;

  let callback = control
    .rx
    .recv_timeout(Duration::from_secs(180))
    .map_err(|_| "Googleログインがタイムアウトしました".to_string())??;

  if callback.state != control.state {
    return Err("Googleログインの検証に失敗しました".into());
  }

  let token = exchange_google_code(
    &control.client_id,
    control.client_secret.as_deref(),
    &callback.code,
    &control.code_verifier,
    &control.redirect_uri,
  )?;

  Ok(GoogleOAuthFinishResult {
    id_token: token
      .id_token
      .ok_or_else(|| "GoogleログインのIDトークンを取得できませんでした".to_string())?,
    access_token: token.access_token,
  })
}

fn run_recording_thread(
  device_id: Option<usize>,
  stop_rx: mpsc::Receiver<()>,
  ready_tx: mpsc::Sender<Result<(), String>>,
  done_tx: mpsc::Sender<Result<NativeRecordingResult, String>>,
  level: Arc<AtomicU32>,
) {
  let result = start_recording_stream(device_id, stop_rx, ready_tx, level);
  let _ = done_tx.send(result);
}

fn start_recording_stream(
  device_id: Option<usize>,
  stop_rx: mpsc::Receiver<()>,
  ready_tx: mpsc::Sender<Result<(), String>>,
  level: Arc<AtomicU32>,
) -> Result<NativeRecordingResult, String> {
  let host = cpal::default_host();
  let device = match device_id {
    Some(id) => host
      .input_devices()
      .map_err(|e| format!("入力デバイス一覧を取得できません: {e}"))?
      .nth(id)
      .ok_or_else(|| "選択された入力デバイスが見つかりません".to_string())?,
    None => host
      .default_input_device()
      .ok_or_else(|| "入力デバイスが見つかりません".to_string())?,
  };

  let supported = device
    .supported_input_configs()
    .map_err(|e| format!("入力デバイス設定を取得できません: {e}"))?;

  let mut configs: Vec<_> = supported.collect();
  configs.sort_by_key(|c| if c.channels() >= 2 { 0 } else { 1 });
  let supported_config = configs
    .into_iter()
    .next()
    .ok_or_else(|| "対応する入力フォーマットが見つかりません".to_string())?;

  let sample_rate = if supported_config.min_sample_rate().0 <= 48_000
    && supported_config.max_sample_rate().0 >= 48_000
  {
    cpal::SampleRate(48_000)
  } else {
    supported_config.max_sample_rate()
  };
  let sample_format = supported_config.sample_format();
  let config: cpal::StreamConfig = supported_config.with_sample_rate(sample_rate).config();
  let input_channels = config.channels as usize;
  let output_channels = 2u16;

  let now = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|e| e.to_string())?
    .as_millis();
  let path = std::env::temp_dir().join(format!("lyric-workspace-recording-{now}.wav"));
  let spec = hound::WavSpec {
    channels: output_channels,
    sample_rate: config.sample_rate.0,
    bits_per_sample: 16,
    sample_format: hound::SampleFormat::Int,
  };
  let writer = Arc::new(Mutex::new(Some(
    hound::WavWriter::create(&path, spec).map_err(|e| format!("録音ファイルを作成できません: {e}"))?,
  )));

  let writer_for_stream = Arc::clone(&writer);
  let level_for_stream = Arc::clone(&level);
  let err_fn = |err| eprintln!("native recording stream error: {err}");

  let stream = match sample_format {
    cpal::SampleFormat::F32 => device.build_input_stream(
      &config,
      move |data: &[f32], _| write_input_frames(data, input_channels, &writer_for_stream, &level_for_stream, f32_to_i16),
      err_fn,
      None,
    ),
    cpal::SampleFormat::I16 => device.build_input_stream(
      &config,
      move |data: &[i16], _| write_input_frames(data, input_channels, &writer_for_stream, &level_for_stream, |s| s),
      err_fn,
      None,
    ),
    cpal::SampleFormat::U16 => device.build_input_stream(
      &config,
      move |data: &[u16], _| write_input_frames(data, input_channels, &writer_for_stream, &level_for_stream, u16_to_i16),
      err_fn,
      None,
    ),
    other => return Err(format!("未対応の入力フォーマットです: {other:?}")),
  }
  .map_err(|e| format!("録音ストリームを開始できません: {e}"))?;

  stream
    .play()
    .map_err(|e| format!("録音を開始できません: {e}"))?;

  let started_at = Instant::now();
  let _ = ready_tx.send(Ok(()));
  let _ = stop_rx.recv();
  drop(stream);

  if let Some(writer) = writer
    .lock()
    .map_err(|_| "録音ファイルを閉じられませんでした")?
    .take()
  {
    writer
      .finalize()
      .map_err(|e| format!("録音ファイルを保存できません: {e}"))?;
  }

  let mut bytes = Vec::new();
  File::open(&path)
    .map_err(|e| format!("録音ファイルを開けません: {e}"))?
    .read_to_end(&mut bytes)
    .map_err(|e| format!("録音ファイルを読めません: {e}"))?;
  let _ = std::fs::remove_file(&path);

  Ok(NativeRecordingResult {
    data_url: format!(
      "data:audio/wav;base64,{}",
      general_purpose::STANDARD.encode(&bytes)
    ),
    size: bytes.len() as u64,
    channels: output_channels,
    sample_rate: config.sample_rate.0,
    duration_ms: started_at.elapsed().as_millis(),
  })
}

fn write_input_frames<T, F>(
  data: &[T],
  input_channels: usize,
  writer: &Arc<Mutex<Option<hound::WavWriter<BufWriter<File>>>>>,
  level: &Arc<AtomicU32>,
  convert: F,
) where
  T: Copy,
  F: Fn(T) -> i16,
{
  if input_channels == 0 {
    return;
  }
  let Ok(mut guard) = writer.lock() else {
    return;
  };
  let Some(w) = guard.as_mut() else {
    return;
  };

  let mut peak = 0.0f32;
  for frame in data.chunks(input_channels) {
    let mut mono = 0i16;
    let mut max_abs = 0i32;
    for sample in frame.iter().take(input_channels) {
      let value = convert(*sample);
      let abs = (value as i32).abs();
      if abs > max_abs {
        max_abs = abs;
        mono = value;
      }
    }
    peak = peak.max((mono as f32 / i16::MAX as f32).abs());
    let _ = w.write_sample(mono);
    let _ = w.write_sample(mono);
  }
  level.store((peak.clamp(0.0, 1.0) * 1000.0) as u32, Ordering::Relaxed);
}

fn f32_to_i16(sample: f32) -> i16 {
  (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16
}

fn u16_to_i16(sample: u16) -> i16 {
  (sample as i32 - 32_768) as i16
}

fn random_token(len: usize) -> String {
  rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(len)
    .map(char::from)
    .collect()
}

fn pkce_challenge(verifier: &str) -> String {
  let digest = Sha256::digest(verifier.as_bytes());
  general_purpose::URL_SAFE_NO_PAD.encode(digest)
}

fn wait_for_google_callback(listener: TcpListener) -> Result<GoogleOAuthCallback, String> {
  let (mut stream, _) = listener
    .accept()
    .map_err(|e| format!("Googleログインの戻りを受け取れません: {e}"))?;

  let mut reader = BufReader::new(
    stream
      .try_clone()
      .map_err(|e| format!("Googleログインの応答を準備できません: {e}"))?,
  );
  let mut request_line = String::new();
  reader
    .read_line(&mut request_line)
    .map_err(|e| format!("Googleログインの応答を読めません: {e}"))?;

  let path = request_line
    .split_whitespace()
    .nth(1)
    .ok_or_else(|| "Googleログインの戻りURLを解析できません".to_string())?;
  let query = path
    .split_once('?')
    .map(|(_, query)| query)
    .unwrap_or_default();
  let params: std::collections::HashMap<String, String> =
    form_urlencoded::parse(query.as_bytes()).into_owned().collect();

  let body = if params.contains_key("code") {
    "<html><body><h1>Google login completed</h1><p>You can return to Lyric Workspace.</p></body></html>"
  } else {
    "<html><body><h1>Google login failed</h1><p>Please return to Lyric Workspace and try again.</p></body></html>"
  };
  let response = format!(
    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
    body.as_bytes().len(),
    body
  );
  let _ = stream.write_all(response.as_bytes());

  if let Some(error) = params.get("error") {
    return Err(format!("Googleログインがキャンセルされました: {error}"));
  }

  let code = params
    .get("code")
    .cloned()
    .ok_or_else(|| "Googleログインコードを取得できませんでした".to_string())?;
  let state = params
    .get("state")
    .cloned()
    .ok_or_else(|| "Googleログイン状態を取得できませんでした".to_string())?;

  Ok(GoogleOAuthCallback { code, state })
}

fn exchange_google_code(
  client_id: &str,
  client_secret: Option<&str>,
  code: &str,
  code_verifier: &str,
  redirect_uri: &str,
) -> Result<GoogleTokenResponse, String> {
  let client = reqwest::blocking::Client::new();
  let mut body = form_urlencoded::Serializer::new(String::new());
  body
    .append_pair("client_id", client_id)
    .append_pair("code", code)
    .append_pair("code_verifier", code_verifier)
    .append_pair("grant_type", "authorization_code")
    .append_pair("redirect_uri", redirect_uri);
  if let Some(secret) = client_secret {
    body.append_pair("client_secret", secret);
  }
  let body = body.finish();
  let response = client
    .post("https://oauth2.googleapis.com/token")
    .header("Content-Type", "application/x-www-form-urlencoded")
    .body(body)
    .send()
    .map_err(|e| format!("Googleログインのトークン取得に失敗しました: {e}"))?;

  let status = response.status();
  let token = response
    .json::<GoogleTokenResponse>()
    .map_err(|e| format!("Googleログインの応答を解析できません: {e}"))?;

  if !status.is_success() {
    return Err(
      token
        .error_description
        .or(token.error)
        .unwrap_or_else(|| "Googleログインのトークン取得に失敗しました".to_string()),
    );
  }

  Ok(token)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(NativeRecorder::default())
    .manage(NativeGoogleOAuth::default())
    .invoke_handler(tauri::generate_handler![
      list_native_input_devices,
      get_native_recording_status,
      start_native_recording,
      stop_native_recording,
      start_google_oauth,
      finish_google_oauth
    ])
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_deep_link::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
