import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Monitor, Smartphone, FileText, Mail, ShieldCheck, Inbox } from "lucide-react";
import { trpc } from "@/providers/trpc";

/* Admin → Email Log → View: one logged email as the recipient saw it.

   The HTML is shown in a sandboxed iframe — no scripts, its own origin — so a
   stored body can never run code in the admin session. One-time link tokens and
   any password the sender flagged were blanked before the body was saved
   (api/lib/mail.ts redactForLog), so nothing here can sign anyone in. */

const when = (v: string | Date | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

export default function EmailBodyViewer({ id, onClose, kindLabel }: { id: number; onClose: () => void; kindLabel: (k: string | null) => string }) {
  const { data, isLoading, error } = trpc.admin.emailLogBody.useQuery({ id }, { retry: false });
  const [tab, setTab] = useState<"html" | "text">("html");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Links in the email open in a new tab, not inside the preview frame.
  const srcDoc = useMemo(() => {
    const html = data?.html;
    if (!html) return "";
    return /<head[^>]*>/i.test(html)
      ? html.replace(/<head([^>]*)>/i, (_m, a) => `<head${a}><base target="_blank">`)
      : `<base target="_blank">${html}`;
  }, [data?.html]);

  const log = data?.log;
  const hasBody = !!(data?.html || data?.text);
  const showTab = tab === "html" && !data?.html && data?.text ? "text" : tab;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Email as sent">
      <div className="absolute inset-0 bg-[#0F172A]/55 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in sm:max-h-[calc(100vh-3rem)]">
        {/* Envelope — what their inbox list shows */}
        <div className="flex items-start gap-3 border-b border-[#F1F5F9] px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7]"><Mail size={18} className="text-[#B45309]" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-[#0F172A]">{log?.subject ?? (isLoading ? "Loading…" : "Email")}</p>
            <p className="mt-0.5 text-[12.5px] text-[#64748B]">
              To <b className="font-semibold text-[#334155]">{log?.toEmail ?? "—"}</b>
              <span className="mx-1.5 text-[#CBD5E1]">·</span>{when(log?.createdAt)}
              {log?.kind && <><span className="mx-1.5 text-[#CBD5E1]">·</span>{kindLabel(log.kind)}</>}
            </p>
            {log?.error && <p className="mt-1 text-[12px] text-[#B91C1C]">{log.error}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={18} /></button>
        </div>

        {hasBody && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#F1F5F9] bg-[#F8FAFC] px-5 py-2.5">
            <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-[#E2E8F0]">
              {([["html", "As they see it", Mail], ["text", "Plain text", FileText]] as const).map(([k, label, Icon]) => (
                <button key={k} type="button" aria-pressed={showTab === k} onClick={() => setTab(k)} disabled={k === "html" ? !data?.html : !data?.text}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold disabled:opacity-40 ${showTab === k ? "bg-[#0F172A] text-white" : "text-[#475569] hover:text-[#0F172A]"}`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            {showTab === "html" && (
              <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-[#E2E8F0]">
                {([["desktop", "Desktop", Monitor], ["phone", "Phone", Smartphone]] as const).map(([k, label, Icon]) => (
                  <button key={k} type="button" aria-pressed={device === k} onClick={() => setDevice(k)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold ${device === k ? "bg-[#FEF3C7] text-[#92400E]" : "text-[#475569] hover:text-[#0F172A]"}`}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            )}
            <p className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-[#64748B]">
              <ShieldCheck size={13} className="text-[#16A34A]" /> One-time links and passwords are hidden in this copy
            </p>
          </div>
        )}

        <div className="min-h-[300px] flex-1 overflow-auto bg-[#EEF1F5]">
          {isLoading ? (
            <div className="flex h-full min-h-[300px] items-center justify-center gap-2 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Loading the email…</div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-[#991B1B]">{error.message || "Could not load this email."}</div>
          ) : !hasBody ? (
            <div className="p-12 text-center">
              <Inbox size={30} className="mx-auto text-[#CBD5E1]" />
              <p className="mt-3 text-sm font-semibold text-[#334155]">The message itself wasn&apos;t saved</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-[#94A3B8]">
                Email contents are kept from 26 Sept 2026 onwards. For earlier emails the log has only the envelope — who, when, the subject and whether it went through.
              </p>
            </div>
          ) : showTab === "text" ? (
            <pre className="m-4 whitespace-pre-wrap break-words rounded-xl bg-white p-5 font-mono text-[12.5px] leading-relaxed text-[#1E293B] ring-1 ring-[#E2E8F0]">{data?.text}</pre>
          ) : (
            <div className="flex justify-center p-3 sm:p-5">
              <iframe
                title="Email as the recipient sees it"
                srcDoc={srcDoc}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                className={`h-[70vh] rounded-xl bg-white shadow-sm ring-1 ring-[#E2E8F0] transition-[width] duration-300 ${device === "phone" ? "w-[380px] max-w-full" : "w-full max-w-[760px]"}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
