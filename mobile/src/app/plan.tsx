import { useState } from "react";
import { View } from "react-native";
import { Check, Crown, ExternalLink, Minus, Receipt } from "lucide-react-native";
import { AppText, Banner, Button, Card, Chip, Loading, Screen, SectionTitle, Segmented } from "~/components/ui";
import { useSnapshot } from "~/lib/card";
import { asList, inr, type Product } from "~/lib/cardContent";
import { planLimit } from "~/lib/cardStore";
import { dateLabel } from "~/lib/format";
import { trpc } from "~/lib/trpc";
import { PURCHASE_LINKS } from "~/lib/config";
import { useOpenDashboard } from "~/lib/web";
import { radius, space, useTheme } from "~/theme";

/* The owner's plan: what they're on and until when, how much of it they use,
   what Gold and Platinum include, and what they've paid. Buying happens on
   digitalcarda.in (opened signed in, on the plan and term picked here), where
   discounts, coupons and upgrade credit are worked out. Store builds leave the
   buying part out (see PURCHASE_LINKS) and show status, usage and payments. */

type Term = "monthly" | "yearly" | "triennial";
const TERMS: { value: Term; label: string; per: string }[] = [
  { value: "monthly", label: "Monthly", per: "/ month" },
  { value: "yearly", label: "Yearly", per: "/ year" },
  { value: "triennial", label: "3 years", per: "for 3 years" },
];
const MONTHS: Record<Term, number> = { monthly: 1, yearly: 12, triennial: 36 };

type Pkg = {
  id: number; name: string; description: string | null;
  monthlyPrice: string; yearlyPrice: string; threeYearPrice: string;
  maxCards: number | null; maxProducts: number | null; maxGalleryImages: number | null; maxVideos: number | null;
  featureCustomDomain: boolean; featureRemoveBranding: boolean; featurePrioritySupport: boolean; featureAI: boolean;
};
const price = (p: Pkg, t: Term) => Number(t === "triennial" ? p.threeYearPrice : t === "yearly" ? p.yearlyPrice : p.monthlyPrice) || 0;

