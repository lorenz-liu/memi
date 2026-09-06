import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { parseNotesBackup, serializeNotes } from "./backup";
import type { Note } from "../store/notes";

const REMOTE_NAME = "memi-notes.json";
const LOCAL_NAME = "memi-icloud-notes.json";

type ICloudModule = typeof import("@oleg_svetlichnyi/expo-icloud-storage");

async function loadModule(): Promise<ICloudModule | null> {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    return await import("@oleg_svetlichnyi/expo-icloud-storage");
  } catch {
    return null;
  }
}

export async function iCloudAvailable(): Promise<boolean> {
  const icloud = await loadModule();
  if (!icloud) {
    return false;
  }
  try {
    return (
      (await icloud.isICloudAvailableAsync()) &&
      icloud.defaultICloudContainerPath != null
    );
  } catch {
    return false;
  }
}

export async function pullICloudNotes(): Promise<{
  exportedAt: number;
  notes: Note[];
} | null> {
  const icloud = await loadModule();
  if (!icloud?.defaultICloudContainerPath) {
    return null;
  }
  if (!(await icloud.isICloudAvailableAsync())) {
    return null;
  }
  const exists = await icloud.isExistAsync(REMOTE_NAME, false);
  if (!exists) {
    return null;
  }
  const downloadDir = new Directory(Paths.cache, "memi-icloud");
  if (!downloadDir.exists) {
    downloadDir.create();
  }
  const remote = `${icloud.defaultICloudContainerPath}/Documents/${REMOTE_NAME}`;
  const downloaded = await icloud.downloadFileAsync(remote, downloadDir.uri);
  const file = new File(downloaded);
  const raw = await file.text();
  const notes = parseNotesBackup(raw);
  let exportedAt = Date.now();
  try {
    const parsed = JSON.parse(raw) as { exportedAt?: unknown };
    if (typeof parsed.exportedAt === "number") {
      exportedAt = parsed.exportedAt;
    }
  } catch {
    // parseNotesBackup already accepted the payload.
  }
  return { exportedAt, notes };
}

export async function pushICloudNotes(notes: Note[]): Promise<boolean> {
  const icloud = await loadModule();
  if (!icloud?.defaultICloudContainerPath) {
    return false;
  }
  if (!(await icloud.isICloudAvailableAsync())) {
    return false;
  }
  const file = new File(Paths.cache, LOCAL_NAME);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(serializeNotes(notes));
  await icloud.uploadFileAsync({
    destinationPath: REMOTE_NAME,
    filePath: file.uri,
  });
  return true;
}

export function mergeICloudNotes(
  local: Note[],
  cloud: { exportedAt: number; notes: Note[] },
): Note[] {
  const localById = new Map(local.map((note) => [note.id, note]));
  const cloudById = new Map(cloud.notes.map((note) => [note.id, note]));
  const ids = new Set([...localById.keys(), ...cloudById.keys()]);
  const merged: Note[] = [];
  for (const id of ids) {
    const here = localById.get(id);
    const there = cloudById.get(id);
    if (here && there) {
      merged.push(here.updatedAt >= there.updatedAt ? here : there);
      continue;
    }
    if (here && !there) {
      if (cloud.exportedAt >= here.updatedAt) {
        continue;
      }
      merged.push(here);
      continue;
    }
    if (there) {
      merged.push(there);
    }
  }
  return merged;
}

export function notesSignature(notes: Note[]): string {
  return notes
    .map((note) => `${note.id}:${note.updatedAt}:${note.pinned ? 1 : 0}`)
    .sort()
    .join("|");
}
