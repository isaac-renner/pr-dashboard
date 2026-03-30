/**
 * BuildkiteClient — Effect service for fetching build details from
 * Buildkite's GraphQL API.
 *
 * Parses build URLs already extracted from GitHub status checks and
 * fetches the full job-level breakdown from Buildkite.
 */

import { Config, Duration, Effect, Layer, Schedule, ServiceMap } from "effect";

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
    return this.status ? `BuildkiteRequestError(${this.status}): ${this.message}` : `BuildkiteRequestError: ${this.message}`;
  }
}

// -----------------------------------------------------------------------------
// Types — Buildkite build/job data
// -----------------------------------------------------------------------------

export interface BuildkiteJob {
  readonly id: string;
  readonly label: string | null;
  readonly state: string;
  readonly url: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly softFailed: boolean;
  readonly type: "command" | "block" | "wait" | "trigger";
  readonly logSnippet: string | null;
}

export interface BuildkiteBuild {
  readonly number: number;
  readonly state: string;
  readonly url: string;
  readonly message: string | null;
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
// GraphQL query
// -----------------------------------------------------------------------------

const BUILD_QUERY = `
  query BuildDetails($slug: ID!) {
    build(slug: $slug) {
      number
      state
      url
      message
      createdAt
      startedAt
      finishedAt
      rebuiltFrom {
        number
      }
      jobs(first: 50) {
        edges {
          node {
            ... on JobTypeCommand {
              __typename
              uuid
              label
              state
              url
              startedAt
              finishedAt
              softFailed
            }
            ... on JobTypeBlock {
              __typename
              uuid
              label
              state
            }
            ... on JobTypeWait {
              __typename
              uuid
              state
            }
            ... on JobTypeTrigger {
              __typename
              uuid
              label
              state
            }
          }
        }
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// GraphQL response shape
// -----------------------------------------------------------------------------

interface GQLBuildResponse {
  data?: {
    build: {
      number: number;
      state: string;
      url: string;
      message: string | null;
      createdAt: string;
      startedAt: string | null;
      finishedAt: string | null;
      rebuiltFrom: { number: number } | null;
      jobs: {
        edges: Array<{
          node: {
            __typename: string;
            uuid: string;
            label?: string | null;
            state: string;
            url?: string | null;
            startedAt?: string | null;
            finishedAt?: string | null;
            softFailed?: boolean;
          };
        }>;
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
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

    if (!tokenStr) {
      yield* Effect.log("Buildkite integration disabled (no BUILDKITE_TOKEN)");
      return {
        enabled: false,
        fetchBuild: () => Effect.succeed(null),
        fetchBuildFromUrl: () => Effect.succeed(null),
      };
    }

    yield* Effect.log("Buildkite integration enabled");

    const LOG_TAIL_LINES = 50;

    /**
     * Fetch the raw log for a job via the REST API and return the last N lines.
     * Returns null if the log can't be fetched (non-fatal).
     */
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

        // Strip ANSI escape codes and take last N lines
        const clean = content.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
        const lines = clean.split("\n");
        const tail = lines.slice(-LOG_TAIL_LINES).join("\n").trim();
        return tail || null;
      }).pipe(
        Effect.catch(() => Effect.succeed(null)),
        Effect.withSpan("buildkite.fetchJobLog"),
      );
    }

    function executeQuery(
      slug: string,
    ): Effect.Effect<BuildkiteBuild | null, BuildkiteRequestError> {
      const doRequest = Effect.gen(function*() {
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch("https://graphql.buildkite.com/v1", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokenStr}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: BUILD_QUERY,
                variables: { slug },
              }),
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
              `Buildkite API returned ${response.status} for slug "${slug}": ${body.slice(0, 200)}`,
              response.status,
            ),
          );
        }

        const json = yield* Effect.tryPromise({
          try: () => response.json() as Promise<GQLBuildResponse>,
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

        const build = json.data?.build;
        if (!build) return null;

        // Parse the slug to get org/pipeline for REST API calls
        const slugParts = slug.split("/");
        const slugOrg = slugParts[0] ?? "";
        const slugPipeline = slugParts[1] ?? "";

        const jobs: BuildkiteJob[] = yield* Effect.forEach(
          build.jobs.edges,
          (edge) => Effect.gen(function*() {
            const node = edge.node;
            const typename = node.__typename;
            const isFailed = typename === "JobTypeCommand"
              && node.state === "FAILED"
              && !(node.softFailed ?? false);

            // Fetch log snippet for failed command jobs
            const logSnippet = isFailed
              ? yield* fetchJobLog(slugOrg, slugPipeline, build.number, node.uuid)
              : null;

            return {
              id: node.uuid,
              label: node.label ?? null,
              state: node.state,
              url: node.url ?? null,
              startedAt: node.startedAt ?? null,
              finishedAt: node.finishedAt ?? null,
              softFailed: node.softFailed ?? false,
              type: typename === "JobTypeCommand" ? "command" as const
                : typename === "JobTypeBlock" ? "block" as const
                : typename === "JobTypeTrigger" ? "trigger" as const
                : "wait" as const,
              logSnippet,
            };
          }),
          { concurrency: 3 },
        );

        return {
          number: build.number,
          state: build.state,
          url: build.url,
          message: build.message,
          createdAt: build.createdAt,
          startedAt: build.startedAt,
          finishedAt: build.finishedAt,
          rebuiltFrom: build.rebuiltFrom?.number ?? null,
          jobs,
          blockedCount: jobs.filter((j) => j.type === "block" && j.state === "BLOCKED").length,
          failedCount: jobs.filter((j) => j.type === "command" && j.state === "FAILED" && !j.softFailed).length,
        };
      }).pipe(Effect.withSpan("buildkite.fetchBuild"));

      // Retry on rate limit: exponential backoff, max 3 attempts
      return doRequest.pipe(
        Effect.retry({
          schedule: Schedule.exponential(Duration.seconds(5)).pipe(
            Schedule.both(Schedule.recurs(3)),
          ),
          while: (err) => err.status === 429,
        }),
      );
    }

    return {
      enabled: true,

      fetchBuild: (org, pipeline, buildNumber) =>
        executeQuery(`${org}/${pipeline}/${buildNumber}`),

      fetchBuildFromUrl: (url) => {
        const parts = parseBuildkiteUrl(url);
        if (!parts) return Effect.succeed(null);
        return executeQuery(`${parts.org}/${parts.pipeline}/${parts.buildNumber}`);
      },
    };
  }),
);
