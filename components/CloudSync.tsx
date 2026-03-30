import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useGameStore } from "@/store/gameStore";
import { pickCloudGameState } from "@/lib/cloudState";
import { supabase } from "@/lib/supabase";

export default function CloudSync() {
  const { user, isProfileReady } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef(useGameStore.getState());

  const flush = async () => {
    if (!user?.id || !isProfileReady) return;
    const state = latestStateRef.current;
    const snapshot = pickCloudGameState(state);
    const payload = {
      user_id: user.id,
      email: user.email ?? null,
      player_class: state.playerClass,
      sage_focus: state.sageFocus,
      game_state: snapshot,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
    if (error) console.warn("[cloud-sync] flush failed", error.message);
  };

  useEffect(() => {
    if (!user?.id || !isProfileReady) return;

    const unsubscribe = useGameStore.subscribe((state) => {
      latestStateRef.current = state;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flush, 450);
    });

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        flush();
      }
    });

    const beforeUnload = () => {
      void flush();
    };
    const hasWindowListeners =
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function" &&
      typeof window.removeEventListener === "function";
    if (hasWindowListeners) {
      window.addEventListener("beforeunload", beforeUnload);
    }

    return () => {
      unsubscribe();
      appStateSub.remove();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (hasWindowListeners) {
        window.removeEventListener("beforeunload", beforeUnload);
      }
      void flush();
    };
  }, [user?.id, isProfileReady]);

  return null;
}

