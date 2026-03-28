import type { Buckets, Filters, PR } from "./types";

/**
 * Apply all filters to the PR list. Always filters to state === "OPEN".
 * Sorts by updatedAt descending.
 */
export function filterPRs(prs: PR[], filters: Filters): PR[] {
  const excludeKeywords = filters.exclude
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  return prs
    .filter((pr) => {
      // Always require OPEN state
      if (pr.state !== "OPEN") return false;

      // Exclude keywords (match against title or branch)
      if (excludeKeywords.length > 0) {
        const text = `${pr.title} ${pr.headRefName}`.toLowerCase();
        if (excludeKeywords.some((kw) => text.includes(kw))) return false;
      }

      // Repo filter
      if (filters.repo && pr.repository.name !== filters.repo) return false;

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

      // Drafts filter
      if (filters.drafts === "exclude" && isDraftOrTodo(pr)) return false;

      return true;
    })
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

/**
 * Returns true if the PR is a draft or its title contains WIP/TODO.
 */
export function isDraftOrTodo(pr: PR): boolean {
  return pr.isDraft || /\b(WIP|TODO)\b/i.test(pr.title);
}

/**
 * Bucketize PRs into "now" (unresolved threads), "drafts", and "today" (everything else).
 */
export function bucketize(prs: PR[]): Buckets {
  const now: PR[] = [];
  const today: PR[] = [];
  const drafts: PR[] = [];

  for (const pr of prs) {
    if (pr.unresolvedCount > 0) {
      now.push(pr);
    } else if (isDraftOrTodo(pr)) {
      drafts.push(pr);
    } else {
      today.push(pr);
    }
  }

  return { now, today, drafts };
}

/**
 * Group PRs by jiraTicket. "No ticket" is the fallback key.
 * Sorted: tickets first (alphabetically), "No ticket" last.
 */
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

/**
 * Group PRs by repository name, sorted alphabetically.
 */
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
