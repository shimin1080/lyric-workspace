import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Mobile from './Mobile.jsx'
import { supabase } from './supabase.js'
import './design.css'

async function handleDesktopAuthUrl(rawUrl) {
  if (!supabase) return;
  try {
    const url = new URL(rawUrl);
    const hash = new URLSearchParams((url.hash || "").replace(/^#/, ""));
    const code = url.searchParams.get("code") || hash.get("code");
    const accessToken = url.searchParams.get("access_token") || hash.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token") || hash.get("refresh_token");
    const error = url.searchParams.get("error_description") || hash.get("error_description") || url.searchParams.get("error") || hash.get("error");
    if (error) {
      console.error("Google auth error:", error);
      return;
    }
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) console.error("Google auth exchange error:", exchangeError);
    } else if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) console.error("Google auth session error:", sessionError);
    }
  } catch (e) {
    console.error("Desktop auth callback error:", e);
  }
}

function Router() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    let unlisten = null;
    (async () => {
      try {
        const { isTauri } = await import("@tauri-apps/api/core");
        if (!isTauri()) return;
        const { getCurrent, onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
        const current = await getCurrent();
        if (current) current.forEach(handleDesktopAuthUrl);
        unlisten = await onOpenUrl((urls) => urls.forEach(handleDesktopAuthUrl));
      } catch (e) {
        console.error("Desktop deep link setup error:", e);
      }
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);

  // Auto-detect mobile if no hash specified
  if (!route || route === "#" || route === "#/") {
    const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return <Mobile />;
    return <App />;
  }

  if (route === "#mobile") return <Mobile />;
  if (route === "#pc") return <App />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
