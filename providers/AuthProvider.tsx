import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
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
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  playerId: string | null;
  isAuthLoading: boolean;
  isProfileReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; status?: number; code?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; status?: number; code?: string }>;
  signInWithGoogle: () => Promise<{ error?: string; status?: number; code?: string }>;
  signInWithApple: () => Promise<{ error?: string; status?: number; code?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

async function bootstrapProfile(userId: string, userEmail?: string | null): Promise<{ playerId: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, player_id, player_class, sage_focus, game_state")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.warn("[auth] profile bootstrap failed", error.message);
    return { playerId: null };
  }

  if (!data) {
    const local = useGameStore.getState();
    const nextPlayerId = await generateUniquePlayerId();
    const { error: insertErr } = await supabase.from("profiles").insert({
      user_id: userId,
      player_class: null,
      sage_focus: local.sageFocus,
      email: userEmail ?? null,
      player_id: nextPlayerId,
      game_state: pickCloudGameState(local),
    });
    if (insertErr) {
      console.warn("[auth] profile init insert failed", insertErr.message);
    }
    return { playerId: nextPlayerId };
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
  return { playerId: resolvedPlayerId };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileReady, setIsProfileReady] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setIsAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!session?.user?.id) {
        setPlayerId(null);
        setIsProfileReady(true);
        return;
      }
      setIsProfileReady(false);
      const result = await bootstrapProfile(session.user.id, session.user.email);
      if (!cancelled) setPlayerId(result.playerId);
      if (!cancelled) setIsProfileReady(true);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      playerId,
      isAuthLoading,
      isProfileReady,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
        return {};
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
        return {};
      },
      signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
        });
        if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
        return {};
      },
      signInWithApple: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
        });
        if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
        return {};
      },
      signOut: async () => {
        await supabase.auth.signOut();
        useGameStore.setState(useGameStore.getInitialState());
        await useGameStore.persist.clearStorage();
      },
    }),
    [session, playerId, isAuthLoading, isProfileReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

