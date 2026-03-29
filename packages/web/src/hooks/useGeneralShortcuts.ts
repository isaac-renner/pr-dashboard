/**
 * General shortcuts — ?, Escape
 */

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useMemo } from "react";
import { selectedNavIndexAtom, sidebarOpenAtom } from "../atoms/selection.js";
import { useModals } from "../contexts/ModalContext.js";
import type { ShortcutDef } from "../lib/shortcuts.js";

export function useGeneralShortcuts(): ShortcutDef[] {
  const { helpOpen, setHelpOpen, actionsOpen, dismissTop } = useModals();
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useAtomSet(sidebarOpenAtom);
  const selectedNavIndex = useAtomValue(selectedNavIndexAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);

  return useMemo(() => [
    { keys: "?", label: "Shortcuts", action: () => setHelpOpen((o) => !o), group: "General" },
    {
      keys: "Escape",
      label: "Close / deselect",
      enableInInputs: true,
      group: "General",
      action: () => {
        // Layered dismiss: blur → modal → sidebar → deselect
        if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === "INPUT") {
          document.activeElement.blur();
          return;
        }
        if (dismissTop()) return;
        if (sidebarOpen) { setSidebarOpen(false); return; }
        if (selectedNavIndex >= 0) { setSelectedNavIndex(-1); return; }
      },
    },
  ], [helpOpen, actionsOpen, sidebarOpen, selectedNavIndex]);
}
