/**
 * PR data atoms.
 *
 * prsAtom: async atom that fetches from /api/prs on mount.
 * lastRefreshedAtom: derived from prsAtom response.
 * refreshAtom: callable atom that triggers POST /api/refresh then re-fetches.
 */

import * as Atom from "effect/unstable/reactivity/Atom"
import * as Effect from "effect/Effect"
import type { PR } from "../lib/types.js"

// --- API response shape ---
interface PrsApiResponse {
  prs: PR[]
  lastRefreshed: string | null
}

// --- Source atom: fetches all PRs ---
export const prsResponseAtom = Atom.make(
  Effect.gen(function* () {
    const res = yield* Effect.tryPromise({
      try: () => fetch("/api/prs"),
      catch: () => new Error("Failed to fetch PRs"),
    })
    if (!res.ok) {
      return yield* Effect.fail(new Error(`Failed to fetch PRs: ${res.status}`))
    }
    const data: PrsApiResponse = yield* Effect.tryPromise({
      try: () => res.json() as Promise<PrsApiResponse>,
      catch: () => new Error("Failed to parse PR response"),
    })
    return data
  }),
).pipe(Atom.keepAlive)

// --- Derived: just the PR array ---
export const prsAtom = Atom.map(prsResponseAtom, (result) => {
  if (result._tag === "Success") return result.value.prs
  return [] as PR[]
})

// --- Derived: last refreshed timestamp ---
export const lastRefreshedAtom = Atom.map(prsResponseAtom, (result) => {
  if (result._tag === "Success") return result.value.lastRefreshed
  return null as string | null
})

// --- Refresh: POST /api/refresh then re-fetch ---
export const refreshAtom = Atom.fn((_: void, ctx) =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () => fetch("/api/refresh", { method: "POST" }),
      catch: () => new Error("Refresh failed"),
    })
    ctx.refresh(prsResponseAtom)
  }),
)
