import { useState } from "react";
import { Info, Plus, X } from "lucide-react";
import ModuleShell, { Panel, Field, fieldCls, areaCls, ImagePick, AutoSaveBadge, SectionToggle } from "@/components/customer/ModuleShell";
import { useCardAutosave } from "@/hooks/useCardAutosave";

export function AboutEditor() {
  // AUTO-SAVE through the shared form (no Save button): it holds a field only
  // until it is stored, lets go of everything when the card is replaced under
  // it (the latest version loaded from the server, another tab) and stores at
  // once when the page is being left. This editor used to keep its own copy of
  // every field and write them ALL back on any change — old text over a card
  // that had been loaded since, with no keystroke at all.
  const { val, set, status } = useCardAutosave();
  const [newSpec, setNewSpec] = useState("");
  // Photo + ID/membership fields used by the premium card designs.
  const photoV = val("photo");
  const fval = (k: string) => val(k);
  const fset = (k: string, v: string) => set(k, v);

  const aboutTitleV = val("about", "About Us");
  const aboutV = val("about_us");
  const specTitleV = val("specialties_title", "Our Specialties");

  // The specialities are one comma-separated field of the card.
  const specs = val("specialities").split(",").map((s) => s.trim()).filter(Boolean);
  const setSpecs = (next: string[]) => set("specialities", next.join(","));
  const addSpec = () => { const v = newSpec.trim(); if (!v) return; setSpecs([...specs, v]); setNewSpec(""); };
  const removeSpec = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-end gap-2"><AutoSaveBadge status={status} /></div>
      <SectionToggle flag="about_on" label="About Us section" />
      <Panel title="About Us" subtitle="Section title and description">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Section Title"><input value={aboutTitleV} onChange={(e) => set("about", e.target.value)} className={fieldCls} placeholder="About Us" /></Field>
            <Field label="Business nature" hint="Shown under your name on the card — e.g. “Digital Marketing Agency”">
              <div className="relative"><Info size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={fval("nature")} onChange={(e) => fset("nature", e.target.value)} className={`${fieldCls} pl-9`} placeholder="e.g. Real Estate Advisory" /></div>
            </Field>
          </div>
          <Field label="Description"><textarea value={aboutV} onChange={(e) => set("about_us", e.target.value)} className={areaCls} placeholder="Describe your business, mission and what makes you unique…" /></Field>
        </div>
      </Panel>

      <Panel title="Specialities" subtitle="Highlight what you do best">
        <Field label="Section Title"><input value={specTitleV} onChange={(e) => set("specialties_title", e.target.value)} className={fieldCls} placeholder="Our Specialties" /></Field>
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
          <ImagePick value={photoV} onChange={(u) => set("photo", u)} className="w-24 h-24" label="Photo" removable what="photo" />
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

    </div>
  );
}

/* Page wrapper — the same editor, framed by the dashboard shell. */
export default function CustomerAbout() {
  return (
    <ModuleShell title="About Us" subtitle="Tell customers about your business" icon={Info}
      >
      <AboutEditor />
    </ModuleShell>
  );
}
