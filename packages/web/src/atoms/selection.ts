/**
 * Row selection — tracks which PR is selected via j/k navigation.
 * null means no selection. Stores the PR url for stable identity.
 */

import * as Atom from "effect/unstable/reactivity/Atom";

export const selectedUrlAtom: Atom.Writable<string | null> = Atom.make(null as string | null);
