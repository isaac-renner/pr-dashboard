/**
 * Derived atoms — filtering, grouping, and display order.
 *
 * All computed client-side from prsAtom + filtersAtom.
 * Filter changes = instant recompute, zero network.
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { extractRepos, filterPRs, groupByRepo, groupByStack, groupByTicket } from "../lib/filters.js";
import type { PR } from "../lib/types.js";
import { filtersAtom } from "./filters.js";
import { prsAtom } from "./prs.js";

// --- Available repos (derived from all PRs) ---

export const availableReposAtom: Atom.Atom<string[]> = Atom.make((get) => {
  const prs = get(prsAtom);
  return extractRepos(prs);
});

// --- Filtered PRs ---

export const filteredPrsAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const prs = get(prsAtom);
  const filters = get(filtersAtom);
  return filterPRs(prs, filters);
});

// --- Display-ordered PRs (matches visual order after grouping + sorting) ---
// This is the canonical order for j/k navigation.

export const displayOrderAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const filtered = get(filteredPrsAtom);
  const filters = get(filtersAtom);

  if (filters.group === "none") {
    return [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  const grouped = filters.group === "stack"
    ? groupByStack(filtered)
    : filters.group === "ticket"
    ? groupByTicket(filtered)
    : groupByRepo(filtered);

  // Flatten in display order: iterate groups, sort each by updatedAt desc
  const ordered: PR[] = [];
  for (const prs of grouped.values()) {
    const sorted = [...prs].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    ordered.push(...sorted);
  }
  return ordered;
});
