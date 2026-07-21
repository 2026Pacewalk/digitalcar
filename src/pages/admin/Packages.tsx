import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Plus, Package, Check, X, Pencil, Trash2, Zap, Users, Building2, Crown } from "lucide-react";
import { toast } from "sonner";

const planIcons: Record<string, React.ComponentType<{size?: number; className?: string}>> = {
  starter: Zap, professional: Users, business: Building2, enterprise: Crown,
};

export default function AdminPackages() {
  const { data: packages, isLoading, refetch } = trpc.package.list.useQuery();
  const deleteMutation = trpc.package.delete.useMutation({
    onSuccess: () => { toast.success("Package deleted"); refetch(); },
  });
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardLayout>
      <TopBar title="Packages" subtitle="Manage subscription plans" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Subscription Plans</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Define pricing tiers and features</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]">
            <Plus size={16} /> Create Plan
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">New Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input placeholder="Plan Name" className="input-premium" />
              <input placeholder="Price (monthly)" type="number" className="input-premium" />
              <input placeholder="Price (yearly)" type="number" className="input-premium" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={() => { setShowForm(false); toast.success("Plan created"); }} className="btn-gold">Create Plan</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(packages || []).map((pkg: Record<string, unknown>) => {
              const Icon = planIcons[(pkg.code as string) || "starter"] || Package;
              const features = (pkg.features as string[]) || [];
              return (
                <div key={pkg.id as number} className={`bg-white rounded-2xl p-6 shadow-premium border-2 ${pkg.isPopular ? "border-[#F7B31C]" : "border-[#F1F5F9]"} card-hover relative`}>
                  {pkg.isPopular && (
                    <span className="absolute -top-3 left-6 px-3 py-1 gradient-gold text-[#0F172A] text-[11px] font-bold rounded-full">MOST POPULAR</span>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                      <Icon size={20} className="text-[#F7B31C]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#0F172A]">{pkg.name as string}</h3>
                      <p className="text-xs text-[#94A3B8]">{pkg.code as string}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-[#0F172A]">${pkg.monthlyPrice as string || "0"}</span>
                    <span className="text-sm text-[#94A3B8]">/month</span>
                  </div>
                  <div className="space-y-2 mb-6">
                    {features.slice(0, 6).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-[#64748B]">
                        <Check size={14} className="text-emerald-500 shrink-0" /> {f}
                      </div>
                    ))}
                    {features.length > 6 && <p className="text-xs text-[#94A3B8] pl-6">+{features.length - 6} more</p>}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-[#F1F5F9]">
                    <button className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this package?")) deleteMutation.mutate({ id: pkg.id as number }); }}
                      className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
