import { useCallback, useEffect, useRef, useState } from "react";
import { useSnapshot, type CardSnapshot } from "./card";
import { setFields, useCardUpdate } from "./cardStore";

/* Autosave for plain card fields (name, UPI ID, social heading…). Typing
   updates a local draft; a moment after the last keystroke only the fields
   that were actually changed are written, onto the latest card — so a field
   changed on the website meanwhile is never put back to an old value. */

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

const read = <K extends string>(snap: CardSnapshot | null | undefined, keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, String(snap?.data.customer?.[k] ?? "")])) as Record<K, string>;

export function useCardFields<K extends string>(keys: readonly K[], delay = 1200) {
  const snapshot = useSnapshot();
  const update = useCardUpdate();
  const [draft, setDraft] = useState<Record<K, string> | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef<Record<K, string> | null>(null);
  const dirty = useRef(new Set<K>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keysRef = useRef(keys);

  // Follow the server copy whenever nothing is waiting to be saved.
  useEffect(() => {
    if (!snapshot.data || dirty.current.size) return;
    const next = read(snapshot.data, keysRef.current);
    draftRef.current = next;
    setDraft(next);
  }, [snapshot.data]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const changed = [...dirty.current];
    if (!changed.length || !draftRef.current) return true;
    dirty.current.clear();
    const patch = Object.fromEntries(changed.map((k) => [k, draftRef.current![k]]));
    setState("saving");
    const r = await update(setFields(patch));
    if (!r.ok) {
      changed.forEach((k) => dirty.current.add(k)); // try these again with the next save
      setState("error");
      setError(r.message);
      return false;
    }
    setError(null);
    setState(dirty.current.size ? "pending" : "saved");
    return true;
  }, [update]);

  const set = useCallback((key: K, value: string) => {
    if (!draftRef.current) return;
    draftRef.current = { ...draftRef.current, [key]: value };
    setDraft(draftRef.current);
    dirty.current.add(key);
    setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, delay);
  }, [delay, flush]);

  // Leaving the screen saves what was typed rather than dropping it.
  useEffect(() => () => { if (dirty.current.size) void flush(); }, [flush]);

  return { snapshot, draft, set, flush, state, error, loading: snapshot.isLoading };
}
