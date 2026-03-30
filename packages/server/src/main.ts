/**
 * Server entry point.
 *
 * Uses Effect's HttpRouter + RPC server to provide typed endpoints.
 * The RPC contract is defined in @pr-dashboard/shared/rpc.
 * Bun.serve() receives a web handler produced by HttpRouter.toWebHandler().
 */

import { BuildkiteClient, BuildkiteClientLive, parseBuildkiteUrl } from "@pr-dashboard/buildkite";
import { GitHubGraphQLClientLive } from "@pr-dashboard/github-graphql";
import type { PR, SessionRef } from "@pr-dashboard/shared";
import { PrDashboardRpc } from "@pr-dashboard/shared";
import { Effect, Layer, Ref, Schedule, ServiceMap, Stream } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { RpcServer, RpcSerialization } from "effect/unstable/rpc";
import { GitHubClient, GitHubClientLive } from "./services/GitHubClient.js";
import { OpenCodeClient, OpenCodeClientLive } from "./services/OpenCodeClient.js";
import { PRStore, PRStoreLive } from "./services/PRStore.js";

const PORT = Number(process.env.PORT ?? 3333);
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// -----------------------------------------------------------------------------
// Layer composition — services
// -----------------------------------------------------------------------------

const GitHubLayer = Layer.provide(GitHubClientLive, GitHubGraphQLClientLive);

const ServicesLayer = Layer.mergeAll(
  PRStoreLive,
  GitHubLayer,
  OpenCodeClientLive,
  BuildkiteClientLive,
);

// -----------------------------------------------------------------------------
// Refresh state — encapsulated in Effect Refs instead of mutable globals
// -----------------------------------------------------------------------------

interface RefreshStateShape {
  readonly sessionCache: Ref.Ref<Map<string, ReadonlyArray<SessionRef>>>;
  readonly reviewRequestedCache: Ref.Ref<PR[]>;
  readonly lastRefreshed: Ref.Ref<string | null>;
  readonly refreshing: Ref.Ref<boolean>;
}

class RefreshState extends ServiceMap.Service<RefreshState, RefreshStateShape>()(
  "RefreshState",
) {}

const RefreshStateLive = Layer.effect(RefreshState)(
  Effect.gen(function*() {
    const sessionCache = yield* Ref.make(new Map<string, ReadonlyArray<SessionRef>>());
    const reviewRequestedCache = yield* Ref.make<PR[]>([]);
    const lastRefreshed = yield* Ref.make<string | null>(null);
    const refreshing = yield* Ref.make(false);
    return { sessionCache, reviewRequestedCache, lastRefreshed, refreshing };
  }),
);

// -----------------------------------------------------------------------------
// Refresh logic
// -----------------------------------------------------------------------------

