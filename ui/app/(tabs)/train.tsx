import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ClozePrompt, gradeAnswers } from "../../src/components/ClozePrompt";
import { SquareIconButton } from "../../src/components/SquareIconButton";
import { type ClozeCard, generateCardCloze } from "../../src/lib/api";
import { shuffleInPlace } from "../../src/lib/id";
import { type Note, useNotes } from "../../src/store/notes";
import { colors, space } from "../../src/theme";

type Mode = "repeat" | "shuffle";
type CheckState = "idle" | "correct" | "wrong";

const clozeCache = new Map<string, ClozeCard>();

export default function TrainScreen() {
  const { notes } = useNotes();
  const [mode, setMode] = useState<Mode>("repeat");
  const [deck, setDeck] = useState<Note[]>([]);
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState<ClozeCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkStates, setCheckStates] = useState<Record<string, CheckState>>(
    {},
  );
  const [focusedIndex, setFocusedIndex] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  const rebuildDeck = useCallback(
    (nextMode: Mode, keepNoteId?: string) => {
      const ordered =
        nextMode === "shuffle" ? shuffleInPlace([...notes]) : [...notes];
      setDeck(ordered);
      if (keepNoteId) {
        const nextIndex = ordered.findIndex((note) => note.id === keepNoteId);
        setIndex(nextIndex >= 0 ? nextIndex : 0);
      } else {
        setIndex(0);
      }
    },
    [notes],
  );

  useEffect(() => {
    rebuildDeck(mode);
  }, [mode, rebuildDeck]);

  const current = deck[index] ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!current) {
        setCard(null);
        return;
      }
      const cacheKey = `${current.id}:${current.body}`;
      const cached = clozeCache.get(cacheKey);
      if (cached) {
        setCard(cached);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setCard(null);
      try {
        const generated = await generateCardCloze(current.body);
        clozeCache.set(cacheKey, generated);
        if (!cancelled) {
          setCard(generated);
        }
      } catch {
        if (!cancelled) {
          setError("无法生成闪卡");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [current]);

  useEffect(() => {
    setAnswers({});
    setCheckStates({});
    setFocusedIndex(card?.blanks[0]?.index ?? null);
    setHintVisible(false);
  }, [card]);

  const go = useCallback(
    (delta: number) => {
      setIndex((value) => {
        const next = value + delta;
        if (next < 0 || next >= deck.length) {
          return value;
        }
        return next;
      });
    },
    [deck.length],
  );

  const hintText = useMemo(() => {
    if (!card || !hintVisible) {
      return null;
    }
    const blank =
      card.blanks.find((item) => item.index === focusedIndex) ?? card.blanks[0];
    return blank?.hint || blank?.explanation || null;
  }, [card, focusedIndex, hintVisible]);

  if (notes.length === 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg, padding: space.lg }}
        edges={["top"]}
      >
        <Text style={{ color: colors.muted, fontSize: 16 }}>
          先去记一条，再来训练
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <View
        style={{
          height: 56,
          paddingHorizontal: space.sm,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <SquareIconButton
          name="repeat"
          active={mode === "repeat"}
          onPress={() => setMode("repeat")}
        />
        <SquareIconButton
          name="shuffle"
          active={mode === "shuffle"}
          onPress={() => setMode("shuffle")}
        />
      </View>

      <SwipePager
        canPrev={index > 0}
        canNext={index < deck.length - 1}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      >
        <View
          style={{ flex: 1, paddingHorizontal: space.lg, paddingTop: space.md }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 14,
              marginBottom: space.md,
            }}
          >
            {current?.title ?? ""}
          </Text>
          {loading ? <ActivityIndicator color={colors.ink} /> : null}
          {error ? (
            <Text style={{ color: colors.muted, fontSize: 16 }}>{error}</Text>
          ) : null}
          {card ? (
            <ClozePrompt
              card={card}
              answers={answers}
              checkStates={checkStates}
              focusedIndex={focusedIndex}
              onFocusBlank={(blankIndex) => {
                setFocusedIndex(blankIndex);
                setHintVisible(false);
              }}
              onChangeAnswer={(blankIndex, value) => {
                setAnswers((currentAnswers) => ({
                  ...currentAnswers,
                  [blankIndex]: value,
                }));
                setCheckStates((currentStates) => ({
                  ...currentStates,
                  [blankIndex]: "idle",
                }));
              }}
            />
          ) : null}
        </View>
      </SwipePager>

      <View style={{ minHeight: 28, paddingHorizontal: space.lg }}>
        {hintText ? (
          <Text style={{ color: colors.ink, fontSize: 16 }}>{hintText}</Text>
        ) : null}
      </View>

      <View
        style={{
          paddingHorizontal: space.sm,
          paddingBottom: space.sm,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <SquareIconButton
          name="hint"
          disabled={!card}
          onPress={() => setHintVisible((value) => !value)}
        />
        <SquareIconButton
          name="check"
          disabled={!card}
          onPress={() => {
            if (!card) {
              return;
            }
            setHintVisible(false);
            setCheckStates(gradeAnswers(card, answers));
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function SwipePager({
  children,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  children: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const translateX = useSharedValue(0);
  const gesture = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -72 && canNext) {
        runOnJS(onNext)();
      } else if (event.translationX > 72 && canPrev) {
        runOnJS(onPrev)();
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const style = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
