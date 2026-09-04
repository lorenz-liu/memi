import * as Localization from "expo-localization";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SquareIconButton } from "../../src/components/SquareIconButton";
import { generateCardTitle } from "../../src/lib/api";
import { fallbackTitle } from "../../src/lib/cloze";
import { useNotes } from "../../src/store/notes";
import { colors, space } from "../../src/theme";

function deviceLanguage(): string {
  const code = Localization.getLocales()[0]?.languageCode ?? "en";
  return code.slice(0, 3).toLowerCase();
}

export default function AddScreen() {
  const router = useRouter();
  const { addNote } = useNotes();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const body = text.trim();
    if (!body || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    let title = fallbackTitle(body);
    try {
      const result = await generateCardTitle(body, deviceLanguage());
      if (result.title.trim()) {
        title = result.title.trim();
      }
    } catch {
      setError("标题生成失败，已使用摘录");
    }
    addNote({ title, body });
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
        <View
          style={{
            height: 56,
            paddingHorizontal: space.sm,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {saving ? (
            <ActivityIndicator
              color={colors.ink}
              style={{ marginRight: space.md }}
            />
          ) : (
            <SquareIconButton
              name="plus"
              inverted
              disabled={!text.trim()}
              onPress={() => void submit()}
            />
          )}
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          textAlignVertical="top"
          placeholder="记下来"
          placeholderTextColor={colors.muted}
          underlineColorAndroid="transparent"
          style={{
            flex: 1,
            paddingHorizontal: space.lg,
            paddingBottom: space.lg,
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
              paddingBottom: space.md,
            }}
          >
            {error}
          </Text>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
