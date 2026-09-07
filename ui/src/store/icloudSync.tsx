import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

import {
  type ICloudPull,
  mergeICloudNotes,
  notesSignature,
  pullICloudNotes,
  pushICloudNotes,
} from "../lib/icloudBackup";
import type { Note } from "./notes";
import { useNotes } from "./notes";
import { useSettings } from "./settings";

const PUSH_DELAY_MS = 1500;
const PULL_RETRY_DELAYS_MS = [800, 1600, 3200, 5000, 8000];
const LATE_PULL_DELAYS_MS = [15_000, 30_000, 60_000];

type CloudGate = "unknown" | "empty" | "ready";

export function ICloudNotesSync() {
  const { notes, ready: notesReady, replaceNotes } = useNotes();
  const { ready: settingsReady, iCloud } = useSettings();
  const notesRef = useRef(notes);
  const enabledRef = useRef(false);
  const bootstrapped = useRef(false);
  const pushing = useRef(false);
  const pulling = useRef(false);
  const cloudGate = useRef<CloudGate>("unknown");
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishPullRef = useRef<
    (pulled: ICloudPull, adoptEmpty: boolean) => Promise<void>
  >(async () => undefined);

  notesRef.current = notes;

  useEffect(() => {
    const enabled =
      Platform.OS === "ios" && settingsReady && notesReady && iCloud;
    enabledRef.current = enabled;
    if (!enabled) {
      bootstrapped.current = false;
      cloudGate.current = "unknown";
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
      return;
    }

    let cancelled = false;
    const lateTimers: ReturnType<typeof setTimeout>[] = [];

    function applyPull(pulled: ICloudPull, adoptEmpty: boolean): boolean {
      if (pulled.status === "ready") {
        const local = notesRef.current;
        const merged = mergeICloudNotes(local, pulled);
        notesRef.current = merged;
        if (notesSignature(merged) !== notesSignature(local)) {
          replaceNotes(merged);
        }
        cloudGate.current = pulled.notes.length === 0 ? "empty" : "ready";
        return true;
      }
      if (
        notesRef.current.length > 0 &&
        (pulled.status === "empty" ||
          (adoptEmpty && pulled.status === "unavailable"))
      ) {
        cloudGate.current = "empty";
        return true;
      }
      return false;
    }

    function canPush(next: Note[]): boolean {
      if (cloudGate.current === "unknown") {
        return false;
      }
      if (next.length === 0) {
        return bootstrapped.current;
      }
      return true;
    }

    async function pullOnce(): Promise<ICloudPull> {
      if (pulling.current) {
        return { status: "unavailable" };
      }
      pulling.current = true;
      try {
        return await pullICloudNotes();
      } catch {
        return { status: "error" };
      } finally {
        pulling.current = false;
      }
    }

    async function pullWithRetries(): Promise<ICloudPull> {
      let last = await pullOnce();
      if (last.status === "ready") {
        return last;
      }
      for (const delay of PULL_RETRY_DELAYS_MS) {
        if (cancelled) {
          return last;
        }
        await sleep(delay);
        if (cancelled) {
          return last;
        }
        last = await pullOnce();
        if (last.status === "ready") {
          return last;
        }
      }
      return last;
    }

    async function flushPush() {
      if (
        !enabledRef.current ||
        pushing.current ||
        !canPush(notesRef.current)
      ) {
        return;
      }
      pushing.current = true;
      try {
        await pushICloudNotes(notesRef.current);
        cloudGate.current = notesRef.current.length === 0 ? "empty" : "ready";
      } catch {
        // Retry on the next notes change or foreground/background event.
      } finally {
        pushing.current = false;
      }
    }

    async function finishPull(pulled: ICloudPull, adoptEmpty: boolean) {
      if (cancelled) {
        return;
      }
      if (!applyPull(pulled, adoptEmpty)) {
        return;
      }
      bootstrapped.current = true;
      await flushPush();
    }

    finishPullRef.current = finishPull;

    void pullWithRetries().then((pulled) => finishPull(pulled, true));

    for (const delay of LATE_PULL_DELAYS_MS) {
      lateTimers.push(
        setTimeout(() => {
          if (cancelled || bootstrapped.current) {
            return;
          }
          void pullWithRetries().then((pulled) => finishPull(pulled, true));
        }, delay),
      );
    }

    const appSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (!enabledRef.current) {
          return;
        }
        if (state === "active") {
          if (bootstrapped.current) {
            void pullOnce().then((pulled) => finishPull(pulled, false));
            return;
          }
          void pullWithRetries().then((pulled) => finishPull(pulled, true));
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
      for (const timer of lateTimers) {
        clearTimeout(timer);
      }
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
    };
  }, [iCloud, notesReady, replaceNotes, settingsReady]);

  useEffect(() => {
    if (!enabledRef.current) {
      return;
    }
    if (!bootstrapped.current) {
      if (notes.length > 0) {
        void pullICloudNotes()
          .then((pulled) => finishPullRef.current(pulled, false))
          .catch(() => undefined);
      }
      return;
    }
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
    }
    pushTimer.current = setTimeout(() => {
      if (cloudGate.current === "unknown") {
        return;
      }
      void pushICloudNotes(notesRef.current)
        .then(() => {
          cloudGate.current = notesRef.current.length === 0 ? "empty" : "ready";
        })
        .catch(() => undefined);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
