import { Link } from "react-router";
import { AlarmClock, ArrowRight } from "lucide-react";
import { trpc } from "@/providers/trpc";

/* A gentle nudge on the dashboard when leads have a follow-up due today or
   overdue — so hot leads don't go cold (§38). Links straight to the CRM. */
export default function LeadReminder() {
  const { data } = trpc.lead.followUps.useQuery(undefined, { retry: false });
  if (!data?.length) return null;

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const due = data.filter((l) => l.followUpDate && new Date(l.followUpDate).getTime() <= endOfToday.getTime());
  if (!due.length) return null;

  return (
    <Link to="/dashboard/leads" className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 bg-[#FFF7ED] border border-[#FED7AA] hover:shadow-premium transition-all">
      <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0"><AlarmClock size={19} className="text-[#9A3412]" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold text-[#9A3412] leading-tight">{due.length} follow-up{due.length === 1 ? "" : "s"} due</p>
        <p className="text-[12px] text-[#9A3412]/85 mt-0.5">Reach out before these leads go cold.</p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#9A3412] text-white text-[13px] font-bold">Open Leads <ArrowRight size={14} /></span>
    </Link>
  );
}
