/**
 * GitHubClient — fetches PR data from GitHub's GraphQL API.
 *
 * Uses the github-app library for authentication and the Enrichment
 * module for transforming raw GraphQL nodes into enriched PR models.
 *
 * Two modes of operation:
 * 1. Backfill: fetch all open PRs (on startup or manual refresh)
 * 2. Single PR: re-fetch one PR (after a webhook event)
 */

import { Config, Effect, Layer, ServiceMap } from "effect"
import { GitHubGraphQL, type GraphQLError } from "@pr-dashboard/github-app"
import { Schema } from "effect"
import type { PR } from "@pr-dashboard/shared"
import {
  BACKFILL_QUERY,
  singlePRQuery,
  enrichGraphQLNode,
  type GQLNode,
} from "./Enrichment.js"

// -----------------------------------------------------------------------------
// GraphQL response schemas (for decoding)
// -----------------------------------------------------------------------------

const BackfillResponse = Schema.Struct({
  authored: Schema.Struct({
    nodes: Schema.Array(Schema.Unknown),
  }),
  assigned: Schema.Struct({
    nodes: Schema.Array(Schema.Unknown),
  }),
})

const SinglePRResponse = Schema.Struct({
  repository: Schema.Struct({
    pullRequest: Schema.Unknown,
  }),
})

// -----------------------------------------------------------------------------
// Service interface
// -----------------------------------------------------------------------------

export interface GitHubClientShape {
  /**
   * Fetch all open PRs (authored + assigned). Deduplicates by URL.
   * Returns enriched PR models ready for the PRStore.
   */
  readonly fetchAllOpenPRs: Effect.Effect<ReadonlyArray<PR>, GraphQLError>

  /**
   * Re-fetch a single PR by owner/repo/number.
   * Used after webhook events to get fresh mergeable/check data.
   */
  readonly fetchSinglePR: (
    owner: string,
    repo: string,
    number: number,
  ) => Effect.Effect<PR | null, GraphQLError>

  /** The current user (for review state / unresolved thread filtering) */
  readonly currentUser: string
}

export class GitHubClient extends ServiceMap.Service<
  GitHubClient,
  GitHubClientShape
>()("GitHubClient") {}

// -----------------------------------------------------------------------------
// Live implementation
// -----------------------------------------------------------------------------

export const GitHubClientLive = Layer.effect(GitHubClient)(
  Effect.gen(function* () {
    const graphql = yield* Effect.service(GitHubGraphQL)
    const currentUser = yield* Config.string("GH_USER").pipe(
      Config.withDefault("isaac-renner"),
    )

    return {
      currentUser,

      fetchAllOpenPRs: Effect.gen(function* () {
        const data = yield* graphql.query(BACKFILL_QUERY, {}, BackfillResponse)
        const authored = data.authored.nodes as Array<GQLNode>
        const assigned = data.assigned.nodes as Array<GQLNode>

        // Deduplicate by URL
        const seen = new Set<string>()
        const prs: Array<PR> = []
        for (const node of [...authored, ...assigned]) {
          if (node.url && !seen.has(node.url)) {
            seen.add(node.url)
            prs.push(enrichGraphQLNode(node, currentUser))
          }
        }
        return prs
      }),

      fetchSinglePR: (owner, repo, number) =>
        Effect.gen(function* () {
          const query = singlePRQuery(owner, repo, number)
          const data = yield* graphql.query(query, {}, SinglePRResponse)
          const node = data.repository.pullRequest as GQLNode | null
          if (!node) return null
          return enrichGraphQLNode(node, currentUser)
        }),
    }
  }),
)
