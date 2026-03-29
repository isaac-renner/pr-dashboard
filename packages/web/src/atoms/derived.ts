/**
 * Derived atoms — filtering, grouping, and display order.
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { extractRepos, extractTickets, fuzzyMatch, groupByRepo, groupByStack, groupByTicket } from "../lib/filters.js";
import { FILTER_DEFS } from "../lib/filterDefs.js";
import { filtersAtom, searchAtom, selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom, selectedTicketsAtom } from "./filters.js";
import { getReviewLabel, type NavItem, type PR } from "../lib/types.js";
import { closedGroupsAtom } from "./groups.js";
import { prsAtom, reviewRequestedAtom } from "./prs.js";
import { viewModeAtom } from "./view.js";

/** The active source list — switches based on view mode */
export const activeListAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const mode = get(viewModeAtom);
  return mode === "reviews" ? get(reviewRequestedAtom) : get(prsAtom);
});

export const availableReposAtom: Atom.Atom<string[]> = Atom.make((get) => {
  const prs = get(activeListAtom);
  return extractRepos(prs);
});

export const availableTicketsAtom: Atom.Atom<string[]> = Atom.make((get) => {
  const prs = get(activeListAtom);
  return extractTickets(prs);
});

// Selected atom lookup by filter id (avoids circular dep with filterRegistry)
const selectedAtomById: Record<string, Atom.Writable<ReadonlyArray<string>>> = {
  repos: selectedReposAtom,
  review: selectedReviewsAtom,
  ticket: selectedTicketsAtom,
  pipeline: selectedPipelinesAtom,
};

export const filteredPrsAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const prs = get(activeListAtom);
  const searchOpt = get(searchAtom);
  const search = searchOpt._tag === "Some" ? searchOpt.value : "";

  const searchableText = (pr: PR) => [
    pr.title,
    pr.headRefName,
    getReviewLabel(pr),
    pr.pipelineState === "SUCCESS" ? "Passing"
      : pr.pipelineState === "FAILURE" ? "Failing"
      : pr.pipelineState === "PENDING" ? "Pending"
      : "",
  ].join(" ");

  return prs
    .filter((pr) => {
      if (pr.state !== "OPEN") return false;
      if (search && !fuzzyMatch(search, searchableText(pr))) return false;
      return FILTER_DEFS.every((def) => {
        const selectedAtom = selectedAtomById[def.id];
        if (!selectedAtom) return true;
        return def.match(pr, [...get(selectedAtom)]);
      });
    })
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
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
