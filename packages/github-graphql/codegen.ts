import type { CodegenConfig } from "@graphql-codegen/cli"
import { resolve } from "path"
import { readdirSync } from "fs"

// Bun hoists deps to node_modules/.bun/ — resolve through there
function findSchemaPath(): string {
  const bunDir = resolve(process.cwd(), "node_modules/.bun")
  const dirs = readdirSync(bunDir)
  const match = dirs.find((d) => d.includes("graphql-schema"))
  if (match) {
    return resolve(
      bunDir,
      match,
      "node_modules/@octokit/graphql-schema/schema.graphql",
    )
  }
  return "node_modules/@octokit/graphql-schema/schema.graphql"
}

const config: CodegenConfig = {
  schema: findSchemaPath(),
  documents: "packages/github-graphql/src/**/*.ts",
  ignoreNoDocuments: true,
  generates: {
    "packages/github-graphql/src/generated/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        skipTypename: true,
        immutableTypes: true,
        scalars: {
          DateTime: "string",
          URI: "string",
          HTML: "string",
          GitObjectID: "string",
          GitSSHRemote: "string",
          Date: "string",
          PreciseDateTime: "string",
          X509Certificate: "string",
          GitTimestamp: "string",
          Base64String: "string",
          BigInt: "string",
        },
      },
    },
  },
}

export default config
