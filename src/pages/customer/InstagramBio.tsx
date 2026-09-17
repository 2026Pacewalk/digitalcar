import { useMemo, useState } from "react";
import { Instagram, Copy, Check, RotateCcw, AlertTriangle, ChevronDown, Link2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import ModuleShell, { Panel, Tip } from "@/components/customer/ModuleShell";
import InstagramProfilePreview from "@/components/tools/InstagramProfilePreview";
import { useCustomer, getActiveCardId } from "@/hooks/useCustomer";
import { trpc } from "@/providers/trpc";
import { copyText } from "@/lib/clipboard";
import {
  IG_TEMPLATES, IG_BIO_LIMIT, IG_NAME_LIMIT, buildIgBio, igNameField, igLength, cityFromAddress, type IgData,
} from "@/lib/instagramBio";

const ORIGIN = "https://digitalcarda.in";

const HOW_TO: { title: string; steps: string[] }[] = [
  { title: "Update your bio", steps: [
    "Open Instagram → your profile → Edit profile.",
    "Tap Bio, clear it, paste your new bio and tap Done (✓).",
  ]},
  { title: "Add your card link", steps: [
    "Edit profile → Links → Add external link.",
    "Paste your card link, give it a title like \"Contact & prices\", and save.",
    "Links in the bio text aren't clickable on Instagram — this is the one people can tap.",
  ]},
  { title: "Make your name searchable", steps: [
    "Edit profile → Name. Paste the suggested name (up to 30 characters).",
    "Instagram search matches this field, so a word like \"Salon\" or your city helps people find you.",
  ]},
  { title: "Business or creator account", steps: [
    "Settings → Account type and tools → Switch to professional account.",
    "You get a category under your name and Contact buttons that call, email or WhatsApp you.",
  ]},
];

export default function CustomerInstagramBio() {
  const { data } = useCustomer();
  const { data: mine } = trpc.publish.mine.useQuery({ cardId: getActiveCardId() }, { retry: false });

  const [templateId, setTemplateId] = useState("classic");
  // Edits are kept per template, so browsing never throws away someone's wording.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [copied, setCopied] = useState<"bio" | "name" | "link" | null>(null);
  const [openHelp, setOpenHelp] = useState<number | null>(0);

  const slug = String(mine?.slug || data.slug || "");
  const cardUrl = slug ? `${ORIGIN}/${slug}` : "";

  const ig: IgData = useMemo(() => ({
    name: String(data.name || ""),
    designation: String(data.designation || ""),
    company: String(data.company_name || ""),
    category: String(data.nature || ""),
    city: cityFromAddress(String(data.address || "")),
    highlights: String(data.specialities || "").split(/[,|]/).map((x) => x.trim()).filter(Boolean).slice(0, 3),
    cardUrl,
  }), [data, cardUrl]);

  const generated = useMemo(() => buildIgBio(templateId, ig), [templateId, ig]);
  const bio = edits[templateId] ?? generated;
  const edited = edits[templateId] !== undefined && edits[templateId] !== generated;
  const bioLen = igLength(bio);
  const nameField = nameEdit ?? igNameField(ig);
  const logo = /^(https:\/\/|data:image\/)/i.test(String(data.logo || "")) ? String(data.logo) : "";

  const missing = [
    !(ig.company || ig.name) && "a name or business name",
    !slug && "a published card",
  ].filter(Boolean) as string[];

  const setBio = (v: string) => setEdits((e) => ({ ...e, [templateId]: v }));
  const reset = () => setEdits((e) => { const n = { ...e }; delete n[templateId]; return n; });

  const copy = async (what: "bio" | "name" | "link", text: string, msg: string) => {
    if (await copyText(text)) {
      setCopied(what); toast.success(msg);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2200);
    } else toast.error("Copy failed — select the text and copy it manually");
  };

  return (
    <ModuleShell title="Instagram Bio" subtitle="A bio that says what you do and sends people to your card" icon={Instagram}
      preview={false} wide>
      <Tip>
        Pick a style, tweak the words, then copy three things into Instagram: your bio, a searchable name, and your
        card link. Everything is filled in from your card.
      </Tip>

      {missing.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3">
          <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
          <p className="text-xs text-[#991B1B]">
            Your card is still missing {missing.join(" and ")}. These bios are built from it, so
            {" "}<Link to="/dashboard/build" className="underline font-semibold">finish your card first</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-5 items-start">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <Panel title="Choose a style" subtitle={`${IG_TEMPLATES.length} bios, each written for a kind of business`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {IG_TEMPLATES.map((t) => {
                const on = templateId === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} aria-pressed={on}
                    className={`text-left rounded-xl p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1306C] ${
                      on ? "bg-[#FDF2F8] ring-2 ring-[#E1306C]" : "bg-[#F8FAFC] ring-1 ring-[#E2E8F0] hover:ring-[#E1306C]/50"}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-[#0F172A]">{t.name}</span>
                      {edits[t.id] !== undefined && edits[t.id] !== buildIgBio(t.id, ig) && (
                        <span className="text-[9px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded">EDITED</span>
                      )}
                      {on && <Check size={13} className="text-[#E1306C] ml-auto shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-snug mt-1">{t.blurb}</p>
                    <p className="text-[10px] font-semibold text-[#94A3B8] mt-1.5">{t.fits}</p>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="1 · Your bio" subtitle="Change any of it — this is the text that gets copied"
            right={edited ? (
              <button type="button" onClick={reset}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F1F5F9] text-[#334155] text-[11px] font-semibold hover:bg-[#E2E8F0] transition-colors">
                <RotateCcw size={12} /> Reset
              </button>
            ) : undefined}>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5} spellCheck aria-label="Bio text"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 text-[14px] leading-relaxed text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E1306C]/30 focus:border-[#E1306C] resize-y" />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <p className="text-[11px] text-[#94A3B8]">Line breaks and emoji work. Bold and links don't.</p>
              <p className={`text-[11px] font-semibold tabular-nums ${bioLen > IG_BIO_LIMIT ? "text-[#DC2626]" : "text-[#64748B]"}`}>
                {bioLen} / {IG_BIO_LIMIT}
              </p>
            </div>
            {bioLen > IG_BIO_LIMIT && (
              <p className="text-[11px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2 mt-2">
                Instagram won't save a bio over {IG_BIO_LIMIT} characters. Trim {bioLen - IG_BIO_LIMIT} more.
              </p>
            )}
            <button type="button" onClick={() => copy("bio", bio, "Bio copied — paste it into Edit profile → Bio")} disabled={bioLen > IG_BIO_LIMIT}
              className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-sm font-bold flex items-center justify-center gap-2 hover:brightness-105 transition disabled:opacity-50 active:scale-[0.99]">
              {copied === "bio" ? <><Check size={16} /> Copied — now paste it</> : <><Copy size={16} /> Copy bio</>}
            </button>
          </Panel>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <Panel title="2 · Your name" subtitle="Searchable on Instagram">
              <div className="flex items-center gap-2">
                <UserRound size={15} className="text-[#94A3B8] shrink-0" />
                <input value={nameField} onChange={(e) => setNameEdit(e.target.value)} aria-label="Profile name"
                  className="h-10 flex-1 min-w-0 rounded-xl border border-[#E2E8F0] px-3 text-[13px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E1306C]/30 focus:border-[#E1306C]" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className={`text-[11px] font-semibold tabular-nums ${igLength(nameField) > IG_NAME_LIMIT ? "text-[#DC2626]" : "text-[#94A3B8]"}`}>
                  {igLength(nameField)} / {IG_NAME_LIMIT}
                </p>
                <button type="button" onClick={() => copy("name", nameField, "Name copied")}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F1F5F9] text-[#334155] text-[11px] font-semibold hover:bg-[#E2E8F0]">
                  {copied === "name" ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </Panel>

            <Panel title="3 · Your link" subtitle="Goes in Edit profile → Links">
              <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 h-10">
                <Link2 size={15} className="text-[#94A3B8] shrink-0" />
                <span className="truncate text-[13px] text-[#0F172A]">{cardUrl ? cardUrl.replace(/^https:\/\//, "") : "Publish your card first"}</span>
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={() => cardUrl && copy("link", cardUrl, "Card link copied")} disabled={!cardUrl}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F1F5F9] text-[#334155] text-[11px] font-semibold hover:bg-[#E2E8F0] disabled:opacity-50">
                  {copied === "link" ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
                </button>
              </div>
            </Panel>
          </div>

          <Panel title="How to update Instagram" subtitle="Takes about a minute">
            <div className="divide-y divide-[#F1F5F9]">
              {HOW_TO.map((hw, i) => (
                <div key={hw.title}>
                  <button type="button" onClick={() => setOpenHelp(openHelp === i ? null : i)} aria-expanded={openHelp === i}
                    className="w-full flex items-center justify-between py-3 text-left gap-3">
                    <span className="text-[13px] font-semibold text-[#0F172A]">{hw.title}</span>
                    <ChevronDown size={16} className={`text-[#94A3B8] shrink-0 transition-transform ${openHelp === i ? "rotate-180" : ""}`} />
                  </button>
                  {openHelp === i && (
                    <ol className="pb-3 pl-1 space-y-1.5">
                      {hw.steps.map((s, k) => (
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

        <aside className="xl:sticky xl:top-6 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">How your profile will look</p>
          <InstagramProfilePreview
            username={slug || "yourbusiness"}
            displayName={nameField}
            category={ig.category || ig.designation}
            bio={bio}
            link={cardUrl}
            avatar={logo}
          />
        </aside>
      </div>
    </ModuleShell>
  );
}
