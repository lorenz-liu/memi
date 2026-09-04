import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { Note } from "../store/notes";
import { BackupError, parseNotesBackup, serializeNotes } from "./backup";

export async function exportNotes(notes: Note[]): Promise<void> {
  const json = serializeNotes(notes);
  const fileName = exportFileName();
  const stem = fileName.replace(/\.json$/i, "");

  if (Platform.OS === "android") {
    const directory = await Directory.pickDirectoryAsync();
    const file = directory.createFile(stem, "application/json");
    file.write(json);
    return;
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Export library",
  });
}

export async function importNotes(): Promise<Note[] | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets[0]) {
    return null;
  }

  let raw: string;
  try {
    raw = await new File(picked.assets[0].uri).text();
  } catch {
    throw new BackupError("Could not read file");
  }
  return parseNotesBackup(raw);
}

export function isCanceledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|dismiss|abort/i.test(message);
}

export function importFailureReason(error: unknown): string {
  if (error instanceof BackupError) {
    return error.reason;
  }
  return "Could not read file";
}

function exportFileName(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `memi-library-${year}${month}${day}-${hours}${minutes}.json`;
}
