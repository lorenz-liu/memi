import { Pressable, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName } from "../icons/Icon";
import { colors } from "../theme";

export function SquareIconButton({
  name,
  onPress,
  active = false,
  inverted = false,
  size = 52,
  iconSize = 26,
  color,
  disabled = false,
  style,
}: {
  name: IconName;
  onPress: () => void;
  active?: boolean;
  inverted?: boolean;
  size?: number;
  iconSize?: number;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const filled = inverted || active;
  const iconColor =
    color ?? (filled ? colors.bg : disabled ? colors.muted : colors.ink);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: filled ? colors.ink : "transparent",
          opacity: disabled ? 0.35 : pressed ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={iconColor} />
    </Pressable>
  );
}
