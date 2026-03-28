/**
 * PRStore — reactive in-memory store for enriched PRs.
 *
 * The central state of the application. Webhook handlers write to it,
 * the RPC/HTTP layer reads from it. Changes are published to a PubSub
 * so streaming consumers (SSE, etc.) get real-time updates.
 */

import type { PR } from "@pr-dashboard/shared";
import { Effect, Layer, PubSub, Ref, ServiceMap, Stream } from "effect";

// -----------------------------------------------------------------------------
// Change events
// -----------------------------------------------------------------------------

export type PRStoreEvent =
  | { readonly _tag: "upserted"; readonly pr: PR }
  | { readonly _tag: "removed"; readonly url: string };

// -----------------------------------------------------------------------------
// Service interface
// -----------------------------------------------------------------------------

export interface PRStoreShape {
  /** Get all PRs currently in the store. */
  readonly getAll: Effect.Effect<ReadonlyArray<PR>>;

  /** Get a single PR by URL. */
  readonly get: (url: string) => Effect.Effect<PR | undefined>;

  /** Insert or update a PR. Publishes an "upserted" event. */
  readonly upsert: (pr: PR) => Effect.Effect<void>;

  /** Bulk upsert (e.g. backfill). Publishes one event per PR. */
  readonly upsertMany: (prs: ReadonlyArray<PR>) => Effect.Effect<void>;

  /** Remove a PR by URL. Publishes a "removed" event. */
  readonly remove: (url: string) => Effect.Effect<void>;

  /** Replace all PRs at once (full backfill). Publishes events for diffs. */
  readonly replaceAll: (prs: ReadonlyArray<PR>) => Effect.Effect<void>;

  /** Stream of change events. Each subscriber gets all events from when they subscribe. */
  readonly changes: Stream.Stream<PRStoreEvent>;

  /** When was the store last updated? */
  readonly lastUpdated: Effect.Effect<string | null>;
}

export class PRStore extends ServiceMap.Service<PRStore, PRStoreShape>()(
  "PRStore",
) {}

// -----------------------------------------------------------------------------
// Live implementation
// -----------------------------------------------------------------------------

export const PRStoreLive = Layer.effect(PRStore)(
  Effect.gen(function*() {
    const store = yield* Ref.make<Map<string, PR>>(new Map());
    const pubsub = yield* PubSub.unbounded<PRStoreEvent>();
    const lastUpdatedRef = yield* Ref.make<string | null>(null);

    const touchTimestamp = Ref.set(lastUpdatedRef, new Date().toISOString());

    return {
      getAll: Effect.gen(function*() {
        const map = yield* Ref.get(store);
        return Array.from(map.values());
      }),

      get: (url) =>
        Effect.gen(function*() {
          const map = yield* Ref.get(store);
          return map.get(url);
        }),

      upsert: (pr) =>
        Effect.gen(function*() {
          yield* Ref.update(store, (map) => {
            const next = new Map(map);
            next.set(pr.url, pr);
            return next;
          });
          yield* PubSub.publish(pubsub, { _tag: "upserted", pr });
          yield* touchTimestamp;
        }),

      upsertMany: (prs) =>
        Effect.gen(function*() {
          yield* Ref.update(store, (map) => {
            const next = new Map(map);
            for (const pr of prs) {
              next.set(pr.url, pr);
            }
            return next;
          });
          for (const pr of prs) {
            yield* PubSub.publish(pubsub, { _tag: "upserted", pr });
          }
          yield* touchTimestamp;
        }),

      remove: (url) =>
        Effect.gen(function*() {
          yield* Ref.update(store, (map) => {
            const next = new Map(map);
            next.delete(url);
            return next;
          });
          yield* PubSub.publish(pubsub, { _tag: "removed", url });
          yield* touchTimestamp;
        }),

      replaceAll: (prs) =>
        Effect.gen(function*() {
          const oldMap = yield* Ref.get(store);
          const newMap = new Map<string, PR>();
          for (const pr of prs) {
            newMap.set(pr.url, pr);
          }
          yield* Ref.set(store, newMap);

          // Publish diffs: upserted for new/changed, removed for gone
          for (const pr of prs) {
            yield* PubSub.publish(pubsub, { _tag: "upserted", pr });
          }
          for (const url of oldMap.keys()) {
            if (!newMap.has(url)) {
              yield* PubSub.publish(pubsub, { _tag: "removed", url });
            }
          }
          yield* touchTimestamp;
        }),

      changes: Stream.fromPubSub(pubsub),

      lastUpdated: Ref.get(lastUpdatedRef),
    };
  }),
);
