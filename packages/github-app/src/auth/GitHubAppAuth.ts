import { Config, Effect, Layer, Redacted, ServiceMap } from "effect";

// -----------------------------------------------------------------------------
// GitHubAppAuth service
//
// Handles JWT generation (RS256) for app-level auth and installation token
// caching for API calls. Tokens auto-refresh when near expiry.
// -----------------------------------------------------------------------------

export interface InstallationToken {
  readonly token: string;
  readonly expiresAt: Date;
}

export interface GitHubAppAuthShape {
  /**
   * Generate a short-lived JWT for app-level API calls.
   * JWTs are valid for up to 10 minutes per GitHub spec.
   */
  readonly generateJwt: Effect.Effect<string>;

  /**
   * Get an installation access token. Cached until near-expiry,
   * then automatically refreshed.
   */
  readonly getInstallationToken: (
    installationId: number,
  ) => Effect.Effect<InstallationToken>;

  /** The app ID for reference */
  readonly appId: string;

  /** The installation ID (primary) for convenience */
  readonly installationId: number;
}

export class GitHubAppAuth extends ServiceMap.Service<
  GitHubAppAuth,
  GitHubAppAuthShape
>()("GitHubAppAuth") {}

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

export interface GitHubAppConfigShape {
  readonly appId: string;
  readonly privateKey: Redacted.Redacted;
  readonly webhookSecret: Redacted.Redacted;
  readonly installationId: number;
}

export class GitHubAppConfig extends ServiceMap.Service<
  GitHubAppConfig,
  GitHubAppConfigShape
>()("GitHubAppConfig") {}

export const GitHubAppConfigFromEnv = Layer.effect(GitHubAppConfig)(
  Effect.gen(function*() {
    const appId = yield* Config.string("GITHUB_APP_ID");
    const privateKey = yield* Config.redacted("GITHUB_APP_PRIVATE_KEY");
    const webhookSecret = yield* Config.redacted("GITHUB_APP_WEBHOOK_SECRET");
    const installationId = yield* Config.number("GITHUB_APP_INSTALLATION_ID");
    return {
      appId,
      privateKey,
      webhookSecret,
      installationId,
    };
  }),
);

// Implementation will be provided in Phase 2 (packages/github-app build-out)
