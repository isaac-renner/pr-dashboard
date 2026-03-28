#!/usr/bin/env bun
/**
 * CLI script: generates the GitHub App manifest JSON from code-defined schemas.
 *
 * Usage:
 *   bun run packages/github-app/src/codegen/generate-manifest.ts \
 *     --name "PR Dashboard" \
 *     --url "https://example.com" \
 *     --webhook-url "https://example.com/webhooks/github"
 *
 * Or import generateManifest() directly in your own scripts.
 *
 * The output can be:
 * 1. Used with GitHub's "create app from manifest" flow
 * 2. Compared against `gh api /app` to detect drift
 * 3. Checked into source control as documentation of intent
 */

import { generateManifest } from "../schemas/Manifest.js";

function main() {
  const args = process.argv.slice(2);

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const name = getArg("--name") ?? "PR Dashboard Dev";
  const url = getArg("--url") ?? "https://github.com/isaac-renner/pr-dashboard";
  const webhookUrl = getArg("--webhook-url") ?? "https://example.com/webhooks/github";
  const redirectUrl = getArg("--redirect-url");
  const isPublic = args.includes("--public");

  const manifest = generateManifest({
    name,
    url,
    webhookUrl,
    redirectUrl,
    isPublic,
  });

  console.log(JSON.stringify(manifest, null, 2));
}

main();
