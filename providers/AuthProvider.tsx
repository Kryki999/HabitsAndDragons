import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useGameStore } from "@/store/gameStore";
import type { PlayerClass, SageLifeFocus } from "@/types/game";
import type { CloudGameState } from "@/lib/cloudState";
import { pickCloudGameState } from "@/lib/cloudState";

type ProfileRow = {
  user_id: string;
  player_class: PlayerClass | null;
  sage_focus: SageLifeFocus | null;
  game_state: CloudGameState | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAuthLoading: boolean;
  isProfileReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function bootstrapProfile(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, player_class, sage_focus, game_state")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.warn("[auth] profile bootstrap failed", error.message);
    return;
  }

  if (!data) {
    const local = useGameStore.getState();
    const { error: insertErr } = await supabase.from("profiles").insert({
      user_id: userId,
      player_class: local.playerClass,
      sage_focus: local.sageFocus,
      game_state: pickCloudGameState(local),
    });
    if (insertErr) {
      console.warn("[auth] profile init insert failed", insertErr.message);
    }
    return;
  }

  useGameStore.getState().hydrateFromCloud({
    ...(data.game_state ?? {}),
    playerClass: data.player_class ?? null,
    sageFocus: data.sage_focus ?? "body",
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
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
        setIsProfileReady(true);
        return;
      }
      setIsProfileReady(false);
      await bootstrapProfile(session.user.id);
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
      isAuthLoading,
      isProfileReady,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return {};
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        return {};
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isAuthLoading, isProfileReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

