/**
 * Selection atoms.
 *
 * selectedNavIndexAtom: which item in navItemsAtom is focused (-1 = none)
 * selectedPRAtom: derived — the PR if a PR row is selected
 * selectedGroupNameAtom: derived — the group name if a group header is selected
 * sidebarOpenAtom: whether the detail sidebar is visible
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { displayOrderAtom, groupedPrsAtom, navItemsAtom } from "./derived.js";
import type { PR } from "../lib/types.js";

export const selectedNavIndexAtom: Atom.Writable<number> = Atom.make(-1);

export const sidebarOpenAtom: Atom.Writable<boolean> = Atom.make(false);

export const selectedItemAtom = Atom.make((get) => {
  const idx = get(selectedNavIndexAtom);
  if (idx < 0) return null;
  const items = get(navItemsAtom);
  return items[idx] ?? null;
});

export const selectedPRAtom: Atom.Atom<PR | null> = Atom.make((get) => {
  const item = get(selectedItemAtom);
  if (!item || item._tag !== "pr") return null;
  return item.pr;
});

export const selectedGroupNameAtom: Atom.Atom<string | null> = Atom.make((get) => {
  const item = get(selectedItemAtom);
  if (!item) return null;
  if (item._tag === "group") return item.name;
  // If a PR row is selected, find its parent group
  if (item._tag === "pr") {
    const grouped = get(groupedPrsAtom);
    for (const [name, prs] of grouped) {
      if (prs.some((pr) => pr.url === item.pr.url)) return name;
    }
  }
  return null;
});

// Compat: expose selected URL for PRRow highlighting
export const selectedUrlAtom: Atom.Atom<string | null> = Atom.make((get) => {
  const pr = get(selectedPRAtom);
  return pr?.url ?? null;
});
