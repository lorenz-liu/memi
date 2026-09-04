import { createId } from "./id";

export const BACKUP_VERSION = 1;

export type BackupNote = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export class BackupError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "BackupError";
    this.reason = reason;
  }
}

export function serializeNotes(notes: BackupNote[]): string {
  return JSON.stringify(
    {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      notes,
    },
    null,
    2,
  );
}

export function parseNotesBackup(raw: string): BackupNote[] {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    throw new BackupError("Wrong format");
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new BackupError("Invalid JSON");
  }

  const list = extractNoteList(data);
  const seen = new Set<string>();
  const notes: BackupNote[] = [];
  for (const item of list) {
    const note = normalizeNote(item);
    if (seen.has(note.id)) {
      note.id = createId();
    }
    seen.add(note.id);
    notes.push(note);
  }
  return notes;
}

function extractNoteList(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === "object" && "notes" in data) {
    const notes = (data as { notes: unknown }).notes;
    if (Array.isArray(notes)) {
      return notes;
    }
  }
  throw new BackupError("Wrong format");
}

function normalizeNote(value: unknown): BackupNote {
  if (!value || typeof value !== "object") {
    throw new BackupError("Wrong format");
  }
  const item = value as Record<string, unknown>;
  if (typeof item.title !== "string" || typeof item.body !== "string") {
    throw new BackupError("Wrong format");
  }

  const now = Date.now();
  const id =
    typeof item.id === "string" && item.id.length > 0 ? item.id : createId();
  const pinned = item.pinned === undefined ? false : item.pinned;
  if (typeof pinned !== "boolean") {
    throw new BackupError("Wrong format");
  }
  const createdAt =
    item.createdAt === undefined ? now : asTimestamp(item.createdAt);
  const updatedAt =
    item.updatedAt === undefined ? createdAt : asTimestamp(item.updatedAt);

  return {
    id,
    title: item.title,
    body: item.body,
    pinned,
    createdAt,
    updatedAt,
  };
}

function asTimestamp(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BackupError("Wrong format");
  }
  return value;
}
