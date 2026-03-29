/**
 * Group fold state — tracks which groups are collapsed.
 * Stored as a Set of group names.
 */

import * as Atom from "effect/unstable/reactivity/Atom";

export const closedGroupsAtom: Atom.Writable<ReadonlySet<string>> = Atom.make(
  new Set<string>() as ReadonlySet<string>,
);

export function toggleGroup(set: (fn: (s: ReadonlySet<string>) => ReadonlySet<string>) => void, name: string) {
  set((current) => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    return next;
  });
}

export function closeGroup(set: (fn: (s: ReadonlySet<string>) => ReadonlySet<string>) => void, name: string) {
  set((current) => {
    if (current.has(name)) return current;
    const next = new Set(current);
    next.add(name);
    return next;
  });
}

export function openGroup(set: (fn: (s: ReadonlySet<string>) => ReadonlySet<string>) => void, name: string) {
  set((current) => {
    if (!current.has(name)) return current;
    const next = new Set(current);
    next.delete(name);
    return next;
  });
}
