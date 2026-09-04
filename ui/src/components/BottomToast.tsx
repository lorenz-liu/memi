import { useEffect, useRef, useState } from "react";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, fonts, space } from "../theme";
import { Text } from "./Text";

export function BottomToast({ message }: { message: string | null }) {
  const opacity = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const [shown, setShown] = useState<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (!message) {
      generation.current += 1;
      opacity.value = 0;
      setShown(null);
      return;
    }

    const current = generation.current + 1;
    generation.current = current;
    setShown(message);
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 280 });

    const hide = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 280 }, (finished) => {
        if (finished && generation.current === current) {
          runOnJS(setShown)(null);
        }
      });
    }, 3000);

    return () => {
      clearTimeout(hide);
    };
  }, [message, opacity]);

  if (!shown) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: 64,
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: space.lg,
          backgroundColor: colors.ink,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.bg,
          fontSize: 16,
          fontFamily: fonts.bold,
          textAlign: "center",
        }}
      >
        {shown}
      </Text>
    </Animated.View>
  );
}
