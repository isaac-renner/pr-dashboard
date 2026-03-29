/**
 * Group-by shortcuts — g r, g k, g s, g n
 */

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useMemo } from "react";
import { groupAtom } from "../atoms/filters.js";
import type { ShortcutDef } from "../lib/shortcuts.js";

export function useGroupShortcuts(): ShortcutDef[] {
  const setGroup = useAtomSet(groupAtom);

  return useMemo(() => [
    { keys: "g r", label: "Repo", action: () => setGroup(Option.some("repo")), group: "Group by" },
    { keys: "g k", label: "Ticket", action: () => setGroup(Option.some("ticket")), group: "Group by" },
    { keys: "g s", label: "Stack", action: () => setGroup(Option.some("stack")), group: "Group by" },
    { keys: "g v", label: "Review", action: () => setGroup(Option.some("review")), group: "Group by" },
    { keys: "g p", label: "Pipeline", action: () => setGroup(Option.some("pipeline")), group: "Group by" },
    { keys: "g n", label: "None", action: () => setGroup(Option.some("none")), group: "Group by" },
  ], []);
}
