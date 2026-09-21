import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Search, Monitor, Smartphone, Mail, FileText, Loader2, Inbox, ChevronLeft, ChevronRight, AlertTriangle, X,
} from "lucide-react";
import { kindLabel } from "./EmailLog";

/* Every email DigitalCarda can send, rendered on the server with the fictional
   sample data in api/lib/email/previews/ — so the owner can check wording and
   layout without sending anything. The HTML goes into a sandboxed iframe with
   scripts off; allow-same-origin is only there so this page can read the
   email's height and show it whole instead of in a tiny scroll box. */

type Audience = "customer" | "admin" | "visitor" | "reseller" | "prospect";
type View = "email" | "text";
type Width = "desktop" | "phone";

const MODULES: Record<string, string> = {
  account: "Account & sign-in",
  lifecycle: "Trial & card lifecycle",
  billing: "Plans & payments",
  nfc: "NFC orders",
  leads: "Leads & enquiries",
  referral: "Refer & Earn",
  reseller: "Reseller partners",
  admin: "Owner alerts",
  marketing: "Marketing & system",
};

const AUDIENCE: Record<Audience, { label: string; chip: string }> = {
  customer: { label: "Customer", chip: "bg-[#DBEAFE] text-[#1D4ED8]" },
  admin: { label: "Owner", chip: "bg-[#0F172A] text-white" },
  visitor: { label: "Visitor", chip: "bg-[#DCFCE7] text-[#15803D]" },
  reseller: { label: "Reseller", chip: "bg-[#EDE9FE] text-[#6D28D9]" },
  prospect: { label: "Prospect", chip: "bg-[#FEF3C7] text-[#B45309]" },
};

// A typical desktop reading pane vs a phone.
const WIDTH_PX: Record<Width, number> = { desktop: 600, phone: 375 };
// Gmail cuts a message off above ~102 KB behind "View entire message".
const GMAIL_CLIP = 102 * 1024;

const variantText = (v: string | null) => (v ? v.replace(/[-_]+/g, " ") : "");
const moduleName = (m: string) => MODULES[m] || m.replace(/^./, (c) => c.toUpperCase());

/** The hidden inbox-preview line every email starts with, as plain text. */
function preheaderOf(html: string): string {
  const m = html.match(/<div style="display:none;[^"]*">([\s\S]*?)&#8199;/);
  if (!m) return "";
  // DOMParser never runs scripts; it only decodes the entities.
  return (new DOMParser().parseFromString(m[1], "text/html").documentElement.textContent || "").trim();
}

