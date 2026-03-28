import { Effect, Schema, ServiceMap } from "effect"

// -----------------------------------------------------------------------------
// GitHubGraphQL service
//
// Authenticated GraphQL client for GitHub's API.
// Uses installation tokens from GitHubAppAuth for authentication.
// -----------------------------------------------------------------------------

export class GraphQLError {
  readonly _tag = "GraphQLError"
  constructor(
    readonly message: string,
    readonly errors?: ReadonlyArray<{ readonly message: string }>,
  ) {}
}

export interface GitHubGraphQLShape {
  /**
   * Execute a GraphQL query against GitHub's API.
   * Automatically handles authentication via installation tokens.
   *
   * @param query - The GraphQL query string
   * @param variables - Query variables
   * @param schema - Effect Schema to decode the response `data` field
   */
  readonly query: <A>(
    query: string,
    variables: Record<string, unknown>,
    schema: Schema.Schema<A>,
  ) => Effect.Effect<A, GraphQLError>
}

export class GitHubGraphQL extends ServiceMap.Service<
  GitHubGraphQL,
  GitHubGraphQLShape
>()("GitHubGraphQL") {}

// Implementation will be provided in Phase 2
