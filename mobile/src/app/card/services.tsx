import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { ChevronRight, ImageOff, Plus, ShoppingBag, Tag } from "lucide-react-native";
import { AppText, Banner, Button, Card, Chip, EmptyState, Loading, Screen, Segmented, SwitchRow } from "~/components/ui";
import { imageOf, useSnapshot } from "~/lib/card";
import { planLimit, sectionOn, setFields, useCardUpdate } from "~/lib/cardStore";
import { amount, asList, inr, offerEnded, percentOff, type Product } from "~/lib/cardContent";
import { dateLabel } from "~/lib/format";
import { radius, space, useTheme } from "~/theme";

/* Services / products and offers — one list on the card, offers flagged, as on
   the website. Tap one to edit it. Offers are shown with the services on the
   live card (with their offer price), so the one switch covers both. */

type Tab = "services" | "offers";

export default function ServicesScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "offers" ? "offers" : "services");
  const snapshot = useSnapshot();
  const update = useCardUpdate();
  const [error, setError] = useState<string | null>(null);

  if (snapshot.isLoading) return <Loading />;
  const data = snapshot.data?.data;
  if (!data) {
    return (
      <Screen>
        <EmptyState icon={<ShoppingBag color={c.accentText} size={32} />} title="Publish your card first" body="Services appear on your live card. Publish it on digitalcarda.in, then add them here." />
      </Screen>
    );
  }

  const all = asList<Product>(data.products);
  const isOffers = tab === "offers";
  const items = all.filter((p) => !!p.isOffer === isOffers);
  const limit = planLimit(data, isOffers ? "offer" : "product");
  const full = items.length >= limit;
  const shown = sectionOn(data, "product_on");
  const layout = String(data.customer.product_layout ?? "") === "icons" ? "icons" : "";

  const save = async (patch: Record<string, unknown>) => {
    setError(null);
    const r = await update(setFields(patch));
    if (!r.ok) setError(r.message);
  };

  const add = () => {
    if (full) { setError(`You've used all ${limit} ${isOffers ? "offers" : "services"} on your plan. Upgrade to add more.`); return; }
    router.push({ pathname: "/card/service/[id]", params: { id: "new", offer: isOffers ? "1" : "0" } });
  };

  return (
    <Screen refreshing={snapshot.isRefetching} onRefresh={() => void snapshot.refetch()}>
      <Segmented<Tab>
        value={tab}
        onChange={(t) => { setTab(t); setError(null); }}
        options={[
          { value: "services", label: `Services${all.filter((p) => !p.isOffer).length ? ` (${all.filter((p) => !p.isOffer).length})` : ""}` },
          { value: "offers", label: `Offers${all.filter((p) => p.isOffer).length ? ` (${all.filter((p) => p.isOffer).length})` : ""}` },
        ]}
      />

      {error ? <Banner tone="bad" title={error} /> : null}

      <Card padded={false}>
        <SwitchRow first
          title="Show services on my card"
          subtitle={shown ? (isOffers ? "Offers appear with your services, at their offer price" : "Visible to visitors") : "Hidden — turn on to show this section"}
          value={shown}
          onChange={(v) => void save({ product_on: v ? 1 : 0 })}
        />
      </Card>

      {!isOffers && items.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="label" tone="ink2">Layout on your card</AppText>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Chip label="With photos" selected={layout === ""} onPress={() => void save({ product_layout: "" })} />
            <Chip label="Compact list" selected={layout === "icons"} onPress={() => void save({ product_layout: "icons" })} />
          </View>
        </View>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={isOffers ? <Tag color={c.accentText} size={30} /> : <ShoppingBag color={c.accentText} size={30} />}
            title={isOffers ? "No offers yet" : "No services yet"}
            body={isOffers
              ? "Promote a deal with its offer price and the date it runs until."
              : "List what you sell with a photo and price. Visitors enquire about what they can see."}
            action={<Button title={isOffers ? "Add an offer" : "Add a service"} icon={<Plus color={c.accentInk} size={18} />} onPress={add} />}
          />
        </Card>
      ) : (
        <>
          <Card padded={false}>
            {items.map((p, i) => <ItemRow key={p.id} item={p} first={i === 0} />)}
          </Card>
          <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
            {items.length} of {limit} {isOffers ? "offers" : "services"} on your plan
          </AppText>
          <Button kind={full ? "secondary" : "primary"} title={isOffers ? "Add an offer" : "Add a service"}
            icon={<Plus color={full ? c.ink : c.accentInk} size={18} />} onPress={add} />
        </>
      )}
    </Screen>
  );
}

function ItemRow({ item, first }: { item: Product; first: boolean }) {
  const { c } = useTheme();
  const img = imageOf(item.filename);
  const price = amount(item.price), offer = amount(item.offer_price);
  const off = percentOff(item.price, item.offer_price);
  const ended = item.isOffer && offerEnded(item.valid);
  const priceLine = off ? `${inr(offer)} · was ${inr(price)} · ${off}% off` : price ? inr(price) : offer ? inr(offer) : "";
  const validLine = item.isOffer ? (ended ? `Ended ${dateLabel(item.valid)}` : item.valid ? `Valid till ${dateLabel(item.valid)}` : "No end date") : "";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${item.name}`}
      onPress={() => router.push({ pathname: "/card/service/[id]", params: { id: String(item.id) } })}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, paddingRight: space.lg,
        borderTopWidth: first ? 0 : 1, borderColor: c.rule, backgroundColor: pressed ? c.surfaceAlt : "transparent",
      })}
    >
      <View style={{ width: 56, height: 56, borderRadius: radius.sm + 2, overflow: "hidden", backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        {img ? <Image source={{ uri: img }} style={{ width: 56, height: 56 }} contentFit="cover" /> : <ImageOff color={c.muted} size={20} />}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText variant="label" numberOfLines={1}>{item.name || "Untitled"}</AppText>
        {priceLine ? <AppText variant="caption" tone="ink2" numberOfLines={1}>{priceLine}</AppText> : null}
        {validLine ? <AppText variant="caption" tone={ended ? "bad" : "muted"} numberOfLines={1}>{validLine}</AppText> : null}
      </View>
      <ChevronRight color={c.muted} size={18} />
    </Pressable>
  );
}
