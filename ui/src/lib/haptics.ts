import * as Haptics from "expo-haptics";

export function hapticNoteAdded(enabled: boolean) {
  if (!enabled) {
    return;
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticCardChecked(enabled: boolean, allCorrect: boolean) {
  if (!enabled) {
    return;
  }
  void Haptics.notificationAsync(
    allCorrect
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error,
  );
}
