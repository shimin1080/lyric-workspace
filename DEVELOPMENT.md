# Development Handoff

## Overview

Lyric Workspace is a React + Vite web app for lyric writing. It has separate desktop and mobile UIs, PWA assets, local-first persistence, and optional Supabase sync.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Routes:

- `#/pc`: force desktop UI
- `#mobile`: force mobile UI
- no hash: auto-detects by viewport and user agent

## Build

```bash
npm run build
```

There is currently no automated test suite or lint script.

## Desktop App

The desktop app uses Tauri 2. It wraps the existing Vite build into a native macOS app and installer.

Run desktop app in development:

```bash
npm run desktop:dev
```

Build installable desktop bundles:

```bash
npm run desktop:build
```

macOS build outputs:

- `src-tauri/target/release/bundle/macos/Lyric Workspace.app`
- `src-tauri/target/release/bundle/dmg/Lyric Workspace_1.0.0_aarch64.dmg`

The `.dmg` is the installer-style artifact to distribute on Apple Silicon Macs.

Desktop recording:

- Tauri desktop uses native Rust/CPAL microphone recording.
- Recordings are saved as 48kHz-or-device-rate, 16-bit, 2-channel WAV files.
- Mono input devices are duplicated to left/right channels; stereo audio interfaces keep their first two input channels.
- Web and mobile builds keep the browser `MediaRecorder` fallback.
- Current native recording captures microphone input. Direct internal mixdown of the backing track is a later native audio-engine step.

## Main Files

- `src/main.jsx`: route switcher between desktop and mobile UI
- `src/App.jsx`: desktop app
- `src/Mobile.jsx`: mobile app
- `src/storage.js`: localStorage for app data, IndexedDB for audio blobs
- `src/Auth.jsx`: auth hook, sync status, Google-only login UI
- `src/sync.js`: Supabase database and storage sync
- `src/supabase.js`: Supabase client creation from Vite env vars
- `public/sw.js`: service worker cache
- `public/manifest.json`: PWA manifest

## Data Model

Small app data is saved under localStorage key `lyric-workspace-v3`.

Audio data is saved in IndexedDB database `lyric-workspace-audio`, object store `audio`.

The saved app data object uses:

- `projects`
- `projectList`
- `activeProj`
- `lyrics`
- `cards`
- `memo`
- `audioLib`
- `recLib`
- `trash`

## Supabase Notes

Supabase is optional. Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the app still works locally and the account sync UI shows a setup message.

Authentication is Google-only. For full sync, enable the Google provider in Supabase Auth and add the app URL to Supabase redirect URLs.

The database table in `README.md` is required. Audio sync also expects a Supabase Storage bucket named `audio`; add bucket policies before relying on cross-device audio sync.

For the Tauri desktop app, Google OAuth uses the system browser plus `lyric-workspace://auth/callback` because Google can reject embedded webview sign-in flows.

## Current Risks

- Desktop and mobile implementations duplicate a lot of logic, so feature changes often need to be applied twice.
- There is no test coverage yet. The safest first tests would cover storage loading, project deletion/restore, and sync merge behavior.
- The service worker caches with a network-first strategy, but stale cache behavior should be checked after deploys.
