import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { getItem, setItem } from "~/lib/secureStorage";
import { dark, light, type Palette } from "./tokens";

export * from "./tokens";

/* Light or dark: the phone's setting by default, or the owner's own choice
   (More → Appearance), remembered on this phone. */

export type Appearance = "system" | "light" | "dark";
const KEY = "dc_appearance";

const AppearanceContext = createContext<{ appearance: Appearance; setAppearance: (a: Appearance) => void }>({
  appearance: "system", setAppearance: () => {},
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setState] = useState<Appearance>("system");
  useEffect(() => {
    void getItem(KEY).then((v) => { if (v === "light" || v === "dark") setState(v); }).catch(() => undefined);
  }, []);
  const setAppearance = useCallback((a: Appearance) => {
    setState(a);
    void setItem(KEY, a).catch(() => undefined);
  }, []);
  const value = useMemo(() => ({ appearance, setAppearance }), [appearance, setAppearance]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export const useAppearance = () => useContext(AppearanceContext);

/** The active palette. */
export function useTheme(): { c: Palette; isDark: boolean } {
  const system = useColorScheme();
  const { appearance } = useContext(AppearanceContext);
  const isDark = appearance === "system" ? system === "dark" : appearance === "dark";
  return { c: isDark ? dark : light, isDark };
}
