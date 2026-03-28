import { Schema } from "effect"

// -----------------------------------------------------------------------------
// Pipeline filter
// -----------------------------------------------------------------------------

export const PipelineFilter = Schema.Literals([
  "all",
  "failing",
  "pending",
  "passing",
  "none",
] as const)
export type PipelineFilter = typeof PipelineFilter.Type

// -----------------------------------------------------------------------------
// Draft filter
// -----------------------------------------------------------------------------

export const DraftFilter = Schema.Literals(["include", "exclude"] as const)
export type DraftFilter = typeof DraftFilter.Type

// -----------------------------------------------------------------------------
// Group mode
// -----------------------------------------------------------------------------

export const GroupMode = Schema.Literals(["ticket", "repo"] as const)
export type GroupMode = typeof GroupMode.Type

// -----------------------------------------------------------------------------
// Bucket type
// -----------------------------------------------------------------------------

export const BucketType = Schema.Literals(["now", "today", "drafts"] as const)
export type BucketType = typeof BucketType.Type

// -----------------------------------------------------------------------------
// Filters — query params for /api/prs
// -----------------------------------------------------------------------------

export class Filters extends Schema.Class<Filters>("Filters")({
  exclude: Schema.String.pipe(
    Schema.optionalKey,
    Schema.withDecodingDefaultKey(() => ""),
  ),
  repo: Schema.String.pipe(
    Schema.optionalKey,
    Schema.withDecodingDefaultKey(() => ""),
  ),
  pipeline: PipelineFilter.pipe(
    Schema.optionalKey,
    Schema.withDecodingDefaultKey(() => "all" as const),
  ),
  drafts: DraftFilter.pipe(
    Schema.optionalKey,
    Schema.withDecodingDefaultKey(() => "exclude" as const),
  ),
  group: GroupMode.pipe(
    Schema.optionalKey,
    Schema.withDecodingDefaultKey(() => "ticket" as const),
  ),
}) {}
