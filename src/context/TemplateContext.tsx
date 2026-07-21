import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { TemplateColors } from "@/data/templates";

interface TemplateState {
  selectedTemplateId: number;
  colors: TemplateColors;
  isPreviewOpen: boolean;
  previewTemplateId: number | null;
}

interface TemplateContextType extends TemplateState {
  setTemplate: (id: number) => void;
  setColors: (colors: Partial<TemplateColors>) => void;
  openPreview: (id: number) => void;
  closePreview: () => void;
  saveSelection: () => void;
}

const defaultColors: TemplateColors = {
  primary: "#F7B31C",
  secondary: "#0F172A",
  accent: "#14B8A6",
};

const TemplateContext = createContext<TemplateContextType | null>(null);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TemplateState>({
    selectedTemplateId: 1,
    colors: { ...defaultColors },
    isPreviewOpen: false,
    previewTemplateId: null,
  });

  const setTemplate = useCallback((id: number) => {
    setState((s) => ({ ...s, selectedTemplateId: id }));
  }, []);

  const setColors = useCallback((colors: Partial<TemplateColors>) => {
    setState((s) => ({ ...s, colors: { ...s.colors, ...colors } }));
  }, []);

  const openPreview = useCallback((id: number) => {
    setState((s) => ({ ...s, isPreviewOpen: true, previewTemplateId: id }));
  }, []);

  const closePreview = useCallback(() => {
    setState((s) => ({ ...s, isPreviewOpen: false, previewTemplateId: null }));
  }, []);

  const saveSelection = useCallback(() => {
    localStorage.setItem("digitalcarda_template_id", String(state.selectedTemplateId));
    localStorage.setItem("digitalcarda_template_colors", JSON.stringify(state.colors));
  }, [state.selectedTemplateId, state.colors]);

  return (
    <TemplateContext.Provider
      value={{ ...state, setTemplate, setColors, openPreview, closePreview, saveSelection }}
    >
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate() {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error("useTemplate must be used within TemplateProvider");
  return ctx;
}
