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

export interface Filters {
  search: string;
  repos: ReadonlyArray<string>;
  pipeline: "all" | "failing" | "pending" | "passing" | "none";
  drafts: "include" | "exclude";
  group: "ticket" | "repo";
}

export interface Buckets {
  now: PR[];
  today: PR[];
  drafts: PR[];
}
