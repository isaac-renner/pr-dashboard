/**
 * Selection atoms.
 *
 * selectedUrlAtom: which PR row is focused (by url, null = none)
 * sidebarOpenAtom: whether the detail sidebar is visible
 * selectedPRAtom: derived — the full PR object for the selected url
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { displayOrderAtom, groupedPrsAtom } from "./derived.js";
import type { PR } from "../lib/types.js";

export const selectedUrlAtom: Atom.Writable<string | null> = Atom.make(null as string | null);

export const sidebarOpenAtom: Atom.Writable<boolean> = Atom.make(false);

export const selectedPRAtom: Atom.Atom<PR | null> = Atom.make((get) => {
  const url = get(selectedUrlAtom);
  if (!url) return null;
  const order = get(displayOrderAtom);
  return order.find((pr) => pr.url === url) ?? null;
});

/** The group name that contains the selected PR */
export const selectedGroupAtom: Atom.Atom<string | null> = Atom.make((get) => {
  const url = get(selectedUrlAtom);
  if (!url) return null;
  const grouped = get(groupedPrsAtom);
  for (const [name, prs] of grouped) {
    if (prs.some((pr) => pr.url === url)) return name;
  }
  return null;
});
