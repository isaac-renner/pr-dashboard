/**
 * Server entry point — Phase 3 implementation.
 *
 * Will compose:
 * - GitHubAppAuth + WebhookVerifier + GitHubGraphQL (from @pr-dashboard/github-app)
 * - PRStore + EnrichmentService + OpenCodeService + BackfillService
 * - RPC server implementing PrDashboardRpc (from @pr-dashboard/shared)
 * - HTTP server with webhook endpoint + RPC routes
 */

import { Effect } from "effect"

const main = Effect.gen(function* () {
  yield* Effect.log("PR Dashboard server — scaffold ready, implementation in Phase 3")
})

Effect.runPromise(main)
