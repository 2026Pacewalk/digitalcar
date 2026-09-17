import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/* Session storage: the phone's keychain / keystore on iOS and Android. The web
   preview (development only) has no keychain, so it falls back to
   localStorage there. */

const isWeb = Platform.OS === "web";

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try { globalThis.localStorage?.setItem(key, value); } catch { /* storage unavailable */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try { globalThis.localStorage?.removeItem(key); } catch { /* storage unavailable */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
