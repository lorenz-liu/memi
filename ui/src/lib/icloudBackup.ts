import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { Note } from "../store/notes";
import { parseNotesBackup, serializeNotes } from "./backup";

const REMOTE_NAME = "memi-notes.json";
const LOCAL_NAME = "memi-icloud-notes.json";
const PLACEHOLDER_NAME = `.${REMOTE_NAME}.icloud`;

type ICloudModule = typeof import("@oleg_svetlichnyi/expo-icloud-storage");

export type ICloudPull =
  | { status: "unavailable" }
  | { status: "empty" }
  | { status: "error" }
  | { status: "ready"; exportedAt: number; notes: Note[] };

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

export async function pullICloudNotes(): Promise<ICloudPull> {
  const icloud = await loadModule();
  if (!icloud?.defaultICloudContainerPath) {
    return { status: "unavailable" };
  }
  try {
    if (!(await icloud.isICloudAvailableAsync())) {
      return { status: "unavailable" };
    }
  } catch {
    return { status: "unavailable" };
  }

  const remote = await resolveRemoteBackup(icloud);
  if (remote.kind === "unknown") {
    return { status: "unavailable" };
  }
  if (remote.kind === "missing") {
    return { status: "empty" };
  }

  try {
    const downloadDir = new Directory(Paths.cache, "memi-icloud");
    if (downloadDir.exists) {
      downloadDir.delete();
    }
    downloadDir.create();
    const downloaded = await icloud.downloadFileAsync(
      remote.fullPath,
      downloadDir.uri,
    );
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
    return { status: "ready", exportedAt, notes };
  } catch {
    return { status: "error" };
  }
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

async function resolveRemoteBackup(
  icloud: ICloudModule,
): Promise<
  | { kind: "found"; fullPath: string }
  | { kind: "missing" }
  | { kind: "unknown" }
> {
  const container = icloud.defaultICloudContainerPath;
  if (!container) {
    return { kind: "unknown" };
  }

  for (const name of [REMOTE_NAME, PLACEHOLDER_NAME]) {
    try {
      if (await icloud.isExistAsync(name, false)) {
        return { kind: "found", fullPath: `${container}/Documents/${name}` };
      }
    } catch {
      return { kind: "unknown" };
    }
  }

  try {
    const entries = await icloud.readDirAsync("", { isFullPath: true });
    const match = entries.find((entry) => {
      const base = entry.split("/").pop() ?? entry;
      return base.replace(/^\./, "").replace(/\.icloud$/, "") === REMOTE_NAME;
    });
    if (match) {
      return { kind: "found", fullPath: match };
    }
    if (entries.length === 0) {
      return { kind: "unknown" };
    }
    return { kind: "missing" };
  } catch {
    return { kind: "unknown" };
  }
}
