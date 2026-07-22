import {
  CreditCard, QrCode, MessageCircle, Download, FileDown, ShoppingBag,
  Image, Play, Wallet, MapPin, Star, Link2, Globe, BarChart3, Sparkles,
  Phone, Mail, Shield, Layers, Users, MousePointer, Eye, TrendingUp,
  Share2, Smartphone, Monitor, MessageSquare, Zap, Check,
} from "lucide-react";
import { Link } from "react-router";

const features = [
  { icon: CreditCard, title: "Digital Business Card Builder", desc: "Create stunning cards with drag-and-drop blocks and a live mobile preview. No coding required." },
  { icon: QrCode, title: "QR Code Sharing", desc: "Generate branded QR codes for print, packaging, and offline marketing materials." },
  { icon: MessageCircle, title: "WhatsApp Click-to-Chat", desc: "One-tap WhatsApp messaging for instant customer communication." },
  { icon: Download, title: "Save Contact Button", desc: "Visitors can save your contact details directly to their phone with one click." },
  { icon: FileDown, title: "Download vCard", desc: "Export your card as a vCard (.vcf) file for easy contact importing." },
  { icon: FileDown, title: "Download PDF Card", desc: "Download a branded PDF version of your card for offline sharing." },
  { icon: ShoppingBag, title: "Products & Services Showcase", desc: "Display your offerings with images, descriptions, pricing, and categories." },
  { icon: Sparkles, title: "Offers & Deals Section", desc: "Highlight special promotions, discounts, and limited-time deals." },
  { icon: Image, title: "Image Gallery", desc: "Create a visual portfolio with multiple images and descriptions." },
  { icon: Play, title: "YouTube Video Integration", desc: "Embed product demos, testimonials, or brand videos directly on your card." },
  { icon: Wallet, title: "Payment Links & QR Code", desc: "Accept payments via UPI, Paytm, GPay, Stripe, Razorpay, and more." },
  { icon: MapPin, title: "Google Map Direction", desc: "One-tap navigation to your business location via Google Maps." },
  { icon: Star, title: "Google Review Link", desc: "Collect more Google reviews with a direct one-tap review link." },
  { icon: Link2, title: "Social Media Links", desc: "Connect Facebook, Instagram, LinkedIn, Twitter, YouTube, and more." },
  { icon: Globe, title: "Enquiry Form", desc: "Capture leads with a customizable enquiry form on your card." },
  { icon: BarChart3, title: "Lead Tracking", desc: "Track every lead captured through your digital card in real time." },
  { icon: Eye, title: "Analytics Dashboard", desc: "Monitor views, clicks, device data, traffic sources, and trends." },
  { icon: Shield, title: "SEO Settings", desc: "Optimize your card for Google search with custom meta tags and slugs." },
  { icon: Layers, title: "Multilingual Card", desc: "Display your card in multiple languages to reach a global audience." },
  { icon: Globe, title: "Custom Domain Support", desc: "Connect your own domain or subdomain for stronger branding." },
  { icon: Users, title: "Reseller Management", desc: "White-label platform for agencies and resellers to manage multiple clients." },
  { icon: Sparkles, title: "AI Content Generator", desc: "AI writes your bio, product descriptions, SEO tags, FAQs, and more." },
];

export default function Features() {
  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Features</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Everything You Need in One Digital Card</h1>
          <p className="mt-4 text-base text-[#64748B]">
            22+ powerful features designed to help you create, share, and track your professional digital presence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] card-hover">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center mb-4">
                <f.icon size={22} className="text-[#F7B31C]" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">{f.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to Create Your Digital Card?</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Start your 7-day free trial and access all features instantly. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
              Start Free Trial <Check size={16} />
            </Link>
            <Link to="/templates" className="h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">
              View Templates
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
