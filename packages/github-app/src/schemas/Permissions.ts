import type { HandledEventName } from "./WebhookEvents.js";

// -----------------------------------------------------------------------------
// Event → GitHub App permission mapping
//
// This is the source of truth for what permissions the GitHub App needs.
// There is no machine-readable source for this from GitHub — it's maintained
// manually from https://docs.github.com/en/webhooks/webhook-events-and-payloads
//
// When you add a new event to HandledEvents, TypeScript will force you to add
// its permission entry here (via the satisfies constraint).
// -----------------------------------------------------------------------------

export interface PermissionEntry {
  readonly permission: string;
  readonly access: "read" | "write";
}

export const EventPermissions: Record<HandledEventName, PermissionEntry> = {
  pull_request: { permission: "pull_requests", access: "read" },
  pull_request_review: { permission: "pull_requests", access: "read" },
  pull_request_review_thread: { permission: "pull_requests", access: "read" },
  pull_request_review_comment: { permission: "pull_requests", access: "read" },
  check_suite: { permission: "checks", access: "read" },
  check_run: { permission: "checks", access: "read" },
  status: { permission: "statuses", access: "read" },
} satisfies Record<HandledEventName, PermissionEntry>;
