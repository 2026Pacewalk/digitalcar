import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/* A light tick when something registers. Silent on the web preview. */
const native = Platform.OS !== "web";

export const tap = () => { if (native) void Haptics.selectionAsync(); };
export const success = () => { if (native) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); };
export const warning = () => { if (native) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); };
