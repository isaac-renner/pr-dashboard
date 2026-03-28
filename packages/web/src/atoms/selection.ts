/**
 * Row selection atom — tracks which PR row is focused via j/k navigation.
 * -1 means no selection.
 */

import * as Atom from "effect/unstable/reactivity/Atom";

export const selectedIndexAtom: Atom.Writable<number> = Atom.make(-1);
