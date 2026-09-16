import { AlertTriangle, Bot, CheckCircle2, CreditCard, FileSignature, Gavel, Globe, Handshake, LayoutGrid, Link2, Mail, PenLine, Power, RefreshCw, ServerCog, ShieldBan, Sparkles, UserCircle2 } from "lucide-react";
import LegalLayout, { LegalLink } from "@/components/legal/LegalLayout";
import type { LegalHighlight, LegalSection } from "@/components/legal/LegalLayout";
import { CONTACT } from "@/lib/publicNav";

const HIGHLIGHTS: LegalHighlight[] = [
  { icon: FileSignature, title: "Your content stays yours", text: "We only host and show it so your card works." },
  { icon: Power, title: "Cancel any time", text: "No lock-in. Your plan runs to the end of the period you paid for." },
  { icon: RefreshCw, title: "30 days' notice", text: "Before any price change applies to you." },
  { icon: ShieldBan, title: "Play fair", text: "No illegal, misleading, spammy or copied content." },
];

const Bullets = ({ items, tone = "ok" }: { items: React.ReactNode[]; tone?: "ok" | "no" }) => (
  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
    {items.map((t, i) => (
      <li key={i} className={`flex gap-2.5 rounded-xl px-3.5 py-2.5 text-[14px] leading-snug border ${tone === "no" ? "bg-[#FEF2F2]/60 border-[#FEE2E2]" : "border-[#F1F5F9]"}`}>
        {tone === "no"
          ? <span className="mt-[2px] w-4 h-4 rounded-full bg-[#FEE2E2] text-[#DC2626] text-[11px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">×</span>
          : <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#F7B31C] shrink-0" aria-hidden="true" />}
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance", title: "Agreeing to these terms", icon: CheckCircle2,
    body: (
      <>
        <p>These Terms &amp; Conditions are an agreement between you and DigitalCarda (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account, buying a plan or using any part of DigitalCarda, you agree to them and to our <LegalLink to="/privacy">Privacy Policy</LegalLink> and <LegalLink to="/refund-policy">Refund Policy</LegalLink>.</p>
        <p className="mt-3">If you use DigitalCarda for a business, you confirm you&apos;re allowed to accept these terms for that business. You must be at least 18 years old.</p>
      </>
    ),
  },
  {
    id: "service", title: "What DigitalCarda provides", icon: LayoutGrid,
    body: <p>DigitalCarda is an online platform for creating, sharing and managing digital business cards. Depending on your plan, it includes card templates, a personal card link and QR code, enquiry forms, view and click analytics, AI writing tools, custom domains, team and bulk cards, and tools for resellers. What each plan includes is shown on the <LegalLink to="/pricing">pricing page</LegalLink>; see all <LegalLink to="/features">features</LegalLink>.</p>,
  },
  {
    id: "accounts", title: "Your account", icon: UserCircle2,
    body: (
      <Bullets items={[
        "Give accurate details and keep them up to date",
        "Keep your password private — you're responsible for activity on your account",
        "Tell us straight away if you think someone else has accessed it",
        "One person or business per account; don't share or resell logins",
      ]} />
    ),
  },
  {
    id: "trial", title: "Free trial", icon: Sparkles,
    body: <p>New accounts get a 30-day free trial with no card details needed. At the end of the trial your card stops being publicly available unless you choose a paid plan; your content is kept for a while so you can pick up where you left off. We may limit trials to one per person or business.</p>,
  },
  {
    id: "payments", title: "Plans, payments and renewals", icon: CreditCard,
    body: (
      <>
        <Bullets items={[
          "Plans are billed in advance for the period you choose (for example monthly or yearly)",
          "Prices are shown in Indian Rupees (₹), and the final amount is shown before you pay",
          "Payments are processed securely by Razorpay",
          "Plans don't renew by themselves — we remind you before yours ends so you can renew",
          "If a plan ends, your card may stop showing publicly until you renew",
          "We'll give you at least 30 days' notice before a price change applies to you",
        ]} />
        <p className="mt-3">Payments are non-refundable except as set out in our <LegalLink to="/refund-policy">Refund Policy</LegalLink>.</p>
      </>
    ),
  },
  {
    id: "card-links", title: "Card links and custom domains", icon: Link2,
    body: <p>Your card link (for example digitalcarda.in/your-business) is yours to use while your account is active. We may change or withdraw a link that impersonates someone, infringes a trademark or is misleading or offensive. If you connect your own domain, you must own it or have permission to use it, and you&apos;re responsible for keeping its registration and DNS settings in place.</p>,
  },
  {
    id: "acceptable-use", title: "Acceptable use", icon: ShieldBan,
    body: (
      <>
        <p>You agree not to use DigitalCarda to:</p>
        <Bullets tone="no" items={[
          "Publish illegal, fraudulent, misleading or hateful content",
          "Impersonate another person, business or brand",
          "Use photos, logos or text you don't have the right to use",
          "Send spam or contact people who haven't agreed to hear from you",
          "Upload viruses, malware or anything harmful",
          "Scrape data, overload or try to break into the platform",
          "Promote regulated goods or services without the required licences",
          "Break any law that applies to you or your business",
        ]} />
        <p className="mt-3">You&apos;re also responsible for making sure your card meets the rules of your profession (for example, those for doctors, lawyers or financial advisers).</p>
      </>
    ),
  },
  {
    id: "content-ownership", title: "Your content", icon: FileSignature,
    body: <p>You own everything you add to your cards. You give us a limited licence to store, copy, display and share that content only as needed to run DigitalCarda — for example, to show your card to visitors and create its QR code and previews. This licence ends when you delete the content or your account, except for copies we must keep by law or that remain for a short time in backups.</p>,
  },
  {
    id: "ai-content", title: "AI-generated content", icon: Bot,
    body: <p>Our AI tools suggest text based on what you enter. AI can make mistakes, so please check anything it writes before you publish it. You&apos;re responsible for the final content on your card.</p>,
  },
  {
    id: "our-property", title: "Our platform and templates", icon: PenLine,
    body: <p>DigitalCarda&apos;s software, card templates, designs, logo and brand belong to us. You may use templates to build cards on DigitalCarda, but not copy, resell or reuse them outside the platform.</p>,
  },
  {
    id: "resellers", title: "Resellers and agencies", icon: Handshake,
    body: <p>Some cards are created and managed by DigitalCarda resellers. Resellers are independent businesses, not our employees or agents. If a reseller set up your card, they can manage it, and pricing or support they offer is agreed between you and them. <LegalLink to="/resellers">Learn about the reseller programme</LegalLink>.</p>,
  },
  {
    id: "availability", title: "Availability and changes to the service", icon: ServerCog,
    body: <p>We work hard to keep DigitalCarda and your card online, but we can&apos;t promise it will never be interrupted — for example during maintenance or problems with our hosting providers. We may add, change or retire features over time; if we remove something important to a paid plan, we&apos;ll tell you in advance.</p>,
  },
  {
    id: "termination", title: "Cancelling or suspending an account", icon: Power,
    body: <p>You can stop using DigitalCarda or ask us to delete your account at any time. We may suspend or close an account that breaks these terms, puts other users at risk or is used unlawfully — where reasonable, we&apos;ll warn you first. After an account ends, cards stop showing publicly and the data may be deleted after a grace period.</p>,
  },
  {
    id: "liability", title: "Limitation of liability", icon: AlertTriangle,
    body: <p>DigitalCarda is provided &ldquo;as is&rdquo;. To the extent the law allows, we aren&apos;t liable for indirect or consequential losses such as lost profits, lost business or lost data, and our total liability for any claim is limited to the amount you paid us in the 12 months before it arose. Nothing in these terms limits rights you have that can&apos;t be excluded by law.</p>,
  },
  {
    id: "law", title: "Governing law and disputes", icon: Gavel,
    body: <p>These terms are governed by the laws of India. If something goes wrong, please contact us first — most issues can be sorted out quickly. Any dispute that can&apos;t be resolved will be handled by the courts of India.</p>,
  },
  {
    id: "changes", title: "Changes to these terms", icon: Globe,
    body: <p>We may update these terms as DigitalCarda grows. The &ldquo;Last updated&rdquo; date shows when. We&apos;ll tell you about significant changes by email or in your dashboard, and continuing to use DigitalCarda afterwards means you accept them.</p>,
  },
  {
    id: "contact", title: "Contact us", icon: Mail,
    body: <p>Questions about these terms? Email <LegalLink to={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink>, call <LegalLink to={CONTACT.phoneHref}>{CONTACT.phone}</LegalLink> or use our <LegalLink to="/contact">contact page</LegalLink>.</p>,
  },
];

export default function TermsOfService() {
  return (
    <LegalLayout
      current="terms"
      updated="September 16, 2026"
      readMinutes={8}
      intro="The ground rules for using DigitalCarda — your account, your card, payments and what each of us can expect from the other."
      highlights={HIGHLIGHTS}
      sections={SECTIONS}
    />
  );
}
