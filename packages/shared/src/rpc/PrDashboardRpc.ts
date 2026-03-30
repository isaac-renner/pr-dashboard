import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { PR, PRWithSessions } from "../schemas/index.js";

// -----------------------------------------------------------------------------
// Response schemas
// -----------------------------------------------------------------------------

export class PrsResponse extends Schema.Class<PrsResponse>("PrsResponse")({
  prs: Schema.Array(PRWithSessions),
  reviewRequested: Schema.Array(PRWithSessions),
  lastRefreshed: Schema.String.pipe(Schema.NullOr),
}) {}

export class RefreshResponse extends Schema.Class<RefreshResponse>(
  "RefreshResponse",
)({
  ok: Schema.Boolean,
  lastRefreshed: Schema.String.pipe(Schema.NullOr),
}) {}

export class MergeResponse extends Schema.Class<MergeResponse>(
  "MergeResponse",
)({
  merged: Schema.Boolean,
  message: Schema.String,
  sha: Schema.String.pipe(Schema.NullOr),
}) {}

export class BuildkiteActionResponse extends Schema.Class<BuildkiteActionResponse>(
  "BuildkiteActionResponse",
)({
  ok: Schema.Boolean,
  state: Schema.String,
}) {}

export class BuildkiteRebuildResponse extends Schema.Class<BuildkiteRebuildResponse>(
  "BuildkiteRebuildResponse",
)({
  ok: Schema.Boolean,
  number: Schema.Number,
  url: Schema.String,
  state: Schema.String,
}) {}

// -----------------------------------------------------------------------------
// PR update events — streamed from server to client
// -----------------------------------------------------------------------------

export class PRUpserted extends Schema.TaggedClass<PRUpserted>()(
  "PRUpserted",
  { pr: PR },
) {}

export class PRRemoved extends Schema.TaggedClass<PRRemoved>()(
  "PRRemoved",
  { url: Schema.String },
) {}

export const PRUpdateEvent = Schema.Union([PRUpserted, PRRemoved]);
export type PRUpdateEvent = typeof PRUpdateEvent.Type;

// -----------------------------------------------------------------------------
// RPC group — the type-safe contract between frontend and backend
// -----------------------------------------------------------------------------

export class PrDashboardRpc extends RpcGroup.make(
  Rpc.make("getPrs", {
    success: PrsResponse,
  }),
  Rpc.make("refresh", {
    success: RefreshResponse,
  }),
  Rpc.make("merge", {
    payload: {
      owner: Schema.String,
      repo: Schema.String,
      number: Schema.Number,
    },
    success: MergeResponse,
  }),
  Rpc.make("streamPrUpdates", {
    success: PRUpdateEvent,
    stream: true,
  }),
  Rpc.make("unblockStep", {
    payload: { id: Schema.String },
    success: BuildkiteActionResponse,
  }),
  Rpc.make("retryJob", {
    payload: { id: Schema.String },
    success: BuildkiteActionResponse,
  }),
  Rpc.make("rebuildBuild", {
    payload: { id: Schema.String },
    success: BuildkiteRebuildResponse,
  }),
) {}
