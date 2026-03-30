/**
 * PR data atoms.
 *
 * prsAtom: async atom that fetches from /api/prs on mount.
 * lastRefreshedAtom: derived from prsAtom response.
 * refreshAtom: callable atom that triggers POST /api/refresh then re-fetches.
 *
 * An SSE connection to /api/events streams incremental updates (upserted /
 * removed) so the UI stays fresh without polling.
 */

import { Data } from "effect";
import * as Effect from "effect/Effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import type { PR } from "../lib/types.js";

// --- Errors ---

class FetchPrsError extends Data.TaggedError("FetchPrsError")<{
  readonly cause: unknown;
}> {}

class RefreshError extends Data.TaggedError("RefreshError")<{
  readonly cause: unknown;
}> {}

// --- API response shape ---
interface PrsApiResponse {
  prs: PR[];
  reviewRequested: PR[];
  lastRefreshed: string | null;
}

// --- Source atom: fetches all PRs ---
export const prsResponseAtom = Atom.make(
  Effect.gen(function*() {
    const res = yield* Effect.tryPromise({
      try: () => fetch("/api/prs"),
      catch: (cause) => new FetchPrsError({ cause }),
    });
    if (!res.ok) {
      return yield* new FetchPrsError({ cause: `HTTP ${res.status}` });
    }
    const data: PrsApiResponse = yield* Effect.tryPromise({
      try: () => res.json() as Promise<PrsApiResponse>,
      catch: (cause) => new FetchPrsError({ cause }),
    });
    return data;
  }),
).pipe(Atom.keepAlive);

// --- Derived: just the PR array ---
export const prsAtom = Atom.map(prsResponseAtom, (result) => {
  if (result._tag === "Success") return result.value.prs;
  return [] as PR[];
});

// --- Derived: review-requested PRs ---
export const reviewRequestedAtom = Atom.map(prsResponseAtom, (result) => {
  if (result._tag === "Success") return result.value.reviewRequested;
  return [] as PR[];
});

// --- Refresh: POST /api/refresh then re-fetch ---
export const refreshAtom = Atom.fn((_: void, ctx) =>
  Effect.gen(function*() {
    yield* Effect.tryPromise({
      try: () => fetch("/api/refresh", { method: "POST" }),
      catch: (cause) => new RefreshError({ cause }),
    });
    ctx.refresh(prsResponseAtom);
  })
);

// ---------------------------------------------------------------------------
// SSE refresh trigger — callable atom that just re-fetches prsResponseAtom
// ---------------------------------------------------------------------------

export const sseRefreshAtom = Atom.fn((_: void, ctx) =>
  Effect.sync(() => {
    ctx.refresh(prsResponseAtom);
  })
);
