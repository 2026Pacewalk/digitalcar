import { useState } from "react";
import { Image as ImageIcon, Video, Trash2, Plus, Play, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { fieldCls, LimitBar } from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList, fileToDataUrl, packageLimit } from "@/hooks/useCustomer";

type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };

const ytId = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? m[1] : "";
};

export default function CustomerMedia() {
  const { data } = useCustomer();
  const gLimit = packageLimit(Number(data.package_id), "gallery");
  const vLimit = packageLimit(Number(data.package_id), "video");
  const [tab, setTab] = useState<"gallery" | "video">("gallery");
  const gallery = useLocalList<Gallery>("dc_gallery");
  const videos = useLocalList<Vid>("dc_videos");
  const [vt, setVt] = useState(""); const [vu, setVu] = useState("");
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
    if (!vu.trim() || !ytId(vu)) { toast.error("Enter a valid YouTube URL"); return; }
    videos.add({ title: vt.trim() || "Video", url: vu.trim() }); setVt(""); setVu(""); toast.success("Video added");
  };

  const tabs = [
    { id: "gallery" as const, label: "Gallery", icon: ImageIcon, count: gallery.items.length },
    { id: "video" as const, label: "Videos", icon: Video, count: videos.items.length },
  ];

  return (
    <ModuleShell title="Media" subtitle="Gallery images and YouTube videos" icon={ImageIcon}
      actions={
        <div className="relative flex rounded-xl bg-[#F1F5F9] p-1">
          <span className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300" style={{ width: "calc((100% - 0.5rem) / 2)", left: `calc(0.25rem + ${tab === "video" ? 1 : 0} * ((100% - 0.5rem) / 2))` }} />
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? "text-[#0F172A]" : "text-[#64748B]"}`}>
              <t.icon size={14} /> {t.label} <span className="text-[10px] px-1.5 rounded-full bg-[#E2E8F0]">{t.count}</span>
            </button>
          ))}
        </div>
      }>
      <LimitBar used={tab === "gallery" ? gallery.items.length : videos.items.length} limit={tab === "gallery" ? gLimit : vLimit} unit={tab === "gallery" ? "gallery images" : "videos"} />
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
              <input value={vu} onChange={(e) => setVu(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addVideo(); }} className={fieldCls} placeholder="YouTube URL (https://youtu.be/…)" />
              <button onClick={addVideo} className="h-11 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 shrink-0"><Plus size={15} /> Add</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.items.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <img src={`https://img.youtube.com/vi/${ytId(v.url)}/hqdefault.jpg`} alt={v.title} className="w-full h-full object-cover" />
                  <a href={v.url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"><span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"><Play size={18} className="text-[#0F172A] ml-0.5" /></span></a>
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{v.title}</p>
                  <button onClick={() => videos.remove(v.id)} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center shrink-0"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {videos.items.length === 0 && <p className="text-center text-xs text-[#94A3B8]">Add YouTube videos to embed them on your card.</p>}
        </div>
      )}
    </ModuleShell>
  );
}
