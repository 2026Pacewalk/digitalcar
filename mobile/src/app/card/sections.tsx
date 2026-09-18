import { useState } from "react";
import { Banner, Card, Loading, Screen, SectionTitle, SwitchRow } from "~/components/ui";
import { useSnapshot } from "~/lib/card";
import { sectionOn, setFields, useCardUpdate } from "~/lib/cardStore";
import { asList } from "~/lib/cardContent";

/* Show or hide each part of the card. These are the switches the live card
   reads (src/card-template/buildCard.ts); hiding a section keeps its content,
   so turning it back on brings everything back. */

type Switch = { flag: string; title: string; subtitle: string };

const SECTIONS: Switch[] = [
  { flag: "about_on", title: "About", subtitle: "Your about text and specialities" },
  { flag: "product_on", title: "Services & offers", subtitle: "What you sell, with photos and prices" },
  { flag: "payment_on", title: "Payment details", subtitle: "UPI, wallets and bank account" },
  { flag: "qrcode_on", title: "Payment QR", subtitle: "Your uploaded payment QR codes" },
  { flag: "gallery_on", title: "Photo gallery", subtitle: "Photos of your work or shop" },
  { flag: "video_on", title: "Videos", subtitle: "YouTube and Instagram videos" },
  { flag: "review_on", title: "Google reviews", subtitle: "Rating and Write-a-Review button" },
  { flag: "enquiry_on", title: "Enquiry form", subtitle: "Visitors send you a message — it lands in Leads" },
  { flag: "cardqr_on", title: "Card QR code", subtitle: "A QR of your card at the bottom" },
];

const EXTRAS: Switch[] = [
  { flag: "share_on", title: "Share button", subtitle: "Lets visitors pass your card on" },
  { flag: "views_on", title: "View counter", subtitle: "Shows how many times your card was opened" },
  { flag: "badge_on", title: "Plan badge", subtitle: "The Gold or Platinum badge on your card" },
];

export default function SectionsScreen() {
  const snapshot = useSnapshot();
  const update = useCardUpdate();
  const [error, setError] = useState<string | null>(null);

  if (snapshot.isLoading) return <Loading />;
  const data = snapshot.data?.data;
  if (!data) return <Screen><Banner tone="info" title="Publish your card first" body="Publish your card on digitalcarda.in, then choose its sections here." /></Screen>;

  // The older, separate offers list only exists on some cards; show its switch only there.
  const sections = asList(data.offers).length
    ? [...SECTIONS.slice(0, 2), { flag: "offer_on", title: "Offers (older list)", subtitle: "Offers added before services and offers were combined" }, ...SECTIONS.slice(2)]
    : SECTIONS;

  const toggle = async (flag: string, on: boolean) => {
    setError(null);
    const r = await update(setFields({ [flag]: on ? 1 : 0 }));
    if (!r.ok) setError(r.message);
  };

  const list = (items: Switch[]) => items.map((s, i) => (
    <SwitchRow key={s.flag} first={i === 0} title={s.title} subtitle={s.subtitle}
      value={sectionOn(data, s.flag)} onChange={(v) => void toggle(s.flag, v)} />
  ));

  return (
    <Screen refreshing={snapshot.isRefetching} onRefresh={() => void snapshot.refetch()}>
      {error ? <Banner tone="bad" title="Not saved" body={error} /> : null}
      <SectionTitle>Sections</SectionTitle>
      <Card padded={false}>{list(sections)}</Card>
      <SectionTitle>On the card header</SectionTitle>
      <Card padded={false}>{list(EXTRAS)}</Card>
      <Banner tone="info" title="Hiding keeps your content" body="A hidden section's details stay saved. Turn it back on any time." />
    </Screen>
  );
}
