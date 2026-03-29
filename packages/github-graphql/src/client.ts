/**
 * GitHubGraphQLClient — Effect service for executing typed GraphQL queries.
 *
 * Handles rate limiting: checks X-RateLimit-Remaining and waits until
 * X-RateLimit-Reset when exhausted.
 */

import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { Config, Duration, Effect, Layer, Redacted, Schedule, ServiceMap } from "effect";
import { print } from "graphql";

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class GraphQLRequestError {
  readonly _tag = "GraphQLRequestError";
  constructor(
    readonly message: string,
    readonly status?: number | undefined,
    readonly errors?: ReadonlyArray<{ readonly message: string }> | undefined,
    readonly retryAfter?: number | undefined,
  ) {}
}

// -----------------------------------------------------------------------------
// Service interface
// -----------------------------------------------------------------------------

export interface GitHubGraphQLClientShape {
  readonly execute: <TResult, TVariables extends Record<string, unknown>>(
    document: TypedDocumentNode<TResult, TVariables>,
    ...args: TVariables extends Record<string, never> ? [variables?: undefined]
      : [variables: TVariables]
  ) => Effect.Effect<TResult, GraphQLRequestError>;
}

export class GitHubGraphQLClient extends ServiceMap.Service<
  GitHubGraphQLClient,
  GitHubGraphQLClientShape
>()("GitHubGraphQLClient") {}

// -----------------------------------------------------------------------------
// Live implementation
// -----------------------------------------------------------------------------

export const GitHubGraphQLClientLive = Layer.effect(GitHubGraphQLClient)(
  Effect.gen(function*() {
    const token = yield* Config.redacted("GITHUB_TOKEN");

    return {
      execute: <TResult, TVariables extends Record<string, unknown>>(
        document: TypedDocumentNode<TResult, TVariables>,
        ...args: TVariables extends Record<string, never> ? [variables?: undefined]
          : [variables: TVariables]
      ): Effect.Effect<TResult, GraphQLRequestError> => {
        const doRequest = Effect.gen(function*() {
          const variables = args[0];
          const query = print(document);

          const response = yield* Effect.tryPromise({
            try: () =>
              fetch("https://api.github.com/graphql", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${Redacted.value(token)}`,
                  "Content-Type": "application/json",
                  "User-Agent": "pr-dashboard",
                },
                body: JSON.stringify({ query, variables }),
              }),
            catch: (error) =>
              new GraphQLRequestError(`Network error: ${error}`),
          });

          // Rate limit handling
          const remaining = response.headers.get("x-ratelimit-remaining");
          const resetAt = response.headers.get("x-ratelimit-reset");

          if (remaining !== null && Number(remaining) <= 5) {
            const resetMs = resetAt ? (Number(resetAt) * 1000 - Date.now()) : 60_000;
            const waitMs = Math.max(resetMs, 5_000);
            yield* Effect.logWarning(
              `GitHub rate limit nearly exhausted (${remaining} remaining), waiting ${Math.round(waitMs / 1000)}s`,
            );
            yield* Effect.sleep(Duration.millis(waitMs));
          }

          if (response.status === 403 || response.status === 429) {
            const resetMs = resetAt ? (Number(resetAt) * 1000 - Date.now()) : 60_000;
            return yield* Effect.fail(
              new GraphQLRequestError(
                `Rate limited (${response.status})`,
                response.status,
                undefined,
                Math.max(resetMs, 5_000),
              ),
            );
          }

          if (!response.ok) {
            return yield* Effect.fail(
              new GraphQLRequestError(
                `GitHub GraphQL API returned ${response.status}`,
                response.status,
              ),
            );
          }

          const json = yield* Effect.tryPromise({
            try: () =>
              response.json() as Promise<{
                data?: TResult;
                errors?: Array<{ message: string }>;
              }>,
            catch: (error) => new GraphQLRequestError(`Failed to parse response: ${error}`),
          });

          if (json.errors?.length) {
            return yield* Effect.fail(
              new GraphQLRequestError(
                json.errors.map((e) => e.message).join("; "),
                undefined,
                json.errors,
              ),
            );
          }

          if (!json.data) {
            return yield* Effect.fail(
              new GraphQLRequestError("No data in response"),
            );
          }

          return json.data;
        }).pipe(Effect.withSpan("graphql.execute"));

        // Retry on rate limit: exponential backoff, max 3 attempts
        return doRequest.pipe(
          Effect.retry({
            schedule: Schedule.exponential(Duration.seconds(10)).pipe(
              Schedule.both(Schedule.recurs(3)),
            ),
            while: (err) => err.status === 403 || err.status === 429,
          }),
        );
      },
    };
  }),
);
