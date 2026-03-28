import { Schema } from "effect"

// -----------------------------------------------------------------------------
// Common sub-schemas shared across webhook payloads
// -----------------------------------------------------------------------------

export class WebhookUser extends Schema.Class<WebhookUser>("WebhookUser")({
  login: Schema.String,
  id: Schema.Number,
  node_id: Schema.String,
  type: Schema.String,
}) {}

export class WebhookRepository extends Schema.Class<WebhookRepository>(
  "WebhookRepository",
)({
  id: Schema.Number,
  node_id: Schema.String,
  name: Schema.String,
  full_name: Schema.String,
  private: Schema.Boolean,
  owner: WebhookUser,
}) {}

export class WebhookInstallation extends Schema.Class<WebhookInstallation>(
  "WebhookInstallation",
)({
  id: Schema.Number,
  node_id: Schema.String,
}) {}

// -----------------------------------------------------------------------------
// pull_request event
// -----------------------------------------------------------------------------

export const PullRequestAction = Schema.Literals([
  "opened",
  "closed",
  "reopened",
  "edited",
  "synchronize",
  "converted_to_draft",
  "ready_for_review",
] as const)
export type PullRequestAction = typeof PullRequestAction.Type

export class WebhookPullRequest extends Schema.Class<WebhookPullRequest>(
  "WebhookPullRequest",
)({
  number: Schema.Number,
  state: Schema.String,
  title: Schema.String,
  html_url: Schema.String,
  draft: Schema.Boolean,
  created_at: Schema.String,
  updated_at: Schema.String,
  merged: Schema.Boolean,
  mergeable: Schema.Boolean.pipe(Schema.NullOr),
  head: Schema.Struct({
    ref: Schema.String,
    sha: Schema.String,
  }),
  base: Schema.Struct({
    ref: Schema.String,
  }),
  user: WebhookUser,
}) {}

export class PullRequestEvent extends Schema.Class<PullRequestEvent>(
  "PullRequestEvent",
)({
  action: PullRequestAction,
  number: Schema.Number,
  pull_request: WebhookPullRequest,
  repository: WebhookRepository,
  installation: Schema.optional(WebhookInstallation),
  sender: WebhookUser,
}) {}

// -----------------------------------------------------------------------------
// pull_request_review event
// -----------------------------------------------------------------------------

export const PullRequestReviewAction = Schema.Literals(["submitted", "dismissed"] as const)
export type PullRequestReviewAction = typeof PullRequestReviewAction.Type

export class WebhookReview extends Schema.Class<WebhookReview>(
  "WebhookReview",
)({
  id: Schema.Number,
  node_id: Schema.String,
  user: WebhookUser,
  state: Schema.String,
  submitted_at: Schema.String.pipe(Schema.NullOr),
  html_url: Schema.String,
}) {}

export class PullRequestReviewEvent extends Schema.Class<PullRequestReviewEvent>(
  "PullRequestReviewEvent",
)({
  action: PullRequestReviewAction,
  review: WebhookReview,
  pull_request: WebhookPullRequest,
  repository: WebhookRepository,
  installation: Schema.optional(WebhookInstallation),
  sender: WebhookUser,
}) {}

// -----------------------------------------------------------------------------
// pull_request_review_thread event
// -----------------------------------------------------------------------------

export const PullRequestReviewThreadAction = Schema.Literals([
  "resolved",
  "unresolved",
] as const)
export type PullRequestReviewThreadAction =
  typeof PullRequestReviewThreadAction.Type

export class WebhookReviewThread extends Schema.Class<WebhookReviewThread>(
  "WebhookReviewThread",
)({
  id: Schema.Number,
  node_id: Schema.String,
}) {}

export class PullRequestReviewThreadEvent extends Schema.Class<PullRequestReviewThreadEvent>(
  "PullRequestReviewThreadEvent",
)({
  action: PullRequestReviewThreadAction,
  thread: WebhookReviewThread,
  pull_request: WebhookPullRequest,
  repository: WebhookRepository,
  installation: Schema.optional(WebhookInstallation),
  sender: WebhookUser,
}) {}

// -----------------------------------------------------------------------------
// pull_request_review_comment event
// -----------------------------------------------------------------------------

export const PullRequestReviewCommentAction = Schema.Literals([
  "created",
  "edited",
  "deleted",
] as const)
export type PullRequestReviewCommentAction =
  typeof PullRequestReviewCommentAction.Type

