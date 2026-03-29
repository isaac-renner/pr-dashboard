/**
 * Shortcut context — composes all feature shortcut hooks and
 * exposes the merged shortcuts + pending chord state.
 */

import React, { createContext, useContext, useMemo } from "react";
import { useFilterShortcuts } from "../hooks/useFilterShortcuts.js";
import { useFoldShortcuts } from "../hooks/useFoldShortcuts.js";
import { useGeneralShortcuts } from "../hooks/useGeneralShortcuts.js";
import { useGroupShortcuts } from "../hooks/useGroupShortcuts.js";
import { useNavigationShortcuts } from "../hooks/useNavigationShortcuts.js";
import { useViewShortcuts } from "../hooks/useViewShortcuts.js";
import type { ShortcutDef } from "../lib/shortcuts.js";
import { useShortcuts } from "../lib/useShortcuts.js";

interface ShortcutState {
  readonly shortcuts: ReadonlyArray<ShortcutDef>;
  readonly pending: string | null;
  readonly filterInputRef: React.RefObject<HTMLInputElement | null>;
  readonly filterRefs: Record<string, React.RefObject<HTMLButtonElement | null>>;
}

const ShortcutCtx = createContext<ShortcutState | null>(null);

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const navShortcuts = useNavigationShortcuts();
  const viewShortcuts = useViewShortcuts();
  const groupShortcuts = useGroupShortcuts();
  const foldShortcuts = useFoldShortcuts();
  const { shortcuts: filterShortcuts, filterInputRef, filterRefs } = useFilterShortcuts();
  const generalShortcuts = useGeneralShortcuts();

  const allShortcuts = useMemo(
    () => [
      ...navShortcuts,
      ...viewShortcuts,
      ...groupShortcuts,
      ...foldShortcuts,
      ...filterShortcuts,
      ...generalShortcuts,
    ],
    [navShortcuts, viewShortcuts, groupShortcuts, foldShortcuts, filterShortcuts, generalShortcuts],
  );

  const pending = useShortcuts(allShortcuts);

  return (
    <ShortcutCtx.Provider value={{ shortcuts: allShortcuts, pending, filterInputRef, filterRefs }}>
      {children}
    </ShortcutCtx.Provider>
  );
}

export function useShortcutContext() {
  const ctx = useContext(ShortcutCtx);
  if (!ctx) throw new Error("useShortcutContext must be used within ShortcutProvider");
  return ctx;
}
