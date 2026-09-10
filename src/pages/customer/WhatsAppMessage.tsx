import { useMemo, useState } from "react";
import { MessageCircle, Copy, Check, RotateCcw, AlertTriangle, ChevronDown, Send } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import ModuleShell, { Panel, Tip } from "@/components/customer/ModuleShell";
import { useCustomer, getActiveCardId } from "@/hooks/useCustomer";
import { trpc } from "@/providers/trpc";
import { WA_TEMPLATES, buildWaMessage, WA_SOFT_LIMIT, type WaData } from "@/lib/whatsappMessage";

const ORIGIN = "https://digitalcarda.in";

/* Render WhatsApp's markup the way WhatsApp does, for the preview bubble.
   Escape FIRST — the text is the customer's own, but it lands in innerHTML. */
function waPreviewHtml(text: string): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  return esc(text)
    .replace(/```([\s\S]+?)```/g, '<code style="font-family:monospace;background:#00000010;padding:1px 3px;border-radius:3px;">$1</code>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,!?)]|$)/g, "$1<strong>$2</strong>")
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,!?)]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])~([^~\n]+)~(?=[\s.,!?)]|$)/g, "$1<s>$2</s>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#027eb5;" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n/g, "<br />");
}

const HOW_TO: { client: string; steps: string[] }[] = [
  { client: "WhatsApp Business — greeting message", steps: [
    "Open WhatsApp Business → Settings → Business tools.",
    "Tap Greeting message and turn it on.",
    "Tap the message text, clear it, and paste yours.",
    "Choose who gets it (Send to everyone) and Save.",
  ]},
  { client: "WhatsApp Business — away message", steps: [
    "Settings → Business tools → Away message. Turn it on.",
    "Paste your text, then set the schedule (outside business hours works well).",
    "Pick the recipients and Save.",
  ]},
  { client: "WhatsApp Business — quick replies", steps: [
    "Settings → Business tools → Quick replies → add a new one.",
    "Paste the message, then give it a shortcut like /services or /payment.",
    "In any chat, type / and the shortcut to insert it instantly.",
  ]},
  { client: "Normal WhatsApp (no Business app)", steps: [
    "Normal WhatsApp has no automatic greeting — paste the message into a chat yourself.",
    "To keep it handy, message it to yourself once and star it, or save it in your phone's notes.",
    "Or install WhatsApp Business (free) — your chats and number carry across.",
  ]},
];

