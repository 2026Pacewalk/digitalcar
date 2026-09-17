/* /dashboard/tools — the Free Tools hub inside the dashboard. Each tool is
   already filled in from the customer's card; this page just says what each one
   is for so the sidebar's "Free Tools" tab has somewhere useful to land. */
import { Link } from "react-router";
import { Wrench, PenLine, MessageCircle, Instagram, ArrowRight } from "lucide-react";
import ModuleShell from "@/components/customer/ModuleShell";

const TOOLS = [
  { to: "/dashboard/signature", icon: PenLine, name: "Email Signature", desc: "A professional signature for Gmail, Outlook and Apple Mail, with your card link.", accent: "#F7B31C", tint: "#FEF3C7" },
  { to: "/dashboard/whatsapp", icon: MessageCircle, name: "WhatsApp Messages", desc: "Greeting, away and quick replies for WhatsApp Business, in your own words.", accent: "#16A34A", tint: "#DCFCE7" },
  { to: "/dashboard/instagram", icon: Instagram, name: "Instagram Bio", desc: "A bio that fits the 150-character limit, a searchable name, and your card as the link.", accent: "#DB2777", tint: "#FCE7F3" },
];

export default function CustomerFreeTools() {
  return (
    <ModuleShell title="Free Tools" subtitle="Ready-made from your card — copy and use them anywhere" icon={Wrench} preview={false} wide>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to}
            className="group flex flex-col rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium transition-all hover:-translate-y-0.5 hover:shadow-premium-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: t.tint, color: t.accent }}>
              <t.icon size={20} />
            </span>
            <span className="mt-4 text-[15px] font-bold text-[#0F172A]">{t.name}</span>
            <span className="mt-1 flex-1 text-[12.5px] leading-relaxed text-[#64748B]">{t.desc}</span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F172A]">
              Open <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </ModuleShell>
  );
}
