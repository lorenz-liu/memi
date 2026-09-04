import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { SquareIconButton } from "../src/components/SquareIconButton";
import { colors, space } from "../src/theme";

export default function NotFound() {
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        padding: space.lg,
        justifyContent: "center",
      }}
    >
      <SquareIconButton
        name="close"
        onPress={() => router.replace("/(tabs)")}
      />
      <Text style={{ marginTop: space.md, color: colors.muted, fontSize: 16 }}>
        Not found
      </Text>
    </View>
  );
}
