import { useState } from "react";
import { Info, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, areaCls } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

export default function CustomerAbout() {
  const { data, update } = useCustomer();
  const [aboutTitle, setAboutTitle] = useState<string | null>(null);
  const [about, setAbout] = useState<string | null>(null);
  const [specTitle, setSpecTitle] = useState<string | null>(null);
  const [specs, setSpecs] = useState<string[]>(() => String(data.specialities ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const [newSpec, setNewSpec] = useState("");

  const aboutTitleV = aboutTitle ?? String(data.about ?? "About Us");
  const aboutV = about ?? String(data.about_us ?? "");
  const specTitleV = specTitle ?? String(data.specialties_title ?? "Our Specialties");

  const addSpec = () => { const v = newSpec.trim(); if (!v) return; setSpecs((s) => [...s, v]); setNewSpec(""); };
  const removeSpec = (i: number) => setSpecs((s) => s.filter((_, idx) => idx !== i));

  const save = () => {
    update({ about: aboutTitleV, about_us: aboutV, specialties_title: specTitleV, specialities: specs.join(",") });
    toast.success("About section saved");
  };

  return (
    <ModuleShell title="About Us" subtitle="Tell customers about your business" icon={Info}
      actions={<button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button>}>
      <Panel title="About Us" subtitle="Section title and description">
        <div className="space-y-4">
          <Field label="Section Title"><input value={aboutTitleV} onChange={(e) => setAboutTitle(e.target.value)} className={fieldCls} placeholder="About Us" /></Field>
          <Field label="Description"><textarea value={aboutV} onChange={(e) => setAbout(e.target.value)} className={areaCls} placeholder="Describe your business, mission and what makes you unique…" /></Field>
        </div>
      </Panel>

      <Panel title="Specialities" subtitle="Highlight what you do best">
        <Field label="Section Title"><input value={specTitleV} onChange={(e) => setSpecTitle(e.target.value)} className={fieldCls} placeholder="Our Specialties" /></Field>
        <div className="flex flex-wrap gap-2 mt-4 mb-3">
          {specs.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-xs font-medium">
              {s}
              <button onClick={() => removeSpec(i)} className="w-5 h-5 rounded-full hover:bg-[#F7B31C]/20 flex items-center justify-center"><X size={12} /></button>
            </span>
          ))}
          {specs.length === 0 && <span className="text-xs text-[#94A3B8]">No specialities yet.</span>}
        </div>
        <div className="flex gap-2">
          <input value={newSpec} onChange={(e) => setNewSpec(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpec(); } }} className={fieldCls} placeholder="Add a speciality and press Enter" />
          <button onClick={addSpec} className="h-11 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0"><Plus size={15} /> Add</button>
        </div>
      </Panel>

      <div className="flex justify-end">
        <button onClick={save} className="flex items-center gap-2 h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save Changes</button>
      </div>
    </ModuleShell>
  );
}
