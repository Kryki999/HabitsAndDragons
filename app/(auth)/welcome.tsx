import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Shield, LogIn, UserPlus, Chrome, Apple } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

export default function WelcomeScreen() {
  const { signIn, signUp, signInWithGoogle, signInWithApple, isAuthLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const inCooldown = cooldownUntil !== null && Date.now() < cooldownUntil;
  const cooldownLeftSec = inCooldown ? Math.ceil((cooldownUntil! - Date.now()) / 1000) : 0;
  const formDisabled = busy || isAuthLoading || inCooldown;

  useEffect(() => {
    if (!inCooldown) return;
    const timer = setInterval(() => {
      if (cooldownUntil !== null && Date.now() >= cooldownUntil) {
        setCooldownUntil(null);
      } else {
        setTick((v) => v + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [inCooldown, cooldownUntil]);

  const humanizeError = (
    mode: "signIn" | "signUp",
    e?: { error?: string; status?: number; code?: string },
  ): string => {
    if (!e?.error) return "Nie udało się połączyć z Bramą. Spróbuj ponownie.";
    const msg = e.error.toLowerCase();
    if (e.status === 429) return "Za wiele prób w krótkim czasie. Odczekaj chwilę i spróbuj ponownie.";
    if (msg.includes("invalid login credentials")) return "Nieprawidłowy email lub hasło.";
    if (msg.includes("email not confirmed")) return "Potwierdź email w skrzynce, a potem wróć do bramy.";
    if (msg.includes("user already registered")) return "Ten email już istnieje. Użyj opcji wejścia do krainy.";
    if (msg.includes("signup is disabled")) return "Rejestracja jest wyłączona w ustawieniach Supabase.";
    if (mode === "signUp" && msg.includes("password")) return "Hasło jest zbyt słabe. Użyj min. 6 znaków.";
    return e.error;
  };

  const run = async (submitMode: "signIn" | "signUp") => {
    if (inCooldown) return;
    setBusy(true);
    setError(null);
    const trimmedEmail = email.trim();
    const action = submitMode === "signIn" ? signIn : signUp;
    const result = await action(trimmedEmail, password);
    if (result.error) {
      if (result.status === 429) {
        setCooldownUntil(Date.now() + 20_000);
      }
      setError(humanizeError(submitMode, result));
    } else {
      setCooldownUntil(null);
      if (submitMode === "signUp") {
        Alert.alert("Konto utworzone", "Sprawdź skrzynkę e-mail i potwierdź konto, jeśli projekt wymaga weryfikacji.");
      }
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
        <View style={styles.tabRow}>
          <Pressable onPress={() => setMode("signIn")} style={[styles.tabBtn, mode === "signIn" && styles.tabBtnActive]}>
            <Text style={[styles.tabText, mode === "signIn" && styles.tabTextActive]}>Zaloguj się</Text>
          </Pressable>
          <Pressable onPress={() => setMode("signUp")} style={[styles.tabBtn, mode === "signUp" && styles.tabBtnActive]}>
            <Text style={[styles.tabText, mode === "signUp" && styles.tabTextActive]}>Utwórz nowe konto</Text>
          </Pressable>
        </View>

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
          onPress={() => run(mode)}
          disabled={formDisabled || !email || !password}
          style={({ pressed }) => [styles.actionWrap, pressed && styles.actionPressed]}
        >
          <LinearGradient colors={mode === "signIn" ? ["#2d2048", "#1e1438"] : ["#4a3520", "#2d2018"]} style={styles.actionBtn}>
            {mode === "signIn" ? <LogIn size={18} color={Colors.dark.text} /> : <UserPlus size={18} color={Colors.dark.gold} />}
            <Text style={[styles.actionText, mode === "signUp" && { color: Colors.dark.gold }]}>
              {mode === "signIn" ? "Wejdź do krainy" : "Rozpal nową legendę"}
            </Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.socialDivider}>
          <View style={styles.socialLine} />
          <Text style={styles.socialDividerText}>albo</Text>
          <View style={styles.socialLine} />
        </View>

        <Pressable
          onPress={async () => {
            setBusy(true);
            const result = await signInWithGoogle();
            if (result.error) setError(humanizeError("signIn", result));
            setBusy(false);
          }}
          disabled={formDisabled}
          style={({ pressed }) => [styles.socialBtn, pressed && styles.actionPressed]}
        >
          <Chrome size={16} color={Colors.dark.text} />
          <Text style={styles.socialBtnText}>Zaloguj przez Google</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            setBusy(true);
            const result = await signInWithApple();
            if (result.error) setError(humanizeError("signIn", result));
            setBusy(false);
          }}
          disabled={formDisabled}
          style={({ pressed }) => [styles.socialBtn, pressed && styles.actionPressed]}
        >
          <Apple size={16} color={Colors.dark.text} />
          <Text style={styles.socialBtnText}>Zaloguj przez Apple</Text>
        </Pressable>

        <Text style={styles.hint}>
          {inCooldown
            ? `Zbyt wiele prób. Odczekaj ${cooldownLeftSec}s.`
            : "Hasło powinno mieć co najmniej 6 znaków."}
        </Text>
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
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: Colors.dark.surface + "77",
  },
  tabBtnActive: {
    backgroundColor: "#2a2038",
    borderColor: Colors.dark.gold + "66",
  },
  tabText: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontWeight: "700",
  },
  tabTextActive: {
    color: Colors.dark.gold,
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
  socialDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  socialLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border + "aa",
  },
  socialDividerText: {
    fontSize: 11,
    color: Colors.dark.textMuted,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface + "88",
  },
  socialBtnText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: "700",
  },
  hint: { marginTop: 4, fontSize: 11, color: Colors.dark.textMuted, textAlign: "center" },
});

