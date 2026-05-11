import { create } from "zustand";
import { persist } from "zustand/middleware";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";

type Theme = "light" | "dark";

interface AppState {
  language: AppLocale;
  theme: Theme;
  sidebarOpen: boolean;
  setLanguage: (language: AppLocale) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: "en",
      theme: "light",
      sidebarOpen: true,
      setLanguage: (language) => set({ language: parseAppLocale(language) }),
      setTheme: (theme) => {
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light";
          return { theme: newTheme };
        }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "mylifeos-app-store",
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
      }),
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as Partial<AppState>;
        return {
          ...currentState,
          ...p,
          language: parseAppLocale(p.language ?? currentState.language),
        };
      },
    }
  )
);
