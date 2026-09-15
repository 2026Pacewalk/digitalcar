import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { trpc } from "@/providers/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Megaphone, Pencil, Plus, Trash2, X } from "lucide-react";
import { AnnouncementCard, ANNOUNCEMENT_THEMES, type AnnouncementTheme, type AnnouncementView } from "@/components/AnnouncementPopup";

type Kind = "offer" | "teaser" | "info";
type Audience = "public" | "dashboard" | "both";

type Form = {
  id?: number; title: string; message: string; kind: Kind; theme: AnnouncementTheme; badge: string;
  couponId: number | null; ctaLabel: string; ctaUrl: string; showFrom: string; showUntil: string;
  countdownTo: string; audience: Audience; active: boolean;
};

const EMPTY: Form = {
  title: "", message: "", kind: "offer", theme: "festive", badge: "", couponId: null, ctaLabel: "", ctaUrl: "",
  showFrom: "", showUntil: "", countdownTo: "", audience: "both", active: true,
};

/* Ready-made starting points — the admin edits the wording and dates. */
const PRESETS: { label: string; form: Partial<Form> }[] = [
  { label: "Diwali — sale coming soon", form: { kind: "teaser", theme: "diwali", badge: "Diwali Sale", title: "Our Diwali Sale goes live soon", message: "The biggest savings of the year are almost here. Stay tuned — festive prices on every plan.", ctaLabel: "Explore plans", ctaUrl: "/pricing" } },
  { label: "Diwali — offer with coupon", form: { kind: "offer", theme: "diwali", badge: "Diwali Offer", title: "Light up your business this Diwali", message: "Use the code below when you upgrade your plan and save on your digital business card.", ctaLabel: "Claim my offer", ctaUrl: "/dashboard/subscription" } },
  { label: "Holi — offer with coupon", form: { kind: "offer", theme: "holi", badge: "Holi Special", title: "Add colour to your business this Holi", message: "Festive savings on every plan — apply the code at checkout.", ctaLabel: "Claim my offer", ctaUrl: "/dashboard/subscription" } },
  { label: "New Year — offer", form: { kind: "offer", theme: "newyear", badge: "New Year Offer", title: "Start the year with a smarter card", message: "Upgrade today and save — our New Year offer ends soon.", ctaLabel: "Upgrade now", ctaUrl: "/dashboard/subscription" } },
];

