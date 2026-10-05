import { useEffect, useRef, useState } from "react";
import { useCustomer, scopedKey } from "./useCustomer";
import { useFirstLoadFailed } from "./useCardHydration";

export type AutosaveStatus = "idle" | "saving" | "saved";

/* Debounced auto-save for the Edit Card module pages (the proven Card Builder
   pattern): every set() updates local form state instantly and persists the
   whole pending form to the card record a beat after the last change — no Save
   button needed. Pending changes are flushed when the page unmounts, so
   navigating away never loses an edit. Auto-publish picks the change up from
   the same storage write and re-snapshots the live card.

   The form holds a field only until it is stored. Keeping every field touched
   since the page opened meant the next keystroke (or leaving the page) wrote
   them all back — over a card that had since been loaded from the server or
   changed in another tab. */
export function useCardAutosave(debounceMs = 700) {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  // How many times the stored card was replaced under this form (see below). An
  // editor that keeps more on screen than these fields — a list being put
  // together — starts that over from the stored card whenever this moves.
  const [replaced, setReplaced] = useState(0);
  // This browser never managed to load the card: nothing typed here is being
  // saved (see firstLoadFailed), so the badge must not say that it is.
  const savingOff = useFirstLoadFailed();
  const formRef = useRef(form); formRef.current = form;
  const updateRef = useRef(update); updateRef.current = update;
  const timer = useRef<number | null>(null);

  const val = (k: string, dflt = "") => (form[k] !== undefined ? form[k] : String(data[k] ?? dflt));
  /** Write the pending fields to the card record; stored fields leave the form. */
  const store = (shown = true) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const sent = formRef.current;
    if (!Object.keys(sent).length) return;
    let stored = false;
    try { stored = updateRef.current(sent); } catch { /* persistOrWarn already toasts */ }
    if (!stored) { if (shown) setStatus("idle"); return; } // storage is full (the toast says so): the fields stay in the form
    const without = (f: Record<string, string>) => {
      const rest = { ...f };
      for (const k of Object.keys(sent)) if (rest[k] === sent[k]) delete rest[k];
      return rest;
    };
    formRef.current = without(formRef.current);
    if (shown) { setForm(without); setStatus("saved"); }
  };
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; });
  const later = () => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => storeRef.current(), debounceMs);
  };
  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    later();
  };
  /** Save several fields at once (still debounced into one write). */
  const setMany = (patch: Record<string, string>) => {
    setForm((f) => ({ ...f, ...patch }));
    later();
  };

  // Flush a pending debounce when leaving the page — never drop an edit.
  useEffect(() => () => { if (timer.current) storeRef.current(false); }, []);

  // The stored card was replaced under this form — the latest version loaded
  // from the server, or written by another tab. What the form still holds was
  // typed onto the copy that is gone: drop it, with its pending write.
  useEffect(() => {
    const drop = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setReplaced((n) => n + 1);
      if (!Object.keys(formRef.current).length) return;
      formRef.current = {};
      setForm({});
      setStatus("idle");
    };
    const onStorage = (e: StorageEvent) => { if (e.key === scopedKey("dc_customer")) drop(); };
    // The tab is being hidden or left: store a field still waiting out the pause.
    const flush = () => { if (timer.current) storeRef.current(); };
    window.addEventListener("dc:content-reloaded", drop);
    window.addEventListener("storage", onStorage);
    window.addEventListener("dc:flush-edits", flush);
    return () => {
      window.removeEventListener("dc:content-reloaded", drop);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dc:flush-edits", flush);
    };
  }, []);

  return { data, update, val, set, setMany, status: savingOff ? "idle" as const : status, replaced };
}
