/**
 * Derived atoms — filtering, grouping, and display order.
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { extractRepos, extractTickets, filterPRs, groupByRepo, groupByStack, groupByTicket } from "../lib/filters.js";
import type { NavItem, PR } from "../lib/types.js";
import { filtersAtom } from "./filters.js";
import { closedGroupsAtom } from "./groups.js";
import { prsAtom } from "./prs.js";

export const availableReposAtom: Atom.Atom<string[]> = Atom.make((get) => {
  const prs = get(prsAtom);
  return extractRepos(prs);
});

export const availableTicketsAtom: Atom.Atom<string[]> = Atom.make((get) => {
  const prs = get(prsAtom);
  return extractTickets(prs);
});

export const filteredPrsAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const prs = get(prsAtom);
  const filters = get(filtersAtom);
  return filterPRs(prs, filters);
});

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

/**
 * Navigation order — includes group headers and PR rows.
 * Closed groups appear as a single group header (navigable).
 * Open groups show header + all rows.
 * "none" mode has no headers.
 */
export const navItemsAtom: Atom.Atom<NavItem[]> = Atom.make((get) => {
  const grouped = get(groupedPrsAtom);
  const closedGroups = get(closedGroupsAtom);
  const filters = get(filtersAtom);
  const isNone = filters.group === "none";

  const items: NavItem[] = [];
  for (const [name, prs] of grouped) {
    const closed = closedGroups.has(name);

    if (!isNone) {
      items.push({ _tag: "group", name, closed });
    }

    if (!closed) {
      const sorted = [...prs].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      for (const pr of sorted) {
        items.push({ _tag: "pr", pr });
      }
    }
  }
  return items;
});

/** Flat list of visible PRs only (for sidebar, actions, etc.) */
export const displayOrderAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const items = get(navItemsAtom);
  return items.filter((i): i is NavItem & { _tag: "pr" } => i._tag === "pr").map((i) => i.pr);
});
