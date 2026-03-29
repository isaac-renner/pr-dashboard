/**
 * Navigation shortcuts — j/k, o, p, a, i, gg, G, Enter
 */

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useMemo } from "react";
import { navItemsAtom } from "../atoms/derived.js";
import { closedGroupsAtom, toggleGroup } from "../atoms/groups.js";
import { selectedNavIndexAtom, selectedPRAtom, sidebarOpenAtom } from "../atoms/selection.js";
import { useModals } from "../contexts/ModalContext.js";
import type { ShortcutDef } from "../lib/shortcuts.js";

export function useNavigationShortcuts(): ShortcutDef[] {
  const navItems = useAtomValue(navItemsAtom);
  const selectedNavIndex = useAtomValue(selectedNavIndexAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);
  const selectedPR = useAtomValue(selectedPRAtom);
  const setSidebarOpen = useAtomSet(sidebarOpenAtom);
  const setClosedGroups = useAtomSet(closedGroupsAtom);
  const { helpOpen, actionsOpen, setActionsOpen } = useModals();

  const selectedItem = selectedNavIndex >= 0 ? navItems[selectedNavIndex] ?? null : null;

  return useMemo(() => {
    function move(delta: number) {
      if (actionsOpen || helpOpen) return;
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

    return [
      { keys: "j", label: "Move down", action: () => move(1), group: "Navigation" },
      { keys: "k", label: "Move up", action: () => move(-1), group: "Navigation" },
      { keys: "o", label: "Open PR", action: () => { if (selectedPR) window.open(selectedPR.url, "_blank"); }, group: "Navigation" },
      { keys: "p", label: "Open pipeline", action: () => { if (selectedPR?.pipelineUrl) window.open(selectedPR.pipelineUrl, "_blank"); }, group: "Navigation" },
      { keys: "a", label: "Actions", action: () => { if (selectedPR) setActionsOpen(true); }, group: "Navigation" },
      { keys: "i", label: "Toggle sidebar", action: () => setSidebarOpen((o) => !o), group: "Navigation" },
      { keys: "g g", label: "Go to top", action: () => { setSelectedNavIndex(navItems.length > 0 ? 0 : -1); window.scrollTo({ top: 0, behavior: "smooth" }); }, group: "Navigation" },
      { keys: "Shift+g", label: "Go to bottom", action: () => { setSelectedNavIndex(navItems.length > 0 ? navItems.length - 1 : -1); }, group: "Navigation" },
      {
        keys: "Enter", label: "Toggle fold / open PR", group: "Navigation",
        action: () => {
          if (selectedItem?._tag === "group") toggleGroup(setClosedGroups, selectedItem.name);
          else if (selectedPR) window.open(selectedPR.url, "_blank");
        },
      },
    ];
  }, [navItems, selectedNavIndex, selectedPR, selectedItem, helpOpen, actionsOpen]);
}
