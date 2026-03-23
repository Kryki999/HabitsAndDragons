import React, { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Clipboard, LogOut, User, X } from "lucide-react-native";
import * as ClipboardApi from "expo-clipboard";
import Colors from "@/constants/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  email: string | null;
  playerId: string | null;
  level: number;
  onSignOut: () => Promise<void>;
};

export default function PlayerProfileModal({ visible, onClose, email, playerId, level, onSignOut }: Props) {
  const [busy, setBusy] = useState(false);

  const copyPlayerId = async () => {
    if (!playerId) return;
    await ClipboardApi.setStringAsync(playerId);
    Alert.alert("Skopiowano", "Player ID został skopiowany do schowka.");
  };

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSignOut();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={styles.sheet}>
          <LinearGradient colors={["#1c1430", "#130f20"]} style={styles.sheetInner}>
            <View style={styles.header}>
              <Text style={styles.title}>Profil Gracza</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={Colors.dark.textMuted} />
              </Pressable>
            </View>

            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <User size={26} color={Colors.dark.gold} />
              </View>
              <Text style={styles.name}>Player</Text>
              <Text style={styles.level}>Poziom {level}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>E-mail konta</Text>
              <Text style={styles.value}>{email ?? "Brak"}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Player ID</Text>
              <View style={styles.playerIdRow}>
                <Text style={styles.playerIdValue}>{playerId ?? "Tworzenie..."}</Text>
                <Pressable onPress={copyPlayerId} disabled={!playerId} style={styles.copyBtn}>
                  <Clipboard size={14} color={Colors.dark.gold} />
                  <Text style={styles.copyBtnText}>Kopiuj</Text>
                </Pressable>
              </View>
            </View>

            <Pressable onPress={handleSignOut} disabled={busy} style={styles.logoutWrap}>
              <LinearGradient colors={["#4b1d26", "#311218"]} style={styles.logoutBtn}>
                <LogOut size={16} color="#ffd7db" />
                <Text style={styles.logoutText}>{busy ? "Wylogowywanie..." : "Wyloguj się"}</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: { width: "90%", maxWidth: 420 },
  sheetInner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border + "99",
    padding: 16,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "800", color: Colors.dark.text },
  closeBtn: { padding: 6, borderRadius: 8, backgroundColor: Colors.dark.surface + "88" },
  avatarWrap: { alignItems: "center", marginTop: 10, marginBottom: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { marginTop: 8, fontSize: 18, fontWeight: "800", color: Colors.dark.text },
  level: { marginTop: 2, fontSize: 12, color: Colors.dark.gold, fontWeight: "700" },
  infoBlock: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface + "66",
    padding: 12,
    marginBottom: 10,
  },
  label: { fontSize: 11, color: Colors.dark.textMuted, fontWeight: "700", marginBottom: 4 },
  value: { fontSize: 14, color: Colors.dark.text, fontWeight: "600" },
  playerIdRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  playerIdValue: { fontSize: 18, color: Colors.dark.gold, fontWeight: "900", letterSpacing: 0.8, flex: 1 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "66",
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
  },
  copyBtnText: { color: Colors.dark.gold, fontSize: 12, fontWeight: "800" },
  logoutWrap: { marginTop: 8, borderRadius: 12, overflow: "hidden" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  logoutText: { color: "#ffd7db", fontSize: 15, fontWeight: "800" },
});

