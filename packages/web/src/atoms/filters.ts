/**
 * Filter atoms — URL-synced where appropriate.
 *
 * search: fuzzy text search (URL-synced)
 * repos: multi-select repo filter (local state, not URL-synced — too noisy)
 * pipeline, drafts, group: URL-synced via searchParam
 */

import { Schema } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import type { Filters } from "../lib/types.js";

// --- URL-synced atoms ---

export const searchAtom = Atom.searchParam("q", { schema: Schema.String });
export const pipelineAtom = Atom.searchParam("pipeline", { schema: Schema.String });
export const draftsAtom = Atom.searchParam("drafts", { schema: Schema.String });
export const groupAtom = Atom.searchParam("group", { schema: Schema.String });

// --- Local state: selected repos (array, not URL-synced) ---

export const selectedReposAtom: Atom.Writable<ReadonlyArray<string>> = Atom.make(
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
    pipeline: getParam(pipelineAtom, "all") as Filters["pipeline"],
    drafts: getParam(draftsAtom, "include") as Filters["drafts"],
    group: getParam(groupAtom, "ticket") as Filters["group"],
  };
});
