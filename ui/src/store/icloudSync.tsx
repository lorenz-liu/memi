import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

import {
  type ICloudPull,
  notesSignature,
  pullICloudNotes,
  pushICloudNotes,
  unionNotes,
} from "../lib/icloudBackup";
import { useNotes } from "./notes";
import { useSettings } from "./settings";

const PUSH_DELAY_MS = 800;
const OPEN_RETRY_DELAYS_MS = [
  0, 400, 800, 1200, 2000, 3000, 5000, 8000, 12_000, 20_000, 30_000,
];

export function ICloudNotesSync() {
  const { notes, ready: notesReady, replaceNotes } = useNotes();
  const { ready: settingsReady, iCloud } = useSettings();
  const notesRef = useRef(notes);
  const enabledRef = useRef(false);
  const syncedOpen = useRef(false);
  const running = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  notesRef.current = notes;

  useEffect(() => {
    const enabled =
      Platform.OS === "ios" && settingsReady && notesReady && iCloud;
    enabledRef.current = enabled;
    if (!enabled) {
      syncedOpen.current = false;
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
      return;
    }

    let cancelled = false;

    async function syncOpen() {
      if (cancelled || running.current) {
        return;
      }
      running.current = true;
      try {
        const pulled = await pullUntilReadable(() => cancelled);
        if (cancelled) {
          return;
        }
        if (pulled.status === "ready" || pulled.status === "empty") {
          const cloudNotes = pulled.status === "ready" ? pulled.notes : [];
          const local = notesRef.current;
          const merged = unionNotes(local, cloudNotes);
          notesRef.current = merged;
          if (notesSignature(merged) !== notesSignature(local)) {
            replaceNotes(merged);
          }
          await pushICloudNotes(merged);
          if (!cancelled) {
            syncedOpen.current = true;
          }
          return;
        }
        if (pulled.status !== "unavailable" && notesRef.current.length > 0) {
          await pushICloudNotes(notesRef.current);
          if (!cancelled) {
            syncedOpen.current = true;
          }
        }
      } catch {
        // Keep local notes. Retry on the next foreground.
      } finally {
        running.current = false;
      }
    }

    void (async () => {
      await syncOpen();
      for (const delay of [15_000, 30_000, 60_000, 120_000]) {
        if (cancelled || syncedOpen.current) {
          return;
        }
        await sleep(delay);
        if (cancelled || syncedOpen.current) {
          return;
        }
        await syncOpen();
      }
    })();

    const appSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (!enabledRef.current) {
          return;
        }
        if (state === "active") {
          syncedOpen.current = false;
          void syncOpen();
        }
      },
    );

    return () => {
      cancelled = true;
      appSub.remove();
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
    };
  }, [iCloud, notesReady, replaceNotes, settingsReady]);

  useEffect(() => {
    if (!enabledRef.current || !syncedOpen.current) {
      return;
    }
    void notes;
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
    }
    pushTimer.current = setTimeout(() => {
      void pushICloudNotes(notesRef.current).catch(() => undefined);
    }, PUSH_DELAY_MS);
    return () => {
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
    };
  }, [notes]);

  return null;
}

async function pullUntilReadable(
  isCancelled: () => boolean,
): Promise<ICloudPull> {
  let last: ICloudPull = { status: "pending" };
  let emptyStreak = 0;

  for (const delay of OPEN_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await sleep(delay);
    }
    if (isCancelled()) {
      return last;
    }
    try {
      last = await pullICloudNotes();
    } catch {
      last = { status: "error" };
    }
    if (last.status === "ready") {
      return last;
    }
    if (last.status === "empty") {
      emptyStreak += 1;
      if (emptyStreak >= 4) {
        return last;
      }
    } else {
      emptyStreak = 0;
    }
  }
  return last;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
