/**
 * useRpcStream — subscribes to the server's streamPrUpdates RPC and
 * refreshes the PR atoms whenever the server pushes an update.
 *
 * Uses the Effect RPC streaming protocol over HTTP (chunked NDJSON).
 * Reconnects automatically via Effect's built-in stream error handling.
 */

import { useAtomSet } from "@effect/atom-react";
import { PrDashboardRpc } from "@pr-dashboard/shared";
import { Effect, Layer, Stream } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { useEffect } from "react";
import { sseRefreshAtom } from "../atoms/prs.js";

const ClientLayer = Layer.mergeAll(
  RpcClient.layerProtocolHttp({ url: "/rpc" }),
  FetchHttpClient.layer,
  RpcSerialization.layerNdjson,
);

export function useSSE() {
  const triggerRefresh = useAtomSet(sseRefreshAtom);

  useEffect(() => {
    const controller = new AbortController();

    const run = Effect.gen(function*() {
      const client = yield* RpcClient.make(PrDashboardRpc);
      const updates = client.streamPrUpdates();

      yield* updates.pipe(
        Stream.tap(() => Effect.sync(() => triggerRefresh())),
        Stream.runDrain,
      );
    }).pipe(
      Effect.scoped,
      Effect.provide(ClientLayer),
    );

    // Run the stream — it stays alive until the component unmounts
    const fiber = Effect.runFork(run, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [triggerRefresh]);
}
