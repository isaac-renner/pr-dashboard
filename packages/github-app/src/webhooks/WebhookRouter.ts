import { Effect, Schema, SchemaParser, ServiceMap } from "effect";
import { type HandledEventName, HandledEvents } from "../schemas/WebhookEvents.js";

// -----------------------------------------------------------------------------
// WebhookRouter service
//
// Routes incoming webhook events to typed handler functions based on the
// X-GitHub-Event header. Handlers are registered per-event-type by consumers.
// -----------------------------------------------------------------------------

export class WebhookRouteError {
  readonly _tag = "WebhookRouteError";
  constructor(
    readonly message: string,
    readonly event: string,
    readonly cause?: unknown,
  ) {}
}

/**
 * Handler function type: receives a decoded, typed webhook payload.
 */
export type WebhookHandler<E extends HandledEventName> = (
  payload: Schema.Schema.Type<(typeof HandledEvents)[E]>,
) => Effect.Effect<void>;

/**
 * A partial mapping of event names to their handlers.
 * Consumers only register handlers for events they care about.
 */
export type WebhookHandlerMap = {
  readonly [E in HandledEventName]?: WebhookHandler<E>;
};

export interface WebhookRouterShape {
  /**
   * Handle an incoming webhook event.
   * - eventName: value of the X-GitHub-Event header
   * - payload: raw parsed JSON body
   *
   * Decodes the payload with the schema for the event type,
   * then calls the registered handler.
   */
  readonly handle: (
    eventName: string,
    payload: unknown,
  ) => Effect.Effect<void, WebhookRouteError>;
}

export class WebhookRouter extends ServiceMap.Service<
  WebhookRouter,
  WebhookRouterShape
>()("WebhookRouter") {}

/**
 * Create a WebhookRouter implementation from a handler map.
 *
 * Example:
 * ```ts
 * const router = makeWebhookRouter({
 *   pull_request: (event) => Effect.log(`PR ${event.action}: #${event.number}`),
 *   check_suite: (event) => Effect.log(`Check suite ${event.action}`),
 * })
 * ```
 */
export function makeWebhookRouter(
  handlers: WebhookHandlerMap,
): WebhookRouterShape {
  return {
    handle: (eventName: string, payload: unknown): Effect.Effect<void, WebhookRouteError> => {
      if (!(eventName in HandledEvents)) {
        return Effect.void;
      }

      const name = eventName as HandledEventName;
      const handler = handlers[name];

      if (!handler) {
        return Effect.void;
      }

      const schema = HandledEvents[name];
      const decode = SchemaParser.decodeUnknownEffect(schema);

      return decode(payload).pipe(
        Effect.mapError(
          (cause) =>
            new WebhookRouteError(
              `Failed to decode ${eventName} payload`,
              eventName,
              cause,
            ),
        ),
        Effect.flatMap((decoded: any) => (handler as any)(decoded)),
      ) as Effect.Effect<void, WebhookRouteError>;
    },
  };
}
