import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SquareIconButton } from "../../src/components/SquareIconButton";
import { useNotes } from "../../src/store/notes";
import { colors, space } from "../../src/theme";

export default function NoteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes, updateNote } = useNotes();
  const note = useMemo(() => notes.find((item) => item.id === id), [id, notes]);
  const [editing, setEditing] = useState(false);

  if (!note) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg, padding: space.lg }}
      >
        <SquareIconButton name="close" onPress={() => router.back()} />
      </SafeAreaView>
    );
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
          }}
        >
          <SquareIconButton name="close" onPress={() => router.back()} />
          <View style={{ flex: 1 }} />
          <SquareIconButton
            name="pin"
            color={note.pinned ? colors.ink : colors.muted}
            onPress={() => updateNote(note.id, { pinned: !note.pinned })}
          />
          <SquareIconButton
            name="speak"
            color={colors.muted}
            onPress={() => undefined}
          />
          <SquareIconButton
            name="edit"
            active={editing}
            onPress={() => setEditing((value) => !value)}
          />
        </View>
        {editing ? (
          <TextInput
            value={note.title}
            onChangeText={(title) => {
              if (title.length > 0) {
                updateNote(note.id, { title });
              }
            }}
            underlineColorAndroid="transparent"
            style={{
              paddingHorizontal: space.lg,
              fontSize: 28,
              color: colors.ink,
              paddingBottom: space.md,
            }}
          />
        ) : (
          <Text
            style={{
              paddingHorizontal: space.lg,
              fontSize: 28,
              color: colors.ink,
              paddingBottom: space.md,
            }}
          >
            {note.title}
          </Text>
        )}
        {editing ? (
          <TextInput
            value={note.body}
            onChangeText={(body) => updateNote(note.id, { body })}
            multiline
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            style={{
              flex: 1,
              paddingHorizontal: space.lg,
              fontSize: 18,
              lineHeight: 28,
              color: colors.ink,
            }}
          />
        ) : (
          <Text
            style={{
              paddingHorizontal: space.lg,
              fontSize: 18,
              lineHeight: 28,
              color: colors.ink,
            }}
          >
            {note.body}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
