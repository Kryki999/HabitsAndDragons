import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { fetchDailyReflection, upsertDailyReflection } from "@/lib/dailyReflections";
import { useGameStore } from "@/store/gameStore";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";

type Props = {
  dateKey: string;
  userId: string | null;
  /** Larger bottom padding on castle screen */
  variant?: "modal" | "screen";
};

export default function DailyReflectionPanel({ dateKey, userId, variant = "modal" }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  const [savedRemote, setSavedRemote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dirty = draft.trim() !== savedRemote.trim();

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    if (!userId) {
      setDraft("");
      setSavedRemote("");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDailyReflection(userId, dateKey).then(({ row, error }) => {
      if (cancelled) return;
      if (error) {
        setLoadError(error);
        setDraft("");
        setSavedRemote("");
      } else {
        const c = row?.content ?? "";
        setDraft(c);
        setSavedRemote(c);
        if (c.trim().length > 0) {
          useGameStore.getState().recordHeroReflectionSaved(dateKey);
        }
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, dateKey]);

  const onSave = useCallback(async () => {
    if (!userId) {
      Alert.alert("Zaloguj się", "Refleksje są zapisywane na koncie — zaloguj się, aby je zapisać.");
      return;
    }
    impactAsync(ImpactFeedbackStyle.Medium);
    setSaving(true);
    setLoadError(null);
    const { row, error } = await upsertDailyReflection(userId, dateKey, draft);
    setSaving(false);
    if (error) {
      setLoadError(error);
      Alert.alert("Błąd zapisu", error);
      return;
    }
    const next = row?.content ?? draft.trim();
    setSavedRemote(next);
    setDraft(next);
    if (next.trim().length > 0) {
      useGameStore.getState().recordHeroReflectionSaved(dateKey);
    }
  }, [userId, dateKey, draft]);

  const bottomPad = variant === "screen" ? Math.max(insets.bottom, 12) + 8 : 8;

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <Text style={styles.title}>Daily Reflection</Text>
      <Text style={styles.sub}>Refleksja</Text>
      {loading ? (
        <View style={styles.loaderRow}>
          <ActivityIndicator color={Colors.dark.gold} />
        </View>
      ) : (
        <>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Jakie wnioski płyną z dzisiejszej bitwy?"
            placeholderTextColor={Colors.dark.textMuted}
            multiline
            textAlignVertical="top"
            style={styles.input}
            editable={!saving}
          />
          {loadError && !loading ? <Text style={styles.errText}>{loadError}</Text> : null}
          <Pressable
            onPress={onSave}
            disabled={saving || !dirty}
            style={({ pressed }) => [
              styles.saveBtn,
              (!dirty || saving) && styles.saveBtnDisabled,
              pressed && dirty && !saving && styles.saveBtnPressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#1a1228" />
            ) : (
              <Text style={styles.saveBtnText}>Zapisz</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border + "88",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark.textMuted,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  loaderRow: {
    paddingVertical: 24,
    alignItems: "center",
  },
  input: {
    minHeight: 100,
    maxHeight: 180,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.dark.surface + "ee",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
  },
  errText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.dark.fire,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.gold,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnPressed: {
    opacity: 0.9,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1a1228",
  },
});
