import { Phone, Mail, MapPin, Clock, Send, MessageSquare, HelpCircle, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", businessName: "", requirement: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error("Please fill in Name and Email"); return; }
    setSubmitted(true);
    toast.success("Enquiry submitted! We will get back to you soon.");
  };

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Contact</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Contact DigitalCarda</h1>
          <p className="mt-4 text-base text-[#64748B]">
            Have questions about digital cards, reseller plans, custom domains, or enterprise setup? Contact our team.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <Phone size={18} className="text-[#F7B31C]" />
                </div>
                <div>
                  <p className="text-xs text-[#94A3B8]">Phone</p>
                  <a href="tel:+919517722444" className="text-sm font-semibold text-[#0F172A] hover:text-[#F7B31C] transition-colors">+91 95177 22444</a>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] flex items-center justify-center">
                  <Mail size={18} className="text-[#14B8A6]" />
                </div>
                <div>
                  <p className="text-xs text-[#94A3B8]">Email</p>
                  <a href="mailto:support@digitalcarda.in" className="text-sm font-semibold text-[#0F172A] hover:text-[#14B8A6] transition-colors">support@digitalcarda.in</a>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center">
                  <Clock size={18} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs text-[#94A3B8]">Working Hours</p>
                  <p className="text-sm font-semibold text-[#0F172A]">Mon - Sat, 9 AM - 7 PM IST</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-2">Need Urgent Help?</h3>
              <p className="text-xs text-[#94A3B8] mb-4">Chat with our support team on WhatsApp for quick assistance.</p>
              <a href="https://wa.me/919517722444?text=Hi%20DigitalCarda%20Support" target="_blank" className="flex items-center gap-2 h-10 px-4 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all">
                <MessageSquare size={16} /> Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-premium border border-[#F1F5F9]">
                <h2 className="text-lg font-semibold text-[#0F172A] mb-1">Submit Enquiry</h2>
                <p className="text-xs text-[#94A3B8] mb-6">Fill in the details below and our team will get back to you within 24 hours.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Full Name *</label>
                    <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email *</label>
                    <input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" type="email" className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Phone Number</label>
                    <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Business Name</label>
                    <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="Your business" className="input-premium w-full" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Requirement</label>
                    <select value={form.requirement} onChange={(e) => update("requirement", e.target.value)} className="input-premium w-full">
                      <option value="">Select a requirement</option>
                      <option value="digital_card">Digital Business Card</option>
                      <option value="reseller">Reseller Program</option>
                      <option value="custom_domain">Custom Domain</option>
                      <option value="enterprise">Enterprise Setup</option>
                      <option value="support">Technical Support</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Message</label>
                    <textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us more about your needs..." rows={4} className="input-premium w-full resize-none" />
                  </div>
                </div>
                <button type="submit" className="w-full mt-6 h-12 gradient-gold text-[#0F172A] rounded-2xl font-semibold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98]">
                  <Send size={16} /> Submit Enquiry
                </button>
              </form>
            ) : (
              <div className="bg-white rounded-3xl p-12 shadow-premium border border-[#F1F5F9] text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#D1FAE5] flex items-center justify-center mx-auto mb-4">
                  <Send size={28} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-[#0F172A] mb-2">Enquiry Submitted!</h2>
                <p className="text-sm text-[#64748B] mb-6">Thank you for reaching out. Our team will contact you within 24 hours.</p>
                <button onClick={() => setSubmitted(false)} className="btn-gold inline-flex items-center gap-2">
                  Submit Another Enquiry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
