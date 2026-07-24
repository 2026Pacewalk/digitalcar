import { useCallback, useEffect, useState } from "react";
import { useCustomer } from "./useCustomer";

export type Enq = {
  id: string; name: string; contact: string; email: string;
  description: string; uname: string; created_on: string; status?: string;
};

export const NEW_ENQ_KEY = "dc_new_enquiries";
export const READ_ENQ_KEY = "dc_enquiry_readids";
export const ENQ_PING_KEY = "dc_enquiry_ping";
export const ENQ_EVENT = "dc:new-enquiry";

export function loadNewEnquiries(slug?: string): Enq[] {
  try {
    const a = JSON.parse(localStorage.getItem(NEW_ENQ_KEY) || "[]");
    if (!Array.isArray(a)) return [];
    const sl = slug ? slug.toLowerCase() : "";
    return sl ? a.filter((e: Enq) => String(e.uname ?? "").toLowerCase() === sl) : a;
  } catch { return []; }
}
function loadReadIds(): string[] {
  try { const a = JSON.parse(localStorage.getItem(READ_ENQ_KEY) || "[]"); return Array.isArray(a) ? a : []; }
  catch { return []; }
}

/* Live view of a customer's card-submitted enquiries + unread tracking. */
export function useEnquiryNotifications() {
  const { data } = useCustomer();
  const slug = String(data.slug || "");
  const [newItems, setNewItems] = useState<Enq[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  const refresh = useCallback(() => { setNewItems(loadNewEnquiries(slug)); setReadIds(loadReadIds()); }, [slug]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === NEW_ENQ_KEY || e.key === READ_ENQ_KEY || e.key === ENQ_PING_KEY) refresh();
    };
    const onCustom = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(ENQ_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ENQ_EVENT, onCustom as EventListener);
    };
  }, [refresh]);

  const recent = [...newItems].sort((a, b) => (b.created_on || "").localeCompare(a.created_on || ""));
  const unread = recent.filter((e) => !readIds.includes(e.id));

  const markAllRead = useCallback(() => {
    const ids = loadNewEnquiries(slug).map((e) => e.id);
    setReadIds(ids);
    try { localStorage.setItem(READ_ENQ_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }, [slug]);

  return { unreadCount: unread.length, unread, recent, newItems, markAllRead, refresh };
}
