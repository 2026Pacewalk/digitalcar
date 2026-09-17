import { Linking, Share } from "react-native";
import { cardUrl } from "./config";
import * as haptics from "./haptics";

/** The message people receive — short, with the link on its own line so
    WhatsApp shows the card preview. */
export const shareMessage = (slug: string, name?: string) =>
  `${name ? `${name}'s` : "My"} digital business card — save my contact in one tap:\n${cardUrl(slug)}`;

export async function shareCard(slug: string, name?: string) {
  try {
    const result = await Share.share({ message: shareMessage(slug, name), url: cardUrl(slug), title: "My digital business card" });
    if (result.action === Share.sharedAction) haptics.success();
  } catch { /* share sheet dismissed or unavailable */ }
}

/** Opens WhatsApp with the card message ready to send to any chat. wa.me hands
    over to the WhatsApp app when it's installed (no app-query permissions
    needed) and to WhatsApp Web when it isn't. */
export async function shareOnWhatsApp(slug: string, name?: string) {
  haptics.tap();
  await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMessage(slug, name))}`);
}
