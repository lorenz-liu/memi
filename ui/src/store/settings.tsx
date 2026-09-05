import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { type AppLanguage, type StringKey, strings } from "../i18n/strings";

export type CardOrder = "repeat" | "shuffle";
export type VoiceName = "ava" | "emma" | "andrew" | "brian";
export type TtsVoiceId =
  | "en-US-AvaMultilingualNeural"
  | "en-US-EmmaMultilingualNeural"
  | "en-US-AndrewMultilingualNeural"
  | "en-US-BrianMultilingualNeural";

export const TTS_VOICES: {
  id: TtsVoiceId;
  name: VoiceName;
  labelKey: StringKey;
}[] = [
  {
    id: "en-US-AvaMultilingualNeural",
    name: "ava",
    labelKey: "voiceAva",
  },
  {
    id: "en-US-EmmaMultilingualNeural",
    name: "emma",
    labelKey: "voiceEmma",
  },
  {
    id: "en-US-AndrewMultilingualNeural",
    name: "andrew",
    labelKey: "voiceAndrew",
  },
  {
    id: "en-US-BrianMultilingualNeural",
    name: "brian",
    labelKey: "voiceBrian",
  },
];

export const DEFAULT_TTS_VOICE: TtsVoiceId = "en-US-AvaMultilingualNeural";

type Settings = {
  language: AppLanguage;
  voice: TtsVoiceId;
  cardOrder: CardOrder;
  autoAdvanceOnCorrect: boolean;
  haptics: boolean;
};

const STORAGE_KEY = "memi.settings.v1";

const DEFAULTS: Settings = {
  language: "en",
  voice: DEFAULT_TTS_VOICE,
  cardOrder: "shuffle",
  autoAdvanceOnCorrect: true,
  haptics: true,
};

type SettingsContextValue = Settings & {
  ready: boolean;
  t: (key: StringKey) => string;
  setLanguage: (language: AppLanguage) => void;
  setVoice: (voice: TtsVoiceId) => void;
  setCardOrder: (cardOrder: CardOrder) => void;
  setAutoAdvanceOnCorrect: (autoAdvanceOnCorrect: boolean) => void;
  setHaptics: (haptics: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function deviceLanguage(): AppLanguage {
  const code = Localization.getLocales()[0]?.languageCode ?? "en";
  if (code === "zh" || code.startsWith("zh")) {
    return "zh";
  }
  if (code === "fr") {
    return "fr";
  }
  return "en";
}

function parseSettings(raw: string): Settings {
  const parsed = JSON.parse(raw) as Partial<Settings>;
  const language =
    parsed.language === "en" ||
    parsed.language === "fr" ||
    parsed.language === "zh"
      ? parsed.language
      : deviceLanguage();
  const voice =
    parsed.voice && TTS_VOICES.some((item) => item.id === parsed.voice)
      ? parsed.voice
      : DEFAULT_TTS_VOICE;
  const cardOrder =
    parsed.cardOrder === "repeat" || parsed.cardOrder === "shuffle"
      ? parsed.cardOrder
      : DEFAULTS.cardOrder;
  return {
    language,
    voice,
    cardOrder,
    autoAdvanceOnCorrect:
      typeof parsed.autoAdvanceOnCorrect === "boolean"
        ? parsed.autoAdvanceOnCorrect
        : true,
    haptics: typeof parsed.haptics === "boolean" ? parsed.haptics : true,
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    ...DEFAULTS,
    language: deviceLanguage(),
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          setSettings(parseSettings(raw));
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [ready, settings]);

  const patch = useCallback((next: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...next }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      ready,
      t: (key) => strings[settings.language][key],
      setLanguage: (language) => patch({ language }),
      setVoice: (voice) => patch({ voice }),
      setCardOrder: (cardOrder) => patch({ cardOrder }),
      setAutoAdvanceOnCorrect: (autoAdvanceOnCorrect) =>
        patch({ autoAdvanceOnCorrect }),
      setHaptics: (haptics) => patch({ haptics }),
    }),
    [patch, ready, settings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return value;
}