export default function CustomerWhatsAppMessage() {
  const { data } = useCustomer();
  const { data: mine } = trpc.publish.mine.useQuery({ cardId: getActiveCardId() }, { retry: false });

  const [templateId, setTemplateId] = useState("welcome");
  /* Edits are kept PER TEMPLATE, so browsing the list never destroys the
     wording someone just spent five minutes on. */
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [openHelp, setOpenHelp] = useState<number | null>(0);

  const slug = String(mine?.slug || data.slug || "");
  const cardUrl = `${ORIGIN}/${slug}`;

  const wa: WaData = useMemo(() => ({
    name: String(data.name || ""),
    designation: String(data.designation || ""),
    company: String(data.company_name || ""),
    phone: String(data.mobile1 || ""),
    email: String(data.email || ""),
    website: String(data.url || ""),
    address: String(data.address || ""),
    cardUrl,
    mapUrl: String(data.google_map || ""),
    reviewUrl: String(data.google_review || ""),
    upi: String(data.upi || data.paytm_number || ""),
  }), [data, cardUrl]);

  const generated = useMemo(() => buildWaMessage(templateId, wa), [templateId, wa]);
  const text = edits[templateId] ?? generated;
  const edited = edits[templateId] !== undefined && edits[templateId] !== generated;
  const active = WA_TEMPLATES.find((t) => t.id === templateId);

  const missing = [!wa.name && "your name", !slug && "a published card"].filter(Boolean) as string[];

  const setText = (v: string) => setEdits((e) => ({ ...e, [templateId]: v }));
  const reset = () => setEdits((e) => { const n = { ...e }; delete n[templateId]; return n; });

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Message copied — paste it into WhatsApp");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Copy failed — select the text and copy it manually");
    }
  };

  /* Sending it to yourself is the fastest way to see how it really looks on a
     phone, links and emoji included. */
  const testUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <ModuleShell title="WhatsApp Messages" subtitle="Ready-made replies with your card link, in your own words" icon={MessageCircle}
      preview={false} wide>
      <Tip>
        Pick a message, change the wording to sound like you, then copy it into WhatsApp Business under
        Business tools. Your card link is already in there, so every reply shares your details.
      </Tip>

      {missing.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3">
          <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
          <p className="text-xs text-[#991B1B]">
            Your card is still missing {missing.join(" and ")}. These messages are built from it, so
            {" "}<Link to="/dashboard/build" className="underline font-semibold">finish your card first</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 sm:gap-5 items-start">

        {/* ── Left: pick and edit ── */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <Panel title="Choose a message" subtitle={`${WA_TEMPLATES.length} ready-made replies, all filled in from your card`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WA_TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
                  aria-pressed={templateId === t.id}
                  className={`text-left rounded-xl p-3 transition-all ${
                    templateId === t.id
                      ? "bg-[#F0FDF4] ring-2 ring-[#25D366]"
                      : "bg-[#F8FAFC] ring-1 ring-[#E2E8F0] hover:ring-[#25D366]/50"}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[#0F172A]">{t.name}</span>
                    {edits[t.id] !== undefined && edits[t.id] !== buildWaMessage(t.id, wa) && (
                      <span className="text-[9px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded">EDITED</span>
                    )}
                    {templateId === t.id && <Check size={13} className="text-[#16A34A] ml-auto shrink-0" />}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-snug mt-1">{t.blurb}</p>
                  <p className="text-[10px] font-semibold text-[#94A3B8] mt-1.5">{t.slot}</p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Your message" subtitle="Change any of it — this is the text that gets copied"
            right={edited ? (
              <button type="button" onClick={reset}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F1F5F9] text-[#334155] text-[11px] font-semibold hover:bg-[#E2E8F0] transition-colors">
                <RotateCcw size={12} /> Reset
              </button>
            ) : undefined}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              spellCheck
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 text-[13px] leading-relaxed text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <p className="text-[11px] text-[#94A3B8]">
                Formatting: <code className="font-mono">*bold*</code> · <code className="font-mono">_italic_</code> · <code className="font-mono">~strike~</code>
              </p>
              <p className={`text-[11px] font-semibold ${text.length > WA_SOFT_LIMIT ? "text-[#DC2626]" : "text-[#94A3B8]"}`}>
                {text.length} characters
              </p>
            </div>
            {text.length > WA_SOFT_LIMIT && (
              <p className="text-[11px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2 mt-2">
                WhatsApp Business limits greeting and away messages to around {WA_SOFT_LIMIT.toLocaleString()} characters.
                This one may get cut off — trim it, or use it as a quick reply instead.
              </p>
            )}
          </Panel>

          <Panel title="Where to put it" subtitle="One-time setup in WhatsApp Business">
            <div className="divide-y divide-[#F1F5F9]">
              {HOW_TO.map((h, i) => (
                <div key={h.client}>
                  <button type="button" onClick={() => setOpenHelp(openHelp === i ? null : i)}
                    className="w-full flex items-center justify-between py-3 text-left gap-3">
                    <span className="text-[13px] font-semibold text-[#0F172A]">{h.client}</span>
                    <ChevronDown size={16} className={`text-[#94A3B8] shrink-0 transition-transform ${openHelp === i ? "rotate-180" : ""}`} />
                  </button>
                  {openHelp === i && (
                    <ol className="pb-3 pl-1 space-y-1.5">
                      {h.steps.map((s, k) => (
                        <li key={k} className="flex gap-2.5 text-[12px] text-[#475569] leading-snug">
                          <span className="w-4 h-4 rounded-full bg-[#F1F5F9] text-[#64748B] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{k + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Right: how it looks on a phone ── */}
        <aside className="xl:sticky xl:top-6 space-y-3">
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F1F5F9]">
              <span className="w-7 h-7 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <MessageCircle size={14} className="text-[#16A34A]" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#0F172A] truncate">{active?.name}</p>
                <p className="text-[10px] text-[#94A3B8]">How it looks in the chat</p>
              </div>
            </div>

            {/* WhatsApp's own chat background tone, so the bubble reads honestly. */}
            <div className="p-4" style={{ background: "#EFE7DE" }}>
              <div className="relative max-w-[300px] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
                <div className="text-[13px] leading-[1.45] text-[#111B21] whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: waPreviewHtml(text) }} />
                <div className="text-[10px] text-[#8696A0] text-right mt-1 select-none">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          </div>

          <button onClick={doCopy} type="button"
            className="w-full h-12 rounded-xl bg-[#25D366] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1FB855] transition-colors active:scale-[0.98]">
            {copied ? <><Check size={17} /> Copied — now paste it</> : <><Copy size={17} /> Copy message</>}
          </button>

          <a href={testUrl} target="_blank" rel="noreferrer"
            className="w-full h-10 rounded-xl bg-[#F1F5F9] text-[#334155] text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-[#E2E8F0] transition-colors">
            <Send size={14} /> Send it to yourself as a test
          </a>

          <p className="text-[11px] text-[#94A3B8] leading-snug">
            Anything in <em>italics and brackets</em> is a note to you — replace it before you use the message.
          </p>
        </aside>
      </div>
    </ModuleShell>
  );
}
