/**
 * GitHubClient — fetches PR data from GitHub's GraphQL API.
 *
 * Uses typed document nodes (from @pr-dashboard/github-graphql codegen)
 * and the Enrichment module for transforming responses into enriched PR models.
 *
 * Two modes of operation:
 * 1. Backfill: fetch all open PRs (on startup or manual refresh)
 * 2. Single PR: re-fetch one PR (after a webhook event)
 */

import { Config, Effect, Layer, ServiceMap } from "effect"
import {
  GitHubGraphQLClient,
  GraphQLRequestError,
  BackfillOpenPRsDocument,
  SinglePrDocument,
  type PrFieldsFragment,
} from "@pr-dashboard/github-graphql"
import type { PR } from "@pr-dashboard/shared"
import { enrichGraphQLNode, type GQLNode } from "./Enrichment.js"

// -----------------------------------------------------------------------------
// Service interface
// -----------------------------------------------------------------------------

export interface GitHubClientShape {
  /**
   * Fetch all open PRs (authored + assigned). Deduplicates by URL.
   * Returns enriched PR models ready for the PRStore.
   */
  readonly fetchAllOpenPRs: Effect.Effect<ReadonlyArray<PR>, GraphQLRequestError>

  /**
   * Re-fetch a single PR by owner/repo/number.
   * Used after webhook events to get fresh mergeable/check data.
   */
  readonly fetchSinglePR: (
    owner: string,
    repo: string,
    number: number,
  ) => Effect.Effect<PR | null, GraphQLRequestError>

  /** The current user (for review state / unresolved thread filtering) */
  readonly currentUser: string
}

export class GitHubClient extends ServiceMap.Service<
  GitHubClient,
  GitHubClientShape
>()("GitHubClient") {}

// -----------------------------------------------------------------------------
// Adapt PrFieldsFragment (codegen) → GQLNode (enrichment)
//
// The codegen types are structurally compatible but use different
// __typename unions for the Actor interface. We cast through the
// enrichment's GQLNode which uses a simpler { __typename, login } shape.
// -----------------------------------------------------------------------------

function fragmentToGQLNode(fragment: PrFieldsFragment): GQLNode {
  return fragment as unknown as GQLNode
}

// -----------------------------------------------------------------------------
// Live implementation
// -----------------------------------------------------------------------------

export const GitHubClientLive = Layer.effect(GitHubClient)(
  Effect.gen(function* () {
    const gql = yield* Effect.service(GitHubGraphQLClient)
    const currentUser = yield* Config.string("GH_USER").pipe(
      Config.withDefault("isaac-renner"),
    )

    return {
      currentUser,

      fetchAllOpenPRs: Effect.gen(function* () {
        const data = yield* gql.execute(BackfillOpenPRsDocument)

        const authored = data.authored.nodes ?? []
        const assigned = data.assigned.nodes ?? []

        // Deduplicate by URL, skip non-PR search results
        const seen = new Set<string>()
        const prs: Array<PR> = []

        for (const node of [...authored, ...assigned]) {
          if (!node || !("number" in node)) continue
          const fragment = node as PrFieldsFragment
          if (seen.has(fragment.url)) continue
          seen.add(fragment.url)
          prs.push(enrichGraphQLNode(fragmentToGQLNode(fragment), currentUser))
        }

        return prs
      }),

      fetchSinglePR: (owner, repo, number) =>
        Effect.gen(function* () {
          const data = yield* gql.execute(SinglePrDocument, {
            owner,
            name: repo,
            number,
          })

          const node = data.repository?.pullRequest
          if (!node) return null
          return enrichGraphQLNode(fragmentToGQLNode(node), currentUser)
        }),
    }
  }),
)
