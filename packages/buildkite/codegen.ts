import type { CodegenConfig } from "@graphql-codegen/cli";

const token = process.env.BUILDKITE_TOKEN;
if (!token) {
  console.error("BUILDKITE_TOKEN must be set for schema introspection");
  process.exit(1);
}

const config: CodegenConfig = {
  schema: {
    "https://graphql.buildkite.com/v1": {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  },
  documents: "packages/buildkite/src/**/*.ts",
  ignoreNoDocuments: true,
  generates: {
    "packages/buildkite/src/generated/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        skipTypename: true,
        immutableTypes: true,
        scalars: {
          DateTime: "string",
          ISO8601DateTime: "string",
          ID: "string",
          JSON: "string",
        },
      },
    },
  },
};

export default config;
