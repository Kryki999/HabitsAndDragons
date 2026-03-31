import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";
import { AUTH_NETWORK_TIMEOUT_MS, PROFILE_BOOTSTRAP_TIMEOUT_MS, withTimeout } from "@/lib/authTimeout";
import { signInWithOAuthExpo } from "@/lib/oauthNative";
import { supabase } from "@/lib/supabase";
import { useGameStore } from "@/store/gameStore";
import type { PlayerClass, SageLifeFocus } from "@/types/game";
import type { CloudGameState } from "@/lib/cloudState";
import { pickCloudGameState } from "@/lib/cloudState";

type ProfileRow = {
  user_id: string;
  email: string | null;
  player_id: string | null;
  player_class: PlayerClass | null;
  sage_focus: SageLifeFocus | null;
  game_state: CloudGameState | null;
  created_at?: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  playerId: string | null;
  /** UTC calendar day (`YYYY-MM-DD`) when the profile row was created — timeline lower bound. */
  profileCreatedAtDateKey: string | null;
  isAuthLoading: boolean;
  isProfileReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; status?: number; code?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; status?: number; code?: string }>;
  signInWithGoogle: () => Promise<{ error?: string; status?: number; code?: string }>;
  signInWithApple: () => Promise<{ error?: string; status?: number; code?: string }>;
  /** Passwordless: sends a one-time code to the email (check Supabase templates / length). */
  signInWithEmailOtp: (email: string) => Promise<{ error?: string; status?: number; code?: string }>;
  verifyEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ error?: string; status?: number; code?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = "habitsanddragons.auth";

async function recoverSessionFromStorage(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const maybeSession = parsed?.currentSession ?? parsed;
    const accessToken = maybeSession?.access_token;
    const refreshToken = maybeSession?.refresh_token;
    if (!accessToken || !refreshToken) return null;

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.warn("[auth] storage recovery setSession failed", error.message);
      return null;
    }
    return data.session ?? null;
  } catch (err) {
    console.warn("[auth] storage recovery failed", err);
    return null;
  }
}

