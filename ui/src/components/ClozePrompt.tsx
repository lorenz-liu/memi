import { useEffect, useMemo, useRef } from "react";
import { Animated, View } from "react-native";
import type { ClozeCard } from "../lib/api";
import {
  answersMatch,
  buildClozeSegments,
  segmentsToLines,
} from "../lib/cloze";
import { colors } from "../theme";
import { Text, TextInput } from "./Text";

type CheckState = "idle" | "correct" | "wrong";

export function ClozePrompt({
  source,
  card,
  answers,
  onChangeAnswer,
  focusedIndex,
  onFocusBlank,
  checkStates,
}: {
  source: string;
  card: ClozeCard;
  answers: Record<string, string>;
  onChangeAnswer: (index: string, value: string) => void;
  focusedIndex: string | null;
  onFocusBlank: (index: string) => void;
  checkStates: Record<string, CheckState>;
}) {
  const lines = useMemo(
    () => segmentsToLines(buildClozeSegments(source, card)),
    [card, source],
  );
  return (
    <View>
      {lines.map((line) => (
        <View
          key={line.key}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            minHeight: 36,
          }}
        >
          {line.items.map((segment) => {
            if (segment.type === "text") {
              return (
                <Text
                  key={`${line.key}-${segment.key}`}
                  style={{ fontSize: 22, lineHeight: 36, color: colors.ink }}
                >
                  {segment.value}
                </Text>
              );
            }
            return (
              <ClozeBlankInput
                key={`${line.key}-${segment.key}`}
                value={answers[segment.blank.index] ?? ""}
                target={segment.blank.target}
                focused={focusedIndex === segment.blank.index}
                state={checkStates[segment.blank.index] ?? "idle"}
                onChange={(value) => onChangeAnswer(segment.blank.index, value)}
                onFocus={() => onFocusBlank(segment.blank.index)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function ClozeBlankInput({
  value,
  target,
  focused,
  state,
  onChange,
  onFocus,
}: {
  value: string;
  target: string;
  focused: boolean;
  state: CheckState;
  onChange: (value: string) => void;
  onFocus: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === "correct") {
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(pulse, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
    if (state === "wrong") {
      Animated.sequence([
        Animated.timing(shake, {
          toValue: 1,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: -1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: 1,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: -1,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: 0.6,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [pulse, shake, state]);

  const width = Math.max(
    48,
    Math.min(220, Math.max(value.length, target.length) * 14 + 20),
  );

  return (
    <Animated.View
      style={{
        transform: [
          { scale: pulse },
          {
            translateX: shake.interpolate({
              inputRange: [-1, 1],
              outputRange: [-14, 14],
            }),
          },
        ],
        marginHorizontal: 2,
        marginVertical: 4,
        backgroundColor:
          focused && state === "idle" ? colors.highlight : colors.fill,
        borderWidth: state === "idle" ? 0 : 3,
        borderColor: state === "correct" ? colors.correct : colors.wrong,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        autoCorrect={false}
        autoCapitalize="none"
        underlineColorAndroid="transparent"
        style={{
          width,
          minHeight: 36,
          paddingHorizontal: 8,
          fontSize: 22,
          lineHeight: 28,
          color: colors.ink,
        }}
      />
    </Animated.View>
  );
}

export function gradeAnswers(
  card: ClozeCard,
  answers: Record<string, string>,
): Record<string, CheckState> {
  const result: Record<string, CheckState> = {};
  for (const blank of card.blanks) {
    result[blank.index] = answersMatch(answers[blank.index] ?? "", blank.target)
      ? "correct"
      : "wrong";
  }
  return result;
}
