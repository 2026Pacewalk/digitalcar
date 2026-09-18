import { deleteItem, getItem, setItem } from "./secureStorage";

/* Set when an account is created in the app, so the first screen after
   sign-up is the welcome guide. Read once, then cleared. */
const KEY = "dc_welcome_pending";

export const markWelcomePending = () => setItem(KEY, "1");

export async function takeWelcomePending(): Promise<boolean> {
  const pending = (await getItem(KEY)) === "1";
  if (pending) await deleteItem(KEY);
  return pending;
}
