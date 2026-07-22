import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import { Plus, CreditCard, ExternalLink, Pencil, Trash2, Eye, MousePointer, Layers } from "lucide-react";
import { toast } from "sonner";

export default function CustomerCards() {
  const navigate = useNavigate();
  const { data: cardsData, isLoading, refetch } = trpc.card.list.useQuery();
  const deleteMutation = trpc.card.delete.useMutation({
    onSuccess: () => { toast.success("Card deleted"); refetch(); },
  });

  const cards = cardsData?.cards || [];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="My Cards" subtitle="Manage your digital cards" /></div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Your Cards</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{cards.length} card{cards.length !== 1 ? "s" : ""} created</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/dashboard/bulk")}
              className="flex items-center gap-2 h-11 px-5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#F7B31C] transition-all active:scale-[0.98]"
            >
              <Layers size={16} /> Bulk Create
            </button>
            <button
              onClick={() => navigate("/dashboard/builder")}
              className="flex items-center gap-2 h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"
            >
              <Plus size={16} /> Create Card
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-56 shadow-premium border border-[#F1F5F9] animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <CreditCard size={40} className="text-[#CBD5E1] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No cards yet</h3>
            <p className="text-sm text-[#94A3B8] mb-4">Create your first digital business card</p>
            <button onClick={() => navigate("/dashboard/builder")} className="btn-gold">Create Card</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card: Record<string, unknown>) => (
              <div key={card.id as number} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden card-hover">
                <div className="h-36 bg-gradient-to-br from-[#0F172A] to-[#1E293B] relative overflow-hidden p-6">
                  <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-[#F7B31C]/10" />
                  <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-[#14B8A6]/10" />
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white">{card.title as string}</h3>
                    <p className="text-xs text-[#94A3B8] mt-1">/{card.slug as string}</p>
                    <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${card.status === "published" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {card.status as string}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-4 text-xs text-[#64748B] mb-4">
                    <span className="flex items-center gap-1"><Eye size={13} /> {Number(card.viewCount || 0).toLocaleString()} views</span>
                    <span className="flex items-center gap-1"><MousePointer size={13} /> {Number(card.clickCount || 0).toLocaleString()} clicks</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/dashboard/builder/${card.id}`)} className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#F7B31C] transition-colors">
                      <Pencil size={14} /> Edit
                    </button>
                    <a href={`/c/${card.slug}`} target="_blank" className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#F7B31C] transition-colors">
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => { if (confirm("Delete this card?")) deleteMutation.mutate({ id: card.id as number }); }}
                      className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
