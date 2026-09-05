import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, space } from "../theme";
import { Text } from "./Text";

export type ConfirmAction = {
  label: string;
  onPress: () => void;
  kind?: "ink" | "danger" | "muted";
};

export function ConfirmDialog({
  visible,
  title,
  body,
  actions,
  onCancel,
  cancelLabel,
}: {
  visible: boolean;
  title: string;
  body: string;
  actions: ConfirmAction[];
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          onPress={onCancel}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, space.sm) },
          ]}
        >
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
          {actions.map((action) => {
            const color =
              action.kind === "danger"
                ? colors.danger
                : action.kind === "muted"
                  ? colors.muted
                  : colors.ink;
            return (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.action,
                  { opacity: pressed ? 0.45 : 1 },
                ]}
              >
                <Text style={{ fontSize: 18, color }}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 17, 17, 0.28)",
  },
  sheet: {
    backgroundColor: colors.bg,
  },
  copy: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
  },
  body: {
    marginTop: space.sm,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  action: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
});
