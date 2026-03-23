import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Shield, LogIn, UserPlus } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

export default function WelcomeScreen() {
  const { signIn, signUp, isAuthLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const formDisabled = busy || isAuthLoading;

  const run = async (mode: "signIn" | "signUp") => {
    setBusy(true);
    setError(null);
    const trimmedEmail = email.trim();
    const action = mode === "signIn" ? signIn : signUp;
    const result = await action(trimmedEmail, password);
    if (result.error) {
      setError(result.error);
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <LinearGradient colors={["#0d0a14", "#160f24", "#0d0a14"]} style={StyleSheet.absoluteFill} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <View style={styles.header}>
        <LinearGradient colors={[...Colors.gradients.gold]} style={styles.emblem}>
          <Shield size={28} color="#1a1228" />
        </LinearGradient>
        <Text style={styles.title}>Brama Krainy</Text>
        <Text style={styles.subtitle}>Rozpocznij swoją wędrówkę i przywołaj kroniki bohatera.</Text>
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Adres zwoju (email)"
          placeholderTextColor={Colors.dark.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!formDisabled}
        />
        <TextInput
          style={styles.input}
          placeholder="Sekretna pieczęć (hasło)"
          placeholderTextColor={Colors.dark.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!formDisabled}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => run("signIn")}
          disabled={formDisabled || !email || !password}
          style={({ pressed }) => [styles.actionWrap, pressed && styles.actionPressed]}
        >
          <LinearGradient colors={["#2d2048", "#1e1438"]} style={styles.actionBtn}>
            <LogIn size={18} color={Colors.dark.text} />
            <Text style={styles.actionText}>Wejdź do krainy</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => run("signUp")}
          disabled={formDisabled || !email || !password}
          style={({ pressed }) => [styles.actionWrap, pressed && styles.actionPressed]}
        >
          <LinearGradient colors={["#4a3520", "#2d2018"]} style={styles.actionBtn}>
            <UserPlus size={18} color={Colors.dark.gold} />
            <Text style={[styles.actionText, { color: Colors.dark.gold }]}>Rozpal nową legendę</Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.hint}>Hasło powinno mieć co najmniej 6 znaków.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 22, backgroundColor: Colors.dark.background },
  orb1: {
    position: "absolute",
    top: 80,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#6b2d4a24",
  },
  orb2: {
    position: "absolute",
    bottom: 140,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#2d5a4a22",
  },
  header: { alignItems: "center", marginBottom: 20 },
  emblem: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 32, fontWeight: "900", color: Colors.dark.text },
  subtitle: { fontSize: 14, color: Colors.dark.textSecondary, textAlign: "center", marginTop: 8, maxWidth: 320, lineHeight: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#150f20dd",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 10,
  },
  input: {
    backgroundColor: "#120d1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: { color: Colors.dark.ruby, fontSize: 12, marginTop: 2 },
  actionWrap: { borderRadius: 12, overflow: "hidden" },
  actionPressed: { opacity: 0.9 },
  actionBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexDirection: "row",
  },
  actionText: { color: Colors.dark.text, fontSize: 15, fontWeight: "800" },
  hint: { marginTop: 4, fontSize: 11, color: Colors.dark.textMuted, textAlign: "center" },
});