function sizeText(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export default function AdminEmailPreviews() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [audience, setAudience] = useState<Audience | "all">("all");
  const [view, setView] = useState<View>("email");
  // On a phone the desktop view would only scroll sideways, so start narrow there.
  const [width, setWidth] = useState<Width>(() => (typeof window !== "undefined" && window.innerWidth < 700 ? "phone" : "desktop"));
  const frameRef = useRef<HTMLIFrameElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Templates only change with a deploy, so nothing here needs refetching.
  const { data: list = [], isLoading } = trpc.emailPreview.list.useQuery(undefined, { staleTime: Infinity });

  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => list.filter((p) =>
    (audience === "all" || p.audience === audience)
    && (!needle || [p.name, kindLabel(p.kind ?? p.name), variantText(p.variant), p.subject, moduleName(p.module)]
      .join(" ").toLowerCase().includes(needle))), [list, audience, needle]);

  const groups = useMemo(() => {
    const out: { module: string; items: typeof shown }[] = [];
    for (const p of shown) {
      const g = out.find((x) => x.module === p.module);
      if (g) g.items.push(p); else out.push({ module: p.module, items: [p] });
    }
    return out;
  }, [shown]);

  const audienceCounts = useMemo(() => {
    const c: Partial<Record<Audience, number>> = {};
    for (const p of list) c[p.audience] = (c[p.audience] ?? 0) + 1;
    return c;
  }, [list]);
  const templateCount = useMemo(() => new Set(list.map((p) => p.name)).size, [list]);

  // The selection lives in the URL, so a reload or a shared link opens the same email.
  const current = list.find((p) => p.id === params.get("id")) ?? shown[0] ?? null;
  const index = current ? shown.findIndex((p) => p.id === current.id) : -1;

  const select = (id: string, scroll = false) => {
    setParams((prev) => { const n = new URLSearchParams(prev); n.set("id", id); return n; }, { replace: true });
    // Stacked layout: jump down to the email instead of leaving it off-screen.
    if (scroll && window.innerWidth < 1280) previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const { data: email, isFetching: rendering, error } = trpc.emailPreview.render.useQuery(
    { id: current?.id ?? "" },
    { enabled: !!current, staleTime: Infinity, placeholderData: (prev) => prev },
  );

  // <base target="_blank"> so a click opens the link in a new tab instead of
  // navigating the frame (most sites refuse to be framed anyway).
  const html = email?.html ?? "";
  const doc = useMemo(() => html.replace(/<head>/i, `<head><base target="_blank">`), [html]);
  const preheader = useMemo(() => (html ? preheaderOf(html) : ""), [html]);
  const bytes = useMemo(() => new TextEncoder().encode(html).length, [html]);

  /* The frame height is set straight on the element, not kept in state: it is
     read back from the rendered email, so React has nothing to decide here. */
  const measure = useCallback(() => {
    const frame = frameRef.current;
    const body = frame?.contentDocument?.body;
    if (!frame || !body) return;
    // body, not documentElement: the latter never reports less than the frame's current height.
    const read = () => Math.max(240, body.scrollHeight, body.offsetHeight);
    // Read twice: while the frame is too short it shows a scrollbar, which narrows
    // the email and makes the first reading ~150px too tall.
    frame.style.height = `${read()}px`;
    frame.style.height = `${read()}px`;
  }, []);
  // Narrower frame = taller email; the frame doesn't reload, so measure again.
  useEffect(() => { measure(); }, [width, measure]);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Email Previews" subtitle="Every email DigitalCarda sends, shown with sample data — nothing is sent" /></div>
      <div className="p-4 sm:p-6 max-w-6xl">
        <div className="grid xl:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">

          {/* ── The list ── */}
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] flex flex-col overflow-hidden xl:sticky xl:top-[4.5rem] max-h-[55vh] xl:max-h-[calc(100vh-6rem)]">
            <div className="p-3 space-y-2.5 border-b border-[#F1F5F9]">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name or subject…"
                  aria-label="Search emails"
                  className="w-full h-10 rounded-xl border border-[#E2E8F0] pl-9 pr-8 text-sm outline-none focus:border-[#F7B31C]"
                />
                {q && (
                  <button type="button" onClick={() => setQ("")} aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-center">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["all", ...Object.keys(AUDIENCE)] as (Audience | "all")[])
                  .filter((a) => a === "all" || audienceCounts[a])
                  .map((a) => (
                    <button key={a} type="button" onClick={() => setAudience(a)}
                      className={`h-7 px-2.5 rounded-lg text-[11.5px] font-semibold border-2 transition-all inline-flex items-center gap-1 ${
                        audience === a ? "border-[#F7B31C] bg-[#FEF3C7]/50 text-[#92400E]" : "border-[#E2E8F0] text-[#334155] hover:border-[#F7B31C]/50"}`}>
                      {a === "all" ? "All" : AUDIENCE[a].label}
                      <span className="text-[10px] font-bold text-[#94A3B8] tabular-nums">{a === "all" ? list.length : audienceCounts[a]}</span>
                    </button>
                  ))}
              </div>
              {!isLoading && (
                <p className="text-[11.5px] text-[#94A3B8] tabular-nums">
                  {templateCount} templates · {list.length} previews{shown.length !== list.length && <> · {shown.length} shown</>}
                </p>
              )}
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              {isLoading ? (
                <div className="p-10 flex items-center justify-center text-[#64748B] gap-2 text-sm">
                  <Loader2 size={16} className="animate-spin" /> Loading…
                </div>
              ) : !shown.length ? (
                <div className="p-10 text-center">
                  <Inbox size={26} className="mx-auto text-[#CBD5E1]" />
                  <p className="text-[13px] font-semibold text-[#334155] mt-2">No emails match</p>
                  <p className="text-[12px] text-[#94A3B8] mt-0.5">Try another word or audience.</p>
                </div>
              ) : groups.map((g) => (
                <div key={g.module}>
                  <div className="sticky top-0 z-[1] bg-[#F8FAFC] border-y border-[#F1F5F9] px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#64748B] flex justify-between">
                    <span>{moduleName(g.module)}</span><span className="tabular-nums text-[#94A3B8]">{g.items.length}</span>
                  </div>
                  {g.items.map((p) => {
                    const on = p.id === current?.id;
                    return (
                      <button key={p.id} type="button" onClick={() => select(p.id, true)} aria-current={on ? "true" : undefined}
                        className={`w-full text-left px-3.5 py-2.5 border-l-[3px] transition-colors ${on ? "border-[#F7B31C] bg-[#FEF3C7]/40" : "border-transparent hover:bg-[#F8FAFC]"}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-semibold truncate ${on ? "text-[#0F172A]" : "text-[#334155]"}`}>{kindLabel(p.kind ?? p.name)}</span>
                          <span className={`ml-auto shrink-0 px-1.5 py-px rounded-md text-[9.5px] font-bold uppercase tracking-wide ${AUDIENCE[p.audience]?.chip ?? "bg-[#F1F5F9] text-[#475569]"}`}>
                            {AUDIENCE[p.audience]?.label ?? p.audience}
                          </span>
                        </div>
                        {p.variant && <div className="text-[11.5px] text-[#94A3B8] truncate mt-0.5">{variantText(p.variant)}</div>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* ── The email ── */}
          <div ref={previewRef} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden scroll-mt-20 min-w-0">
            {!current ? (
              <div className="p-12 text-center text-sm text-[#64748B]">
                {isLoading ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading…</span> : "Pick an email on the left."}
              </div>
            ) : (
              <>
                <div className="p-4 sm:p-5 border-b border-[#F1F5F9] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">{moduleName(current.module)}</p>
                      <h2 className="text-base font-bold text-[#0F172A] mt-0.5">{kindLabel(current.kind ?? current.name)}</h2>
                      <p className="text-[12px] text-[#64748B] mt-0.5 break-words">
                        <span className="font-mono">{current.name}</span>
                        {current.variant && <> · {variantText(current.variant)}</>}
                        {" · "}to {AUDIENCE[current.audience]?.label.toLowerCase() ?? current.audience}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => index > 0 && select(shown[index - 1].id)} disabled={index <= 0} aria-label="Previous email"
                        className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center disabled:opacity-40">
                        <ChevronLeft size={16} />
                      </button>
                      {/* From a selection the filters hide (index -1), "next" goes to the first one shown. */}
                      <button type="button" onClick={() => index < shown.length - 1 && select(shown[index + 1].id)}
                        disabled={index >= shown.length - 1} aria-label="Next email"
                        className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center disabled:opacity-40">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* How it sits in an inbox list: sender, subject, then the preheader. */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full gradient-gold text-[#0F172A] text-[11px] font-extrabold flex items-center justify-center shrink-0">DC</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-[#0F172A]">DigitalCarda</p>
                      <p className="text-[13.5px] font-semibold text-[#0F172A] break-words">{email?.subject ?? current.subject}</p>
                      {preheader && <p className="text-[12.5px] text-[#64748B] truncate">{preheader}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1">
                      {([["email", "Email", Mail], ["text", "Plain text", FileText]] as [View, string, typeof Mail][]).map(([v, label, Icon]) => (
                        <button key={v} type="button" onClick={() => setView(v)}
                          className={`h-8 px-3 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${view === v ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
                          <Icon size={13} /> {label}
                        </button>
                      ))}
                    </div>
                    {view === "email" && (
                      <div className="flex gap-1">
                        {([["desktop", "Desktop", Monitor], ["phone", "Phone", Smartphone]] as [Width, string, typeof Monitor][]).map(([w, label, Icon]) => (
                          <button key={w} type="button" onClick={() => setWidth(w)} title={`${WIDTH_PX[w]} px wide`}
                            className={`h-8 px-3 rounded-lg text-[12px] font-semibold border-2 inline-flex items-center gap-1.5 transition-all ${width === w ? "border-[#F7B31C] bg-[#FEF3C7]/50 text-[#92400E]" : "border-[#E2E8F0] text-[#334155] hover:border-[#F7B31C]/50"}`}>
                            <Icon size={13} /> {label}
                          </button>
                        ))}
                      </div>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-[#94A3B8] tabular-nums">
                      {rendering && <Loader2 size={12} className="animate-spin" />}
                      {bytes > 0 && <span className={bytes > GMAIL_CLIP ? "text-[#B91C1C] font-semibold" : ""}>{sizeText(bytes)}{bytes > GMAIL_CLIP && " · Gmail will clip it"}</span>}
                    </span>
                  </div>
                </div>

                <div className="bg-[#EDF1F7] p-3 sm:p-4 overflow-x-auto">
                  {error ? (
                    <p className="text-[13px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 flex gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" /> Couldn't load this preview. {error.message}
                    </p>
                  ) : email?.error ? (
                    <p className="text-[13px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 flex gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" /> This template failed to render: {email.error}
                    </p>
                  ) : !email ? (
                    <div className="py-16 flex items-center justify-center text-[#64748B] gap-2 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Rendering…
                    </div>
                  ) : view === "email" ? (
                    <iframe
                      ref={frameRef}
                      title={`Preview: ${email.subject}`}
                      srcDoc={doc}
                      // No allow-scripts: nothing in the email can run. See the note at the top.
                      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                      onLoad={measure}
                      // "Phone" never overflows a screen narrower than the phone it imitates.
                      style={{ width: width === "phone" ? `min(${WIDTH_PX.phone}px, 100%)` : WIDTH_PX.desktop }}
                      className="block mx-auto h-[900px] border-0 rounded-xl bg-white shadow-sm"
                    />
                  ) : (
                    <pre className="max-w-[640px] mx-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-[#334155] bg-white rounded-xl p-4 sm:p-5 shadow-sm">
                      {email.text}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-[11.5px] text-[#94A3B8] leading-relaxed mt-5">
          Names, amounts and links here are made up. Real emails fill in the customer's own details; the
          template, wording and layout are exactly what they receive.
        </p>
      </div>
    </ResponsiveDashboardLayout>
  );
}
