import { create } from "zustand";

/**
 * Global command palette — minimal state.
 *
 * - `open` drives the Dialog visibility.
 * - Extra commands registered via `registerCommands` are stored here so
 *   feature modules can push their own actions without coupling to the
 *   palette UI. Returns an unregister cleanup.
 *
 * We intentionally keep this lightweight — no fuzzy scoring, no history.
 * The palette component owns rendering + cmdk filtering; this store only
 * owns state + a small extension point for later.
 */

export type PaletteCommand = {
  id: string;
  label: string;
  /** Optional group label ("Navigation", "Actions", etc.). */
  group?: string;
  /** Extra keywords to boost cmdk matching. */
  keywords?: string[];
  /** Render as a lucide icon name via parent palette. Kept as a React node. */
  icon?: React.ReactNode;
  onSelect: () => void;
};

interface CommandPaletteState {
  open: boolean;
  extraCommands: PaletteCommand[];
  setOpen: (next: boolean) => void;
  toggle: () => void;
  registerCommands: (commands: PaletteCommand[]) => () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  open: false,
  extraCommands: [],
  setOpen: (next) => set({ open: next }),
  toggle: () => set({ open: !get().open }),
  registerCommands: (commands) => {
    set((state) => ({
      extraCommands: [...state.extraCommands, ...commands],
    }));
    return () => {
      set((state) => ({
        extraCommands: state.extraCommands.filter(
          (c) => !commands.find((n) => n.id === c.id)
        ),
      }));
    };
  },
}));