function profileCreatedAtDateKeyFromRow(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

function createCandidatePlayerId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function generateUniquePlayerId(): Promise<string> {
  for (let i = 0; i < 12; i += 1) {
    const candidate = createCandidatePlayerId();
    const { data, error } = await supabase.from("profiles").select("user_id").eq("player_id", candidate).maybeSingle();
    if (!error && !data) return candidate;
  }
  return `${createCandidatePlayerId().slice(0, 6)}${Date.now().toString().slice(-2)}`;
}

async function bootstrapProfile(
  userId: string,
  userEmail?: string | null,
): Promise<{ playerId: string | null; profileCreatedAtDateKey: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, player_id, player_class, sage_focus, game_state, created_at")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.warn("[auth] profile bootstrap failed", error.message);
    return { playerId: null, profileCreatedAtDateKey: null };
  }

  if (!data) {
    const local = useGameStore.getState();
    const nextPlayerId = await generateUniquePlayerId();
    const { data: inserted, error: insertErr } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        player_class: null,
        sage_focus: local.sageFocus,
        email: userEmail ?? null,
        player_id: nextPlayerId,
        game_state: pickCloudGameState(local),
      })
      .select("created_at")
      .maybeSingle();
    if (insertErr) {
      console.warn("[auth] profile init insert failed", insertErr.message);
    }
    return {
      playerId: nextPlayerId,
      profileCreatedAtDateKey: profileCreatedAtDateKeyFromRow(inserted?.created_at),
    };
  }

  let resolvedPlayerId = data.player_id ?? null;
  if (!data.email && userEmail) {
    await supabase.from("profiles").update({ email: userEmail }).eq("user_id", userId);
  }
  if (!resolvedPlayerId) {
    resolvedPlayerId = await generateUniquePlayerId();
    await supabase.from("profiles").update({ player_id: resolvedPlayerId }).eq("user_id", userId);
  }

  useGameStore.getState().hydrateFromCloud({
    ...(data.game_state ?? {}),
    playerClass: data.player_class ?? null,
    sageFocus: data.sage_focus ?? "body",
  });
  return {
    playerId: resolvedPlayerId,
    profileCreatedAtDateKey: profileCreatedAtDateKeyFromRow(data.created_at),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [profileCreatedAtDateKey, setProfileCreatedAtDateKey] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileReady, setIsProfileReady] = useState(false);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    let active = true;
    const watchdog = setTimeout(() => {
      if (!active) return;
      console.warn("[auth] getSession watchdog fired; releasing auth loading state");
      setIsAuthLoading(false);
    }, 12_000);

    withTimeout(supabase.auth.getSession(), 10_000, "getSession")
      .then(async ({ data }) => {
        if (!active) return;
        if (data.session) {
          setSession(data.session);
          return;
        }
        const recovered = await recoverSessionFromStorage();
        if (!active) return;
        setSession(recovered);
      })
      .catch((err) => {
        console.warn("[auth] getSession failed", err);
        if (!active) return;
        setSession(null);
      })
      .finally(() => {
        clearTimeout(watchdog);
        if (active) setIsAuthLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      active = false;
      clearTimeout(watchdog);
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Expo Go: after process swap / resume, re-read session so UI matches storage.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      void withTimeout(supabase.auth.getSession(), 10_000, "resume/getSession")
        .then(async ({ data }) => {
          if (data.session) {
            setSession(data.session);
            return;
          }
          const recovered = await recoverSessionFromStorage();
          setSession(recovered);
        })
        .catch((err) => {
          console.warn("[auth] resume getSession failed", err);
        });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!session?.user?.id) {
        setPlayerId(null);
        setProfileCreatedAtDateKey(null);
        setIsProfileReady(true);
        return;
      }
      setIsProfileReady(false);
      try {
        const result = await withTimeout(
          bootstrapProfile(session.user.id, session.user.email),
          PROFILE_BOOTSTRAP_TIMEOUT_MS,
          "bootstrapProfile",
        );
        if (!cancelled) setPlayerId(result.playerId);
        if (!cancelled) setProfileCreatedAtDateKey(result.profileCreatedAtDateKey);
      } catch (e) {
        console.warn("[auth] profile bootstrap failed or timed out", e);
        if (!cancelled) {
          setPlayerId(null);
          setProfileCreatedAtDateKey(null);
        }
      } finally {
        if (!cancelled) setIsProfileReady(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      playerId,
      profileCreatedAtDateKey,
      isAuthLoading,
      isProfileReady,
      signIn: async (email, password) => {
        try {
          const { data, error } = await withTimeout(
            supabase.auth.signInWithPassword({ email, password }),
            AUTH_NETWORK_TIMEOUT_MS,
            "signInWithPassword",
          );
          if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
          if (!data.session) {
            return { error: "Sign-in succeeded on server but no session was returned to the app." };
          }
          // Keep UI deterministic even if auth state event is delayed.
          setSession(data.session);
          return {};
        } catch (e: any) {
          return { error: e?.message ?? "Sign-in failed." };
        }
      },
      signUp: async (email, password) => {
        try {
          const { error } = await withTimeout(
            supabase.auth.signUp({ email, password }),
            AUTH_NETWORK_TIMEOUT_MS,
            "signUp",
          );
          if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
          return {};
        } catch (e: any) {
          return { error: e?.message ?? "Sign-up failed." };
        }
      },
      signInWithGoogle: async () => {
        try {
          return await signInWithOAuthExpo("google");
        } catch (e: any) {
          return { error: e?.message ?? "Google sign-in failed." };
        }
      },
      signInWithApple: async () => {
        try {
          return await signInWithOAuthExpo("apple");
        } catch (e: any) {
          return { error: e?.message ?? "Apple sign-in failed." };
        }
      },
      signInWithEmailOtp: async (email) => {
        try {
          const { error } = await withTimeout(
            supabase.auth.signInWithOtp({
              email: email.trim(),
              options: { shouldCreateUser: true },
            }),
            AUTH_NETWORK_TIMEOUT_MS,
            "signInWithOtp",
          );
          if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
          return {};
        } catch (e: any) {
          return { error: e?.message ?? "Could not send code." };
        }
      },
      verifyEmailOtp: async (email, token) => {
        try {
          const { error } = await withTimeout(
            supabase.auth.verifyOtp({
              email: email.trim(),
              token: token.replace(/\s/g, ""),
              type: "email",
            }),
            AUTH_NETWORK_TIMEOUT_MS,
            "verifyOtp",
          );
          if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
          return {};
        } catch (e: any) {
          return { error: e?.message ?? "Could not verify code." };
        }
      },
      signOut: async () => {
        try {
          await withTimeout(supabase.auth.signOut(), AUTH_NETWORK_TIMEOUT_MS, "signOut");
        } catch (e) {
          console.warn("[auth] signOut timed out or failed; clearing local state anyway", e);
        }
        useGameStore.setState(useGameStore.getInitialState());
        await useGameStore.persist.clearStorage();
      },
    }),
    [session, playerId, profileCreatedAtDateKey, isAuthLoading, isProfileReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

