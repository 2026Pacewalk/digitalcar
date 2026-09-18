import { Ban, Baby, Clock3, Cookie, CreditCard, Database, Eye, Info, Lock, Mail, PenLine, Share2, ShieldCheck, Smartphone, Target, UserCheck, Users } from "lucide-react";
import LegalLayout, { LegalLink } from "@/components/legal/LegalLayout";
import type { LegalHighlight, LegalSection } from "@/components/legal/LegalLayout";
import { CONTACT } from "@/lib/publicNav";

const HIGHLIGHTS: LegalHighlight[] = [
  { icon: Ban, title: "We never sell your data", text: "Not to advertisers, data brokers or anyone else." },
  { icon: Users, title: "Your leads are yours", text: "Enquiries from your card go to you, not to us." },
  { icon: Lock, title: "Passwords are hashed", text: "We can't read your password, and card numbers never reach us." },
  { icon: UserCheck, title: "You're in control", text: "Ask to see, correct, get a copy of or delete your data." },
];

const Item = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <li className="flex gap-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] px-4 py-3">
    <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#14B8A6] shrink-0" aria-hidden="true" />
    <span><strong className="text-[#0F172A]">{label}:</strong> {children}</span>
  </li>
);

const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
    {items.map((t, i) => (
      <li key={i} className="flex gap-2.5 rounded-xl border border-[#F1F5F9] px-3.5 py-2.5 text-[14px] leading-snug">
        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#F7B31C] shrink-0" aria-hidden="true" />
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

const mail = <LegalLink to={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink>;

const SECTIONS: LegalSection[] = [
  {
    id: "introduction", title: "Who we are and what this covers", icon: Info,
    body: (
      <>
        <p>DigitalCarda (&ldquo;DigitalCarda&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) lets businesses and professionals in India create, share and manage digital business cards. This policy explains what personal data we collect, why we collect it, who we share it with and the choices you have.</p>
        <p className="mt-3">It applies to our website, your dashboard, the DigitalCarda app for iPhone and Android, the public cards we host and our emails. We handle personal data in line with India&apos;s Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.</p>
      </>
    ),
  },
  {
    id: "information-we-collect", title: "Information we collect", icon: Database,
    body: (
      <ul className="space-y-2">
        <Item label="Account details">your name, email address, mobile number, business name and a password (stored only as a secure hash). If you sign in with Google, we receive your name, email and profile photo from Google.</Item>
        <Item label="Card content">everything you add to your cards — photos, logos, services, products, gallery images, social links, addresses and contact details. Most of this is meant to be public, because it appears on your card.</Item>
        <Item label="Payment records">the plan you bought, the amount, dates and the transaction reference. Card, UPI and bank details are entered on Razorpay&apos;s secure checkout — they never reach our servers.</Item>
        <Item label="Card visit data">when someone opens a card we record things like the time, device and browser type, approximate location, how they arrived and what they tapped (call, WhatsApp, save contact). A random visitor ID is kept in their browser so repeat visits aren&apos;t double-counted.</Item>
        <Item label="Enquiries (leads)">the name, phone, email and message a visitor submits through the enquiry form on a card.</Item>
        <Item label="Support and communication">messages you send us by email, WhatsApp or phone, and whether our emails were delivered.</Item>
      </ul>
    ),
  },
  {
    id: "mobile-app", title: "The DigitalCarda app", icon: Smartphone,
    body: (
      <>
        <p>The app works on the same account and card as the website. On your phone it also uses:</p>
        <ul className="mt-3 space-y-2">
          <Item label="Signed-in phones">the phone&apos;s name, type and app version, so you can see where you&apos;re signed in and sign a phone out (More → Signed-in devices). The app keeps its sign-in in your phone&apos;s secure storage.</Item>
          <Item label="Notifications">if you allow them, a notification address for your phone, so we can tell you the moment someone enquires. Notifications are delivered through Expo&apos;s push service, Apple Push Notification service and Google&apos;s Firebase Cloud Messaging. Follow-up reminders you set are scheduled on your phone itself.</Item>
          <Item label="Photos and camera">only a photo you choose or take for your card. It&apos;s resized on your phone and saved to your card; the app doesn&apos;t look through your photo library.</Item>
          <Item label="Contacts">when you tap &ldquo;Save to contacts&rdquo; on an enquiry, the app opens your phone&apos;s own new-contact screen with the details filled in. The app doesn&apos;t read your contacts.</Item>
          <Item label="Exports">a spreadsheet of your enquiries is created on your phone and goes only where you choose to share it.</Item>
        </ul>
        <p className="mt-3">The app has no advertising or tracking tools and doesn&apos;t track your location.</p>
      </>
    ),
  },
  {
    id: "how-we-use-information", title: "How we use it", icon: Target,
    body: (
      <>
        <p>We use personal data only to run and improve DigitalCarda:</p>
        <Bullets items={[
          "Create your account, host your cards and keep them online",
          "Show you card views, clicks and enquiries in your dashboard",
          "Process payments, issue receipts and manage your plan",
          "Send essential emails — sign-in, password resets, trial and renewal reminders",
          "Answer support requests",
          "Send product news and offers (you can opt out any time)",
          "Keep the platform secure and prevent fraud, spam and abuse",
          "Understand how features are used so we can improve them",
        ]} />
      </>
    ),
  },
  {
    id: "card-visitors", title: "Card visitors and leads", icon: Users,
    body: (
      <>
        <p>When a visitor sends an enquiry through your card, that information is delivered to <strong className="text-[#0F172A]">you, the card owner</strong>. You decide how to use it and are responsible for contacting people lawfully and respectfully. We store it so it appears in your dashboard, and we don&apos;t use it to market to those visitors ourselves.</p>
        <p className="mt-3">If you visited a card and want your enquiry removed, contact the business on that card, or write to us at {mail} and we&apos;ll help.</p>
      </>
    ),
  },
  {
    id: "ai-features", title: "AI writing tools", icon: PenLine,
    body: <p>If you use our AI tools (for example to draft your &ldquo;About&rdquo; section or services), the details you type are sent to our AI provider, Anthropic, only to generate that text. They aren&apos;t used to advertise to you, and you can edit or discard anything the AI writes before it goes on your card.</p>,
  },
  {
    id: "data-sharing", title: "Who we share data with", icon: Share2,
    body: (
      <>
        <p><strong className="text-[#0F172A]">We do not sell or rent personal data.</strong> We share it only with:</p>
        <ul className="mt-3 space-y-2">
          <Item label="Service providers">companies that help us run DigitalCarda — server hosting, email delivery, Razorpay for payments, Google for sign-in and Anthropic for AI writing. They may use the data only to provide their service to us.</Item>
          <Item label="Resellers">if your card was set up through a DigitalCarda reseller or agency, they can see and manage the cards and account they created for you.</Item>
          <Item label="The public">content you publish on your card is visible to anyone with the link or QR code.</Item>
          <Item label="Legal requirements">authorities, when the law requires it, or to protect the rights and safety of our users and DigitalCarda.</Item>
        </ul>
      </>
    ),
  },
  {
    id: "payments", title: "Payments", icon: CreditCard,
    body: <p>Payments are processed by Razorpay, which is PCI-DSS compliant. We receive a confirmation and a transaction reference — never your full card number, CVV, UPI PIN or net-banking password. Razorpay&apos;s own privacy policy applies to the details you enter on its checkout.</p>,
  },
  {
    id: "data-security", title: "How we protect it", icon: ShieldCheck,
    body: (
      <>
        <Bullets items={[
          "HTTPS encryption on every page and card",
          "Passwords stored only as one-way hashes",
          "Sign-in sessions in secure, HTTP-only cookies",
          "Password-reset links that work once and expire in 1 hour",
          "Limits on repeated sign-in and reset attempts",
          "Access to customer data restricted to people who need it",
        ]} />
        <p className="mt-3">No system is perfectly secure. If we become aware of a breach that affects your personal data, we&apos;ll inform you and the relevant authorities as the law requires.</p>
      </>
    ),
  },
  {
    id: "retention", title: "How long we keep it", icon: Clock3,
    body: <p>We keep your account and card data while your account is active. If your plan or trial ends, your data is kept for a period so you can renew without starting over. If you delete your account — in the app under More → Delete account, or at <LegalLink to="/account/delete">digitalcarda.in/account/delete</LegalLink> — it is switched off and your card is paused straight away. After 30 days, so you can change your mind, we erase your cards, enquiries and personal details. We keep only records we must keep by law, such as payment and tax records, without your name or contact details attached.</p>,
  },
  {
    id: "your-rights", title: "Your rights and choices", icon: UserCheck,
    body: (
      <>
        <p>You can:</p>
        <Bullets items={[
          "See and update most of your details in your dashboard",
          "Ask for a copy of the personal data we hold about you",
          "Ask us to correct anything inaccurate",
          "Delete your account — in the app (More → Delete account) or on our website",
          "Withdraw consent and unsubscribe from marketing emails",
          "Nominate someone to exercise these rights on your behalf",
        ]} />
        <p className="mt-3">To delete your account yourself, use <LegalLink to="/account/delete">digitalcarda.in/account/delete</LegalLink>. For anything else, email {mail} from your account email address. We may need to confirm it&apos;s you before acting, and we&apos;ll respond as soon as we can.</p>
      </>
    ),
  },
  {
    id: "cookies", title: "Cookies and browser storage", icon: Cookie,
    body: (
      <>
        <p>We use a small number of cookies and browser storage items, mainly to make the site work:</p>
        <ul className="mt-3 space-y-2">
          <Item label="Essential">keep you signed in and protect your account.</Item>
          <Item label="Preferences">remember choices such as the template you picked or a draft in progress.</Item>
          <Item label="Card analytics">a random visitor ID so card owners see accurate view counts.</Item>
        </ul>
        <p className="mt-3">You can clear or block these in your browser settings, but you may be signed out and some features may stop working.</p>
      </>
    ),
  },
  {
    id: "children", title: "Children", icon: Baby,
    body: <p>DigitalCarda is a business tool and isn&apos;t meant for anyone under 18. We don&apos;t knowingly collect data from children. If you believe a child has given us personal data, contact us and we&apos;ll delete it.</p>,
  },
  {
    id: "changes", title: "Changes to this policy", icon: Eye,
    body: <p>We&apos;ll update this policy when our services or the law change. The &ldquo;Last updated&rdquo; date at the top shows when. For significant changes we&apos;ll also let you know by email or in your dashboard.</p>,
  },
  {
    id: "contact-us", title: "Contact and grievances", icon: Mail,
    body: (
      <>
        <p>For privacy questions, requests or complaints, email {mail} or call <LegalLink to={CONTACT.phoneHref}>{CONTACT.phone}</LegalLink>. If you&apos;re not satisfied with our response, you may approach the Data Protection Board of India.</p>
        <p className="mt-3 text-[13.5px] text-[#64748B]">See also our <LegalLink to="/terms-of-service">Terms &amp; Conditions</LegalLink> and <LegalLink to="/refund-policy">Refund Policy</LegalLink>.</p>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalLayout
      current="privacy"
      updated="September 18, 2026"
      readMinutes={8}
      intro="What we collect, why we collect it and the control you have — written in plain English, for card owners and the people who visit their cards."
      highlights={HIGHLIGHTS}
      sections={SECTIONS}
    />
  );
}
