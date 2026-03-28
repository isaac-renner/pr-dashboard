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
    "\n  fragment PRFields on PullRequest {\n    number\n    state\n    title\n    url\n    isDraft\n    createdAt\n    updatedAt\n    headRefName\n    mergeable\n    repository {\n      name\n      nameWithOwner\n    }\n    commits(last: 1) {\n      nodes {\n        commit {\n          statusCheckRollup {\n            state\n            contexts(first: 50) {\n              nodes {\n                __typename\n                ... on CheckRun {\n                  name\n                  status\n                  conclusion\n                  detailsUrl\n                }\n                ... on StatusContext {\n                  context\n                  state\n                  targetUrl\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    reviews(last: 50) {\n      nodes {\n        author {\n          __typename\n          login\n        }\n        state\n        submittedAt\n      }\n    }\n    reviewThreads(last: 50) {\n      nodes {\n        id\n        isResolved\n        comments(last: 20) {\n          nodes {\n            author {\n              __typename\n              login\n            }\n            bodyText\n            createdAt\n            url\n          }\n        }\n      }\n    }\n  }\n": typeof types.PrFieldsFragmentDoc,
    "\n  query BackfillOpenPRs {\n    authored: search(\n      query: \"author:@me state:open type:pr\"\n      type: ISSUE\n      first: 100\n    ) {\n      nodes {\n        ...PRFields\n      }\n    }\n    assigned: search(\n      query: \"assignee:@me state:open type:pr\"\n      type: ISSUE\n      first: 100\n    ) {\n      nodes {\n        ...PRFields\n      }\n    }\n  }\n": typeof types.BackfillOpenPRsDocument,
    "\n  query SinglePR($owner: String!, $name: String!, $number: Int!) {\n    repository(owner: $owner, name: $name) {\n      pullRequest(number: $number) {\n        ...PRFields\n      }\n    }\n  }\n": typeof types.SinglePrDocument,
};
const documents: Documents = {
    "\n  fragment PRFields on PullRequest {\n    number\n    state\n    title\n    url\n    isDraft\n    createdAt\n    updatedAt\n    headRefName\n    mergeable\n    repository {\n      name\n      nameWithOwner\n    }\n    commits(last: 1) {\n      nodes {\n        commit {\n          statusCheckRollup {\n            state\n            contexts(first: 50) {\n              nodes {\n                __typename\n                ... on CheckRun {\n                  name\n                  status\n                  conclusion\n                  detailsUrl\n                }\n                ... on StatusContext {\n                  context\n                  state\n                  targetUrl\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    reviews(last: 50) {\n      nodes {\n        author {\n          __typename\n          login\n        }\n        state\n        submittedAt\n      }\n    }\n    reviewThreads(last: 50) {\n      nodes {\n        id\n        isResolved\n        comments(last: 20) {\n          nodes {\n            author {\n              __typename\n              login\n            }\n            bodyText\n            createdAt\n            url\n          }\n        }\n      }\n    }\n  }\n": types.PrFieldsFragmentDoc,
    "\n  query BackfillOpenPRs {\n    authored: search(\n      query: \"author:@me state:open type:pr\"\n      type: ISSUE\n      first: 100\n    ) {\n      nodes {\n        ...PRFields\n      }\n    }\n    assigned: search(\n      query: \"assignee:@me state:open type:pr\"\n      type: ISSUE\n      first: 100\n    ) {\n      nodes {\n        ...PRFields\n      }\n    }\n  }\n": types.BackfillOpenPRsDocument,
    "\n  query SinglePR($owner: String!, $name: String!, $number: Int!) {\n    repository(owner: $owner, name: $name) {\n      pullRequest(number: $number) {\n        ...PRFields\n      }\n    }\n  }\n": types.SinglePrDocument,
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
export function graphql(source: "\n  fragment PRFields on PullRequest {\n    number\n    state\n    title\n    url\n    isDraft\n    createdAt\n    updatedAt\n    headRefName\n    mergeable\n    repository {\n      name\n      nameWithOwner\n    }\n    commits(last: 1) {\n      nodes {\n        commit {\n          statusCheckRollup {\n            state\n            contexts(first: 50) {\n              nodes {\n                __typename\n                ... on CheckRun {\n                  name\n                  status\n                  conclusion\n                  detailsUrl\n                }\n                ... on StatusContext {\n                  context\n                  state\n                  targetUrl\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    reviews(last: 50) {\n      nodes {\n        author {\n          __typename\n          login\n        }\n        state\n        submittedAt\n      }\n    }\n    reviewThreads(last: 50) {\n      nodes {\n        id\n        isResolved\n        comments(last: 20) {\n          nodes {\n            author {\n              __typename\n              login\n            }\n            bodyText\n            createdAt\n            url\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment PRFields on PullRequest {\n    number\n    state\n    title\n    url\n    isDraft\n    createdAt\n    updatedAt\n    headRefName\n    mergeable\n    repository {\n      name\n      nameWithOwner\n    }\n    commits(last: 1) {\n      nodes {\n        commit {\n          statusCheckRollup {\n            state\n            contexts(first: 50) {\n              nodes {\n                __typename\n                ... on CheckRun {\n                  name\n                  status\n                  conclusion\n                  detailsUrl\n                }\n                ... on StatusContext {\n                  context\n                  state\n                  targetUrl\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    reviews(last: 50) {\n      nodes {\n        author {\n          __typename\n          login\n        }\n        state\n        submittedAt\n      }\n    }\n    reviewThreads(last: 50) {\n      nodes {\n        id\n        isResolved\n        comments(last: 20) {\n          nodes {\n            author {\n              __typename\n              login\n            }\n            bodyText\n            createdAt\n            url\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BackfillOpenPRs {\n    authored: search(\n      query: \"author:@me state:open type:pr\"\n      type: ISSUE\n      first: 100\n    ) {\n      nodes {\n        ...PRFields\n      }\n    }\n    assigned: search(\n      query: \"assignee:@me state:open type:pr\"\n      type: ISSUE\n      first: 100\n    ) {\n      nodes {\n        ...PRFields\n      }\n    }\n  }\n"): (typeof documents)["\n  query BackfillOpenPRs {\n    authored: search(\n      query: \"author:@me state:open type:pr\"\n      type: ISSUE\n      first: 100\n    ) {\n      nodes {\n        ...PRFields\n      }\n    }\n    assigned: search(\n      query: \"assignee:@me state:open type:pr\"\n      type: ISSUE\n      first: 100\n    ) {\n      nodes {\n        ...PRFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SinglePR($owner: String!, $name: String!, $number: Int!) {\n    repository(owner: $owner, name: $name) {\n      pullRequest(number: $number) {\n        ...PRFields\n      }\n    }\n  }\n"): (typeof documents)["\n  query SinglePR($owner: String!, $name: String!, $number: Int!) {\n    repository(owner: $owner, name: $name) {\n      pullRequest(number: $number) {\n        ...PRFields\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;