const toLocalInput = (d: unknown) => {
  if (!d) return "";
  const t = new Date(String(d));
  if (isNaN(t.getTime())) return "";
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const day = (d: unknown) => (d ? new Date(String(d)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const input = "h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/30";

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-[#475569]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

type AnnRow = {
  id: number; title: string; message: string | null; kind: Kind; theme: AnnouncementTheme; badge: string | null;
  couponId: number | null; ctaLabel: string | null; ctaUrl: string | null; showFrom: Date | null; showUntil: Date | null;
  countdownTo: Date | null; audience: Audience; active: boolean;
};

function statusOf(a: AnnRow) {
  if (!a.active) return { label: "Off", cls: "bg-slate-100 text-slate-600" };
  const now = Date.now();
  if (a.showFrom && new Date(a.showFrom).getTime() > now) return { label: "Scheduled", cls: "bg-blue-50 text-blue-700" };
  if (a.showUntil && new Date(a.showUntil).getTime() < now) return { label: "Ended", cls: "bg-red-50 text-red-600" };
  return { label: "Live", cls: "bg-emerald-50 text-emerald-700" };
}

const AUDIENCE_LABEL: Record<Audience, string> = { public: "Public website", dashboard: "Customer dashboard", both: "Website + dashboard" };

export default function AdminAnnouncements() {
  const { data, isLoading, refetch } = trpc.announcement.list.useQuery();
  const save = trpc.announcement.save.useMutation();
  const setActive = trpc.announcement.setActive.useMutation();
  const remove = trpc.announcement.remove.useMutation();
  const [form, setForm] = useState<Form | null>(null);

  const rows = (data?.announcements ?? []) as unknown as AnnRow[];
  const coupons = data?.coupons ?? [];
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const preview: AnnouncementView | null = useMemo(() => {
    if (!form) return null;
    const c = coupons.find((x) => x.id === form.couponId);
    return {
      title: form.title || "Your headline goes here",
      message: form.message || null,
      kind: form.kind,
      theme: form.theme,
      badge: form.badge || null,
      ctaLabel: form.ctaLabel || null,
      ctaUrl: form.ctaUrl || null,
      countdownTo: form.countdownTo ? new Date(form.countdownTo) : null,
      coupon: c ? {
        code: c.code, discountType: c.discountType, discountValue: Number(c.discountValue),
        maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null, minAmount: c.minAmount ? Number(c.minAmount) : null,
        validUntil: c.validUntil ?? null,
      } : null,
    };
  }, [form, coupons]);

  const edit = (a: AnnRow) => setForm({
    id: a.id, title: a.title, message: a.message ?? "", kind: a.kind, theme: a.theme, badge: a.badge ?? "",
    couponId: a.couponId, ctaLabel: a.ctaLabel ?? "", ctaUrl: a.ctaUrl ?? "", showFrom: toLocalInput(a.showFrom),
    showUntil: toLocalInput(a.showUntil), countdownTo: toLocalInput(a.countdownTo), audience: a.audience, active: a.active,
  });

  const errMsg = (e: unknown) => {
    const m = e instanceof Error ? e.message : "";
    return m && !m.trim().startsWith("[") ? m : "Please check the popup details.";
  };

  const submit = async () => {
    if (!form) return;
    if (form.title.trim().length < 3) return toast.error("Add a headline");
    try {
      await save.mutateAsync({
        id: form.id, title: form.title, message: form.message || undefined, kind: form.kind, theme: form.theme,
        badge: form.badge || undefined, couponId: form.couponId, ctaLabel: form.ctaLabel || undefined, ctaUrl: form.ctaUrl || undefined,
        showFrom: form.showFrom ? new Date(form.showFrom) : null, showUntil: form.showUntil ? new Date(form.showUntil) : null,
        countdownTo: form.countdownTo ? new Date(form.countdownTo) : null, audience: form.audience, active: form.active,
      });
      toast.success(form.id ? "Popup updated" : "Popup created");
      setForm(null);
      await refetch();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-[#F7B31C]"><Megaphone size={20} /></span>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Offer popups</h1>
              <p className="text-[13px] text-[#64748B]">Announce a festival sale, a coupon or a sale that's coming soon. The newest live popup is shown.</p>
            </div>
          </div>
          <button type="button" onClick={() => setForm({ ...EMPTY })}
            className="gradient-gold inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13.5px] font-bold text-[#0F172A] hover:shadow-gold">
            <Plus size={16} /> New popup
          </button>
        </div>

        {form && preview && (
          <section className="rounded-2xl border border-[#FDE68A] bg-white p-5 shadow-premium">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#0F172A]">{form.id ? "Edit popup" : "New popup"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"><X size={18} /></button>
            </div>

            {!form.id && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="self-center text-[12px] font-semibold text-[#64748B]">Start from:</span>
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" onClick={() => setForm((f) => (f ? { ...f, ...p.form } : f))}
                    className="h-8 rounded-full bg-[#FFFBEB] px-3 text-[12px] font-semibold text-[#92400E] ring-1 ring-[#FDE68A] hover:bg-[#FEF3C7]">
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Labeled label="Type">
                    <select className={input} value={form.kind} onChange={(e) => set("kind", e.target.value as Kind)}>
                      <option value="offer">Offer (with or without a coupon)</option>
                      <option value="teaser">Coming soon / stay tuned</option>
                      <option value="info">General announcement</option>
                    </select>
                  </Labeled>
                  <Labeled label="Show on">
                    <select className={input} value={form.audience} onChange={(e) => set("audience", e.target.value as Audience)}>
                      <option value="both">Website + customer dashboard</option>
                      <option value="public">Public website only</option>
                      <option value="dashboard">Customer dashboard only</option>
                    </select>
                  </Labeled>
                </div>

                <div>
                  <p className="mb-1.5 text-[11.5px] font-semibold text-[#475569]">Design</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(ANNOUNCEMENT_THEMES) as AnnouncementTheme[]).map((k) => {
                      const on = form.theme === k;
                      return (
                        <button key={k} type="button" onClick={() => set("theme", k)} aria-pressed={on}
                          className={`flex items-center gap-2 rounded-xl p-1.5 pr-3 text-[12.5px] font-semibold ring-1 ${on ? "ring-2 ring-[#F7B31C]" : "ring-[#E2E8F0]"}`}>
                          <span className="h-7 w-7 rounded-lg" style={{ background: ANNOUNCEMENT_THEMES[k].bg }} />
                          {ANNOUNCEMENT_THEMES[k].label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Labeled label="Badge" hint="Short label above the headline, e.g. DIWALI SALE">
                    <input className={input} value={form.badge} maxLength={40} onChange={(e) => set("badge", e.target.value)} />
                  </Labeled>
                  <Labeled label="Coupon to feature" hint={form.kind === "teaser" ? "Usually none for a teaser" : "Shown as a ticket with a copy button"}>
                    <select className={input} value={form.couponId ?? ""} onChange={(e) => set("couponId", e.target.value ? Number(e.target.value) : null)}>
                      <option value="">No coupon</option>
                      {coupons.map((c) => (
                        <option key={c.id} value={c.id}>{c.code} — {c.discountType === "percent" ? `${Number(c.discountValue)}%` : `₹${Number(c.discountValue)}`} off{c.active ? "" : " (off)"}</option>
                      ))}
                    </select>
                  </Labeled>
                </div>

                <Labeled label="Headline">
                  <input className={input} value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="Our Diwali Sale goes live soon" />
                </Labeled>
                <Labeled label="Message">
                  <textarea className={`${input} h-auto py-2`} rows={3} value={form.message} maxLength={500} onChange={(e) => set("message", e.target.value)} />
                </Labeled>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Labeled label="Button text" hint="Leave empty to use a sensible default">
                    <input className={input} value={form.ctaLabel} maxLength={40} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Claim my offer" />
                  </Labeled>
                  <Labeled label="Button link" hint="/pricing, /dashboard/subscription or a full https:// link">
                    <input className={input} value={form.ctaUrl} maxLength={255} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/dashboard/subscription" />
                  </Labeled>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Labeled label="Show from" hint="Empty = now">
                    <input type="datetime-local" className={input} value={form.showFrom} onChange={(e) => set("showFrom", e.target.value)} />
                  </Labeled>
                  <Labeled label="Show until" hint="Empty = until switched off">
                    <input type="datetime-local" className={input} value={form.showUntil} onChange={(e) => set("showUntil", e.target.value)} />
                  </Labeled>
                  <Labeled label="Countdown to" hint={form.kind === "teaser" ? "When the sale goes live" : "When the offer ends"}>
                    <input type="datetime-local" className={input} value={form.countdownTo} onChange={(e) => set("countdownTo", e.target.value)} />
                  </Labeled>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#334155]">
                    <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[#F7B31C]" />
                    Active
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm(null)} className="h-10 rounded-xl bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#334155]">Cancel</button>
                    <button type="button" onClick={submit} disabled={save.isPending}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-5 text-[13px] font-bold text-white disabled:opacity-60">
                      {save.isPending && <Loader2 size={15} className="animate-spin" />} {form.id ? "Save changes" : "Publish popup"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:sticky lg:top-6">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">Live preview</p>
                <div className="rounded-2xl bg-[#0F172A]/90 p-4">
                  <AnnouncementCard a={preview} audience="public" preview onClose={() => undefined} />
                </div>
              </div>
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Loading popups…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-[#F1F5F9] bg-white p-12 text-center shadow-premium">
            <Megaphone size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
            <p className="text-sm font-semibold text-[#0F172A]">No popups yet</p>
            <p className="mt-1 text-[13px] text-[#64748B]">Create one for Diwali, Holi or New Year — start from a preset.</p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map((a) => {
              const st = statusOf(a);
              const coupon = coupons.find((c) => c.id === a.couponId);
              return (
                <li key={a.id} className="flex gap-3 rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium">
                  <span className="h-16 w-16 shrink-0 rounded-xl" style={{ background: ANNOUNCEMENT_THEMES[a.theme]?.bg }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      <span className="text-[11.5px] text-[#94A3B8]">{AUDIENCE_LABEL[a.audience]}</span>
                    </div>
                    <p className="mt-1 truncate text-[14px] font-bold text-[#0F172A]">{a.title}</p>
                    <p className="text-[12px] text-[#64748B]">
                      {a.kind === "teaser" ? "Coming soon" : a.kind === "offer" ? "Offer" : "Announcement"}
                      {coupon ? ` · ${coupon.code}` : ""}
                      {a.showFrom || a.showUntil ? ` · ${a.showFrom ? day(a.showFrom) : "now"} → ${a.showUntil ? day(a.showUntil) : "no end"}` : ""}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <button type="button" onClick={async () => { try { await setActive.mutateAsync({ id: a.id, active: !a.active }); await refetch(); } catch { toast.error("Could not update"); } }}
                        className="h-8 rounded-lg px-2.5 text-[12px] font-semibold ring-1 ring-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]">{a.active ? "Switch off" : "Switch on"}</button>
                      <button type="button" onClick={() => edit(a)} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"><Pencil size={14} /></button>
                      <button type="button" onClick={async () => { if (!confirm("Delete this popup?")) return; try { await remove.mutateAsync({ id: a.id }); await refetch(); } catch { toast.error("Could not delete"); } }}
                        aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
