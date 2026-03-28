/**
 * Correlation — pure functions for matching OpenCode sessions to PRs.
 *
 * No services, no effects. Just data transformations.
 * Ported from server.ts lines 401-510.
 */

import type { PR, SessionRef } from "@pr-dashboard/shared"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface OCSessionRaw {
  readonly id: string
  readonly slug: string
  readonly version: string
  readonly projectID: string
  readonly directory: string
  readonly parentID?: string | undefined
  readonly title: string
  readonly time: { readonly created: number; readonly updated: number }
  readonly summary: { readonly additions: number; readonly deletions: number; readonly files: number }
}

// -----------------------------------------------------------------------------
// Pure functions
// -----------------------------------------------------------------------------

const PR_NUMBER_RE = /PR\s*#?(\d+)/gi

export function extractPRNumbers(title: string): ReadonlyArray<number> {
  const matches: Array<number> = []
  let m: RegExpExecArray | null
  while ((m = PR_NUMBER_RE.exec(title)) !== null) {
    matches.push(Number(m[1]))
  }
  PR_NUMBER_RE.lastIndex = 0
  return matches
}

export function directoryToRepoName(dir: string): string | null {
  const normalized = dir.replace(/^~\//, "/Users/mentat/")
  const ailoPrefix = "/Users/mentat/ailo/"
  if (normalized.startsWith(ailoPrefix)) {
    const name = normalized.slice(ailoPrefix.length).split("/")[0]
    return name || null
  }
  const mentatPrefix = "/Users/mentat/"
  if (normalized.startsWith(mentatPrefix) && normalized !== "/Users/mentat") {
    const name = normalized.slice(mentatPrefix.length).split("/")[0]
    return name && name !== "ailo" ? name : null
  }
  return null
}

export function groupSessions(sessions: ReadonlyArray<OCSessionRaw>): {
  readonly roots: ReadonlyArray<OCSessionRaw>
  readonly childCounts: ReadonlyMap<string, number>
} {
  const childCounts = new Map<string, number>()
  const roots: Array<OCSessionRaw> = []

  for (const s of sessions) {
    if (s.parentID) {
      childCounts.set(s.parentID, (childCounts.get(s.parentID) ?? 0) + 1)
    } else {
      roots.push(s)
    }
  }

  return { roots, childCounts }
}

/**
 * Match sessions to PRs using three signals:
 * 1. PR number mentioned in session title
 * 2. Session directory maps to a repo name
 * 3. Repo name mentioned in session title (fallback for broad dirs)
 */
export function correlateSessions(
  prs: ReadonlyArray<PR>,
  sessions: ReadonlyArray<OCSessionRaw>,
  openCodeUrl: string,
): ReadonlyMap<string, ReadonlyArray<SessionRef>> {
  const { roots, childCounts } = groupSessions(sessions)
  const result = new Map<string, Array<SessionRef>>()

  for (const session of roots) {
    const prNumbers = extractPRNumbers(session.title)
    const repoName = directoryToRepoName(session.directory)
    const titleLower = session.title.toLowerCase()

    for (const pr of prs) {
      let matched = false

      // Signal 1: PR number in session title
      if (prNumbers.includes(pr.number)) {
        matched = true
      }
      // Signal 2: Directory maps to repo name
      else if (
        repoName !== null &&
        repoName.toLowerCase() === pr.repository.name.toLowerCase()
      ) {
        matched = true
      }
      // Signal 3: Repo name mentioned in title (for broad directories)
      else if (
        repoName === null &&
        pr.repository.name.length > 3 &&
        titleLower.includes(pr.repository.name.toLowerCase())
      ) {
        matched = true
      }

      if (matched) {
        const ref: SessionRef = {
          id: session.id,
          title: session.title,
          slug: session.slug,
          time: session.time,
          childCount: childCounts.get(session.id) ?? 0,
          url: `${openCodeUrl}/${session.projectID}/session/${session.id}`,
        }
        const existing = result.get(pr.url)
        if (existing) {
          existing.push(ref)
        } else {
          result.set(pr.url, [ref])
        }
      }
    }
  }

  // Sort each PR's sessions by most recent first
  for (const refs of result.values()) {
    refs.sort((a, b) => b.time.updated - a.time.updated)
  }

  return result
}
