import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

// In React Native (Hermes), `window` refers to the global object but does NOT
// have browser DOM APIs such as addEventListener / removeEventListener.
// @supabase/supabase-js v2 calls `win()?.addEventListener('visibilitychange', …)`
// when it starts auto-refresh after sign-in, which crashes with
// "window.addEventListener is not a function".
// Polyfilling these as no-ops prevents the crash; AppState (below) takes over
// the job of pausing/resuming token refresh on foreground/background transitions.
if (Platform.OS !== "web" && typeof window !== "undefined") {
  if (typeof (window as any).addEventListener !== "function") {
    (window as any).addEventListener = () => {};
  }
  if (typeof (window as any).removeEventListener !== "function") {
    (window as any).removeEventListener = () => {};
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const RNStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

const storage = Platform.OS === "web" ? undefined : RNStorage;

export const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "", {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Replace browser-based visibility detection with React Native AppState so
// Supabase pauses token refresh when the app is backgrounded and resumes it
// when foregrounded. Register only once at module level.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

