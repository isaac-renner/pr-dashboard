import effect from "@effect/eslint-plugin"
import tsParser from "@typescript-eslint/parser"

export default [
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "**/generated/**",
      ".effect-ref/**",
    ],
  },
  ...effect.configs.dprint.map((config) => ({
    ...config,
    files: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
    languageOptions: {
      ...config.languageOptions,
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  })),
]
