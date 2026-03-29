/**
 * Declarative filter definitions.
 *
 * Each filter is a config object. FilterBar renders from this array.
 *
 * The match predicates are pure functions — no atom imports needed.
 * Options and selected atoms are registered separately in atoms/filterRegistry.ts
 * to avoid circular dependencies.
 */

import { getReviewLabel, REVIEW_OPTIONS, type PR } from "./types.js";

export interface FilterDef {
  readonly id: string;
  readonly label: string;
  readonly shortcutKey: string;
  readonly match: (pr: PR, selected: ReadonlyArray<string>) => boolean;
  /** Static options (for filters that don't derive from data) */
  readonly staticOptions?: ReadonlyArray<string> | undefined;
}

export const FILTER_DEFS: ReadonlyArray<FilterDef> = [
  {
    id: "repos",
    label: "Repos",
    shortcutKey: "r",
    match: (pr, selected) =>
      selected.length === 0 || selected.includes(pr.repository.name),
  },
  {
    id: "review",
    label: "Review",
    shortcutKey: "v",
    staticOptions: [...REVIEW_OPTIONS],
    match: (pr, selected) =>
      selected.length === 0 || selected.includes(getReviewLabel(pr)),
  },
  {
    id: "ticket",
    label: "Ticket",
    shortcutKey: "t",
    match: (pr, selected) =>
      selected.length === 0 || selected.includes(pr.jiraTicket ?? "No ticket"),
  },
  {
    id: "pipeline",
    label: "Pipeline",
    shortcutKey: "p",
    staticOptions: ["Passing", "Failing", "Pending", "None"],
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
