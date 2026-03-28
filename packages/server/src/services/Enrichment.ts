/**
 * Enrichment — pure functions for transforming raw GitHub GraphQL data
 * into enriched PR models.
 *
 * No services, no effects, no dependencies. Just data transformations.
 * Ported from server.ts lines 174-365.
 */

import type { PR } from "@pr-dashboard/shared";

// -----------------------------------------------------------------------------
// GraphQL response types (dashboard-specific query shape)
// -----------------------------------------------------------------------------

export interface AuthorRef {
  readonly __typename: string;
  readonly login: string;
}

export interface GQLReviewThread {
  readonly id: string;
  readonly isResolved: boolean;
  readonly comments: {
    readonly nodes: ReadonlyArray<{
      readonly author: AuthorRef | null;
      readonly bodyText: string;
      readonly createdAt: string;
      readonly url: string;
    }>;
  };
}

export interface GQLStatusCheckRollup {
  readonly state: string;
  readonly contexts: {
    readonly nodes: ReadonlyArray<
      | {
        readonly __typename: "CheckRun";
        readonly name: string;
        readonly status: string;
        readonly conclusion: string | null;
        readonly detailsUrl: string | null;
      }
      | {
        readonly __typename: "StatusContext";
        readonly context: string;
        readonly state: string;
        readonly targetUrl: string | null;
      }
    >;
  };
}

export interface GQLNode {
  readonly number: number;
  readonly state: "OPEN" | "CLOSED" | "MERGED";
  readonly title: string;
  readonly url: string;
  readonly isDraft: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly headRefName: string;
  readonly baseRefName: string;
  readonly mergeable: string | null;
  readonly repository: { readonly name: string; readonly nameWithOwner: string };
  readonly reviews: {
    readonly nodes: ReadonlyArray<{
      readonly author: AuthorRef | null;
      readonly state: string;
      readonly submittedAt: string;
    }>;
  };
  readonly reviewThreads: {
    readonly nodes: ReadonlyArray<GQLReviewThread>;
  };
  readonly commits: {
    readonly nodes: ReadonlyArray<{
      readonly commit: {
        readonly statusCheckRollup: GQLStatusCheckRollup | null;
      };
    }>;
  };
}

// Queries are now defined as .graphql files in @pr-dashboard/github-graphql
// and codegen produces typed document nodes. The raw query strings have been
// removed from this module.

// -----------------------------------------------------------------------------
// Pure enrichment functions
// -----------------------------------------------------------------------------

export function parseJiraTicket(title: string, branch: string): string | null {
  const match = `${title} ${branch}`.match(/[A-Z][A-Z0-9]+-\d+/);
  return match?.[0] ?? null;
}

export function isBotAuthor(author: AuthorRef | null): boolean {
  if (!author) return false;
  if (author.__typename === "Bot") return true;
  return author.login.toLowerCase().endsWith("[bot]");
}

