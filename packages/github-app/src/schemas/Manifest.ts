import { HandledEvents, type HandledEventName } from "./WebhookEvents.js"
import { EventPermissions } from "./Permissions.js"

// -----------------------------------------------------------------------------
// GitHub App Manifest
//
// Generated from HandledEvents + EventPermissions.
// Use the manifest flow (POST to github.com/settings/apps/new) to create a
// new app, or compare against GET /app to detect config drift.
//
// Ref: https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest
// -----------------------------------------------------------------------------

export interface GitHubAppManifest {
  readonly name: string
  readonly url: string
  readonly hook_attributes: {
    readonly url: string
    readonly active: boolean
  }
  readonly redirect_url?: string
  readonly public: boolean
  readonly default_permissions: Record<string, string>
  readonly default_events: ReadonlyArray<string>
}

export interface ManifestConfig {
  readonly name: string
  readonly url: string
  readonly webhookUrl: string
  readonly redirectUrl?: string | undefined
  readonly isPublic?: boolean | undefined
}

/**
 * Derive the minimal GitHub App manifest from our code-defined event schemas
 * and permission mappings. This is the single source of truth — the registered
 * app on GitHub should match this output.
 */
export function generateManifest(config: ManifestConfig): GitHubAppManifest {
  const eventNames = Object.keys(HandledEvents) as ReadonlyArray<HandledEventName>

  // Deduplicate and escalate permissions (write > read)
  const permissions: Record<string, string> = {}
  for (const event of eventNames) {
    const entry = EventPermissions[event]
    const current = permissions[entry.permission]
    if (!current || (entry.access === "write" && current === "read")) {
      permissions[entry.permission] = entry.access
    }
  }

  // metadata:read is always required for GitHub Apps
  if (!permissions["metadata"]) {
    permissions["metadata"] = "read"
  }

  return {
    name: config.name,
    url: config.url,
    hook_attributes: {
      url: config.webhookUrl,
      active: true,
    },
    ...(config.redirectUrl ? { redirect_url: config.redirectUrl } : {}),
    public: config.isPublic ?? false,
    default_permissions: permissions,
    default_events: [...eventNames],
  }
}

/**
 * Compare a generated manifest against the current app's config (from GET /app).
 * Returns a list of drift descriptions, or empty array if in sync.
 */
export function detectDrift(
  expected: GitHubAppManifest,
  actual: {
    readonly permissions: Record<string, string>
    readonly events: ReadonlyArray<string>
  },
): ReadonlyArray<string> {
  const drifts: Array<string> = []

  // Check permissions
  for (const [perm, access] of Object.entries(expected.default_permissions)) {
    const actualAccess = actual.permissions[perm]
    if (!actualAccess) {
      drifts.push(`Missing permission: ${perm} (need ${access})`)
    } else if (actualAccess !== access) {
      drifts.push(
        `Permission ${perm}: expected ${access}, got ${actualAccess}`,
      )
    }
  }

  // Check for extra permissions on the actual app
  for (const perm of Object.keys(actual.permissions)) {
    if (!(perm in expected.default_permissions)) {
      drifts.push(`Extra permission on app: ${perm} (not in code)`)
    }
  }

  // Check events
  const expectedEvents = new Set(expected.default_events)
  const actualEvents = new Set(actual.events)

  for (const event of expectedEvents) {
    if (!actualEvents.has(event)) {
      drifts.push(`Missing event subscription: ${event}`)
    }
  }
  for (const event of actualEvents) {
    if (!expectedEvents.has(event)) {
      drifts.push(`Extra event subscription on app: ${event} (not in code)`)
    }
  }

  return drifts
}
