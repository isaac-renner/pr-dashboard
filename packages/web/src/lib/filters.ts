import { getReviewLabel, type Filters, type PR } from "./types.js";

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
  const pipelineLabel = pr.pipelineState === "SUCCESS" ? "Passing"
    : pr.pipelineState === "FAILURE" ? "Failing"
    : pr.pipelineState === "PENDING" ? "Pending"
    : "";
  return [
    pr.title,
    pr.headRefName,
    getReviewLabel(pr),
    pipelineLabel,
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

      // Pipeline filter (multi-select)
      if (filters.pipelines.length > 0) {
        const prPipeline = pr.pipelineState === "SUCCESS" ? "Passing"
          : pr.pipelineState === "FAILURE" ? "Failing"
          : pr.pipelineState === "PENDING" ? "Pending"
          : "None";
        if (!filters.pipelines.includes(prPipeline)) return false;
      }

      // Review filter (multi-select)
      if (filters.reviews.length > 0 && !filters.reviews.includes(getReviewLabel(pr))) return false;

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
// Grouping
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

/**
 * Group PRs by stack.
 *
 * Within each repo, if PR B's baseRefName matches PR A's headRefName,
 * they're in the same stack. Walk the chain to find the root (the PR
 * whose base isn't another PR's head — typically main/master).
 *
 * Stacks are ordered root-first. Multi-PR stacks sort before singletons.
 */
export function groupByStack(prs: PR[]): Map<string, PR[]> {
  // Index: within each repo, map headRefName → PR
  const byRepo = new Map<string, Map<string, PR>>();
  for (const pr of prs) {
    const repo = pr.repository.nameWithOwner;
    let repoMap = byRepo.get(repo);
    if (!repoMap) {
      repoMap = new Map();
      byRepo.set(repo, repoMap);
    }
    repoMap.set(pr.headRefName, pr);
  }

  const visited = new Set<string>();
  const stacks = new Map<string, PR[]>();

  function findRoot(pr: PR, repoMap: Map<string, PR>, chain: PR[]): PR[] {
    chain.push(pr);
    visited.add(pr.url);
    const parent = repoMap.get(pr.baseRefName);
    if (parent && !visited.has(parent.url)) {
      return findRoot(parent, repoMap, chain);
    }
    return chain;
  }

  for (const pr of prs) {
    if (visited.has(pr.url)) continue;

    const repo = pr.repository.nameWithOwner;
    const repoMap = byRepo.get(repo)!;

    const chain: PR[] = [];
    findRoot(pr, repoMap, chain);
    chain.reverse(); // root first

    const root = chain[0]!;
    const label = chain.length > 1
      ? `${root.repository.name}: ${root.headRefName} (${chain.length} stacked)`
      : `${root.repository.name}: #${root.number} ${root.title}`;

    const existing = stacks.get(label);
    if (existing) {
      existing.push(...chain.filter((p) => !existing.includes(p)));
    } else {
      stacks.set(label, chain);
    }
  }

  // Multi-PR stacks first, then alphabetical
  const entries = [...stacks.entries()].sort((a, b) => {
    const aMulti = a[1].length > 1 ? 0 : 1;
    const bMulti = b[1].length > 1 ? 0 : 1;
    if (aMulti !== bMulti) return aMulti - bMulti;
    return a[0].localeCompare(b[0]);
  });

  return new Map(entries);
}
