/**
 * Filter registry — wires FilterDefs to their atoms.
 *
 * This file bridges lib/filterDefs.ts (pure config) with
 * the atom layer. No circular dependency because filterDefs
 * only exports pure types and match functions.
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { FILTER_DEFS, type FilterDef } from "../lib/filterDefs.js";
import { availableReposAtom, availableTicketsAtom } from "./derived.js";
import { selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom, selectedTicketsAtom } from "./filters.js";

export interface ResolvedFilter {
  readonly def: FilterDef;
  readonly optionsAtom: Atom.Atom<ReadonlyArray<string>>;
  readonly selectedAtom: Atom.Writable<ReadonlyArray<string>>;
}

const optionsMap: Record<string, Atom.Atom<ReadonlyArray<string>>> = {
  repos: availableReposAtom,
  review: Atom.make([...(FILTER_DEFS.find((d) => d.id === "review")?.staticOptions ?? [])] as ReadonlyArray<string>).pipe(Atom.keepAlive),
  ticket: availableTicketsAtom,
  pipeline: Atom.make([...(FILTER_DEFS.find((d) => d.id === "pipeline")?.staticOptions ?? [])] as ReadonlyArray<string>).pipe(Atom.keepAlive),
};

const selectedMap: Record<string, Atom.Writable<ReadonlyArray<string>>> = {
  repos: selectedReposAtom,
  review: selectedReviewsAtom,
  ticket: selectedTicketsAtom,
  pipeline: selectedPipelinesAtom,
};

export const RESOLVED_FILTERS: ReadonlyArray<ResolvedFilter> = FILTER_DEFS.map((def) => ({
  def,
  optionsAtom: optionsMap[def.id]!,
  selectedAtom: selectedMap[def.id]!,
}));
