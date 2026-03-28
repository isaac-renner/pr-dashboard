import { Schema } from "effect"

// -----------------------------------------------------------------------------
// OCSession — full session from the OpenCode API
// -----------------------------------------------------------------------------

export class OCSession extends Schema.Class<OCSession>("OCSession")({
  id: Schema.String,
  slug: Schema.String,
  version: Schema.String,
  projectID: Schema.String,
  directory: Schema.String,
  parentID: Schema.optional(Schema.String),
  title: Schema.String,
  time: Schema.Struct({
    created: Schema.Number,
    updated: Schema.Number,
  }),
  summary: Schema.Struct({
    additions: Schema.Number,
    deletions: Schema.Number,
    files: Schema.Number,
  }),
}) {}
