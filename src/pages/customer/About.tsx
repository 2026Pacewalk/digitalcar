import { useState, useEffect } from "react";
import { Info, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, areaCls, ImagePick } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

export default function CustomerAbout() {
  const { data, update } = useCustomer();
  const [aboutTitle, setAboutTitle] = useState<string | null>(null);
  const [about, setAbout] = useState<string | null>(null);
  const [specTitle, setSpecTitle] = useState<string | null>(null);
  const [specs, setSpecs] = useState<string[]>([]);
  const [newSpec, setNewSpec] = useState("");
  // Photo + ID/membership fields used by the premium card designs.
  const [photo, setPhoto] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const photoV = photo ?? String(data.photo ?? "");
  const fval = (k: string) => (fields[k] !== undefined ? fields[k] : String(data[k] ?? ""));
  const fset = (k: string, v: string) => setFields((f) => ({ ...f, [k]: v }));

  // Sync specialities once the customer data has loaded from storage
  useEffect(() => {
    setSpecs(String(data.specialities ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  }, [data.specialities]);

  const aboutTitleV = aboutTitle ?? String(data.about ?? "About Us");
  const aboutV = about ?? String(data.about_us ?? "");
  const specTitleV = specTitle ?? String(data.specialties_title ?? "Our Specialties");

  const addSpec = () => { const v = newSpec.trim(); if (!v) return; setSpecs((s) => [...s, v]); setNewSpec(""); };
  const removeSpec = (i: number) => setSpecs((s) => s.filter((_, idx) => idx !== i));

  const save = () => {
    update({
      about: aboutTitleV, about_us: aboutV, specialties_title: specTitleV, specialities: specs.join(","),
      photo: photoV,
      employee_id: fval("employee_id"), blood_group: fval("blood_group"), joining_date: fval("joining_date"),
      membership_id: fval("membership_id"), membership_type: fval("membership_type"),
      member_since: fval("member_since"), valid_till: fval("valid_till"),
    });
    toast.success("Saved");
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

      <Panel title="Photo & Card Details" subtitle="For the premium Business / ID / Membership card designs">
        <div className="flex items-start gap-4">
          <ImagePick value={photoV} onChange={(u) => setPhoto(u)} className="w-24 h-24" label="Photo" />
          <div className="flex-1 text-[12px] text-[#64748B] pt-1 min-w-0">
            <p className="font-semibold text-[#334155] mb-1">Profile photo</p>
            <p>A clear headshot shown on the ID, Membership and Business-card designs. Your <b>company logo</b> is set separately on the <b>Edit Card</b> page — both appear together on the card.</p>
          </div>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mt-6 mb-2">ID card details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Employee ID"><input value={fval("employee_id")} onChange={(e) => fset("employee_id", e.target.value)} className={fieldCls} placeholder="DBT001" /></Field>
          <Field label="Blood Group"><input value={fval("blood_group")} onChange={(e) => fset("blood_group", e.target.value)} className={fieldCls} placeholder="O+" /></Field>
          <Field label="Joining Date"><input value={fval("joining_date")} onChange={(e) => fset("joining_date", e.target.value)} className={fieldCls} placeholder="01 Jan 2020" /></Field>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mt-5 mb-2">Membership card details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Membership ID"><input value={fval("membership_id")} onChange={(e) => fset("membership_id", e.target.value)} className={fieldCls} placeholder="MEM2025" /></Field>
          <Field label="Membership Type"><input value={fval("membership_type")} onChange={(e) => fset("membership_type", e.target.value)} className={fieldCls} placeholder="Premium" /></Field>
          <Field label="Member Since"><input value={fval("member_since")} onChange={(e) => fset("member_since", e.target.value)} className={fieldCls} placeholder="01 Jan 2025" /></Field>
          <Field label="Valid Till"><input value={fval("valid_till")} onChange={(e) => fset("valid_till", e.target.value)} className={fieldCls} placeholder="31 Dec 2025" /></Field>
        </div>
      </Panel>

      <div className="flex justify-end">
        <button onClick={save} className="flex items-center gap-2 h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save Changes</button>
      </div>
    </ModuleShell>
  );
}
