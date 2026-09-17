import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/* Photo and logo for the card, prepared the same way the website does: cropped
   on the phone, resized, and stored in the card as an image data URL. */

export type ImageKind = "photo" | "logo";
export type PickSource = "camera" | "library";

export type PickResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: "cancelled" | "denied" | "error"; message?: string };

const MAX_BYTES = 700_000; // keeps the card snapshot light on mobile data

export async function pickCardImage(kind: ImageKind, source: PickSource): Promise<PickResult> {
  try {
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: "denied", message: "Allow camera access for DigitalCarda in your phone's Settings to take a photo." };
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: Platform.OS !== "web",
      // A photo is shown in a circle, so crop it square; logos keep their shape.
      ...(kind === "photo" ? { aspect: [1, 1] as [number, number] } : {}),
      quality: 1,
    };
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return { ok: false, reason: "cancelled" };
    const asset = result.assets[0];

    const context = ImageManipulator.manipulate(asset.uri);
    const longest = Math.max(asset.width || 0, asset.height || 0);
    if (longest > 800) {
      context.resize(asset.width >= asset.height ? { width: 800, height: null } : { width: null, height: 800 });
    }
    const rendered = await context.renderAsync();

    // Photos: JPEG. Logos: PNG to keep transparency, WebP if that's too heavy.
    let saved = await rendered.saveAsync(kind === "photo"
      ? { format: SaveFormat.JPEG, compress: 0.86, base64: true }
      : { format: SaveFormat.PNG, base64: true });
    let mime = kind === "photo" ? "image/jpeg" : "image/png";
    if (kind === "logo" && (saved.base64?.length ?? 0) * 0.75 > MAX_BYTES) {
      saved = await rendered.saveAsync({ format: SaveFormat.WEBP, compress: 0.9, base64: true });
      mime = "image/webp";
    }
    if (!saved.base64) return { ok: false, reason: "error", message: "Couldn't read that image. Try another one." };
    if (saved.base64.length * 0.75 > MAX_BYTES * 1.5) {
      return { ok: false, reason: "error", message: "That image is too large. Try a smaller one." };
    }
    return { ok: true, dataUrl: `data:${mime};base64,${saved.base64}` };
  } catch (e) {
    return { ok: false, reason: "error", message: "Couldn't open that image. Try another one." };
  }
}
