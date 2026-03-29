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

import {
  BackfillOpenPRs,
  GitHubGraphQLClient,
  GraphQLRequestError,
  type PrFieldsFragment,
  SinglePR,
} from "@pr-dashboard/github-graphql";
import type { PR } from "@pr-dashboard/shared";
import { Config, Effect, Layer, ServiceMap } from "effect";
import { enrichGraphQLNode, type GQLNode } from "./Enrichment.js";

// -----------------------------------------------------------------------------
// Service interface
// -----------------------------------------------------------------------------

export interface FetchResult {
  /** PRs authored by or assigned to the current user */
  readonly myPRs: ReadonlyArray<PR>;
  /** PRs where review is requested from the current user */
  readonly reviewRequested: ReadonlyArray<PR>;
}

export interface GitHubClientShape {
  /**
   * Fetch all open PRs — authored/assigned + review-requested.
   * Returns both lists separately, each deduplicated.
   */
  readonly fetchAllOpenPRs: Effect.Effect<FetchResult, GraphQLRequestError>;

  /**
   * Re-fetch a single PR by owner/repo/number.
   */
  readonly fetchSinglePR: (
    owner: string,
    repo: string,
    number: number,
  ) => Effect.Effect<PR | null, GraphQLRequestError>;

  readonly currentUser: string;
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
  return fragment as unknown as GQLNode;
}

// -----------------------------------------------------------------------------
// Live implementation
// -----------------------------------------------------------------------------

export const GitHubClientLive = Layer.effect(GitHubClient)(
  Effect.gen(function*() {
    const gql = yield* Effect.service(GitHubGraphQLClient);
    const currentUser = yield* Config.string("GH_USER").pipe(
      Config.withDefault("isaac-renner"),
    );

    return {
      currentUser,

      fetchAllOpenPRs: Effect.gen(function*() {
        const data = yield* gql.execute(BackfillOpenPRs);

        const authored = data.authored.nodes ?? [];
        const assigned = data.assigned.nodes ?? [];
        const reviewReq = data.reviewRequested.nodes ?? [];

        function dedup(nodes: ReadonlyArray<unknown>): Array<PR> {
          const seen = new Set<string>();
          const result: Array<PR> = [];
          for (const node of nodes) {
            if (!node || typeof node !== "object" || !("number" in node)) continue;
            const fragment = node as PrFieldsFragment;
            if (seen.has(fragment.url)) continue;
            seen.add(fragment.url);
            result.push(enrichGraphQLNode(fragmentToGQLNode(fragment), currentUser));
          }
          return result;
        }

        return {
          myPRs: dedup([...authored, ...assigned]),
          reviewRequested: dedup(reviewReq),
        };
      }),

      fetchSinglePR: (owner, repo, number) =>
        Effect.gen(function*() {
          const data = yield* gql.execute(SinglePR, {
            owner,
            name: repo,
            number,
          });

          const node = data.repository?.pullRequest;
          if (!node) return null;
          return enrichGraphQLNode(fragmentToGQLNode(node), currentUser);
        }),
    };
  }),
);
