import { Schema } from "effect";

// -----------------------------------------------------------------------------
// Sub-schemas
// -----------------------------------------------------------------------------

export class Repository extends Schema.Class<Repository>("Repository")({
  name: Schema.String,
  nameWithOwner: Schema.String,
}) {}

export class DeployLink extends Schema.Class<DeployLink>("DeployLink")({
  label: Schema.String,
  branch: Schema.String,
  url: Schema.String,
}) {}

export class UnresolvedThread extends Schema.Class<UnresolvedThread>(
  "UnresolvedThread",
)({
  id: Schema.String,
  authorLogin: Schema.String,
  bodyText: Schema.String,
  createdAt: Schema.String,
  url: Schema.String,
  replied: Schema.Boolean,
}) {}

export const PipelineState = Schema.Literals(["SUCCESS", "FAILURE", "PENDING"] as const);
export type PipelineState = typeof PipelineState.Type;

export const ReviewState = Schema.Literals(
  [
    "APPROVED",
    "CHANGES_REQUESTED",
    "PENDING",
  ] as const,
);
export type ReviewState = typeof ReviewState.Type;

export const PRState = Schema.Literals(["OPEN", "CLOSED", "MERGED"] as const);
export type PRState = typeof PRState.Type;

export const MergeableState = Schema.Literals(
  [
    "MERGEABLE",
    "CONFLICTING",
    "UNKNOWN",
  ] as const,
);
export type MergeableState = typeof MergeableState.Type;

// -----------------------------------------------------------------------------
// Buildkite build/job schemas
// -----------------------------------------------------------------------------

export class BuildkiteJob extends Schema.Class<BuildkiteJob>("BuildkiteJob")({
  id: Schema.String,
  graphqlId: Schema.String.pipe(Schema.NullOr),
  label: Schema.String.pipe(Schema.NullOr),
  state: Schema.String,
  url: Schema.String.pipe(Schema.NullOr),
  startedAt: Schema.String.pipe(Schema.NullOr),
  finishedAt: Schema.String.pipe(Schema.NullOr),
  softFailed: Schema.Boolean,
  type: Schema.Literals(["command", "block", "wait", "trigger"] as const),
  logSnippet: Schema.String.pipe(Schema.NullOr),
  exitStatus: Schema.String.pipe(Schema.NullOr),
  retried: Schema.Boolean,
  retriesCount: Schema.Number.pipe(Schema.NullOr),
  parallelGroupIndex: Schema.Number.pipe(Schema.NullOr),
  parallelGroupTotal: Schema.Number.pipe(Schema.NullOr),
  isUnblockable: Schema.Boolean.pipe(Schema.NullOr),
}) {}

export class BuildkiteBuild extends Schema.Class<BuildkiteBuild>(
  "BuildkiteBuild",
)({
  graphqlId: Schema.String,
  number: Schema.Number,
  state: Schema.String,
  url: Schema.String,
  message: Schema.String.pipe(Schema.NullOr),
  branch: Schema.String,
  commit: Schema.String,
  pipelineName: Schema.String.pipe(Schema.NullOr),
  createdAt: Schema.String,
  startedAt: Schema.String.pipe(Schema.NullOr),
  finishedAt: Schema.String.pipe(Schema.NullOr),
  rebuiltFrom: Schema.Number.pipe(Schema.NullOr),
  jobs: Schema.Array(BuildkiteJob),
  blockedCount: Schema.Number,
  failedCount: Schema.Number,
}) {}

// -----------------------------------------------------------------------------
// PR — the enriched pull request
// -----------------------------------------------------------------------------

export class PR extends Schema.Class<PR>("PR")({
  number: Schema.Number,
  state: PRState,
  title: Schema.String,
  url: Schema.String,
  isDraft: Schema.Boolean,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  headRefName: Schema.String,
  baseRefName: Schema.String,
  author: Schema.String.pipe(Schema.NullOr),
  repository: Repository,
  checks: Schema.String.pipe(Schema.NullOr),
  mergeable: Schema.String.pipe(Schema.NullOr),
  jiraTicket: Schema.String.pipe(Schema.NullOr),
  pipelineState: PipelineState.pipe(Schema.NullOr),
  pipelineUrl: Schema.String.pipe(Schema.NullOr),
  deployLink: DeployLink.pipe(Schema.NullOr),
  unresolvedCount: Schema.Number,
  unresolvedThreads: Schema.Array(UnresolvedThread),
  reviewState: ReviewState,
  buildkite: BuildkiteBuild.pipe(Schema.NullOr),
}) {}

// -----------------------------------------------------------------------------
// PRWithSessions — PR enriched with correlated OpenCode sessions
// -----------------------------------------------------------------------------

export class SessionRef extends Schema.Class<SessionRef>("SessionRef")({
  id: Schema.String,
  title: Schema.String,
  slug: Schema.String,
  time: Schema.Struct({
    created: Schema.Number,
    updated: Schema.Number,
  }),
  childCount: Schema.Number,
  url: Schema.String,
}) {}

export class PRWithSessions extends Schema.Class<PRWithSessions>(
  "PRWithSessions",
)({
  ...PR.fields,
  sessions: Schema.Array(SessionRef),
}) {}
