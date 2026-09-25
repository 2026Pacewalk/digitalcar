import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, X } from "lucide-react";

/* The admin tables' shared pieces: the ⋮ row menu and the centred modal.
   Used by Customers and Resellers so the two lists behave the same. */

export type ActionItem = { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; hidden?: boolean };

export function AdminModal({ children, onClose, icon, iconBg, title, subtitle, wide }: {
  children: React.ReactNode; onClose: () => void; icon: React.ReactNode; iconBg: string; title: string; subtitle?: string; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-md" : "max-w-sm"} max-h-[calc(100vh-2rem)] overflow-y-auto p-6 animate-scale-in`}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors"><X size={16} /></button>
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mb-4`}>{icon}</div>
        <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
        {subtitle && <p className="text-sm text-[#64748B] mt-0.5 mb-4">{subtitle}</p>}
        <div className={subtitle ? "" : "mt-4"}>{children}</div>
      </div>
    </div>
  );
}

/* 3-dots (kebab) action menu — portal-rendered so the dropdown never gets
   clipped by the table's scroll container; flips up near the viewport bottom. */
export function ActionMenu({ items, label = "Actions" }: { items: ActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shown = items.filter((it) => !it.hidden);
  const W = 216;

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const h = shown.length * 40 + 14;
      let top = r.bottom + 6;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
      let left = r.right - W;
      if (left < 8) left = 8;
      setPos({ top, left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={open}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors active:scale-95 ${open ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"}`}>
        <MoreVertical size={16} />
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} role="menu" style={{ position: "fixed", top: pos.top, left: pos.left, width: W }}
          className="z-[90] bg-white rounded-xl shadow-premium-lg border border-[#F1F5F9] p-1.5 animate-scale-in">
          {shown.map((it, i) => (
            <button key={i} role="menuitem" onClick={() => { setOpen(false); it.onClick(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-colors ${it.danger ? "text-[#DC2626] hover:bg-[#FEE2E2] mt-0.5 border-t border-[#F1F5F9] pt-2.5 rounded-t-none" : "text-[#334155] hover:bg-[#F8FAFC]"}`}>
              <span className="shrink-0">{it.icon}</span> {it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
