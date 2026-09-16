/*
 * "Continue with Google" — Google's own button (Google Identity Services).
 *
 * Google renders the button and runs the account picker in a popup, then hands
 * us an ID token. We post that token to auth.google, which verifies it on the
 * server and signs the person in (or creates their account). Nothing is trusted
 * in the browser.
 *
 * The button only exists when the server has GOOGLE_CLIENT_ID set — pages ask
 * useGoogleClientId() and render nothing (not a "coming soon" button) without it.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

export type GoogleSignInResult = {
  token: string;
  created: boolean;
  user: { id: number; email: string; fullName: string; role: string; status: string; avatar: string | null };
  /** The live card link the server created for a brand-new account. */
  cardSlug?: string | null;
};

type GsiId = {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};

declare global {
  interface Window { google?: { accounts?: { id?: GsiId } } }
}

let gsiScript: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return (gsiScript ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { gsiScript = null; reject(new Error("Google sign-in script failed to load")); };
    document.head.appendChild(s);
  }));
}

/** The Google Client ID when Google sign-in is switched on, otherwise null. */
export function useGoogleClientId(): string | null {
  const { data } = trpc.auth.googleConfig.useQuery(undefined, { staleTime: Infinity, retry: false });
  return data?.clientId ?? null;
}

export default function GoogleSignInButton({ clientId, mode, referralCode, promo, card, onSignedIn }: {
  clientId: string;
  mode: "signup" | "signin";
  referralCode?: string;
  /** Free-trial voucher to record for a brand-new account (server-validated). */
  promo?: string;
  /** Design / content chosen before signing up, for a brand-new account's card. */
  card?: Record<string, unknown>;
  onSignedIn: (result: GoogleSignInResult) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const google = trpc.auth.google.useMutation();

  // Google keeps the callback from the first render; read current props from here.
  const latest = useRef({ referralCode, promo, card, onSignedIn, mutate: google.mutateAsync });
  latest.current = { referralCode, promo, card, onSignedIn, mutate: google.mutateAsync };

  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then(() => {
        const id = window.google?.accounts?.id;
        if (cancelled || !box.current || !id) return;
        id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          context: mode === "signup" ? "signup" : "signin",
          callback: async ({ credential }: { credential?: string }) => {
            if (!credential) return;
            try {
              const res = await latest.current.mutate({
                credential,
                referralCode: latest.current.referralCode || undefined,
                promo: latest.current.promo || undefined,
                // Loosely typed here; the server validates every key and drops
                // anything invalid rather than failing the sign-in.
                card: (latest.current.card || undefined) as never,
              });
              latest.current.onSignedIn(res);
            } catch (err) {
              const msg = err instanceof Error ? err.message : "";
              toast.error(msg && !msg.trim().startsWith("[") ? msg : "Google sign-in failed. Please try again or use email.");
            }
          },
        });
        // Google's button takes a fixed pixel width (200–400).
        const width = Math.max(200, Math.min(400, Math.round(box.current.getBoundingClientRect().width)));
        box.current.innerHTML = "";
        id.renderButton(box.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          logo_alignment: "center",
          text: mode === "signup" ? "signup_with" : "continue_with",
          width,
        });
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [clientId, mode]);

  if (failed) {
    return <p className="text-center text-xs text-[#94A3B8]">Google sign-in couldn't load here — please use email below.</p>;
  }

  return (
    <div className="relative">
      <div ref={box} className="flex min-h-[44px] w-full justify-center" />
      {google.isPending && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-white/90 text-sm font-semibold text-[#334155]" role="status">
          <Loader2 size={16} className="animate-spin" /> Signing you in…
        </div>
      )}
    </div>
  );
}
