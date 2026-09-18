import { forwardRef, type ReactNode } from "react";
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, radius, space, useTheme } from "~/theme";
import { initials } from "~/lib/format";
import * as haptics from "~/lib/haptics";

/* ── Text ─────────────────────────────────────────────────────────────── */

type Variant = "display" | "title" | "heading" | "body" | "label" | "caption" | "overline";
const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: "uppercase" },
};

export function AppText({ variant = "body", tone = "ink", style, children, numberOfLines }: {
  variant?: Variant; tone?: "ink" | "ink2" | "muted" | "accent" | "good" | "bad" | "hero" | "heroMuted";
  style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number;
}) {
  const { c } = useTheme();
  const color = { ink: c.ink, ink2: c.ink2, muted: c.muted, accent: c.accentText, good: c.good, bad: c.bad, hero: c.heroInk, heroMuted: c.heroMuted }[tone];
  return <Text numberOfLines={numberOfLines} style={[VARIANTS[variant], { color }, style]}>{children}</Text>;
}

/* ── Screen ───────────────────────────────────────────────────────────── */

export function Screen({ children, refreshing, onRefresh, scroll = true, padded = true, edgesTop = false, contentStyle }: {
  children: ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean; padded?: boolean;
  edgesTop?: boolean; contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = { paddingHorizontal: padded ? space.lg : 0, paddingTop: (edgesTop ? insets.top : 0) + (padded ? space.md : 0), paddingBottom: space.xxl };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.ground }, pad, contentStyle]}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.ground }}
      contentContainerStyle={[pad, { gap: space.lg }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

/* ── Surfaces ─────────────────────────────────────────────────────────── */

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: c.rule, padding: padded ? space.lg : 0, overflow: "hidden" }, style]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -space.sm, paddingHorizontal: 2 }}>
      <AppText variant="overline" tone="muted">{children}</AppText>
      {action}
    </View>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────── */

type ButtonKind = "primary" | "secondary" | "ghost" | "danger";
export const Button = forwardRef<View, PressableProps & {
  title: string; kind?: ButtonKind; icon?: ReactNode; loading?: boolean; size?: "md" | "lg"; style?: StyleProp<ViewStyle>;
}>(function Button({ title, kind = "primary", icon, loading, size = "lg", disabled, onPress, style, ...rest }, ref) {
  const { c } = useTheme();
  const bg = { primary: c.accent, secondary: c.surfaceAlt, ghost: "transparent", danger: c.badWash }[kind];
  const fg = { primary: c.accentInk, secondary: c.ink, ghost: c.accentText, danger: c.bad }[kind];
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={(e) => { haptics.tap(); onPress?.(e); }}
      style={({ pressed }) => [{
        height: size === "lg" ? 52 : 42, borderRadius: radius.md, backgroundColor: bg, paddingHorizontal: space.lg,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ fontFamily: fonts.semibold, fontSize: size === "lg" ? 16 : 14, color: fg }}>{title}</Text>
    </Pressable>
  );
});

/** Square action tile, e.g. View · Edit · Share · QR on the home card. */
export function ActionTile({ icon, label, onPress, onHero }: { icon: ReactNode; label: string; onPress: () => void; onHero?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { haptics.tap(); onPress(); }}
      style={({ pressed }) => ({
        flex: 1, alignItems: "center", gap: 6, paddingVertical: space.md, borderRadius: radius.md,
        backgroundColor: onHero ? "rgba(255,255,255,0.08)" : c.surfaceAlt, opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: onHero ? c.heroInk : c.ink }}>{label}</Text>
    </Pressable>
  );
}

/* ── List rows ────────────────────────────────────────────────────────── */

export function Row({ icon, title, subtitle, right, onPress, first, tint }: {
  icon?: ReactNode; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; first?: boolean; tint?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={() => { haptics.tap(); onPress?.(); }}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 13,
        backgroundColor: pressed ? c.surfaceAlt : "transparent",
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: c.rule,
      })}
    >
      {icon ? <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tint ?? c.accentWash }}>{icon}</View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="label" numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText variant="caption" tone="muted" numberOfLines={2}>{subtitle}</AppText> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** A row with an on/off switch — e.g. whether a section shows on the card. */
