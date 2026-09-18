import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { ArrowDownToLine, Sparkles } from "lucide-react-native";
import { AppText, Button, Card, EmptyState } from "~/components/ui";
import { useRefreshCard } from "~/lib/card";
import { cardUrl } from "~/lib/config";
import { displayUrl } from "~/lib/format";
import { trpc } from "~/lib/trpc";
import { useOpenDashboard } from "~/lib/web";
import { space, useTheme } from "~/theme";

/* Shown when the account has no card the app can open yet.

   · A card made on DigitalCarda's older system: the website moves it into the
     current format the first time its dashboard opens, so the app opens the
     dashboard (signed in) and looks again when the owner comes back.
   · No card at all: create one on the website. */
export function NoCardYet() {
  const { c } = useTheme();
  const openDashboard = useOpenDashboard();
  const refresh = useRefreshCard();
  const legacy = trpc.mobile.legacyCard.useQuery(undefined, { retry: false });
  const [waiting, setWaiting] = useState(false);
  const [checking, setChecking] = useState(false);
  const waitingRef = useRef(false);

  // Back from the website: check whether the card has arrived.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && waitingRef.current) void check();
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const check = async () => {
    setChecking(true);
    try { await refresh(); } finally { setChecking(false); }
  };

  if (legacy.data) {
    return (
      <Card style={{ gap: space.md }}>
        <EmptyState
          icon={<ArrowDownToLine color={c.accentText} size={32} />}
          title="Bring your card into the app"
          body={`Your card${legacy.data.slug ? ` at ${displayUrl(cardUrl(legacy.data.slug))}` : ""} was made on our older system. Open it once on the website and it moves here — your link, QR code and details stay the same.`}
          action={<Button title="Open it on the website" onPress={() => {
            waitingRef.current = true; setWaiting(true);
            void openDashboard("/dashboard");
          }} />}
        />
        {waiting ? (
          <>
            <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
              Give the website a few seconds to load, then come back here.
            </AppText>
            <Button kind="secondary" title="I'm back — check again" loading={checking} onPress={() => void check()} />
          </>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <EmptyState
        icon={<Sparkles color={c.accentText} size={32} />}
        title="Let's publish your card"
        body="Your account doesn't have a published card yet. Create it on the website in about five minutes — it appears here as soon as it's live."
        action={<Button title="Create my card" onPress={() => void openDashboard("/dashboard/build")} />}
      />
    </Card>
  );
}
