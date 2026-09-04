import { useRouter } from "expo-router";
import { View } from "react-native";

import { SquareIconButton } from "../src/components/SquareIconButton";
import { Text } from "../src/components/Text";
import { useSettings } from "../src/store/settings";
import { colors, space } from "../src/theme";

export default function NotFound() {
  const router = useRouter();
  const { t } = useSettings();
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
        {t("notFound")}
      </Text>
    </View>
  );
}
