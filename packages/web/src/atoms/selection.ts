/**
 * Selection atoms.
 *
 * selectedUrlAtom: which PR row is focused (by url, null = none)
 * sidebarOpenAtom: whether the detail sidebar is visible
 * selectedPRAtom: derived — the full PR object for the selected url
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { displayOrderAtom } from "./derived.js";
import type { PR } from "../lib/types.js";

export const selectedUrlAtom: Atom.Writable<string | null> = Atom.make(null as string | null);

export const sidebarOpenAtom: Atom.Writable<boolean> = Atom.make(false);

export const selectedPRAtom: Atom.Atom<PR | null> = Atom.make((get) => {
  const url = get(selectedUrlAtom);
  if (!url) return null;
  const order = get(displayOrderAtom);
  return order.find((pr) => pr.url === url) ?? null;
});
