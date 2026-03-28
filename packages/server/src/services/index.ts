// Pure modules (no services, just functions)
export {
  type AuthorRef,
  computePipelineInfo,
  computeReviewState,
  computeUnresolvedThreads,
  enrichGraphQLNode,
  type GQLNode,
  type GQLReviewThread,
  type GQLStatusCheckRollup,
  isBotAuthor,
  parseJiraTicket,
} from "./Enrichment.js";

export {
  correlateSessions,
  directoryToRepoName,
  extractPRNumbers,
  groupSessions,
  type OCSessionRaw,
} from "./Correlation.js";

// Effect services
export { PRStore, type PRStoreEvent, PRStoreLive, type PRStoreShape } from "./PRStore.js";

export { GitHubClient, GitHubClientLive, type GitHubClientShape } from "./GitHubClient.js";

// Re-export the GraphQL client for layer composition
export { GitHubGraphQLClient, GitHubGraphQLClientLive, GraphQLRequestError } from "@pr-dashboard/github-graphql";

export { OpenCodeClient, OpenCodeClientLive, type OpenCodeClientShape, OpenCodeFetchError } from "./OpenCodeClient.js";
