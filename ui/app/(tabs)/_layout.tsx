import { Tabs } from "expo-router";

import { NavBar } from "../../src/components/NavBar";
import { colors } from "../../src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <NavBar state={props.state} navigation={props.navigation} />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="train" />
    </Tabs>
  );
}
