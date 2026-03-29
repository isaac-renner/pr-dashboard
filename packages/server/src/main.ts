/**
 * Server entry point.
 *
 * Creates a ManagedRuntime from the service layers, then uses it to
 * run Effects from Bun.serve() handlers and periodic refresh.
 */

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
// Refresh logic
// -----------------------------------------------------------------------------

const refreshCache = Effect.gen(function*() {
  if (refreshing) return;
  refreshing = true;

  try {
    const prStore = yield* Effect.service(PRStore);
    const github = yield* Effect.service(GitHubClient);
    const opencode = yield* Effect.service(OpenCodeClient);

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

    lastRefreshed = new Date().toISOString();

    const count = (yield* prStore.getAll).length;
    yield* Effect.log(`Cache refreshed: ${count} PRs, ${sessionCache.size} with sessions`);
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
