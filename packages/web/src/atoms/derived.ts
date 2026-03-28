/**
 * Derived atoms — filtering, bucketing, grouping.
 *
 * All computed client-side from prsAtom + filtersAtom.
 * Filter changes = instant recompute, zero network.
 */

import * as Atom from "effect/unstable/reactivity/Atom"
import { prsAtom } from "./prs.js"
import { filtersAtom } from "./filters.js"
import { filterPRs, bucketize } from "../lib/filters.js"
import type { PR, Buckets } from "../lib/types.js"

// --- Filtered PRs ---

export const filteredPrsAtom: Atom.Atom<PR[]> = Atom.make((get) => {
  const prs = get(prsAtom)
  const filters = get(filtersAtom)
  return filterPRs(prs, filters)
})

// --- Bucketed PRs ---

export const bucketedPrsAtom: Atom.Atom<Buckets> = Atom.make((get) => {
  const filtered = get(filteredPrsAtom)
  return bucketize(filtered)
})
