/**
 * View shortcuts — 1 (My PRs), 2 (Reviews), derived from VIEW_DEFS
 */

import { useAtomSet } from "@effect/atom-react";
import { useMemo } from "react";
import { closedGroupsAtom } from "../atoms/groups.js";
import { selectedNavIndexAtom } from "../atoms/selection.js";
import { viewModeAtom, type ViewMode } from "../atoms/view.js";
import { VIEW_DEFS } from "../lib/viewDefs.js";
import type { ShortcutDef } from "../lib/shortcuts.js";

export function useViewShortcuts(): ShortcutDef[] {
  const setViewMode = useAtomSet(viewModeAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);
  const setClosedGroups = useAtomSet(closedGroupsAtom);

  return useMemo(() =>
    VIEW_DEFS.map((def) => ({
      keys: def.shortcutKey,
      label: def.label,
      group: "Views",
      action: () => {
        setViewMode(def.id as ViewMode);
        setSelectedNavIndex(-1);
        setClosedGroups(() => new Set());
      },
    })),
  []);
}
