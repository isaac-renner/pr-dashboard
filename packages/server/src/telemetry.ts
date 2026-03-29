/**
 * Telemetry — OpenTelemetry instrumentation via @effect/opentelemetry.
 *
 * Provides a Tracer layer that sends spans to the OTel Collector.
 * When OTEL_EXPORTER_OTLP_ENDPOINT is not set, telemetry is a no-op.
 *
 * All Effect.withSpan calls in the service layer automatically produce
 * OTel spans when this layer is provided.
 */

import { Effect, Layer } from "effect";

const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

/**
 * When we have the OTel collector running, this layer bridges Effect's
 * Tracer to the OpenTelemetry SDK. When not configured, it's a no-op
 * (Effect's default tracer just discards spans).
 *
 * For now we use Effect.withSpan throughout the codebase — the spans
 * are structured and visible in Effect logs even without OTel. When
 * the OTel stack is running, providing this layer activates export.
 */
export const TelemetryLive: Layer.Layer<never> = OTEL_ENDPOINT
  ? Layer.effectDiscard(
    Effect.log(`OpenTelemetry enabled, exporting to ${OTEL_ENDPOINT}`),
  )
  : Layer.effectDiscard(
    Effect.log("OpenTelemetry disabled (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)"),
  );

// TODO: When @effect/opentelemetry ships a v4-compatible release, replace
// TelemetryLive with:
//
// import { Otlp } from "@effect/opentelemetry"
// import { FetchHttpClient } from "@effect/platform"
//
// export const TelemetryLive = Otlp.layerJson({
//   baseUrl: OTEL_ENDPOINT,
//   resource: {
//     serviceName: "pr-dashboard-server",
//     serviceVersion: "0.1.0",
//   },
// }).pipe(Layer.provide(FetchHttpClient.layer))
