import { ChevronRight } from "lucide-react";

interface MobileDataCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  meta?: Array<{ label: string; value: string }>;
  actions?: Array<{ icon: React.ReactNode; onClick: () => void; className?: string }>;
  onClick?: () => void;
}

export default function MobileDataCard({ icon, title, subtitle, badge, meta, actions, onClick }: MobileDataCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] transition-all active:scale-[0.98] ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      {/* Top Row */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#F8FAFC] flex items-center justify-center shrink-0 text-[#F7B31C]">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0F172A] truncate">{title}</h3>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          {subtitle && <p className="text-xs text-[#94A3B8] truncate mt-0.5">{subtitle}</p>}
        </div>
        {(actions || onClick) && (
          <div className="flex items-center gap-1 shrink-0">
            {actions?.map((a, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); a.onClick(); }}
                className={`p-2 rounded-lg transition-colors ${a.className || "hover:bg-[#F1F5F9] text-[#64748B]"}`}
              >
                {a.icon}
              </button>
            ))}
            {onClick && <ChevronRight size={16} className="text-[#CBD5E1]" />}
          </div>
        )}
      </div>

      {/* Meta Grid */}
      {meta && meta.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[#F1F5F9]">
          {meta.map((m, i) => (
            <div key={i}>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide">{m.label}</p>
              <p className="text-xs font-medium text-[#0F172A] truncate">{m.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Mobile Stats Row ─── */
export function MobileStatsRow({ stats }: { stats: Array<{ label: string; value: string; color?: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] active:scale-[0.98] transition-transform">
          <p className="text-xs text-[#94A3B8]">{s.label}</p>
          <p className={`text-lg font-bold mt-1 ${s.color || "text-[#0F172A]"}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Mobile Section Header ─── */
export function MobileSectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-2">
      <div>
        <h2 className="text-base font-bold text-[#0F172A]">{title}</h2>
        {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
