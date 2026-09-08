import { Directory, File, Paths } from "expo-file-system";
import { NativeModules, Platform } from "react-native";

import type { Note } from "../store/notes";
import { parseNotesBackup, serializeNotes } from "./backup";

const REMOTE_NAME = "memi-notes.json";
const LOCAL_NAME = "memi-icloud-notes.json";
const PLACEHOLDER_NAME = `.${REMOTE_NAME}.icloud`;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 45_000;

type ICloudModule = {
  defaultICloudContainerPath: string | null;
  isICloudAvailableAsync: () => Promise<boolean>;
  isExistAsync: (path: string, isDirectory: boolean) => Promise<boolean>;
  readDirAsync: (
    path: string,
    options?: { isFullPath?: boolean },
  ) => Promise<string[]>;
  downloadFileAsync: (path: string, destinationDir: string) => Promise<string>;
  uploadFileAsync: (options: {
    destinationPath: string;
    filePath: string;
  }) => Promise<string>;
  unlinkAsync: (path: string) => Promise<boolean>;
};

export type ICloudPull =
  | { status: "unavailable" }
  | { status: "pending" }
  | { status: "empty" }
  | { status: "error" }
  | { status: "ready"; notes: Note[] };

async function loadModule(): Promise<ICloudModule | null> {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    return (await import(
      "@oleg_svetlichnyi/expo-icloud-storage"
    )) as unknown as ICloudModule;
  } catch {
    return null;
  }
}

function containerPath(icloud: ICloudModule): string | null {
  const native = NativeModules.ExpoIcloudStorage as
    | { defaultICloudContainerPath?: string | null }
    | undefined;
  return (
    native?.defaultICloudContainerPath || icloud.defaultICloudContainerPath
  );
}

export async function iCloudAvailable(): Promise<boolean> {
  const icloud = await loadModule();
  if (!icloud) {
    return false;
  }
  try {
    return await icloud.isICloudAvailableAsync();
  } catch {
    return false;
  }
}

export async function pullICloudNotes(): Promise<ICloudPull> {
  const icloud = await loadModule();
  if (!icloud) {
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
  if (remote.kind === "pending") {
    return { status: "pending" };
  }
  if (remote.kind === "missing") {
    return { status: "empty" };
  }

  try {
    const notes = await downloadBackup(icloud, remote.fullPath);
    return { status: "ready", notes };
  } catch {
    return { status: "error" };
  }
}

export async function pushICloudNotes(notes: Note[]): Promise<boolean> {
  const icloud = await loadModule();
  if (!icloud) {
    return false;
  }
  if (!(await icloud.isICloudAvailableAsync())) {
    return false;
  }

  const container = containerPath(icloud);
  if (container) {
    for (const name of [REMOTE_NAME, PLACEHOLDER_NAME]) {
      try {
        await icloud.unlinkAsync(`${container}/Documents/${name}`);
      } catch {
        // File may not exist yet.
      }
    }
  }

  const file = new File(Paths.cache, LOCAL_NAME);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(serializeNotes(notes));

  await withTimeout(
    icloud.uploadFileAsync({
      destinationPath: REMOTE_NAME,
      filePath: file.uri,
    }),
    UPLOAD_TIMEOUT_MS,
  );
  return true;
}

export function unionNotes(local: Note[], cloud: Note[]): Note[] {
  const byId = new Map<string, Note>();
  for (const note of cloud) {
    byId.set(note.id, note);
  }
  for (const note of local) {
    const existing = byId.get(note.id);
    if (!existing || note.updatedAt >= existing.updatedAt) {
      byId.set(note.id, note);
    }
  }
  return [...byId.values()];
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
  | { kind: "pending" }
> {
  const container = containerPath(icloud);

  for (const name of [REMOTE_NAME, PLACEHOLDER_NAME]) {
    try {
      if (await icloud.isExistAsync(name, false)) {
        if (container) {
          return { kind: "found", fullPath: `${container}/Documents/${name}` };
        }
      }
    } catch {
      // Listing may still find the file.
    }
  }

  try {
    const entries = await icloud.readDirAsync("", { isFullPath: true });
    const match = entries.find(isBackupEntry);
    if (match) {
      return { kind: "found", fullPath: match };
    }
    return { kind: "pending" };
  } catch {
    return { kind: "pending" };
  }
}

function isBackupEntry(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return base.replace(/^\./, "").replace(/\.icloud$/, "") === REMOTE_NAME;
}

async function downloadBackup(
  icloud: ICloudModule,
  remotePath: string,
): Promise<Note[]> {
  const downloadDir = new Directory(Paths.cache, "memi-icloud");
  if (downloadDir.exists) {
    downloadDir.delete();
  }
  downloadDir.create();

  const dest = downloadDir.uri;
  const downloaded: string = await withTimeout(
    icloud.downloadFileAsync(remotePath, dest),
    DOWNLOAD_TIMEOUT_MS,
  );

  const candidates: string[] = [downloaded];
  if (remotePath.endsWith(".icloud")) {
    const materialized = remotePath
      .replace(/\/\./, "/")
      .replace(/\.icloud$/, "");
    try {
      const second: string = await withTimeout(
        icloud.downloadFileAsync(materialized, dest),
        DOWNLOAD_TIMEOUT_MS,
      );
      candidates.unshift(second);
    } catch {
      // Placeholder download may already have copied JSON.
    }
  }

  let lastError: unknown;
  for (const path of candidates) {
    try {
      return parseNotesBackup(await new File(path).text());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Could not read iCloud backup");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("iCloud operation timed out"));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
