/**
 * BuildkiteClient — Effect service for fetching build details and
 * executing mutations against Buildkite's GraphQL API.
 *
 * Uses codegen-generated typed document nodes for type safety.
 */

import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { Config, Duration, Effect, Layer, Schedule, ServiceMap } from "effect";
import { print } from "graphql";
import type { BuildDetailsQuery } from "./generated/graphql.js";
import { BuildDetails, RebuildBuild, RetryJob, UnblockStep } from "./queries.js";

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class BuildkiteRequestError {
  readonly _tag = "BuildkiteRequestError";
  constructor(
    readonly message: string,
    readonly status?: number | undefined,
  ) {}
  toString() {
    return this.status
      ? `BuildkiteRequestError(${this.status}): ${this.message}`
      : `BuildkiteRequestError: ${this.message}`;
  }
}

// -----------------------------------------------------------------------------
// Types — Buildkite build/job data
// -----------------------------------------------------------------------------

export interface BuildkiteJob {
  readonly id: string;
  /** The GraphQL node ID — needed for mutations (unblock, retry). */
  readonly graphqlId: string | null;
  readonly label: string | null;
  readonly state: string;
  readonly url: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly softFailed: boolean;
  readonly type: "command" | "block" | "wait" | "trigger";
  readonly logSnippet: string | null;
  readonly exitStatus: string | null;
  readonly retried: boolean;
  readonly retriesCount: number | null;
  readonly parallelGroupIndex: number | null;
  readonly parallelGroupTotal: number | null;
  /** Whether a block step can be unblocked right now. */
  readonly isUnblockable: boolean | null;
}

export interface BuildkiteBuild {
  /** The GraphQL node ID — needed for rebuild mutation. */
  readonly graphqlId: string;
  readonly number: number;
  readonly state: string;
  readonly url: string;
  readonly message: string | null;
  readonly branch: string;
  readonly commit: string;
  readonly pipelineName: string | null;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly rebuiltFrom: number | null;
  readonly jobs: ReadonlyArray<BuildkiteJob>;
  readonly blockedCount: number;
  readonly failedCount: number;
}

// -----------------------------------------------------------------------------
// URL parsing
// -----------------------------------------------------------------------------

export interface BuildkiteUrlParts {
  readonly org: string;
  readonly pipeline: string;
  readonly buildNumber: number;
}

/**
 * Parse a Buildkite build URL into its constituent parts.
 * Supports URLs like:
 *   https://buildkite.com/{org}/{pipeline}/builds/{number}
 *   https://buildkite.com/{org}/{pipeline}/builds/{number}#step-id
 */
