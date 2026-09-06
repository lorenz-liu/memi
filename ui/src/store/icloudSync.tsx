import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

import {
  mergeICloudNotes,
  notesSignature,
  pullICloudNotes,
  pushICloudNotes,
} from "../lib/icloudBackup";
import { useNotes } from "./notes";
import { useSettings } from "./settings";

const PUSH_DELAY_MS = 1500;

export function ICloudNotesSync() {
  const { notes, ready: notesReady, replaceNotes } = useNotes();
  const { ready: settingsReady, iCloud } = useSettings();
  const notesRef = useRef(notes);
  const enabledRef = useRef(false);
  const bootstrapped = useRef(false);
  const pushing = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  notesRef.current = notes;

  useEffect(() => {
    enabledRef.current =
      Platform.OS === "ios" && settingsReady && notesReady && iCloud;
  }, [iCloud, notesReady, settingsReady]);

  useEffect(() => {
    if (!enabledRef.current) {
      bootstrapped.current = false;
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      await pullAndMerge();
      if (cancelled) {
        return;
      }
      bootstrapped.current = true;
      await flushPush();
    }

    async function pullAndMerge() {
      try {
        const cloud = await pullICloudNotes();
        if (cancelled || !cloud) {
          return;
        }
        const merged = mergeICloudNotes(notesRef.current, cloud);
        if (notesSignature(merged) !== notesSignature(notesRef.current)) {
          replaceNotes(merged);
        }
      } catch {
        // iCloud can be briefly unavailable; keep the local library.
      }
    }

    async function flushPush() {
      if (!enabledRef.current || pushing.current) {
        return;
      }
      pushing.current = true;
      try {
        await pushICloudNotes(notesRef.current);
      } catch {
        // Retry on the next notes change or foreground/background event.
      } finally {
        pushing.current = false;
      }
    }

    void bootstrap();

    const appSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (!enabledRef.current) {
          return;
        }
        if (state === "active") {
          void pullAndMerge();
        }
        if (state === "background" || state === "inactive") {
          if (pushTimer.current) {
            clearTimeout(pushTimer.current);
            pushTimer.current = null;
          }
          void flushPush();
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
    if (!bootstrapped.current || !enabledRef.current) {
      return;
    }
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
