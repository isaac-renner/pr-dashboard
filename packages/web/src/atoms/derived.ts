/**
 * Derived atoms — filtering, grouping, and display order.
 *
 * All computed client-side from prsAtom + filtersAtom.
 * Filter changes = instant recompute, zero network.
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { extractRepos, extractTickets, filterPRs, groupByRepo, groupByStack, groupByTicket } from "../lib/filters.js";
import type { PR } from "../lib/types.js";
import { filtersAtom } from "./filters.js";
import { closedGroupsAtom } from "./groups.js";
import { prsAtom } from "./prs.js";

// --- Available repos (derived from all PRs) ---

export const availableReposAtom: Atom.Atom<string[]> = Atom.make((get) => {
  const prs = get(prsAtom);
  return extractRepos(prs);
});

// --- Available tickets ---

export const availableTicketsAtom: Atom.Atom<string[]> = Atom.make((get) => {
  const prs = get(prsAtom);
  return extractTickets(prs);
});

// --- Filtered PRs ---

export const filteredPrsAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const prs = get(prsAtom);
  const filters = get(filtersAtom);
  return filterPRs(prs, filters);
});

// --- Grouped PRs (shared between display order and PRList) ---

export const groupedPrsAtom: Atom.Atom<Map<string, PR[]>> = Atom.make((get) => {
  const filtered = get(filteredPrsAtom);
  const filters = get(filtersAtom);

  if (filters.group === "none") {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return new Map([["__all__", sorted]]);
  }

  return filters.group === "stack"
    ? groupByStack(filtered)
    : filters.group === "ticket"
    ? groupByTicket(filtered)
    : groupByRepo(filtered);
});

// --- Display-ordered PRs (matches visual order, skips collapsed groups) ---
// This is the canonical order for j/k navigation.

export const displayOrderAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const grouped = get(groupedPrsAtom);
  const closedGroups = get(closedGroupsAtom);

  const ordered: PR[] = [];
  for (const [name, prs] of grouped) {
    if (closedGroups.has(name)) continue;
    const sorted = [...prs].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    ordered.push(...sorted);
  }
  return ordered;
});
