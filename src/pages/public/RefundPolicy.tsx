import { Ban, BadgeCheck, CalendarCheck, Gift, HandCoins, Mail, RotateCcw, Send, Timer, Wallet, XCircle } from "lucide-react";
import LegalLayout, { LegalLink } from "@/components/legal/LegalLayout";
import type { LegalHighlight, LegalSection } from "@/components/legal/LegalLayout";
import { CONTACT } from "@/lib/publicNav";

const HIGHLIGHTS: LegalHighlight[] = [
  { icon: Gift, title: "Try free for 30 days", text: "No card details needed, so there's nothing to refund." },
  { icon: HandCoins, title: "7-day money-back", text: "Full refund within 7 days of your first purchase." },
  { icon: Timer, title: "Back in 5–7 working days", text: "To the same card, UPI or bank account you paid from." },
  { icon: CalendarCheck, title: "No surprise charges", text: "Plans don't renew by themselves — you only pay when you choose to." },
];

/* The refund window as a simple visual timeline. */
function Timeline() {
  const steps = [
    { day: "Day 0", title: "You buy your first plan", text: "Your paid plan starts", tone: "#0F172A" },
    { day: "Days 1–7", title: "Full refund available", text: "Email us to request it", tone: "#16A34A" },
    { day: "Day 8 onwards", title: "No refund", text: "Your plan runs until its end date", tone: "#DC2626" },
  ];
  return (
    <ol className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="Refund window">
      {steps.map((s) => (
        <li key={s.day} className="relative rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] px-4 pt-4 pb-3 overflow-hidden">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: s.tone }} />
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: s.tone }}>{s.day}</span>
          <span className="block mt-1 text-[14px] font-bold text-[#0F172A]">{s.title}</span>
          <span className="block text-[12.5px] text-[#64748B]">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

const Rule = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <li className="rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] px-4 py-3"><strong className="text-[#0F172A]">{label}:</strong> {children}</li>
);

const REQUEST_HREF = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Refund request")}&body=${encodeURIComponent("Account email:\nPlan purchased:\nPurchase date:\nPayment / transaction ID (from your receipt):\nReason (optional, helps us improve):\n")}`;

const mail = <LegalLink to={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink>;

const SECTIONS: LegalSection[] = [
  {
    id: "overview", title: "Our promise", icon: BadgeCheck,
    body: <p>We want you to pay for DigitalCarda only if it&apos;s working for your business. That&apos;s why you can try it free first, and why your first purchase comes with a 7-day money-back guarantee. This policy explains exactly when refunds apply and how to ask for one.</p>,
  },
  {
    id: "free-trial", title: "Try before you pay", icon: Gift,
    body: <p>Every new account gets a 30-day free trial with no card details needed. You&apos;re never charged during or after the trial — at the end, you simply choose whether to buy a plan. Because nothing is paid, there&apos;s nothing to cancel or refund. <LegalLink to="/signup">Start your free trial</LegalLink></p>,
  },
  {
    id: "eligibility", title: "When you can get a refund", icon: RotateCcw,
    body: (
      <>
        <ul className="space-y-2">
          <Rule label="7-day money-back guarantee">if you&apos;re not happy with your first paid plan, ask within 7 days of buying it and we&apos;ll refund the full amount.</Rule>
          <Rule label="Charged twice or by mistake">if a technical error charged you more than once for the same plan, we&apos;ll refund the extra payment whenever you tell us.</Rule>
          <Rule label="Paid but plan not activated">if your payment went through but your plan didn&apos;t start and we can&apos;t fix it, you&apos;ll get a full refund.</Rule>
        </ul>
        <Timeline />
      </>
    ),
  },
  {
    id: "not-eligible", title: "When refunds don't apply", icon: XCircle,
    body: (
      <ul className="space-y-2">
        <Rule label="After 7 days">requests made more than 7 days after your first purchase.</Rule>
        <Rule label="Renewals">payments to renew or extend an existing plan. Plans don&apos;t renew by themselves, so you&apos;re only charged when you choose to renew.</Rule>
        <Rule label="Partly used periods">we don&apos;t refund the unused part of a plan if you stop using DigitalCarda midway; your plan stays active until its end date.</Rule>
        <Rule label="Reseller purchases">if you bought through a DigitalCarda reseller or agency, ask them about refunds — they set their own prices and terms.</Rule>
      </ul>
    ),
  },
  {
    id: "how-to-request", title: "How to request a refund", icon: Send,
    body: (
      <>
        <ol className="space-y-2">
          {[
            <>Email {mail} from your account email address.</>,
            <>Include your plan, purchase date and the payment or transaction ID from your receipt.</>,
            <>We&apos;ll confirm we&apos;ve received it and let you know once it&apos;s approved.</>,
          ].map((t, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-[#F1F5F9] px-4 py-3">
              <span className="w-6 h-6 rounded-full gradient-gold text-[#0F172A] text-[12px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <a href={REQUEST_HREF}
          className="mt-4 inline-flex items-center gap-2 h-11 px-4 rounded-xl gradient-gold text-[#0F172A] text-[14px] font-bold hover:shadow-gold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]">
          <Mail size={16} aria-hidden="true" /> Email a refund request
        </a>
        <p className="mt-2 text-[12.5px] text-[#64748B]">Opens your email app with the details we need already listed.</p>
      </>
    ),
  },
  {
    id: "processing", title: "How and when you're paid back", icon: Wallet,
    body: <p>Approved refunds are sent to the same card, UPI ID or bank account you paid with, through Razorpay, within 5–7 working days. Your bank may take a few extra days to show it. When a plan is refunded it ends straight away, and your card goes back to the state it was in before you bought it.</p>,
  },
  {
    id: "exceptions", title: "Exceptions", icon: Ban,
    body: <p>We may refuse a refund where an account broke our <LegalLink to="/terms-of-service">Terms &amp; Conditions</LegalLink>, where we see fraud or abuse (such as repeatedly buying and refunding), or where a separate written agreement — for example for a large team or enterprise order — sets different refund terms.</p>,
  },
  {
    id: "contact-us", title: "Questions?", icon: Mail,
    body: <p>For anything about payments or refunds, email {mail}, call <LegalLink to={CONTACT.phoneHref}>{CONTACT.phone}</LegalLink> or <LegalLink to={CONTACT.whatsappHref}>message us on WhatsApp</LegalLink>. How we handle your payment details is explained in our <LegalLink to="/privacy">Privacy Policy</LegalLink>.</p>,
  },
];

export default function RefundPolicy() {
  return (
    <LegalLayout
      current="refund"
      updated="September 16, 2026"
      readMinutes={4}
      intro="Try DigitalCarda free for 30 days. If your first paid plan isn't right for you, ask within 7 days and get your money back."
      highlights={HIGHLIGHTS}
      sections={SECTIONS}
    />
  );
}
