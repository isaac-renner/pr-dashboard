import { Rpc, RpcGroup } from "effect/unstable/rpc"
import { Schema } from "effect"
import { PRWithSessions, PR } from "../schemas/index.js"

// -----------------------------------------------------------------------------
// Response schemas
// -----------------------------------------------------------------------------

export class PrsResponse extends Schema.Class<PrsResponse>("PrsResponse")({
  prs: Schema.Array(PRWithSessions),
  lastRefreshed: Schema.String.pipe(Schema.NullOr),
}) {}

export class RefreshResponse extends Schema.Class<RefreshResponse>(
  "RefreshResponse",
)({
  ok: Schema.Boolean,
  lastRefreshed: Schema.String.pipe(Schema.NullOr),
}) {}

// -----------------------------------------------------------------------------
// PR update events — streamed from server to client via SSE
// -----------------------------------------------------------------------------

export class PRUpserted extends Schema.TaggedClass<PRUpserted>()(
  "PRUpserted",
  { pr: PR },
) {}

export class PRRemoved extends Schema.TaggedClass<PRRemoved>()(
  "PRRemoved",
  { url: Schema.String },
) {}

export const PRUpdateEvent = Schema.Union([PRUpserted, PRRemoved])
export type PRUpdateEvent = typeof PRUpdateEvent.Type

// -----------------------------------------------------------------------------
// RPC group — the type-safe contract between frontend and backend
//
// Filtering, grouping, bucketing all happen client-side in derived atoms.
// The server sends the full dataset — it's small enough (~50-100 PRs).
// -----------------------------------------------------------------------------

export class PrDashboardRpc extends RpcGroup.make(
  Rpc.make("getPrs", {
    success: PrsResponse,
  }),
  Rpc.make("refresh", {
    success: RefreshResponse,
  }),
  Rpc.make("streamPrUpdates", {
    success: PRUpdateEvent,
    stream: true,
  }),
) {}
