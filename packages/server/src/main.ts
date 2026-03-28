/**
 * Server entry point.
 *
 * Composes all service layers and starts the application.
 * Currently demonstrates the layer composition — HTTP server
 * and webhook routing will be wired in a later phase.
 */

import { Effect, Layer } from "effect"
import type { SessionRef } from "@pr-dashboard/shared"
import { PRStore, PRStoreLive } from "./services/PRStore.js"
import { GitHubClient, GitHubClientLive } from "./services/GitHubClient.js"
import { OpenCodeClient, OpenCodeClientLive } from "./services/OpenCodeClient.js"

// -----------------------------------------------------------------------------
// Application startup
// -----------------------------------------------------------------------------

const program = Effect.gen(function* () {
  const prStore = yield* Effect.service(PRStore)
  const github = yield* Effect.service(GitHubClient)
  const opencode = yield* Effect.service(OpenCodeClient)

  // Backfill: fetch all open PRs from GitHub
  yield* Effect.log("Backfilling PRs from GitHub...")
  const prs = yield* github.fetchAllOpenPRs
  yield* prStore.replaceAll(prs)
  yield* Effect.log(`Backfilled ${prs.length} PRs`)

  // Correlate with OpenCode sessions
  if (opencode.enabled) {
    yield* Effect.log("Fetching OpenCode sessions...")
    const allPrs = yield* prStore.getAll
    const correlations = yield* opencode.correlateWithPRs(allPrs).pipe(
      Effect.catch((err) =>
        Effect.gen(function* () {
          yield* Effect.logWarning(`OpenCode fetch failed: ${err.message}`)
          return new Map<string, ReadonlyArray<SessionRef>>()
        }),
      ),
    )
    yield* Effect.log(`Correlated sessions for ${correlations.size} PRs`)
  }

  yield* Effect.log(`PR Dashboard ready — ${prs.length} PRs loaded`)

  // TODO: Start HTTP server, wire webhook routes, start RPC server
  yield* Effect.never
})

// Layer composition:
// GitHubClientLive requires GitHubGraphQL (from github-app)
const _MainLayer = Layer.mergeAll(
  PRStoreLive,
  GitHubClientLive,
  OpenCodeClientLive,
)

// For now, log what we have:
Effect.runPromise(
  Effect.gen(function* () {
    yield* Effect.log("PR Dashboard server — service layer ready")
    yield* Effect.log("Services: PRStore, GitHubClient, OpenCodeClient")
    yield* Effect.log("Pure modules: Enrichment, Correlation")
    yield* Effect.log("Awaiting GitHubGraphQL layer implementation (Phase 2)")
  }),
)
