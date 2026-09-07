import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ExternalLink } from "lucide-react";
import { readCustomer, scopedKey } from "@/hooks/useCustomer";
import { healUploadUrl } from "@/lib/img";
import { buildCardHtml } from "@/card-template/buildCard";
import { trpc } from "@/providers/trpc";

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
  const [html, setHtml] = useState("");
  const [views, setViews] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef(0);

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
      // Keep the reader where they were instead of jumping to the top.
      try { scrollRef.current = frameRef.current?.contentWindow?.scrollY || scrollRef.current; } catch { /* cross-origin guard */ }
      const c = {
        ...readCustomer(),
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
    }, 260);
    return () => clearTimeout(t);
  }, [tick, program?.code, views]);

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
    return <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-white">{iframe}</div>;
  }

  return (
    <div>
      <div className="relative rounded-[42px] bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-[9px] shadow-premium-lg ring-1 ring-black/5">
        <div className="absolute top-[9px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 h-6 px-4 rounded-b-2xl bg-[#0F172A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#334155]" />
          <span className="w-12 h-1 rounded-full bg-[#334155]" />
        </div>
        {iframe}
      </div>
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
