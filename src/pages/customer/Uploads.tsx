import { Upload, Trash2, FileText, Download, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { LimitBar, Tip, SectionToggle } from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList, fileToDataUrl, packageLimit } from "@/hooks/useCustomer";
import { contentSeeder } from "@/lib/cardContent";

type Up = { id: number; name: string; filename: string; kind: string };

export default function CustomerUploads() {
  const { data } = useCustomer();
  const limit = packageLimit(Number(data.package_id), "uploads");
  const { items, add, remove } = useLocalList<Up>("dc_uploads", [], contentSeeder("uploads"));

  const onPick = async (files: FileList | null) => {
    if (!files) return;
    let slots = limit - items.length;
    if (slots <= 0) { toast.error("Upload limit reached — upgrade your package."); return; }
    for (const f of Array.from(files)) {
      if (slots <= 0) { toast.error(`Only ${limit} uploads allowed on your package.`); break; }
      const url = await fileToDataUrl(f);
      add({ name: f.name, filename: url, kind: f.type.startsWith("image/") ? "image" : "file" });
      slots--;
    }
    toast.success("File(s) uploaded");
  };

  return (
    <ModuleShell title="Uploads" subtitle="Attach brochures, catalogues, PDFs & images" icon={Upload}>
      <SectionToggle flag="uploads_on" label="Uploads section" def={0} />
      <LimitBar used={items.length} limit={limit} unit="uploads" />
      <Tip>Upload your brochure, catalogue or price list as a PDF — customers can view and download it in one tap, even offline.</Tip>
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
        <label className="block rounded-2xl border-2 border-dashed border-[#E2E8F0] hover:border-[#F7B31C] bg-[#F8FAFC] py-10 text-center cursor-pointer transition-colors">
          <UploadCloud size={30} className="mx-auto text-[#94A3B8] mb-2" />
          <p className="text-sm font-medium text-[#0F172A]">Click to upload files</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">PDF, images, documents — up to a few MB each</p>
          <input type="file" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />
        </label>

        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
            {items.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                <div className="w-11 h-11 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0 overflow-hidden">
                  {u.kind === "image" ? <img src={u.filename} alt={u.name} className="w-full h-full object-cover" /> : <FileText size={20} className="text-[#F7B31C]" />}
                </div>
                <p className="text-sm font-medium text-[#0F172A] truncate flex-1">{u.name}</p>
                <a href={u.filename} download={u.name} className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-white hover:text-[#F7B31C] flex items-center justify-center"><Download size={14} /></a>
                <button onClick={() => { remove(u.id); toast.success("Removed"); }} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
