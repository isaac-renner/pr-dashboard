// All the types the frontend needs
export interface Repository {
  name: string;
  nameWithOwner: string;
}

export interface DeployLink {
  label: string;
  branch: string;
  url: string;
}

export interface UnresolvedThread {
  id: string;
  authorLogin: string;
  bodyText: string;
  createdAt: string;
  url: string;
  replied: boolean;
}

export interface SessionRef {
  id: string;
  title: string;
  slug: string;
  time: { created: number; updated: number };
  childCount: number;
  url: string;
}

export interface PR {
  number: number;
  state: string;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  baseRefName: string;
  repository: Repository;
  checks: string | null;
  mergeable: string | null;
  jiraTicket: string | null;
  pipelineState: "SUCCESS" | "FAILURE" | "PENDING" | null;
  pipelineUrl: string | null;
  deployLink: DeployLink | null;
  unresolvedCount: number;
  unresolvedThreads: UnresolvedThread[];
  reviewState: "APPROVED" | "CHANGES_REQUESTED" | "PENDING";
  sessions: SessionRef[];
}

export type ReviewLabel = "Draft" | "Unreviewed" | "Changes Requested" | "Approved" | "Commented";

export function getReviewLabel(pr: PR): ReviewLabel {
  if (pr.isDraft && pr.reviewState === "PENDING") return "Draft";
  if (pr.reviewState === "APPROVED") return "Approved";
  if (pr.reviewState === "CHANGES_REQUESTED") return "Changes Requested";
  if (pr.unresolvedCount > 0 && pr.reviewState === "PENDING") return "Commented";
  return "Unreviewed";
}

export const REVIEW_OPTIONS = ["Draft", "Unreviewed", "Changes Requested", "Approved", "Commented"] as const;

export interface Filters {
  search: string;
  repos: ReadonlyArray<string>;
  pipelines: ReadonlyArray<string>;
  reviews: ReadonlyArray<string>;
  tickets: ReadonlyArray<string>;
  group: "ticket" | "repo" | "stack" | "review" | "pipeline" | "none";
}

// --- Navigation items (j/k walks these) ---

export type NavItem =
  | { readonly _tag: "pr"; readonly pr: PR }
  | { readonly _tag: "group"; readonly name: string; readonly closed: boolean };
