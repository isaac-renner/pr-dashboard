/**
 * Derived atoms — filtering, bucketing, grouping.
 *
 * All computed client-side from prsAtom + filtersAtom.
 * Filter changes = instant recompute, zero network.
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { bucketize, extractRepos, filterPRs } from "../lib/filters.js";
import type { Buckets, PR } from "../lib/types.js";
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

// --- Bucketed PRs ---

export const bucketedPrsAtom: Atom.Atom<Buckets> = Atom.make((get) => {
  const filtered = get(filteredPrsAtom);
  return bucketize(filtered);
});
