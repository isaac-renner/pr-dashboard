import { graphql } from "./generated/gql.js";

export const PRFields = graphql(`
  fragment PRFields on PullRequest {
    number
    state
    title
    url
    isDraft
    createdAt
    updatedAt
    headRefName
    mergeable
    repository {
      name
      nameWithOwner
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
            contexts(first: 50) {
              nodes {
                __typename
                ... on CheckRun {
                  name
                  status
                  conclusion
                  detailsUrl
                }
                ... on StatusContext {
                  context
                  state
                  targetUrl
                }
              }
            }
          }
        }
      }
    }
    reviews(last: 50) {
      nodes {
        author {
          __typename
          login
        }
        state
        submittedAt
      }
    }
    reviewThreads(last: 50) {
      nodes {
        id
        isResolved
        comments(last: 20) {
          nodes {
            author {
              __typename
              login
            }
            bodyText
            createdAt
            url
          }
        }
      }
    }
  }
`);

export const BackfillOpenPRs = graphql(`
  query BackfillOpenPRs {
    authored: search(
      query: "author:@me state:open type:pr"
      type: ISSUE
      first: 100
    ) {
      nodes {
        ...PRFields
      }
    }
    assigned: search(
      query: "assignee:@me state:open type:pr"
      type: ISSUE
      first: 100
    ) {
      nodes {
        ...PRFields
      }
    }
  }
`);

export const SinglePR = graphql(`
  query SinglePR($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        ...PRFields
      }
    }
  }
`);
