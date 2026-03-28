import { Effect, ServiceMap } from "effect";

// -----------------------------------------------------------------------------
// WebhookVerifier service
//
// Verifies the HMAC-SHA256 signature on incoming GitHub webhook requests.
// Uses the webhook secret from GitHubAppConfig.
// -----------------------------------------------------------------------------

export class WebhookVerificationError {
  readonly _tag = "WebhookVerificationError";
  constructor(readonly message: string) {}
}

export interface WebhookVerifierShape {
  /**
   * Verify the webhook payload against the X-Hub-Signature-256 header.
   * Fails with WebhookVerificationError if the signature is invalid.
   */
  readonly verify: (
    payload: string,
    signature: string,
  ) => Effect.Effect<void, WebhookVerificationError>;
}

export class WebhookVerifier extends ServiceMap.Service<
  WebhookVerifier,
  WebhookVerifierShape
>()("WebhookVerifier") {}

// Implementation will be provided in Phase 2
