import type { Filters, PR } from "./types.js";

// -----------------------------------------------------------------------------
// Fuzzy match — checks if all characters in query appear in order in target
// -----------------------------------------------------------------------------

export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * Build a searchable string from a PR for fuzzy matching.
 */
function searchableText(pr: PR): string {
  return [
    `#${pr.number}`,
    pr.title,
    pr.repository.name,
    pr.repository.nameWithOwner,
    pr.headRefName,
    pr.jiraTicket ?? "",
  ].join(" ");
}

// -----------------------------------------------------------------------------
// Filtering
// -----------------------------------------------------------------------------

/**
 * Apply all filters to the PR list. Always filters to state === "OPEN".
 * Sorts by updatedAt descending.
 */
export function filterPRs(prs: PR[], filters: Filters): PR[] {
  return prs
    .filter((pr) => {
      if (pr.state !== "OPEN") return false;

      // Fuzzy search
      if (filters.search && !fuzzyMatch(filters.search, searchableText(pr))) return false;

      // Repo filter (multi-select)
      if (filters.repos.length > 0 && !filters.repos.includes(pr.repository.name)) return false;

      // Pipeline filter
      if (filters.pipeline !== "all") {
        switch (filters.pipeline) {
          case "failing":
            if (pr.pipelineState !== "FAILURE") return false;
            break;
          case "pending":
            if (pr.pipelineState !== "PENDING") return false;
            break;
          case "passing":
            if (pr.pipelineState !== "SUCCESS") return false;
            break;
          case "none":
            if (pr.pipelineState !== null) return false;
            break;
        }
      }

      return true;
    })
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

/**
 * Extract all unique repo names from the PR list, sorted alphabetically.
 */
export function extractRepos(prs: PR[]): string[] {
  const repos = new Set<string>();
  for (const pr of prs) {
    repos.add(pr.repository.name);
  }
  return [...repos].sort((a, b) => a.localeCompare(b));
}

// -----------------------------------------------------------------------------
// Bucketing / Grouping (unchanged)
// -----------------------------------------------------------------------------

export function groupByTicket(prs: PR[]): Map<string, PR[]> {
  const groups = new Map<string, PR[]>();

  for (const pr of prs) {
    const key = pr.jiraTicket || "No ticket";
    const list = groups.get(key);
    if (list) {
      list.push(pr);
    } else {
      groups.set(key, [pr]);
    }
  }

  const sorted = new Map<string, PR[]>();
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === "No ticket") return 1;
    if (b === "No ticket") return -1;
    return a.localeCompare(b);
  });

  for (const key of keys) {
    sorted.set(key, groups.get(key)!);
  }

  return sorted;
}

export function groupByRepo(prs: PR[]): Map<string, PR[]> {
  const groups = new Map<string, PR[]>();

  for (const pr of prs) {
    const key = pr.repository.name;
    const list = groups.get(key);
    if (list) {
      list.push(pr);
    } else {
      groups.set(key, [pr]);
    }
  }

  const sorted = new Map<string, PR[]>();
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  for (const key of keys) {
    sorted.set(key, groups.get(key)!);
  }

  return sorted;
}
