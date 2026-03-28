/**
 * Filter atoms — URL-synced where appropriate.
 */

import { Schema } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import type { Filters } from "../lib/types.js";

// --- URL-synced atoms ---

export const searchAtom = Atom.searchParam("q", { schema: Schema.String });
export const groupAtom = Atom.searchParam("group", { schema: Schema.String });

// --- Local state: multi-select filters ---

export const selectedReposAtom: Atom.Writable<ReadonlyArray<string>> = Atom.make(
  [] as ReadonlyArray<string>,
);

export const selectedPipelinesAtom: Atom.Writable<ReadonlyArray<string>> = Atom.make(
  [] as ReadonlyArray<string>,
);

export const selectedReviewsAtom: Atom.Writable<ReadonlyArray<string>> = Atom.make(
  [] as ReadonlyArray<string>,
);

// --- Composite ---

export const filtersAtom: Atom.Atom<Filters> = Atom.make((get) => {
  const getParam = (atom: typeof searchAtom, fallback: string) => {
    const opt = get(atom);
    return opt._tag === "Some" ? opt.value : fallback;
  };

  return {
    search: getParam(searchAtom, ""),
    repos: get(selectedReposAtom),
    pipelines: get(selectedPipelinesAtom),
    reviews: get(selectedReviewsAtom),
    group: getParam(groupAtom, "ticket") as Filters["group"],
  };
});
