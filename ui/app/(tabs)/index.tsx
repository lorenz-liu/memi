import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SquareIconButton } from "../../src/components/SquareIconButton";
import { type Note, useNotes } from "../../src/store/notes";
import { colors, space } from "../../src/theme";

export default function LibraryScreen() {
  const router = useRouter();
  const { notes, highlightId, clearHighlight, updateNote } = useNotes();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return notes;
    }
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q),
    );
  }, [notes, query]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <View
        style={{
          height: 56,
          paddingHorizontal: space.md,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {searching ? (
          <>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.muted}
              underlineColorAndroid="transparent"
              style={{
                flex: 1,
                fontSize: 18,
                color: colors.ink,
                paddingVertical: 8,
              }}
            />
            <SquareIconButton
              name="close"
              size={44}
              iconSize={22}
              onPress={() => {
                setQuery("");
                setSearching(false);
              }}
            />
          </>
        ) : (
          <>
            <View style={{ flex: 1 }} />
            <SquareIconButton
              name="search"
              size={44}
              iconSize={22}
              onPress={() => setSearching(true)}
            />
          </>
        )}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: space.xl,
        }}
        ListEmptyComponent={
          <Text
            style={{ color: colors.muted, fontSize: 16, marginTop: space.xl }}
          >
            No notes yet
          </Text>
        }
        renderItem={({ item }) => (
          <LibraryRow
            note={item}
            highlighted={item.id === highlightId}
            onOpen={() => {
              clearHighlight();
              router.push(`/note/${item.id}`);
            }}
            onPin={() => updateNote(item.id, { pinned: !item.pinned })}
            onSpeak={() => undefined}
            onHighlightEnd={clearHighlight}
          />
        )}
      />
    </SafeAreaView>
  );
}

function LibraryRow({
  note,
  highlighted,
  onOpen,
  onPin,
  onSpeak,
  onHighlightEnd,
}: {
  note: Note;
  highlighted: boolean;
  onOpen: () => void;
  onPin: () => void;
  onSpeak: () => void;
  onHighlightEnd: () => void;
}) {
  const appear = useRef(new Animated.Value(highlighted ? 0 : 1)).current;
  const flash = useRef(new Animated.Value(highlighted ? 1 : 0)).current;

  useEffect(() => {
    if (!highlighted) {
      return;
    }
    Animated.timing(appear, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: 160,
        useNativeDriver: false,
      }),
      Animated.timing(flash, {
        toValue: 0,
        duration: 700,
        useNativeDriver: false,
      }),
    ]).start(() => onHighlightEnd());
  }, [appear, flash, highlighted, onHighlightEnd]);

  const backgroundColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.bg, colors.highlight],
  });

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [
          {
            translateY: appear.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
        marginBottom: 4,
      }}
    >
      <Animated.View style={{ backgroundColor }}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => ({
            minHeight: 64,
            flexDirection: "row",
            alignItems: "center",
            opacity: pressed ? 0.45 : 1,
          })}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 20,
              color: colors.ink,
              paddingVertical: space.md,
            }}
          >
            {note.title}
          </Text>
          <SquareIconButton
            name="pin"
            size={44}
            iconSize={20}
            color={note.pinned ? colors.ink : colors.muted}
            onPress={onPin}
          />
          <SquareIconButton
            name="speak"
            size={44}
            iconSize={20}
            color={colors.muted}
            onPress={onSpeak}
          />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