export class WebhookReviewComment extends Schema.Class<WebhookReviewComment>(
  "WebhookReviewComment",
)({
  id: Schema.Number,
  node_id: Schema.String,
  body: Schema.String,
  user: WebhookUser,
  html_url: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.String,
}) {}

export class PullRequestReviewCommentEvent extends Schema.Class<PullRequestReviewCommentEvent>(
  "PullRequestReviewCommentEvent",
)({
  action: PullRequestReviewCommentAction,
  comment: WebhookReviewComment,
  pull_request: WebhookPullRequest,
  repository: WebhookRepository,
  installation: Schema.optional(WebhookInstallation),
  sender: WebhookUser,
}) {}

// -----------------------------------------------------------------------------
// check_suite event
// -----------------------------------------------------------------------------

export const CheckSuiteAction = Schema.Literals([
  "completed",
  "requested",
  "rerequested",
] as const)
export type CheckSuiteAction = typeof CheckSuiteAction.Type

export class WebhookCheckSuite extends Schema.Class<WebhookCheckSuite>(
  "WebhookCheckSuite",
)({
  id: Schema.Number,
  node_id: Schema.String,
  head_sha: Schema.String,
  status: Schema.String.pipe(Schema.NullOr),
  conclusion: Schema.String.pipe(Schema.NullOr),
  head_branch: Schema.String.pipe(Schema.NullOr),
  pull_requests: Schema.Array(
    Schema.Struct({
      number: Schema.Number,
      head: Schema.Struct({ sha: Schema.String }),
    }),
  ),
}) {}

export class CheckSuiteEvent extends Schema.Class<CheckSuiteEvent>(
  "CheckSuiteEvent",
)({
  action: CheckSuiteAction,
  check_suite: WebhookCheckSuite,
  repository: WebhookRepository,
  installation: Schema.optional(WebhookInstallation),
  sender: WebhookUser,
}) {}

// -----------------------------------------------------------------------------
// check_run event
// -----------------------------------------------------------------------------

export const CheckRunAction = Schema.Literals([
  "completed",
  "created",
  "rerequested",
  "requested_action",
] as const)
export type CheckRunAction = typeof CheckRunAction.Type

export class WebhookCheckRun extends Schema.Class<WebhookCheckRun>(
  "WebhookCheckRun",
)({
  id: Schema.Number,
  node_id: Schema.String,
  name: Schema.String,
  head_sha: Schema.String,
  status: Schema.String,
  conclusion: Schema.String.pipe(Schema.NullOr),
  details_url: Schema.String.pipe(Schema.NullOr),
  pull_requests: Schema.Array(
    Schema.Struct({
      number: Schema.Number,
      head: Schema.Struct({ sha: Schema.String }),
    }),
  ),
}) {}

export class CheckRunEvent extends Schema.Class<CheckRunEvent>(
  "CheckRunEvent",
)({
  action: CheckRunAction,
  check_run: WebhookCheckRun,
  repository: WebhookRepository,
  installation: Schema.optional(WebhookInstallation),
  sender: WebhookUser,
}) {}

// -----------------------------------------------------------------------------
// status event (for StatusContext-based CI)
// -----------------------------------------------------------------------------

export class StatusEvent extends Schema.Class<StatusEvent>("StatusEvent")({
  sha: Schema.String,
  name: Schema.String,
  state: Schema.String,
  description: Schema.String.pipe(Schema.NullOr),
  target_url: Schema.String.pipe(Schema.NullOr),
  context: Schema.String,
  repository: WebhookRepository,
  installation: Schema.optional(WebhookInstallation),
  sender: WebhookUser,
}) {}

// -----------------------------------------------------------------------------
// Handled events registry
//
// This map is the source of truth for what the app handles.
// We route by X-GitHub-Event header, not by payload shape.
// -----------------------------------------------------------------------------

export const HandledEvents = {
  pull_request: PullRequestEvent,
  pull_request_review: PullRequestReviewEvent,
  pull_request_review_thread: PullRequestReviewThreadEvent,
  pull_request_review_comment: PullRequestReviewCommentEvent,
  check_suite: CheckSuiteEvent,
  check_run: CheckRunEvent,
  status: StatusEvent,
} as const satisfies Record<string, Schema.Schema<any>>

export type HandledEventName = keyof typeof HandledEvents
