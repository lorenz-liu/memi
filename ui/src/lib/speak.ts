import {
  type AudioPlayer,
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import { useEffect, useState } from "react";

import { ttsUrl } from "./api";

const TTS_FILE = "memi-tts.mp3";

let player: AudioPlayer | null = null;
let playingId: string | null = null;
let generation = 0;
let abort: AbortController | null = null;
const listeners = new Set<(id: string | null) => void>();

function notify(id: string | null) {
  playingId = id;
  for (const listen of listeners) {
    listen(id);
  }
}

function releasePlayer() {
  if (!player) {
    return;
  }
  try {
    player.pause();
  } catch {
    // Player may already be released.
  }
  player.remove();
  player = null;
}

export function useSpeakingId(): string | null {
  const [id, setId] = useState(playingId);
  useEffect(() => {
    listeners.add(setId);
    return () => {
      listeners.delete(setId);
    };
  }, []);
  return id;
}

export function stopSpeak() {
  generation += 1;
  abort?.abort();
  abort = null;
  releasePlayer();
  if (playingId !== null) {
    notify(null);
  }
}

export async function toggleSpeak(
  id: string,
  text: string,
  voice?: string,
): Promise<void> {
  if (playingId === id) {
    stopSpeak();
    return;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  stopSpeak();
  const token = generation;
  const controller = new AbortController();
  abort = controller;
  notify(id);

  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    const dest = new File(Paths.cache, TTS_FILE);
    const file = await File.downloadFileAsync(ttsUrl(trimmed, voice), dest, {
      idempotent: true,
      signal: controller.signal,
    });
    if (token !== generation) {
      return;
    }
    const next = createAudioPlayer({ uri: file.uri });
    player = next;
    next.addListener("playbackStatusUpdate", (status) => {
      if (token !== generation) {
        return;
      }
      if (status.error || status.didJustFinish) {
        stopSpeak();
      }
    });
    next.play();
  } catch (error) {
    if (controller.signal.aborted || token !== generation) {
      return;
    }
    if (playingId === id) {
      notify(null);
    }
    throw error;
  }
}

export function speakText(
  noteId: string,
  body: string,
  title: string,
  voice?: string,
) {
  return toggleSpeak(noteId, body.trim() || title, voice);
}

export async function playVoiceSample(source: number): Promise<void> {
  stopSpeak();
  const token = generation;
  notify("voice-sample");
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    if (token !== generation) {
      return;
    }
    const next = createAudioPlayer(source);
    player = next;
    next.addListener("playbackStatusUpdate", (status) => {
      if (token !== generation) {
        return;
      }
      if (status.error || status.didJustFinish) {
        stopSpeak();
      }
    });
    next.play();
  } catch {
    if (playingId === "voice-sample") {
      notify(null);
    }
  }
}