export function computeReviewState(
  reviews: ReadonlyArray<{ readonly author: AuthorRef | null; readonly state: string }>,
  currentUser: string,
): "APPROVED" | "CHANGES_REQUESTED" | "PENDING" {
  const currentLower = currentUser.toLowerCase();
  let hasApproval = false;
  for (const r of reviews) {
    const authorLogin = r.author?.login ?? null;
    if (!authorLogin || authorLogin.toLowerCase() === currentLower) continue;
    if (isBotAuthor(r.author)) continue;
    if (r.state === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";
    if (r.state === "APPROVED") hasApproval = true;
  }
  return hasApproval ? "APPROVED" : "PENDING";
}

interface PipelineResult {
  readonly state: "SUCCESS" | "FAILURE" | "PENDING" | null;
  readonly url: string | null;
  readonly deployLink: { readonly label: string; readonly branch: string; readonly url: string } | null;
}

export function computePipelineInfo(
  rollup: GQLStatusCheckRollup | null,
  headRefName: string,
): PipelineResult {
  if (!rollup) return { state: null, url: null, deployLink: null };

  const severity = { FAILURE: 3, PENDING: 2, SUCCESS: 1 } as const;

  function contextState(nodeState: string | null): "SUCCESS" | "FAILURE" | "PENDING" {
    if (!nodeState) return "PENDING";
    if (nodeState === "SUCCESS") return "SUCCESS";
    if (nodeState === "FAILURE" || nodeState === "ERROR" || nodeState === "CANCELLED") {
      return "FAILURE";
    }
    return "PENDING";
  }

  function deployBranch(name: string): string | null {
    const match = name.match(/deploy\s+to\s+(.+)$/i);
    if (!match) return null;
    const branch = match[1]!.trim();
    return branch.length > 0 ? branch : null;
  }

  let state: "SUCCESS" | "FAILURE" | "PENDING" | null = null;
  let url: string | null = null;
  let deployLink: PipelineResult["deployLink"] = null;

  for (const node of rollup.contexts.nodes) {
    let nodeUrl: string | null = null;
    let nodeState: "SUCCESS" | "FAILURE" | "PENDING" = "PENDING";
    let label = "";

    if (node.__typename === "CheckRun") {
      nodeUrl = node.detailsUrl;
      nodeState = contextState(node.conclusion ?? node.status);
      label = node.name;
    } else if (node.__typename === "StatusContext") {
      nodeUrl = node.targetUrl;
      nodeState = contextState(node.state);
      label = node.context;
    }

    if (!nodeUrl || !nodeUrl.includes("buildkite.com/")) continue;

    if (state === null || severity[nodeState] > severity[state]) {
      state = nodeState;
      url = nodeUrl;
    }

    const branch = deployBranch(label);
    if (branch && nodeState === "SUCCESS") {
      const next = { label: `Deploy ${branch}`, branch, url: nodeUrl };
      if (!deployLink) {
        deployLink = next;
      } else {
        const currIsHead = deployLink.branch.toLowerCase() === headRefName.toLowerCase();
        const nextIsHead = next.branch.toLowerCase() === headRefName.toLowerCase();
        if (!currIsHead && nextIsHead) {
          deployLink = next;
        }
      }
    }
  }

  return { state, url, deployLink };
}

interface UnresolvedResult {
  readonly id: string;
  readonly authorLogin: string;
  readonly bodyText: string;
  readonly createdAt: string;
  readonly url: string;
  readonly replied: boolean;
}

export function computeUnresolvedThreads(
  threads: ReadonlyArray<GQLReviewThread>,
  currentUser: string,
): ReadonlyArray<UnresolvedResult> {
  const currentLower = currentUser.toLowerCase();
  const result: Array<UnresolvedResult> = [];

  for (const thread of threads) {
    if (thread.isResolved) continue;

    const comments = thread.comments.nodes
      .reduce(
        (acc, c) => {
          if (!c.author || isBotAuthor(c.author)) return acc;
          acc.push({
            authorLogin: c.author.login,
            loginLower: c.author.login.toLowerCase(),
            bodyText: c.bodyText,
            createdAt: c.createdAt,
            url: c.url,
          });
          return acc;
        },
        [] as Array<{
          authorLogin: string;
          loginLower: string;
          bodyText: string;
          createdAt: string;
          url: string;
        }>,
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (comments.length === 0) continue;

    const hasExternal = comments.some((c) => c.loginLower !== currentLower);
    if (!hasExternal) continue;

    const last = comments[comments.length - 1];
    if (!last || last.loginLower === currentLower) continue;

    const replied = comments.some((c) => c.loginLower === currentLower);

    result.push({
      id: thread.id,
      authorLogin: last.authorLogin,
      bodyText: last.bodyText,
      createdAt: last.createdAt,
      url: last.url,
      replied,
    });
  }

  return result;
}

// -----------------------------------------------------------------------------
// enrichGraphQLNode — the main transformation: GQLNode → PR
// -----------------------------------------------------------------------------

export function enrichGraphQLNode(node: GQLNode, currentUser: string): PR {
  const rollup = node.commits.nodes[0]?.commit?.statusCheckRollup ?? null;
  const pipeline = computePipelineInfo(rollup, node.headRefName);
  const unresolved = computeUnresolvedThreads(node.reviewThreads.nodes, currentUser);

  return {
    number: node.number,
    state: node.state,
    title: node.title,
    url: node.url,
    isDraft: node.isDraft,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    headRefName: node.headRefName,
    baseRefName: node.baseRefName,
    repository: node.repository,
    checks: node.commits.nodes[0]?.commit?.statusCheckRollup?.state ?? null,
    mergeable: node.mergeable,
    jiraTicket: parseJiraTicket(node.title, node.headRefName),
    pipelineState: pipeline.state,
    pipelineUrl: pipeline.url,
    deployLink: pipeline.deployLink,
    unresolvedCount: unresolved.length,
    unresolvedThreads: unresolved,
    reviewState: computeReviewState(node.reviews.nodes, currentUser),
  };
}
