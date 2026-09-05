import {
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Keyboard, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ClozePrompt, gradeAnswers } from "../../src/components/ClozePrompt";
import { Text } from "../../src/components/Text";
import { Icon } from "../../src/icons/Icon";
import { type ClozeCard, generateCardCloze } from "../../src/lib/api";
import { hapticCardChecked } from "../../src/lib/haptics";
import { shuffleInPlace } from "../../src/lib/id";
import { type Note, useNotes } from "../../src/store/notes";
import { type CardOrder, useSettings } from "../../src/store/settings";
import { colors, space } from "../../src/theme";

type CheckState = "idle" | "correct" | "wrong";

const clozeCache = new Map<string, ClozeCard>();

export default function TrainScreen() {
  const { notes } = useNotes();
  const { t, cardOrder, autoAdvanceOnCorrect, haptics } = useSettings();
  const pagerRef = useRef<SwipePagerHandle>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [hintText, setHintText] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintGeneration = useRef(0);
  const hintOpacity = useSharedValue(0);
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  useEffect(() => {
    return () => {
      if (hintTimer.current) {
        clearTimeout(hintTimer.current);
      }
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  const rebuildDeck = useCallback(
    (nextMode: CardOrder, keepNoteId?: string) => {
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
    rebuildDeck(cardOrder);
  }, [cardOrder, rebuildDeck]);

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
          setError(t("generateFailed"));
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
  }, [current, t]);

  useEffect(() => {
    setAnswers({});
    setCheckStates({});
    setFocusedIndex(card?.blanks[0]?.index ?? null);
    hintGeneration.current += 1;
    hintOpacity.value = 0;
    setHintText(null);
    if (hintTimer.current) {
      clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, [card, hintOpacity]);

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

  function revealHint() {
    if (!card) {
      return;
    }
    const blank =
      card.blanks.find((item) => item.index === focusedIndex) ?? card.blanks[0];
    const text = blank?.hint || blank?.explanation;
    if (!text) {
      return;
    }
    const generation = hintGeneration.current + 1;
    hintGeneration.current = generation;
    setHintText(text);
    hintOpacity.value = 0;
    hintOpacity.value = withTiming(1, { duration: 280 });
    if (hintTimer.current) {
      clearTimeout(hintTimer.current);
    }
    hintTimer.current = setTimeout(() => {
      hintOpacity.value = withTiming(0, { duration: 280 }, (finished) => {
        if (finished && hintGeneration.current === generation) {
          runOnJS(setHintText)(null);
        }
      });
    }, 3000);
  }

  if (notes.length === 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg, padding: space.lg }}
        edges={["top"]}
      >
        <Text
          style={{
            color: colors.ink,
            fontSize: 22,
            fontWeight: "700",
            marginTop: space.xl,
          }}
        >
          {t("trainEmptyTitle")}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontSize: 16,
            lineHeight: 24,
            marginTop: space.sm,
          }}
        >
          {t("trainEmptyBody")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <SwipePager
        ref={pagerRef}
        canPrev={index > 0}
        canNext={index < deck.length - 1}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      >
        <Pressable
          accessible={false}
          style={{ flex: 1, paddingHorizontal: space.lg, paddingTop: space.md }}
          onPress={Keyboard.dismiss}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 14,
              fontWeight: "700",
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
              source={current?.body ?? ""}
              card={card}
              answers={answers}
              checkStates={checkStates}
              focusedIndex={focusedIndex}
              onFocusBlank={setFocusedIndex}
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
        </Pressable>
      </SwipePager>

      <Pressable accessible={false} onPress={Keyboard.dismiss}>
        <Animated.View
          style={[
            {
              minHeight: 28,
              paddingHorizontal: space.lg,
              paddingBottom: space.md,
            },
            hintStyle,
          ]}
        >
          <Text style={{ color: colors.hint, fontSize: 16 }}>
            {hintText ?? " "}
          </Text>
        </Animated.View>
      </Pressable>

      <View style={{ flexDirection: "row" }}>
        <Pressable
          accessibilityRole="button"
          disabled={!card}
          onPress={revealHint}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 64,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.fill,
            opacity: !card ? 0.28 : pressed ? 0.7 : 1,
          })}
        >
          <Icon name="hint" size={26} color={colors.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!card}
          onPress={() => {
            if (!card) {
              return;
            }
            const graded = gradeAnswers(card, answers);
            setCheckStates(graded);
            const allCorrect = Object.values(graded).every(
              (state) => state === "correct",
            );
            hapticCardChecked(haptics, allCorrect);
            if (
              autoAdvanceOnCorrect &&
              allCorrect &&
              index < deck.length - 1
            ) {
              Keyboard.dismiss();
              if (autoAdvanceTimer.current) {
                clearTimeout(autoAdvanceTimer.current);
              }
              autoAdvanceTimer.current = setTimeout(() => {
                pagerRef.current?.goNext();
              }, 550);
            }
          }}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 64,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.ink,
            opacity: !card ? 0.28 : pressed ? 0.7 : 1,
          })}
        >
          <Icon name="check" size={26} color={colors.bg} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const SWIPE_FADE = { duration: 160 };
const SWIPE_OFFSET = 36;

type SwipePagerHandle = {
  goNext: () => void;
};

const SwipePager = forwardRef<
  SwipePagerHandle,
  {
    children: ReactNode;
    onPrev: () => void;
    onNext: () => void;
    canPrev: boolean;
    canNext: boolean;
  }
>(function SwipePager(
  { children, onPrev, onNext, canPrev, canNext },
  ref,
) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const locked = useSharedValue(false);

  function enterFrom(direction: number) {
    if (direction < 0) {
      onNext();
    } else {
      onPrev();
    }
    translateX.value = -direction * SWIPE_OFFSET;
    opacity.value = 0;
    translateX.value = withTiming(0, SWIPE_FADE);
    opacity.value = withTiming(1, SWIPE_FADE, (finished) => {
      if (finished) {
        locked.value = false;
      }
    });
  }

  function play(direction: number) {
    locked.value = true;
    translateX.value = withTiming(direction * SWIPE_OFFSET, SWIPE_FADE);
    opacity.value = withTiming(0, SWIPE_FADE, (finished) => {
      if (finished) {
        runOnJS(enterFrom)(direction);
      } else {
        locked.value = false;
      }
    });
  }

  useImperativeHandle(ref, () => ({
    goNext() {
      if (!canNext) {
        return;
      }
      play(-1);
    },
  }));

  const gesture = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onUpdate((event) => {
      if (locked.value) {
        return;
      }
      translateX.value = event.translationX;
      opacity.value = interpolate(
        Math.abs(event.translationX),
        [0, 140],
        [1, 0.35],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      if (locked.value) {
        return;
      }
      const goNext = event.translationX < -72 && canNext;
      const goPrev = event.translationX > 72 && canPrev;
      if (!goNext && !goPrev) {
        translateX.value = withTiming(0, SWIPE_FADE);
        opacity.value = withTiming(1, SWIPE_FADE);
        return;
      }
      play(goNext ? -1 : 1);
    });

  const style = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
});
