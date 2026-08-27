import { useEffect, useRef, useState } from "react";
import { useCustomer } from "./useCustomer";

export type AutosaveStatus = "idle" | "saving" | "saved";

/* Debounced auto-save for the Edit Card module pages (the proven Card Builder
   pattern): every set() updates local form state instantly and persists the
   whole pending form to the card record a beat after the last change — no Save
   button needed. Pending changes are flushed when the page unmounts, so
   navigating away never loses an edit. Auto-publish picks the change up from
   the same storage write and re-snapshots the live card. */
export function useCardAutosave(debounceMs = 700) {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const formRef = useRef(form); formRef.current = form;
  const updateRef = useRef(update); updateRef.current = update;
  const timer = useRef<number | null>(null);

  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { updateRef.current(formRef.current); setStatus("saved"); } catch { /* persistOrWarn already toasts */ }
    }, debounceMs);
  };
  /** Save several fields at once (still debounced into one write). */
  const setMany = (patch: Record<string, string>) => {
    setForm((f) => ({ ...f, ...patch }));
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { updateRef.current(formRef.current); setStatus("saved"); } catch { /* ignore */ }
    }, debounceMs);
  };

  // Flush a pending debounce when leaving the page — never drop an edit.
  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
      if (Object.keys(formRef.current).length) { try { updateRef.current(formRef.current); } catch { /* ignore */ } }
    }
  }, []);

  return { data, update, val, set, setMany, status };
}