const refreshCache = Effect.gen(function*() {
  const state = yield* Effect.service(RefreshState);
  const isRefreshing = yield* Ref.get(state.refreshing);
  if (isRefreshing) return;
  yield* Ref.set(state.refreshing, true);

  try {
    const prStore = yield* Effect.service(PRStore);
    const github = yield* Effect.service(GitHubClient);
    const opencode = yield* Effect.service(OpenCodeClient);
    const buildkite = yield* Effect.service(BuildkiteClient);

    // Fetch PRs — on failure, keep existing
    const currentReviewReq = yield* Ref.get(state.reviewRequestedCache);
    const result = yield* github.fetchAllOpenPRs.pipe(
      Effect.catch((err) =>
        Effect.gen(function*() {
          yield* Effect.logWarning(`GitHub fetch failed: ${err.message}`);
          const existing = yield* prStore.getAll;
          return { myPRs: existing, reviewRequested: currentReviewReq };
        })
      ),
    );
    yield* prStore.replaceAll(result.myPRs);
    yield* Ref.set(state.reviewRequestedCache, [...result.reviewRequested]);

    // Correlate sessions — on failure, keep old cache
    if (opencode.enabled) {
      const allPrs = yield* prStore.getAll;
      const currentSessions = yield* Ref.get(state.sessionCache);
      const correlations = yield* opencode.correlateWithPRs(allPrs).pipe(
        Effect.catch(() =>
          Effect.gen(function*() {
            yield* Effect.logWarning("OpenCode fetch failed, keeping old session cache");
            return currentSessions as ReadonlyMap<string, ReadonlyArray<SessionRef>>;
          })
        ),
      );
      yield* Ref.set(state.sessionCache, new Map(correlations));
    }

    // Enrich with Buildkite build details
    if (buildkite.enabled) {
      const allPrs = yield* prStore.getAll;
      const withBkUrl = allPrs.filter((pr) => pr.pipelineUrl && parseBuildkiteUrl(pr.pipelineUrl));
      yield* Effect.log(`Buildkite: ${withBkUrl.length}/${allPrs.length} PRs have Buildkite URLs`);

      const enriched = yield* Effect.forEach(
        allPrs,
        (pr) => {
          if (!pr.pipelineUrl || !parseBuildkiteUrl(pr.pipelineUrl)) {
            return Effect.succeed(pr);
          }
          return buildkite.fetchBuildFromUrl(pr.pipelineUrl).pipe(
            Effect.map((build) => (build ? { ...pr, buildkite: build } : pr)),
            Effect.catch((err) =>
              Effect.logWarning(`Buildkite: PR #${pr.number} (${pr.pipelineUrl}): ${String(err)}`).pipe(
                Effect.map(() => pr),
              ),
            ),
          );
        },
        { concurrency: 5 },
      );

      const bkEnriched = enriched.filter((pr) => pr.buildkite != null).length;
      yield* Effect.log(`Buildkite: enriched ${bkEnriched} PRs with build details`);

      // Also enrich reviewRequested PRs
      const reviewReq = yield* Ref.get(state.reviewRequestedCache);
      const enrichedReview = yield* Effect.forEach(
        reviewReq,
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
      yield* Ref.set(state.reviewRequestedCache, enrichedReview);
      yield* prStore.replaceAll(enriched);
    }

    yield* Ref.set(state.lastRefreshed, new Date().toISOString());

    const count = (yield* prStore.getAll).length;
    const sessions = (yield* Ref.get(state.sessionCache)).size;
    yield* Effect.log(`Cache refreshed: ${count} PRs, ${sessions} with sessions`);
  } finally {
    yield* Ref.set(state.refreshing, false);
  }
}).pipe(Effect.withSpan("server.refreshCache"));

// -----------------------------------------------------------------------------
// Build API response — enriches PRs with sessions
// -----------------------------------------------------------------------------

function enrichWithSessions(
  prs: ReadonlyArray<PR>,
  sessions: Map<string, ReadonlyArray<SessionRef>>,
) {
  return prs
    .filter((pr: PR) => pr.state === "OPEN")
    .map((pr: PR) => ({
      ...pr,
      sessions: sessions.get(pr.url) ?? [],
    }))
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

// -----------------------------------------------------------------------------
// RPC handlers
// -----------------------------------------------------------------------------

const HandlersLayer = PrDashboardRpc.toLayer(
  Effect.gen(function*() {
    const prStore = yield* Effect.service(PRStore);
    const github = yield* Effect.service(GitHubClient);
    const buildkite = yield* Effect.service(BuildkiteClient);
    const state = yield* Effect.service(RefreshState);

    return PrDashboardRpc.of({
      getPrs: () =>
        Effect.gen(function*() {
          const allPrs = yield* prStore.getAll;
          const sessions = yield* Ref.get(state.sessionCache);
          const reviewReq = yield* Ref.get(state.reviewRequestedCache);
          const lastRef = yield* Ref.get(state.lastRefreshed);
          return {
            prs: enrichWithSessions(allPrs, sessions),
            reviewRequested: enrichWithSessions(reviewReq, sessions),
            lastRefreshed: lastRef,
          };
        }).pipe(Effect.withSpan("rpc.getPrs")),

      refresh: () =>
        Effect.gen(function*() {
          yield* refreshCache;
          const lastRef = yield* Ref.get(state.lastRefreshed);
          return { ok: true as const, lastRefreshed: lastRef };
        }).pipe(Effect.withSpan("rpc.refresh")),

      merge: ({ owner, repo, number }) =>
        Effect.gen(function*() {
          const result = yield* github.mergePR(owner, repo, number).pipe(Effect.orDie);
          yield* refreshCache.pipe(Effect.ignore, Effect.forkDetach);
          return {
            merged: result.merged,
            message: result.message,
            sha: result.sha ?? null,
          };
        }).pipe(Effect.withSpan("rpc.merge")),

      streamPrUpdates: () =>
        prStore.changes.pipe(
          Stream.map((event) =>
            event._tag === "upserted"
              ? { _tag: "PRUpserted" as const, pr: event.pr }
              : { _tag: "PRRemoved" as const, url: event.url }
          ),
        ),

      unblockStep: ({ id }) =>
        Effect.gen(function*() {
          const result = yield* buildkite.unblockStep(id).pipe(Effect.orDie);
          yield* refreshCache.pipe(Effect.ignore, Effect.forkDetach);
          return { ok: true as const, state: result.state };
        }).pipe(Effect.withSpan("rpc.unblockStep")),

      retryJob: ({ id }) =>
        Effect.gen(function*() {
          const result = yield* buildkite.retryJob(id).pipe(Effect.orDie);
          yield* refreshCache.pipe(Effect.ignore, Effect.forkDetach);
          return { ok: true as const, state: result.state };
        }).pipe(Effect.withSpan("rpc.retryJob")),

      rebuildBuild: ({ id }) =>
        Effect.gen(function*() {
          const result = yield* buildkite.rebuildBuild(id).pipe(Effect.orDie);
          yield* refreshCache.pipe(Effect.ignore, Effect.forkDetach);
          return {
            ok: true as const,
            number: result.number,
            url: result.url,
            state: result.state,
          };
        }).pipe(Effect.withSpan("rpc.rebuildBuild")),
    });
  })
);

// -----------------------------------------------------------------------------
// RPC server layer — registers typed routes on the HttpRouter
// -----------------------------------------------------------------------------

const RpcLayer = RpcServer.layerHttp({
  group: PrDashboardRpc,
  path: "/rpc",
  protocol: "http",
});

// -----------------------------------------------------------------------------
// Static / Vite proxy — catch-all route for non-RPC paths
// -----------------------------------------------------------------------------

import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";

const getPrsHandler = Effect.gen(function*() {
  const prStore = yield* Effect.service(PRStore);
  const state = yield* Effect.service(RefreshState);
  const allPrs = yield* prStore.getAll;
  const sessions = yield* Ref.get(state.sessionCache);
  const reviewReq = yield* Ref.get(state.reviewRequestedCache);
  const lastRef = yield* Ref.get(state.lastRefreshed);
  return yield* HttpServerResponse.json({
    prs: enrichWithSessions(allPrs, sessions),
    reviewRequested: enrichWithSessions(reviewReq, sessions),
    lastRefreshed: lastRef,
  });
});

const refreshHandler = Effect.gen(function*() {
  yield* refreshCache;
  const state = yield* Effect.service(RefreshState);
  const lastRef = yield* Ref.get(state.lastRefreshed);
  return yield* HttpServerResponse.json({ ok: true, lastRefreshed: lastRef });
});

const mergeHandler = Effect.gen(function*() {
  const req = yield* Effect.service(HttpServerRequest.HttpServerRequest);
  const webReq = yield* HttpServerRequest.toWeb(req);
  const body = yield* Effect.tryPromise({
    try: () => webReq.json() as Promise<{ owner: string; repo: string; number: number }>,
    catch: () => new Error("Invalid JSON"),
  }).pipe(Effect.orDie);
  const github = yield* Effect.service(GitHubClient);
  const result = yield* github.mergePR(body.owner, body.repo, body.number).pipe(Effect.orDie);
  yield* refreshCache.pipe(Effect.ignore, Effect.forkDetach);
  return yield* HttpServerResponse.json(result);
});

const CompatLayer = HttpRouter.use((router) =>
  Effect.gen(function*() {
    yield* router.add("GET", "/api/prs", () => getPrsHandler);
    yield* router.add("POST", "/api/refresh", () => refreshHandler);
    yield* router.add("POST", "/api/merge", () => mergeHandler);
  }),
);

const StaticLayer = HttpRouter.use((router) =>
  Effect.gen(function*() {
    yield* router.add("*", "/*", () =>
      Effect.gen(function*() {
        const req = yield* Effect.service(HttpServerRequest.HttpServerRequest);
        const webReq = yield* HttpServerRequest.toWeb(req);
        const url = new URL(webReq.url);

        // Dev: proxy to Vite
        if (process.env.NODE_ENV !== "production") {
          const viteRes = yield* Effect.tryPromise({
            try: () => {
              const viteUrl = `http://localhost:5173${url.pathname}${url.search}`;
              return fetch(viteUrl, {
                method: webReq.method,
                headers: webReq.headers,
                body: webReq.method !== "GET" && webReq.method !== "HEAD"
                  ? webReq.body
                  : null,
              });
            },
            catch: () => null,
          });
          if (viteRes) return HttpServerResponse.fromWeb(viteRes);
        }

        // Production: serve Vite build output
        const STATIC_DIR = process.env.STATIC_DIR
          ?? new URL("../../web/dist", import.meta.url).pathname;
        const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
        const file = Bun.file(STATIC_DIR + filePath);
        const fileExists = yield* Effect.promise(() => file.exists());
        if (fileExists) {
          return HttpServerResponse.fromWeb(new Response(file));
        }

        // SPA fallback
        const index = Bun.file(STATIC_DIR + "/index.html");
        const indexExists = yield* Effect.promise(() => index.exists());
        if (indexExists) {
          return HttpServerResponse.fromWeb(new Response(index));
        }

        return HttpServerResponse.empty({ status: 404 });
      }),
    );
  }),
);

// -----------------------------------------------------------------------------
// Background refresh — runs as a daemon fiber in the layer scope
// -----------------------------------------------------------------------------

const BackgroundRefreshLayer = Layer.effectDiscard(
  Effect.gen(function*() {
    yield* refreshCache;
    yield* Effect.log(`Background refresh every ${REFRESH_INTERVAL_MS / 1000}s`);
    yield* refreshCache.pipe(
      Effect.schedule(Schedule.fixed(REFRESH_INTERVAL_MS)),
      Effect.forkDetach,
    );
  }),
);

// -----------------------------------------------------------------------------
// Full application layer
// -----------------------------------------------------------------------------

// Services + state must be provided first, then handlers + RPC + background
const CoreLayer = Layer.mergeAll(
  ServicesLayer,
  RefreshStateLive,
);

// HandlersLayer needs services; RpcLayer needs handlers + serialization
const HandlersWithDeps = Layer.provide(HandlersLayer, CoreLayer);
const SerializationLayer = RpcSerialization.layerNdjson;

const RpcWithDeps = Layer.provide(
  RpcLayer,
  Layer.mergeAll(HandlersWithDeps, SerializationLayer),
);

// CompatLayer handlers look up services at request time, so inject CoreLayer
// into each request's context via provideRequest.
const CompatWithDeps = HttpRouter.provideRequest(CoreLayer)(CompatLayer);

const AppLayer = Layer.mergeAll(
  RpcWithDeps,
  CompatWithDeps,
  StaticLayer,
  Layer.provide(BackgroundRefreshLayer, CoreLayer),
);

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

const { handler, dispose } = HttpRouter.toWebHandler(AppLayer);

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: PORT,
  idleTimeout: 255,
  fetch: (req: Request) => handler(req, undefined as any),
});

console.log(`PR Dashboard running at http://0.0.0.0:${server.port}`);

process.on("SIGTERM", () => {
  dispose().then(() => process.exit(0));
});
