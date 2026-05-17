import { supabase } from "./supabase.js";

export const FREE_LIMITS = {
  projects: 5,
  audio: 3,
  recordings: 3,
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function isProBilling(profile) {
  return profile?.plan === "pro" && ACTIVE_STATUSES.has(profile?.subscription_status);
}

export async function getBillingStatus() {
  if (!supabase) return { profile: null, isPro: false, error: null };
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return { profile: null, isPro: false, error: null };
    const { data, error } = await supabase
      .from("billing_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return { profile: null, isPro: false, error: error.message };
    return { profile: data, isPro: isProBilling(data), error: null };
  } catch (e) {
    return { profile: null, isPro: false, error: e.message || String(e) };
  }
}

export async function createCheckoutSession() {
  if (!supabase) return { error: "Supabase未設定" };
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan: "pro" },
  });
  if (error) return { error: error.message };
  return data?.url ? { url: data.url } : { error: "Stripe Checkout URLを取得できませんでした" };
}

export async function createBillingPortalSession() {
  if (!supabase) return { error: "Supabase未設定" };
  const { data, error } = await supabase.functions.invoke("create-billing-portal-session");
  if (error) return { error: error.message };
  return data?.url ? { url: data.url } : { error: "Stripe管理画面URLを取得できませんでした" };
}

export async function openBillingUrl(url) {
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    if (isTauri()) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    }
  } catch (e) {}
  window.location.href = url;
}
