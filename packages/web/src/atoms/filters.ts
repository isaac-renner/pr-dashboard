/**
 * Filter atoms — URL-synced via Atom.searchParam.
 *
 * Each filter is its own atom backed by a URL search parameter.
 * The composite filtersAtom derives from all of them.
 */

import { Schema } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import type { Filters } from "../lib/types.js";

// --- Individual filter atoms (URL-synced via URL search params) ---
// Using Schema.String to explicitly type the searchParam atoms.

export const excludeAtom = Atom.searchParam("exclude", { schema: Schema.String });
export const repoAtom = Atom.searchParam("repo", { schema: Schema.String });
export const pipelineAtom = Atom.searchParam("pipeline", { schema: Schema.String });
export const draftsAtom = Atom.searchParam("drafts", { schema: Schema.String });
export const groupAtom = Atom.searchParam("group", { schema: Schema.String });

// --- Composite: all filters as one object ---
// searchParam with schema returns Writable<Option<string>>.
// We unwrap with getOrElse to provide defaults.

export const filtersAtom: Atom.Atom<Filters> = Atom.make((get) => {
  const getParam = (atom: typeof excludeAtom, fallback: string) => {
    const opt = get(atom);
    return opt._tag === "Some" ? opt.value : fallback;
  };

  return {
    exclude: getParam(excludeAtom, ""),
    repo: getParam(repoAtom, ""),
    pipeline: getParam(pipelineAtom, "all") as Filters["pipeline"],
    drafts: getParam(draftsAtom, "exclude") as Filters["drafts"],
    group: getParam(groupAtom, "ticket") as Filters["group"],
  };
});
