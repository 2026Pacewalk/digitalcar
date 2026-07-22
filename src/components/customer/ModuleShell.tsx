import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import type { ReactNode } from "react";
import { ImagePlus } from "lucide-react";
import { fileToDataUrl } from "@/hooks/useCustomer";
import NotificationBell from "@/components/NotificationBell";

export const fieldCls =
  "h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all placeholder:text-[#94A3B8]";
export const areaCls = fieldCls.replace("h-11", "min-h-[90px] py-2.5");

export function Field({ label, children, hint, full }: { label: string; children: ReactNode; hint?: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-[#334155] mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#94A3B8] mt-1">{hint}</p>}
    </div>
  );
}

export function LimitBar({ used, limit, unit = "items" }: { used: number; limit: number; unit?: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const full = used >= limit;
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[#334155]">{unit} used <span className="text-[#94A3B8] font-normal">(package limit)</span></p>
        <p className={`text-sm font-bold tabular-nums ${full ? "text-red-500" : "text-[#0F172A]"}`}>{used} / {limit}</p>
      </div>
      <div className="h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: full ? "#EF4444" : "linear-gradient(90deg,#F7B31C,#D97706)" }} />
      </div>
      {full && <p className="text-[11px] text-red-500 mt-1.5">Limit reached — upgrade your package to add more.</p>}
    </div>
  );
}

export function Panel({ title, subtitle, children, right }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
          {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function ImagePick({ value, onChange, className = "w-24 h-24", label = "Upload", fit = "cover" }: { value?: string; onChange: (dataUrl: string) => void; className?: string; label?: string; fit?: "cover" | "contain" }) {
  return (
    <label className={`${className} rounded-xl border-2 border-dashed border-[#E2E8F0] hover:border-[#F7B31C] ${fit === "contain" ? "bg-white p-1.5" : "bg-[#F8FAFC]"} flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors shrink-0`}>
      {value ? (
        <img src={value} alt="preview" referrerPolicy="no-referrer" className={`w-full h-full ${fit === "contain" ? "object-contain" : "object-cover"}`} />
      ) : (
        <span className="flex flex-col items-center gap-1 text-[#94A3B8]">
          <ImagePlus size={20} /><span className="text-[10px] font-medium">{label}</span>
        </span>
      )}
      <input
        type="file" accept="image/*" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) onChange(await fileToDataUrl(f)); e.currentTarget.value = ""; }}
      />
    </label>
  );
}

export default function ModuleShell({
  title, subtitle, icon: Icon, children, actions,
}: {
  title: string; subtitle?: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  children: ReactNode; actions?: ReactNode;
}) {
  return (
    <ResponsiveDashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Icon size={20} className="text-[#F7B31C]" /></div>
            <div>
              <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-[#64748B]">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <NotificationBell />
          </div>
        </header>
        {children}
      </div>
    </ResponsiveDashboardLayout>
  );
}
