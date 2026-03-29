/**
 * Filter shortcuts — /, f r, f v, f p, f t, c f
 * Auto-generated from FILTER_DEFS.
 */

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { createRef, useMemo, useRef, type RefObject } from "react";
import { RESOLVED_FILTERS } from "../atoms/filterRegistry.js";
import { searchAtom } from "../atoms/filters.js";
import { FILTER_DEFS } from "../lib/filterDefs.js";
import type { ShortcutDef } from "../lib/shortcuts.js";

interface FilterShortcutsResult {
  readonly shortcuts: ShortcutDef[];
  readonly filterInputRef: RefObject<HTMLInputElement | null>;
  readonly filterRefs: Record<string, RefObject<HTMLButtonElement | null>>;
}

export function useFilterShortcuts(): FilterShortcutsResult {
  const setSearch = useAtomSet(searchAtom);
  const filterInputRef = useRef<HTMLInputElement>(null);

  const filterRefs = useMemo(() => {
    const refs: Record<string, RefObject<HTMLButtonElement | null>> = {};
    for (const def of FILTER_DEFS) {
      refs[def.id] = createRef<HTMLButtonElement>();
    }
    return refs;
  }, []);

  // Get setters for each filter's selected atom
  const clearFns = RESOLVED_FILTERS.map((f) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const setter = useAtomSet(f.selectedAtom);
    return () => setter([]);
  });

  const shortcuts = useMemo(() => {
    const result: ShortcutDef[] = [
      { keys: "/", label: "Search", action: () => filterInputRef.current?.focus(), group: "Filters" },
    ];

    for (const def of FILTER_DEFS) {
      result.push({
        keys: `f ${def.shortcutKey}`,
        label: `${def.label} filter`,
        action: () => filterRefs[def.id]?.current?.click(),
        group: "Filters",
      });
    }

    result.push({
      keys: "c f",
      label: "Clear all filters",
      group: "Filters",
      action: () => {
        setSearch(Option.some(""));
        clearFns.forEach((fn) => fn());
      },
    });

    return result;
  }, [clearFns]);

  return { shortcuts, filterInputRef, filterRefs };
}
