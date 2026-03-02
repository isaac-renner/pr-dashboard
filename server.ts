const PORT = Number(process.env.PORT ?? 3333);
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;
const OPENCODE_URL = process.env.OPENCODE_URL ?? "http://mentat:9741";
const OPENCODE_ENABLED = process.env.OPENCODE_ENABLED !== "false";
const CURRENT_USER = process.env.GH_USER ?? "isaac-renner";

// --- Types ---

interface PR {
  number: number;
  state: "OPEN" | "CLOSED" | "MERGED";
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  repository: { name: string; nameWithOwner: string };
  checks: string | null;
  mergeable: string | null;
  jiraTicket: string | null;
  pipelineState: "SUCCESS" | "FAILURE" | "PENDING" | null;
  pipelineUrl: string | null;
  deployLink: DeployLink | null;
  unresolvedCount: number;
  unresolvedThreads: ReadonlyArray<UnresolvedThread>;
  reviewState: "APPROVED" | "CHANGES_REQUESTED" | "PENDING";
}

interface DeployLink {
  label: string;
  branch: string;
  url: string;
}

interface SessionRef {
  id: string;
  title: string;
  slug: string;
  time: { created: number; updated: number };
  childCount: number;
  url: string;
}

interface OCSession {
  id: string;
  slug: string;
  version: string;
  projectID: string;
  directory: string;
  parentID?: string;
  title: string;
  time: { created: number; updated: number };
  summary: { additions: number; deletions: number; files: number };
}


// --- GitHub GraphQL ---

const PR_FIELDS = `
  ... on PullRequest {
    number state title url isDraft createdAt updatedAt headRefName mergeable
    repository { name nameWithOwner }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
            contexts(first: 50) {
              nodes {
                __typename
                ... on CheckRun { name status conclusion detailsUrl }
                ... on StatusContext { context state targetUrl }
              }
            }
          }
        }
      }
    }
    reviews(last: 50) {
      nodes { author { __typename login } state submittedAt }
    }
    reviewThreads(last: 50) {
      nodes {
        id
        isResolved
        comments(last: 20) {
          nodes { author { __typename login } bodyText createdAt url }
        }
      }
    }
  }
`;

const GQL_QUERY = `{
  authored: search(query: "author:@me state:open type:pr", type: ISSUE, first: 100) {
    nodes { ${PR_FIELDS} }
  }
  assigned: search(query: "assignee:@me state:open type:pr", type: ISSUE, first: 100) {
    nodes { ${PR_FIELDS} }
  }
}`;

interface GQLNode {
  number: number;
  state: "OPEN" | "CLOSED" | "MERGED";
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  mergeable: string | null;
  repository: { name: string; nameWithOwner: string };
  reviews: {
    nodes: Array<{ author: AuthorRef | null; state: string; submittedAt: string }>;
  };
  reviewThreads: {
    nodes: Array<{
      id: string;
      isResolved: boolean;
      comments: {
        nodes: Array<{
          author: AuthorRef | null;
          bodyText: string;
          createdAt: string;
          url: string;
        }>;
      };
    }>;
  };
  commits: {
    nodes: Array<{
      commit: {
        statusCheckRollup: {
          state: string;
          contexts: {
            nodes: Array<
              | {
                  __typename: "CheckRun";
                  name: string;
                  status: string;
                  conclusion: string | null;
                  detailsUrl: string | null;
                }
              | {
                  __typename: "StatusContext";
                  context: string;
                  state: string;
                  targetUrl: string | null;
                }
            >;
          };
        } | null;
      };
    }>;
  };
}

interface AuthorRef {
  __typename: string;
  login: string;
}

interface CommentRef {
  authorLogin: string | null;
  isBot: boolean;
  createdAt: string;
}

interface UnresolvedThread {
  id: string;
  authorLogin: string;
  bodyText: string;
  createdAt: string;
  url: string;
  replied: boolean;
}

function parseJiraTicket(title: string, branch: string): string | null {
  const match = `${title} ${branch}`.match(/[A-Z][A-Z0-9]+-\d+/);
  return match?.[0] ?? null;
}

