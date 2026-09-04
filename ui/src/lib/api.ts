import { Platform } from "react-native";

export type ClozeBlank = {
  index: string;
  target: string;
  hint: string;
  explanation: string;
};

export type ClozeCard = {
  original_context: string;
  masked_text: string;
  blanks: ClozeBlank[];
};

export type TitleCard = {
  title: string;
  language: string;
};

function defaultBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://127.0.0.1:8000";
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${defaultBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function generateCardCloze(text: string): Promise<ClozeCard> {
  return postJson<ClozeCard>("/generate_card_cloze", { text });
}

export function generateCardTitle(
  text: string,
  language: string,
): Promise<TitleCard> {
  return postJson<TitleCard>("/generate_card_title", { text, language });
}
