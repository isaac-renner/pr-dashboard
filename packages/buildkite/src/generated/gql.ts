/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query BuildDetails($slug: ID!) {\n    build(slug: $slug) {\n      id\n      number\n      state\n      url\n      message\n      branch\n      commit\n      createdAt\n      startedAt\n      finishedAt\n      rebuiltFrom {\n        number\n      }\n      pipeline {\n        name\n        slug\n      }\n      jobs(first: 50) {\n        edges {\n          node {\n            ... on JobTypeCommand {\n              __typename\n              id\n              uuid\n              label\n              state\n              url\n              startedAt\n              finishedAt\n              softFailed\n              exitStatus\n              retried\n              retriesCount\n              parallelGroupIndex\n              parallelGroupTotal\n            }\n            ... on JobTypeBlock {\n              __typename\n              id\n              uuid\n              label\n              state\n              isUnblockable\n            }\n            ... on JobTypeWait {\n              __typename\n              uuid\n              state\n            }\n            ... on JobTypeTrigger {\n              __typename\n              uuid\n              label\n              state\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.BuildDetailsDocument,
    "\n  mutation UnblockStep($input: JobTypeBlockUnblockInput!) {\n    jobTypeBlockUnblock(input: $input) {\n      jobTypeBlock {\n        id\n        state\n        unblockedAt\n      }\n    }\n  }\n": typeof types.UnblockStepDocument,
    "\n  mutation RetryJob($input: JobTypeCommandRetryInput!) {\n    jobTypeCommandRetry(input: $input) {\n      jobTypeCommand {\n        id\n        uuid\n        state\n      }\n    }\n  }\n": typeof types.RetryJobDocument,
    "\n  mutation RebuildBuild($input: BuildRebuildInput!) {\n    buildRebuild(input: $input) {\n      build {\n        id\n        number\n        url\n        state\n      }\n    }\n  }\n": typeof types.RebuildBuildDocument,
};
const documents: Documents = {
    "\n  query BuildDetails($slug: ID!) {\n    build(slug: $slug) {\n      id\n      number\n      state\n      url\n      message\n      branch\n      commit\n      createdAt\n      startedAt\n      finishedAt\n      rebuiltFrom {\n        number\n      }\n      pipeline {\n        name\n        slug\n      }\n      jobs(first: 50) {\n        edges {\n          node {\n            ... on JobTypeCommand {\n              __typename\n              id\n              uuid\n              label\n              state\n              url\n              startedAt\n              finishedAt\n              softFailed\n              exitStatus\n              retried\n              retriesCount\n              parallelGroupIndex\n              parallelGroupTotal\n            }\n            ... on JobTypeBlock {\n              __typename\n              id\n              uuid\n              label\n              state\n              isUnblockable\n            }\n            ... on JobTypeWait {\n              __typename\n              uuid\n              state\n            }\n            ... on JobTypeTrigger {\n              __typename\n              uuid\n              label\n              state\n            }\n          }\n        }\n      }\n    }\n  }\n": types.BuildDetailsDocument,
    "\n  mutation UnblockStep($input: JobTypeBlockUnblockInput!) {\n    jobTypeBlockUnblock(input: $input) {\n      jobTypeBlock {\n        id\n        state\n        unblockedAt\n      }\n    }\n  }\n": types.UnblockStepDocument,
    "\n  mutation RetryJob($input: JobTypeCommandRetryInput!) {\n    jobTypeCommandRetry(input: $input) {\n      jobTypeCommand {\n        id\n        uuid\n        state\n      }\n    }\n  }\n": types.RetryJobDocument,
    "\n  mutation RebuildBuild($input: BuildRebuildInput!) {\n    buildRebuild(input: $input) {\n      build {\n        id\n        number\n        url\n        state\n      }\n    }\n  }\n": types.RebuildBuildDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildDetails($slug: ID!) {\n    build(slug: $slug) {\n      id\n      number\n      state\n      url\n      message\n      branch\n      commit\n      createdAt\n      startedAt\n      finishedAt\n      rebuiltFrom {\n        number\n      }\n      pipeline {\n        name\n        slug\n      }\n      jobs(first: 50) {\n        edges {\n          node {\n            ... on JobTypeCommand {\n              __typename\n              id\n              uuid\n              label\n              state\n              url\n              startedAt\n              finishedAt\n              softFailed\n              exitStatus\n              retried\n              retriesCount\n              parallelGroupIndex\n              parallelGroupTotal\n            }\n            ... on JobTypeBlock {\n              __typename\n              id\n              uuid\n              label\n              state\n              isUnblockable\n            }\n            ... on JobTypeWait {\n              __typename\n              uuid\n              state\n            }\n            ... on JobTypeTrigger {\n              __typename\n              uuid\n              label\n              state\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildDetails($slug: ID!) {\n    build(slug: $slug) {\n      id\n      number\n      state\n      url\n      message\n      branch\n      commit\n      createdAt\n      startedAt\n      finishedAt\n      rebuiltFrom {\n        number\n      }\n      pipeline {\n        name\n        slug\n      }\n      jobs(first: 50) {\n        edges {\n          node {\n            ... on JobTypeCommand {\n              __typename\n              id\n              uuid\n              label\n              state\n              url\n              startedAt\n              finishedAt\n              softFailed\n              exitStatus\n              retried\n              retriesCount\n              parallelGroupIndex\n              parallelGroupTotal\n            }\n            ... on JobTypeBlock {\n              __typename\n              id\n              uuid\n              label\n              state\n              isUnblockable\n            }\n            ... on JobTypeWait {\n              __typename\n              uuid\n              state\n            }\n            ... on JobTypeTrigger {\n              __typename\n              uuid\n              label\n              state\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnblockStep($input: JobTypeBlockUnblockInput!) {\n    jobTypeBlockUnblock(input: $input) {\n      jobTypeBlock {\n        id\n        state\n        unblockedAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UnblockStep($input: JobTypeBlockUnblockInput!) {\n    jobTypeBlockUnblock(input: $input) {\n      jobTypeBlock {\n        id\n        state\n        unblockedAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RetryJob($input: JobTypeCommandRetryInput!) {\n    jobTypeCommandRetry(input: $input) {\n      jobTypeCommand {\n        id\n        uuid\n        state\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RetryJob($input: JobTypeCommandRetryInput!) {\n    jobTypeCommandRetry(input: $input) {\n      jobTypeCommand {\n        id\n        uuid\n        state\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RebuildBuild($input: BuildRebuildInput!) {\n    buildRebuild(input: $input) {\n      build {\n        id\n        number\n        url\n        state\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RebuildBuild($input: BuildRebuildInput!) {\n    buildRebuild(input: $input) {\n      build {\n        id\n        number\n        url\n        state\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;