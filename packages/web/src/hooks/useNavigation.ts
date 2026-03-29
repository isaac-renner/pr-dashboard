/**
 * Navigation hook — j/k movement, selection clamping, sidebar auto-close.
 */

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useEffect } from "react";
import { navItemsAtom } from "../atoms/derived.js";
import { selectedNavIndexAtom, sidebarOpenAtom } from "../atoms/selection.js";
import type { NavItem } from "../lib/types.js";

export function useNavigation(opts: { blocked: boolean }) {
  const navItems = useAtomValue(navItemsAtom);
  const selectedNavIndex = useAtomValue(selectedNavIndexAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useAtomSet(sidebarOpenAtom);

  // Clamp selection when navItems changes
  useEffect(() => {
    if (selectedNavIndex >= navItems.length) {
      setSelectedNavIndex(Math.max(navItems.length - 1, -1));
    }
  }, [navItems.length, selectedNavIndex, setSelectedNavIndex]);

  // Close sidebar only when selection is fully cleared
  useEffect(() => {
    if (selectedNavIndex === -1 && sidebarOpen) setSidebarOpen(false);
  }, [selectedNavIndex, sidebarOpen, setSidebarOpen]);

  function moveSelection(delta: number) {
    if (opts.blocked) return;
    if (navItems.length === 0) return;
    if (delta < 0 && selectedNavIndex <= 0) {
      setSelectedNavIndex(-1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const next = selectedNavIndex === -1
      ? (delta > 0 ? 0 : navItems.length - 1)
      : Math.max(0, Math.min(selectedNavIndex + delta, navItems.length - 1));
    setSelectedNavIndex(next);
  }

  const selectedItem: NavItem | null = selectedNavIndex >= 0 ? navItems[selectedNavIndex] ?? null : null;

  return { navItems, selectedNavIndex, setSelectedNavIndex, moveSelection, selectedItem };
}
