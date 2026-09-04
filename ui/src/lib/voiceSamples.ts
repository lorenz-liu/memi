import type { AppLanguage } from "../i18n/strings";
import type { TtsVoiceId, VoiceName } from "../store/settings";

const SAMPLES: Record<VoiceName, Record<AppLanguage, number>> = {
  ava: {
    en: require("../../assets/voice_samples/ava_en.mp3"),
    fr: require("../../assets/voice_samples/ava_fr.mp3"),
    zh: require("../../assets/voice_samples/ava_zh.mp3"),
  },
  emma: {
    en: require("../../assets/voice_samples/emma_en.mp3"),
    fr: require("../../assets/voice_samples/emma_fr.mp3"),
    zh: require("../../assets/voice_samples/emma_zh.mp3"),
  },
  andrew: {
    en: require("../../assets/voice_samples/andrew_en.mp3"),
    fr: require("../../assets/voice_samples/andrew_fr.mp3"),
    zh: require("../../assets/voice_samples/andrew_zh.mp3"),
  },
  brian: {
    en: require("../../assets/voice_samples/brian_en.mp3"),
    fr: require("../../assets/voice_samples/brian_fr.mp3"),
    zh: require("../../assets/voice_samples/brian_zh.mp3"),
  },
};

const VOICE_NAMES: Record<TtsVoiceId, VoiceName> = {
  "en-US-AvaMultilingualNeural": "ava",
  "en-US-EmmaMultilingualNeural": "emma",
  "en-US-AndrewMultilingualNeural": "andrew",
  "en-US-BrianMultilingualNeural": "brian",
};

export function voiceSample(voice: TtsVoiceId, language: AppLanguage): number {
  return SAMPLES[VOICE_NAMES[voice]][language];
}
