// Pure modules (no services, just functions)
export {
  enrichGraphQLNode,
  computeReviewState,
  computePipelineInfo,
  computeUnresolvedThreads,
  parseJiraTicket,
  isBotAuthor,
  type GQLNode,
  type GQLStatusCheckRollup,
  type GQLReviewThread,
  type AuthorRef,
} from "./Enrichment.js"

export {
  correlateSessions,
  extractPRNumbers,
  directoryToRepoName,
  groupSessions,
  type OCSessionRaw,
} from "./Correlation.js"

// Effect services
export {
  PRStore,
  PRStoreLive,
  type PRStoreShape,
  type PRStoreEvent,
} from "./PRStore.js"

export {
  GitHubClient,
  GitHubClientLive,
  type GitHubClientShape,
} from "./GitHubClient.js"

// Re-export the GraphQL client for layer composition
export {
  GitHubGraphQLClient,
  GitHubGraphQLClientLive,
  GraphQLRequestError,
} from "@pr-dashboard/github-graphql"

export {
  OpenCodeClient,
  OpenCodeClientLive,
  OpenCodeFetchError,
  type OpenCodeClientShape,
} from "./OpenCodeClient.js"
