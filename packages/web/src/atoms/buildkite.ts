/**
 * Buildkite sidebar display preferences.
 */

import { Schema } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";

/** Whether to show steps blocked behind a manual gate. URL-synced. */
export const showBlockedStepsAtom = Atom.searchParam("bk-blocked", { schema: Schema.String });
