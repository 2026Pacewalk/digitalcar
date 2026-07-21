import { createContext, useContext } from "react";

interface SidebarContextType {
  toggleMenu: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  toggleMenu: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}
