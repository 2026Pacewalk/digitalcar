import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/* Images for the card, prepared the way the website prepares them: cropped on
   the phone where it helps, resized, and stored in the card as data URLs.

     photo    square crop, 800 px, JPEG   (shown in a circle)
     logo     free crop, 800 px, PNG (WebP if heavy) — keeps transparency
     product  square crop, 800 px, JPEG   (service tiles are 1:1)
     gallery  no crop, several at once, 1200 px, JPEG
     qr       free crop, 900 px, PNG (JPEG if heavy) — stays sharp to scan */

export type ImageKind = "photo" | "logo" | "product" | "gallery" | "qr";
export type PickSource = "camera" | "library";

export type PickResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: "cancelled" | "denied" | "error"; message?: string };
export type PickManyResult =
  | { ok: true; dataUrls: string[]; skipped: number }
  | { ok: false; reason: "cancelled" | "denied" | "error"; message?: string };

const SPEC: Record<ImageKind, { edge: number; crop: "square" | "free" | "none"; format: "jpeg" | "png" }> = {
  photo: { edge: 800, crop: "square", format: "jpeg" },
  logo: { edge: 800, crop: "free", format: "png" },
  product: { edge: 800, crop: "square", format: "jpeg" },
  gallery: { edge: 1200, crop: "none", format: "jpeg" },
  qr: { edge: 900, crop: "free", format: "png" },
};

const MAX_BYTES = 700_000; // keeps the card light on mobile data
const bytes = (b64: string) => b64.length * 0.75;

async function prepare(asset: ImagePicker.ImagePickerAsset, kind: ImageKind): Promise<string | null> {
  const spec = SPEC[kind];
  const context = ImageManipulator.manipulate(asset.uri);
  const longest = Math.max(asset.width || 0, asset.height || 0);
  if (longest > spec.edge) {
    context.resize(asset.width >= asset.height ? { width: spec.edge, height: null } : { width: null, height: spec.edge });
  }
  const rendered = await context.renderAsync();

  if (spec.format === "jpeg") {
    let saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.84, base64: true });
    if (saved.base64 && bytes(saved.base64) > MAX_BYTES) saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
  }
  // PNG keeps transparency (logos) and crisp edges (QR codes); fall back when heavy.
  const png = await rendered.saveAsync({ format: SaveFormat.PNG, base64: true });
  if (png.base64 && bytes(png.base64) <= MAX_BYTES) return `data:image/png;base64,${png.base64}`;
  const fallback = kind === "logo"
    ? await rendered.saveAsync({ format: SaveFormat.WEBP, compress: 0.9, base64: true })
    : await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.92, base64: true });
  if (!fallback.base64) return null;
  return `data:image/${kind === "logo" ? "webp" : "jpeg"};base64,${fallback.base64}`;
}

async function launch(kind: ImageKind, source: PickSource, many: number) {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { denied: true as const };
  }
  const spec = SPEC[kind];
  const multiple = many > 1 && source === "library";
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    // Cropping several images at once isn't supported, and the web has no crop UI.
    allowsEditing: !multiple && spec.crop !== "none" && Platform.OS !== "web",
    ...(spec.crop === "square" ? { aspect: [1, 1] as [number, number] } : {}),
    ...(multiple ? { allowsMultipleSelection: true, selectionLimit: many, orderedSelection: true } : {}),
    quality: 1,
  };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return { result };
}

const DENIED = "Allow camera access for DigitalCarda in your phone's Settings to take a photo.";

export async function pickCardImage(kind: ImageKind, source: PickSource): Promise<PickResult> {
  try {
    const opened = await launch(kind, source, 1);
    if ("denied" in opened) return { ok: false, reason: "denied", message: DENIED };
    const { result } = opened;
    if (result.canceled || !result.assets?.[0]) return { ok: false, reason: "cancelled" };
    const dataUrl = await prepare(result.assets[0], kind);
    if (!dataUrl) return { ok: false, reason: "error", message: "Couldn't read that image. Try another one." };
    if (bytes(dataUrl) > MAX_BYTES * 1.5) return { ok: false, reason: "error", message: "That image is too large. Try a smaller one." };
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, reason: "error", message: "Couldn't open that image. Try another one." };
  }
}

/** Several gallery photos at once (library), or one from the camera. */
export async function pickCardImages(kind: ImageKind, source: PickSource, max: number): Promise<PickManyResult> {
  try {
    const opened = await launch(kind, source, Math.max(1, max));
    if ("denied" in opened) return { ok: false, reason: "denied", message: DENIED };
    const { result } = opened;
    if (result.canceled || !result.assets?.length) return { ok: false, reason: "cancelled" };
    const dataUrls: string[] = [];
    let skipped = 0;
    for (const asset of result.assets.slice(0, max)) {
      try {
        const url = await prepare(asset, kind);
        if (url && bytes(url) <= MAX_BYTES * 1.5) dataUrls.push(url); else skipped++;
      } catch { skipped++; }
    }
    skipped += Math.max(0, result.assets.length - max);
    if (!dataUrls.length) return { ok: false, reason: "error", message: "Couldn't read those images. Try different ones." };
    return { ok: true, dataUrls, skipped };
  } catch {
    return { ok: false, reason: "error", message: "Couldn't open your photos. Try again." };
  }
}
