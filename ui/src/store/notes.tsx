import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createId } from "../lib/id";

const STORAGE_KEY = "memi.notes.v1";

export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

type NotesContextValue = {
  notes: Note[];
  ready: boolean;
  highlightId: string | null;
  addNote: (input: { title: string; body: string }) => Note;
  updateNote: (
    id: string,
    patch: Partial<Pick<Note, "title" | "body" | "pinned">>,
  ) => void;
  deleteNote: (id: string) => void;
  replaceNotes: (notes: Note[]) => void;
  clearHighlight: () => void;
};

const NotesContext = createContext<NotesContextValue | null>(null);

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.createdAt - a.createdAt;
  });
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled || !raw) {
          return;
        }
        const parsed = JSON.parse(raw) as Note[];
        if (Array.isArray(parsed)) {
          setNotes(sortNotes(parsed));
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, ready]);

  const addNote = useCallback((input: { title: string; body: string }) => {
    const now = Date.now();
    const note: Note = {
      id: createId(),
      title: input.title,
      body: input.body,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((current) => sortNotes([note, ...current]));
    setHighlightId(note.id);
    return note;
  }, []);

  const updateNote = useCallback(
    (id: string, patch: Partial<Pick<Note, "title" | "body" | "pinned">>) => {
      setNotes((current) =>
        sortNotes(
          current.map((note) =>
            note.id === id
              ? { ...note, ...patch, updatedAt: Date.now() }
              : note,
          ),
        ),
      );
    },
    [],
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
    setHighlightId((current) => (current === id ? null : current));
  }, []);

  const replaceNotes = useCallback((next: Note[]) => {
    setNotes(sortNotes(next));
    setHighlightId(null);
  }, []);

  const clearHighlight = useCallback(() => setHighlightId(null), []);

  const value = useMemo(
    () => ({
      notes,
      ready,
      highlightId,
      addNote,
      updateNote,
      deleteNote,
      replaceNotes,
      clearHighlight,
    }),
    [
      notes,
      ready,
      highlightId,
      addNote,
      updateNote,
      deleteNote,
      replaceNotes,
      clearHighlight,
    ],
  );

  return (
    <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
  );
}

export function useNotes(): NotesContextValue {
  const value = useContext(NotesContext);
  if (!value) {
    throw new Error("useNotes must be used within NotesProvider");
  }
  return value;
}
