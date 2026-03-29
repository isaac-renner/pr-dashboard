/**
 * Declarative filter definitions.
 *
 * Each filter is a config object. FilterBar renders from this array.
 * Adding a new filter = adding an entry here. Shortcuts, chips, and
 * active tags all derive from this.
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { availableReposAtom, availableTicketsAtom } from "../atoms/derived.js";
import { selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom, selectedTicketsAtom } from "../atoms/filters.js";
import { getReviewLabel, REVIEW_OPTIONS, type PR } from "./types.js";

export interface FilterDef {
  /** Unique identifier */
  readonly id: string;
  /** Display label for the popover trigger */
  readonly label: string;
  /** Atom providing available options */
  readonly optionsAtom: Atom.Atom<ReadonlyArray<string>>;
  /** Atom storing current selection */
  readonly selectedAtom: Atom.Writable<ReadonlyArray<string>>;
  /** Shortcut suffix — becomes "f {key}" */
  readonly shortcutKey: string;
  /** Filter predicate — return true to include the PR */
  readonly match: (pr: PR, selected: ReadonlyArray<string>) => boolean;
}

// Static options as atoms
const reviewOptionsAtom: Atom.Atom<ReadonlyArray<string>> = Atom.make([...REVIEW_OPTIONS] as ReadonlyArray<string>).pipe(Atom.keepAlive);
const pipelineOptionsAtom: Atom.Atom<ReadonlyArray<string>> = Atom.make(["Passing", "Failing", "Pending", "None"] as ReadonlyArray<string>).pipe(Atom.keepAlive);

export const FILTER_DEFS: ReadonlyArray<FilterDef> = [
  {
    id: "repos",
    label: "Repos",
    optionsAtom: availableReposAtom,
    selectedAtom: selectedReposAtom,
    shortcutKey: "r",
    match: (pr, selected) =>
      selected.length === 0 || selected.includes(pr.repository.name),
  },
  {
    id: "review",
    label: "Review",
    optionsAtom: reviewOptionsAtom,
    selectedAtom: selectedReviewsAtom,
    shortcutKey: "v",
    match: (pr, selected) =>
      selected.length === 0 || selected.includes(getReviewLabel(pr)),
  },
  {
    id: "ticket",
    label: "Ticket",
    optionsAtom: availableTicketsAtom,
    selectedAtom: selectedTicketsAtom,
    shortcutKey: "t",
    match: (pr, selected) =>
      selected.length === 0 || selected.includes(pr.jiraTicket ?? "No ticket"),
  },
  {
    id: "pipeline",
    label: "Pipeline",
    optionsAtom: pipelineOptionsAtom,
    selectedAtom: selectedPipelinesAtom,
    shortcutKey: "p",
    match: (pr, selected) => {
      if (selected.length === 0) return true;
      const label = pr.pipelineState === "SUCCESS" ? "Passing"
        : pr.pipelineState === "FAILURE" ? "Failing"
        : pr.pipelineState === "PENDING" ? "Pending"
        : "None";
      return selected.includes(label);
    },
  },
];
