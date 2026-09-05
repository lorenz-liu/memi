import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomToast } from "../../src/components/BottomToast";
import { ConfirmDialog } from "../../src/components/ConfirmDialog";
import { SquareIconButton } from "../../src/components/SquareIconButton";
import { Text, TextInput } from "../../src/components/Text";
import { speakText, useSpeakingId } from "../../src/lib/speak";
import { useNotes } from "../../src/store/notes";
import { useSettings } from "../../src/store/settings";
import { colors, space } from "../../src/theme";

export default function NoteScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes, updateNote } = useNotes();
  const note = useMemo(() => notes.find((item) => item.id === id), [id, notes]);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [toast, setToast] = useState<{ message: string; token: number } | null>(
    null,
  );
  const speakingId = useSpeakingId();
  const { t, voice } = useSettings();
  const [leavePrompt, setLeavePrompt] = useState(false);
  const allowLeave = useRef(false);
  const leaveAction = useRef<(() => void) | null>(null);
  const dirty =
    !!note &&
    editing &&
    (draftTitle !== note.title || draftBody !== note.body);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowLeave.current || !dirty || !note) {
        return;
      }
      event.preventDefault();
      Keyboard.dismiss();
      const action = event.data.action;
      leaveAction.current = () => navigation.dispatch(action);
      setLeavePrompt(true);
    });
    return unsubscribe;
  }, [dirty, navigation, note]);

  function stayOnNote() {
    setLeavePrompt(false);
    leaveAction.current = null;
  }

  function leaveNote(save: boolean) {
    if (save && note) {
      updateNote(note.id, { title: draftTitle, body: draftBody });
    }
    allowLeave.current = true;
    setLeavePrompt(false);
    const leave = leaveAction.current;
    leaveAction.current = null;
    leave?.();
  }

  if (!note) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg, padding: space.lg }}
      >
        <SquareIconButton name="close" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  function saveAndStopEditing() {
    if (!note) {
      return;
    }
    updateNote(note.id, { title: draftTitle, body: draftBody });
    setEditing(false);
  }

  function startEditing() {
    if (!note) {
      return;
    }
    setDraftTitle(note.title);
    setDraftBody(note.body);
    setEditing(true);
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
            color={speakingId === note.id ? colors.ink : colors.muted}
            onPress={() => {
              void speakText(note.id, note.body, note.title, voice).catch(
                () => {
                  setToast({
                    message: t("speakFailed"),
                    token: Date.now(),
                  });
                },
              );
            }}
          />
          <SquareIconButton
            name="edit"
            active={editing}
            onPress={() => {
              if (editing) {
                saveAndStopEditing();
              } else {
                startEditing();
              }
            }}
          />
        </View>
        {editing ? (
          <TextInput
            value={draftTitle}
            onChangeText={setDraftTitle}
            underlineColorAndroid="transparent"
            style={{
              paddingHorizontal: space.lg,
              fontSize: 28,
              fontWeight: "700",
              color: colors.ink,
              paddingBottom: space.md,
            }}
          />
        ) : (
          <Text
            style={{
              paddingHorizontal: space.lg,
              fontSize: 28,
              fontWeight: "700",
              color: colors.ink,
              paddingBottom: space.md,
            }}
          >
            {note.title}
          </Text>
        )}
        {editing ? (
          <TextInput
            value={draftBody}
            onChangeText={setDraftBody}
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
      <BottomToast
        key={toast?.token ?? "idle"}
        message={toast?.message ?? null}
      />
      <ConfirmDialog
        visible={leavePrompt}
        title={t("saveChangesTitle")}
        body={t("saveChangesBody")}
        cancelLabel={t("cancel")}
        onCancel={stayOnNote}
        actions={[
          { label: t("discard"), onPress: () => leaveNote(false), kind: "danger" },
          { label: t("cancel"), onPress: stayOnNote, kind: "muted" },
          { label: t("save"), onPress: () => leaveNote(true), kind: "ink" },
        ]}
      />
    </SafeAreaView>
  );
}
