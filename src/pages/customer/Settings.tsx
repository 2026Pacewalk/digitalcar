import { useEffect, useMemo, useState } from "react";
import { Settings as SettingsIcon, Save, KeyRound, Package as PackageIcon, Check, Info, Calendar, IndianRupee, Eye, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router";
import ModuleShell, { Panel, Field, fieldCls, areaCls } from "@/components/customer/ModuleShell";
import InvoicePanel from "@/components/customer/InvoicePanel";
import { useCustomer, scopedKey, getActiveCardId, getCards } from "@/hooks/useCustomer";
import { useValidityDays } from "@/hooks/useValidityDays";
import { buildCardThumb, TEMPLATE_COUNT } from "@/card-template/buildCard";
import { passwordProblems, PASSWORD_HINT } from "@/lib/password";
import { slugifyUsername } from "@/lib/username";
import { trpc } from "@/providers/trpc";

/* Card sections — labels match the legacy user-module.php */
const MODULES = [
  { on: "about_on", key: "about", name: "About Us", def: "About Us" },
  { on: "product_on", key: "product", name: "Products", def: "Services" },
  { on: "payment_on", key: "payment", name: "Payment", def: "Payment Details" },
  { on: "uploads_on", key: "uploads", name: "Uploads", def: "eBrochure" },
  { on: "qrcode_on", key: "qrcode", name: "QR Code", def: "QR Code" },
  { on: "offer_on", key: "offer", name: "Offers", def: "Latest Offers" },
  { on: "gallery_on", key: "gallery", name: "Gallery", def: "Graphic Portfolio" },
  { on: "video_on", key: "video", name: "Videos", def: "Video Portfolio" },
  { on: "enquiry_on", key: "enquiry", name: "Enquiry Form", def: "Enquiry Form" },
];

const SWATCHES = ["#F7B31C", "#14243E", "#3B82F6", "#A21CAF", "#06B6D4", "#EF4444", "#0F172A", "#EAB308"];

const PKG: Record<number, { name: string; amount: number; days: number }> = {
  7: { name: "Trial", amount: 0, days: 30 },
  5: { name: "Gold", amount: 999, days: 365 },
  6: { name: "Platinum", amount: 1999, days: 365 },
};

const TAB_IDS = ["module", "theme", "seo", "package", "invoice", "password"] as const;
type TabId = (typeof TAB_IDS)[number];

export default function CustomerSettings() {
  const { data, update } = useCustomer();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") as TabId | null;
  const [tab, setTab] = useState<TabId>(urlTab && TAB_IDS.includes(urlTab) ? urlTab : "module");

  // Sync the active tab when navigating via the sidebar (?tab=...)
  useEffect(() => {
    if (urlTab && TAB_IDS.includes(urlTab)) setTab(urlTab);
  }, [urlTab]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const val = (k: string, dflt = "") => (form[k] !== undefined ? form[k] : String(data[k] ?? dflt));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isOn = (k: string) => (form[k] !== undefined ? form[k] === "1" : Number(data[k] ?? 1) === 1);
  const toggle = (k: string) => set(k, isOn(k) ? "0" : "1");
  const accent = val("color", "#F7B31C");

  // 31 template thumbnails (first page only), tinted with the currently-selected colour
  const thumbs = useMemo(() => {
    const pc = { ...data, color: accent };
    return Array.from({ length: TEMPLATE_COUNT }, (_, i) => buildCardThumb(pc, i + 1));
  }, [data, accent]);

  // Seed the customer's real SEO data (separate `seo` table, keyed by user id) if not present yet.
  useEffect(() => {
    let stored: Record<string, unknown> = {};
    try { stored = JSON.parse(localStorage.getItem(scopedKey("dc_customer")) || "{}"); } catch { /* default */ }
    if (stored.seo_title !== undefined && stored.seo_title !== null) return;
    if (data.seo_title !== undefined) return;
    const id = Number(stored.id ?? data.id);
    if (!id) return;
    let cancelled = false;
    fetch("/seo.json").then((r) => r.json())
      .then((rows: Record<string, string>[]) => {
        if (cancelled) return;
        const row = rows.find((x) => Number(x.user_id) === id);
        update({
          seo_title: row?.seo_title ?? "", seo_description: row?.seo_description ?? "",
          keyword1: row?.keyword1 ?? "", keyword2: row?.keyword2 ?? "", keyword3: row?.keyword3 ?? "",
          keyword4: row?.keyword4 ?? "", keyword5: row?.keyword5 ?? "",
        });
      })
      .catch(() => { /* leave blank */ });
    return () => { cancelled = true; };
  }, [data.id, data.seo_title, update]);

  const save = (msg = "Settings saved") => { update(form); toast.success(msg); setForm({}); };
  const savePassword = () => {
    const probs = passwordProblems(pwd);
    if (probs.length) { toast.error(`Password needs ${probs.join(", ")}.`); return; }
    if (pwd !== pwd2) { toast.error("Passwords do not match"); return; }
    update({ password: pwd }); toast.success("Password updated"); setPwd(""); setPwd2("");
  };

  // The card link (slug) the user is editing belongs to the ACTIVE card, so
  // multi-card users customise each card's URL independently.
  const activeCardId = getActiveCardId();
  const activeCard = getCards().find((c) => c.id === activeCardId);
  const utils = trpc.useUtils();
  const saveAccount = async () => {
    const current = String(data.username || data.slug || "").toLowerCase();
    const typed = form.username;
    // Link untouched → save the rest (e.g. email) normally.
    if (typed === undefined || slugifyUsername(typed) === current) { save("Account updated"); return; }
    const next = slugifyUsername(typed);
    if (next.length < 3) { toast.error("Card link must be at least 3 characters (letters, numbers and hyphens only)."); return; }
    // The card link is a public URL — it must be unique across every published
    // card (this user's other cards included) AND every account handle.
    try {
      const s = await utils.publish.checkSlug.fetch({ slug: next, cardId: activeCardId });
      if (!s.available) { toast.error("That card link is already taken — please choose another."); return; }
    } catch { /* checkSlug unreachable — fall through; publish still guards it */ }
    try {
      const avail = await utils.auth.checkAvailability.fetch({ username: next });
      if (avail.username) { toast.error("That card link is already taken — please choose another."); return; }
    } catch { /* if the check is unreachable, allow the local save to proceed */ }
    update({ ...form, username: next, slug: next, username_changed_at: new Date().toISOString() });
    toast.success("Card link updated");
    setForm({});
  };

  // Live availability of the typed card link (debounced) — tell the user it's
  // taken before they hit save, so they can pick another straight away.
  const [linkStatus, setLinkStatus] = useState<"idle" | "checking" | "available" | "taken" | "short">("idle");
  useEffect(() => {
    const typed = form.username;
    if (typed === undefined) { setLinkStatus("idle"); return; }
    const next = slugifyUsername(typed);
    const current = String(data.username || data.slug || "").toLowerCase();
    if (next === current || next === "") { setLinkStatus("idle"); return; }
    if (next.length < 3) { setLinkStatus("short"); return; }
    setLinkStatus("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const s = await utils.publish.checkSlug.fetch({ slug: next, cardId: activeCardId });
        let ok = s.available;
        if (ok) { try { const a = await utils.auth.checkAvailability.fetch({ username: next }); ok = !a.username; } catch { /* ignore */ } }
        if (!cancelled) setLinkStatus(ok ? "available" : "taken");
      } catch { if (!cancelled) setLinkStatus("idle"); }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.username, data.username, data.slug, activeCardId, utils]);

  // Package details — days left from the shared source (server trial clock
  // while on trial, else stored plan expiry) so every page shows the same number.
  const pkg = PKG[Number(data.package_id)] || PKG[7];
  const { days: daysLeft, active, endsAt } = useValidityDays(data.expired_on, pkg.days, [5, 6].includes(Number(data.package_id)));

  const showTopSave = tab === "module" || tab === "theme" || tab === "seo";

  return (
    <ModuleShell title="Settings" subtitle="Modules, theme, SEO, package & account" icon={SettingsIcon}
      actions={showTopSave ? <button onClick={() => save()} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button> : undefined}>
      {/* ── MODULE ── */}
      {tab === "module" && (
        <Panel title="Module Settings" subtitle="Add or remove sections shown on your digital card">
          <div className="flex items-start gap-3 rounded-xl bg-[#FEF3C7]/60 border border-[#FDE68A] px-4 py-3 mb-4">
            <Info size={16} className="text-[#B45309] mt-0.5 shrink-0" />
            <p className="text-xs text-[#92400E] leading-relaxed">Switch a section on to feature it on your card, or off to hide it — and rename any title to match your brand. Every change goes live on your card instantly.</p>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {MODULES.map((m) => (
              <div key={m.on} className="flex items-center gap-3 py-3">
                <button onClick={() => toggle(m.on)} className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${isOn(m.on) ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`} aria-label={`Toggle ${m.name}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isOn(m.on) ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <span className="text-sm font-medium text-[#0F172A] w-24 sm:w-32 shrink-0">{m.name}</span>
                <input value={val(m.key, m.def)} onChange={(e) => set(m.key, e.target.value)} disabled={!isOn(m.on)} className={`${fieldCls} h-9 flex-1 disabled:opacity-50`} placeholder={m.def} />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4"><button onClick={() => save("Modules updated")} className="flex items-center gap-2 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold"><Save size={15} /> Submit</button></div>
        </Panel>
      )}

      {/* ── SELECT THEME ── */}
      {tab === "theme" && (
        <>
          <Panel title="Select Color" subtitle="Pick your card's primary colour">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1.5">
                <input type="color" value={accent} onChange={(e) => set("color", e.target.value)} className="w-8 h-8 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
                <input value={accent} onChange={(e) => set("color", e.target.value)} className="w-24 h-8 bg-transparent text-sm font-mono outline-none" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {SWATCHES.map((c) => (
                  <button key={c} onClick={() => set("color", c)} className={`w-9 h-9 rounded-lg ring-2 transition-all ${accent.toLowerCase() === c.toLowerCase() ? "ring-[#0F172A] scale-110" : "ring-transparent hover:scale-105"}`} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Select Your Theme" subtitle={`Choose from ${TEMPLATE_COUNT} card templates — the front page is shown as the thumbnail`}
            right={<Link to="/dashboard/view" className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#14243E] hover:bg-[#F8FAFC]"><Eye size={14} /> Preview</Link>}>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              {thumbs.map((html, i) => {
                const n = i + 1;
                const selected = Number(val("theme", "1")) === n;
                return (
                  <button key={n} onClick={() => set("theme", String(n))}
                    className={`relative rounded-xl border-2 overflow-hidden bg-white transition-all shrink-0 ${selected ? "border-[#F7B31C] shadow-gold ring-2 ring-[#F7B31C]/20" : "border-[#E2E8F0] hover:border-[#F7B31C]/50 hover:-translate-y-0.5"}`}
                    style={{ width: "150px" }}>
                    {selected && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#F7B31C] flex items-center justify-center z-10 shadow"><Check size={12} className="text-[#0F172A]" /></span>}
                    <div className="relative w-full overflow-hidden bg-[#F8FAFC]" style={{ height: "224px" }}>
                      <iframe title={`Template ${n}`} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
                        style={{ width: "375px", height: "560px", border: 0, transform: "scale(0.4)", transformOrigin: "top left", pointerEvents: "none" }} />
                    </div>
                    <p className={`text-[11px] font-semibold py-1.5 text-center ${selected ? "text-[#B45309] bg-[#FEF3C7]" : "text-[#334155]"}`}>Template {n}</p>
                  </button>
                );
              })}
            </div>
          </Panel>
        </>
      )}

      {/* ── SEO ── */}
      {tab === "seo" && (
        <Panel title="SEO Settings" subtitle="Help your card rank on Google">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Meta Title"><input value={val("seo_title")} onChange={(e) => set("seo_title", e.target.value)} className={fieldCls} placeholder="Your Business — Digital Card" /></Field>
            <Field label="Meta Description"><textarea value={val("seo_description")} onChange={(e) => set("seo_description", e.target.value)} className={areaCls} placeholder="A short description of your business for search engines" /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <Field key={n} label={`Keyword ${n}`}><input value={val(`keyword${n}`)} onChange={(e) => set(`keyword${n}`, e.target.value)} className={fieldCls} placeholder={`keyword ${n}`} /></Field>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* ── PACKAGE ── */}
      {tab === "package" && (
        <Panel title="My Package" subtitle="Your active plan and validity">
          <div className="rounded-2xl overflow-hidden border border-[#E2E8F0]">
            <div className={`px-5 py-4 text-white ${active ? "bg-gradient-to-r from-[#16A34A] to-[#22C55E]" : "bg-gradient-to-r from-[#EF4444] to-[#F97316]"}`}>
              <p className="text-2xl font-extrabold uppercase leading-none">{pkg.name}</p>
              <p className="text-sm font-medium mt-1 opacity-90">{active ? "Active" : "Expired"} · {daysLeft.toLocaleString("en-IN")} days remaining</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-[#F1F5F9] bg-white">
              <div className="p-4"><p className="text-[11px] text-[#94A3B8] flex items-center gap-1"><IndianRupee size={11} /> Amount</p><p className="text-lg font-bold text-[#0F172A] mt-1">₹{pkg.amount.toLocaleString("en-IN")}</p></div>
              <div className="p-4"><p className="text-[11px] text-[#94A3B8] flex items-center gap-1"><Calendar size={11} /> Validity</p><p className="text-lg font-bold text-[#0F172A] mt-1">{pkg.days} days</p></div>
              <div className="p-4"><p className="text-[11px] text-[#94A3B8] flex items-center gap-1"><Calendar size={11} /> Expires</p><p className="text-sm font-semibold text-[#0F172A] mt-1">{endsAt ? endsAt.toISOString().slice(0, 10) : String(data.expired_on || "—")}</p></div>
            </div>
          </div>
          <div className="flex justify-end mt-4"><Link to="/dashboard/subscription" className="inline-flex items-center gap-2 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold"><PackageIcon size={15} /> Upgrade / Renew</Link></div>
        </Panel>
      )}

      {/* ── INVOICE ── */}
      {tab === "invoice" && <InvoicePanel buyer={data} />}

      {/* ── PASSWORD ── */}
      {tab === "password" && (
        <Panel title="Reset Password" subtitle="Change your login password">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <Field label="New Password"><input value={pwd} onChange={(e) => setPwd(e.target.value)} type="password" className={fieldCls} placeholder="Min 8 characters" /></Field>
            <Field label="Confirm Password"><input value={pwd2} onChange={(e) => setPwd2(e.target.value)} type="password" className={fieldCls} placeholder="Re-enter password" /></Field>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1.5">Use {PASSWORD_HINT}.</p>
          <div className="flex justify-start mt-4"><button onClick={savePassword} className="h-11 px-5 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] flex items-center gap-2"><KeyRound size={15} /> Update Password</button></div>
          <hr className="my-6 border-[#F1F5F9]" />
          <div className="grid grid-cols-1 gap-4 max-w-lg">
            <Field label="Your card link (public URL)">
              <div className={`flex items-stretch rounded-xl border overflow-hidden focus-within:ring-2 transition-all ${linkStatus === "taken" || linkStatus === "short" ? "border-red-400 focus-within:ring-red-400/20" : linkStatus === "available" ? "border-emerald-400 focus-within:ring-emerald-400/20" : "border-[#E2E8F0] focus-within:border-[#F7B31C] focus-within:ring-[#F7B31C]/20"}`}>
                <span className="px-3 flex items-center bg-[#F8FAFC] text-[12px] text-[#94A3B8] border-r border-[#E2E8F0] whitespace-nowrap">digitalcarda.in/</span>
                <input value={val("username")} onChange={(e) => set("username", e.target.value)} placeholder="your-brand" className="flex-1 h-10 px-3 outline-none text-sm bg-transparent" />
                {linkStatus !== "idle" && (
                  <span className="px-3 flex items-center shrink-0">
                    {linkStatus === "checking" ? <Loader2 size={15} className="animate-spin text-[#94A3B8]" />
                      : linkStatus === "available" ? <Check size={16} className="text-emerald-500" />
                      : <X size={16} className="text-red-500" />}
                  </span>
                )}
              </div>
              {linkStatus === "taken" ? <p className="text-[11px] font-semibold text-red-500 mt-1.5">That link is already taken — please choose another.</p>
                : linkStatus === "short" ? <p className="text-[11px] font-semibold text-red-500 mt-1.5">A bit too short — use at least 3 characters.</p>
                : linkStatus === "available" ? <p className="text-[11px] font-semibold text-emerald-600 mt-1.5">Available — this link is free to use.</p>
                : <p className="text-[11px] text-[#94A3B8] mt-1.5">
                    Editing <span className="font-semibold text-[#0F172A]">{activeCard?.name || "this card"}</span>{activeCardId === 1 ? " (primary)" : ""}. Letters, numbers and hyphens only. Your printed QR keeps working even if you change this.
                  </p>}
            </Field>
            <Field label="Email"><input value={val("email")} onChange={(e) => set("email", e.target.value)} className={fieldCls} type="email" /></Field>
          </div>
          <div className="flex justify-start mt-4"><button onClick={saveAccount} disabled={linkStatus === "taken" || linkStatus === "short" || linkStatus === "checking"} className="h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"><Pencil size={15} /> Save card link</button></div>
        </Panel>
      )}
    </ModuleShell>
  );
}
