import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useEffect, useState } from "react";
import {
  Phone, Mail, MapPin, Globe, Share2, Download, MessageCircle,
  X, Send, Check, FileText, Briefcase, ChevronRight, MessageSquare,
  Linkedin, Facebook, Instagram, Twitter, Youtube,
  Clock, Star, Hourglass, Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function PublicCard() {
  const { slug } = useParams();
  const { data: card } = trpc.card.getBySlug.useQuery({ slug: slug || "" });
  const trackView = trpc.card.trackView.useMutation();
  const createLead = trpc.lead.create.useMutation();

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  useEffect(() => {
    if (slug) {
      const visitorId = localStorage.getItem("visitor_id") || `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("visitor_id", visitorId);
      trackView.mutate({ slug, visitorId });
    }
  }, [slug]);

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    createLead.mutate({
      cardId: card.id,
      fullName: leadName,
      email: leadEmail || undefined,
      phone: leadPhone || undefined,
      source: "card",
    }, {
      onSuccess: () => {
        setLeadSubmitted(true);
        setTimeout(() => { setShowLeadModal(false); setLeadSubmitted(false); setLeadName(""); setLeadEmail(""); setLeadPhone(""); }, 2500);
      },
    });
  };

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-[#94A3B8]" />
          </div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Card Not Found</h1>
          <p className="text-sm text-[#94A3B8] mt-1">This digital card doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const profileBlock = card.blocks?.find((b: { type: string }) => b.type === "profile_header");
  const contactBlock = card.blocks?.find((b: { type: string }) => b.type === "contact_info");
  const aboutBlock = card.blocks?.find((b: { type: string }) => b.type === "about_us");
  const servicesBlock = card.blocks?.find((b: { type: string }) => b.type === "services");
  const socialBlock = card.blocks?.find((b: { type: string }) => b.type === "social_links");
  const whatsappBlock = card.blocks?.find((b: { type: string }) => b.type === "whatsapp_button");
  const enquiryBlock = card.blocks?.find((b: { type: string }) => b.type === "enquiry_form");
  const hoursBlock = card.blocks?.find((b: { type: string }) => b.type === "business_hours");
  const paymentBlock = card.blocks?.find((b: { type: string }) => b.type === "payment_qr");
  const testimonialsBlock = card.blocks?.find((b: { type: string }) => b.type === "testimonials");
  const galleryBlock = card.blocks?.find((b: { type: string }) => b.type === "gallery");

  const profile = profileBlock?.content as Record<string, string> || {};
  const contact = contactBlock?.content as Record<string, string> || {};

  // Owner's trial/plan expired → paused public card (with a signup CTA).
  if (card.ownerPaused) {
    const owner = profile.company || profile.name || card.title || "This business";
    const signup = `/signup${card.ownerReferralCode ? `?ref=${encodeURIComponent(card.ownerReferralCode)}` : ""}`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6">
        <div className="w-full max-w-sm bg-white rounded-[24px] p-8 text-center shadow-premium-lg">
          <div className="w-[74px] h-[74px] rounded-2xl bg-[#FEF3C7] text-[#F7B31C] flex items-center justify-center mx-auto mb-5"><Hourglass size={30} /></div>
          <h1 className="text-lg font-extrabold text-[#0F172A] leading-snug">This card is currently unavailable</h1>
          <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed"><span className="font-semibold text-[#0F172A]">{owner}</span>&apos;s digital card is temporarily paused. Please check back soon.</p>
          <Link to={signup} className="mt-6 h-12 rounded-2xl gradient-gold text-[#0F172A] font-bold text-sm flex items-center justify-center gap-2 hover:shadow-gold transition-all"><Zap size={17} /> Create your own free card</Link>
          <p className="text-[11px] text-[#94A3B8] mt-2.5">Set up your own digital card in minutes — 30 days free.</p>
          <p className="text-[11px] text-[#94A3B8] mt-5">Powered by <span className="text-[#F7B31C] font-semibold">DigitalCarda</span></p>
        </div>
      </div>
    );
  }
  const about = aboutBlock?.content as Record<string, string> || {};
  const services = servicesBlock?.content as { items?: Array<{name: string; description?: string}> } || {};
  const whatsapp = whatsappBlock?.content as Record<string, string> || {};
  const enquiry = enquiryBlock?.content as Record<string, string> || {};
  const socialLinks = socialBlock?.content as { links?: Array<{platform: string; url: string}> } || {};
  const hours = hoursBlock?.content as { hours?: Array<{day: string; open: string; close: string}> } || {};
  const testimonials = testimonialsBlock?.content as { items?: Array<{name: string; text: string; rating?: number}> } || {};
  const gallery = galleryBlock?.content as { images?: Array<{url: string}> } || {};

  const socialIconMap: Record<string, React.ComponentType<{size?: number; className?: string}>> = {
    facebook: Facebook, instagram: Instagram, linkedin: Linkedin, twitter: Twitter,
    youtube: Youtube, whatsapp: MessageCircle, website: Globe, email: Mail,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen shadow-premium-lg">
        {/* Cover */}
        <div className="h-52 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-8 left-8 w-32 h-32 rounded-full bg-[#F7B31C] blur-2xl" />
            <div className="absolute bottom-4 right-8 w-24 h-24 rounded-full bg-[#14B8A6] blur-xl" />
          </div>
          <div className="absolute top-4 right-4">
            <button onClick={() => setShowLeadModal(true)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
              <Share2 size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Profile */}
        <div className="px-6 -mt-16 relative z-10">
          <div className="w-28 h-28 rounded-full bg-white p-1.5 shadow-premium-lg mx-auto">
            <div className="w-full h-full rounded-full gradient-gold flex items-center justify-center">
              <span className="text-[#0F172A] text-3xl font-bold">{(profile.name || "N").charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div className="text-center mt-4">
            <h1 className="text-2xl font-bold text-[#0F172A]">{profile.name || "Your Name"}</h1>
            <p className="text-sm text-[#64748B] mt-1">{profile.title || "Job Title"}</p>
            {profile.company && <p className="text-xs text-[#94A3B8] mt-0.5">{profile.company}</p>}
            {profile.bio && <p className="text-xs text-[#64748B] mt-2 leading-relaxed max-w-sm mx-auto">{profile.bio}</p>}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 mt-6">
          <div className="flex justify-center gap-3">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="w-13 h-13 rounded-full gradient-gold flex items-center justify-center shadow-gold hover:scale-105 transition-transform">
                <Phone size={18} className="text-[#0F172A]" />
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="w-13 h-13 rounded-full bg-[#0F172A] flex items-center justify-center shadow-premium hover:scale-105 transition-transform">
                <Mail size={18} className="text-white" />
              </a>
            )}
            {whatsapp.phone && (
              <a href={`https://wa.me/${whatsapp.phone}?text=${encodeURIComponent(whatsapp.message || "Hi!")}`} target="_blank" className="w-13 h-13 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                <MessageCircle size={18} className="text-white" />
              </a>
            )}
            <button onClick={() => setShowLeadModal(true)} className="w-13 h-13 rounded-full bg-[#F1F5F9] flex items-center justify-center shadow-premium hover:bg-[#E2E8F0] hover:scale-105 transition-all">
              <Download size={18} className="text-[#0F172A]" />
            </button>
          </div>

          <button
            onClick={() => setShowLeadModal(true)}
            className="w-full h-13 mt-5 gradient-gold text-[#0F172A] rounded-2xl font-semibold text-sm transition-all hover:shadow-gold active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Download size={16} /> Save Contact
          </button>
        </div>

        {/* About */}
        {about.text && (
          <div className="px-6 mt-8">
            <div className="bg-[#F8FAFC] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-0.5 bg-[#F7B31C] rounded-full" />
                <h2 className="text-sm font-semibold text-[#0F172A]">About</h2>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">{about.text}</p>
            </div>
          </div>
        )}

        {/* Contact Info */}
        {(contact.phone || contact.email || contact.address || contact.website) && (
          <div className="px-6 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-[#F7B31C] rounded-full" />
              <h2 className="text-sm font-semibold text-[#0F172A]">Contact</h2>
            </div>
            <div className="bg-[#F8FAFC] rounded-2xl divide-y divide-[#E2E8F0]">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-4 p-4 hover:bg-[#F1F5F9] transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Phone size={16} className="text-[#F7B31C]" /></div>
                  <div className="flex-1 min-w-0"><p className="text-xs text-[#94A3B8]">Phone</p><p className="text-sm font-medium text-[#0F172A]">{contact.phone}</p></div>
                  <ChevronRight size={16} className="text-[#CBD5E1] group-hover:text-[#F7B31C] transition-colors" />
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-4 p-4 hover:bg-[#F1F5F9] transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center shrink-0"><Mail size={16} className="text-[#3B82F6]" /></div>
                  <div className="flex-1 min-w-0"><p className="text-xs text-[#94A3B8]">Email</p><p className="text-sm font-medium text-[#0F172A] truncate">{contact.email}</p></div>
                  <ChevronRight size={16} className="text-[#CBD5E1] group-hover:text-[#F7B31C] transition-colors" />
                </a>
              )}
              {contact.address && (
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center shrink-0"><MapPin size={16} className="text-[#14B8A6]" /></div>
                  <div><p className="text-xs text-[#94A3B8]">Address</p><p className="text-sm font-medium text-[#0F172A]">{contact.address}</p></div>
                </div>
              )}
              {contact.website && (
                <a href={contact.website} target="_blank" className="flex items-center gap-4 p-4 hover:bg-[#F1F5F9] transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-[#FCE7F3] flex items-center justify-center shrink-0"><Globe size={16} className="text-[#EC4899]" /></div>
                  <div className="flex-1 min-w-0"><p className="text-xs text-[#94A3B8]">Website</p><p className="text-sm font-medium text-[#0F172A] truncate">{contact.website}</p></div>
                  <ChevronRight size={16} className="text-[#CBD5E1] group-hover:text-[#F7B31C] transition-colors" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Business Hours */}
        {hours.hours && hours.hours.length > 0 && (
          <div className="px-6 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-[#F7B31C] rounded-full" />
              <h2 className="text-sm font-semibold text-[#0F172A]">Business Hours</h2>
            </div>
            <div className="bg-[#F8FAFC] rounded-2xl divide-y divide-[#E2E8F0]">
              {hours.hours.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 px-4">
                  <span className="text-sm text-[#0F172A] font-medium">{h.day}</span>
                  <span className="text-sm text-[#64748B]">{h.open} - {h.close}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {services.items && services.items.length > 0 && (
          <div className="px-6 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-[#F7B31C] rounded-full" />
              <h2 className="text-sm font-semibold text-[#0F172A]">Services</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {services.items.map((service, i) => (
                <div key={i} className="bg-[#F8FAFC] rounded-xl p-4 text-center card-hover">
                  <Briefcase size={18} className="text-[#F7B31C] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#0F172A]">{service.name}</p>
                  {service.description && <p className="text-[10px] text-[#94A3B8] mt-1">{service.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.images && gallery.images.length > 0 && (
          <div className="px-6 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-[#F7B31C] rounded-full" />
              <h2 className="text-sm font-semibold text-[#0F172A]">Gallery</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {gallery.images.slice(0, 6).map((img, i) => (
                <div key={i} className="aspect-square rounded-xl bg-[#F1F5F9] overflow-hidden">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials */}
        {testimonials.items && testimonials.items.length > 0 && (
          <div className="px-6 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-[#F7B31C] rounded-full" />
              <h2 className="text-sm font-semibold text-[#0F172A]">Testimonials</h2>
            </div>
            <div className="space-y-3">
              {testimonials.items.map((t, i) => (
                <div key={i} className="bg-[#F8FAFC] rounded-2xl p-4">
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <Star key={j} size={12} className="text-[#F7B31C] fill-[#F7B31C]" />
                    ))}
                  </div>
                  <p className="text-sm text-[#64748B] leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <p className="text-xs font-medium text-[#0F172A] mt-2">— {t.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enquiry Form */}
        {enquiryBlock && (
          <div className="px-6 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-[#F7B31C] rounded-full" />
              <h2 className="text-sm font-semibold text-[#0F172A]">{enquiry.title || "Get in Touch"}</h2>
            </div>
            <div className="bg-[#F8FAFC] rounded-2xl p-5 space-y-3">
              <input type="text" placeholder="Your Name" value={leadName} onChange={(e) => setLeadName(e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 text-sm outline-none border border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
              <input type="email" placeholder="Email Address" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 text-sm outline-none border border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
              <input type="tel" placeholder="Phone Number" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 text-sm outline-none border border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
              <textarea placeholder="Your Message" rows={3} value={leadMessage} onChange={(e) => setLeadMessage(e.target.value)} className="w-full bg-white rounded-xl p-4 text-sm outline-none border border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 resize-none transition-all placeholder:text-[#94A3B8]" />
              <button onClick={handleLeadSubmit} className="w-full h-12 gradient-gold text-[#0F172A] rounded-xl font-semibold text-sm transition-all hover:shadow-gold active:scale-[0.98] flex items-center justify-center gap-2">
                <Send size={16} /> Send Message
              </button>
            </div>
          </div>
        )}

        {/* Social Links */}
        {socialLinks.links && socialLinks.links.length > 0 && (
          <div className="px-6 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-[#F7B31C] rounded-full" />
              <h2 className="text-sm font-semibold text-[#0F172A]">Connect</h2>
            </div>
            <div className="flex justify-center gap-3">
              {socialLinks.links.map((link, i) => {
                const platform = link.platform.toLowerCase();
                const Icon = socialIconMap[platform] || Globe;
                return (
                  <a key={i} href={link.url} target="_blank" className="w-12 h-12 rounded-full bg-[#0F172A] flex items-center justify-center hover:bg-[#F7B31C] transition-colors group">
                    <Icon size={18} className="text-white group-hover:text-[#0F172A]" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Create your own card — carries the owner's referral code */}
        <div className="px-6 pt-8 mt-8 border-t border-[#F1F5F9]">
          <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-5 text-center relative overflow-hidden">
            <div className="absolute -right-8 -top-10 w-32 h-32 rounded-full bg-[#F7B31C]/20 blur-2xl pointer-events-none" />
            <p className="relative text-sm font-bold text-white">Want a card like this?</p>
            <p className="relative text-[11px] text-white/60 mt-1">Create your own free digital card in minutes.</p>
            <a
              href={`/signup${card.ownerReferralCode ? `?ref=${encodeURIComponent(card.ownerReferralCode)}` : ""}`}
              className="relative inline-flex items-center justify-center gap-1.5 mt-3 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"
            >
              Create Your Free Card
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-8 text-center">
          <p className="text-xs text-[#94A3B8]">Powered by <span className="text-[#F7B31C] font-semibold">DigitalCarda</span></p>
        </div>
      </div>

      {/* Floating WhatsApp */}
      {whatsapp.phone && (
        <a
          href={`https://wa.me/${whatsapp.phone}?text=${encodeURIComponent(whatsapp.message || "Hi!")}`}
          target="_blank"
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50"
        >
          <MessageCircle size={24} className="text-white" />
        </a>
      )}

      {/* Lead Capture Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeadModal(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 p-6">
            <button onClick={() => setShowLeadModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
            {!leadSubmitted ? (
              <>
                <h2 className="text-xl font-semibold text-[#0F172A] text-center mb-1">Save Contact</h2>
                <p className="text-sm text-[#94A3B8] text-center mb-5">Enter your details to save this contact</p>
                <form onSubmit={handleLeadSubmit} className="space-y-3">
                  <input type="text" placeholder="Full Name" value={leadName} onChange={(e) => setLeadName(e.target.value)} required className="w-full h-12 bg-[#F8FAFC] rounded-xl px-4 text-sm outline-none border border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
                  <input type="email" placeholder="Email Address" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} className="w-full h-12 bg-[#F8FAFC] rounded-xl px-4 text-sm outline-none border border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
                  <input type="tel" placeholder="Phone Number" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} className="w-full h-12 bg-[#F8FAFC] rounded-xl px-4 text-sm outline-none border border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
                  <button type="submit" className="w-full h-12 gradient-gold text-[#0F172A] rounded-xl font-semibold text-sm transition-all hover:shadow-gold active:scale-[0.98] mt-2">
                    Save Contact
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-[#0F172A]">Thank You!</h2>
                <p className="text-sm text-[#94A3B8] mt-1">Your information has been saved.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
