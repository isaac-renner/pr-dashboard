#!/usr/bin/env bun
/**
 * CI script: checks whether the registered GitHub App's config matches
 * what our code expects. Run this in CI to catch drift.
 *
 * Usage:
 *   bun run packages/github-app/src/codegen/check-drift.ts
 *
 * Requires:
 *   - GITHUB_APP_ID env var
 *   - A valid GitHub App private key (for JWT auth)
 *   - OR: pipe the output of `gh api /app` into stdin
 *
 * For local development, you can do:
 *   gh api /app --jq '{permissions: .permissions, events: .events}' | \
 *     bun run packages/github-app/src/codegen/check-drift.ts --stdin
 */

import { generateManifest, detectDrift } from "../schemas/Manifest.js"

async function main() {
  const useStdin = process.argv.includes("--stdin")

  if (!useStdin) {
    console.log("Usage: gh api /app --jq '{permissions, events}' | bun run check-drift.ts --stdin")
    console.log("")
    console.log("Expected manifest:")
    const manifest = generateManifest({
      name: "PR Dashboard",
      url: "https://github.com/isaac-renner/pr-dashboard",
      webhookUrl: "https://example.com/webhooks/github",
    })
    console.log(JSON.stringify({
      permissions: manifest.default_permissions,
      events: manifest.default_events,
    }, null, 2))
    process.exit(0)
  }

  // Read from stdin
  const chunks: Array<string> = []
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk))
  }
  const input = chunks.join("")
  const actual = JSON.parse(input) as {
    permissions: Record<string, string>
    events: ReadonlyArray<string>
  }

  const manifest = generateManifest({
    name: "PR Dashboard",
    url: "https://github.com/isaac-renner/pr-dashboard",
    webhookUrl: "https://example.com/webhooks/github",
  })

  const drifts = detectDrift(manifest, actual)

  if (drifts.length === 0) {
    console.log("✓ GitHub App config matches code. No drift detected.")
    process.exit(0)
  }

  console.error("✗ GitHub App config drift detected:\n")
  for (const drift of drifts) {
    console.error(`  - ${drift}`)
  }
  console.error(
    "\nUpdate the app at https://github.com/settings/apps/<your-app> to match.",
  )
  process.exit(1)
}

main()
