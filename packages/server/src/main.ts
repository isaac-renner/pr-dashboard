/**
 * Server entry point.
 *
 * Creates a ManagedRuntime from the service layers, then uses it to
 * run Effects from Bun.serve() handlers and periodic refresh.
 */

import { BuildkiteClient, BuildkiteClientLive, parseBuildkiteUrl } from "@pr-dashboard/buildkite";
import { GitHubGraphQLClientLive } from "@pr-dashboard/github-graphql";
import type { PR, SessionRef } from "@pr-dashboard/shared";
import { Effect, Layer, ManagedRuntime } from "effect";
import { GitHubClient, GitHubClientLive } from "./services/GitHubClient.js";
import { OpenCodeClient, OpenCodeClientLive } from "./services/OpenCodeClient.js";
import { PRStore, PRStoreLive } from "./services/PRStore.js";

const PORT = Number(process.env.PORT ?? 3333);
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — gentler on GitHub rate limits

// -----------------------------------------------------------------------------
// Layer composition
// -----------------------------------------------------------------------------

const GitHubLayer = Layer.provide(GitHubClientLive, GitHubGraphQLClientLive);

const MainLayer = Layer.mergeAll(
  PRStoreLive,
  GitHubLayer,
  OpenCodeClientLive,
  BuildkiteClientLive,
);

// -----------------------------------------------------------------------------
// Runtime + shared state
// -----------------------------------------------------------------------------

const runtime = ManagedRuntime.make(MainLayer);

// Plain mutable state — these are only touched by the refresh/response
// effects which are serialized through the runtime.
let sessionCache = new Map<string, ReadonlyArray<SessionRef>>();
let reviewRequestedCache: PR[] = [];
let lastRefreshed: string | null = null;
let refreshing = false;

// -----------------------------------------------------------------------------
// SSE — connected clients
// -----------------------------------------------------------------------------

const sseClients = new Set<ReadableStreamDefaultController>();
const sseEncoder = new TextEncoder();

function broadcastSSE(event: string, data: unknown) {
  const msg = sseEncoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  for (const controller of sseClients) {
    try {
      controller.enqueue(msg);
    } catch {
      sseClients.delete(controller);
    }
  }
}

// -----------------------------------------------------------------------------
// Refresh logic
// -----------------------------------------------------------------------------

const refreshCache = Effect.gen(function*() {
  if (refreshing) return;
  refreshing = true;

  try {
    const prStore = yield* Effect.service(PRStore);
    const github = yield* Effect.service(GitHubClient);
    const opencode = yield* Effect.service(OpenCodeClient);
    const buildkite = yield* Effect.service(BuildkiteClient);

    // Fetch PRs — on failure, keep the existing store contents
    const result = yield* github.fetchAllOpenPRs.pipe(
      Effect.catch((err) =>
        Effect.gen(function*() {
          yield* Effect.logWarning(`GitHub fetch failed: ${err.message}`);
          const existing = yield* prStore.getAll;
          return { myPRs: existing, reviewRequested: reviewRequestedCache };
        })
      ),
    );
    yield* prStore.replaceAll(result.myPRs);
    reviewRequestedCache = [...result.reviewRequested];

    // Correlate sessions — on failure, keep the old cache
    if (opencode.enabled) {
      const allPrs = yield* prStore.getAll;
      const correlations = yield* opencode.correlateWithPRs(allPrs).pipe(
        Effect.catch(() =>
          Effect.gen(function*() {
            yield* Effect.logWarning("OpenCode fetch failed, keeping old session cache");
            return sessionCache as ReadonlyMap<string, ReadonlyArray<SessionRef>>;
          })
        ),
      );
      sessionCache = new Map(correlations);
    }

    // Enrich with Buildkite build details — on failure, keep PRs without build data
    if (buildkite.enabled) {
      const allPrs = yield* prStore.getAll;
      const enriched = yield* Effect.forEach(
        allPrs,
        (pr) => {
          if (!pr.pipelineUrl || !parseBuildkiteUrl(pr.pipelineUrl)) {
            return Effect.succeed(pr);
          }
          return buildkite.fetchBuildFromUrl(pr.pipelineUrl).pipe(
            Effect.map((build) => (build ? { ...pr, buildkite: build } : pr)),
            Effect.catch(() => Effect.succeed(pr)),
          );
        },
        { concurrency: 5 },
      );
      // Also enrich reviewRequested PRs
      reviewRequestedCache = yield* Effect.forEach(
        reviewRequestedCache,
        (pr) => {
          if (!pr.pipelineUrl || !parseBuildkiteUrl(pr.pipelineUrl)) {
            return Effect.succeed(pr);
          }
          return buildkite.fetchBuildFromUrl(pr.pipelineUrl).pipe(
            Effect.map((build) => (build ? { ...pr, buildkite: build } : pr)),
            Effect.catch(() => Effect.succeed(pr)),
          );
        },
        { concurrency: 5 },
      );
      yield* prStore.replaceAll(enriched);
    }

    lastRefreshed = new Date().toISOString();

    const count = (yield* prStore.getAll).length;
    yield* Effect.log(`Cache refreshed: ${count} PRs, ${sessionCache.size} with sessions`);

    // Notify all connected SSE clients that fresh data is available
    broadcastSSE("refresh", { lastRefreshed, count });
  } finally {
    refreshing = false;
  }
}).pipe(Effect.withSpan("server.refreshCache"));

