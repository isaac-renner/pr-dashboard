/**
 * OpenCodeClient — fetches coding sessions from the OpenCode API
 * and correlates them with PRs.
 *
 * Optional service: disabled via OPENCODE_ENABLED=false.
 * When disabled, all methods return empty results.
 */

import { Config, Effect, Layer, ServiceMap } from "effect"
import type { PR, SessionRef } from "@pr-dashboard/shared"
import { correlateSessions, type OCSessionRaw } from "./Correlation.js"

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class OpenCodeFetchError {
  readonly _tag = "OpenCodeFetchError"
  constructor(
    readonly message: string,
    readonly status?: number | undefined,
  ) {}
}

// -----------------------------------------------------------------------------
// Service interface
// -----------------------------------------------------------------------------

export interface OpenCodeClientShape {
  /** Whether OpenCode integration is enabled. */
  readonly enabled: boolean

  /** The base URL of the OpenCode API. */
  readonly baseUrl: string

  /**
   * Fetch all sessions from the OpenCode API.
   * Returns empty array if disabled.
   */
  readonly fetchSessions: Effect.Effect<ReadonlyArray<OCSessionRaw>, OpenCodeFetchError>

  /**
   * Fetch sessions and correlate them with the given PRs.
   * Returns a map from PR URL to matched sessions.
   */
  readonly correlateWithPRs: (
    prs: ReadonlyArray<PR>,
  ) => Effect.Effect<ReadonlyMap<string, ReadonlyArray<SessionRef>>, OpenCodeFetchError>
}

export class OpenCodeClient extends ServiceMap.Service<
  OpenCodeClient,
  OpenCodeClientShape
>()("OpenCodeClient") {}

// -----------------------------------------------------------------------------
// Live implementation
// -----------------------------------------------------------------------------

export const OpenCodeClientLive = Layer.effect(OpenCodeClient)(
  Effect.gen(function* () {
    const baseUrl = yield* Config.string("OPENCODE_URL").pipe(
      Config.withDefault("http://mentat:9741"),
    )
    const enabled = yield* Config.boolean("OPENCODE_ENABLED").pipe(
      Config.withDefault(true),
    )

    return {
      enabled,
      baseUrl,

      fetchSessions: Effect.gen(function* () {
        if (!enabled) return []

        const result = yield* Effect.tryPromise({
          try: () => fetch(`${baseUrl}/session`),
          catch: (error) =>
            new OpenCodeFetchError(
              `Failed to connect to OpenCode at ${baseUrl}: ${error}`,
            ),
        })

        if (!result.ok) {
          return yield* Effect.fail(
            new OpenCodeFetchError(
              `OpenCode /session returned ${result.status}`,
              result.status,
            ),
          )
        }

        const json = yield* Effect.tryPromise({
          try: () => result.json() as Promise<ReadonlyArray<OCSessionRaw>>,
          catch: (error) =>
            new OpenCodeFetchError(`Failed to parse OpenCode response: ${error}`),
        })

        return json
      }),

      correlateWithPRs: (prs) =>
        Effect.gen(function* () {
          if (!enabled) return new Map()

          const sessions = yield* Effect.tryPromise({
            try: () => fetch(`${baseUrl}/session`),
            catch: (error) =>
              new OpenCodeFetchError(`Failed to connect to OpenCode: ${error}`),
          }).pipe(
            Effect.flatMap((res) => {
              if (!res.ok) {
                return Effect.fail(
                  new OpenCodeFetchError(`OpenCode /session: ${res.status}`, res.status),
                )
              }
              return Effect.tryPromise({
                try: () => res.json() as Promise<ReadonlyArray<OCSessionRaw>>,
                catch: (error) =>
                  new OpenCodeFetchError(`Failed to parse OpenCode response: ${error}`),
              })
            }),
          )

          return correlateSessions(prs, sessions, baseUrl)
        }),
    }
  }),
)
