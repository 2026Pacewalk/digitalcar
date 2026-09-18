import { useState } from "react";
import { Alert, Linking, Platform, Pressable, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Camera, ImagePlus, Play, Trash2, Video, X } from "lucide-react-native";
import { AppText, Banner, Button, Card, Chip, EmptyState, Field, Loading, Screen, Segmented, SwitchRow } from "~/components/ui";
import { imageOf, useSnapshot } from "~/lib/card";
import { nextId, planLimit, sectionOn, setFields, useCardUpdate } from "~/lib/cardStore";
import { asList, parseVideo, type GalleryItem, type VideoItem } from "~/lib/cardContent";
import { pickCardImages, type PickSource } from "~/lib/images";
import { limitReached } from "~/lib/config";
import * as haptics from "~/lib/haptics";
import { radius, space, useTheme } from "~/theme";

/* Photos and videos on the card. Photos are added several at a time and saved
   straight away; videos are YouTube, Shorts or Instagram links. */

type Tab = "photos" | "videos";

export default function MediaScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "videos" ? "videos" : "photos");
  const snapshot = useSnapshot();
  const update = useCardUpdate();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const { width } = useWindowDimensions();

  if (snapshot.isLoading) return <Loading />;
  const data = snapshot.data?.data;
  if (!data) {
    return <Screen><EmptyState title="Publish your card first" body="Photos and videos appear on your live card. Publish it on digitalcarda.in, then add them here." /></Screen>;
  }

  const gallery = asList<GalleryItem>(data.gallery);
  const videos = asList<VideoItem>(data.videos);
  const gLimit = planLimit(data, "gallery"), vLimit = planLimit(data, "video");
  const galleryLayout = String(data.customer.gallery_layout ?? "").toLowerCase() === "compact" ? "compact" : "";
  const videoLayout = String(data.customer.video_layout || "stack").toLowerCase() === "swipe" ? "swipe" : "stack";

  const run = async (change: Parameters<typeof update>[0], done?: string) => {
    setError(null); setNote(null);
    const r = await update(change);
    if (!r.ok) { setError(r.message); return false; }
    if (done) setNote(done);
    return true;
  };

  /* ── Photos ── */

  const addPhotos = (source: PickSource) => {
    const room = gLimit - gallery.length;
    if (room <= 0) { setError(limitReached(gLimit, "photos")); return; }
    void (async () => {
      setBusy(true);
      try {
        const picked = await pickCardImages("gallery", source, room);
        if (!picked.ok) { if (picked.reason !== "cancelled") setError(picked.message ?? "Couldn't add those photos."); return; }
        let added = 0;
        const ok = await run((d) => {
          const list = asList<GalleryItem>(d.gallery);
          const space_ = Math.max(0, planLimit(d, "gallery") - list.length);
          const urls = picked.dataUrls.slice(0, space_);
          added = urls.length;
          if (!urls.length) return null;
          let id = nextId(list);
          return { ...d, gallery: [...list, ...urls.map((filename) => ({ id: id++, name: "Gallery photo", filename }))] };
        });
        if (ok) {
          haptics.success();
          const skipped = picked.skipped + (picked.dataUrls.length - added);
          setNote(`${added} photo${added === 1 ? "" : "s"} added${skipped ? ` · ${skipped} skipped (too large or over your plan's limit)` : ""}.`);
        }
      } finally { setBusy(false); }
    })();
  };

  const removePhoto = (item: GalleryItem) => {
    const go = () => void run((d) => ({ ...d, gallery: asList<GalleryItem>(d.gallery).filter((g) => g.id !== item.id) }), "Photo removed.");
    if (Platform.OS === "web") { if (globalThis.confirm?.("Remove this photo from your card?")) go(); return; }
    Alert.alert("Remove this photo?", "It disappears from your card.", [
      { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: go },
    ]);
  };

  /* ── Videos ── */

  const info = parseVideo(videoUrl);
  const addVideo = async () => {
    if (videos.length >= vLimit) { setError(limitReached(vLimit, "videos")); return; }
    if (!info) { setError("Paste a video link — YouTube, YouTube Shorts or Instagram."); return; }
    setBusy(true);
    const url = videoUrl.trim(), title = videoTitle.trim() || "Video";
    const ok = await run((d) => {
      const list = asList<VideoItem>(d.videos);
      if (list.length >= planLimit(d, "video")) return null;
      return { ...d, videos: [...list, { id: nextId(list), title, url }] };
    }, "Video added.");
    setBusy(false);
    if (ok) { haptics.success(); setVideoTitle(""); setVideoUrl(""); }
  };

  const removeVideo = (item: VideoItem) => {
    const go = () => void run((d) => ({ ...d, videos: asList<VideoItem>(d.videos).filter((v) => v.id !== item.id) }), "Video removed.");
    if (Platform.OS === "web") { if (globalThis.confirm?.(`Remove “${item.title}”?`)) go(); return; }
    Alert.alert("Remove this video?", item.title, [
      { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: go },
    ]);
  };

  const tile = (width - space.lg * 2 - space.sm * 2) / 3;

  return (
    <Screen refreshing={snapshot.isRefetching} onRefresh={() => void snapshot.refetch()}>
      <Segmented<Tab> value={tab} onChange={(t) => { setTab(t); setError(null); setNote(null); }} options={[
        { value: "photos", label: `Photos${gallery.length ? ` (${gallery.length})` : ""}` },
        { value: "videos", label: `Videos${videos.length ? ` (${videos.length})` : ""}` },
      ]} />

      {error ? <Banner tone="bad" title={error} /> : note ? <Banner tone="good" title={note} /> : null}

      {tab === "photos" ? (
        <>
          <Card padded={false}>
            <SwitchRow first title="Show photos on my card" subtitle={sectionOn(data, "gallery_on") ? "Visible to visitors" : "Hidden — turn on to show this section"}
              value={sectionOn(data, "gallery_on")} onChange={(v) => void run(setFields({ gallery_on: v ? 1 : 0 }))} />
          </Card>

          {gallery.length ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                {gallery.map((g) => {
                  const uri = imageOf(g.filename);
                  return (
                    <View key={g.id} style={{ width: tile, height: tile, borderRadius: radius.md, overflow: "hidden", backgroundColor: c.surfaceAlt }}>
                      {uri ? <Image source={{ uri }} style={{ width: tile, height: tile }} contentFit="cover" recyclingKey={String(g.id)} /> : null}
                      <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" hitSlop={6} onPress={() => removePhoto(g)}
                        style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(15,23,42,0.7)", alignItems: "center", justifyContent: "center" }}>
                        <X color="#fff" size={15} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>{gallery.length} of {gLimit} photos on your plan</AppText>
              <View style={{ gap: space.sm }}>
                <AppText variant="label" tone="ink2">Layout on your card</AppText>
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <Chip label="Full width" selected={galleryLayout === ""} onPress={() => void run(setFields({ gallery_layout: "" }))} />
                  <Chip label="3-across grid" selected={galleryLayout === "compact"} onPress={() => void run(setFields({ gallery_layout: "compact" }))} />
                </View>
              </View>
            </>
          ) : (
            <Card>
              <EmptyState icon={<ImagePlus color={c.accentText} size={30} />} title="No photos yet" body="Show your work, your shop or your products. Pick several at once." />
            </Card>
          )}

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button style={{ flex: 1 }} title="Add photos" loading={busy} icon={<ImagePlus color={c.accentInk} size={18} />}
              onPress={() => addPhotos("library")} />
            {Platform.OS !== "web" ? (
              <Button style={{ flex: 1 }} kind="secondary" title="Camera" disabled={busy} icon={<Camera color={c.ink} size={18} />}
                onPress={() => addPhotos("camera")} />
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Card padded={false}>
            <SwitchRow first title="Show videos on my card" subtitle={sectionOn(data, "video_on") ? "Visible to visitors" : "Hidden — turn on to show this section"}
              value={sectionOn(data, "video_on")} onChange={(v) => void run(setFields({ video_on: v ? 1 : 0 }))} />
          </Card>

          <Card style={{ gap: space.md }}>
            <AppText variant="heading">Add a video</AppText>
            <Field label="Video link" value={videoUrl} onChangeText={(v) => { setVideoUrl(v); setError(null); }} placeholder="YouTube, Shorts or Instagram link"
              autoCapitalize="none" autoCorrect={false} keyboardType="url"
              hint={videoUrl.trim() ? (info ? `${info.provider === "youtube" ? "YouTube" : info.provider === "instagram" ? "Instagram" : "Web"} link — ready to add` : "That doesn't look like a video link yet") : undefined} />
            <Field label="Title (optional)" value={videoTitle} onChangeText={setVideoTitle} placeholder="e.g. Our showroom tour" />
            <Button title="Add video" loading={busy} disabled={!videoUrl.trim()} icon={<Video color={c.accentInk} size={18} />} onPress={() => void addVideo()} />
            <AppText variant="caption" tone="muted">{videos.length} of {vLimit} videos on your plan</AppText>
          </Card>

          {videos.length ? (
            <>
              <Card padded={false}>
                {videos.map((v, i) => {
                  const vi = parseVideo(v.url);
                  return (
                    <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderColor: c.rule }}>
                      <Pressable accessibilityRole="link" accessibilityLabel={`Play ${v.title}`} onPress={() => void Linking.openURL(v.url)}
                        style={{ width: 96, height: 56, borderRadius: radius.sm, overflow: "hidden", backgroundColor: c.hero, alignItems: "center", justifyContent: "center" }}>
                        {vi?.thumb ? <Image source={{ uri: vi.thumb }} style={{ position: "absolute", width: 96, height: 56 }} contentFit="cover" /> : null}
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" }}>
                          <Play color="#0F172A" size={13} />
                        </View>
                      </Pressable>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText variant="label" numberOfLines={2}>{v.title || "Video"}</AppText>
                        <AppText variant="caption" tone="muted" numberOfLines={1}>{vi?.provider === "instagram" ? "Instagram" : vi?.provider === "youtube" ? "YouTube" : v.url}</AppText>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${v.title}`} hitSlop={8} onPress={() => removeVideo(v)}>
                        <Trash2 color={c.bad} size={18} />
                      </Pressable>
                    </View>
                  );
                })}
              </Card>
              <View style={{ gap: space.sm }}>
                <AppText variant="label" tone="ink2">Layout on your card</AppText>
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <Chip label="Stacked" selected={videoLayout === "stack"} onPress={() => void run(setFields({ video_layout: "stack" }))} />
                  <Chip label="Swipe" selected={videoLayout === "swipe"} onPress={() => void run(setFields({ video_layout: "swipe" }))} />
                </View>
              </View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
