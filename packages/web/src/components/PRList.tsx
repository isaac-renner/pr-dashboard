import { useAtomValue } from "@effect/atom-react";
import React from "react";
import { filteredPrsAtom } from "../atoms/derived.js";
import { filtersAtom } from "../atoms/filters.js";
import { groupByRepo, groupByStack, groupByTicket } from "../lib/filters.js";
import { timeAgo } from "../lib/format.js";
import type { PR } from "../lib/types.js";
import { PRRow } from "./PRRow.js";

const JIRA_BASE = "https://ailo.atlassian.net/browse";

function GroupSection({
  name,
  prs,
  isTicketGroup,
}: {
  name: string;
  prs: PR[];
  isTicketGroup: boolean;
  isStackGroup?: boolean | undefined;
}) {
  const sorted = [...prs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const latest = sorted[0];

  const isNoTicket = name === "No ticket";
  const titleContent = isTicketGroup && !isNoTicket
    ? <a href={`${JIRA_BASE}/${name}`} target="_blank" rel="noreferrer">{name}</a>
    : name;

  return (
    <details open>
      <summary>
        <strong>{titleContent}</strong>
        {" "}
        <span className="muted">
          {prs.length} PR{prs.length === 1 ? "" : "s"}
          {latest && ` · latest ${timeAgo(latest.updatedAt)}`}
        </span>
      </summary>
      <div className="pr-grid">
        {sorted.map((pr) => <PRRow key={pr.url} pr={pr} />)}
      </div>
    </details>
  );
}

export function PRList() {
  const filtered = useAtomValue(filteredPrsAtom);
  const filters = useAtomValue(filtersAtom);

  const grouped = filters.group === "stack"
    ? groupByStack(filtered)
    : filters.group === "ticket"
    ? groupByTicket(filtered)
    : groupByRepo(filtered);

  if (filtered.length === 0) {
    return <div className="muted">No PRs match filters</div>;
  }

  return (
    <div className="panel">
      <div className="pr-grid pr-grid-header">
        <div>PR</div>
        <div>Review</div>
        <div>Pipeline</div>
        <div>Conflicts</div>
        <div>Comments</div>
      </div>
      {Array.from(grouped.entries()).map(([groupName, groupPrs]) => (
        <GroupSection
          key={groupName}
          name={groupName}
          prs={groupPrs}
          isTicketGroup={filters.group === "ticket"}
          isStackGroup={filters.group === "stack"}
        />
      ))}
    </div>
  );
}
