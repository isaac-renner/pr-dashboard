/**
 * View mode — which list is active.
 */

import * as Atom from "effect/unstable/reactivity/Atom";

export type ViewMode = "my-prs" | "reviews";

export const viewModeAtom: Atom.Writable<ViewMode> = Atom.make("my-prs" as ViewMode);