// -----------------------------------------------------------------------------
// Build API response
// -----------------------------------------------------------------------------

function enrichWithSessions(prs: ReadonlyArray<PR>) {
  return prs
    .filter((pr: PR) => pr.state === "OPEN")
    .map((pr: PR) => ({
      ...pr,
      sessions: sessionCache.get(pr.url) ?? [],
    }))
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

const buildPrsResponse = Effect.gen(function*() {
  const prStore = yield* Effect.service(PRStore);
  const allPrs = yield* prStore.getAll;

  return {
    prs: enrichWithSessions(allPrs),
    reviewRequested: enrichWithSessions(reviewRequestedCache),
    lastRefreshed,
  };
}).pipe(Effect.withSpan("server.buildPrsResponse"));

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

async function main() {
  // Start HTTP server FIRST so it's ready when the frontend connects
  const server = Bun.serve({
    hostname: "0.0.0.0",
    port: PORT,
    idleTimeout: 255, // max — SSE connections are long-lived
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/api/prs") {
        try {
          const data = await runtime.runPromise(buildPrsResponse);
          return Response.json(data);
        } catch (err) {
          console.error("GET /api/prs failed:", err);
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/refresh" && req.method === "POST") {
        try {
          await runtime.runPromise(refreshCache);
          return Response.json({ ok: true, lastRefreshed });
        } catch (err) {
          console.error("POST /api/refresh failed:", err);
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/merge" && req.method === "POST") {
        try {
          const body = await req.json() as { owner?: string; repo?: string; number?: number };
          if (!body.owner || !body.repo || !body.number) {
            return Response.json({ error: "Missing owner, repo, or number" }, { status: 400 });
          }
          const result = await runtime.runPromise(
            Effect.gen(function*() {
              const github = yield* Effect.service(GitHubClient);
              return yield* github.mergePR(body.owner!, body.repo!, body.number!);
            })
          );
          // Refresh cache after merge so the PR disappears from the list
          runtime.runPromise(refreshCache).catch((err) => console.error("Post-merge refresh failed:", err));
          return Response.json(result);
        } catch (err: any) {
          console.error("POST /api/merge failed:", err);
          const message = err?.message ?? String(err);
          return Response.json({ error: message }, { status: 422 });
        }
      }

      // SSE: push "refresh" notifications to connected clients
      if (url.pathname === "/api/events") {
        const stream = new ReadableStream({
          start(controller) {
            sseClients.add(controller);

            // Send initial heartbeat so the client knows the connection is live
            const msg = sseEncoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
            controller.enqueue(msg);

            // Keep-alive: send a heartbeat every 30s to prevent proxies from closing
            const heartbeatInterval = setInterval(() => {
              try {
                controller.enqueue(sseEncoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`));
              } catch {
                clearInterval(heartbeatInterval);
                sseClients.delete(controller);
              }
            }, 30_000);

            req.signal.addEventListener("abort", () => {
              clearInterval(heartbeatInterval);
              sseClients.delete(controller);
              controller.close();
            });
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // Dev: proxy to Vite dev server
      if (process.env.NODE_ENV !== "production") {
        try {
          const viteUrl = `http://localhost:5173${url.pathname}${url.search}`;
          const viteRes = await fetch(viteUrl, {
            method: req.method,
            headers: req.headers,
            body: req.method !== "GET" && req.method !== "HEAD"
              ? (req.body ?? null)
              : null,
          });
          return new Response(viteRes.body, {
            status: viteRes.status,
            headers: viteRes.headers,
          });
        } catch {
          // Vite not running — fall through to static serving
        }
      }

      // Production: serve Vite build output
      const STATIC_DIR = process.env.STATIC_DIR
        ?? new URL("../../web/dist", import.meta.url).pathname;
      const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = Bun.file(STATIC_DIR + filePath);
      if (await file.exists()) return new Response(file);

      // SPA fallback: serve index.html for non-file routes
      const index = Bun.file(STATIC_DIR + "/index.html");
      if (await index.exists()) return new Response(index);

      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`PR Dashboard running at http://0.0.0.0:${server.port}`);

  // Now backfill — server is already accepting requests.
  // GET /api/prs will return { prs: [], lastRefreshed: null } until this completes.
  await runtime.runPromise(refreshCache);

  // Periodic refresh
  setInterval(() => {
    runtime.runPromise(refreshCache).catch((err) => console.error("Background refresh failed:", err));
  }, REFRESH_INTERVAL_MS);

  console.log(`Background refresh every ${REFRESH_INTERVAL_MS / 1000}s`);
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