export function parseBuildkiteUrl(url: string): BuildkiteUrlParts | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "buildkite.com") return null;
    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/builds\/(\d+)/);
    if (!match) return null;
    return {
      org: match[1]!,
      pipeline: match[2]!,
      buildNumber: Number(match[3]),
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Service interface
// -----------------------------------------------------------------------------

export interface BuildkiteClientShape {
  /** Whether the Buildkite integration is enabled (token configured). */
  readonly enabled: boolean;

  /**
   * Fetch build details by org/pipeline/buildNumber.
   * Returns null if the build is not found.
   */
  readonly fetchBuild: (
    org: string,
    pipeline: string,
    buildNumber: number,
  ) => Effect.Effect<BuildkiteBuild | null, BuildkiteRequestError>;

  /**
   * Fetch build details from a Buildkite build URL.
   * Returns null if the URL can't be parsed or the build isn't found.
   */
  readonly fetchBuildFromUrl: (
    url: string,
  ) => Effect.Effect<BuildkiteBuild | null, BuildkiteRequestError>;

  /**
   * Unblock a block step by its GraphQL node ID.
   */
  readonly unblockStep: (
    id: string,
  ) => Effect.Effect<{ state: string }, BuildkiteRequestError>;

  /**
   * Retry a failed command job by its GraphQL node ID.
   */
  readonly retryJob: (
    id: string,
  ) => Effect.Effect<{ id: string; state: string }, BuildkiteRequestError>;

  /**
   * Rebuild a build by its GraphQL node ID.
   */
  readonly rebuildBuild: (
    id: string,
  ) => Effect.Effect<{ number: number; url: string; state: string }, BuildkiteRequestError>;
}

export class BuildkiteClient extends ServiceMap.Service<
  BuildkiteClient,
  BuildkiteClientShape
>()("BuildkiteClient") {}

// -----------------------------------------------------------------------------
// Live implementation
// -----------------------------------------------------------------------------

export const BuildkiteClientLive = Layer.effect(BuildkiteClient)(
  Effect.gen(function*() {
    const tokenStr = yield* Config.string("BUILDKITE_TOKEN").pipe(
      Config.withDefault(""),
    );

    const noop: BuildkiteClientShape = {
      enabled: false,
      fetchBuild: () => Effect.succeed(null),
      fetchBuildFromUrl: () => Effect.succeed(null),
      unblockStep: () => Effect.fail(new BuildkiteRequestError("Buildkite disabled")),
      retryJob: () => Effect.fail(new BuildkiteRequestError("Buildkite disabled")),
      rebuildBuild: () => Effect.fail(new BuildkiteRequestError("Buildkite disabled")),
    };

    if (!tokenStr) {
      yield* Effect.log("Buildkite integration disabled (no BUILDKITE_TOKEN)");
      return noop;
    }

    yield* Effect.log("Buildkite integration enabled");

    // --- Shared GraphQL executor ---

    function execute<TResult, TVariables extends Record<string, unknown>>(
      document: TypedDocumentNode<TResult, TVariables>,
      variables: TVariables,
    ): Effect.Effect<TResult, BuildkiteRequestError> {
      const doRequest = Effect.gen(function*() {
        const query = print(document);
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch("https://graphql.buildkite.com/v1", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokenStr}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query, variables }),
            }),
          catch: (error) =>
            new BuildkiteRequestError(`Network error: ${error}`),
        });

        if (response.status === 429) {
          return yield* Effect.fail(
            new BuildkiteRequestError("Rate limited", 429),
          );
        }

        if (!response.ok) {
          const body = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () => new BuildkiteRequestError("could not read body"),
          });
          return yield* Effect.fail(
            new BuildkiteRequestError(
              `Buildkite API returned ${response.status}: ${body.slice(0, 200)}`,
              response.status,
            ),
          );
        }

        const json = yield* Effect.tryPromise({
          try: () =>
            response.json() as Promise<{
              data?: TResult;
              errors?: Array<{ message: string }>;
            }>,
          catch: (error) =>
            new BuildkiteRequestError(`Failed to parse response: ${error}`),
        });

        if (json.errors?.length) {
          return yield* Effect.fail(
            new BuildkiteRequestError(
              json.errors.map((e) => e.message).join("; "),
            ),
          );
        }

        if (!json.data) {
          return yield* Effect.fail(
            new BuildkiteRequestError("No data in response"),
          );
        }

        return json.data;
      }).pipe(Effect.withSpan("buildkite.execute"));

      return doRequest.pipe(
        Effect.retry({
          schedule: Schedule.exponential(Duration.seconds(5)).pipe(
            Schedule.both(Schedule.recurs(3)),
          ),
          while: (err) => err.status === 429,
        }),
      );
    }

    // --- Log fetching (REST — not available via GraphQL) ---

    const LOG_TAIL_LINES = 50;

    function fetchJobLog(
      org: string,
      pipeline: string,
      buildNumber: number,
      jobId: string,
    ): Effect.Effect<string | null, never> {
      return Effect.gen(function*() {
        const url = `https://api.buildkite.com/v2/organizations/${org}/pipelines/${pipeline}/builds/${buildNumber}/jobs/${jobId}/log`;
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(url, {
              headers: {
                Authorization: `Bearer ${tokenStr}`,
                Accept: "application/json",
              },
            }),
          catch: () => null as never,
        });

        if (!response.ok) return null;

        const json = yield* Effect.tryPromise({
          try: () => response.json() as Promise<{ content?: string }>,
          catch: () => null as never,
        });

        const content = json?.content;
        if (!content) return null;

        const clean = content.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
        const lines = clean.split("\n");
        const tail = lines.slice(-LOG_TAIL_LINES).join("\n").trim();
        return tail || null;
      }).pipe(
        Effect.catch(() => Effect.succeed(null)),
        Effect.withSpan("buildkite.fetchJobLog"),
      );
    }

    // --- Transform GraphQL response to our domain types ---

    type GQLBuildNode = NonNullable<BuildDetailsQuery["build"]>;
    type GQLJobEdge = NonNullable<NonNullable<GQLBuildNode["jobs"]>["edges"]>[number];

    function transformBuild(
      build: GQLBuildNode,
      jobs: ReadonlyArray<BuildkiteJob>,
    ): BuildkiteBuild {
      return {
        graphqlId: build.id,
        number: build.number,
        state: build.state,
        url: build.url,
        message: build.message ?? null,
        branch: build.branch,
        commit: build.commit,
        pipelineName: build.pipeline.name ?? null,
        createdAt: build.createdAt ?? "",
        startedAt: build.startedAt ?? null,
        finishedAt: build.finishedAt ?? null,
        rebuiltFrom: build.rebuiltFrom?.number ?? null,
        jobs,
        blockedCount: jobs.filter((j) => j.type === "block" && j.state === "BLOCKED").length,
        failedCount: jobs.filter((j) => j.type === "command" && j.state === "FAILED" && !j.softFailed).length,
      };
    }

    function transformJob(
      edge: GQLJobEdge | null,
    ): { job: Omit<BuildkiteJob, "logSnippet">; isFailed: boolean } {
      const node = edge?.node;
      if (!node) {
        return {
          job: {
            id: "", graphqlId: null, label: null, state: "UNKNOWN",
            url: null, startedAt: null, finishedAt: null, softFailed: false,
            type: "wait", exitStatus: null, retried: false, retriesCount: null,
            parallelGroupIndex: null, parallelGroupTotal: null, isUnblockable: null,
          },
          isFailed: false,
        };
      }

      const typename = node.__typename;
      const isCommand = typename === "JobTypeCommand";
      const isBlock = typename === "JobTypeBlock";

      // Normalize state: Buildkite GQL uses FINISHED for completed jobs.
      // Derive PASSED/FAILED from exitStatus for command jobs so the UI
      // can use simple string comparisons.
      const rawState = String(node.state);
      let normalizedState = rawState;
      if (isCommand && rawState === "FINISHED") {
        const exit = (node as { exitStatus?: string | null }).exitStatus;
        const soft = (node as { softFailed: boolean }).softFailed;
        if (soft) normalizedState = "SOFT_FAILED";
        else if (exit != null && exit !== "0") normalizedState = "FAILED";
        else normalizedState = "PASSED";
      }

      const base = {
        id: "uuid" in node ? node.uuid : "",
        graphqlId: "id" in node ? (node as { id: string }).id : null,
        label: "label" in node ? (node.label ?? null) : null,
        state: normalizedState,
        url: isCommand ? (node as { url: string }).url : null,
        startedAt: isCommand ? ((node as { startedAt?: string | null }).startedAt ?? null) : null,
        finishedAt: isCommand ? ((node as { finishedAt?: string | null }).finishedAt ?? null) : null,
        softFailed: isCommand ? ((node as { softFailed: boolean }).softFailed) : false,
        type: isCommand ? "command" as const
          : isBlock ? "block" as const
          : typename === "JobTypeTrigger" ? "trigger" as const
          : "wait" as const,
        exitStatus: isCommand ? ((node as { exitStatus?: string | null }).exitStatus ?? null) : null,
        retried: isCommand ? ((node as { retried: boolean }).retried) : false,
        retriesCount: isCommand ? ((node as { retriesCount?: number | null }).retriesCount ?? null) : null,
        parallelGroupIndex: isCommand ? ((node as { parallelGroupIndex?: number | null }).parallelGroupIndex ?? null) : null,
        parallelGroupTotal: isCommand ? ((node as { parallelGroupTotal?: number | null }).parallelGroupTotal ?? null) : null,
        isUnblockable: isBlock ? ((node as { isUnblockable?: boolean | null }).isUnblockable ?? null) : null,
      };

      const isFailed = normalizedState === "FAILED";
      return { job: base, isFailed };
    }

    // --- Build fetching ---

    function fetchBuildBySlug(
      slug: string,
    ): Effect.Effect<BuildkiteBuild | null, BuildkiteRequestError> {
      return Effect.gen(function*() {
        const data = yield* execute(BuildDetails, { slug });
        const build = data.build;
        if (!build) return null;

        const slugParts = slug.split("/");
        const slugOrg = slugParts[0] ?? "";
        const slugPipeline = slugParts[1] ?? "";

        const edges = build.jobs?.edges ?? [];
        const jobs: BuildkiteJob[] = yield* Effect.forEach(
          edges,
          (edge) =>
            Effect.gen(function*() {
              const { job, isFailed } = transformJob(edge);
              const logSnippet = isFailed
                ? yield* fetchJobLog(slugOrg, slugPipeline, build.number, job.id)
                : null;
              return { ...job, logSnippet };
            }),
          { concurrency: 3 },
        );

        return transformBuild(build, jobs);
      }).pipe(Effect.withSpan("buildkite.fetchBuild"));
    }

    // --- Mutations ---

    return {
      enabled: true,

      fetchBuild: (org, pipeline, buildNumber) =>
        fetchBuildBySlug(`${org}/${pipeline}/${buildNumber}`),

      fetchBuildFromUrl: (url) => {
        const parts = parseBuildkiteUrl(url);
        if (!parts) return Effect.succeed(null);
        return fetchBuildBySlug(`${parts.org}/${parts.pipeline}/${parts.buildNumber}`);
      },

      unblockStep: (id) =>
        execute(UnblockStep, { input: { id } }).pipe(
          Effect.map((data) => ({
            state: data.jobTypeBlockUnblock?.jobTypeBlock.state ?? "UNKNOWN",
          })),
          Effect.withSpan("buildkite.unblockStep"),
        ),

      retryJob: (id) =>
        execute(RetryJob, { input: { id } }).pipe(
          Effect.map((data) => ({
            id: data.jobTypeCommandRetry?.jobTypeCommand.uuid ?? "",
            state: data.jobTypeCommandRetry?.jobTypeCommand.state ?? "UNKNOWN",
          })),
          Effect.withSpan("buildkite.retryJob"),
        ),

      rebuildBuild: (id) =>
        execute(RebuildBuild, { input: { id } }).pipe(
          Effect.map((data) => ({
            number: data.buildRebuild?.build.number ?? 0,
            url: data.buildRebuild?.build.url ?? "",
            state: data.buildRebuild?.build.state ?? "UNKNOWN",
          })),
          Effect.withSpan("buildkite.rebuildBuild"),
        ),
    };
  }),
);
