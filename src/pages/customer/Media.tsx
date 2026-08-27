import { useState } from "react";
import { Image as ImageIcon, Video, Trash2, Plus, Play, ImagePlus, Instagram, Check } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { fieldCls, LimitBar, Tip } from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList, fileToDataUrl, packageLimit } from "@/hooks/useCustomer";
import { contentSeeder } from "@/lib/cardContent";
import { parseVideo, isVideoUrl } from "@/lib/video";

type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };

export default function CustomerMedia() {
  const { data, update } = useCustomer();
  const videoLayout = String(data.video_layout ?? "stack").toLowerCase() === "swipe" ? "swipe" : "stack";
  const gLimit = packageLimit(Number(data.package_id), "gallery");
  const vLimit = packageLimit(Number(data.package_id), "video");
  const [tab, setTab] = useState<"gallery" | "video">("gallery");
  const gallery = useLocalList<Gallery>("dc_gallery", [], contentSeeder("gallery"));
  const videos = useLocalList<Vid>("dc_videos", [], contentSeeder("videos"));
  const [vt, setVt] = useState(""); const [vu, setVu] = useState("");
  const [playing, setPlaying] = useState<number | null>(null); // video played inline in the dashboard
  const [secTitle, setSecTitle] = useState<string | null>(null); // local edit of the section heading
  const secTitleVal = secTitle !== null ? secTitle : String(data.video ?? "");
  const videoFull = videos.items.length >= vLimit;

  const onPickImages = async (files: FileList | null) => {
    if (!files) return;
    let slots = gLimit - gallery.items.length;
    if (slots <= 0) { toast.error("Gallery limit reached — upgrade your package."); return; }
    for (const f of Array.from(files)) {
      if (slots <= 0) { toast.error(`Only ${gLimit} images allowed on your package.`); break; }
      const url = await fileToDataUrl(f); gallery.add({ name: f.name, filename: url }); slots--;
    }
    toast.success("Image(s) added");
  };
  const addVideo = () => {
    if (videoFull) { toast.error("Video limit reached — upgrade your package."); return; }
    if (!isVideoUrl(vu)) { toast.error("Paste a valid video link — YouTube, YouTube Shorts or Instagram."); return; }
    videos.add({ title: vt.trim() || "Video", url: vu.trim() }); setVt(""); setVu(""); toast.success("Video added");
  };

  const tabs = [
    { id: "gallery" as const, label: "Photo Gallery", desc: "Photos of your work, shop & products", icon: ImageIcon, count: gallery.items.length },
    { id: "video" as const, label: "Videos", desc: "YouTube, Shorts & Instagram reels", icon: Video, count: videos.items.length },
  ];

  return (
    <ModuleShell title="Gallery (Images / Videos)" subtitle="Gallery images and YouTube, Shorts & Instagram videos" icon={ImageIcon}>
      {/* Big, obvious section switch — which one you're editing is unmissable. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all ${active ? "border-[#F7B31C] bg-[#0F172A] shadow-premium" : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"}`}>
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-[#F7B31C] text-[#0F172A]" : "bg-[#F1F5F9] text-[#64748B]"}`}><t.icon size={20} /></span>
              <span className="min-w-0">
                <span className={`flex items-center gap-2 text-[14px] font-bold ${active ? "text-white" : "text-[#0F172A]"}`}>
                  {t.label}
                  <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/15 text-[#FDE68A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{t.count}</span>
                </span>
                <span className={`block text-[11.5px] mt-0.5 leading-snug ${active ? "text-[#CBD5E1]" : "text-[#94A3B8]"}`}>{t.desc}</span>
              </span>
              {active && <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#F7B31C] text-[#0F172A] flex items-center justify-center"><Check size={12} strokeWidth={3} /></span>}
            </button>
          );
        })}
      </div>
      <LimitBar used={tab === "gallery" ? gallery.items.length : videos.items.length} limit={tab === "gallery" ? gLimit : vLimit} unit={tab === "gallery" ? "gallery images" : "videos"} />
      <Tip>A short intro or product video keeps visitors on your card far longer — and the longer they stay, the more they enquire.</Tip>
      {tab === "gallery" ? (
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <label className="aspect-square rounded-xl border-2 border-dashed border-[#E2E8F0] hover:border-[#F7B31C] bg-[#F8FAFC] flex flex-col items-center justify-center gap-1.5 cursor-pointer text-[#94A3B8] transition-colors">
              <ImagePlus size={22} /><span className="text-xs font-medium">Add Images</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickImages(e.target.files)} />
            </label>
            {gallery.items.map((g) => (
              <div key={g.id} className="group relative aspect-square rounded-xl overflow-hidden border border-[#F1F5F9]">
                <img src={g.filename} alt={g.name} className="w-full h-full object-cover" />
                <button onClick={() => gallery.remove(g.id)} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          {gallery.items.length === 0 && <p className="text-center text-xs text-[#94A3B8] mt-4">Upload images to show a gallery on your card.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-3">
              <input value={vt} onChange={(e) => setVt(e.target.value)} className={fieldCls} placeholder="Video title" />
              <input value={vu} onChange={(e) => setVu(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addVideo(); }} className={fieldCls} placeholder="Paste a YouTube, Shorts or Instagram link" />
              <button onClick={addVideo} className="h-11 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 shrink-0"><Plus size={15} /> Add</button>
            </div>
          </div>

          {/* How the Video Portfolio appears on the public card link */}
          {videos.items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
              {/* Rename the section heading shown on the public card */}
              <p className="text-sm font-semibold text-[#0F172A]">Section name</p>
              <p className="text-xs text-[#64748B] mt-0.5 mb-2">The heading shown above your videos on the public card.</p>
              <input value={secTitleVal} onChange={(e) => setSecTitle(e.target.value)}
                onBlur={() => { if (secTitle !== null) { update({ video: secTitle.trim() }); toast.success("Section name updated"); } }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className={`${fieldCls} max-w-lg`} placeholder="Video Portfolio" />

              <div className="h-px bg-[#F1F5F9] my-4" />

              <p className="text-sm font-semibold text-[#0F172A]">Video Portfolio layout</p>
              <p className="text-xs text-[#64748B] mt-0.5 mb-3">How your videos appear on your public card link — changes go live automatically.</p>
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                {[
                  { key: "stack", name: "Stacked", desc: "One below another (full width)" },
                  { key: "swipe", name: "Swipe (compact)", desc: "Swipe sideways, one at a time" },
                ].map((opt) => {
                  const selected = videoLayout === opt.key;
                  return (
                    <button key={opt.key} type="button" onClick={() => update({ video_layout: opt.key })}
                      className={`text-left rounded-xl border-2 p-3 transition-all ${selected ? "border-[#F7B31C] bg-[#FEF3C7]/40 shadow-gold" : "border-[#E2E8F0] bg-white hover:border-[#F7B31C]/50"}`}>
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#0F172A]">{opt.name}</span>
                        {selected && <Check size={15} className="text-[#F7B31C]" />}
                      </span>
                      <span className="flex gap-1.5 mt-2.5 mb-2">
                        {opt.key === "stack" ? (
                          <span className="flex flex-col gap-1 w-full">
                            <span className="h-3 rounded bg-[#CBD5E1] w-full" />
                            <span className="h-3 rounded bg-[#CBD5E1] w-full" />
                          </span>
                        ) : (
                          <span className="flex gap-1 w-full items-center">
                            <span className="h-6 rounded bg-[#CBD5E1] w-4/5" />
                            <span className="h-6 rounded bg-[#E2E8F0] w-1/5" />
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-[#64748B] leading-snug">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.items.map((v) => {
              const info = parseVideo(v.url);
              const isIg = info?.provider === "instagram";
              const vertical = !!info?.vertical;
              const canEmbed = !!info?.embedUrl;
              const isPlaying = playing === v.id && canEmbed;
              return (
              <div key={v.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
                {/* Short/reel thumbnails are portrait; regular videos stay 16:9 */}
                <div className={`relative bg-black mx-auto ${vertical ? "aspect-[9/16] max-w-[220px]" : "aspect-video w-full"}`}>
                  {isPlaying ? (
                    /* Play inline right here in the dashboard (YouTube / Instagram embed) */
                    <iframe src={info!.embedUrl} title={v.title} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
                  ) : (<>
                    {info?.thumb ? (
                      <img src={info.thumb} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      /* Instagram / other links have no fetchable frame — show a branded tile */
                      <div className={`w-full h-full flex flex-col items-center justify-center gap-1 ${isIg ? "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]" : "bg-gradient-to-br from-[#334155] to-[#0F172A]"}`}>
                        {isIg && <Instagram size={26} className="text-white/90" />}
                        <span className="text-[11px] font-semibold text-white/90">{isIg ? "Instagram video" : "Video link"}</span>
                      </div>
                    )}
                    {canEmbed ? (
                      <button type="button" onClick={() => setPlaying(v.id)} aria-label={`Play ${v.title}`} className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-colors"><span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"><Play size={18} className="text-[#0F172A] ml-0.5" /></span></button>
                    ) : (
                      <a href={v.url} target="_blank" rel="noreferrer" aria-label={`Open ${v.title}`} className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-colors"><span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"><Play size={18} className="text-[#0F172A] ml-0.5" /></span></a>
                    )}
                  </>)}
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{v.title}</p>
                  <button onClick={() => videos.remove(v.id)} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center shrink-0"><Trash2 size={14} /></button>
                </div>
              </div>
              );
            })}
          </div>
          {videos.items.length === 0 && <p className="text-center text-xs text-[#94A3B8]">Add YouTube, Shorts or Instagram videos to feature them on your card.</p>}
        </div>
      )}
    </ModuleShell>
  );
}
