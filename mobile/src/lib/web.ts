import { useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import { SITE_URL } from "./config";
import { trpc } from "./trpc";

/* Opens a website dashboard page (plan checkout, NFC orders, email signature…)
   already signed in: the app asks the server for a one-time link, so the owner
   isn't asked for their password again in the browser. If that fails, the
   plain page opens and the website asks them to sign in. */
export function useOpenDashboard() {
  const utils = trpc.useUtils();
  return useCallback(async (path: `/dashboard${string}`) => {
    let url = `${SITE_URL}${path}`;
    try {
      url = (await utils.client.mobile.webLink.mutate({ next: path })).url;
    } catch { /* open the plain page instead */ }
    await WebBrowser.openBrowserAsync(url);
  }, [utils]);
}
