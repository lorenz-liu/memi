import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  type TextInput as RNTextInput,
  View,
} from "react-native";
import Swipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomToast } from "../../src/components/BottomToast";
import { SquareIconButton } from "../../src/components/SquareIconButton";
import { Text, TextInput } from "../../src/components/Text";
import { Icon } from "../../src/icons/Icon";
import {
  exportNotes,
  importFailureReason,
  importNotes,
  isCanceledError,
} from "../../src/lib/backupFiles";
import { type Note, useNotes } from "../../src/store/notes";
import { colors, space } from "../../src/theme";

const DELETE_WIDTH = 72;
const HEADER_ICON = 44;
const LEFT_CLUSTER_WIDTH = HEADER_ICON * 2;
const SEARCH_TIMING = {
  duration: 280,
  easing: Easing.out(Easing.cubic),
};

export default function LibraryScreen() {
  const router = useRouter();
  const {
    notes,
    highlightId,
    clearHighlight,
    updateNote,
    deleteNote,
    replaceNotes,
  } = useNotes();
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; token: number } | null>(
    null,
  );
  const openRowClose = useRef<(() => void) | null>(null);
  const fileBusy = useRef(false);

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

  function closeOpenRow() {
    openRowClose.current?.();
    openRowClose.current = null;
  }

  function showToast(message: string) {
    setToast({ message, token: Date.now() });
  }

  async function handleExport() {
    if (fileBusy.current) {
      return;
    }
    fileBusy.current = true;
    try {
      await exportNotes(notes);
    } catch {
      // Ignore cancel / share-sheet dismissal.
    } finally {
      fileBusy.current = false;
    }
  }

  async function handleImport() {
    if (fileBusy.current) {
      return;
    }
    fileBusy.current = true;
    try {
      const imported = await importNotes();
      if (imported) {
        replaceNotes(imported);
      }
    } catch (error) {
      if (!isCanceledError(error)) {
        showToast(`Import failed: ${importFailureReason(error)}`);
      }
    } finally {
      fileBusy.current = false;
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <LibraryHeader
        query={query}
        onQueryChange={setQuery}
        onExport={() => void handleExport()}
        onImport={() => void handleImport()}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: space.xl,
        }}
        ListEmptyComponent={
          notes.length === 0 ? (
            <View
              style={{
                marginTop: space.xl,
                paddingHorizontal: space.lg,
              }}
            >
              <Text
                style={{
                  color: colors.ink,
                  fontSize: 22,
                  fontWeight: "700",
                }}
              >
                your memi is empty
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 16,
                  lineHeight: 24,
                  marginTop: space.sm,
                }}
              >
                write a note you want to remember. memi turns it into cloze
                flashcards — passages with the key words hidden — so you can
                train by filling in the blanks.
              </Text>
            </View>
          ) : (
            <Text
              style={{
                color: colors.muted,
                fontSize: 16,
                marginTop: space.xl,
                paddingHorizontal: space.lg,
              }}
            >
              No matching notes
            </Text>
          )
        }
        renderItem={({ item }) => (
          <LibraryRow
            note={item}
            highlighted={item.id === highlightId}
            onOpen={() => {
              closeOpenRow();
              clearHighlight();
              router.push(`/note/${item.id}`);
            }}
            onPin={() => updateNote(item.id, { pinned: !item.pinned })}
            onSpeak={() => undefined}
            onDelete={() => {
              closeOpenRow();
              deleteNote(item.id);
            }}
            onSwipeOpen={(close) => {
              if (openRowClose.current && openRowClose.current !== close) {
                openRowClose.current();
              }
              openRowClose.current = close;
            }}
            onHighlightEnd={clearHighlight}
          />
        )}
      />
      <BottomToast
        key={toast?.token ?? "idle"}
        message={toast?.message ?? null}
      />
    </SafeAreaView>
  );
}

function LibraryHeader({
  query,
  onQueryChange,
  onExport,
  onImport,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onExport: () => void;
  onImport: () => void;
}) {
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<RNTextInput>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (searching) {
      inputRef.current?.focus();
    }
  }, [searching]);

  function openSearch() {
    setSearching(true);
    progress.value = withTiming(1, SEARCH_TIMING);
  }

  function closeSearch() {
    inputRef.current?.blur();
    onQueryChange("");
    progress.value = withTiming(0, SEARCH_TIMING, (finished) => {
      if (finished) {
        runOnJS(setSearching)(false);
      }
    });
  }

  const leftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.55],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    width: interpolate(progress.value, [0, 1], [LEFT_CLUSTER_WIDTH, 0]),
  }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.25, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const searchIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.45],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const closeIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.45, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: space.md,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Reanimated.View
        pointerEvents={searching ? "none" : "auto"}
        style={[{ overflow: "hidden", flexDirection: "row" }, leftStyle]}
      >
        <View style={{ width: LEFT_CLUSTER_WIDTH, flexDirection: "row" }}>
          <SquareIconButton
            name="export"
            size={HEADER_ICON}
            iconSize={22}
            onPress={onExport}
          />
          <SquareIconButton
            name="import"
            size={HEADER_ICON}
            iconSize={22}
            onPress={onImport}
          />
        </View>
      </Reanimated.View>
      <Reanimated.View
        pointerEvents={searching ? "auto" : "none"}
        style={[{ flex: 1, justifyContent: "center" }, inputStyle]}
      >
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search"
          placeholderTextColor={colors.muted}
          underlineColorAndroid="transparent"
          editable={searching}
          style={{
            fontSize: 18,
            color: colors.ink,
            paddingVertical: 8,
          }}
        />
      </Reanimated.View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (searching) {
            closeSearch();
          } else {
            openSearch();
          }
        }}
        style={({ pressed }) => ({
          width: HEADER_ICON,
          height: HEADER_ICON,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.4 : 1,
        })}
      >
        <Reanimated.View style={[{ position: "absolute" }, searchIconStyle]}>
          <Icon name="search" size={22} color={colors.ink} />
        </Reanimated.View>
        <Reanimated.View style={[{ position: "absolute" }, closeIconStyle]}>
          <Icon name="close" size={22} color={colors.ink} />
        </Reanimated.View>
      </Pressable>
    </View>
  );
}

function LibraryRow({
  note,
  highlighted,
  onOpen,
  onPin,
  onSpeak,
  onDelete,
  onSwipeOpen,
  onHighlightEnd,
}: {
  note: Note;
  highlighted: boolean;
  onOpen: () => void;
  onPin: () => void;
  onSpeak: () => void;
  onDelete: () => void;
  onSwipeOpen: (close: () => void) => void;
  onHighlightEnd: () => void;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);
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

  const restColor = note.pinned ? colors.fill : colors.bg;
  const backgroundColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [restColor, colors.highlight],
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
      <Swipeable
        ref={swipeableRef}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
        rightThreshold={DELETE_WIDTH / 2}
        onSwipeableWillOpen={() => {
          onSwipeOpen(() => swipeableRef.current?.close());
        }}
        renderRightActions={() => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete"
            onPress={onDelete}
            style={{
              width: DELETE_WIDTH,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.danger,
            }}
          >
            <Icon name="trash" size={22} color={colors.bg} />
          </Pressable>
        )}
      >
        <Animated.View style={{ backgroundColor }}>
          <Pressable
            onPress={onOpen}
            style={({ pressed }) => ({
              minHeight: 64,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: space.lg,
              opacity: pressed ? 0.45 : 1,
            })}
          >
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 20,
                fontWeight: "700",
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
      </Swipeable>
    </Animated.View>
  );
}
