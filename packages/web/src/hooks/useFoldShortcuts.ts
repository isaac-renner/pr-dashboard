/**
 * Fold shortcuts — z o, z c, z a
 */

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useMemo } from "react";
import { groupedPrsAtom } from "../atoms/derived.js";
import { closedGroupsAtom, closeGroup } from "../atoms/groups.js";
import { selectedGroupNameAtom, selectedNavIndexAtom } from "../atoms/selection.js";
import type { ShortcutDef } from "../lib/shortcuts.js";

export function useFoldShortcuts(): ShortcutDef[] {
  const selectedGroupName = useAtomValue(selectedGroupNameAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);
  const setClosedGroups = useAtomSet(closedGroupsAtom);
  const grouped = useAtomValue(groupedPrsAtom);
  const groupedNames = useMemo(() => new Set(grouped.keys()), [grouped]);

  return useMemo(() => [
    { keys: "z o", label: "Open all groups", action: () => setClosedGroups(() => new Set()), group: "Folds" },
    {
      keys: "z c", label: "Close current group", group: "Folds",
      action: () => {
        if (selectedGroupName) {
          closeGroup(setClosedGroups, selectedGroupName);
          setSelectedNavIndex(-1);
        }
      },
    },
    {
      keys: "z a", label: "Close all groups", group: "Folds",
      action: () => { setClosedGroups(() => new Set(groupedNames)); setSelectedNavIndex(-1); },
    },
  ], [selectedGroupName, groupedNames]);
}
