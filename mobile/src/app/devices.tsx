import { useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Globe, Smartphone } from "lucide-react-native";
import { AppText, Banner, Card, Chip, EmptyState, Loading, Row, Screen } from "~/components/ui";
import { timeAgo } from "~/lib/format";
import { useAuth } from "~/lib/auth";
import { errorMessage, trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { space, useTheme } from "~/theme";

/* Every phone signed in to this account, with a way to sign out one you've
   lost or no longer use. */
export default function Devices() {
  const { c } = useTheme();
  const { signOut } = useAuth();
  const utils = trpc.useUtils();
  const sessions = trpc.mobile.sessions.useQuery();
  const revoke = trpc.mobile.revokeSession.useMutation({ onSuccess: () => { haptics.success(); void utils.mobile.sessions.invalidate(); } });
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  if (sessions.isLoading) return <Loading />;
  const list = sessions.data ?? [];

  const confirm = (id: number, name: string, current: boolean) => {
    const go = () => {
      setError(null);
      if (current) { void signOut(); return; }
      revoke.mutate({ id }, { onError: (e) => setError(errorMessage(e)) });
    };
    const title = current ? "Sign out of this phone?" : `Sign out ${name}?`;
    const body = current ? "You'll need your password to sign in again." : "That device loses access within a minute and stops getting enquiry alerts.";
    if (Platform.OS === "web") { if (globalThis.confirm?.(`${title} ${body}`)) go(); return; }
    Alert.alert(title, body, [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: go }]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await sessions.refetch(); } finally { setRefreshing(false); } }}>
      <AppText tone="muted">Phones signed in to your DigitalCarda app. Lost a phone? Sign it out here.</AppText>
      {error ? <Banner tone="bad" title={error} /> : null}
      {list.length ? (
        <Card padded={false}>
          {list.map((s, i) => {
            const name = s.deviceName || (s.platform === "ios" ? "iPhone" : s.platform === "android" ? "Android phone" : "Device");
            return (
              <Row
                key={s.id}
                first={i === 0}
                icon={s.platform === "web" ? <Globe color={c.accentText} size={18} /> : <Smartphone color={c.accentText} size={18} />}
                title={name}
                subtitle={`${s.current ? "This phone" : `Last used ${timeAgo(s.lastUsedAt)}`}${s.appVersion ? ` · app ${s.appVersion}` : ""}`}
                right={s.current ? <Chip label="This phone" tone="good" /> : <AppText variant="label" tone="bad">Sign out</AppText>}
                onPress={() => confirm(s.id, name, s.current)}
              />
            );
          })}
        </Card>
      ) : (
        <Card><EmptyState title="No devices" body="Phones you sign in on appear here." /></Card>
      )}
      <View style={{ paddingHorizontal: space.xs }}>
        <AppText variant="caption" tone="muted">Signing in on the website doesn't appear here — to end those sessions, change your password.</AppText>
      </View>
    </Screen>
  );
}
