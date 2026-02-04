const PORT = Number(process.env.PORT ?? 3333);
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

// --- Types ---

interface PR {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  repository: { name: string; nameWithOwner: string };
  checks: string | null;
  jiraTicket: string | null;
}

// --- GitHub GraphQL ---

const GQL_QUERY = `{
  search(query: "author:@me state:open type:pr", type: ISSUE, first: 100) {
    nodes {
      ... on PullRequest {
        number title url isDraft createdAt updatedAt headRefName
        repository { name nameWithOwner }
        commits(last: 1) {
          nodes { commit { statusCheckRollup { state } } }
        }
      }
    }
  }
}`;

interface GQLNode {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  repository: { name: string; nameWithOwner: string };
  commits: {
    nodes: Array<{
      commit: { statusCheckRollup: { state: string } | null };
    }>;
  };
}

function parseJiraTicket(title: string, branch: string): string | null {
  const match = `${title} ${branch}`.match(/[A-Z][A-Z0-9]+-\d+/);
  return match?.[0] ?? null;
}

function topr(n: GQLNode): PR {
  return {
    number: n.number,
    title: n.title,
    url: n.url,
    isDraft: n.isDraft,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    headRefName: n.headRefName,
    repository: n.repository,
    checks: n.commits.nodes[0]?.commit?.statusCheckRollup?.state ?? null,
    jiraTicket: parseJiraTicket(n.title, n.headRefName),
  };
}

async function fetchPRs(): Promise<ReadonlyArray<PR>> {
  const proc = Bun.spawn(
    ["gh", "api", "graphql", "-f", `query=${GQL_QUERY}`],
    { stdout: "pipe", stderr: "pipe" },
  );
  const text = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`gh exit ${code}: ${err}`);
  }
  const nodes: GQLNode[] = JSON.parse(text).data.search.nodes;
  return nodes.map(topr);
}

// --- Cache ---

let cachedPRs: ReadonlyArray<PR> = [];
let lastRefreshed: string | null = null;
let refreshing = false;

async function refreshCache(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    cachedPRs = await fetchPRs();
    lastRefreshed = new Date().toISOString();
    console.log(`[${lastRefreshed}] Cache refreshed: ${cachedPRs.length} PRs`);
  } catch (err) {
    console.error("Cache refresh failed:", err);
  } finally {
    refreshing = false;
  }
}

refreshCache();
setInterval(refreshCache, REFRESH_INTERVAL_MS);

// --- Filtering ---

function filterPRs(
  prs: ReadonlyArray<PR>,
  params: URLSearchParams,
): ReadonlyArray<PR> {
  const excludeDrafts = params.get("drafts") !== "include";
  const onlyAilo = params.get("org") !== "all";
  const excludeKeywords = (params.get("exclude") ?? "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const repoFilter = (params.get("repo") ?? "").trim().toLowerCase();

  const filtered = prs.filter((pr) => {
    if (excludeDrafts && pr.isDraft) return false;
    if (onlyAilo && !pr.repository.nameWithOwner.startsWith("ailohq/"))
      return false;
    if (repoFilter && !pr.repository.name.toLowerCase().includes(repoFilter))
      return false;
    if (excludeKeywords.some((kw) => pr.title.toLowerCase().includes(kw)))
      return false;
    return true;
  });

  return [...filtered].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

// --- Server ---

const indexHtml = await Bun.file(new URL("./index.html", import.meta.url)).text();

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response(indexHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/prs") {
      return Response.json({
        prs: filterPRs(cachedPRs, url.searchParams),
        lastRefreshed,
      });
    }

    if (url.pathname === "/api/refresh" && req.method === "POST") {
      await refreshCache();
      return Response.json({ ok: true, lastRefreshed });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`PR Dashboard running at http://0.0.0.0:${server.port}`);
console.log(`Background refresh every ${REFRESH_INTERVAL_MS / 1000}s`);
