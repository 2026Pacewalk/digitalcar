/* A template the user is TRYING, not yet applied.
 *
 * Picking a template in the Templates editor puts it here; the live phone
 * previews (Card Builder and the edit pages' LivePreview) show the card in that
 * design straight away, with an Apply / Cancel bar above the phone. Nothing is
 * saved until Apply — which runs the editor's own apply, so saving and the live
 * card update work exactly as before.
 *
 * A tiny module store (not React context) because the editor and the previews
 * live in different parts of the tree on different pages.
 *
 * Each editor instance clears only ITS OWN draft: the Card Builder mounts the
 * editor twice (desktop panel + mobile sheet), and the idle copy must not wipe
 * the draft the visible one just set.
 */
import { useSyncExternalStore } from "react";

export type DesignDraft = {
  theme: string;
  color: string;
  color2: string;
  name: string;
  apply: () => void;
  cancel: () => void;
};

let draft: (DesignDraft & { owner: object }) | null = null;
const listeners = new Set<() => void>();

/** Set the owner's draft, or (null) clear it — only if that owner set it. */
export function setDesignDraft(owner: object, next: DesignDraft | null) {
  if (next) draft = { ...next, owner };
  else if (draft && draft.owner === owner) draft = null;
  else return;
  listeners.forEach((l) => l());
}

export function useDesignDraft(): DesignDraft | null {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => draft,
    () => null,
  );
}