function isBotAuthor(author: AuthorRef | null): boolean {
  if (!author) return false;
  if (author.__typename === "Bot") return true;
  const login = author.login.toLowerCase();
  return login.endsWith("[bot]");
}

function toCommentRefs(
  nodes: ReadonlyArray<{ author: AuthorRef | null; createdAt: string }>,
): ReadonlyArray<CommentRef> {
  return nodes.map((n) => ({
    authorLogin: n.author?.login ?? null,
    isBot: isBotAuthor(n.author),
    createdAt: n.createdAt,
  }));
}

function countMissingReplies(
  comments: ReadonlyArray<CommentRef>,
  currentUser: string,
): number {
  const currentLower = currentUser.toLowerCase();
  const sorted = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  let lastMineIndex = -1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].authorLogin?.toLowerCase() === currentLower) {
      lastMineIndex = i;
    }
  }
  let missing = 0;
  for (let i = lastMineIndex + 1; i < sorted.length; i += 1) {
    const c = sorted[i];
    if (!c.isBot && c.authorLogin && c.authorLogin.toLowerCase() !== currentLower)
      missing += 1;
  }
  return missing;
}

function reviewState(
  reviews: ReadonlyArray<{ author: AuthorRef | null; state: string }>,
  currentUser: string,
): "APPROVED" | "CHANGES_REQUESTED" | "PENDING" {
  const currentLower = currentUser.toLowerCase();
  let hasApproval = false;
  for (const r of reviews) {
    const authorLogin = r.author?.login ?? null;
    if (!authorLogin || authorLogin.toLowerCase() === currentLower) continue;
    if (isBotAuthor(r.author)) continue;
    if (r.state === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";
    if (r.state === "APPROVED") hasApproval = true;
  }
  return hasApproval ? "APPROVED" : "PENDING";
}

function pipelineInfo(
  rollup: GQLNode["commits"]["nodes"][number]["commit"]["statusCheckRollup"],
  headRefName: string,
): {
  state: "SUCCESS" | "FAILURE" | "PENDING" | null;
  url: string | null;
  deployLink: DeployLink | null;
} {
  if (!rollup) return { state: null, url: null, deployLink: null };
  const nodes = rollup.contexts.nodes;
  let state: "SUCCESS" | "FAILURE" | "PENDING" | null = null;
  let url: string | null = null;
  let deployLink: DeployLink | null = null;

  const severity = {
    FAILURE: 3,
    PENDING: 2,
    SUCCESS: 1,
  };

  function contextState(nodeState: string | null): "SUCCESS" | "FAILURE" | "PENDING" {
    if (!nodeState) return "PENDING";
    if (nodeState === "SUCCESS") return "SUCCESS";
    if (nodeState === "FAILURE" || nodeState === "ERROR" || nodeState === "CANCELLED")
      return "FAILURE";
    return "PENDING";
  }

  function deployBranch(name: string): string | null {
    const match = name.match(/deploy\s+to\s+(.+)$/i);
    if (!match) return null;
    const branch = match[1].trim();
    return branch.length > 0 ? branch : null;
  }

  for (const node of nodes) {
    let nodeUrl: string | null = null;
    let nodeState: "SUCCESS" | "FAILURE" | "PENDING" = "PENDING";
    let label = "";

    if (node.__typename === "CheckRun") {
      nodeUrl = node.detailsUrl;
      nodeState = contextState(node.conclusion ?? node.status);
      label = node.name;
    } else if (node.__typename === "StatusContext") {
      nodeUrl = node.targetUrl;
      nodeState = contextState(node.state);
      label = node.context;
    }

    if (!nodeUrl || !nodeUrl.includes("buildkite.com/")) {
      continue;
    }

    if (state === null || severity[nodeState] > severity[state]) {
      state = nodeState;
      url = nodeUrl;
    }

    const branch = deployBranch(label);
    if (branch && nodeState === "SUCCESS") {
      const next: DeployLink = {
        label: `Deploy ${branch}`,
        branch,
        url: nodeUrl,
      };
      if (!deployLink) {
        deployLink = next;
      } else {
        const currIsHead = deployLink.branch.toLowerCase() === headRefName.toLowerCase();
        const nextIsHead = next.branch.toLowerCase() === headRefName.toLowerCase();
        if (!currIsHead && nextIsHead) {
          deployLink = next;
        }
      }
    }
  }

  return { state, url, deployLink };
}

function unresolvedThreads(
  threads: ReadonlyArray<GQLNode["reviewThreads"]["nodes"][number]>,
  currentUser: string,
): ReadonlyArray<UnresolvedThread> {
  const currentLower = currentUser.toLowerCase();
  const result: Array<UnresolvedThread> = [];
  for (const thread of threads) {
    if (thread.isResolved) continue;
    let firstOther: { authorLogin: string; bodyText: string; createdAt: string; url: string } | null = null;
    let replied = false;
    for (const c of thread.comments.nodes) {
      const login = c.author?.login ?? null;
      if (login && login.toLowerCase() === currentLower) {
        replied = true;
      }
      if (!firstOther && c.author && !isBotAuthor(c.author)) {
        if (login && login.toLowerCase() !== currentLower) {
          firstOther = {
            authorLogin: login,
            bodyText: c.bodyText,
            createdAt: c.createdAt,
            url: c.url,
          };
        }
      }
    }
    if (firstOther) {
      result.push({
        id: thread.id,
        authorLogin: firstOther.authorLogin,
        bodyText: firstOther.bodyText,
        createdAt: firstOther.createdAt,
        url: firstOther.url,
        replied,
      });
    }
  }
  return result;
}

function topr(n: GQLNode): PR {
  const rollup = n.commits.nodes[0]?.commit?.statusCheckRollup ?? null;
  const pipeline = pipelineInfo(rollup, n.headRefName);
  const unresolved = unresolvedThreads(n.reviewThreads.nodes, CURRENT_USER);
  return {
    number: n.number,
    state: n.state,
    title: n.title,
    url: n.url,
    isDraft: n.isDraft,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    headRefName: n.headRefName,
    repository: n.repository,
    checks: n.commits.nodes[0]?.commit?.statusCheckRollup?.state ?? null,
    mergeable: n.mergeable,
    jiraTicket: parseJiraTicket(n.title, n.headRefName),
    pipelineState: pipeline.state,
    pipelineUrl: pipeline.url,
    deployLink: pipeline.deployLink,
    unresolvedCount: unresolved.length,
    unresolvedThreads: unresolved,
    reviewState: reviewState(n.reviews.nodes, CURRENT_USER),
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
  const data = JSON.parse(text).data;
  const authored: GQLNode[] = data.authored.nodes;
  const assigned: GQLNode[] = data.assigned.nodes;
  // Deduplicate by URL
  const seen = new Set<string>();
  const merged: Array<PR> = [];
  for (const n of [...authored, ...assigned]) {
    if (n.url && !seen.has(n.url)) {
      seen.add(n.url);
      merged.push(topr(n));
    }
  }
  return merged;
}

// --- OpenCode API ---

async function fetchSessions(): Promise<ReadonlyArray<OCSession>> {
  const res = await fetch(`${OPENCODE_URL}/session`);
  if (!res.ok) throw new Error(`opencode /session: ${res.status}`);
  return res.json();
}

// --- Session-PR Correlation ---

const PR_NUMBER_RE = /PR\s*#?(\d+)/gi;

function extractPRNumbers(title: string): ReadonlyArray<number> {
  const matches: Array<number> = [];
  let m: RegExpExecArray | null;
  while ((m = PR_NUMBER_RE.exec(title)) !== null) {
    matches.push(Number(m[1]));
  }
  PR_NUMBER_RE.lastIndex = 0;
  return matches;
}

function directoryToRepoName(dir: string): string | null {
  const normalized = dir.replace(/^~\//, "/Users/mentat/");
  const ailoPrefix = "/Users/mentat/ailo/";
  if (normalized.startsWith(ailoPrefix)) {
    const name = normalized.slice(ailoPrefix.length).split("/")[0];
    return name || null;
  }
  const mentatPrefix = "/Users/mentat/";
  if (normalized.startsWith(mentatPrefix) && normalized !== "/Users/mentat") {
    const name = normalized.slice(mentatPrefix.length).split("/")[0];
    return name && name !== "ailo" ? name : null;
  }
  return null;
}

function groupSessions(
  sessions: ReadonlyArray<OCSession>,
): {
  roots: ReadonlyArray<OCSession>;
  childCounts: ReadonlyMap<string, number>;
} {
  const childCounts = new Map<string, number>();
  const roots: Array<OCSession> = [];

  for (const s of sessions) {
    if (s.parentID) {
      childCounts.set(s.parentID, (childCounts.get(s.parentID) ?? 0) + 1);
    } else {
      roots.push(s);
    }
  }

  return { roots, childCounts };
}

function correlateSessions(
  prs: ReadonlyArray<PR>,
  sessions: ReadonlyArray<OCSession>,
): ReadonlyMap<string, ReadonlyArray<SessionRef>> {
  const { roots, childCounts } = groupSessions(sessions);
  const result = new Map<string, Array<SessionRef>>();

  for (const session of roots) {
    const prNumbers = extractPRNumbers(session.title);
    const repoName = directoryToRepoName(session.directory);
    const titleLower = session.title.toLowerCase();

    for (const pr of prs) {
      let matched = false;

      // Signal 1: PR number in session title
      if (prNumbers.includes(pr.number)) {
        matched = true;
      }
      // Signal 2: Directory maps to repo name
      else if (
        repoName !== null &&
        repoName.toLowerCase() === pr.repository.name.toLowerCase()
      ) {
        matched = true;
      }
      // Signal 3: Repo name mentioned in title (for broad directories)
      else if (
        repoName === null &&
        pr.repository.name.length > 3 &&
        titleLower.includes(pr.repository.name.toLowerCase())
      ) {
        matched = true;
      }

      if (matched) {
        const ref: SessionRef = {
          id: session.id,
          title: session.title,
          slug: session.slug,
          time: session.time,
          childCount: childCounts.get(session.id) ?? 0,
          url: `${OPENCODE_URL}/${session.projectID}/session/${session.id}`,
        };
        const existing = result.get(pr.url);
        if (existing) {
          existing.push(ref);
        } else {
          result.set(pr.url, [ref]);
        }
      }
    }
  }

  // Sort each PR's sessions by most recent first
  for (const refs of result.values()) {
    refs.sort((a, b) => b.time.updated - a.time.updated);
  }

  return result;
}

// --- Cache ---

let cachedPRs: ReadonlyArray<PR> = [];
let cachedCorrelations: ReadonlyMap<string, ReadonlyArray<SessionRef>> =
  new Map();
let lastRefreshed: string | null = null;
let refreshing = false;

async function refreshCache(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const [prsResult, sessionsResult] = await Promise.allSettled([
      fetchPRs(),
      OPENCODE_ENABLED ? fetchSessions() : Promise.resolve([]),
    ]);

    if (prsResult.status === "fulfilled") {
      cachedPRs = prsResult.value;
    } else {
      console.error("PR fetch failed:", prsResult.reason);
    }

    if (sessionsResult.status === "fulfilled") {
      cachedCorrelations = correlateSessions(cachedPRs, sessionsResult.value);
    } else {
      console.error("Session fetch failed:", sessionsResult.reason);
    }

    lastRefreshed = new Date().toISOString();
    console.log(
      `[${lastRefreshed}] Cache refreshed: ${cachedPRs.length} PRs, ${cachedCorrelations.size} with sessions`,
    );
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
  const excludeDrafts = params.get("drafts") === "exclude";
  const onlyAilo = params.get("org") !== "all";
  const excludeKeywords = (params.get("exclude") ?? "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const repoFilter = (params.get("repo") ?? "").trim().toLowerCase();

  const filtered = prs.filter((pr) => {
    if (pr.state !== "OPEN") return false;
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
      const filtered = filterPRs(cachedPRs, url.searchParams);
      const prsWithSessions = filtered.map((pr) => ({
        ...pr,
        sessions: cachedCorrelations.get(pr.url) ?? [],
      }));
      return Response.json({ prs: prsWithSessions, lastRefreshed });
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
