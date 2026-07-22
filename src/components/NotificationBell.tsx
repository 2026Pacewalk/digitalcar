import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Mail, Inbox } from "lucide-react";
import { useEnquiryNotifications } from "@/hooks/useEnquiryNotifications";

const timeAgo = (s: string) => {
  const d = new Date(String(s).replace(" ", "T")); if (isNaN(d.getTime())) return "";
  const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "just now";
  const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { unreadCount, recent, markAllRead } = useEnquiryNotifications();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => { const next = !o; if (next) markAllRead(); return next; });

  return (
    <div className="relative">
      <button onClick={toggle} className="w-10 h-10 rounded-xl hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-all relative" aria-label="Notifications">
        <Bell size={18} className={unreadCount > 0 ? "text-[#F7B31C]" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
            <span className="text-[9px] font-bold text-white leading-none">{unreadCount > 9 ? "9+" : unreadCount}</span>
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-premium-lg border border-[#F1F5F9] z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9]">
              <p className="text-sm font-bold text-[#0F172A]">Notifications</p>
              <span className="text-[10px] text-[#94A3B8]">{recent.length} enquir{recent.length === 1 ? "y" : "ies"}</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Inbox size={24} className="mx-auto text-[#CBD5E1] mb-2" />
                  <p className="text-xs text-[#94A3B8]">No new enquiries yet</p>
                  <p className="text-[10px] text-[#CBD5E1] mt-1">You'll be alerted when someone enquires.</p>
                </div>
              ) : recent.slice(0, 8).map((e) => (
                <button key={e.id} onClick={() => { setOpen(false); navigate("/dashboard/enquiry"); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors text-left border-b border-[#F8FAFC] last:border-0">
                  <span className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><Mail size={14} className="text-[#F7B31C]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[#0F172A] truncate">New enquiry from {e.name || "Someone"}</span>
                    {e.description && <span className="block text-[11px] text-[#64748B] mt-0.5 line-clamp-1">{e.description}</span>}
                    <span className="block text-[10px] text-[#94A3B8] mt-1">{timeAgo(e.created_on)}</span>
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => { setOpen(false); navigate("/dashboard/enquiry"); }}
              className="w-full py-2.5 text-xs font-semibold text-[#F7B31C] hover:bg-[#FEF9EC] border-t border-[#F1F5F9] transition-colors">
              View all enquiries
            </button>
          </div>
        </>
      )}
    </div>
  );
}