export default function PlanScreen() {
  const { c } = useTheme();
  const openDashboard = useOpenDashboard();
  const sub = trpc.subscription.mySubscription.useQuery();
  const trial = trpc.trial.me.useQuery();
  const packages = trpc.package.list.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  const orders = trpc.payment.myOrders.useQuery();
  const snapshot = useSnapshot();
  const [term, setTerm] = useState<Term>("yearly");
  const [opening, setOpening] = useState<number | null>(null);

  if (sub.isLoading || trial.isLoading || packages.isLoading) return <Loading />;

  const s = sub.data;
  const onPaid = !!s?.isActive && (s.packageId === 5 || s.packageId === 6);
  const onTrial = !onPaid && (trial.data?.status === "active" || trial.data?.status === "expiring_soon" || (!!s?.isActive && s.packageId === 7));
  const inGrace = trial.data?.status === "grace";
  const end = s?.currentPeriodEnd ? new Date(s.currentPeriodEnd) : trial.data?.endsAt ? new Date(trial.data.endsAt) : null;
  const daysLeft = onPaid && end ? Math.ceil((end.getTime() - Date.now()) / 86_400_000) : trial.data?.daysLeft ?? 0;
  const planName = onPaid ? String((s?.package as { name?: string } | null)?.name ?? "Paid") : onTrial ? "Free trial" : "No active plan";

  const paid = (packages.data ?? []).filter((p) => p.isActive && Number(p.monthlyPrice) > 0) as unknown as Pkg[];
  // No downgrade for an active member, as on the website.
  const currentPrice = onPaid ? price(paid.find((p) => p.id === s?.packageId) ?? paid[0], "monthly") : 0;
  const offered = paid.filter((p) => !onPaid || price(p, "monthly") >= currentPrice);

  const data = snapshot.data?.data;
  const products = asList<Product>(data?.products);
  const usage = data ? [
    { label: "Services", used: products.filter((p) => !p.isOffer).length, max: planLimit(data, "product") },
    { label: "Offers", used: products.filter((p) => p.isOffer).length, max: planLimit(data, "offer") },
    { label: "Photos", used: asList(data.gallery).length, max: planLimit(data, "gallery") },
    { label: "Videos", used: asList(data.videos).length, max: planLimit(data, "video") },
    { label: "Payment QR codes", used: asList(data.qrcodes).length, max: planLimit(data, "qrcode") },
  ] : [];

  const choose = async (p: Pkg) => {
    setOpening(p.id);
    try { await openDashboard(`/dashboard/subscription?cycle=${term}&plan=${p.id}`); } finally { setOpening(null); }
  };

  const pending = (orders.data ?? []).find((o) => o.status === "pending");

  return (
    <Screen refreshing={sub.isRefetching} onRefresh={() => { void sub.refetch(); void trial.refetch(); void orders.refetch(); }}>
      {/* Current plan */}
      <View style={{ backgroundColor: c.hero, borderRadius: radius.xl, padding: space.lg, gap: space.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Crown color={c.accent} size={20} />
          <AppText variant="title" tone="hero" style={{ flex: 1 }}>{planName}</AppText>
          {onPaid || onTrial ? <Chip label={daysLeft <= 7 ? `${Math.max(daysLeft, 0)} day${daysLeft === 1 ? "" : "s"} left` : "Active"} tone={daysLeft <= 7 ? "warn" : "good"} /> : <Chip label="Paused" tone="bad" />}
        </View>
        <AppText tone="heroMuted">
          {onPaid && end ? `Valid till ${dateLabel(end)}${s?.term ? ` · ${TERMS.find((t) => t.value === s.term)?.label.toLowerCase()} plan` : ""}.`
            : onTrial ? `Free until ${end ? dateLabel(end) : "the trial ends"}.${PURCHASE_LINKS ? " Choose Gold or Platinum to keep your card live after that." : ""}`
            : inGrace ? `Your trial has ended and your card is in its grace period.${PURCHASE_LINKS ? " Choose a plan to keep it live." : ""}`
            : `Your card is paused.${PURCHASE_LINKS ? " Choose a plan to bring it back online." : " Visitors see a paused notice."}`}
        </AppText>
      </View>

      {pending ? (
        <Banner tone="info" title={`Payment of ${inr(Number(pending.amount))} is being checked`}
          body="We activate your plan as soon as it's confirmed — usually within a few hours." />
      ) : null}

      {/* Usage */}
      {usage.length ? (
        <>
          <SectionTitle>On your card</SectionTitle>
          <Card style={{ gap: space.md }}>
            {usage.map((u) => {
              const share = Math.min(1, u.used / Math.max(1, u.max));
              return (
                <View key={u.label} style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <AppText variant="label">{u.label}</AppText>
                    <AppText variant="caption" tone={share >= 1 ? "bad" : "muted"} style={{ fontVariant: ["tabular-nums"] }}>{u.used} of {u.max}</AppText>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: "hidden" }}>
                    <View style={{ height: 6, width: `${share * 100}%`, backgroundColor: share >= 1 ? c.bad : share >= 0.8 ? c.warn : c.accent }} />
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      {/* Plans */}
      {PURCHASE_LINKS && offered.length ? (
        <>
          <SectionTitle>{onPaid ? "Upgrade or renew" : "Choose a plan"}</SectionTitle>
          <Segmented<Term> value={term} onChange={setTerm} options={TERMS.map((t) => ({ value: t.value, label: t.label }))} />
          {offered.map((p) => {
            const amount = price(p, term);
            const monthlyEquivalent = amount / MONTHS[term];
            const saving = term === "monthly" ? 0 : Math.round((1 - amount / (price(p, "monthly") * MONTHS[term])) * 100);
            const isCurrent = onPaid && s?.packageId === p.id;
            const features: [string, boolean][] = [
              [`${p.maxCards ?? 1} card${(p.maxCards ?? 1) === 1 ? "" : "s"}`, true],
              [`${p.maxProducts ?? 0} services · ${p.maxGalleryImages ?? 0} photos · ${p.maxVideos ?? 0} videos`, true],
              ["Custom domain", p.featureCustomDomain],
              ["No DigitalCarda branding", p.featureRemoveBranding],
              ["AI writing tools", p.featureAI],
              ["Priority support", p.featurePrioritySupport],
            ];
            return (
              <Card key={p.id} style={{ gap: space.md, borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? c.accent : c.rule }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.sm }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="heading">{p.name}</AppText>
                    {p.description ? <AppText variant="caption" tone="muted">{p.description}</AppText> : null}
                  </View>
                  {isCurrent ? <Chip label="Your plan" tone="accent" /> : saving > 0 ? <Chip label={`Save ${saving}%`} tone="good" /> : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                  <AppText variant="display">{inr(amount)}</AppText>
                  <AppText tone="muted">{TERMS.find((t) => t.value === term)?.per}</AppText>
                </View>
                {term !== "monthly" ? <AppText variant="caption" tone="muted" style={{ marginTop: -space.sm }}>That's {inr(Math.round(monthlyEquivalent))} a month</AppText> : null}
                <View style={{ gap: 6 }}>
                  {features.map(([label, on]) => (
                    <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                      {on ? <Check color={c.good} size={15} /> : <Minus color={c.muted} size={15} />}
                      <AppText variant="caption" tone={on ? "ink2" : "muted"}>{label}</AppText>
                    </View>
                  ))}
                </View>
                <Button
                  kind={isCurrent ? "secondary" : "primary"}
                  title={isCurrent ? `Renew ${p.name}` : onPaid ? `Upgrade to ${p.name}` : `Choose ${p.name}`}
                  loading={opening === p.id}
                  icon={<ExternalLink color={isCurrent ? c.ink : c.accentInk} size={16} />}
                  onPress={() => void choose(p)}
                />
              </Card>
            );
          })}
          <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
            Prices before any referral discount, offer or upgrade credit. You'll see the final amount and pay on digitalcarda.in.
          </AppText>
        </>
      ) : null}

      {/* Payments */}
      <SectionTitle>Payments</SectionTitle>
      <Card padded={false}>
        {orders.data?.length ? orders.data.map((o, i) => (
          <View key={o.id} style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderColor: c.rule }}>
            <Receipt color={c.muted} size={18} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="label" numberOfLines={1}>{o.planName || "Plan"} · {TERMS.find((t) => t.value === o.billingCycle)?.label ?? o.billingCycle}</AppText>
              <AppText variant="caption" tone="muted">{dateLabel(o.createdAt)} · {o.gateway === "razorpay" ? "Paid online" : o.method === "bank" ? "Bank transfer" : "UPI"}</AppText>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <AppText variant="label" style={{ fontVariant: ["tabular-nums"] }}>{inr(Number(o.amount))}</AppText>
              <Chip label={o.status === "verified" ? "Paid" : o.status === "pending" ? "Checking" : "Not accepted"} tone={o.status === "verified" ? "good" : o.status === "pending" ? "warn" : "bad"} />
            </View>
          </View>
        )) : (
          <View style={{ padding: space.lg }}>
            <AppText tone="muted">No payments yet.</AppText>
          </View>
        )}
      </Card>
    </Screen>
  );
}
