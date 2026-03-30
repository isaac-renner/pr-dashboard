import { graphql } from "./generated/gql.js";

export const BuildDetails = graphql(`
  query BuildDetails($slug: ID!) {
    build(slug: $slug) {
      id
      number
      state
      url
      message
      branch
      commit
      createdAt
      startedAt
      finishedAt
      rebuiltFrom {
        number
      }
      pipeline {
        name
        slug
      }
      jobs(first: 50) {
        edges {
          node {
            ... on JobTypeCommand {
              __typename
              id
              uuid
              label
              state
              url
              startedAt
              finishedAt
              softFailed
              exitStatus
              retried
              retriesCount
              parallelGroupIndex
              parallelGroupTotal
            }
            ... on JobTypeBlock {
              __typename
              id
              uuid
              label
              state
              isUnblockable
            }
            ... on JobTypeWait {
              __typename
              uuid
              state
            }
            ... on JobTypeTrigger {
              __typename
              uuid
              label
              state
            }
          }
        }
      }
    }
  }
`);

export const UnblockStep = graphql(`
  mutation UnblockStep($input: JobTypeBlockUnblockInput!) {
    jobTypeBlockUnblock(input: $input) {
      jobTypeBlock {
        id
        state
        unblockedAt
      }
    }
  }
`);

export const RetryJob = graphql(`
  mutation RetryJob($input: JobTypeCommandRetryInput!) {
    jobTypeCommandRetry(input: $input) {
      jobTypeCommand {
        id
        uuid
        state
      }
    }
  }
`);

export const RebuildBuild = graphql(`
  mutation RebuildBuild($input: BuildRebuildInput!) {
    buildRebuild(input: $input) {
      build {
        id
        number
        url
        state
      }
    }
  }
`);
