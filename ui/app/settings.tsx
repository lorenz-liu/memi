import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomToast } from "../src/components/BottomToast";
import { SquareIconButton } from "../src/components/SquareIconButton";
import { Text } from "../src/components/Text";
import { type AppLanguage, LANGUAGE_NATIVE_NAMES } from "../src/i18n/strings";
import { Icon, type IconName } from "../src/icons/Icon";
import {
  exportNotes,
  importFailureReason,
  importNotes,
  isCanceledError,
} from "../src/lib/backupFiles";
import { playVoiceSample, stopSpeak } from "../src/lib/speak";
import { voiceSample } from "../src/lib/voiceSamples";
import { useNotes } from "../src/store/notes";
import { type CardOrder, TTS_VOICES, useSettings } from "../src/store/settings";
import { colors, space } from "../src/theme";

type Pane = "home" | "language" | "voice" | "order" | "about";

const HOME_URL = "https://lorenz.fun";
const COFFEE_URL = "https://buymeacoffee.com/lorenzliu";
const COPYRIGHT_YEAR = 2026;

export default function SettingsScreen() {
  const router = useRouter();
  const { notes, replaceNotes } = useNotes();
  const {
    t,
    language,
    voice,
    cardOrder,
    autoAdvanceOnCorrect,
    haptics,
    setLanguage,
    setVoice,
    setCardOrder,
    setAutoAdvanceOnCorrect,
    setHaptics,
  } = useSettings();
  const [pane, setPane] = useState<Pane>("home");
  const [toast, setToast] = useState<{ message: string; token: number } | null>(
    null,
  );
  const fileBusy = useRef(false);

  useEffect(() => {
    return () => {
      stopSpeak();
    };
  }, []);

  function showToast(message: string) {
    setToast({ message, token: Date.now() });
  }

  async function handleExport() {
    if (fileBusy.current) {
      return;
    }
    fileBusy.current = true;
    try {
      await exportNotes(notes);
    } catch {
      // Ignore cancel / share-sheet dismissal.
    } finally {
      fileBusy.current = false;
    }
  }

  async function handleImport() {
    if (fileBusy.current) {
      return;
    }
    fileBusy.current = true;
    try {
      const imported = await importNotes();
      if (imported) {
        replaceNotes(imported);
      }
    } catch (error) {
      if (!isCanceledError(error)) {
        showToast(`${t("importFailed")}: ${importFailureReason(error)}`);
      }
    } finally {
      fileBusy.current = false;
    }
  }

  const voiceMeta =
    TTS_VOICES.find((item) => item.id === voice) ?? TTS_VOICES[0];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <View
        style={{
          height: 56,
          paddingHorizontal: space.sm,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <SquareIconButton
          name="close"
          onPress={() => {
            if (pane === "voice") {
              stopSpeak();
            }
            if (pane === "home") {
              router.back();
            } else {
              setPane("home");
            }
          }}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 20,
            fontWeight: "700",
            color: colors.ink,
            paddingHorizontal: space.sm,
          }}
        >
          {t("settings")}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        {pane === "home" ? (
          <>
            <SettingsRow
              icon="language"
              title={t("settingsLanguage")}
              detail={LANGUAGE_NATIVE_NAMES[language]}
              onPress={() => setPane("language")}
            />
            <SettingsRow
              icon="speak"
              title={t("settingsVoice")}
              detail={t(voiceMeta.labelKey)}
              onPress={() => setPane("voice")}
            />
            <SettingsRow
              icon="shuffle"
              title={t("settingsOrder")}
              detail={
                cardOrder === "shuffle" ? t("orderShuffle") : t("orderRepeat")
              }
              onPress={() => setPane("order")}
            />
            <SettingsRow
              icon="next"
              title={t("settingsAutoAdvance")}
              detail={autoAdvanceOnCorrect ? t("on") : t("off")}
              onPress={() => setAutoAdvanceOnCorrect(!autoAdvanceOnCorrect)}
            />
            <SettingsRow
              icon="vibrate"
              title={t("settingsHaptics")}
              detail={haptics ? t("on") : t("off")}
              onPress={() => setHaptics(!haptics)}
            />
            <SettingsRow
              icon="export"
              title={t("settingsExport")}
              detail={t("settingsExportDetail")}
              onPress={() => void handleExport()}
            />
            <SettingsRow
              icon="import"
              title={t("settingsImport")}
              detail={t("settingsImportDetail")}
              onPress={() => void handleImport()}
            />
            <SettingsRow
              icon="about"
              title={t("settingsAbout")}
              detail={t("settingsAboutDetail")}
              onPress={() => setPane("about")}
            />
          </>
        ) : null}
        {pane === "language"
          ? (["en", "fr", "zh"] as AppLanguage[]).map((code) => (
              <ChoiceRow
                key={code}
                label={LANGUAGE_NATIVE_NAMES[code]}
                selected={language === code}
                onPress={() => {
                  setLanguage(code);
                  setPane("home");
                }}
              />
            ))
          : null}
        {pane === "voice"
          ? TTS_VOICES.map((item) => (
              <ChoiceRow
                key={item.id}
                label={t(item.labelKey)}
                selected={voice === item.id}
                onPress={() => {
                  setVoice(item.id);
                  void playVoiceSample(voiceSample(item.id, language));
                }}
              />
            ))
          : null}
        {pane === "order"
          ? (
              [
                ["shuffle", "orderShuffle"],
                ["repeat", "orderRepeat"],
              ] as const
            ).map(([value, key]) => (
              <ChoiceRow
                key={value}
                label={t(key)}
                selected={cardOrder === value}
                onPress={() => {
                  setCardOrder(value as CardOrder);
                  setPane("home");
                }}
              />
            ))
          : null}
        {pane === "about" ? <AboutBody /> : null}
      </ScrollView>
      {pane === "home" ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            textAlign: "center",
            paddingHorizontal: space.lg,
            paddingBottom: space.md,
          }}
        >
          {t("settingsCopyright")}
        </Text>
      ) : null}
      <BottomToast
        key={toast?.token ?? "idle"}
        message={toast?.message ?? null}
      />
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: space.lg,
        opacity: pressed ? 0.45 : 1,
      })}
    >
      <Icon name={icon} size={26} color={colors.ink} />
      <View style={{ flex: 1, marginLeft: space.md }}>
        <Text style={{ fontSize: 18, color: colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

function AboutBody() {
  return (
    <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
      <AboutBlock>
        {`copyright © ${COPYRIGHT_YEAR} Lorenz Liu. all rights reserved.`}
      </AboutBlock>
      <AboutBlock>
        {
          "本应用由 Lorenz Liu 开发与维护。\ndeveloped and maintained by Lorenz Liu."
        }
      </AboutBlock>
      <AboutLink url={HOME_URL} />
      <AboutBlock>
        {
          "版权声明 / legal notice:\n未经开发者书面许可，严禁将本软件用于任何形式的商业分发、转发或二次销售。\nunauthorized commercial distribution, modification, or redistribution without prior written consent is strictly prohibited."
        }
      </AboutBlock>
      <AboutBlock>
        {
          "隐私保护 / privacy:\n本应用不收集、不存储任何个人信息。\nthis app does not collect or track any personal information."
        }
      </AboutBlock>
      <AboutBlock>{"支持开发者 / support:\nbuy me a coffee:"}</AboutBlock>
      <AboutLink url={COFFEE_URL} />
    </View>
  );
}

function AboutLink({ url }: { url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        void Linking.openURL(url);
      }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.45 : 1,
        paddingVertical: 4,
        marginBottom: space.md,
      })}
    >
      <Text
        style={{
          fontSize: 16,
          lineHeight: 24,
          color: colors.ink,
          textDecorationLine: "underline",
        }}
      >
        {url}
      </Text>
    </Pressable>
  );
}

function AboutBlock({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 16,
        lineHeight: 24,
        color: colors.ink,
        marginBottom: space.md,
      }}
    >
      {children}
    </Text>
  );
}

function ChoiceRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: space.lg,
        opacity: pressed ? 0.45 : 1,
      })}
    >
      <Icon
        name="check"
        size={26}
        color={selected ? colors.ink : "transparent"}
      />
      <Text
        style={{
          flex: 1,
          marginLeft: space.md,
          fontSize: 18,
          fontWeight: selected ? "700" : "400",
          color: colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
