import { useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useGameStore } from "@/store/gameStore";
import { pickCloudGameState } from "@/lib/cloudState";
import { supabase } from "@/lib/supabase";

export default function CloudSync() {
  const { user, isProfileReady } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id || !isProfileReady) return;

    const unsubscribe = useGameStore.subscribe((state) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const snapshot = pickCloudGameState(state);
        const payload = {
          user_id: user.id,
          player_class: state.playerClass,
          sage_focus: state.sageFocus,
          game_state: snapshot,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
        if (error) {
          console.warn("[cloud-sync] upsert failed", error.message);
        }
      }, 700);
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [user?.id, isProfileReady]);

  return null;
}

