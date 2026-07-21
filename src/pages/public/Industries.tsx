import {
  Monitor, CreditCard, MapPin, Shield, Users, Sparkles, ShoppingBag,
  Image, Store, Zap, BookOpen, Calendar, GraduationCap, Rocket, Wrench,
  Check, ArrowRight,
} from "lucide-react";
import { Link } from "react-router";

const industries = [
  { icon: Monitor, name: "Digital Marketing Agencies", desc: "Showcase your services, portfolio, and client testimonials with a professional digital card." },
  { icon: CreditCard, name: "Doctors & Clinics", desc: "Share appointment details, specializations, clinic timings, and patient reviews." },
  { icon: MapPin, name: "Real Estate Agents", desc: "Display property listings, contact info, and book property viewings directly." },
  { icon: Shield, name: "Lawyers", desc: "Highlight practice areas, case successes, and consultation booking options." },
  { icon: Users, name: "Consultants", desc: "Present expertise, service offerings, and client success stories professionally." },
  { icon: Sparkles, name: "Freelancers", desc: "Build a portfolio card with projects, skills, rates, and direct hire options." },
  { icon: ShoppingBag, name: "Restaurants", desc: "Show menu, offers, location, reviews, and enable table reservations." },
  { icon: Image, name: "Salons", desc: "Display services, pricing, stylists, before-after gallery, and booking links." },
  { icon: Store, name: "Retail Shops", desc: "Feature products, deals, store location, and drive foot traffic with QR codes." },
  { icon: Zap, name: "Coaches", desc: "Share programs, testimonials, session booking, and motivational content." },
  { icon: BookOpen, name: "Photographers", desc: "Showcase galleries, packages, availability, and direct booking." },
  { icon: Calendar, name: "Event Planners", desc: "Display services, past events, testimonials, and inquiry forms." },
  { icon: GraduationCap, name: "Education Institutes", desc: "Share courses, faculty info, campus details, and admission inquiries." },
  { icon: Rocket, name: "Startups", desc: "Present your pitch, team, product demo, and investor contact in one link." },
  { icon: Wrench, name: "Local Service Providers", desc: "List services, pricing, service areas, and enable instant bookings." },
];

export default function Industries() {
  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#CCFBF1] text-[#115E59] mb-4">Industries</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Made for Every Business Type</h1>
          <p className="mt-4 text-base text-[#64748B]">Whatever your industry, DigitalCarda has the features and templates to help you grow your business.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {industries.map((ind, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] card-hover flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0">
                <ind.icon size={22} className="text-[#F7B31C]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A] mb-1">{ind.name}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{ind.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Not Sure If DigitalCarda Fits Your Industry?</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Contact our team and we will help you understand how DigitalCarda can work for your specific business needs.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
              Start Free Trial <Check size={16} />
            </Link>
            <Link to="/contact" className="h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">
              Contact Us <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
