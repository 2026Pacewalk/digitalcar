/*
 * /contact — rebuilt, and more importantly repaired.
 *
 * The old form never sent anything: handleSubmit flipped a local flag and
 * showed a success toast, so every enquiry the page collected was thrown
 * away. It now posts to contact.send, which emails the team with the sender
 * as reply-to, and only shows the success screen once that actually resolves.
 *
 * The requirement picker is a chip row rather than a <select> — one tap on
 * mobile, and it shows the visitor at a glance that we handle their case.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router";
import {
  Phone, Mail, Clock, Send, MessageSquare, Check, ArrowRight, ChevronRight,
  CreditCard, Users, Handshake, Globe, Building2, LifeBuoy, HelpCircle,
  Loader2, MapPin, Sparkles,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Reveal, SectionHeading } from "@/components/public/Reveal";

const WA_NUMBER = "919517722444";
const PHONE = "+91 95177 22444";
const EMAIL = "hello@digitalcarda.in";

const REQUIREMENTS = [
  { id: "digital_card", label: "Digital Card", icon: CreditCard, accent: "#F7B31C" },
  { id: "bulk", label: "Bulk / Team", icon: Users, accent: "#14B8A6" },
  { id: "reseller", label: "Reseller", icon: Handshake, accent: "#8B5CF6" },
  { id: "custom_domain", label: "Custom Domain", icon: Globe, accent: "#3B82F6" },
  { id: "enterprise", label: "Enterprise", icon: Building2, accent: "#EC4899" },
  { id: "support", label: "Support", icon: LifeBuoy, accent: "#F97316" },
  { id: "other", label: "Something else", icon: HelpCircle, accent: "#64748B" },
];

const NEXT_STEPS = [
  { icon: Mail, title: "It reaches a person", desc: "Your enquiry lands directly in our team inbox — no ticket queue, no bot." },
  { icon: Clock, title: "We reply within 24 hours", desc: "Usually much sooner on a working day. Replies come straight to your email." },
  { icon: MessageSquare, title: "We set up a call if useful", desc: "For bulk, reseller or enterprise questions we will offer a short call." },
];

const fieldCls =
  "w-full h-12 rounded-xl bg-[#F8FAFC] ring-1 ring-[#E2E8F0] px-4 text-[14px] text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#F7B31C] focus:bg-white";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", businessName: "", requirement: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const send = trpc.contact.send.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Enquiry sent — we will get back to you within 24 hours.");
    },
    onError: (err) => {
      // Zod validation errors arrive as a raw JSON blob; never show that.
      const m = err.message || "";
      toast.error(m && !m.trim().startsWith("[") ? m : "Could not send your enquiry. Please try WhatsApp or email.");
    },
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Please fill in your name and email.");
      return;
    }
    send.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      businessName: form.businessName.trim() || undefined,
      requirement: form.requirement || undefined,
      message: form.message.trim() || undefined,
    });
  };

  const reset = () => {
    setForm({ name: "", email: "", phone: "", businessName: "", requirement: "", message: "" });
    setSubmitted(false);
  };

  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-12 sm:pt-32">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-[#F7B31C]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
        <div className="absolute bottom-0 left-0 w-[380px] h-[380px] bg-[#14B8A6]/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <Reveal stagger>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#92400E] shadow-premium ring-1 ring-[#FEF3C7]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Usually replies within a few hours
            </span>
            <h1 className="mt-6 text-[2.4rem] sm:text-5xl font-extrabold text-[#0F172A] leading-[1.08] tracking-tight">
              Talk to a{" "}
              <span className="relative inline-block text-gradient-gold">
                Real Person
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto">
              Questions about cards, bulk orders, reseller plans, custom domains or an enterprise setup? Pick whichever way suits you — all three reach the same team.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Channels ── */}
      <section className="pb-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi DigitalCarda, I have a question.")}`}
              target="_blank" rel="noopener noreferrer"
              className="group relative rounded-2xl bg-gradient-to-br from-[#16A34A] to-[#15803D] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-premium-lg"
            >
              <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/15 blur-2xl" />
              <span className="relative w-11 h-11 rounded-xl bg-white/20 ring-1 ring-white/25 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
                <MessageSquare size={20} className="text-white" />
              </span>
              <p className="relative text-[11px] font-bold uppercase tracking-wider text-white/70">Fastest</p>
              <p className="relative text-[15px] font-bold text-white mt-0.5">Chat on WhatsApp</p>
              <p className="relative text-[12px] text-white/70 mt-1.5 inline-flex items-center gap-1">
                Start a chat <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </a>

            <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
              <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#F7B31C]/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative w-11 h-11 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
                <Phone size={19} />
              </span>
              <p className="relative text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Call us</p>
              <p className="relative text-[15px] font-bold text-[#0F172A] mt-0.5">{PHONE}</p>
              <p className="relative text-[12px] text-[#64748B] mt-1.5">Mon–Sat, 9 AM – 7 PM IST</p>
            </a>

            <a href={`mailto:${EMAIL}`} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-premium-lg hover:ring-[#14B8A6]/40">
              <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#14B8A6]/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative w-11 h-11 rounded-xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
                <Mail size={19} />
              </span>
              <p className="relative text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Email us</p>
              <p className="relative text-[15px] font-bold text-[#0F172A] mt-0.5 break-all">{EMAIL}</p>
              <p className="relative text-[12px] text-[#64748B] mt-1.5">Replies within 24 hours</p>
            </a>
          </Reveal>
        </div>
      </section>

      {/* ── Form + what happens next ── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-10 items-start">
            {/* Form */}
            <Reveal className="lg:col-span-3">
              {!submitted ? (
                <form onSubmit={handleSubmit} className="rounded-3xl bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg p-6 sm:p-8">
                  <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Send us an enquiry</h2>
                  <p className="text-[13px] text-[#64748B] mt-1.5">Tell us what you need and we will come back within 24 hours.</p>

                  {/* requirement chips */}
                  <div className="mt-6">
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-2.5">What is it about?</label>
                    <div className="flex flex-wrap gap-2">
                      {REQUIREMENTS.map((r) => {
                        const on = form.requirement === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => update("requirement", on ? "" : r.id)}
                            aria-pressed={on}
                            className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-[12.5px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${
                              on ? "text-white shadow-premium -translate-y-0.5" : "bg-[#F8FAFC] ring-1 ring-[#E2E8F0] text-[#475569] hover:ring-[#CBD5E1]"
                            }`}
                            style={on ? { background: r.accent } : undefined}
                          >
                            <r.icon size={14} className={on ? "text-white" : "text-[#94A3B8]"} />
                            {r.label}
                            {on && <Check size={13} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="c-name" className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1.5">Full name *</label>
                      <input id="c-name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" className={fieldCls} required />
                    </div>
                    <div>
                      <label htmlFor="c-email" className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1.5">Email *</label>
                      <input id="c-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" className={fieldCls} required />
                    </div>
                    <div>
                      <label htmlFor="c-phone" className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1.5">Phone</label>
                      <input id="c-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" className={fieldCls} />
                    </div>
                    <div>
                      <label htmlFor="c-biz" className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1.5">Business name</label>
                      <input id="c-biz" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="Your business" className={fieldCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="c-msg" className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1.5">Message</label>
                      <textarea
                        id="c-msg" rows={4}
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        placeholder="Tell us a bit about what you need…"
                        className={`${fieldCls} h-auto py-3 resize-none`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={send.isPending}
                    className="w-full mt-6 h-12 gradient-gold text-[#0F172A] rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {send.isPending
                      ? <><Loader2 size={17} className="animate-spin" /> Sending…</>
                      : <><Send size={16} /> Send enquiry</>}
                  </button>
                  <p className="mt-3 text-center text-[11.5px] text-[#94A3B8]">
                    We use your details only to reply. No newsletter, no sharing.
                  </p>
                </form>
              ) : (
                <div className="dc-swap-in rounded-3xl bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg p-10 sm:p-12 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                    <Check size={36} className="text-white" strokeWidth={3} />
                  </div>
                  <h2 className="mt-6 text-2xl font-extrabold text-[#0F172A] tracking-tight">Enquiry sent</h2>
                  <p className="mt-3 text-[14px] text-[#64748B] leading-relaxed max-w-sm mx-auto">
                    Thanks for reaching out. It has landed in our team inbox and we will reply to <span className="font-semibold text-[#0F172A]">{form.email}</span> within 24 hours.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi DigitalCarda, I just sent an enquiry from the website.")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="h-11 px-6 inline-flex items-center gap-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold transition-all active:scale-[0.98]"
                    >
                      <MessageSquare size={16} /> Need it sooner?
                    </a>
                    <button type="button" onClick={reset} className="h-11 px-6 inline-flex items-center gap-2 rounded-xl ring-1 ring-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
                      Send another <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </Reveal>

            {/* What happens next */}
            <Reveal className="lg:col-span-2">
              <div className="lg:sticky lg:top-24 space-y-4">
                <div className="rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-dark opacity-25" />
                  <div className="absolute -top-14 -right-14 w-48 h-48 bg-[#F7B31C]/20 rounded-full blur-3xl" />
                  <div className="relative">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F7B31C]/15 text-[#F7B31C] ring-1 ring-[#F7B31C]/25">
                      <Sparkles size={11} /> What happens next
                    </span>
                    <div className="mt-5 space-y-5">
                      {NEXT_STEPS.map((s, i) => (
                        <div key={s.title} className="flex items-start gap-3.5">
                          <span className="relative w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                            <s.icon size={16} className="text-[#F7B31C]" />
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#F7B31C] text-[#0F172A] text-[10px] font-extrabold flex items-center justify-center">{i + 1}</span>
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-bold text-white leading-tight">{s.title}</p>
                            <p className="text-[12px] text-[#94A3B8] mt-1 leading-relaxed">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center"><MapPin size={17} /></span>
                    <p className="text-[13.5px] font-bold text-[#0F172A]">Based in Zirakpur, Punjab</p>
                  </div>
                  <p className="text-[12.5px] text-[#64748B] leading-relaxed">
                    We work with businesses across India and support customers in five countries. Everything is handled online — there is nothing to collect in person.
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5">
                  <p className="text-[13.5px] font-bold text-[#0F172A]">Looking for an answer right now?</p>
                  <p className="text-[12.5px] text-[#64748B] leading-relaxed mt-1.5">
                    Most common questions are already answered on our pricing and features pages.
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <Link to="/pricing" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#F8FAFC] ring-1 ring-[#E2E8F0] text-[12.5px] font-semibold text-[#475569] hover:ring-[#F7B31C]/50 transition-all">
                      Pricing <ChevronRight size={13} />
                    </Link>
                    <Link to="/features" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#F8FAFC] ring-1 ring-[#E2E8F0] text-[12.5px] font-semibold text-[#475569] hover:ring-[#F7B31C]/50 transition-all">
                      Features <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Closing ── */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-3xl bg-gradient-to-b from-white to-[#F8FAFC] ring-1 ring-[#E8ECF3] p-8 sm:p-10 text-center">
              <SectionHeading
                eyebrow="Not ready to talk?"
                title={<>Try It Before You <span className="text-gradient-gold">Ask Us Anything</span></>}
                subtitle="The 30-day trial needs no card details, so you can answer most of your own questions in ten minutes."
              />
              <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center gap-2 text-base">
                Start free trial <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
