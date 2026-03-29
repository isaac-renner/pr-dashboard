/**
 * Declarative view definitions.
 *
 * Each view is a config object. The status bar, shortcuts, and data
 * pipeline all derive from this. Adding a new view = adding an entry.
 */

import * as Atom from "effect/unstable/reactivity/Atom";
import { prsAtom, reviewRequestedAtom } from "../atoms/prs.js";
import type { PR } from "./types.js";

export interface ViewDef {
  /** Unique identifier */
  readonly id: string;
  /** Display label for the status bar */
  readonly label: string;
  /** Shortcut key (e.g. "1", "2") */
  readonly shortcutKey: string;
  /** Atom providing the source PR list for this view */
  readonly sourceAtom: Atom.Atom<ReadonlyArray<PR>>;
}

export const VIEW_DEFS: ReadonlyArray<ViewDef> = [
  {
    id: "my-prs",
    label: "MY PRS",
    shortcutKey: "1",
    sourceAtom: prsAtom,
  },
  {
    id: "reviews",
    label: "REVIEWS",
    shortcutKey: "2",
    sourceAtom: reviewRequestedAtom,
  },
];
