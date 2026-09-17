import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ExternalLink } from "lucide-react";
import { readCustomer, scopedKey } from "@/hooks/useCustomer";
import { healUploadUrl } from "@/lib/img";
import { buildCardHtml } from "@/card-template/buildCard";
import { trpc } from "@/providers/trpc";
import { useDesignDraft } from "@/lib/designDraft";
import DraftDesignBar from "@/components/customer/DraftDesignBar";
import PhoneMockup from "@/components/customer/PhoneMockup";

/* Live card preview for every Edit Card module page.

   It deliberately does NOT use useCustomer/useLocalList: those hooks read
   localStorage once per instance and keep their own state, so a preview with
   its own copies would never see the edit another page's hook just made.
   Instead it reads storage directly whenever `dc:content-changed` fires — the
   signal every card edit already dispatches — so it stays right no matter which
   module (or future module) changed something. */

type Item = { id: number; filename?: string } & Record<string, unknown>;

function readList(base: string): Item[] {
  try {
    const arr = JSON.parse(localStorage.getItem(scopedKey(base)) || "[]");
    // Heal stale image hosts exactly like the published snapshot does.
    return Array.isArray(arr)
      ? arr.map((it) => (it && typeof it.filename === "string" ? { ...it, filename: healUploadUrl(it.filename) } : it))
      : [];
  } catch { return []; }
}

export default function LivePreview({ height = 620, frame = true }: { height?: number | string; frame?: boolean }) {
  const { data: program } = trpc.referral.myProgram.useQuery();
  // A template being tried (picked, not applied) is shown in the preview.
  const draft = useDesignDraft();
  const [html, setHtml] = useState("");
  const [views, setViews] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef(0);
  const themeRef = useRef<string | null>(null);

  // Any edit anywhere in the dashboard re-renders the card.
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("dc:content-changed", onChange);
    return () => window.removeEventListener("dc:content-changed", onChange);
  }, []);

  const slug = String(readCustomer().slug || readCustomer().username || "").trim().toLowerCase();

  // Real view total (base + tracked) so the preview matches the public card.
  useEffect(() => {
    if (!slug || slug.length < 3) return;
    let cancelled = false;
    fetch(`/api/views/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j && typeof j.views === "number") setViews(j.views); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);

  // Rebuild a beat after the last change so typing stays smooth.
  useEffect(() => {
    const t = setTimeout(() => {
      // Keep the reader where they were instead of jumping to the top — unless the
      // template changed, in which case the new design starts from its top.
      const saved = readCustomer();
      const current = draft ? { ...saved, theme: draft.theme, color: draft.color, color2: draft.color2 } : saved;
      const theme = String((current as { theme?: unknown }).theme ?? "");
      if (themeRef.current !== null && themeRef.current !== theme) {
        scrollRef.current = 0;
      } else {
        try {
          const y = frameRef.current?.contentWindow?.scrollY;
          if (typeof y === "number") scrollRef.current = y; // 0 (the top) is a real position too
        } catch { /* cross-origin guard */ }
      }
      themeRef.current = theme;
      const c = {
        ...current,
        referral_code: program?.code || "",
        ...(views != null ? { views } : {}),
      } as Parameters<typeof buildCardHtml>[0];
      setHtml(buildCardHtml(
        c,
        readList("dc_products") as Parameters<typeof buildCardHtml>[1],
        readList("dc_gallery") as Parameters<typeof buildCardHtml>[2],
        readList("dc_videos") as Parameters<typeof buildCardHtml>[3],
        readList("dc_offers") as Parameters<typeof buildCardHtml>[4],
        readList("dc_qrcode") as Parameters<typeof buildCardHtml>[5],
        readList("dc_reviews") as Parameters<typeof buildCardHtml>[6],
      ));
    }, draft ? 60 : 260);
    return () => clearTimeout(t);
  }, [tick, program?.code, views, draft]);

  const iframe = (
    <iframe
      ref={frameRef}
      onLoad={(e: SyntheticEvent<HTMLIFrameElement>) => {
        try { e.currentTarget.contentWindow?.scrollTo(0, scrollRef.current); } catch { /* guard */ }
      }}
      srcDoc={html}
      title="Live card preview"
      className={`w-full bg-white border-0 block ${frame ? "rounded-[33px]" : "rounded-2xl"}`}
      style={{ height }}
    />
  );

  if (!frame) {
    return (
      <div>
        <DraftDesignBar className="mb-2" />
        <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-white">{iframe}</div>
      </div>
    );
  }

  return (
    <div>
      <DraftDesignBar className="mb-3" />
      <PhoneMockup html={html} screenStyle={{ height }} frameRef={frameRef}
        onLoad={(e: SyntheticEvent<HTMLIFrameElement>) => {
          try { e.currentTarget.contentWindow?.scrollTo(0, scrollRef.current); } catch { /* guard */ }
        }} />
      <div className="flex items-center justify-center gap-3 mt-2.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live preview
        </span>
        {slug.length >= 3 && (
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#64748B] hover:text-[#0F172A] font-medium">
            Open card <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}
