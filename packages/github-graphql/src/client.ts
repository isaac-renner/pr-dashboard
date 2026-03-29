/**
 * GitHubGraphQLClient — Effect service for executing typed GraphQL queries.
 *
 * Takes TypedDocumentNode objects (from codegen) and returns fully typed
 * results. Handles authentication via GitHubAppAuth or a plain token.
 */

import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { Config, Effect, Layer, Redacted, ServiceMap } from "effect";
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
  ) {}
}

// -----------------------------------------------------------------------------
// Service interface
// -----------------------------------------------------------------------------

export interface GitHubGraphQLClientShape {
  /**
   * Execute a typed GraphQL query.
   * TResult and TVariables are inferred from the TypedDocumentNode.
   */
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
// Live implementation — uses a token (PAT or installation token)
// -----------------------------------------------------------------------------

export const GitHubGraphQLClientLive = Layer.effect(GitHubGraphQLClient)(
  Effect.gen(function*() {
    const token = yield* Config.redacted("GITHUB_TOKEN");

    return {
      execute: <TResult, TVariables extends Record<string, unknown>>(
        document: TypedDocumentNode<TResult, TVariables>,
        ...args: TVariables extends Record<string, never> ? [variables?: undefined]
          : [variables: TVariables]
      ): Effect.Effect<TResult, GraphQLRequestError> =>
        Effect.gen(function*() {
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
              new GraphQLRequestError(
                `Network error: ${error}`,
              ),
          });

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
        }).pipe(Effect.withSpan("graphql.execute")),
    };
  }),
);
