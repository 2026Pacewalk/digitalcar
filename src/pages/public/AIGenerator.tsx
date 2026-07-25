import { Sparkles, Wand2, Check, ArrowRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const industries = [
  "Digital Agency", "Doctor", "Real Estate", "Restaurant", "Freelancer",
  "Retail Store", "Consultant", "Salon", "Education", "Event Planner",
  "Coach", "Photographer", "Lawyer", "Startup",
];

const languages = ["English", "Hindi", "Spanish", "French", "Arabic", "Portuguese", "German", "Chinese"];
const styles = ["Modern", "Professional", "Creative", "Minimal", "Bold", "Elegant"];

export default function AIGenerator() {
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [form, setForm] = useState({
    businessName: "", industry: "", ownerName: "", phone: "",
    whatsapp: "", email: "", website: "", services: "",
    city: "", language: "English", style: "Modern",
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleGenerate = () => {
    if (!form.businessName || !form.industry || !form.ownerName) {
      toast.error("Please fill in Business Name, Industry, and Owner Name");
      return;
    }
    setStep("generating");
    setTimeout(() => setStep("result"), 3000);
  };

  const generated = step === "result" ? {
    headline: `${form.businessName} - ${form.industry} Excellence`,
    seoTitle: `${form.businessName} | ${form.industry} Services in ${form.city || "Your City"}`,
    seoDescription: `${form.businessName} offers professional ${form.industry.toLowerCase()} services. Contact ${form.ownerName} for expert solutions.`,
    about: `${form.businessName} is a leading ${form.industry.toLowerCase()} service provider based in ${form.city || "your city"}. Led by ${form.ownerName}, we specialize in delivering exceptional results tailored to each client's unique needs. Our team combines expertise with innovation to provide solutions that drive growth and success.`,
    cta: "Get in Touch Today",
    services: (form.services || "Consulting, Strategy, Implementation, Support").split(",").map((s) => s.trim()).filter(Boolean),
  } : null;

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">
            <Sparkles size={13} /> AI Powered
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">AI Digital Card Generator</h1>
          <p className="mt-4 text-base text-[#64748B] max-w-2xl mx-auto">
            Enter your business details and let DigitalCarda AI generate a professional card structure, content, CTA, SEO title, and design suggestion.
          </p>
        </div>

        {step === "form" && (
          <div className="bg-white rounded-3xl p-8 shadow-premium border border-[#F1F5F9]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Business Name *</label>
                <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="e.g. PixelCraft Agency" className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Industry *</label>
                <select value={form.industry} onChange={(e) => update("industry", e.target.value)} className="input-premium w-full">
                  <option value="">Select Industry</option>
                  {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Owner Name *</label>
                <input value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} placeholder="e.g. Raj Sharma" className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Phone Number</label>
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">WhatsApp Number</label>
                <input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+91 XXXXX XXXXX" className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email</label>
                <input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="hello@business.com" type="email" className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Website</label>
                <input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://yourbusiness.com" className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Services (comma separated)</label>
                <input value={form.services} onChange={(e) => update("services", e.target.value)} placeholder="Web Design, SEO, Branding" className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">City</label>
                <input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Mumbai" className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Preferred Language</label>
                <select value={form.language} onChange={(e) => update("language", e.target.value)} className="input-premium w-full">
                  {languages.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Design Style</label>
                <div className="flex flex-wrap gap-2">
                  {styles.map((s) => (
                    <button key={s} onClick={() => update("style", s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${form.style === s ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleGenerate} className="w-full mt-6 h-13 gradient-gold text-[#0F172A] rounded-2xl font-semibold text-base flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98]">
              <Wand2 size={20} /> Generate My Card
            </button>
          </div>
        )}

        {step === "generating" && (
          <div className="bg-white rounded-3xl p-16 shadow-premium border border-[#F1F5F9] text-center">
            <div className="w-20 h-20 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Sparkles size={32} className="text-[#0F172A]" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-2">Generating Your Card...</h2>
            <p className="text-sm text-[#94A3B8]">Our AI is crafting the perfect card structure, content, and design for {form.businessName}.</p>
            <div className="mt-6 max-w-xs mx-auto h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F7B31C] to-[#14B8A6] rounded-full animate-shimmer" style={{ width: "100%" }} />
            </div>
          </div>
        )}

        {step === "result" && generated && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-8 text-center">
              <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-[#0F172A]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Your Card is Ready!</h2>
              <p className="text-sm text-[#94A3B8]">Here&apos;s what our AI generated for {form.businessName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Headline</span>
                <p className="text-sm font-semibold text-[#0F172A] mt-1">{generated.headline}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">CTA</span>
                <p className="text-sm font-semibold text-[#0F172A] mt-1">{generated.cta}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] sm:col-span-2">
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">SEO Title</span>
                <p className="text-sm font-semibold text-[#0F172A] mt-1">{generated.seoTitle}</p>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mt-4 block">SEO Description</span>
                <p className="text-sm text-[#64748B] mt-1">{generated.seoDescription}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] sm:col-span-2">
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">About Section</span>
                <p className="text-sm text-[#64748B] mt-2 leading-relaxed">{generated.about}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] sm:col-span-2">
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Services</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {generated.services.map((s, i) => (
                    <span key={i} className="badge-gold">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/signup" className="flex-1 h-13 gradient-gold text-[#0F172A] rounded-2xl font-semibold flex items-center justify-center gap-2 hover:shadow-gold transition-all">
                <ArrowRight size={18} /> Create Your Card Now
              </Link>
              <button onClick={() => setStep("form")} className="h-13 px-6 border border-[#E2E8F0] text-[#64748B] rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-[#F8FAFC] transition-all">
                <RefreshCw size={18} /> Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