export function SwitchRow({ title, subtitle, value, onChange, first, disabled }: {
  title: string; subtitle?: string; value: boolean; onChange: (next: boolean) => void; first?: boolean; disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12,
      borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: c.rule,
    }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? <AppText variant="caption" tone="muted">{subtitle}</AppText> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={(v) => { haptics.tap(); onChange(v); }}
        trackColor={{ false: c.surfaceAlt, true: c.accent }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={c.surfaceAlt}
        // react-native-web colours the "on" knob separately.
        {...(Platform.OS === "web" ? { activeThumbColor: "#FFFFFF" } : {})}
      />
    </View>
  );
}

/** Two or three mutually exclusive choices, e.g. Services | Offers. */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (next: T) => void;
}) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }}
            onPress={() => { if (!on) { haptics.tap(); onChange(o.value); } }}
            style={{ flex: 1, height: 38, borderRadius: radius.sm + 2, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.surface : "transparent" }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: on ? c.ink : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Chips & badges ───────────────────────────────────────────────────── */

export function Chip({ label, tone = "neutral", selected, onPress }: {
  label: string; tone?: "neutral" | "good" | "warn" | "bad" | "info" | "accent"; selected?: boolean; onPress?: () => void;
}) {
  const { c } = useTheme();
  const palette = {
    neutral: [c.surfaceAlt, c.ink2], good: [c.goodWash, c.good], warn: [c.warnWash, c.warn],
    bad: [c.badWash, c.bad], info: [c.infoWash, c.info], accent: [c.accentWash, c.accentText],
  }[tone];
  const bg = selected ? c.ink : palette[0];
  const fg = selected ? c.ground : palette[1];
  const body = (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: onPress ? 14 : 9, paddingVertical: onPress ? 8 : 3 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: onPress ? 13 : 11.5, color: fg }}>{label}</Text>
    </View>
  );
  if (!onPress) return body;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { haptics.tap(); onPress(); }}>{body}</Pressable>;
}

/* ── Inputs ───────────────────────────────────────────────────────────── */

export const Field = forwardRef<TextInput, TextInputProps & { label: string; hint?: ReactNode; error?: string; right?: ReactNode }>(
  function Field({ label, hint, error, style, multiline, right, ...rest }, ref) {
    const { c } = useTheme();
    return (
      <View style={{ gap: 6 }}>
        <AppText variant="label" tone="ink2">{label}</AppText>
        <View>
        <TextInput
          ref={ref}
          placeholderTextColor={c.muted}
          multiline={multiline}
          style={[{
            minHeight: multiline ? 96 : 50, borderRadius: radius.md, borderWidth: 1, borderColor: error ? c.bad : c.rule,
            backgroundColor: c.surface, color: c.ink, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 0,
            fontFamily: fonts.body, fontSize: 16, textAlignVertical: multiline ? "top" : "center",
          }, right ? { paddingRight: 64 } : null, style]}
          {...rest}
        />
        {right ? <View style={{ position: "absolute", right: 4, top: 0, bottom: 0, justifyContent: "center" }}>{right}</View> : null}
        </View>
        {error ? <AppText variant="caption" tone="bad">{error}</AppText> : hint ? (typeof hint === "string" ? <AppText variant="caption" tone="muted">{hint}</AppText> : hint) : null}
      </View>
    );
  },
);

/* ── Avatar ───────────────────────────────────────────────────────────── */

export function Avatar({ uri, name, size = 56, ring }: { uri?: string; name?: string; size?: number; ring?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: c.accent, alignItems: "center", justifyContent: "center", borderWidth: ring ? 2 : 0, borderColor: ring }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ fontFamily: fonts.heading, fontSize: size * 0.36, color: c.accentInk }}>{initials(name)}</Text>
      )}
    </View>
  );
}

/* ── States ───────────────────────────────────────────────────────────── */

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: space.xl, gap: space.sm }}>
      {icon}
      <AppText variant="heading" style={{ textAlign: "center" }}>{title}</AppText>
      {body ? <AppText tone="muted" style={{ textAlign: "center" }}>{body}</AppText> : null}
      {action ? <View style={{ marginTop: space.md, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

export function Banner({ tone = "warn", title, body, action }: { tone?: "warn" | "bad" | "info" | "good"; title: string; body?: string; action?: ReactNode }) {
  const { c } = useTheme();
  const [bg, fg] = { warn: [c.warnWash, c.warn], bad: [c.badWash, c.bad], info: [c.infoWash, c.info], good: [c.goodWash, c.good] }[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, padding: space.md, gap: 4 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: fg }}>{title}</Text>
      {body ? <AppText variant="caption" tone="ink2">{body}</AppText> : null}
      {action}
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.ground, paddingVertical: 60 }}>
      <ActivityIndicator color={c.accent} size="large" />
    </View>
  );
}
