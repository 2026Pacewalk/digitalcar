import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { NEW_ENQ_KEY, ENQ_PING_KEY, ENQ_EVENT, loadNewEnquiries, type Enq } from "@/hooks/useEnquiryNotifications";
import { scopedKey } from "@/hooks/useCustomer";

/* Mount once (in App). Watches localStorage for freshly-submitted card enquiries
   and raises a toast alert. Reacts across tabs (storage event) and within the
   same tab / card iframe (custom event). */
export default function EnquiryToaster() {
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentSlug = () => { try { return JSON.parse(localStorage.getItem(scopedKey("dc_customer")) || "{}").slug || ""; } catch { return ""; } };

    // Baseline: everything already stored is "known" (no toast on first load)
    known.current = new Set(loadNewEnquiries().map((e) => e.id));

    const check = () => {
      const slug = currentSlug();
      const list = loadNewEnquiries();
      for (const e of list as Enq[]) {
        if (known.current!.has(e.id)) continue;
        known.current!.add(e.id);
        if (slug && e.uname && e.uname.toLowerCase() !== slug.toLowerCase()) continue; // only alert the owning customer
        toast.custom((t) => (
          <div className="flex items-start gap-3 bg-white rounded-2xl shadow-premium-lg border border-[#F1F5F9] p-4 w-[340px]">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Mail size={18} className="text-[#F7B31C]" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#0F172A]">New enquiry received!</p>
              <p className="text-xs text-[#475569] mt-0.5 truncate"><span className="font-semibold">{e.name || "Someone"}</span>{e.description ? ` — ${e.description}` : ""}</p>
              <button onClick={() => { toast.dismiss(t); window.location.assign("/dashboard/enquiry"); }} className="mt-2 text-xs font-semibold text-[#F7B31C] hover:underline">View enquiry →</button>
            </div>
          </div>
        ), { duration: 8000 });
      }
    };

    const onStorage = (ev: StorageEvent) => { if (!ev.key || ev.key === NEW_ENQ_KEY || ev.key === ENQ_PING_KEY) check(); };
    const onCustom = () => check();
    window.addEventListener("storage", onStorage);
    window.addEventListener(ENQ_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ENQ_EVENT, onCustom as EventListener);
    };
  }, []);

  return null;
}
