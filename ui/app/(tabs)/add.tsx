import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text, TextInput } from "../../src/components/Text";
import { generateCardTitle } from "../../src/lib/api";
import { fallbackTitle } from "../../src/lib/cloze";
import { hapticNoteAdded } from "../../src/lib/haptics";
import { useNotes } from "../../src/store/notes";
import { useSettings } from "../../src/store/settings";
import { colors, space } from "../../src/theme";

export default function AddScreen() {
  const router = useRouter();
  const { addNote } = useNotes();
  const { t, language, haptics } = useSettings();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSave = text.trim().length > 0 && !saving;

  async function submit() {
    const body = text.trim();
    if (!body || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    let title = fallbackTitle(body);
    try {
      const result = await generateCardTitle(body, language);
      if (result.title.trim()) {
        title = result.title.trim();
      }
    } catch {
      setError(t("addTitleFailed"));
    }
    addNote({ title, body });
    hapticNoteAdded(haptics);
    setText("");
    setSaving(false);
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          textAlignVertical="top"
          placeholder={t("addPlaceholder")}
          placeholderTextColor={colors.muted}
          underlineColorAndroid="transparent"
          style={{
            flex: 1,
            paddingHorizontal: space.lg,
            paddingTop: space.lg,
            paddingBottom: space.md,
            fontSize: 22,
            lineHeight: 32,
            color: colors.ink,
          }}
        />
        {error ? (
          <Text
            style={{
              color: colors.muted,
              paddingHorizontal: space.lg,
              paddingBottom: space.sm,
            }}
          >
            {error}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row" }}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => router.replace("/(tabs)")}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 64,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.fill,
              opacity: saving ? 0.28 : pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: colors.ink,
                fontSize: 18,
                letterSpacing: 1.4,
                fontWeight: "700",
              }}
            >
              {t("cancel")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!canSave}
            onPress={() => void submit()}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 64,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.ink,
              opacity: !canSave ? 0.28 : pressed ? 0.7 : 1,
            })}
          >
            {saving ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text
                style={{
                  color: colors.bg,
                  fontSize: 18,
                  letterSpacing: 1.4,
                  fontWeight: "700",
                }}
              >
                {t("add")}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
