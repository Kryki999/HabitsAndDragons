import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import ClassSelectionModal from "@/components/ClassSelectionModal";
import { useGameStore } from "@/store/gameStore";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { PlayerClass } from "@/types/game";

export default function ClassOnboardingScreen() {
  const user = useAuth().user;
  const setPlayerClass = useGameStore((s) => s.setPlayerClass);
  const [busy, setBusy] = useState(false);

  const onSelect = async (cls: PlayerClass) => {
    if (!user?.id || busy) return;
    setBusy(true);
    setPlayerClass(cls);
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, player_class: cls, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setBusy(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0d0a14", "#150f22", "#0d0a14"]} style={StyleSheet.absoluteFill} />
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Słowa Starszego Mędrca</Text>
        <Text style={styles.bannerText}>
          Pamiętaj, wędrowcze - twój wybór to tylko początek. Mag może dźwigać ciężary, a Wojownik może
          zgłębiać księgi. Rozwijaj się w każdym kierunku, w którym zapragniesz.
        </Text>
      </View>
      {!busy ? <ClassSelectionModal visible onSelect={onSelect} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  banner: {
    position: "absolute",
    top: 58,
    left: 16,
    right: 16,
    zIndex: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "66",
    backgroundColor: "#1a1228ee",
    padding: 14,
  },
  bannerTitle: { fontSize: 12, letterSpacing: 1.2, color: Colors.dark.gold, fontWeight: "800", marginBottom: 6 },
  bannerText: { fontSize: 13, lineHeight: 19, color: Colors.dark.textSecondary },
});

