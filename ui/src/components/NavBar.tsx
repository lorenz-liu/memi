import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme";
import { SquareIconButton } from "./SquareIconButton";

const TABS = [
  { key: "index", icon: "list" as const },
  { key: "add", icon: "plus" as const },
  { key: "train", icon: "flashcards" as const },
];

type TabRoute = { key: string; name: string };

type NavBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

export function NavBar({ state, navigation }: NavBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
      }}
    >
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        const isAdd = tab.key === "add";
        return (
          <SquareIconButton
            key={tab.key}
            name={tab.icon}
            inverted={isAdd}
            iconSize={isAdd ? 30 : 26}
            color={isAdd ? undefined : focused ? colors.ink : colors.muted}
            onPress={() => {
              const route = state.routes[index];
              if (!route) {
                return;
              }
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          />
        );
      })}
    </View>
  );
}
