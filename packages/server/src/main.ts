/**
 * Server entry point.
 *
 * Composes Effect services, runs initial backfill, starts HTTP server.
 */

import { Effect, Layer, Ref } from "effect"
import type { PR, SessionRef } from "@pr-dashboard/shared"
import { GitHubGraphQLClientLive } from "@pr-dashboard/github-graphql"
import { PRStore, PRStoreLive } from "./services/PRStore.js"
import { GitHubClient, GitHubClientLive } from "./services/GitHubClient.js"
import { OpenCodeClient, OpenCodeClientLive } from "./services/OpenCodeClient.js"

const PORT = Number(process.env.PORT ?? 3333)
const REFRESH_INTERVAL_MS = 2 * 60 * 1000

// -----------------------------------------------------------------------------
// Layer composition
// -----------------------------------------------------------------------------

const GitHubLayer = Layer.provide(GitHubClientLive, GitHubGraphQLClientLive)

const MainLayer = Layer.mergeAll(
  PRStoreLive,
  GitHubLayer,
  OpenCodeClientLive,
)

// -----------------------------------------------------------------------------
// Application
// -----------------------------------------------------------------------------

const program = Effect.gen(function* () {
  const prStore = yield* Effect.service(PRStore)
  const github = yield* Effect.service(GitHubClient)
  const opencode = yield* Effect.service(OpenCodeClient)

  // --- State ---

  const sessionCacheRef = yield* Ref.make(
    new Map<string, ReadonlyArray<SessionRef>>(),
  )
  const lastRefreshedRef = yield* Ref.make<string | null>(null)
  const refreshingRef = yield* Ref.make(false)

  // --- Refresh logic ---
  // Self-contained: reads services from closure, manages its own guard.
  // Always resets refreshingRef, even on error.

  const refreshCache: Effect.Effect<void> = Effect.gen(function* () {
    const isRefreshing = yield* Ref.get(refreshingRef)
    if (isRefreshing) return

    yield* Ref.set(refreshingRef, true)

    yield* Effect.gen(function* () {
      // Fetch PRs — on failure, keep the existing store contents
      const prs = yield* github.fetchAllOpenPRs.pipe(
        Effect.catch((err) =>
          Effect.gen(function* () {
            yield* Effect.logWarning(`GitHub fetch failed: ${err.message}`)
            return yield* prStore.getAll
          }),
        ),
      )
      yield* prStore.replaceAll(prs)

      // Correlate sessions — on failure, keep the old cache
      if (opencode.enabled) {
        const allPrs = yield* prStore.getAll
        const correlations = yield* opencode.correlateWithPRs(allPrs).pipe(
          Effect.catch(() =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                "OpenCode fetch failed, keeping old session cache",
              )
              return yield* Ref.get(sessionCacheRef)
            }),
          ),
        )
        yield* Ref.set(
          sessionCacheRef,
          new Map(correlations) as Map<string, ReadonlyArray<SessionRef>>,
        )
      }

      yield* Ref.set(lastRefreshedRef, new Date().toISOString())

      const count = (yield* prStore.getAll).length
      const sessionCount = (yield* Ref.get(sessionCacheRef)).size
      yield* Effect.log(
        `Cache refreshed: ${count} PRs, ${sessionCount} with sessions`,
      )
    }).pipe(
      // Ensure refreshing flag is always reset
      Effect.ensuring(Ref.set(refreshingRef, false)),
    )
  })

  // --- Initial backfill ---

  yield* refreshCache

  // --- Periodic refresh ---

  const interval = setInterval(() => {
    Effect.runPromise(refreshCache).catch((err) =>
      console.error("Background refresh failed:", err),
    )
  }, REFRESH_INTERVAL_MS)

  // --- Build API response ---

  const buildPrsResponse: Effect.Effect<{
    prs: Array<PR & { sessions: ReadonlyArray<SessionRef> }>
    lastRefreshed: string | null
  }> = Effect.gen(function* () {
    const allPrs = yield* prStore.getAll
    const sessions = yield* Ref.get(sessionCacheRef)
    const lastRefreshed = yield* Ref.get(lastRefreshedRef)

    const prs = allPrs
      .filter((pr) => pr.state === "OPEN")
      .map((pr) => ({
        ...pr,
        sessions: sessions.get(pr.url) ?? [],
      }))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )

    return { prs, lastRefreshed }
  })

  // --- HTTP Server ---

  const server = Bun.serve({
    hostname: "0.0.0.0",
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url)

      // API: get all PRs with sessions
      if (url.pathname === "/api/prs") {
        const data = await Effect.runPromise(buildPrsResponse)
        return Response.json(data)
      }

      // API: manual refresh
      if (url.pathname === "/api/refresh" && req.method === "POST") {
        await Effect.runPromise(refreshCache)
        const lastRefreshed = await Effect.runPromise(
          Ref.get(lastRefreshedRef),
        )
        return Response.json({ ok: true, lastRefreshed })
      }

      // Dev: proxy to Vite dev server
      if (process.env.NODE_ENV !== "production") {
        try {
          const viteUrl = `http://localhost:5173${url.pathname}${url.search}`
          const viteRes = await fetch(viteUrl, {
            method: req.method,
            headers: req.headers,
            body:
              req.method !== "GET" && req.method !== "HEAD"
                ? (req.body ?? null)
                : null,
          })
          return new Response(viteRes.body, {
            status: viteRes.status,
            headers: viteRes.headers,
          })
        } catch {
          // Vite not running — fall through to 404
        }
      }

      return new Response("Not found", { status: 404 })
    },
  })

  yield* Effect.log(`PR Dashboard running at http://0.0.0.0:${server.port}`)
  yield* Effect.log(`Background refresh every ${REFRESH_INTERVAL_MS / 1000}s`)

  // Keep alive — cleanup on shutdown
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      clearInterval(interval)
      server.stop()
    }),
  )

  yield* Effect.never
})

// --- Run ---

Effect.runPromise(
  program.pipe(Effect.provide(MainLayer), Effect.scoped),
).catch((err) => {
  console.error("Server failed to start:", err)
  process.exit(1)
})
