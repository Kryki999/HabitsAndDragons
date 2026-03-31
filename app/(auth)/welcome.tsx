import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shield, Chrome, Apple, Mail } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

export default function WelcomeScreen() {
  const router = useRouter();
  const forceBypassAuth = true;

  useEffect(() => {
    if (!forceBypassAuth) return;
    const id = setTimeout(() => {
      router.replace("/(tabs)" as any);
    }, 0);
    return () => clearTimeout(id);
  }, [router, forceBypassAuth]);

  const {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signInWithEmailOtp,
    verifyEmailOtp,
    isAuthLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailFlowOpen, setEmailFlowOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [legacyMode, setLegacyMode] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const inCooldown = cooldownUntil !== null && Date.now() < cooldownUntil;
  const cooldownLeftSec = inCooldown ? Math.ceil((cooldownUntil! - Date.now()) / 1000) : 0;
  const formDisabled = busy || inCooldown;

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
    e?: { error?: string; status?: number; code?: string },
  ): string => {
    if (!e?.error) return "Could not reach the gate. Try again.";
    const msg = e.error.toLowerCase();
    if (e.status === 429) return "Too many attempts. Wait a moment and try again.";
    if (msg.includes("invalid login credentials")) return "Invalid email or password.";
    if (msg.includes("email not confirmed")) return "Confirm your email from the inbox, then return.";
    if (msg.includes("user already registered")) return "This email is already registered. Sign in instead.";
    if (msg.includes("signup is disabled")) return "Sign-ups are disabled in project settings.";
    if (msg.includes("otp") || msg.includes("token")) return "Invalid or expired code. Request a new one.";
    if (msg.includes("timed out")) return "Request took too long. Check your connection and try again.";
    return e.error;
  };

  const runPasswordAuth = async (mode: "signIn" | "signUp") => {
    if (inCooldown) return;
    setBusy(true);
    setError(null);
    try {
      const trimmed = email.trim();
      const action = mode === "signIn" ? signIn : signUp;
      const result = await action(trimmed, password);
      if (result.error) {
        if (result.status === 429) setCooldownUntil(Date.now() + 20_000);
        setError(humanizeError(result));
      } else {
        setCooldownUntil(null);
        if (mode === "signUp") {
          Alert.alert(
            "Check your inbox",
            "If your project requires email confirmation, verify your account from the message we sent.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithEmailOtp(trimmed);
      if (result.error) {
        if (result.status === 429) setCooldownUntil(Date.now() + 20_000);
        setError(humanizeError(result));
      } else {
        setOtpSent(true);
        Alert.alert("Code sent", "Check your email and enter the one-time code below.");
      }
    } finally {
      setBusy(false);
    }
  }, [email, signInWithEmailOtp]);

  const verifyOtp = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !otpCode.trim()) {
      setError("Enter email and the code from your message.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await verifyEmailOtp(trimmed, otpCode);
      if (result.error) {
        if (result.status === 429) setCooldownUntil(Date.now() + 20_000);
        setError(humanizeError(result));
      }
    } finally {
      setBusy(false);
    }
  }, [email, otpCode, verifyEmailOtp]);

  return (
    <LinearGradient colors={["#080510", "#120a1c", "#0d0a14"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.vignette} />

            <View style={styles.header}>
              <LinearGradient colors={[...Colors.gradients.gold]} style={styles.emblem}>
                <Shield size={32} color="#1a1228" />
              </LinearGradient>
              <Text style={styles.brand}>Habits & Dragons</Text>
              <Text style={styles.title}>Enter the realm</Text>
              <Text style={styles.subtitle}>
                Forge habits as quests. Your chronicle begins with a single step through the gate.
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const result = await signInWithApple();
                    if (result.error) setError(humanizeError(result));
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={formDisabled}
                style={({ pressed }) => [styles.appleBtn, pressed && styles.btnPressed]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Apple size={22} color="#ffffff" />
                    <Text style={styles.appleBtnText}>Continue with Apple</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const result = await signInWithGoogle();
                    if (result.error) setError(humanizeError(result));
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={formDisabled}
                style={({ pressed }) => [styles.googleBtn, pressed && styles.btnPressed]}
              >
                <Chrome size={22} color="#1a1228" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setEmailFlowOpen((v) => !v);
                  setError(null);
                  setLegacyMode(false);
                }}
                style={styles.useEmailBtn}
              >
                <Mail size={18} color={Colors.dark.gold} />
                <Text style={styles.useEmailText}>Use email</Text>
              </Pressable>

              {emailFlowOpen ? (
                <View style={styles.emailCard}>
                  <Text style={styles.emailCardTitle}>Passwordless sign-in</Text>
                  <Text style={styles.emailCardHint}>
                    We&apos;ll email you a one-time code — no password required.
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    editable={!formDisabled}
                  />
                  {!otpSent ? (
                    <Pressable
                      onPress={sendOtp}
                      disabled={formDisabled || !email.trim()}
                      style={({ pressed }) => [
                        styles.primaryInline,
                        (!email.trim() || formDisabled) && styles.primaryInlineDisabled,
                        pressed && email.trim() && !formDisabled && styles.btnPressed,
                      ]}
                    >
                      <Text style={styles.primaryInlineText}>Send code</Text>
                    </Pressable>
                  ) : (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Code from email"
                        placeholderTextColor={Colors.dark.textMuted}
                        keyboardType="number-pad"
                        maxLength={12}
                        value={otpCode}
                        onChangeText={setOtpCode}
                        editable={!formDisabled}
                      />
                      <Pressable
                        onPress={verifyOtp}
                        disabled={formDisabled || !otpCode.trim()}
                        style={({ pressed }) => [
                          styles.primaryInline,
                          (!otpCode.trim() || formDisabled) && styles.primaryInlineDisabled,
                          pressed && otpCode.trim() && !formDisabled && styles.btnPressed,
                        ]}
                      >
                        <Text style={styles.primaryInlineText}>Verify & enter</Text>
                      </Pressable>
                      <Pressable onPress={() => setOtpSent(false)} style={styles.resendWrap}>
                        <Text style={styles.resendText}>Resend code</Text>
                      </Pressable>
                    </>
                  )}

                  <Pressable
                    onPress={() => setLegacyMode((v) => !v)}
                    style={styles.legacyToggle}
                  >
                    <Text style={styles.legacyToggleText}>
                      {legacyMode ? "Hide password sign-in" : "Use password instead"}
                    </Text>
                  </Pressable>

                  {legacyMode ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={Colors.dark.textMuted}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        editable={!formDisabled}
                      />
                      <View style={styles.legacyRow}>
                        <Pressable
                          onPress={() => runPasswordAuth("signIn")}
                          disabled={formDisabled || !email.trim() || !password}
                          style={({ pressed }) => [
                            styles.secondaryInline,
                            pressed && styles.btnPressed,
                          ]}
                        >
                          <Text style={styles.secondaryInlineText}>Sign in</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => runPasswordAuth("signUp")}
                          disabled={formDisabled || !email.trim() || !password}
                          style={({ pressed }) => [
                            styles.secondaryInline,
                            pressed && styles.btnPressed,
                          ]}
                        >
                          <Text style={styles.secondaryInlineText}>Create account</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {isAuthLoading ? (
                <Text style={styles.cooldown}>Reconnecting session...</Text>
              ) : null}
              {inCooldown ? (
                <Text style={styles.cooldown}>Too many tries. Wait {cooldownLeftSec}s.</Text>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 32,
    justifyContent: "center",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  header: { alignItems: "center", marginBottom: 28 },
  emblem: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brand: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.gold,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: "900", color: Colors.dark.text, textAlign: "center" },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 320,
    lineHeight: 21,
  },
  actions: { gap: 12 },
  appleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#333",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  appleBtnText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
  googleBtnText: { fontSize: 16, fontWeight: "800", color: "#1a1228" },
  btnPressed: { opacity: 0.88 },
  useEmailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  useEmailText: { fontSize: 15, fontWeight: "700", color: Colors.dark.gold },
  emailCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#120e1aee",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    gap: 10,
  },
  emailCardTitle: { fontSize: 15, fontWeight: "800", color: Colors.dark.text },
  emailCardHint: { fontSize: 12, color: Colors.dark.textMuted, lineHeight: 17 },
  input: {
    backgroundColor: "#0a0812",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryInline: {
    backgroundColor: Colors.dark.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryInlineDisabled: { opacity: 0.45 },
  primaryInlineText: { fontSize: 15, fontWeight: "800", color: "#1a1228" },
  resendWrap: { alignSelf: "center", paddingVertical: 6 },
  resendText: { fontSize: 13, fontWeight: "700", color: Colors.dark.cyan },
  legacyToggle: { alignSelf: "center", paddingVertical: 8 },
  legacyToggleText: { fontSize: 12, fontWeight: "600", color: Colors.dark.textMuted },
  legacyRow: { flexDirection: "row", gap: 10 },
  secondaryInline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "55",
    alignItems: "center",
    backgroundColor: Colors.dark.surface + "88",
  },
  secondaryInlineText: { fontSize: 13, fontWeight: "800", color: Colors.dark.gold },
  error: { color: Colors.dark.ruby, fontSize: 13, textAlign: "center", marginTop: 4 },
  cooldown: { fontSize: 12, color: Colors.dark.textMuted, textAlign: "center" },
});
